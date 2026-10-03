import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildActivitySessionDistribution, buildActivitySessionReflow,
  buildAgendaSessionCompaction, buildAgendaRecoveryReflow,
  buildTimetableSessionCandidates, copyTimetableVersionStructure,
  createTimetableSlot, createTimetableVersion, isBabeliumItem,
  withBabelium, getSessionLoad, getClassroomTimerState,
} from '../src/domain/planning/index.js'
import { buildTimetableClassroomBundle, getAgendaSessionItemRemovalState } from '../src/lib/agendaToday.js'

const application = { id: 'app-fictional', ownerUid: 'teacher-fictional', classId: 'class-fictional' }
const options = { now: '2026-10-01T07:00:00.000Z' }
const activity = { id: 'activity-fictional', title: 'Activitat fictícia de SG', type: 'activity', plannedMinutes: 85 }
function candidate(date, durationMinutes = 90, babeliumEnabled = true) {
  return { date, startsAt: `${date}T09:00:00`, durationMinutes, babeliumEnabled, timetableSlotId: 'slot-fictional' }
}
function distribute(activities = [activity], candidates = [candidate('2026-10-05'), candidate('2026-10-12')]) {
  return buildActivitySessionDistribution({ application, activities, candidates, options })
}

test('Babèlium reserva 30 min, es manté primer i no consumeix minuts de la UP', () => {
  const result = distribute()
  assert.deepEqual(result.sessions.map((bundle) => bundle.items.map((item) => item.plannedMinutes)), [[30, 55], [30, 30]])
  assert.equal(result.scheduledMinutes, 85)
  assert.deepEqual(result.scheduledActivityIds, [activity.id])
  for (const bundle of result.sessions) {
    assert.ok(isBabeliumItem(bundle.items[0]))
    assert.equal(bundle.items[0].sourceActivityId, null)
    assert.ok(getSessionLoad(bundle.items, 90).plannedMinutes <= 85)
  }
})

test('les franges de 60, 90 i 120 minuts deixen 25, 55 i 85 minuts per SG/PI', () => {
  for (const duration of [60, 90, 120]) {
    const result = distribute([{ ...activity, plannedMinutes: 120 }], [candidate('2026-10-05', duration)])
    assert.equal(result.sessions[0].items[1].plannedMinutes, duration - 35)
  }
  assert.equal(distribute([activity], [candidate('2026-10-05', 90, false)]).sessions[0].items[0].plannedMinutes, 85)
})

test('reorganitzar o compactar no duplica ni desplaça la lectura', () => {
  const original = distribute()
  const bundles = original.sessions.map((bundle) => ({ ...bundle, results: [] }))
  const reflow = buildActivitySessionReflow({ application, activities: [activity], existingSessionBundles: bundles, fromDate: '2026-10-05', options })
  const compact = buildAgendaSessionCompaction({ application, existingSessionBundles: bundles, targetSessionId: bundles[0].session.id, options })
  for (const proposal of [reflow, compact]) {
    assert.equal(proposal.unscheduled.length, 0)
    assert.equal(proposal.sessions.flatMap((bundle) => bundle.items).filter((item) => !isBabeliumItem(item)).reduce((sum, item) => sum + item.plannedMinutes, 0), 85)
    for (const bundle of proposal.sessions) {
      assert.equal(bundle.items.filter(isBabeliumItem).length, 1)
      assert.ok(isBabeliumItem(bundle.items[0]))
    }
  }
})

test('recuperar una activitat respecta el bloc fix sense moure lectures entre sessions', () => {
  const bundles = distribute([{ ...activity, plannedMinutes: 60 }]).sessions.map((bundle) => ({ ...bundle, results: [] }))
  const recovery = buildAgendaRecoveryReflow({ application, existingSessionBundles: bundles, targetSessionId: bundles[0].session.id, recoveryItem: { sourceActivityId: 'recovery-fictional', title: 'Recuperació fictícia', type: 'activity' }, recoveryMinutes: 10, options })
  assert.equal(recovery.unscheduled.length, 0)
  assert.equal(recovery.sessions.flatMap((bundle) => bundle.items).filter((item) => !isBabeliumItem(item)).reduce((sum, item) => sum + item.plannedMinutes, 0), 70)
  for (const bundle of recovery.sessions) assert.equal(bundle.items.filter(isBabeliumItem).length, 1)
})

test('afegir activitats a una sessió existent descompta la lectura només una vegada', () => {
  const original = distribute([{ ...activity, plannedMinutes: 20 }]).sessions[0]
  const result = buildActivitySessionDistribution({ application, activities: [{ ...activity, id: 'next', plannedMinutes: 40 }], existingSessionBundles: [original], options })
  assert.equal(result.sessions[0].items.length, 1)
  assert.equal(result.sessions[0].items[0].plannedMinutes, 30)
  assert.equal(result.unscheduled[0].remainingMinutes, 10)
})

test('l’horari propaga i copia la configuració de Babèlium', () => {
  const timetable = createTimetableVersion({ id: 'timetable-fictional', ownerUid: application.ownerUid, academicYearId: 'year-fictional', label: 'Horari fictici', effectiveFrom: '2026-10-01' }, options)
  const slot = createTimetableSlot({ id: 'slot-fictional', ownerUid: application.ownerUid, timetableVersionId: timetable.id, classId: application.classId, weekday: 1, startsAt: '09:00', durationMinutes: 90, subject: 'SG', babeliumEnabled: true }, options)
  const proposal = buildTimetableSessionCandidates({ classId: application.classId, timetables: [timetable], slotsByTimetableId: { [timetable.id]: [slot] }, from: '2026-10-05', to: '2026-10-05' })
  assert.equal(proposal.candidates[0].babeliumEnabled, true)
  const copy = copyTimetableVersionStructure({ timetableVersion: timetable, slots: [slot] }, { academicYearId: 'year-next', effectiveFrom: '2027-09-01', label: 'Nou horari' }, options)
  assert.equal(copy.slots[0].babeliumEnabled, true)
})

test('una classe sense UP ofereix Babèlium amb temporitzador de 30 minuts', () => {
  const bundle = buildTimetableClassroomBundle({ date: '2026-10-05', startsAt: '2026-10-05T09:00:00', slot: { id: 'slot-fictional', classId: application.classId, babeliumEnabled: true, durationMinutes: 90, subject: 'PI' } }, { name: 'Grup fictici' }, application.ownerUid)
  assert.ok(isBabeliumItem(bundle.items[0]))
  const timer = getClassroomTimerState({ plannedMinutes: bundle.items[0].plannedMinutes, startedAtMs: new Date('2026-10-05T09:00:00').getTime(), nowMs: new Date('2026-10-05T09:10:00').getTime() })
  assert.equal(timer.remainingSeconds, 1200)
  assert.equal(getAgendaSessionItemRemovalState(bundle, bundle.items[0]).canRemove, false)
})

test('activar o desactivar la lectura preserva les activitats i l’historial', () => {
  const bundle = { ...distribute().sessions[0], results: [] }
  const enabled = withBabelium(withBabelium(bundle, { babeliumEnabled: true }), { babeliumEnabled: true })
  assert.equal(enabled.items.filter(isBabeliumItem).length, 1)
  const disabled = withBabelium(enabled, { babeliumEnabled: false })
  assert.deepEqual(disabled.items, bundle.items.filter((item) => !isBabeliumItem(item)))
  const history = { ...bundle, session: { ...bundle.session, status: 'held' } }
  assert.deepEqual(withBabelium(history, { babeliumEnabled: false }).items, history.items)
})

test('els mitjos grups comparteixen la UP encara que només una franja tingui lectura', () => {
  const result = distribute([{ ...activity, plannedMinutes: 80 }], [
    { ...candidate('2026-10-05'), subgroupId: 'Grup A' },
    { ...candidate('2026-10-05', 90, false), startsAt: '2026-10-05T11:00:00', subgroupId: 'Grup B' },
    candidate('2026-10-12', 90, false),
  ])
  assert.equal(result.logicalSessionCount, 2)
  assert.deepEqual(result.sessions.map((bundle) => bundle.items.filter((item) => !isBabeliumItem(item)).map((item) => item.plannedMinutes)), [[55], [55], [25]])
  assert.equal(result.scheduledMinutes, 80)
})

test('desactivar Babèlium també retira el bloc antic de la proposta de reorganització', () => {
  const original = { ...distribute([{ ...activity, plannedMinutes: 55 }]).sessions[0], results: [] }
  const disabled = withBabelium(original, { babeliumEnabled: false })
  const reflow = buildActivitySessionReflow({ application, activities: [{ ...activity, plannedMinutes: 55 }], existingSessionBundles: [disabled], fromDate: '2026-10-05', options })
  assert.equal(reflow.removedItems.filter(isBabeliumItem).length, 1)
  assert.equal(reflow.sessions.flatMap((bundle) => bundle.items).filter(isBabeliumItem).length, 0)
})
