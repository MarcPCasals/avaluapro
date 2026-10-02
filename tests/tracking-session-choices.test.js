import test from 'node:test'
import assert from 'node:assert/strict'
import { formatTaskSession, getTaskSessionKey, selectTaskSession } from '../src/features/tracking/taskSessionChoices.js'
import { buildTimetableSessionCandidates } from '../src/domain/planning/index.js'

test('distingim sessions A/B i hores del mateix dia i retornem la data triada', () => {
  const choices = [
    { date: '2026-10-02', startsAt: '2026-10-02T09:30:00', subgroupId: 'Grup A', timetableSlotId: 'a' },
    { date: '2026-10-02', startsAt: '2026-10-02T09:30:00', subgroupId: 'Grup B', timetableSlotId: 'b' },
    { date: '2026-10-05', startsAt: '2026-10-05T10:30:00', subgroupId: null, calendarEventId: 'extra' },
  ]
  assert.equal(new Set(choices.map(getTaskSessionKey)).size, 3)
  assert.equal(selectTaskSession(choices, getTaskSessionKey(choices[2])).date, '2026-10-05')
  assert.match(formatTaskSession(choices[0]), /09:30.*Grup A/)
  assert.match(formatTaskSession(choices[2]), /10:30.*Grup complet/)
  assert.equal(selectTaskSession(choices, ''), null)
})
test('les opcions de tasca respecten calendari i classe, i inclouen una sessió extraordinària', () => {
  const { candidates } = buildTimetableSessionCandidates({
    classId: 'synthetic', from: '2026-10-02', to: '2026-10-16',
    timetables: [{ id: 'table', effectiveFrom: '2026-09-01', effectiveTo: null }],
    slotsByTimetableId: { table: [
      { id: 'slot', classId: 'synthetic', weekday: 5, startsAt: '09:30', durationMinutes: 60 },
      { id: 'other', classId: 'other', weekday: 5, startsAt: '10:30', durationMinutes: 60 },
    ] },
    calendarEvents: [
      { id: 'holiday', type: 'holiday', startsOn: '2026-10-09', endsOn: '2026-10-09', classIds: [] },
      { id: 'extra', type: 'extraordinarySession', startsOn: '2026-10-12', endsOn: '2026-10-12', startsAt: '11:00', durationMinutes: 60, consumesPlannedSession: true, classIds: ['synthetic'] },
    ],
  })
  assert.deepEqual(candidates.map((session) => session.date), ['2026-10-02', '2026-10-12', '2026-10-16'])
  assert.equal(candidates.some((session) => session.timetableSlotId === 'other'), false)
})
