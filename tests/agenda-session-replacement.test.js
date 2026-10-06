import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAgendaSessionReplacement, createCalendarSession, createSessionItem, createBabeliumItem, getAgendaReplacementActivityOptions } from '../src/domain/planning/index.js'

const application = { id: 'application-fictional', ownerUid: 'teacher-fictional', classId: 'class-fictional', planningUnitId: 'up-fictional' }
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

function plannedActivity(id, plannedMinutes = 55) {
  return { id, planningUnitId: application.planningUnitId, type: 'activity',
    title: `Activitat ${id}`, plannedMinutes, availableMinutes: plannedMinutes,
    description: 'Descripció fictícia', materialLinks: [{ label: 'Material fictici', teacherUrl: 'https://example.org/material' }] }
}
test('seleccionar una activitat futura trasllada els minuts i conserva el vincle a la Programació', () => {
  const selected = plannedActivity('B')
  const preview = buildAgendaSessionReplacement(input({ replacementActivity: selected }))
  assert.deepEqual(preview.sessions.map((b) => b.items.map((i) => i.sourceActivityId)), [['B'], ['A']])
  assert.equal(preview.sessions.flatMap((b) => b.items).filter((i) => i.sourceActivityId === 'B').reduce((sum, i) => sum + i.plannedMinutes, 0), 55)
  assert.equal(preview.sessions[0].items[0].sourcePlanningUnitId, application.planningUnitId)
  assert.equal(preview.sessions[0].items[0].title, selected.title)
  assert.equal(preview.sessions[0].items[0].segmentCount, 1)
})
test('retirar el contingut anterior no duplica l’activitat seleccionada més endavant', () => {
  const preview = buildAgendaSessionReplacement(input({ disposition: 'remove', replacementActivity: plannedActivity('B') }))
  assert.deepEqual(preview.sessions.map((b) => b.items.map((i) => i.sourceActivityId)), [['B'], []])
  assert.equal(preview.removedItems.filter((i) => i.id === 'item-second').length, 1)
})
test('traslladar només una part deixa la resta de minuts prevista i renumera els fragments', () => {
  const preview = buildAgendaSessionReplacement(input({ plannedMinutes: 20, disposition: 'remove', replacementActivity: plannedActivity('B') }))
  assert.deepEqual(preview.sessions.map((b) => b.items.map((i) => i.plannedMinutes)), [[20], [35]])
  assert.deepEqual(preview.sessions.flatMap((b) => b.items).map((i) => [i.segmentIndex, i.segmentCount]), [[1, 2], [2, 2]])
})
test('l’activitat seleccionada pot estar pendent de calendaritzar', () => {
  const preview = buildAgendaSessionReplacement(input({ replacementActivity: plannedActivity('A13') }))
  assert.equal(preview.sessions[0].items[0].sourceActivityId, 'A13')
  assert.deepEqual(preview.sessions.slice(1).map((b) => b.items[0].sourceActivityId), ['A', 'B'])
})
test('seleccionar la mateixa activitat de la sessió no n’afegeix una còpia', () => {
  const preview = buildAgendaSessionReplacement(input({ replacementActivity: plannedActivity('A') }))
  assert.deepEqual(preview.sessions.map((b) => b.items.map((i) => i.sourceActivityId)), [['A'], ['B']])
})
test('els codis A mantenen l’ordre original encara que hi hagi activitats fetes o indicacions', () => {
  const data = input()
  const choices = getAgendaReplacementActivityOptions({ ...data,
    activities: [plannedActivity('A'), { ...plannedActivity('note'), type: 'indication' }, plannedActivity('B')],
    completedSourceActivityIds: ['A'] })
  assert.deepEqual(choices.map((a) => [a.code, a.availableMinutes]), [['A1', 0], ['A3', 55]])
})
test('els minuts de classes anteriors es reserven i no es tornen a programar', () => {
  const data = input()
  data.existingSessionBundles.unshift(bundle('past', '2026-09-29', 'B', { status: 'held' }))
  const choices = getAgendaReplacementActivityOptions({ ...data, activities: [plannedActivity('B', 110)] })
  assert.equal(choices[0].availableMinutes, 55)
  const preview = buildAgendaSessionReplacement({ ...data, replacementActivity: choices[0] })
  const total = [...preview.sessions, data.existingSessionBundles[0]].flatMap((b) => b.items)
    .filter((i) => i.sourceActivityId === 'B').reduce((sum, i) => sum + i.plannedMinutes, 0)
  assert.equal(total, 110)
})
test('no es pot seleccionar una activitat d’una altra UP ni superar els minuts pendents', () => {
  assert.throws(() => buildAgendaSessionReplacement(input({ replacementActivity: { ...plannedActivity('B'), planningUnitId: 'other-up' } })), /disponibles/)
  assert.throws(() => buildAgendaSessionReplacement(input({ replacementActivity: plannedActivity('B', 20) })), /disponibles/)
})
test('seleccionar des del segon mig grup trasllada una sola seqüència pedagògica', () => {
  const data = input({ targetSessionId: 'paired', replacementActivity: plannedActivity('B'), existingSessionBundles: [
    bundle('first', '2026-10-02', 'A', { subgroupId: 'A', parallelProgrammingKey: 'pair' }),
    bundle('paired', '2026-10-02', 'A', { subgroupId: 'B', parallelProgrammingKey: 'pair', startsAt: '2026-10-02T11:00:00' }),
    bundle('second', '2026-10-05', 'B'),
  ] })
  const choices = getAgendaReplacementActivityOptions({ ...data, activities: [plannedActivity('A'), plannedActivity('B')] })
  assert.equal(choices[0].availableMinutes, 55)
  const preview = buildAgendaSessionReplacement(data)
  assert.deepEqual(preview.sessions.map((b) => b.items.map((i) => i.sourceActivityId)), [['B'], ['B'], ['A']])
})
test('seleccionar una activitat amb Babelium conserva la lectura i els minuts pendents', () => {
  const preview = buildAgendaSessionReplacement(input({ disposition: 'remove', plannedMinutes: 25,
    replacementActivity: plannedActivity('B'), existingSessionBundles: [
      bundle('first', '2026-10-02', 'A', { babeliumEnabled: true }), bundle('second', '2026-10-05', 'B'),
    ] }))
  assert.deepEqual(preview.sessions.map((b) => b.items.map((i) => i.plannedMinutes)), [[30, 25], [30]])
  assert.equal(preview.sessions[0].items[1].sourceActivityId, 'B')
})
test('el trasllat de mitjos grups amb lectura només en una franja no deixa còpies del fragment', () => {
  const sourceA = bundle('source-a', '2026-10-05', 'B', { subgroupId: 'A', parallelProgrammingKey: 'source-pair', babeliumEnabled: true })
  const sourceB = bundle('source-b', '2026-10-05', 'B', { subgroupId: 'B', parallelProgrammingKey: 'source-pair', startsAt: '2026-10-05T11:00:00' })
  sourceB.items[0].plannedMinutes = 25
  const preview = buildAgendaSessionReplacement(input({ disposition: 'remove', plannedMinutes: 25,
    replacementActivity: plannedActivity('B', 25), existingSessionBundles: [bundle('first', '2026-10-02', 'A'), sourceA, sourceB] }))
  assert.equal(preview.sessions.flatMap((b) => b.items).filter((i) => i.sourceActivityId === 'B').reduce((sum, i) => sum + i.plannedMinutes, 0), 25)
  assert.equal(preview.removedItems.filter((i) => i.sourceActivityId === 'B').length, 2)
  assert.equal(preview.sessions[1].items[0].id, 'babelium_source-a')
})

for (const scope of ['day', 'slot', 'session']) {
  test(`A12 i A13 d’una classe anul·lada per ${scope} continuen disponibles`, () => {
    const blocked = bundle('blocked', '2026-09-29', 'A12')
    blocked.items[0].plannedMinutes = 40
    blocked.items.push(createSessionItem({ ownerUid: application.ownerUid, applicationId: application.id,
      sessionId: blocked.session.id, sourceActivityId: 'A13', sourcePlanningUnitId: application.planningUnitId,
      title: 'A13', type: 'activity', plannedMinutes: 15, order: 2 }, options))
    const event = { id: 'cancel-fictional', type: 'cancellation', startsOn: '2026-09-29',
      classIds: [application.classId], ...(scope === 'slot' ? { timetableSlotId: blocked.session.timetableSlotId } : {}),
      ...(scope === 'session' ? { sessionId: blocked.session.id } : {}) }
    const data = input({ options: { ...options, calendarEvents: [event] } })
    data.existingSessionBundles.unshift(blocked)
    const choices = getAgendaReplacementActivityOptions({ ...data, activities: [plannedActivity('A12', 40), plannedActivity('A13', 15)] })
    assert.deepEqual(choices.map((a) => a.availableMinutes), [40, 15])
    for (const disposition of ['postpone', 'remove']) {
      const preview = buildAgendaSessionReplacement({ ...data, disposition, plannedMinutes: 40, replacementActivity: choices[0] })
      const source = preview.sessions.find((b) => b.session.id === blocked.session.id)
      assert.deepEqual(source.items.map((item) => item.sourceActivityId), ['A13'])
      assert.equal(preview.sessions.find((b) => b.session.id === 'first').items[0].sourceActivityId, 'A12')
      assert.ok(preview.removedItems.some((item) => item.id === blocked.items[0].id))
      assert.equal(preview.sessions.flatMap((b) => b.items).filter((i) => i.sourceActivityId === 'A12').reduce((n, i) => n + i.plannedMinutes, 0), 40)
      assert.equal(preview.unscheduled.length, 0)
    }
  })
}

test('les classes impartides o amb evidències continuen reservant minuts encara que hi hagi una anul·lació', () => {
  for (const extra of [{ status: 'held' }, { classroomOpenedAt: options.now }, { attendanceConfirmedAt: options.now }]) {
    const past = bundle('past', '2026-09-29', 'A12', extra)
    const data = input({ options: { ...options, calendarEvents: [{ type: 'cancellation', startsOn: '2026-09-29', classIds: [application.classId] }] } })
    data.existingSessionBundles.unshift(past)
    const choice = getAgendaReplacementActivityOptions({ ...data, activities: [plannedActivity('A12')] })[0]
    assert.equal(choice.availableMinutes, 0)
  }
})

test('una còpia antiga anul·lada no deixa una segona còpia quan l’activitat també s’havia traslladat al futur', () => {
  const old = bundle('old', '2026-09-29', 'B', { status: 'cancelled' })
  const data = input()
  data.existingSessionBundles.unshift(old)
  const activity = getAgendaReplacementActivityOptions({ ...data, activities: [plannedActivity('B')] })[0]
  assert.equal(activity.availableMinutes, 55)
  const preview = buildAgendaSessionReplacement({ ...data, replacementActivity: activity })
  assert.equal(preview.sessions.flatMap((b) => b.items).filter((i) => i.sourceActivityId === 'B').reduce((n, i) => n + i.plannedMinutes, 0), 55)
  assert.ok(preview.removedItems.some((i) => i.id === 'item-old'))
  assert.ok(preview.removedItems.some((i) => i.id === 'item-second'))
})
