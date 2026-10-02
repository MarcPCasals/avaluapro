import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeHalfGroups, proposeHalfGroups } from '../src/features/tutoring/halfGroupUtils.js'
const students = Array.from({ length: 4 }, (_, index) => ({ id: String(index), name: `Fictici ${index}` }))
const relation = (source, target, type, strength = 3) => ({ sourceStudentId: String(source), targetStudentId: String(target), type, strength })

test('treball té prioritat sobre afinitat, i separa incompatibilitats si el treball és igual', () => {
  const relations = [relation(0, 1, 'positive'), relation(2, 3, 'positive'), relation(0, 2, 'friendship', 5), relation(1, 3, 'friendship', 5), relation(0, 3, 'avoid')]
  const result = proposeHalfGroups(students, relations)
  assert.equal(result[0], result[1])
  assert.equal(result[2], result[3])
  assert.notEqual(result[0], result[3])
})
test('negatives precedeixen les afinitats quan no hi ha treball', () => {
  const relations = [relation(0, 1, 'avoid'), relation(0, 1, 'friendship', 5), relation(2, 3, 'friendship', 5)]
  const result = proposeHalfGroups(students, relations)
  assert.notEqual(result[0], result[1])
  assert.equal(analyzeHalfGroups(students, relations, result).negative, 0)
})
test('prioritza afinitats quan treball i negatives empaten', () => {
  const result = proposeHalfGroups(students, [relation(0, 3, 'friendship')])
  assert.equal(result[0], result[3])
})
test('compta totes les direccions, exclou altres classes i informa de conflictes', () => {
  const result = analyzeHalfGroups(students, [relation(0, 1, 'positive'), relation(1, 0, 'positive'), relation(0, 1, 'avoid'), relation(0, 9, 'positive')], { 0: 'Grup A', 1: 'Grup A' })
  assert.equal(result.work, 6)
  assert.equal(result.conflicts.length, 1)
})
test('mida parella i senar, tots assignats, determinisme en classes grans', () => {
  for (const size of [0, 1, 5, 18, 31]) {
    const roster = Array.from({ length: size }, (_, index) => ({ id: String(index), halfGroup: index % 2 ? 'Grup A' : 'Grup B' }))
    const result = proposeHalfGroups(roster, [])
    const a = Object.values(result).filter((name) => name === 'Grup A').length
    assert.equal(Object.keys(result).length, size)
    assert.ok(Math.abs(a - (size - a)) <= 1)
    assert.deepEqual(result, proposeHalfGroups(roster, []))
  }
})

test('aplicar actualitza alumnes i classe en una sola persistència i Mode aula llegeix els nous A/B', async () => {
  const { readFile } = await import('node:fs/promises')
  const { getClassroomStudents } = await import('../src/domain/planning/classroom.js')
  const source = await readFile(new URL('../src/store/useAvaluaproStore.js', import.meta.url), 'utf8')
  const body = source.split('  applyClassHalfGroups: async (classId, assignments, lockedIds = []) => {')[1].split('\n  updateStudent:')[0].replace(/},\s*$/, '')
  let state = {
    classes: [{ id: 'class', halfGroups: ['Anterior'] }, { id: 'other' }],
    students: [...students.map((student) => ({ ...student, classId: 'class', halfGroup: 'Grup A' })), { id: 'other', classId: 'other', halfGroup: 'Antic' }],
  }
  let writes = 0
  const apply = new Function('set', 'get', 'persistCollections', `return async (classId, assignments, lockedIds = []) => {${body}}`)(
    (update) => { state = { ...state, ...update(state) } }, () => state,
    async (_set, _get, collections, options) => { writes += 1; assert.deepEqual(collections, ['classes', 'students']); assert.equal(options.throwOnError, true) },
  )
  const assignments = { 0: 'Grup A', 1: 'Grup B', 2: 'Grup B', 3: 'Grup A' }
  await apply('class', assignments, ['0'])
  assert.equal(writes, 1)
  assert.equal(state.students[0].halfGroupLocked, true)
  assert.equal(state.students[1].halfGroupLocked, false)
  assert.deepEqual(state.classes[0].halfGroups, ['Grup A', 'Grup B'])
  assert.deepEqual(getClassroomStudents(state.students, 'class', 'Grup B').map((student) => student.id), ['1', '2'])
  assert.equal(state.students.at(-1).halfGroup, 'Antic')
  assert.equal(state.students[0].updatedAt, state.students[1].updatedAt)
  const snapshot = structuredClone(state)
  await assert.rejects(apply('class', { 0: 'Grup A' }))
  await assert.rejects(apply('class', { 0: 'Grup A', 1: 'Grup A', 2: 'Grup A', 3: 'Grup A' }))
  assert.deepEqual(state, snapshot)
  assert.equal(writes, 1)
})

test('respecta bloquejos amb grups petits, grans i senars sense invertir A/B', () => {
  for (const size of [4, 5, 24, 31]) {
    const roster = Array.from({ length: size }, (_, index) => ({ id: String(index), halfGroup: 'Grup B' }))
    const locks = { 0: 'Grup A', 1: 'Grup B', 2: 'Grup B' }
    const result = proposeHalfGroups(roster, [relation(0, 1, 'positive', 5)], locks)
    for (const [id, name] of Object.entries(locks)) assert.equal(result[id], name)
    const sizeA = Object.values(result).filter((name) => name === 'Grup A').length
    assert.ok(Math.abs(sizeA - (size - sizeA)) <= 1)
  }
  const result = proposeHalfGroups([...students, { id: '4' }], [], { 0: 'Grup B', 1: 'Grup B', 2: 'Grup B' })
  assert.equal(Object.values(result).filter((name) => name === 'Grup B').length, 3)
})
test('informa de bloquejos que impedeixen equilibrar i conserva les negatives internes', () => {
  assert.throws(() => proposeHalfGroups(students, [], { 0: 'Grup A', 1: 'Grup A', 2: 'Grup A' }), /bloquejos/)
  const relations = [relation(0, 1, 'avoid'), relation(0, 1, 'positive'), relation(1, 0, 'friendship')]
  const result = proposeHalfGroups(students, relations, { 0: 'Grup A', 1: 'Grup A' })
  const analysis = analyzeHalfGroups(students, relations, result)
  assert.equal(analysis.conflicts.length, 1)
  assert.deepEqual(analysis.internalRelations, relations)
})
