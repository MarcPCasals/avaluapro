import test from 'node:test'
import assert from 'node:assert/strict'
import { proposeHalfGroups } from '../src/features/tutoring/halfGroupUtils.js'
import { countStudentGenders, halfGroupGenderGap, studentRelationWarning } from '../src/features/tutoring/genderBalanceUtils.js'
import { exactGenderAssociation, summarizeSociometricGender } from '../src/features/tutoring/sociometricGenderUtils.js'
import { createCooperativeSociometricHelpers } from '../src/features/tutoring/cooperativeGroupSociometricUtils.js'
const roster = (n) => Array.from({ length: n }, (_, i) => ({ id: String(i), name: `Fictici ${i}`, gender: i < n / 2 ? 'boy' : 'girl' }))
test('reparteix nois i noies abans d’optimitzar treball, en classes petites i grans', () => {
  for (const n of [8, 18, 30]) {
    const students = roster(n)
    const relations = students.slice(0, n / 2 - 1).map((s, i) => ({ sourceStudentId: s.id, targetStudentId: String(i + 1), type: 'positive', strength: 5 }))
    const result = proposeHalfGroups(students, relations)
    assert.ok(halfGroupGenderGap(students, result) <= 2)
    for (const gender of ['boy', 'girl']) assert.ok(Math.abs(students.filter((s) => s.gender === gender && result[s.id] === 'Grup A').length - students.filter((s) => s.gender === gender && result[s.id] === 'Grup B').length) <= 1)
  }
})
test('els bloquejos prevalen sobre l’equilibri de gènere i no es dedueixen dades absents', () => {
  const students = roster(8)
  const result = proposeHalfGroups(students, [], { 0: 'Grup B', 1: 'Grup B', 2: 'Grup B' })
  assert.equal(result[0], 'Grup B'); assert.equal(result[1], 'Grup B'); assert.equal(result[2], 'Grup B')
  assert.equal(countStudentGenders([{ name: 'Maria' }, { name: 'Joan', gender: 'other' }]).unknown, 1)
  assert.equal(countStudentGenders([{ gender: 'other' }]).other, 1)
})
test('els avisos canvien en moure alumnes, ignoren autorrelacions i altres classes', () => {
  const students = roster(4)
  const relation = { sourceStudentId: '0', targetStudentId: '1', type: 'avoid' }
  const relations = [relation, { ...relation, targetStudentId: 'other' }, { ...relation, targetStudentId: '0' }]
  assert.equal(studentRelationWarning('0', students, relations, { 0: 'Grup A', 1: 'Grup A' }).tone, 'danger')
  assert.equal(studentRelationWarning('1', students, relations, { 0: 'Grup A', 1: 'Grup B' }).tone, 'warning')
  assert.equal(studentRelationWarning('2', students, relations, {}).tone, '')
})
test('Fisher bilateral concorda amb valors de referència i és simètric', () => {
  assert.ok(Math.abs(exactGenderAssociation(6, 2, 1, 4) - 0.10256410256410257) < 1e-12)
  assert.ok(Math.abs(exactGenderAssociation(8, 2, 1, 5) - 0.034965034965034975) < 1e-12)
  assert.equal(exactGenderAssociation(0, 10, 0, 10), 1)
  assert.ok(Math.abs(exactGenderAssociation(1, 5, 8, 2) - exactGenderAssociation(8, 2, 1, 5)) < 1e-12)
})
test('compara proporcions, corregeix dues proves i evita conclusions amb dades incompletes', () => {
  const students = roster(20)
  const rows = students.map((student) => ({ student, category: student.gender === 'girl' ? 'Rebutjat' : 'Líder', avoidReceived: student.gender === 'girl' ? 2 : 0 }))
  const report = summarizeSociometricGender(students, rows, true)
  assert.equal(report.comparisons[0].signal, true)
  assert.equal(report.comparisons[0].higher, 'girl')
  assert.equal(report.comparisons[1].higher, 'boy')
  assert.equal(report.groups[1].averageRejection, 2)
  assert.equal(summarizeSociometricGender(students, rows, false).eligible, false)
  assert.equal(summarizeSociometricGender([...students, { id: 'unknown' }], rows, true).comparisons[0].p, null)
  const small = roster(4)
  assert.equal(summarizeSociometricGender(small, small.map((student) => ({ student, category: 'Líder' })), true).eligible, false)
  const same = rows.map((row) => ({ ...row, category: 'Promig' }))
  assert.equal(summarizeSociometricGender(students, same, true).comparisons[0].signal, false)
})
test('la correcció evita donar per significativa una prova aïllada amb p=0,035', () => {
  const students = [...Array.from({ length: 10 }, (_, i) => ({ id: `b${i}`, gender: 'boy' })), ...Array.from({ length: 6 }, (_, i) => ({ id: `g${i}`, gender: 'girl' }))]
  const rows = students.map((student, i) => ({ student, category: i < 8 || i === 10 ? 'Rebutjat' : 'Promig' }))
  const comparison = summarizeSociometricGender(students, rows, true).comparisons[0]
  assert.ok(comparison.p < .05); assert.ok(comparison.adjustedP > .05); assert.equal(comparison.signal, false)
})
test('els grups cooperatius reparteixen les dades de gènere del mateix perfil', () => {
  const helpers = createCooperativeSociometricHelpers({ getRelationInfluence: () => 1, getRelationTypeMeta: () => ({}) })
  const groups = helpers.buildCooperativeGroups({ groupSize: 4, prioritizeHalfGroups: false, profiles: roster(16).map((student) => ({ student, averageScore: 2.7 })), recordRowsByStudent: new Map(), relationRowsByStudent: new Map(), relations: [], strategy: 'balanced' })
  assert.equal(groups.flatMap((g) => g.members).length, 16)
  groups.forEach((g) => assert.deepEqual(countStudentGenders(g.members.map((m) => m.student)), { boy: 2, girl: 2, other: 0, unknown: 0 }))
})
test('l’equilibri cooperatiu conserva els mitjos grups i no crea incompatibilitats per fer intercanvis', () => {
  const helpers = createCooperativeSociometricHelpers({ getRelationInfluence: (r) => r.strength || 1, getRelationTypeMeta: () => ({}) })
  const students = roster(16).map((s, i) => ({ ...s, halfGroup: i % 2 ? 'Grup B' : 'Grup A' }))
  const groups = helpers.buildCooperativeGroups({ groupSize: 4, prioritizeHalfGroups: true, profiles: students.map((student) => ({ student, averageScore: 2.7 })), recordRowsByStudent: new Map(), relationRowsByStudent: new Map(), relations: [{ sourceStudentId: '0', targetStudentId: '8', type: 'avoid', strength: 5 }], strategy: 'balanced' })
  assert.equal(groups.flatMap((g) => g.members).length, 16)
  groups.forEach((g) => {
    assert.equal(new Set(g.members.map((m) => m.student.halfGroup)).size, 1)
    assert.equal(g.avoidRelations.length, 0)
  })
})
