import assert from 'node:assert/strict'
import test from 'node:test'

import { getManuallyCompletedRecoveryOptions } from '../src/features/agenda/agendaRecoveryOptions.js'

test('una activitat marcada com a feta es pot recuperar encara que no tingui sessió', () => {
  const activities = [
    { id: 'done', title: 'Experiment anterior', plannedMinutes: 80 },
    { id: 'pending', title: 'Activitat pendent', plannedMinutes: 20 },
  ]
  const options = getManuallyCompletedRecoveryOptions({
    activities,
    overrides: [{ activityId: 'done', changes: { manuallyCompleted: true }, updatedAt: '2026-11-25' }],
    session: { durationMinutes: 60 },
    unit: { id: 'up-1', code: 'UP 1', title: 'La matèria' },
  })

  assert.equal(options.length, 1)
  assert.equal(options[0].sourceActivityId, 'done')
  assert.equal(options[0].sourcePlanningUnitId, 'up-1')
  assert.equal(options[0].plannedMinutes, 55)
  assert.equal(options[0].isManuallyCompleted, true)
})

test('una marca posterior que desfà el fet exclou l’activitat de recuperació', () => {
  const options = getManuallyCompletedRecoveryOptions({
    activities: [{ id: 'done', title: 'Experiment anterior', plannedMinutes: 30 }],
    overrides: [
      { activityId: 'done', changes: { manuallyCompleted: true }, updatedAt: '2026-11-24' },
      { activityId: 'done', changes: { manuallyCompleted: false }, updatedAt: '2026-11-25' },
    ],
    session: { durationMinutes: 60 },
    unit: { id: 'up-1' },
  })

  assert.deepEqual(options, [])
})
