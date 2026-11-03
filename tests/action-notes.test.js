import assert from 'node:assert/strict'
import test from 'node:test'
import { buildActionNoteMark, listStudentActionNotes, getPreviousActionOrientations } from '../src/lib/actionNotes.js'

const action = { id: 'C1R1', description: 'Acció fictícia' }
const input = { studentId: 's', criterionId: 'ca', action, text: ' Practicar les unitats. ', orientation: true, updatedAt: '2026-11-03', createId: () => 'm' }

test('crear, editar i eliminar el comentari conserva qualificacions i altres notes', () => {
  const mark = buildActionNoteMark(input)
  assert.equal(mark.value, '')
  assert.equal(mark.actionNotes.C1R1.text, 'Practicar les unitats.')
  const existing = { ...mark, value: 'C', gradingMode: 'actions', actionGrades: { C1R1: 'C' }, actionNotes: { ...mark.actionNotes, other: { text: 'Una altra nota.' } } }
  const edited = buildActionNoteMark({ ...input, existing, text: 'Justificació.', orientation: false })
  assert.equal(edited.actionNotes.C1R1.orientation, false)
  const deleted = buildActionNoteMark({ ...input, existing, text: ' ' })
  assert.deepEqual(deleted.actionNotes, { other: { text: 'Una altra nota.' } })
  assert.equal(deleted.value, 'C')
  assert.deepEqual(deleted.actionGrades, { C1R1: 'C' })
  assert.equal(existing.actionNotes.C1R1.text, 'Practicar les unitats.')
  assert.equal(buildActionNoteMark({ ...input, text: '' }), null)
  assert.throws(() => buildActionNoteMark({ ...input, text: 'a'.repeat(4001) }))
})

test('el recull aïlla alumnes i les orientacions només viatgen entre UT anteriors del mateix criteri i àmbit', () => {
  const uts = ['old', 'current', 'future'].map((id, i) => ({ id, classId: 'class', order: i, name: id }))
  uts.push({ id: 'foreign', classId: 'other', order: 0 })
  const competencies = uts.map(ut => ({ id: `comp-${ut.id}`, utId: ut.id, name: 'C1: Modelització' }))
  competencies.push({ id: 'transversal', utId: 'old', name: 'C1: Modelització', kind: 'transversal' })
  const criteria = competencies.map(comp => ({ id: `ca-${comp.id}`, competencyId: comp.id, name: 'CA1: Rigor' }))
  const marks = criteria.map(criterion => ({ ...buildActionNoteMark({ ...input, criterionId: criterion.id }), id: criterion.id }))
  marks.push(buildActionNoteMark({ ...input, studentId: 'other-student', criterionId: criteria[0].id }))
  marks[0].actionNotes.justification = { text: 'Només justificació', orientation: false }
  const state = { marks, uts, competencies, criteria, semesters: [] }
  assert.equal(listStudentActionNotes(state, 's').length, 6)
  const previous = getPreviousActionOrientations(state, 's', competencies[1], criteria[1], 'current')
  assert.deepEqual(previous.map(note => note.utId), ['old'])
  assert.deepEqual(previous.map(note => note.actionId), ['C1R1'])
  assert.equal(getPreviousActionOrientations(state, 's', competencies[4], criteria[4], 'current').length, 1)
  assert.deepEqual(getPreviousActionOrientations(state, 's', competencies[0], criteria[0], 'old'), [])
  assert.deepEqual(getPreviousActionOrientations(state, 'missing', competencies[1], criteria[1], 'current'), [])
})
