import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildActivitySessionReflow, buildActivitySessionDistribution,
  createCalendarSession, createGroupApplication, createSessionItem,
  groupParallelSessionBundles, reconcileSessionOccurrences,
} from '../src/domain/planning/index.js'

const now = '2026-10-01T12:00:00.000Z'
const application = createGroupApplication({
  id: 'app-1', ownerUid: 'teacher-1', classId: 'class-1', planningUnitId: 'up-1', academicYearId: 'year-1',
}, { now })

function bundle(id, startsAt, changes = {}) {
  const session = createCalendarSession({
    id, startsAt, ownerUid: 'teacher-1', applicationId: application.id, classId: application.classId,
    durationMinutes: 60, ...changes,
  }, { now })
  return { session, results: [], items: [createSessionItem({
    id: `item-${id}`, ownerUid: 'teacher-1', applicationId: application.id, sessionId: session.id,
    sourceActivityId: 'activity-1', plannedMinutes: 55, title: 'Activitat 1', type: 'activity', order: 0,
  }, { now })] }
}

test('dues còpies de B i dues d’A són dues franges i una sola sessió lògica', () => {
  const bundles = [
    bundle('b-old', '2026-10-02T08:30:00', { subgroupId: 'B', parallelProgrammingKey: 'halves' }),
    bundle('b-new', '2026-10-02T08:30:00', { subgroupId: 'B', parallelProgrammingKey: 'halves', updatedAt: '2026-10-01T13:00:00.000Z' }),
    bundle('a-old', '2026-10-02T12:00:00', { subgroupId: 'A', parallelProgrammingKey: 'halves' }),
    bundle('a-new', '2026-10-02T12:00:00', { subgroupId: 'A', parallelProgrammingKey: 'halves', updatedAt: '2026-10-01T13:00:00.000Z' }),
  ]
  const result = reconcileSessionOccurrences(bundles, now)
  assert.deepEqual(result.bundles.map((entry) => entry.session.id), ['b-new', 'a-new'])
  assert.equal(result.duplicateBundles.length, 2)
  assert.equal(groupParallelSessionBundles(result.bundles).length, 1)
})

test('la reconciliació conserva les sessions amb historial i les UP diferents', () => {
  const held = bundle('held', '2026-09-28T08:30:00', { status: 'held' })
  const heldCopy = bundle('held-copy', '2026-09-28T08:30:00', { status: 'held' })
  const opened = bundle('opened', '2026-10-02T08:30:00', { classroomOpenedAt: now })
  const openedCopy = bundle('opened-copy', '2026-10-02T08:30:00', { classroomOpenedAt: now })
  const firstUp = bundle('first-up', '2026-10-05T08:30:00')
  const otherUp = bundle('other-up', '2026-10-05T08:30:00', { applicationId: 'app-other' })
  assert.equal(reconcileSessionOccurrences([held, heldCopy, opened, openedCopy, firstUp, otherUp], now).bundles.length, 6)
})

test('reorganitzar còpies de mig grup conserva una franja A i una B amb el mateix contingut', () => {
  const result = buildActivitySessionReflow({
    application, candidates: [], fromDate: '2026-10-01', options: { now },
    activities: [{ id: 'activity-1', title: 'Activitat 1', plannedMinutes: 55, type: 'activity' }],
    existingSessionBundles: [
      bundle('b-old', '2026-10-02T08:30:00', { subgroupId: 'B', parallelProgrammingKey: 'halves' }),
      bundle('b-new', '2026-10-02T08:30:00', { subgroupId: 'B', parallelProgrammingKey: 'halves', updatedAt: '2026-10-01T13:00:00.000Z' }),
      bundle('a-old', '2026-10-02T12:00:00', { subgroupId: 'A', parallelProgrammingKey: 'halves' }),
      bundle('a-new', '2026-10-02T12:00:00', { subgroupId: 'A', parallelProgrammingKey: 'halves', updatedAt: '2026-10-01T13:00:00.000Z' }),
    ],
  })
  assert.deepEqual(result.sessions.map((entry) => entry.session.id), ['b-new', 'a-new'])
  assert.deepEqual(result.removedSessions.map((session) => session.id).sort(), ['a-old', 'b-old'])
  assert.equal(result.logicalSessionCount, 1)
  assert.equal(result.availability.totalLogicalSessionCount, 1)
  assert.deepEqual(result.sessions.map((entry) => entry.items.map((item) => [item.sourceActivityId, item.plannedMinutes])), [
    [['activity-1', 55]], [['activity-1', 55]],
  ])
})

test('reorganitzar duplicats reparteix els minuts en dates úniques i la segona reorganització conserva els ids', () => {
  const input = {
    application,
    activities: [1, 2, 3].map((index) => ({ id: `activity-${index}`, title: `Activitat ${index}`, type: 'activity', plannedMinutes: 55 })),
    existingSessionBundles: [
      bundle('monday-old', '2026-10-05T08:30:00'),
      bundle('monday-new', '2026-10-05T08:30:00', { updatedAt: '2026-10-01T13:00:00.000Z' }),
    ],
    candidates: ['2026-10-05', '2026-10-12', '2026-10-19'].map((date) => ({
      date, startsAt: `${date}T08:30:00`, durationMinutes: 60,
    })),
    fromDate: '2026-10-01', options: { now },
  }
  const result = buildActivitySessionReflow(input)
  assert.deepEqual(result.sessions.map((entry) => entry.session.startsAt), [
    '2026-10-05T08:30:00', '2026-10-12T08:30:00', '2026-10-19T08:30:00',
  ])
  assert.deepEqual(result.removedSessions.map((session) => session.id), ['monday-old'])
  assert.equal(result.unscheduled.length, 0)
  const repeated = buildActivitySessionReflow({ ...input, existingSessionBundles: result.sessions })
  assert.deepEqual(repeated.sessions.map((entry) => entry.session.id), result.sessions.map((entry) => entry.session.id))
})

test('una candidata repetida o ja existent no crea una segona sessió física', () => {
  const existing = bundle('existing', '2026-10-05T08:30:00')
  existing.items = []
  const candidate = { date: '2026-10-05', startsAt: '2026-10-05T08:30:00', durationMinutes: 60 }
  const result = buildActivitySessionDistribution({
    application, activities: [{ id: 'activity-1', title: 'Activitat 1', type: 'activity', plannedMinutes: 110 }],
    existingSessionBundles: [existing], candidates: [candidate, candidate], options: { now },
  })
  assert.equal(result.sessions.length, 1)
  assert.equal(result.unscheduled[0].remainingMinutes, 55)
})
