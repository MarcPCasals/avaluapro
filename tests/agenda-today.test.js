import test from 'node:test'
import assert from 'node:assert/strict'
import { findNextTimetableOccurrence } from '../src/lib/agendaToday.js'

const slots = [
  { id: 'monday-first', classId: '1d', weekday: 1, startsAt: '08:30', durationMinutes: 60 },
  { id: 'monday-second', classId: '1c', weekday: 1, startsAt: '09:30', durationMinutes: 60 },
  { id: 'wednesday', classId: '1d', weekday: 3, startsAt: '11:00', durationMinutes: 60 },
]

test('el cap de setmana mostra la primera classe de dilluns', () => {
  const next = findNextTimetableOccurrence(slots, '2026-09-20', '09:00')
  assert.equal(next.date, '2026-09-21')
  assert.equal(next.slot.id, 'monday-first')
})

test('durant el dia ignora les franges que ja han acabat', () => {
  const next = findNextTimetableOccurrence(slots, '2026-09-21', '09:31')
  assert.equal(next.slot.id, 'monday-second')
})
