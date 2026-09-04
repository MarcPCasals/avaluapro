import assert from 'node:assert/strict'
import { test } from 'node:test'
import { prepareClassAntecedents, buildAntecedentsExport } from '../src/features/data/antecedentExport.js'
import { matchAntecedentStudents, validateAntecedentAssignments } from '../src/features/data/antecedentImport.js'

const classItem = { id: 'old', name: '2n C', subject: 'Ciències' }
const state = {
  students: [{ id: 'tom', classId: 'old', name: 'Tom Valls' }, { id: 'empty', classId: 'old', name: 'Sense dades' },
    { id: 'other', classId: 'other', name: 'Altra classe' }],
  semesters: [{ id: 's1', order: 1 }, { id: 's2', order: 2 }],
  uts: [{ id: 'u2', classId: 'old', semesterId: 's2', order: 1, name: 'UT2' },
    { id: 'u1', classId: 'old', semesterId: 's1', order: 1, name: 'UT1' }],
  competencies: [{ id: 'c1', utId: 'u1', name: 'C1 Modelitzar', order: 1 },
    { id: 'c2', utId: 'u2', name: 'C1 Modelitzar', order: 1 },
    { id: 'c3', utId: 'u1', name: 'C2 Investigar', order: 2 },
    { id: 'inactive', utId: 'u2', name: 'C3', order: 3, inactive: true }],
  criteria: [{ id: 'r1', competencyId: 'c1', order: 1 }, { id: 'r2', competencyId: 'c2', order: 1 },
    { id: 'r3', competencyId: 'c3', order: 1 }, { id: 'r4', competencyId: 'inactive', order: 1 }],
  marks: [{ studentId: 'tom', criterionId: 'r1', value: 'D' }, { studentId: 'tom', criterionId: 'r2', value: 'A' },
    { studentId: 'tom', criterionId: 'r3', value: 'B' }, { studentId: 'tom', criterionId: 'r4', value: 'D' }],
  tasks: [{ id: 't1', classId: 'old' }, { id: 't2', classId: 'old' }, { id: 't3', classId: 'other' }],
  taskRecords: [{ studentId: 'tom', taskId: 't1', status: 'DONE' }, { studentId: 'tom', taskId: 't2', status: 'LATE' },
    { studentId: 'tom', taskId: 't3', status: 'MISSING' }],
  behaviorEvents: [{ classId: 'old', studentId: 'tom', type: 'incident', text: 'private' },
    { classId: 'other', studentId: 'tom', type: 'incident' }],
  studentAntecedents: [],
}

test('prepara antecedents sense cap antecedent previ i usa les últimes notes per competència', () => {
  const snapshot = structuredClone(state)
  const rows = prepareClassAntecedents(state, classItem, '2n · 2025-2026')
  assert.equal(rows.length, 2)
  assert.deepEqual(rows[0].competencyGrades, { C1: 'A', C2: 'B' })
  assert.equal(rows[0].lastLookGrade, 'A')
  assert.equal(rows[0].profile, 'stable')
  assert.match(rows[0].qualitativeNotes, /Constància: 75%/)
  assert.match(rows[0].qualitativeNotes, /Incidències registrades: 1/)
  assert.match(rows[0].qualitativeNotes, /UT1: C; UT2: A/)
  assert.ok(!rows[0].qualitativeNotes.includes('private'))
  assert.equal(rows[1].hasData, false)
  assert.equal(rows[1].profile, '')
  assert.deepEqual(state, snapshot)
})

test('exporta només seleccionats i permet importar el resum en una classe nova', () => {
  const antecedents = prepareClassAntecedents(state, classItem)
  const payload = buildAntecedentsExport({ classItem, students: [state.students[0]], antecedents })
  assert.equal(payload.students.length, 1)
  assert.equal(payload.students[0].studentName, 'Tom Valls')
  const current = [{ id: 'new-tom', name: 'Tom Valls', classId: '3rB' }]
  const assignments = matchAntecedentStudents(JSON.parse(JSON.stringify(payload)).students, current)
  assert.equal(validateAntecedentAssignments(assignments, current), '')
  assert.equal(assignments[0].studentId, 'new-tom')
  assert.match(assignments[0].antecedent.qualitativeNotes, /75%/)
})

test('no arrossega antecedents antics i diferencia tasques exemptes i sense registre', () => {
  const altered = structuredClone(state)
  altered.studentAntecedents = [{ studentId: 'tom', lastLookGrade: 'D', qualitativeNotes: 'Antic' }]
  altered.taskRecords = [{ studentId: 'tom', taskId: 't1', status: 'EXEMPT' }]
  const rows = prepareClassAntecedents(altered, classItem)
  assert.equal(rows[0].lastLookGrade, 'A')
  assert.match(rows[0].qualitativeNotes, /1 exemptes, 1 sense registre/)
  assert.ok(!rows[0].qualitativeNotes.includes('Antic'))
})
