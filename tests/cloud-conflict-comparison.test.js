import assert from 'node:assert/strict'
import test from 'node:test'
import { compareCloudConflictDatasets } from '../src/lib/cloudConflictComparison.js'

test('recomana el dispositiu quan tots els canvis comparables són locals i més recents', () => {
  const result = compareCloudConflictDatasets(
    { classes: [{ id: 'c1', name: 'Actual', updatedAt: '2026-09-20T12:00:00.000Z' }] },
    { classes: [{ id: 'c1', name: 'Anterior', updatedAt: '2026-09-20T10:00:00.000Z' }] },
    ['classes'],
  )

  assert.equal(result.recommendation, 'local')
  assert.equal(result.rows[0].localNewer, 1)
})

test('no recomana substituir res si hi ha registres exclusius o sense data comparable', () => {
  const result = compareCloudConflictDatasets(
    { tasks: [{ id: 't1', title: 'Local' }, { id: 't2', title: 'Només local' }] },
    { tasks: [{ id: 't1', title: 'Firebase' }, { id: 't3', title: 'Només Firebase' }] },
    ['tasks'],
  )

  assert.equal(result.recommendation, 'review')
  assert.deepEqual(result.totals, {
    cloudNewer: 0,
    cloudOnly: 1,
    localNewer: 0,
    localOnly: 1,
    uncertain: 1,
  })
})
