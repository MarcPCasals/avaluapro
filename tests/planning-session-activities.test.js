import test from 'node:test'
import assert from 'node:assert/strict'
import { getSessionActivityChoices, buildSessionActivityAddition, createCalendarSession, createSessionItem, createBabeliumItem } from '../src/domain/planning/index.js'
const application = { id: 'app', planningUnitId: 'up', classId: 'fictional', ownerUid: 'teacher' }
const options = { now: '2026-10-04T10:00:00Z' }
const activities = [{ id: 'exam', title: 'Prova fictícia', type: 'activity', plannedMinutes: 30 },
  { id: 'lab', title: 'Laboratori fictici', type: 'activity', plannedMinutes: 50 }]
function bundle(id, subgroupId = '', items = [], extra = {}) {
  return { session: createCalendarSession({ id, applicationId: 'app', classId: 'fictional', ownerUid: 'teacher',
    startsAt: '2026-10-09T08:30:00', durationMinutes: 60, status: 'planned', subgroupId, ...extra }, options),
  items: items.map(([activityId, minutes], order) => createSessionItem({ id: `${id}-${activityId}`, applicationId: 'app',
    sessionId: id, ownerUid: 'teacher', sourceActivityId: activityId, title: activityId, type: 'activity', plannedMinutes: minutes, order }, options)), results: [] }
}
function input(bundles) { return { application, activities, existingSessionBundles: bundles, targetSessionId: bundles[0].session.id } }
test('retirar la prova allibera els minuts i permet recuperar-la sense tocar el laboratori ni la UP', () => {
  const original = bundle('session', '', [['exam', 30], ['lab', 25]])
  const removed = { ...original, items: original.items.filter((item) => item.sourceActivityId !== 'exam') }
  const data = input([removed])
  assert.equal(getSessionActivityChoices(data)[0].remainingMinutes, 30)
  const addition = buildSessionActivityAddition(data, 'exam', 30, options)
  assert.equal(addition.item.sourcePlanningUnitId, 'up')
  assert.equal(addition.item.plannedMinutes, 30)
  assert.equal(original.items.length, 2)
  assert.equal(activities[0].plannedMinutes, 30)
  const restored = { ...removed, items: [...removed.items, addition.item] }
  assert.equal(getSessionActivityChoices(input([restored]))[0].available, false)
  assert.throws(() => buildSessionActivityAddition(input([restored]), 'exam', 30, options), /calendaritzada/)
})
test('una retirada al mig grup B continua disponible encara que A ja tingui la prova', () => {
  const data = input([bundle('B', 'B', [['lab', 25]]), bundle('A', 'A', [['exam', 30], ['lab', 25]])])
  assert.equal(getSessionActivityChoices(data)[0].remainingMinutes, 30)
  const addition = buildSessionActivityAddition(data, 'exam', 30, options)
  assert.equal(addition.item.sessionId, 'B')
  assert.deepEqual(addition.changedItems, [])
})
test('afegir una part limita la durada als minuts pendents i renumera els fragments', () => {
  const data = input([bundle('target'), bundle('later', '', [['exam', 20]], { startsAt: '2026-10-12T08:30:00' })])
  assert.equal(getSessionActivityChoices(data)[0].remainingMinutes, 10)
  assert.throws(() => buildSessionActivityAddition(data, 'exam', 11, options), /màxim 10/)
  const added = buildSessionActivityAddition(data, 'exam', 10, options)
  assert.equal(added.item.segmentIndex, 1)
  assert.equal(added.item.segmentCount, 2)
  assert.equal(added.changedItems[0].segmentIndex, 2)
})
test('respecta Babèlium, el marge de sessió i l’historial', () => {
  const target = bundle('target')
  target.items.push(createBabeliumItem(target.session, options))
  assert.throws(() => buildSessionActivityAddition(input([target]), 'exam', 30, options), /màxim 25/)
  assert.equal(buildSessionActivityAddition(input([target]), 'exam', 25, options).item.plannedMinutes, 25)
  for (const extra of [{ status: 'held' }, { attendanceConfirmedAt: options.now }, { classroomClosedAt: options.now }]) {
    assert.throws(() => buildSessionActivityAddition(input([bundle('target', '', [], extra)]), 'exam', 30, options), /dades de classe/)
  }
})
test('els elements sense temps es poden afegir a una sessió plena però no duplicar', () => {
  const data = { ...input([bundle('full', '', [['lab', 55]])]), activities: [{ id: 'note', type: 'indication', title: 'Portar bata', plannedMinutes: null }] }
  const added = buildSessionActivityAddition(data, 'note', null, options)
  assert.equal(added.item.plannedMinutes, null)
  data.existingSessionBundles[0].items.push(added.item)
  assert.equal(getSessionActivityChoices(data)[0].available, false)
})

for (const scope of ['day', 'slot', 'session']) {
  test(`afegir recupera A12 i A13 d’una classe anul·lada per ${scope} i retira només la còpia seleccionada`, () => {
    const target = bundle('target', '', [['lab', 40]])
    const blocked = bundle('blocked', '', [['atoms', 40], ['notebook', 15]],
      { startsAt: '2026-10-07T08:30:00', timetableSlotId: 'slot-blocked' })
    const event = { id: 'cancel-fictional', type: 'cancellation', startsOn: '2026-10-07', classIds: ['fictional'],
      ...(scope === 'slot' ? { timetableSlotId: 'slot-blocked' } : {}),
      ...(scope === 'session' ? { sessionId: 'blocked' } : {}) }
    const data = { ...input([target, blocked]), calendarEvents: [event], activities: [
      { id: 'atoms', type: 'activity', title: 'Àtoms', plannedMinutes: 40 },
      { id: 'notebook', type: 'activity', title: 'Presentació', plannedMinutes: 15 },
    ] }
    const original = structuredClone(data)
    assert.deepEqual(getSessionActivityChoices(data).map((a) => [a.available, a.assignedMinutes, a.calendarLabel]),
      [[true, 0, 'Fora del calendari'], [true, 0, 'Fora del calendari']])
    const addition = buildSessionActivityAddition(data, 'notebook', 15, options)
    assert.equal(addition.item.sourceActivityId, 'notebook')
    assert.equal(addition.item.segmentCount, 1)
    assert.deepEqual(addition.removedItems.map((i) => i.id), ['blocked-notebook'])
    assert.deepEqual(addition.changedItems, [])
    const persisted = { ...data, existingSessionBundles: [
      { ...target, items: [...target.items, addition.item] },
      { ...blocked, items: blocked.items.filter((i) => !addition.removedItems.some((removed) => removed.id === i.id)) },
    ] }
    assert.equal(getSessionActivityChoices(persisted)[1].available, false)
    assert.equal(getSessionActivityChoices(persisted)[0].available, true)
    assert.throws(() => buildSessionActivityAddition(persisted, 'notebook', 15, options), /calendaritzada/)
    assert.deepEqual(data, original)
  })
}

test('recuperar una part no compta el fragment anul·lat ni altera els fragments vàlids', () => {
  const target = bundle('target')
  const blocked = bundle('blocked', '', [['exam', 30]], { status: 'cancelled' })
  const later = bundle('later', '', [['exam', 20]], { startsAt: '2026-10-12T08:30:00' })
  const data = input([target, blocked, later])
  assert.equal(getSessionActivityChoices(data)[0].remainingMinutes, 10)
  const added = buildSessionActivityAddition(data, 'exam', 10, options)
  assert.deepEqual(added.removedItems.map((i) => i.id), ['blocked-exam'])
  assert.equal(added.item.segmentCount, 2)
  assert.equal(added.changedItems[0].id, 'later-exam')
  assert.equal(added.changedItems[0].segmentIndex, 2)
})

test('un altre grup o franja no allibera minuts, i les activitats realment fetes continuen protegides', () => {
  for (const extra of [{ classIds: ['other'] }, { timetableSlotId: 'other-slot' }]) {
    const data = { ...input([bundle('target'), bundle('planned', '', [['exam', 30]])]),
      calendarEvents: [{ type: 'cancellation', startsOn: '2026-10-09', ...extra }] }
    assert.equal(getSessionActivityChoices(data)[0].available, false)
  }
  const held = bundle('held', '', [['exam', 30]], { status: 'held', startsAt: '2026-10-07T08:30:00' })
  held.results.push({ sessionItemId: held.items[0].id, status: 'completed' })
  const data = { ...input([bundle('target'), held]),
    calendarEvents: [{ type: 'cancellation', startsOn: '2026-10-07' }] }
  assert.equal(getSessionActivityChoices(data)[0].calendarLabel, 'Ja feta')
  assert.throws(() => buildSessionActivityAddition(data, 'exam', 30, options), /feta/)
})

test('recuperar només A no retira contingut de B i no permet afegir a la sessió anul·lada', () => {
  const target = bundle('target-A', 'A')
  const blockedA = bundle('blocked-A', 'A', [['exam', 30]], { startsAt: '2026-10-07T08:30:00' })
  const blockedB = bundle('blocked-B', 'B', [['exam', 30]], { startsAt: '2026-10-07T11:30:00' })
  const data = { ...input([target, blockedA, blockedB]), calendarEvents: [{ type: 'cancellation', startsOn: '2026-10-07' }] }
  const added = buildSessionActivityAddition(data, 'exam', 30, options)
  assert.deepEqual(added.removedItems.map((i) => i.id), ['blocked-A-exam'])
  assert.throws(() => buildSessionActivityAddition({ ...data, targetSessionId: 'blocked-A' }, 'exam', 30, options), /no es fa/)
})
