import assert from 'node:assert/strict'
import test from 'node:test'
import { buildTimetableSessionCandidates, buildActivitySessionDistribution, buildActivitySessionReflow, createGroupApplication, resolvePlanningSubject } from '../src/domain/planning/index.js'
import { buildSchedulingPersistenceEntries } from '../src/features/agenda/agendaSchedulingPersistence.js'

const application = createGroupApplication({ id: 'application', ownerUid: 'teacher', academicYearId: 'year', planningUnitId: 'unit', classId: 'class', subject: 'Ciències' })
const slots = [
  { id: 'science', classId: 'class', subject: 'Ciències', weekday: 1, startsAt: '09:30', durationMinutes: 60 },
  { id: 'tutorial', classId: 'class', subject: 'Tutoria', weekday: 3, startsAt: '13:00', durationMinutes: 60 },
  { id: 'half-a', classId: 'class', subject: 'Ciències', weekday: 5, startsAt: '15:00', subgroupId: 'A', durationMinutes: 60 },
  { id: 'half-b', classId: 'class', subject: 'Ciències', weekday: 5, startsAt: '16:00', subgroupId: 'B', durationMinutes: 60, sharedProgrammingSlotId: 'half-a' },
]
const input = { classId: 'class', from: '2026-10-05', to: '2026-10-09', timetables: [{ id: 'table', effectiveFrom: '2026-09-01' }], slotsByTimetableId: { table: slots } }
const scienceCandidates = () => buildTimetableSessionCandidates({ ...input, subject: 'CIENCIES' }).candidates

test('ciències i tutoria del mateix grup utilitzen dies diferents i conserven els mitjos grups', () => {
  assert.deepEqual(scienceCandidates().map((c) => c.timetableSlotId), ['science', 'half-a', 'half-b'])
  assert.equal(scienceCandidates()[1].parallelProgrammingKey, scienceCandidates()[2].parallelProgrammingKey)
  const tutorial = buildTimetableSessionCandidates({ ...input, subject: 'Tutoria' }).candidates
  assert.deepEqual(tutorial.map((c) => c.startsAt), ['2026-10-07T13:00:00'])
})

test('el filtre de matèria respecta festius, versions i classes extraordinàries', () => {
  const calendarEvents = [
    { id: 'holiday', type: 'holiday', startsOn: '2026-10-05', endsOn: '2026-10-05' },
    ...['Tutoria', 'Ciències', ''].map((subject, index) => ({ id: `extra${index}`, type: 'extraordinarySession', classIds: ['class'], subject, consumesPlannedSession: true, startsOn: '2026-10-06', endsOn: '2026-10-06', startsAt: '10:00', durationMinutes: 60 })),
  ]
  const result = buildTimetableSessionCandidates({ ...input, subject: 'Ciències', calendarEvents })
  assert.deepEqual(result.candidates.map((c) => c.calendarEventId || c.timetableSlotId), ['extra1', 'half-a', 'half-b'])
  const changed = buildTimetableSessionCandidates({ ...input, subject: 'Ciències', timetables: [...input.timetables, { id: 'new', effectiveFrom: '2026-10-07' }], slotsByTimetableId: { ...input.slotsByTimetableId, new: [{ ...slots[1], subject: 'Ciències', id: 'new-science' }] } })
  assert.deepEqual(changed.candidates.map((c) => c.timetableSlotId), ['science', 'new-science'])
})

const activities = [{ id: 'atoms', type: 'activity', title: 'Àtoms', plannedMinutes: 55 }]
const wrongBundle = { timetableSubject: 'Tutoria', session: { id: 'wrong', applicationId: 'application', classId: 'class', ownerUid: 'teacher', status: 'planned', startsAt: '2026-10-07T13:00:00', durationMinutes: 60, timetableSlotId: 'tutorial' }, items: [{ id: 'item', sourceActivityId: 'atoms', plannedMinutes: 55 }], results: [] }

test('la distribució progressiva no reutilitza una sessió antiga situada en tutoria', () => {
  const result = buildActivitySessionDistribution({ application, activities, candidates: scienceCandidates(), existingSessionBundles: [wrongBundle] })
  assert.ok(result.sessions.length > 0)
  assert.ok(result.sessions.every((bundle) => bundle.session.timetableSlotId !== 'tutorial'))
})

test('la proposta intel·ligent retira les assignacions futures incorrectes i conserva les impartides', () => {
  const held = { ...wrongBundle, session: { ...wrongBundle.session, id: 'held', status: 'held' } }
  const futureWithResults = { ...wrongBundle, session: { ...wrongBundle.session, id: 'with-results' }, results: [{ id: 'result' }] }
  const result = buildActivitySessionReflow({ application, activities, candidates: scienceCandidates(), existingSessionBundles: [wrongBundle, held, futureWithResults], fromDate: '2026-10-05', options: { now: '2026-10-03T10:00:00' } })
  assert.deepEqual(result.removedSessions.map((s) => s.id), ['wrong'])
  assert.equal(result.lockedSessionCount, 2)
  assert.ok(result.sessions.every((bundle) => bundle.session.timetableSlotId !== 'tutorial'))
})

test('la matèria desada preval sobre la del grup i es conserva en la persistència', () => {
  assert.equal(resolvePlanningSubject({ application: { subject: 'Tutoria' }, classItem: { subject: 'Ciències' } }), 'Tutoria')
  assert.equal(resolvePlanningSubject({ planningUnit: { tutoringSpaceId: 'space' }, classItem: { subject: 'Ciències' } }), 'Tutoria')
  assert.equal(resolvePlanningSubject({ subjects: ['Tutoria', 'Ciències'] }), '')
  const saved = buildSchedulingPersistenceEntries({ setup: { application, planningUnit: { id: 'unit', ownerUid: 'teacher' } }, sessions: [] })
  assert.equal(saved.application.subject, 'Ciències')
})
