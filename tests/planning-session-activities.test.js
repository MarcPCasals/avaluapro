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
