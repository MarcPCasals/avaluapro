import assert from 'node:assert/strict'
import test from 'node:test'

import {
  calendarEventCoversSchoolWeek,
  getMonthCalendarWeeks,
  getNoClassCalendarEvent,
} from '../src/lib/agendaCalendar.js'

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
