import assert from 'node:assert/strict'
import test from 'node:test'

import { splitTimetableSlots, timetableTimeToMinutes } from '../src/lib/agendaTimetable.js'

test('separa les franges de les 17 h sense perdre-les', () => {
  const result = splitTimetableSlots([
    { id: 'late-2', startsAt: '17:30', weekday: 3 },
    { id: 'day', startsAt: '13:00', weekday: 3 },
    { id: 'late-1', startsAt: '17:00', weekday: 1 },
    { id: 'weekend', startsAt: '10:00', weekday: 6 },
  ])

  assert.deepEqual(result.daytime.map((item) => item.id), ['day'])
  assert.deepEqual(result.late.map((item) => item.id), ['late-1', 'late-2'])
})

test('converteix una hora de l horari a minuts', () => {
  assert.equal(timetableTimeToMinutes('17:45'), 1065)
})

