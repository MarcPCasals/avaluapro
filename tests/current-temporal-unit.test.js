import test from 'node:test'
import assert from 'node:assert/strict'
import {
  findCurrentClassUt,
  findCurrentTemporalUnit,
  matchClassUtsToTemporalUnits,
} from '../src/lib/currentTemporalUnit.js'

const temporalUnits = [
  { id: 'pt1', label: 'UT 1', order: 0, startsOn: '2026-09-09', endsOn: '2026-11-13' },
  { id: 'pt2', label: 'UT 2', order: 1, startsOn: '2026-11-14', endsOn: '2027-01-29' },
  { id: 'pt3', label: 'UT 3', order: 2, startsOn: '2027-01-30', endsOn: '2027-04-16' },
  { id: 'pt4', label: 'UT 4', order: 3, startsOn: '2027-04-17', endsOn: '2027-06-25' },
]

const semesters = [
  { id: 's1', classId: 'c1', order: 1 },
  { id: 's2', classId: 'c1', order: 2 },
]

const uts = [
  { id: 'u1', classId: 'c1', semesterId: 's1', name: 'UT1', order: 1 },
  { id: 'u2', classId: 'c1', semesterId: 's1', name: 'UT2', order: 2 },
  { id: 'u3', classId: 'c1', semesterId: 's2', name: 'UT3', order: 1 },
  { id: 'u4', classId: 'c1', semesterId: 's2', name: 'UT4', order: 2 },
]

test('troba la UT temporal vigent i avança també durant el cap de setmana de canvi', () => {
  assert.equal(findCurrentTemporalUnit(temporalUnits, '2026-11-13').id, 'pt1')
  assert.equal(findCurrentTemporalUnit(temporalUnits, '2026-11-14').id, 'pt2')
})

test('relaciona UT1 amb UT 1 sense duplicar les dates a cada classe', () => {
  const matches = matchClassUtsToTemporalUnits({ classId: 'c1', semesters, temporalUnits, uts })
  assert.deepEqual(matches.map((item) => item.temporalUnit.id), ['pt1', 'pt2', 'pt3', 'pt4'])
  assert.equal(findCurrentClassUt({ classId: 'c1', semesters, temporalUnits, uts }, '2027-02-10').ut.id, 'u3')
})
