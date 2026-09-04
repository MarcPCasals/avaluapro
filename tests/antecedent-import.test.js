import assert from 'node:assert/strict'
import { test } from 'node:test'
import { matchAntecedentStudents, validateAntecedentAssignments } from '../src/features/data/antecedentImport.js'

const students = [
  { id: 'tom', name: 'Tom Valls', classId: '3rB' },
  { id: 'claudia', name: 'Clàudia Taurinya', classId: '3rD' },
]

test('relaciona noms de la mateixa classe antiga amb classes actuals diferents', () => {
  const rows = matchAntecedentStudents([
    { studentName: 'Tom Valls', classId: '2nC', antecedent: { profile: 'tom-profile' } },
    { studentName: ' CLAUDIA  TAURINYA ', classId: '2nC', antecedent: { profile: 'claudia-profile' } },
  ], students)
  assert.deepEqual(rows.map((row) => row.studentId), ['tom', 'claudia'])
  assert.equal(rows[1].antecedent.profile, 'claudia-profile')
  assert.equal(validateAntecedentAssignments(rows, students), '')
})

test('noms desconeguts, buits i homònims requereixen assignació manual', () => {
  const roster = [...students, { id: 'tom2', name: 'Tom Valls', classId: '3rD' }]
  const rows = matchAntecedentStudents([
    { studentName: 'Tom Valls' }, { studentName: 'Claudia Taurina' }, { studentName: '' },
  ], roster)
  assert.ok(rows.every((row) => row.studentId === '' && row.matchReason))
  assert.ok(validateAntecedentAssignments(rows, roster))
  assert.equal(validateAntecedentAssignments([
    { ...rows[0], studentId: 'tom2' }, { ...rows[1], studentId: 'claudia' }, { ...rows[2], studentId: 'tom' },
  ], roster), '')
})

test('impedeix sobreescriptures per duplicats i destinataris eliminats', () => {
  const rows = matchAntecedentStudents([{ studentName: 'Tom Valls' }, { studentName: 'Tom Valls' }], students)
  assert.match(validateAntecedentAssignments(rows, students), /mateix alumne/)
  assert.ok(validateAntecedentAssignments([{ studentId: 'removed' }], students))
  assert.ok(validateAntecedentAssignments([], students))
})

test('importa un paquet de classes diferents i omet explícitament un alumne absent', async () => {
  const { getAntecedentsToImport } = await import('../src/features/data/antecedentImport.js')
  const rows = matchAntecedentStudents([
    { studentName: 'Tom Valls' }, { studentName: 'Claudia Taurinya' }, { studentName: 'Alumne absent' },
  ], students)
  assert.ok(validateAntecedentAssignments(rows, students))
  rows[2].skipped = true
  assert.equal(validateAntecedentAssignments(rows, students), '')
  assert.deepEqual(getAntecedentsToImport(rows).map((row) => row.studentId), ['tom', 'claudia'])
  rows[2].skipped = false
  assert.ok(validateAntecedentAssignments(rows, students))
})

test('omet també coincidències i permet finalitzar sense importar cap alumne', async () => {
  const { getAntecedentsToImport } = await import('../src/features/data/antecedentImport.js')
  const rows = matchAntecedentStudents([{ studentName: 'Tom Valls' }, { studentName: 'Tom Valls' }], students)
  rows[1].skipped = true
  assert.equal(validateAntecedentAssignments(rows, students), '')
  assert.equal(getAntecedentsToImport(rows).length, 1)
  rows[0].skipped = true
  assert.equal(validateAntecedentAssignments(rows, students), '')
  assert.deepEqual(getAntecedentsToImport(rows), [])
})
