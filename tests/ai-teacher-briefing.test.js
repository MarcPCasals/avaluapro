import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildPrivacySafeTeacherBriefing } from '../src/lib/aiTeacherBriefing.js'

function baseState(overrides = {}) {
  return {
    agendaNotes: [],
    behaviorEvents: [],
    classes: [{ id: 'class_1', name: '4t E Real Group', subject: 'Science' }],
    competencies: [],
    criteria: [],
    marks: [],
    students: [],
    taskRecords: [],
    tasks: [],
    tutorialGroupSets: [],
    tutorialRelations: [],
    ui: { activeClassId: 'class_1', activeUtId: 'ut_1' },
    uts: [{ id: 'ut_1', classId: 'class_1', name: 'UT1' }],
    ...overrides,
  }
}

describe('privacy-safe AI teacher briefing', () => {
  it('keeps student identity out of the copied prompt and JSON package', () => {
    const state = baseState({
      behaviorEvents: [
        {
          classId: 'class_1',
          date: '2026-07-18',
          id: 'beh_1',
          studentId: 'student_1',
          text: 'Raw text mentioning family details must not be copied.',
          type: 'incident',
        },
      ],
      students: [
        {
          classId: 'class_1',
          diagnoses: ['tdah'],
          halfGroup: 'A',
          id: 'student_1',
          name: 'Oriol Segarra Puig',
          personalNotes: 'Private note with family context.',
        },
      ],
      taskRecords: [{ id: 'record_1', studentId: 'student_1', taskId: 'task_1', status: 'MISSING' }],
      tasks: [{ classId: 'class_1', id: 'task_1', title: 'Task', utId: 'ut_1' }],
    })

    const briefing = buildPrivacySafeTeacherBriefing(state)
    const copiedPayload = `${briefing.promptText}\n${JSON.stringify(briefing.promptPackage)}`

    assert.match(copiedPayload, /Student A/)
    assert.doesNotMatch(copiedPayload, /Oriol/)
    assert.doesNotMatch(copiedPayload, /Segarra/)
    assert.doesNotMatch(copiedPayload, /Puig/)
    assert.doesNotMatch(copiedPayload, /tdah/i)
    assert.doesNotMatch(copiedPayload, /Private note/)
    assert.doesNotMatch(copiedPayload, /Raw text mentioning/)
    assert.equal(briefing.promptPackage.privacyGuardrails.directIdentifiersIncluded, false)
    assert.equal(briefing.promptPackage.privacyGuardrails.localIdentityMapIncluded, false)
    assert.equal(briefing.promptPackage.privacyGuardrails.freeTextIncluded, false)
    assert.equal(briefing.localIdentityMap[0].name, 'Oriol Segarra Puig')
  })

  it('prioritizes focus students from combined learning, habit, behavior and sociometric signals', () => {
    const state = baseState({
      behaviorEvents: [
        { classId: 'class_1', id: 'beh_1', studentId: 'student_1', type: 'incident' },
        { classId: 'class_1', id: 'beh_2', studentId: 'student_1', type: 'incident' },
      ],
      criteria: [{ competencyId: 'comp_1', id: 'crit_1' }],
      competencies: [{ id: 'comp_1', name: 'C1: Reasoning', order: 1, utId: 'ut_1' }],
      marks: [{ criterionId: 'crit_1', id: 'mark_1', studentId: 'student_1', value: 'D' }],
      students: [
        { classId: 'class_1', halfGroup: 'A', id: 'student_1', name: 'Student One' },
        { classId: 'class_1', halfGroup: 'B', id: 'student_2', name: 'Student Two' },
      ],
      taskRecords: [
        { id: 'record_1', studentId: 'student_1', taskId: 'task_1', status: 'MISSING' },
        { id: 'record_2', studentId: 'student_2', taskId: 'task_1', status: 'DONE' },
      ],
      tasks: [{ classId: 'class_1', id: 'task_1', title: 'Task', utId: 'ut_1' }],
      tutorialRelations: [
        { classId: 'class_1', sourceStudentId: 'student_2', targetStudentId: 'student_1', type: 'avoid' },
        { classId: 'class_1', sourceStudentId: 'student_1', targetStudentId: 'student_2', type: 'friendship' },
      ],
    })

    const briefing = buildPrivacySafeTeacherBriefing(state)
    const [firstFocus] = briefing.promptPackage.focusStudents

    assert.equal(firstFocus.alias, 'Student A')
    assert.ok(firstFocus.signals.includes('low achievement'))
    assert.ok(firstFocus.signals.includes('low work consistency'))
    assert.equal(briefing.promptPackage.competencyFocus[0].competency, 'C1: Reasoning')
  })
})
