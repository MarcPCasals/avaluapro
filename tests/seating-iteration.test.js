import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  getSeatingObjectiveWeights,
  getSeatingZoneIterationState,
  selectBestSeatingCandidate,
} from '../src/features/tutoring/seatingIterationUtils.js'

describe('iteració intel·ligent de disposicions', () => {
  it('aplica pesos diferents segons l’objectiu pedagògic', () => {
    assert.ok(getSeatingObjectiveWeights('calm').conflict > getSeatingObjectiveWeights('balanced').conflict)
    assert.ok(getSeatingObjectiveWeights('support').support > getSeatingObjectiveWeights('balanced').support)
    assert.ok(getSeatingObjectiveWeights('work').work > getSeatingObjectiveWeights('balanced').work)
    assert.ok(getSeatingObjectiveWeights('supervision').supervision > 0)
  })

  it('tria més puntuació i usa menys conflictes com a desempat', () => {
    const best = selectBestSeatingCandidate([
      { analysis: { conflicts: [1], score: 82 }, variant: 3 },
      { analysis: { conflicts: [1, 2], score: 86 }, variant: 4 },
      { analysis: { conflicts: [], score: 86 }, variant: 5 },
    ])

    assert.equal(best.variant, 5)
  })

  it('recalcula només la zona indicada i conserva els alumnes fixats', () => {
    const result = getSeatingZoneIterationState({
      getZoneId: (seat) => seat.zone,
      lockedStudentIds: ['locked-front'],
      placements: [
        { seat: { id: 'front-1', zone: 'front' }, studentId: 'front-free' },
        { seat: { id: 'front-2', zone: 'front' }, studentId: 'locked-front' },
        { seat: { id: 'center-1', zone: 'center' }, studentId: 'center-stable' },
      ],
      seats: [
        { enabled: true, id: 'front-1', zone: 'front' },
        { enabled: true, id: 'front-2', zone: 'front' },
        { enabled: true, id: 'center-1', zone: 'center' },
        { enabled: true, id: 'center-2', zone: 'center' },
      ],
      zoneId: 'front',
    })

    assert.deepEqual(result.recalculatedStudentIds, ['front-free'])
    assert.deepEqual(result.stableAssignments, {
      'center-stable': 'center-1',
      'locked-front': 'front-2',
    })
    assert.deepEqual(result.outsideFreeSeatIds, ['center-2'])
  })
})
