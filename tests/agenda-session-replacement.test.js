import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAgendaSessionReplacement, createCalendarSession, createSessionItem, createBabeliumItem } from '../src/domain/planning/index.js'

const application = { id: 'application-fictional', ownerUid: 'teacher-fictional', classId: 'class-fictional' }
const options = { now: '2026-10-01T06:00:00.000Z' }
function bundle(id, date, title, extras = {}) {
  const session = createCalendarSession({ id, ownerUid: application.ownerUid, applicationId: application.id,
    classId: application.classId, startsAt: `${date}T10:00:00`, durationMinutes: 60,
    timetableSlotId: `slot-${id}`, status: 'planned', ...extras }, options)
  const items = [createSessionItem({ id: `item-${id}`, ownerUid: application.ownerUid,
    applicationId: application.id, sessionId: id, sourceActivityId: title, title, type: 'activity',
    order: 1, plannedMinutes: session.babeliumEnabled ? 25 : 55 }, options)]
  if (session.babeliumEnabled) items.unshift(createBabeliumItem(session, options))
  return { session, items, results: [] }
}
function input(extras = {}) {
  return { application, options, targetSessionId: 'first', title: 'Pràctica de laboratori', plannedMinutes: 55,
    existingSessionBundles: [bundle('first', '2026-10-02', 'A'), bundle('second', '2026-10-05', 'B')],
    candidates: [{ date: '2026-10-07', startsAt: '2026-10-07T10:00:00', durationMinutes: 60, timetableSlotId: 'slot-third' }],
    ...extras }
}
test('ajornar conserva els minuts i desplaça tota la seqüència a classes posteriors', () => {
  const data = input()
  const original = structuredClone(data.existingSessionBundles)
  const preview = buildAgendaSessionReplacement(data)
  assert.deepEqual(preview.sessions.map((b) => b.items.map((i) => i.title)), [['Pràctica de laboratori'], ['A'], ['B']])
  assert.equal(preview.sessions[0].items[0].sourceActivityId, null)
  assert.equal(preview.sessions.slice(1).flatMap((b) => b.items).reduce((n, i) => n + i.plannedMinutes, 0), 110)
  assert.equal(preview.unscheduled.length, 0)
  assert.deepEqual(data.existingSessionBundles, original)
})
test('retirar canvia només la sessió triada i no redistribueix les següents', () => {
  const preview = buildAgendaSessionReplacement(input({ disposition: 'remove' }))
  assert.equal(preview.sessions.length, 1)
  assert.deepEqual(preview.removedItems.map((i) => i.id), ['item-first'])
  assert.equal(preview.removedSessions.length, 0)
})
test('una manca de classes queda explícita a la proposta', () => {
  const preview = buildAgendaSessionReplacement(input({ candidates: [] }))
  assert.equal(preview.unscheduled.length, 1)
})
test('la pràctica curta reserva la sessió i no avança el contingut ajornat', () => {
  const preview = buildAgendaSessionReplacement(input({ plannedMinutes: 20 }))
  assert.equal(preview.sessions[0].items.length, 1)
  assert.equal(preview.sessions[1].items[0].title, 'A')
})
test('sessions amb historial, dates passades i durades invàlides no es poden substituir', () => {
  for (const extras of [{ status: 'held' }, { classroomOpenedAt: '2026-10-01T05:00:00Z' }, { attendanceConfirmedAt: '2026-10-01T05:00:00Z' }]) {
    assert.throws(() => buildAgendaSessionReplacement(input({ existingSessionBundles: [bundle('first', '2026-10-02', 'A', extras)] })), /sessions futures/)
  }
  assert.throws(() => buildAgendaSessionReplacement(input({ existingSessionBundles: [bundle('first', '2026-09-30', 'A')] })), /sessions futures/)
  for (const plannedMinutes of [0, NaN, 56, Infinity]) assert.throws(() => buildAgendaSessionReplacement(input({ plannedMinutes })), /durada/)
})
test('Babelium es conserva i limita el temps disponible', () => {
  const data = input({ plannedMinutes: 25, existingSessionBundles: [bundle('first', '2026-10-02', 'A', { babeliumEnabled: true }), bundle('second', '2026-10-05', 'B')] })
  const preview = buildAgendaSessionReplacement(data)
  assert.equal(preview.sessions[0].items[0].plannedMinutes, 30)
  assert.equal(preview.sessions[0].items[1].plannedMinutes, 25)
  assert.ok(!preview.removedItems.some((i) => i.id === 'babelium_first'))
  assert.throws(() => buildAgendaSessionReplacement({ ...data, plannedMinutes: 26 }), /durada/)
})
test('els dos mitjos grups reben la mateixa substitució sense duplicar minuts', () => {
  const first = bundle('first', '2026-10-02', 'A', { subgroupId: 'A', parallelProgrammingKey: 'pair-first' })
  const paired = bundle('paired', '2026-10-02', 'A', { subgroupId: 'B', parallelProgrammingKey: 'pair-first', startsAt: '2026-10-02T11:00:00' })
  const preview = buildAgendaSessionReplacement(input({ existingSessionBundles: [first, paired, bundle('second', '2026-10-05', 'B')] }))
  assert.deepEqual(preview.sessions.slice(0, 2).map((b) => b.items[0].title), ['Pràctica de laboratori', 'Pràctica de laboratori'])
  assert.equal(preview.sessions.slice(2).flatMap((b) => b.items).reduce((n, i) => n + i.plannedMinutes, 0), 110)
  assert.deepEqual(preview.sessions.slice(2).map((b) => b.items[0].title), ['A', 'B'])
})
test('els recordatoris sense minuts s’ajornen juntament amb les activitats', () => {
  const data = input()
  data.existingSessionBundles[0].items.unshift(createSessionItem({ ownerUid: application.ownerUid,
    applicationId: application.id, sessionId: 'first', title: 'Agafar la bata', type: 'indication', order: 0 }))
  data.existingSessionBundles[0].items[1].order = 1
  const preview = buildAgendaSessionReplacement(data)
  assert.ok(preview.sessions.slice(1).flatMap((b) => b.items).some((i) => i.title === 'Agafar la bata' && i.plannedMinutes === null))
})
