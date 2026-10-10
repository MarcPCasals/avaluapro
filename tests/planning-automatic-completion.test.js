import assert from 'node:assert/strict'
import test from 'node:test'
import { summarizeCompletedActivityIds } from '../src/domain/planning/scheduler.js'

const now = '2026-10-10T10:00:00'
function bundle(id, changes = {}, items = [{ id: `item-${id}`, sourceActivityId: 'atoms' }], results = []) {
  return { session: { id, startsAt: '2026-10-10T09:00:00', durationMinutes: 60, status: 'planned', ...changes }, items, results }
}
const completed = (bundles, clock = now) => [...summarizeCompletedActivityIds(bundles, { now: clock })]

test('una sessió passada completa les activitats sense obrir Mode aula ni clicar Fet', () => {
  assert.deepEqual(completed([bundle('past')]), ['atoms'])
  assert.deepEqual(completed([bundle('past')], '2026-10-10T09:59:59'), [])
  assert.deepEqual(completed([bundle('future', { startsAt: '2026-10-11T09:00:00' })]), [])
})

test('les sessions anul·lades, no impartides o amb hora invàlida no completen activitats', () => {
  for (const changes of [{ status: 'cancelled' }, { status: 'notHeld' }, { startsAt: null }, { startsAt: 'invalid' }, { durationMinutes: 0 }]) {
    assert.deepEqual(completed([bundle('excluded', changes)]), [])
  }
})

test('els resultats explícits prevalen sobre la finalització de la sessió', () => {
  for (const status of ['skipped', 'notHeld', 'continued']) {
    assert.deepEqual(completed([bundle('exception', {}, undefined, [{ sessionItemId: 'item-exception', status }])]), [])
  }
  assert.deepEqual(completed([bundle('explicit', { startsAt: '2026-10-11T09:00:00' }, undefined, [{ sessionItemId: 'item-explicit', status: 'completed' }])]), ['atoms'])
})

test('cal que els dos mitjos grups hagin acabat', () => {
  const a = bundle('a', { subgroupId: 'A' })
  const b = bundle('b', { subgroupId: 'B', startsAt: '2026-10-10T10:00:00' })
  assert.deepEqual(completed([a, b]), [])
  assert.deepEqual(completed([a, b], '2026-10-10T11:00:00'), ['atoms'])
})

test('una activitat fragmentada espera la part final i conserva les excepcions anteriors', () => {
  const first = bundle('first', {}, [{ id: 'first', sourceActivityId: 'atoms', segmentIndex: 1, segmentCount: 2 }])
  const last = bundle('last', { startsAt: '2026-10-11T09:00:00' }, [{ id: 'last', sourceActivityId: 'atoms', segmentIndex: 2, segmentCount: 2 }])
  assert.deepEqual(completed([first]), [])
  assert.deepEqual(completed([first, last]), [])
  assert.deepEqual(completed([first, last], '2026-10-11T10:00:00'), ['atoms'])
  first.results = [{ sessionItemId: 'first', status: 'skipped' }]
  assert.deepEqual(completed([first, last], '2026-10-11T10:00:00'), [])
  first.results = [{ sessionItemId: 'first', status: 'continued' }]
  assert.deepEqual(completed([first, last], '2026-10-11T10:00:00'), ['atoms'])
})

test('el càlcul és retroactiu i no escriu resultats ni canvia la sessió original', () => {
  const past = bundle('old', { startsAt: '2026-09-25T09:00:00' })
  const before = structuredClone(past)
  assert.deepEqual(completed([past]), ['atoms'])
  assert.deepEqual(past, before)
})
