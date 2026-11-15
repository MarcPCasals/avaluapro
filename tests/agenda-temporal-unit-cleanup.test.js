import test from 'node:test'
import assert from 'node:assert/strict'
import { selectPriorTemporalUnitCleanup } from '../src/features/agenda/temporalUnitCleanup.js'

const units = [
  { id: 'ut1', startsOn: '2026-09-01', endsOn: '2026-11-15' },
  { id: 'ut2', startsOn: '2026-11-16', endsOn: '2027-01-31' },
]
const now = '2026-11-15T17:00:00.000Z'
const item = (id) => ({ id, sessionId: 'session', title: id })
const bundle = (id, unitId, startsAt, changes = {}) => ({
  planningUnit: { temporalUnitId: unitId },
  session: { id, startsAt, status: 'planned', ...changes },
  items: [item(`${id}-activity`)], results: [],
})

test('proposes only future activities from an earlier UT after the new UT begins', () => {
  const records = [
    bundle('old-future', 'ut1', '2026-11-20T09:00:00'),
    bundle('old-history', 'ut1', '2026-11-13T09:00:00'),
    bundle('new-future', 'ut2', '2026-11-20T10:00:00'),
    bundle('completed', 'ut1', '2026-11-21T09:00:00', { status: 'completed' }),
  ]
  assert.deepEqual(selectPriorTemporalUnitCleanup(records, units, units[0], now), [])
  assert.deepEqual(selectPriorTemporalUnitCleanup(records, units, units[1], now)
    .map(({ bundle: candidate }) => candidate.session.id), ['old-future'])
  assert.deepEqual(selectPriorTemporalUnitCleanup(records, units, units[1], now)
    .map(({ bundle: candidate }) => candidate.session.id), ['old-future'])
})

test('preserves confirmed attendance and excludes virtual Babèlium items', () => {
  const protectedBundle = bundle('confirmed', 'ut1', '2026-11-20T09:00:00', { attendanceConfirmedAt: now })
  const candidate = bundle('candidate', 'ut1', '2026-11-20T10:00:00')
  candidate.items.push({ id: 'babelium_session', sessionId: 'session' })
  const selected = selectPriorTemporalUnitCleanup([protectedBundle, candidate], units, units[1], now)
  assert.equal(selected.length, 1)
  assert.deepEqual(selected[0].items.map(({ id }) => id), ['candidate-activity'])
})
