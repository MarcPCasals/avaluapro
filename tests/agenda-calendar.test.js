import assert from 'node:assert/strict'
import test from 'node:test'

import {
  calendarEventCoversSchoolWeek,
  getAdjacentAgendaTimelineRange,
  getAgendaTimelineInitialRange,
  getAgendaDefaultWeekStart,
  getMonthCalendarWeeks,
  getNoClassCalendarEvent,
} from '../src/lib/agendaCalendar.js'

test('la cronologia obre vuit setmanes i amplia el curs sense solapaments', () => {
  const initial = getAgendaTimelineInitialRange({
    endsOn: '2027-06-25',
    startsOn: '2026-09-09',
    today: '2026-09-25',
  })
  const later = getAdjacentAgendaTimelineRange(initial, 'later', {
    endsOn: initial.courseEnd,
    startsOn: initial.courseStart,
  })
  const earlier = getAdjacentAgendaTimelineRange(initial, 'earlier', {
    endsOn: initial.courseEnd,
    startsOn: initial.courseStart,
  })

  assert.deepEqual({ from: initial.from, to: initial.to }, { from: '2026-09-25', to: '2026-11-19' })
  assert.deepEqual(later, { from: '2026-11-20', to: '2027-01-14' })
  assert.deepEqual(earlier, { from: '2026-09-09', to: '2026-09-24' })
  assert.equal(initial.hasEarlier, true)
  assert.equal(initial.hasLater, true)
})

test('la cronologia respecta el final de curs encara que avui sigui posterior', () => {
  const range = getAgendaTimelineInitialRange({
    endsOn: '2027-06-25',
    startsOn: '2026-09-09',
    today: '2027-07-10',
  })

  assert.deepEqual({ from: range.from, to: range.to }, { from: '2027-05-01', to: '2027-06-25' })
  assert.equal(range.hasLater, false)
})

test('el calendari obre la setmana entrant durant el cap de setmana', () => {
  assert.equal(getAgendaDefaultWeekStart('2026-09-18'), '2026-09-14')
  assert.equal(getAgendaDefaultWeekStart('2026-09-19'), '2026-09-21')
  assert.equal(getAgendaDefaultWeekStart('2026-09-20'), '2026-09-21')
  assert.equal(getAgendaDefaultWeekStart('2026-09-21'), '2026-09-21')
})

test('el mes mostra les setmanes lectives que se superposen amb el curs', () => {
  const weeks = getMonthCalendarWeeks('2026-09-01', {
    startsOn: '2026-09-09',
    endsOn: '2027-06-25',
  })

  assert.deepEqual(weeks.map((week) => week.weekStart), [
    '2026-09-07',
    '2026-09-14',
    '2026-09-21',
    '2026-09-28',
  ])
})

test('un festiu, dia no lectiu, jornada especial o anul lacio atura la classe afectada', () => {
  const base = { startsOn: '2026-09-22', endsOn: '2026-09-22', classIds: [] }
  for (const type of ['holiday', 'nonTeaching', 'specialDay', 'cancellation']) {
    assert.equal(getNoClassCalendarEvent([{ ...base, id: type, type }], '2026-09-22', 'class-1')?.id, type)
  }
})

test('una anul lacio d un altre grup no afecta la sessio seleccionada', () => {
  const event = {
    classIds: ['class-2'],
    endsOn: '2026-09-22',
    id: 'cancelled',
    startsOn: '2026-09-22',
    type: 'cancellation',
  }
  assert.equal(getNoClassCalendarEvent([event], '2026-09-22', 'class-1'), null)
})

test('una inhabilitacio de sessio afecta nomes la sessio seleccionada', () => {
  const event = {
    classIds: ['class-1'],
    endsOn: '2026-09-22',
    id: 'single-session',
    sessionId: 'session-2',
    startsOn: '2026-09-22',
    type: 'cancellation',
  }

  assert.equal(getNoClassCalendarEvent([event], '2026-09-22', 'class-1'), null)
  assert.equal(getNoClassCalendarEvent([event], '2026-09-22', 'class-1', { sessionId: 'session-1' }), null)
  assert.equal(getNoClassCalendarEvent([event], '2026-09-22', 'class-1', { sessionId: 'session-2' })?.id, 'single-session')
})

test('detecta una setmana completa de vacances de dilluns a divendres', () => {
  assert.equal(calendarEventCoversSchoolWeek({
    endsOn: '2026-12-27',
    startsOn: '2026-12-21',
    type: 'nonTeaching',
  }, '2026-12-21'), true)
})

test('una anul lacio d un sol grup no marca tota la setmana com a vacances', () => {
  assert.equal(calendarEventCoversSchoolWeek({
    classIds: ['class-1'],
    endsOn: '2026-12-27',
    startsOn: '2026-12-21',
    type: 'cancellation',
  }, '2026-12-21'), false)
})
