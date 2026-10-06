import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { proposeHalfGroups, halfGroupPartitionKey, analyzeHalfGroups } from '../src/features/tutoring/halfGroupUtils.js'
import { createHalfGroupProposal, hasCurrentHalfGroupRoster } from '../src/features/tutoring/halfGroupProposalUtils.js'
import { halfGroupGenderGap } from '../src/features/tutoring/genderBalanceUtils.js'
const roster = (size) => Array.from({ length: size }, (_, i) => ({ id: String(i), gender: i % 2 ? 'girl' : 'boy', halfGroup: i % 2 ? 'Grup B' : 'Grup A' }))

test('genera alternatives reals, no simples inversions A/B, mantenint mides, gènere i bloquejos', () => {
  for (const size of [8, 18, 24, 31]) {
    const students = roster(size)
    const excludedProposals = []
    const keys = new Set()
    for (let variant = 0; variant < 5; variant += 1) {
      const result = proposeHalfGroups(students, [], { 0: 'Grup A', 1: 'Grup B' }, { excludedProposals, variant })
      const key = halfGroupPartitionKey(students, result)
      assert.equal(keys.has(key), false)
      assert.equal(result[0], 'Grup A'); assert.equal(result[1], 'Grup B')
      const a = Object.values(result).filter((group) => group === 'Grup A').length
      assert.ok(Math.abs(a - (size - a)) <= 1)
      assert.ok(halfGroupGenderGap(students, result) <= 2)
      keys.add(key); excludedProposals.push(result)
    }
  }
})
test('l’alternativa encara segueix l’ordre treball, negatives i afinitats', () => {
  const students = roster(6)
  const relations = [{ sourceStudentId: '0', targetStudentId: '1', type: 'positive', strength: 5 }, { sourceStudentId: '2', targetStudentId: '3', type: 'friendship', strength: 5 }]
  const first = proposeHalfGroups(students, relations)
  const second = proposeHalfGroups(students, relations, {}, { excludedProposals: [first] })
  assert.notEqual(halfGroupPartitionKey(students, first), halfGroupPartitionKey(students, second))
  assert.equal(analyzeHalfGroups(students, relations, second).work, 5)
})
test('informa quan els bloquejos o la mida no deixen més alternatives', () => {
  const students = roster(2)
  const first = proposeHalfGroups(students, [])
  assert.throws(() => proposeHalfGroups(students, [], {}, { excludedProposals: [first] }), /cap altra proposta/)
  const locked = roster(6)
  const locks = Object.fromEntries(locked.map((s) => [s.id, s.halfGroup]))
  assert.throws(() => proposeHalfGroups(locked, [], locks, { excludedProposals: [locks] }), /cap altra proposta/)
})
test('desar copia les assignacions i valida nom, alumnat i equilibri sense canviar el grup vigent', () => {
  const students = roster(4)
  const before = structuredClone(students)
  const assignments = { 0: 'Grup A', 1: 'Grup A', 2: 'Grup B', 3: 'Grup B' }
  const input = { students, assignments, lockedIds: ['0', '0', 'other'], name: ' Alternativa 1 ', id: 'proposal', createdAt: '2026-10-06T10:00:00Z' }
  const result = createHalfGroupProposal(input)
  assert.equal(result.name, 'Alternativa 1')
  assert.deepEqual(result.lockedIds, ['0'])
  assignments[0] = 'Grup B'
  assert.equal(result.assignments[0], 'Grup A')
  assert.deepEqual(students, before)
  assert.throws(() => createHalfGroupProposal({ ...input, name: '' }))
  assert.throws(() => createHalfGroupProposal({ ...input, assignments: { 0: 'Grup A' } }))
  assert.throws(() => createHalfGroupProposal({ ...input, assignments: Object.fromEntries(students.map((s) => [s.id, 'Grup A'])) }))
})
test('detecta propostes antigues quan canvia l’alumnat, sense confondre A/B invertits', () => {
  const students = roster(4)
  const assignments = Object.fromEntries(students.map((s) => [s.id, s.halfGroup]))
  assert.equal(hasCurrentHalfGroupRoster(students, assignments), true)
  assert.equal(hasCurrentHalfGroupRoster([...students, { id: 'new' }], assignments), false)
  assert.equal(hasCurrentHalfGroupRoster(students.slice(1), assignments), false)
  const reverse = Object.fromEntries(students.map((s) => [s.id, s.halfGroup === 'Grup A' ? 'Grup B' : 'Grup A']))
  assert.equal(halfGroupPartitionKey(students, assignments), halfGroupPartitionKey(students, reverse))
  assert.equal(halfGroupPartitionKey(students, { ...assignments, other: 'Grup A' }), '')
})
test('la persistència desa i elimina només propostes de la classe, sense aplicar-les ni escriure alumnes', async () => {
  const source = await readFile(new URL('../src/store/useAvaluaproStore.js', import.meta.url), 'utf8')
  const students = roster(4).map((s) => ({ ...s, classId: 'class' }))
  let state = { students, classes: [{ id: 'class' }, { id: 'other', halfGroupProposals: [{ id: 'other-proposal' }] }] }
  const beforeStudents = structuredClone(students)
  const collections = []
  const set = (fn) => { state = { ...state, ...fn(state) } }
  const get = () => state
  const persist = async (_set, _get, keys, options) => { collections.push(keys); assert.equal(options.throwOnError, true) }
  const body = source.split('  saveClassHalfGroupProposal: async (classId, proposal) => {')[1].split('\n  deleteClassHalfGroupProposal:')[0].replace(/},\s*$/, '')
  const save = new Function('set', 'get', 'persistCollections', 'createHalfGroupProposal', 'createId', `return async (classId, proposal) => {${body}}`)(set, get, persist, createHalfGroupProposal, () => 'saved-id')
  const assignments = { 0: 'Grup A', 1: 'Grup A', 2: 'Grup B', 3: 'Grup B' }
  const saved = await save('class', { name: 'Proposta', assignments, lockedIds: ['0'] })
  assert.equal(saved.id, 'saved-id')
  assert.equal(state.classes[0].halfGroupProposals.length, 1)
  assert.equal(state.classes[1].halfGroupProposals[0].id, 'other-proposal')
  assert.deepEqual(state.students, beforeStudents)
  const deleteBody = source.split('  deleteClassHalfGroupProposal: async (classId, proposalId) => {')[1].split('\n  applyClassHalfGroups:')[0].replace(/},\s*$/, '')
  const remove = new Function('set', 'get', 'persistCollections', `return async (classId, proposalId) => {${deleteBody}}`)(set, get, persist)
  await remove('class', saved.id)
  assert.equal(state.classes[0].halfGroupProposals.length, 0)
  assert.deepEqual(state.students, beforeStudents)
  assert.deepEqual(collections, [['classes'], ['classes']])
  await assert.rejects(save('class', { name: 'Incomplete', assignments: { 0: 'Grup A' } }))
  await assert.rejects(save('missing', { name: 'Absent', assignments }))
  const failed = new Function('set', 'get', 'persistCollections', 'createHalfGroupProposal', 'createId', `return async (classId, proposal) => {${body}}`)(set, get, async () => { throw new Error('write failed') }, createHalfGroupProposal, () => 'fail')
  await assert.rejects(failed('class', { name: 'Test', assignments }), /write failed/)
  assert.deepEqual(state.students, beforeStudents)
})
