import test from 'node:test'
import assert from 'node:assert/strict'
import { getPlanningActivityProgress } from '../src/domain/planning/activityProgress.js'
const now = '2026-10-10T10:00:00'
const activities = [{ id: 'atoms', plannedMinutes: 40 }, { id: 'notebook', plannedMinutes: 15 }, { id: 'test', plannedMinutes: 30 }, { id: 'lab', plannedMinutes: 55 }]
function bundle(id, startsAt, items, extra = {}) {
  return { session: { id, startsAt, durationMinutes: 60, status: 'planned', ...extra }, items: items.map(([sourceActivityId, plannedMinutes], index) => ({id: `${id}-${index}`, sourceActivityId, plannedMinutes, segmentIndex: 1, segmentCount: 4})), results: [] }
}
const past = '2026-10-09T09:00:00'
const future = '2026-10-11T09:00:00'
const progress = (bundles, overrides = []) => getPlanningActivityProgress(activities, bundles, overrides, { now })
test('fragments antics amb numeració obsoleta: compta els minuts, completa Notebook i laboratori i conserva la part pendent dels àtoms', () => {
  const result = progress([bundle('past', past, [['atoms', 55], ['notebook', 15], ['lab', 55]]), bundle('next', future, [['atoms', 40]])])
  assert.equal(result.atoms.completed, false)
  assert.equal(result.atoms.remainingMinutes, 40)
  assert.equal(result.notebook.completed, true)
  assert.equal(result.lab.completed, true)
  assert.equal(result.test.completed, false)
})
test('retirar no és completar i recuperar desfà la retirada', () => {
  const overrides = [{activityId: 'test', changes: {withdrawnFromAgenda: true}, updatedAt: '1'}]
  const result = progress([], overrides)
  assert.equal(result.test.withdrawn, true)
  assert.equal(result.test.completed, false)
  assert.equal(progress([], [...overrides, {activityId: 'test', changes: {withdrawnFromAgenda: false}, updatedAt: '2'}]).test.withdrawn, false)
  assert.equal(progress([bundle('other', future, [['test', 30]])], overrides).test.withdrawn, false)
})
test('els mitjos grups no dupliquen els minuts i esperen el segon grup', () => {
  const a = bundle('a', past, [['lab', 55]], { subgroupId: 'A' })
  const b = bundle('b', '2026-10-09T11:00:00', [['lab', 55]], { subgroupId: 'B' })
  b.results = [{sessionItemId: 'b-0', status: 'skipped'}]
  assert.equal(progress([a, b]).lab.remainingMinutes, 55)
  b.results = []
  assert.equal(progress([a, b]).lab.completed, true)
  assert.equal(progress([a, b]).lab.completedMinutes, 55)
})
test('una sessió anul·lada no compta com impartida', () => {
  assert.equal(progress([bundle('cancel', past, [['lab', 55]], {status: 'cancelled'})]).lab.completed, false)
})
test('la part sense calendari continua pendent', () => {
  assert.equal(progress([bundle('part', past, [['lab', 20]])]).lab.remainingMinutes, 35)
  assert.equal(progress([bundle('part', past, [['lab', 20]])]).lab.completed, false)
})
test('l’etiqueta de minuts pendents no modifica activitats, sessions ni adaptacions', () => {
  const bundles = [bundle('part', past, [['lab', 20]])]
  const overrides = [{activityId: 'lab', changes: {agendaPlannedMinutes: 60}}]
  const before = structuredClone({ activities, bundles, overrides })
  assert.equal(progress(bundles, overrides).lab.remainingMinutes, 40)
  assert.deepEqual({ activities, bundles, overrides }, before)
})
