import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAgendaSessionItemUpdate, buildReminderSessionOptions, buildTimetableClassroomBundle, findNextTimetableOccurrence, getAgendaSessionItemRemovalState, getWeekTimetableOccurrences, mergeAgendaClassCatalog } from '../src/lib/agendaToday.js'

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

test('els recordatoris poden triar sessions programades i classes nomes presents a l horari', () => {
  const options = buildReminderSessionOptions({
    bundles: [{
      planningUnit: { code: 'UP 1.1', title: 'La fórmula secreta' },
      session: {
        classId: '1d',
        durationMinutes: 60,
        id: 'planned-session',
        startsAt: '2026-09-23T11:00:00',
        status: 'planned',
        timetableSlotId: 'wednesday',
      },
    }],
    slots,
    timetable: { effectiveFrom: '2026-09-01', effectiveTo: null },
    today: '2026-09-23',
    weeks: 2,
  })

  assert.equal(options[0].sessionId, 'planned-session')
  assert.equal(options[0].planningLabel, 'UP 1.1 · La fórmula secreta')
  assert.equal(options.filter((option) => option.startsAt === '2026-09-23T11:00:00').length, 1)
  assert.ok(options.some((option) => option.sessionId === 'timetable_2026-09-28_monday-second'))
})

test('un recordatori pot vincular una classe de l horari encara que no tingui cap UP', () => {
  const options = buildReminderSessionOptions({
    bundles: [],
    slots: [{
      id: 'friday-half-group',
      classId: '1d',
      weekday: 5,
      startsAt: '12:00',
      durationMinutes: 60,
      subgroupId: 'Grup A',
      subject: 'Ciències Físiques i de la Natura',
    }],
    timetable: { effectiveFrom: '2026-09-01', effectiveTo: null },
    today: '2026-09-23',
    weeks: 2,
  })

  assert.deepEqual(options.map((option) => ({
    classId: option.classId,
    date: option.date,
    sessionId: option.sessionId,
    subgroupId: option.subgroupId,
    time: option.time,
  })), [
    {
      classId: '1d',
      date: '2026-09-25',
      sessionId: 'timetable_2026-09-25_friday-half-group',
      subgroupId: 'Grup A',
      time: '12:00',
    },
    {
      classId: '1d',
      date: '2026-10-02',
      sessionId: 'timetable_2026-10-02_friday-half-group',
      subgroupId: 'Grup A',
      time: '12:00',
    },
  ])
})

test('Tutoria veu la franja horaria que comparteix amb el grup de tutoria', () => {
  const options = buildReminderSessionOptions({
    bundles: [],
    classes: [
      { id: '1c', name: '1rC' },
      { id: 'tutoria', name: 'Tutoria' },
    ],
    slots: [{
      classId: '1c',
      durationMinutes: 60,
      id: 'wednesday-tutoring',
      startsAt: '13:00',
      subject: 'Tutoria',
      weekday: 3,
    }],
    timetable: { effectiveFrom: '2026-09-01', effectiveTo: null },
    today: '2026-09-23',
    weeks: 1,
  })

  const tutoringOption = options.find((option) => option.classId === 'tutoria')
  assert.equal(tutoringOption.date, '2026-09-23')
  assert.equal(tutoringOption.time, '13:00')
  assert.equal(tutoringOption.sessionId, 'timetable_2026-09-23_wednesday-tutoring')
})

test('els recordatoris no proposen una classe en un dia no lectiu', () => {
  const options = buildReminderSessionOptions({
    calendarEvents: [{ classIds: [], endsOn: '2026-09-23', startsOn: '2026-09-23', type: 'holiday' }],
    slots,
    timetable: { effectiveFrom: '2026-09-01', effectiveTo: null },
    today: '2026-09-23',
    weeks: 1,
  })

  assert.equal(options.some((option) => option.date === '2026-09-23'), false)
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

test('un ajust de cronologia crea nomes una edicio de la sessio', () => {
  const sourceActivity = { id: 'activity-1', plannedMinutes: 60, title: 'Activitat mestra' }
  const entry = buildAgendaSessionItemUpdate({
    application: { id: 'application-1' },
    planningUnit: { id: 'up-1' },
    session: { id: 'session-1' },
  }, {
    applicationId: 'application-1',
    createdAt: '2026-09-23T08:00:00.000Z',
    entityType: 'sessionItem',
    id: 'item-1',
    order: 0,
    ownerUid: 'teacher-1',
    plannedMinutes: 5,
    schemaVersion: 1,
    segmentCount: 2,
    segmentIndex: 2,
    sessionId: 'session-1',
    sourceActivity,
    sourceActivityId: sourceActivity.id,
    title: sourceActivity.title,
    type: 'activity',
    updatedAt: '2026-09-23T08:00:00.000Z',
  }, {
    plannedMinutes: 4,
    title: 'Ajust real de l Agenda',
  }, { now: '2026-09-23T09:00:00.000Z' })

  assert.equal(entry.entity.entityType, 'sessionItem')
  assert.equal(entry.entity.plannedMinutes, 4)
  assert.equal(entry.entity.title, 'Ajust real de l Agenda')
  assert.equal(entry.entity.sourceActivity, undefined)
  assert.deepEqual(entry.context, {
    applicationId: 'application-1',
    planningUnitId: 'up-1',
    sessionId: 'session-1',
  })
  assert.deepEqual(sourceActivity, { id: 'activity-1', plannedMinutes: 60, title: 'Activitat mestra' })
})

test('un fragment futur desplacat es pot treure encara que arrossegui un resultat tecnic', () => {
  const item = { id: 'item-future' }
  const result = {
    id: 'result-future',
    sessionItemId: item.id,
    status: 'continued',
  }
  const state = getAgendaSessionItemRemovalState({
    results: [result],
    session: {
      classroomOpenedAt: '2026-09-24T08:00:00.000Z',
      startsAt: '2026-09-25T10:00:00.000Z',
      status: 'planned',
    },
  }, item, { now: '2026-09-24T09:00:00.000Z' })

  assert.equal(state.canRemove, true)
  assert.equal(state.isFutureSession, true)
  assert.deepEqual(state.linkedResults, [result])
})

test('una sessio feta o amb assistencia confirmada conserva protegit l historial', () => {
  const item = { id: 'item-protected' }
  const heldState = getAgendaSessionItemRemovalState({
    results: [],
    session: {
      startsAt: '2026-09-23T10:00:00.000Z',
      status: 'held',
    },
  }, item, { now: '2026-09-24T09:00:00.000Z' })
  const attendanceState = getAgendaSessionItemRemovalState({
    results: [],
    session: {
      attendanceConfirmedAt: '2026-09-24T08:00:00.000Z',
      startsAt: '2026-09-25T10:00:00.000Z',
      status: 'planned',
    },
  }, item, { now: '2026-09-24T09:00:00.000Z' })

  assert.equal(heldState.canRemove, false)
  assert.equal(attendanceState.canRemove, false)
})
