import assert from 'node:assert/strict'
import test from 'node:test'
import { buildDirectionActivityReports as buildReports } from '../src/domain/planning/directionView.js'
import { getEffectiveActivityMaterialLinks } from '../src/domain/planning/materials.js'

// Freeze the clock before the scheduled sessions: expected states do not age.
const buildDirectionActivityReports = (activities, bundle, phases) => buildReports(activities, bundle, phases, { now: '2026-10-08T08:00:00' })

const activity = { id: 'a', title: 'Mostres', phaseId: 'p', plannedMinutes: 55, order: 0 }
function session(id, status, minutes = 55, options = {}) {
  return { session: { id, status, startsAt: `2026-10-08T${id === 'b' ? '11' : '09'}:00:00`, durationMinutes: 60, ...options }, items: [{ id: `${id}-item`, sourceActivityId: 'a', plannedMinutes: minutes, segmentIndex: 1, segmentCount: 1 }], results: [] }
}
test('an unchanged scheduled activity has no modification label and identifies its session', () => {
  const report = buildDirectionActivityReports([activity], { sessions: [session('s', 'planned')] })[0]
  assert.equal(report.modified, false)
  assert.equal(report.status, 'scheduled')
  assert.equal(report.remainingMinutes, 0)
  assert.equal(report.actualMinutes, null)
  assert.equal(report.occurrences[0].sessionNumber, 1)
})
test('completed timing is real, retains the original and marks only a real change', () => {
  const bundle = session('s', 'held')
  bundle.results = [{ sessionItemId: 's-item', status: 'completed', actualMinutes: 60 }]
  const report = buildDirectionActivityReports([activity], { sessions: [bundle] })[0]
  assert.equal(report.status, 'completed')
  assert.equal(report.actualMinutes, 60)
  assert.equal(report.modified, true)
  assert.equal(report.original.plannedMinutes, 55)
  bundle.results[0].actualMinutes = 55
  assert.equal(buildDirectionActivityReports([activity], { sessions: [bundle] })[0].modified, false)
})
test('group adaptations and hidden activities stay attached to the original activity', () => {
  const overrides = [{ activityId: 'a', changes: { plannedMinutes: 70, diversityMeasures: [{ label: 'Suport visual', studentNames: ['Alumne fictici'] }] } }]
  const report = buildDirectionActivityReports([activity], { overrides })[0]
  assert.equal(report.modified, true)
  assert.equal(report.plannedMinutes, 70)
  assert.equal(report.actualMinutes, null)
  assert.equal(report.activity.diversityMeasures[0].label, 'Suport visual')
  const removed = buildDirectionActivityReports([activity], { overrides: [{ activityId: 'a', changes: { hidden: true } }] })[0]
  assert.equal(removed.status, 'removed')
  assert.equal(removed.activity.id, 'a')
})
test('cancelled and skipped sessions do not consume the activity budget', () => {
  const cancelled = session('s', 'cancelled')
  const skipped = session('b', 'held')
  skipped.results = [{ sessionItemId: 'b-item', status: 'skipped', actualMinutes: 0 }]
  const report = buildDirectionActivityReports([activity], { sessions: [cancelled, skipped] })[0]
  assert.equal(report.remainingMinutes, 55)
  assert.equal(report.status, 'unscheduled')
  assert.equal(report.actualMinutes, null)
  assert.equal(report.occurrences.length, 2)
})
test('partial allocation preserves pending minutes and terminal fragments need completion', () => {
  const partial = buildDirectionActivityReports([activity], { sessions: [session('s', 'planned', 20)] })[0]
  assert.equal(partial.status, 'partial')
  assert.equal(partial.remainingMinutes, 35)
  const first = session('s', 'held', 20)
  first.items[0].segmentCount = 2
  first.results = [{ sessionItemId: 's-item', status: 'completed', actualMinutes: 20 }]
  const last = session('b', 'planned', 35)
  last.items[0].segmentIndex = 2
  last.items[0].segmentCount = 2
  const report = buildDirectionActivityReports([activity], { sessions: [first, last] })[0]
  assert.equal(report.status, 'scheduled')
  assert.equal(report.actualMinutes, 20)
})
test('parallel half-groups retain both sessions without doubling logical minutes', () => {
  const a = session('s', 'held', 55, { subgroupId: 'A' })
  const b = session('b', 'held', 55, { subgroupId: 'B' })
  a.results = [{ sessionItemId: 's-item', status: 'completed', actualMinutes: 60 }]
  b.results = [{ sessionItemId: 'b-item', status: 'completed', actualMinutes: 60 }]
  const report = buildDirectionActivityReports([activity], { sessions: [a, b] })[0]
  assert.equal(report.actualMinutes, 60)
  assert.equal(report.remainingMinutes, 0)
  assert.equal(report.status, 'completed')
  assert.equal(report.occurrences.length, 2)
  b.results = []
  assert.notEqual(buildDirectionActivityReports([activity], { sessions: [a, b] })[0].status, 'completed')
})
test('manual completion and zero real minutes are preserved', () => {
  const report = buildDirectionActivityReports([activity], { overrides: [{ activityId: 'a', changes: { manuallyCompleted: true } }] })[0]
  assert.equal(report.status, 'completed')
  assert.equal(report.manuallyCompleted, true)
  assert.equal(report.modified, false)
  const bundle = session('s', 'held')
  bundle.results = [{ sessionItemId: 's-item', status: 'completed', actualMinutes: 0 }]
  assert.equal(buildDirectionActivityReports([activity], { sessions: [bundle] })[0].actualMinutes, 0)
})
test('adapted material links inherit UP resources and distinguish teachers from pupils', () => {
  const report = buildDirectionActivityReports([activity], { overrides: [{ activityId: 'a', changes: { studentMaterials: [{ kind: 'link', label: 'Fitxa', url: 'https://example.com/fitxa', teacherUrl: 'https://example.com/guia' }] } }] })[0]
  const links = getEffectiveActivityMaterialLinks(report.activity, { transversalMaterials: [{ kind: 'link', label: 'Recurs UP', url: 'https://example.com/up' }] })
  assert.equal(report.modified, true)
  assert.equal(links.length, 3)
  assert.equal(links.find((link) => link.url.endsWith('/guia')).audience, 'teacher')
  assert.equal(links.find((link) => link.url.endsWith('/up')).transversal, true)
})
