import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSocialSubgroups, getPositiveComponentMap } from '../src/features/tutoring/sociometricSubgroupUtils.js'
const students = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id, name: `Fictici ${id}` }))
const relation = (source, target, type = 'friendship') => ({ sourceStudentId: source, targetStudentId: target, type })
test('els subgrups inclouen les cadenes d’afinitats encara que no siguin recíproques', () => {
  const groups = buildSocialSubgroups(students, [relation('a', 'b'), relation('b', 'c'), relation('d', 'e')])
  assert.deepEqual(groups.map((g) => g.members.map((s) => s.id)), [['a', 'b', 'c'], ['d', 'e']])
  assert.equal(groups.length, 2)
})
test('treball, rebuig, autorelacions, duplicats i altres classes no inventen subgrups socials', () => {
  const groups = buildSocialSubgroups(students, [relation('a', 'b'), relation('a', 'b'), relation('b', 'a'), relation('c', 'd', 'positive'), relation('d', 'e', 'avoid'), relation('f', 'f'), relation('e', 'other'), relation('other', 'f')])
  assert.deepEqual(groups.map((g) => g.members.map((s) => s.id)), [['a', 'b']])
  assert.equal(buildSocialSubgroups(students, []).length, 0)
})
test('un únic component pot contenir tota la classe', () => {
  const groups = buildSocialSubgroups(students, students.slice(1).map((s, i) => relation(students[i].id, s.id)))
  assert.equal(groups.length, 1)
  assert.equal(groups[0].members.length, students.length)
})
test('el mapa general conserva treball i afinitats sense ponts d’alumnes aliens', () => {
  const components = getPositiveComponentMap(students, [relation('a', 'b', 'positive'), relation('b', 'c'), relation('c', 'other'), relation('other', 'd')])
  assert.equal(components.get('a'), components.get('c'))
  assert.notEqual(components.get('c'), components.get('d'))
  assert.equal(components.has('other'), false)
})
test('identificadors amb delimitadors no es confonen ni alteren els recomptes', () => {
  const roster = ['a', 'b__c', 'a__b', 'c'].map((id) => ({ id, name: id }))
  assert.equal(buildSocialSubgroups(roster, [relation('a', 'b__c'), relation('a__b', 'c')]).length, 2)
})
