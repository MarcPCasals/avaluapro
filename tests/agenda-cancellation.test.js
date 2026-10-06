import test from 'node:test'
import assert from 'node:assert/strict'
import { createCalendarSession, createSessionItem, createBabeliumItem } from '../src/domain/planning/index.js'
import { buildAutomaticCancellationPreview, saveCalendarEventWithAutomaticReflow } from '../src/features/agenda/agendaCancellation.js'

const now = '2026-10-01T06:00:00.000Z'
const application = { id: 'app-fictional', ownerUid: 'teacher-fictional', classId: 'class-fictional', planningUnitId: 'up-fictional', subject: 'Ciències' }
const academicYear = { endsOn: '2026-10-30' }
const event = { id: 'event-fictional', type: 'cancellation', title: 'No hi ha classe', startsOn: '2026-10-02', classIds: [application.classId] }
function bundle(id, date, title, minutes = 55, extras = {}) {
  const session = createCalendarSession({ id, ownerUid: application.ownerUid, applicationId: application.id,
    classId: application.classId, startsAt: `${date}T10:00:00`, durationMinutes: 60,
    timetableSlotId: 'slot-fictional', ...extras }, { now })
  return { session, items: title ? [createSessionItem({ id: `item-${id}`, ownerUid: application.ownerUid,
    applicationId: application.id, sessionId: id, sourceActivityId: title, sourcePlanningUnitId: application.planningUnitId,
    title, type: 'activity', order: 1, plannedMinutes: minutes }, { now })] : [], results: [] }
}
function setup(bundles = [bundle('first', '2026-10-02', 'A'), bundle('second', '2026-10-09', 'B')]) {
  return { application, planningUnit: { id: application.planningUnitId, ownerUid: application.ownerUid },
    activities: [{ id: 'not-scheduled', title: 'No calendaritzada', plannedMinutes: 55 }],
    subjects: ['Ciències'], existingSessions: bundles.map((b) => b.session), existingSessionBundles: bundles,
    timetables: [{ id: 'timetable-fictional', effectiveFrom: '2026-09-01' }],
    slotsByTimetableId: { 'timetable-fictional': [{ id: 'slot-fictional', classId: application.classId,
      subject: 'Ciències', weekday: 5, startsAt: '10:00', durationMinutes: 60 }] } }
}
function build(data = setup(), change = event, extras = {}) {
  return buildAutomaticCancellationPreview({ setup: data, event: change, calendarEvents: [change], academicYear, now, ...extras })
}
const content = (preview) => preview.sessions.filter((b) => b.items.length).map((b) => [b.session.startsAt.slice(0, 10), b.items.map((i) => i.title)])

test('anul·lar desplaça tota la cadena i conserva la sessió anul·lada buida', () => {
  const data = setup(), original = structuredClone(data)
  const preview = build(data)
  assert.deepEqual(content(preview), [['2026-10-09', ['A']], ['2026-10-16', ['B']]])
  assert.equal(preview.sessions.find((b) => b.session.id === 'first').items.length, 0)
  assert.ok(!preview.removedSessions.some((s) => s.id === 'first'))
  assert.equal(preview.scheduledMinutes, 110)
  assert.deepEqual(preview.unscheduled, [])
  assert.deepEqual(data, original)
})
test('l’anul·lació d’una sessió o franja manté les altres classes del dia', () => {
  const second = bundle('same-day', '2026-10-02', 'B', 55, { startsAt: '2026-10-02T12:00:00', timetableSlotId: 'other-slot' })
  for (const target of [{ sessionId: 'first' }, { timetableSlotId: 'slot-fictional' }]) {
    const preview = build(setup([bundle('first', '2026-10-02', 'A'), second]), { ...event, ...target })
    assert.equal(preview.sessions.find((b) => b.session.id === 'same-day').items[0].title, 'A')
    assert.equal(preview.sessions.find((b) => b.session.id === 'first').items.length, 0)
  }
})
test('respecta anul·lacions posteriors i la matèria de l’horari', () => {
  const data = setup()
  data.slotsByTimetableId['timetable-fictional'].push({ id: 'other-subject', classId: application.classId,
    subject: 'Tutoria', weekday: 1, startsAt: '10:00', durationMinutes: 60 })
  const preview = build(data, event, { calendarEvents: [event, { ...event, id: 'later', startsOn: '2026-10-09' }] })
  assert.deepEqual(content(preview), [['2026-10-16', ['A']], ['2026-10-23', ['B']]])
})
test('conserva durades ajustades i indicacions sense vincle a Programació', () => {
  const first = bundle('first', '2026-10-02', 'Àtoms', 40)
  first.items.push(createSessionItem({ ownerUid: application.ownerUid, applicationId: application.id,
    sessionId: first.session.id, title: 'Presentació', type: 'activity', plannedMinutes: 15, order: 2 }, { now }))
  first.items.unshift(createSessionItem({ ownerUid: application.ownerUid, applicationId: application.id,
    sessionId: first.session.id, title: 'Agafar la bata', type: 'indication', order: 0 }, { now }))
  const preview = build(setup([first]))
  const moved = preview.sessions.find((b) => b.items.length)
  assert.deepEqual(moved.items.map((i) => [i.title, i.plannedMinutes]), [['Agafar la bata', null], ['Àtoms', 40], ['Presentació', 15]])
  assert.equal(moved.items[1].sourcePlanningUnitId, application.planningUnitId)
  assert.equal(moved.items[2].sourceActivityId, null)
})
test('no altera historial, resultats ni sessions futures amb Mode aula obert', () => {
  for (const extra of [{ status: 'held' }, { classroomOpenedAt: now }, { attendanceConfirmedAt: now }, { applicationNotes: [{ id: 'note-fictional', text: 'Nota fictícia', authorUid: application.ownerUid }] }]) {
    const first = bundle('first', '2026-10-02', 'A', 55, extra)
    assert.equal(build(setup([first])), null)
  }
  const first = bundle('first', '2026-10-02', 'A')
  first.results.push({ id: 'result-fictional' })
  assert.equal(build(setup([first])), null)
  const later = bundle('second', '2026-10-09', 'B', 55, { classroomOpenedAt: now })
  const preview = build(setup([bundle('first', '2026-10-02', 'A'), later]))
  assert.ok(!preview.removedItems.some((i) => i.id === 'item-second'))
  assert.deepEqual(content(preview), [['2026-10-16', ['A']]])
})
test('respecta Babèlium sense traslladar-lo com una activitat pendent', () => {
  const later = bundle('second', '2026-10-09', '', 0, { babeliumEnabled: true })
  later.items.push(createBabeliumItem(later.session, { now }))
  const preview = build(setup([bundle('first', '2026-10-02', 'A', 40), later]))
  const next = preview.sessions.find((b) => b.session.id === 'second')
  assert.equal(next.items[0].plannedMinutes, 30)
  assert.equal(next.items.filter((i) => i.sourceActivityId === 'A').reduce((n, i) => n + i.plannedMinutes, 0), 25)
  assert.equal(preview.sessions.flatMap((b) => b.items).filter((i) => i.sourceActivityId === 'A').reduce((n, i) => n + i.plannedMinutes, 0), 40)
})
test('refusa manca de capacitat abans de desar l’anul·lació o treure contingut', async () => {
  let writes = 0
  await assert.rejects(saveCalendarEventWithAutomaticReflow({ event, calendarEvents: [], academicYear: { endsOn: '2026-10-09' }, now,
    loadApplications: async () => [{ application, planningUnit: { id: application.planningUnitId } }],
    loadSetup: async () => setup(), saveEvent: async () => { writes++ }, saveReflow: async () => { writes++ } }), /No s’ha desat/)
  assert.equal(writes, 0)
})
test('desar l’esdeveniment aplica la redistribució sense cap confirmació addicional', async () => {
  const calls = [], data = setup()
  await saveCalendarEventWithAutomaticReflow({ event, calendarEvents: [], academicYear, now,
    loadApplications: async () => [{ application, planningUnit: data.planningUnit }, { application: { ...application, classId: 'other' } }],
    loadSetup: async () => data,
    saveEvent: async () => calls.push('event'),
    saveReflow: async (p) => { calls.push('reflow'); assert.deepEqual(content(p), [['2026-10-09', ['A']], ['2026-10-16', ['B']]]) } })
  assert.deepEqual(calls, ['event', 'reflow'])
})
test('repetir el desament no duplica les activitats ja traslladades', () => {
  const first = build()
  const persisted = first.sessions.map((b) => ({ session: b.session, items: b.items, results: [] }))
  assert.equal(build(setup(persisted)), null)
})

test('anul·lar els dos mitjos grups conserva el contingut paral·lel sense duplicar minuts', () => {
  const halves = (date, prefix, title) => ['A', 'B'].map((half, i) => bundle(`${prefix}-${half}`, date, title, 55,
    { subgroupId: half, parallelProgrammingKey: `parallel-${prefix}`, startsAt: `${date}T${i ? '12' : '10'}:00:00`,
      timetableSlotId: `slot-${half}` }))
  const data = setup([...halves('2026-10-02', 'first', 'A'), ...halves('2026-10-09', 'second', 'B')])
  data.slotsByTimetableId['timetable-fictional'] = ['A', 'B'].map((half, i) => ({
    id: `slot-${half}`, classId: application.classId, subject: 'Ciències', weekday: 5,
    startsAt: `${i ? '12' : '10'}:00`, durationMinutes: 60, subgroupId: half,
    ...(i ? { sharedProgrammingSlotId: 'slot-A' } : {}),
  }))
  const preview = build(data)
  assert.deepEqual(preview.sessions.filter((b) => b.session.startsAt.startsWith('2026-10-09')).map((b) => b.items[0].title), ['A', 'A'])
  assert.deepEqual(preview.sessions.filter((b) => b.session.startsAt.startsWith('2026-10-16')).map((b) => b.items[0].title), ['B', 'B'])
  assert.equal(preview.scheduledMinutes, 110)
})

test('evita ocupar una sessió d’una altra UP encara que sigui fora de la vista', async () => {
  const data = setup()
  const other = { ...setup([bundle('other-up', '2026-10-16', 'Other')]),
    application: { ...application, id: 'other-app', planningUnitId: 'other-up' }, planningUnit: { id: 'other-up' } }
  other.existingSessions = other.existingSessions.map((s) => ({ ...s, applicationId: other.application.id }))
  other.existingSessionBundles = other.existingSessionBundles.map((b) => ({ ...b, session: other.existingSessions[0] }))
  const saved = []
  await saveCalendarEventWithAutomaticReflow({ event, calendarEvents: [], academicYear, now,
    loadApplications: async () => [data, other].map(({ application, planningUnit }) => ({ application, planningUnit })),
    loadSetup: async ({ applicationId }) => applicationId === application.id ? data : other,
    saveEvent: async () => {}, saveReflow: async (p) => saved.push(p) })
  assert.equal(saved.length, 1)
  assert.deepEqual(content(saved[0]), [['2026-10-09', ['A']], ['2026-10-23', ['B']]])
})

test('anul·lar només el mig grup A trasllada A i conserva totes les sessions de B', () => {
  const halves = (date, prefix, title) => ['A', 'B'].map((half, i) => bundle(`${prefix}-${half}`, date, title, 55,
    { subgroupId: half, parallelProgrammingKey: `parallel-${prefix}`, startsAt: `${date}T${i ? '12' : '10'}:00:00`, timetableSlotId: `slot-${half}` }))
  const data = setup([...halves('2026-10-02', 'first', 'Àtoms'), ...halves('2026-10-09', 'second', 'Aus')])
  data.slotsByTimetableId['timetable-fictional'] = ['A', 'B'].map((half, i) => ({
    id: `slot-${half}`, classId: application.classId, subject: 'Ciències', weekday: 5,
    startsAt: `${i ? '12' : '10'}:00`, durationMinutes: 60, subgroupId: half,
    ...(i ? { sharedProgrammingSlotId: 'slot-A' } : {}),
  }))
  const preview = build(data, { ...event, sessionId: 'first-A' })
  assert.ok(preview.sessions.every((b) => b.session.subgroupId === 'A'))
  assert.deepEqual(content(preview), [['2026-10-09', ['Àtoms']], ['2026-10-16', ['Aus']]])
  assert.ok(!preview.removedItems.some((item) => item.sessionId.endsWith('-B')))
  assert.equal(preview.scheduledMinutes, 110)
})
