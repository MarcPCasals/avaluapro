import assert from 'node:assert/strict'
import test from 'node:test'
import { getActiveSeatingPlans, assignActiveSeatingPlan } from '../src/features/tutoring/activeSeatingPlans.js'
const base = [{ id: 'one', classId: 'c', isActive: true }, { id: 'two', classId: 'c' }, { id: 'other', classId: 'd', isActive: true }]
test('cada mig grup es pot activar i desactivar independentment del grup sencer', () => {
  const a = assignActiveSeatingPlan(base, 'c', 'A', 'two', '1')
  const b = assignActiveSeatingPlan(a, 'c', 'B', 'one', '2')
  assert.equal(getActiveSeatingPlans(b, 'c').all.id, 'one')
  assert.equal(getActiveSeatingPlans(b, 'c').A.id, 'two')
  assert.equal(getActiveSeatingPlans(b, 'c').B.id, 'one')
  const disabled = assignActiveSeatingPlan(b, 'c', 'A', '', '3')
  assert.equal(getActiveSeatingPlans(disabled, 'c').A, null)
  assert.equal(getActiveSeatingPlans(disabled, 'c').B.id, 'one')
  assert.equal(base[1].activeHalfGroups, undefined)
  assert.deepEqual(b[2], base[2])
})
test('canviar el grup sencer conserva els mitjos grups i no permet deixar-lo buit', () => {
  const a = assignActiveSeatingPlan(base, 'c', 'A', 'one', '1')
  const changed = assignActiveSeatingPlan(a, 'c', 'all', 'two', '2')
  assert.equal(getActiveSeatingPlans(changed, 'c').all.id, 'two')
  assert.equal(getActiveSeatingPlans(changed, 'c').A.id, 'one')
  assert.throws(() => assignActiveSeatingPlan(base, 'c', 'all', '', '3'))
  assert.throws(() => assignActiveSeatingPlan(base, 'c', 'B', 'other', '3'))
})
test('les versions antigues tenen grup sencer per defecte i mitjos grups desactivats', () => {
  const active = getActiveSeatingPlans([{ id: 'old', classId: 'c', createdAt: '1' }, { id: 'new', classId: 'c', createdAt: '2' }], 'c')
  assert.equal(active.all.id, 'new')
  assert.equal(active.A, null)
  assert.equal(active.B, null)
})
