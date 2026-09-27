import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ASSISTANCE_CAPABILITIES,
  DATA_CAPABILITIES,
  assertAssistanceAdapter,
} from '../src/data/adapters/dataAdapterContract.js'
import { createMemoryDataAdapter } from '../src/data/adapters/createMemoryDataAdapter.js'

function buildDataset() {
  return {
    metadata: { label: 'Prova sintètica' },
    classes: [{ id: 'class-test', name: 'Grup fictici' }],
    evaluationCompetencies: [{
      id: 'competency-test',
      criteria: [{ id: 'criterion-test', name: 'Criteri fictici' }],
    }],
    evaluationMarks: [],
    trackingTasks: [{ id: 'task-test', classId: 'class-test', title: 'Tasca fictícia' }],
    trackingRecords: [],
    absenceRecords: [{
      id: 'absence-test',
      classId: 'class-test',
      studentId: 'student-test',
      date: '2026-09-10',
      time: '09:00',
      slotKey: '2026-09-10T09',
      hours: 1,
      recordedAt: '2026-09-10T09:00:00',
    }],
    students: [{
      id: 'student-test',
      classId: 'class-test',
      displayName: 'Alumne 01',
      evaluation: 'B',
      completedTasks: 4,
      totalTasks: 6,
      absenceHours: 1,
      personalNotes: '',
    }],
  }
}

test('l’adaptador d’assistència denega totes les capacitats sensibles', () => {
  const adapter = createMemoryDataAdapter(buildDataset())

  assert.equal(assertAssistanceAdapter(adapter), true)
  assert.deepEqual(adapter.getCapabilities(), ASSISTANCE_CAPABILITIES)
  DATA_CAPABILITIES.forEach((capability) => {
    assert.equal(adapter.getCapabilities()[capability], false)
  })
})

test('els canvis són només en memòria i emeten una revisió nova', () => {
  const adapter = createMemoryDataAdapter(buildDataset())
  const original = adapter.getSnapshot()
  let notifications = 0
  const unsubscribe = adapter.subscribe(() => { notifications += 1 })

  adapter.setStudentEvaluation('student-test', 'A')
  adapter.setCompletedTasks('student-test', 5)
  adapter.setAbsenceHours('student-test', 2)
  adapter.setStudentPersonalNotes('student-test', 'Nota completament fictícia')

  const changed = adapter.getSnapshot()
  assert.equal(changed.revision, 4)
  assert.equal(changed.pendingChangeCount, 4)
  assert.equal(changed.dirty, true)
  assert.equal(changed.students[0].evaluation, 'A')
  assert.equal(changed.students[0].completedTasks, 5)
  assert.equal(changed.students[0].absenceHours, 2)
  assert.equal(changed.students[0].personalNotes, 'Nota completament fictícia')
  assert.equal(original.students[0].evaluation, 'B')
  assert.equal(notifications, 4)

  unsubscribe()
})

test('restablir recupera el conjunt sintètic inicial', () => {
  const adapter = createMemoryDataAdapter(buildDataset())
  adapter.setStudentEvaluation('student-test', 'D')
  adapter.reset()

  const restored = adapter.getSnapshot()
  assert.equal(restored.revision, 2)
  assert.equal(restored.pendingChangeCount, 0)
  assert.equal(restored.dirty, false)
  assert.equal(restored.students[0].evaluation, 'B')
  assert.equal(restored.metadata.containsRealData, false)
  assert.equal(restored.metadata.persistent, false)
})

test('les notes per criteri es creen i s’eliminen només en memòria', () => {
  const adapter = createMemoryDataAdapter(buildDataset())

  adapter.setEvaluationMark('student-test', 'criterion-test', 'A')
  assert.deepEqual(adapter.getSnapshot().evaluationMarks, [{
    id: 'synthetic-mark-student-test-criterion-test',
    criterionId: 'criterion-test',
    studentId: 'student-test',
    value: 'A',
  }])

  adapter.setEvaluationMark('student-test', 'criterion-test', '')
  assert.deepEqual(adapter.getSnapshot().evaluationMarks, [])
  assert.equal(adapter.getSnapshot().pendingChangeCount, 2)
})

test('els estats de seguiment es desen només a la còpia temporal', () => {
  const adapter = createMemoryDataAdapter(buildDataset())

  adapter.setTaskStatus('student-test', 'task-test', 'MISSING')
  assert.deepEqual(adapter.getSnapshot().trackingRecords, [{
    id: 'synthetic-record-student-test-task-test',
    classId: 'class-test',
    studentId: 'student-test',
    taskId: 'task-test',
    status: 'MISSING',
  }])
  assert.equal(adapter.getSnapshot().pendingChangeCount, 1)
})

test('les absències sintètiques s’alternen per franja i mantenen el total coherent', () => {
  const adapter = createMemoryDataAdapter(buildDataset())
  const slot = { date: '2026-09-27', time: '11:20', slotKey: '2026-09-27T11' }

  adapter.toggleAbsence('student-test', 'class-test', slot)
  assert.equal(adapter.getSnapshot().absenceRecords.length, 2)
  assert.equal(adapter.getSnapshot().students[0].absenceHours, 2)

  adapter.toggleAbsence('student-test', 'class-test', slot)
  assert.equal(adapter.getSnapshot().absenceRecords.length, 1)
  assert.equal(adapter.getSnapshot().students[0].absenceHours, 1)
  assert.equal(adapter.getSnapshot().pendingChangeCount, 2)
})

test('rebutja valors i adaptadors que trenquen el contracte segur', () => {
  const adapter = createMemoryDataAdapter(buildDataset())
  assert.throws(() => adapter.setStudentEvaluation('student-test', 'Z'))
  assert.throws(() => adapter.setEvaluationMark('student-test', 'criterion-test', 'Z'))
  assert.throws(() => adapter.setEvaluationMark('student-test', 'missing-criterion', 'A'))
  assert.throws(() => adapter.setTaskStatus('student-test', 'task-test', 'UNKNOWN'))
  assert.throws(() => adapter.setTaskStatus('student-test', 'missing-task', 'DONE'))
  assert.throws(() => adapter.toggleAbsence('student-test', 'class-test', {}))
  assert.throws(() => adapter.toggleAbsence('missing-student', 'class-test', {
    date: '2026-09-27',
    time: '11:20',
    slotKey: '2026-09-27T11',
  }))
  assert.throws(() => adapter.setAbsenceHours('student-test', -1))
  assert.throws(() => assertAssistanceAdapter({
    kind: 'assistance-memory',
    getCapabilities: () => ({ ...ASSISTANCE_CAPABILITIES, cloudRead: true }),
  }))
})
