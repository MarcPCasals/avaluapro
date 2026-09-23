import test from 'node:test'
import assert from 'node:assert/strict'
import { buildTimetableClassroomBundle, findNextTimetableOccurrence, getWeekTimetableOccurrences, mergeAgendaClassCatalog } from '../src/lib/agendaToday.js'

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

test('la setmana mostra les classes de l horari que encara no tenen programacio', () => {
  const occurrences = getWeekTimetableOccurrences({
    bundles: [{
      session: {
        classId: '1d',
        startsAt: '2026-09-21T08:30:00',
        subgroupId: null,
        timetableSlotId: 'monday-first',
      },
    }],
    slots,
    timetable: { effectiveFrom: '2026-09-01', effectiveTo: null },
    weekStart: '2026-09-21',
  })

  assert.deepEqual(
    occurrences.map((item) => [item.date, item.slot.id]),
    [
      ['2026-09-21', 'monday-second'],
      ['2026-09-23', 'wednesday'],
    ],
  )
})

test('la setmana no mostra franges fora de la vigencia de l horari', () => {
  const occurrences = getWeekTimetableOccurrences({
    slots,
    timetable: { effectiveFrom: '2026-09-28', effectiveTo: null },
    weekStart: '2026-09-21',
  })

  assert.equal(occurrences.length, 0)
})

test('una classe de l horari pot obrir Mode aula sense cap UP', () => {
  const occurrence = {
    date: '2026-09-23',
    startsAt: '2026-09-23T11:00:00',
    slot: slots[2],
  }
  const bundle = buildTimetableClassroomBundle(occurrence, { id: '1d', name: '1r D' }, 'teacher-1')

  assert.equal(bundle.standalone, true)
  assert.equal(bundle.session.classId, '1d')
  assert.equal(bundle.session.startsAt, occurrence.startsAt)
  assert.equal(bundle.items.length, 0)
  assert.equal(bundle.planningUnit.code, 'Horari')
})

test('el calendari conserva el color assignat quan hi ha sessions programades', () => {
  const result = mergeAgendaClassCatalog({
    bundles: [{
      application: { classLabel: '1r D' },
      session: { classId: '1d' },
    }],
    classes: [
      { color: 'green', id: '1d', name: '1rD' },
      { color: 'red', id: 'sg', name: 'SG' },
    ],
  })

  assert.deepEqual(result.find((item) => item.id === '1d'), { color: 'green', id: '1d', name: '1rD' })
  assert.equal(result.find((item) => item.id === 'sg').color, 'red')
})
