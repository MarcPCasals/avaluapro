import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  getSavedSeatingAssignments,
  getUnseatedStudentIds,
  normalizeSavedSeatingRestrictions,
} from '../src/features/tutoring/seatingPlanHistoryUtils.js'

describe('historial de disposicions', () => {
  it('recupera assignacions modernes i antigues', () => {
    const assignments = getSavedSeatingAssignments(
      {
        seats: [
          { studentId: 'student-1', x: 4, y: 2 },
          { block: 1, place: 2, row: 3, studentId: 'student-2' },
        ],
      },
      (x, y) => `seat_${x}_${y}`,
    )

    assert.deepEqual(assignments, {
      'student-1': 'seat_4_2',
      'student-2': 'seat_5_3',
    })
  })

  it('manté totes les restriccions guardades sense compartir referències', () => {
    const source = {
      avoidedZoneByStudentId: { 'student-1': 'back' },
      blockedSeatIds: ['seat_2_2'],
      neverNearPairs: [{ studentId: 'student-1', targetStudentId: 'student-2' }],
      preferredZoneByStudentId: { 'student-2': 'front' },
      preferNearPairs: [{ studentId: 'student-2', targetStudentId: 'student-3' }],
    }
    const restrictions = normalizeSavedSeatingRestrictions(source)

    assert.deepEqual(restrictions, source)
    assert.notEqual(restrictions.blockedSeatIds, source.blockedSeatIds)
    assert.notEqual(restrictions.preferredZoneByStudentId, source.preferredZoneByStudentId)
  })

  it('deixa pendents només els alumnes que no apareixen a la versió', () => {
    assert.deepEqual(
      getUnseatedStudentIds(['student-1', 'student-2', 'student-3'], {
        'student-1': 'seat_0_0',
        'student-3': 'seat_1_0',
      }),
      ['student-2'],
    )
  })
})
