import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPlanningDirectionUrl, compareGroupPlanning, selectDirectionApplication, withCurrentDirectionApplication } from '../src/domain/planning/directionView.js'
import { subscribeDirectionGraph } from '../src/domain/planning/liveDirection.js'

test('link opens a single read-only UP without inheriting other query parameters', () => {
  const url = new URL(buildPlanningDirectionUrl('up 1', 'https://avaluapro.web.app/?token=private#old'))
  assert.equal(url.searchParams.get('planning-view'), 'up 1')
  assert.equal(url.searchParams.size, 1)
  assert.equal(url.hash, '')
})
test('link retains the selected group and never falls back to another group while loading', () => {
  const url = new URL(buildPlanningDirectionUrl('up', 'https://example.com/?old=private', 'actual-group'))
  assert.equal(url.searchParams.get('planning-group'), 'actual-group')
  assert.equal(url.searchParams.size, 2)
  const other = { application: { id: 'other', status: 'active' }, overrides: [], sessions: [] }
  assert.equal(selectDirectionApplication([other], 'actual-group'), null)
  const actual = { application: { id: 'actual-group' }, overrides: [], sessions: [] }
  assert.equal(selectDirectionApplication([other, actual], 'actual-group'), actual)
})
test('preview uses original activities and the selected group changes including pending local edits', () => {
  const originals = [{ id: 'a', title: 'Original', plannedMinutes: 55, studentMaterials: [] }]
  const cloud = [{ application: { id: 'other' }, overrides: [], sessions: [] }, {
    application: { id: 'actual-group' }, sessions: [{ session: { id: 's' } }],
    overrides: [{ id: 'old', activityId: 'a', changes: { plannedMinutes: 60 }, updatedAt: '1' }],
  }]
  const local = [{ id: 'pending', activityId: 'a', changes: { plannedMinutes: 70, studentMaterials: [{ kind: 'link', url: 'https://example.com/current' }] }, updatedAt: '2' }]
  const preview = withCurrentDirectionApplication(cloud, { id: 'actual-group' }, local)
  const selected = selectDirectionApplication(preview, 'actual-group')
  assert.equal(selected.sessions[0].session.id, 's')
  const changes = compareGroupPlanning(originals, selected.overrides)[0].changes
  assert.deepEqual(changes.find((change) => change.label === 'Minuts previstos'), { label: 'Minuts previstos', before: '55', after: '70' })
  assert.match(changes.find((change) => change.label === 'Materials de l’alumnat').after, /current/)
  assert.equal(originals[0].plannedMinutes, 55)
  assert.equal(cloud[1].overrides.length, 1)
  assert.equal(preview[0], cloud[0])
  assert.equal(withCurrentDirectionApplication([], { id: 'actual-group' }, local)[0].overrides.length, 1)
})
test('compares final adjustments, zero minutes, adaptations, order and agenda budget', () => {
  const original = [{ id: 'a', title: 'Prova', plannedMinutes: 55, order: 1, diversityMeasures: [] }]
  const overrides = [{ activityId: 'a', changes: { plannedMinutes: 60 }, updatedAt: '1' }, { activityId: 'a', changes: { plannedMinutes: 0, order: 2, agendaPlannedMinutes: 70, diversityMeasures: [{ label: 'Suport visual', studentNames: ['Alumne fictici'] }] }, updatedAt: '2' }]
  const changes = compareGroupPlanning(original, overrides)[0].changes
  assert.equal(changes.find((item) => item.label === 'Minuts previstos').after, '0')
  assert.equal(changes.find((item) => item.label === 'Minuts a l’Agenda').after, '70')
  assert.match(changes.find((item) => item.label === 'Adaptacions de l’alumnat').after, /Suport visual/)
  assert.equal(original[0].plannedMinutes, 55)
  assert.equal(compareGroupPlanning(original, [{ activityId: 'a', changes: { plannedMinutes: 55 } }]).length, 0)
  assert.equal(compareGroupPlanning(original, [{ activityId: 'a', changes: { hidden: true } }])[0].changes[0].after, 'Retirada del grup')
})
function harness() {
  const listeners = new Map()
  const dependencies = { db: '', doc: (...parts) => parts.join('/').replace(/^\//, ''), collection: (...parts) => parts.join('/'), onSnapshot: (ref, options, next, error) => { listeners.set(ref, { next, error }); return () => listeners.delete(ref) } }
  const emit = (ref, rows, fromCache = false) => listeners.get(ref).next({ metadata: { fromCache }, exists: () => true, id: 'up', data: () => rows, docs: Array.isArray(rows) ? rows.map((row) => ({ id: row.id, data: () => row })) : [] })
  return { listeners, dependencies, emit }
}
test('live graph updates nested sessions and detaches removed applications and revoked access', () => {
  const h = harness()
  let latest, failure
  subscribeDirectionGraph(h.dependencies, 'up', (value) => { latest = value }, (error) => { failure = error })
  h.emit('planningUnits/up', { title: 'UP' })
  h.emit('planningUnits/up/applications', [{ id: 'g' }])
  h.emit('planningUnits/up/applications/g/sessions', [{ id: 's', startsAt: '2026-10-08' }])
  h.emit('planningUnits/up/applications/g/sessions/s/items', [{ id: 'i', plannedMinutes: 55 }])
  h.emit('planningUnits/up/applications/g/sessions/s/results', [{ id: 'r', actualMinutes: 60 }])
  assert.equal(latest.applications[0].sessions[0].results[0].actualMinutes, 60)
  h.emit('planningUnits/up/applications/g/sessions', [])
  assert.equal([...h.listeners.keys()].some((key) => key.includes('/sessions/s/')), false)
  h.emit('planningUnits/up/applications', [])
  assert.equal([...h.listeners.keys()].some((key) => key.includes('/applications/g/')), false)
  h.listeners.get('planningUnits/up').error(new Error('permission-denied'))
  assert.equal(failure.message, 'permission-denied')
  assert.equal(h.listeners.size, 0)
})
test('unmount closes every listener and cached responses are identified', () => {
  const h = harness()
  let latest
  const stop = subscribeDirectionGraph(h.dependencies, 'up', (value) => { latest = value }, assert.fail)
  h.emit('planningUnits/up', { title: 'UP' }, true)
  assert.equal(latest.fromCache, true)
  assert.equal(latest.unit, null)
  h.emit('planningUnits/up', { title: 'UP autoritzada' })
  assert.equal(latest.unit.title, 'UP autoritzada')
  stop()
  assert.equal(h.listeners.size, 0)
})
