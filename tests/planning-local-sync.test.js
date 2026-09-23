import assert from 'node:assert/strict'
import test from 'node:test'
import 'fake-indexeddb/auto'
import {
  acknowledgePlanningOperation,
  clearPlanningLocalData,
  deletePlanningEntityLocally,
  loadPlanningConflicts,
  loadPlanningOutbox,
  loadPlanningScope,
  mergePlanningRemoteScope,
  PLANNING_LOCAL_DB_NAME,
  resolvePlanningConflict,
  savePlanningEntityLocally,
} from '../src/data/local/planningIndexedDb.js'
import { createPlanningRepository } from '../src/data/planningRepository.js'
import { getPlanningEntityLocation } from '../src/data/planningEntityLocation.js'
import {
  PLANNING_SYNC_STATES,
  flushPlanningOutbox,
  getPlanningSyncState,
  getPlanningSyncSummary,
} from '../src/data/sync/planningSync.js'
import {
  createAcademicYear,
  createActivityResult,
  createCalendarEvent,
  createCalendarSession,
  createGroupApplication,
  createPlanningPrivateNote,
  createSessionItem,
  createTimetableSlot,
  createTimetableVersion,
} from '../src/domain/planning/model.js'
import { PLANNING_ENTITY_TYPES } from '../src/domain/planning/constants.js'

function deleteTestDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(PLANNING_LOCAL_DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('La base local de planificació ha quedat bloquejada.'))
  })
}

function academicYear(uid, changes = {}) {
  return createAcademicYear({
    endsOn: '2027-06-30',
    id: 'year-2026',
    label: '2026-2027',
    ownerUid: uid,
    startsOn: '2026-09-01',
    ...changes,
  }, { now: changes.updatedAt || '2026-09-18T08:00:00.000Z' })
}

test.beforeEach(deleteTestDatabase)
test.after(deleteTestDatabase)

test('les quinze entitats comparteixen una ruta estable entre la cua i Firestore', () => {
  const uid = 'teacher-1'
  const base = { id: 'entity-1', ownerUid: uid }
  const cases = [
    [{ ...base, entityType: PLANNING_ENTITY_TYPES.ACADEMIC_YEAR }, {}, 'users/teacher-1/planningAcademicYears/entity-1'],
    [{ ...base, academicYearId: 'year-1', entityType: PLANNING_ENTITY_TYPES.TEMPORAL_UNIT }, {}, 'users/teacher-1/planningTemporalUnits/entity-1'],
    [{ ...base, academicYearId: 'year-1', entityType: PLANNING_ENTITY_TYPES.TIMETABLE_VERSION }, {}, 'users/teacher-1/planningTimetables/entity-1'],
    [{ ...base, entityType: PLANNING_ENTITY_TYPES.TIMETABLE_SLOT, timetableVersionId: 'timetable-1' }, {}, 'users/teacher-1/planningTimetableSlots/entity-1'],
    [{ ...base, academicYearId: 'year-1', entityType: PLANNING_ENTITY_TYPES.CALENDAR_EVENT }, {}, 'users/teacher-1/planningCalendarEvents/entity-1'],
    [{ ...base, academicYearId: 'year-1', entityType: PLANNING_ENTITY_TYPES.PLANNING_UNIT, temporalUnitId: 'ut-1' }, {}, 'planningUnits/entity-1'],
    [{ ...base, entityType: PLANNING_ENTITY_TYPES.PLANNING_PHASE, planningUnitId: 'up-1' }, {}, 'planningUnits/up-1/phases/entity-1'],
    [{ ...base, entityType: PLANNING_ENTITY_TYPES.PLANNING_ACTIVITY, planningUnitId: 'up-1' }, {}, 'planningUnits/up-1/activities/entity-1'],
    [{ ...base, entityType: PLANNING_ENTITY_TYPES.ACCESS_GRANT, granteeEmail: 'direction@example.com', planningUnitId: 'up-1' }, {}, 'planningUnits/up-1/accessGrants/direction@example.com'],
    [{ ...base, classId: 'class-1', entityType: PLANNING_ENTITY_TYPES.GROUP_APPLICATION, planningUnitId: 'up-1' }, {}, 'planningUnits/up-1/applications/entity-1'],
    [{ ...base, applicationId: 'application-1', entityType: PLANNING_ENTITY_TYPES.ACTIVITY_OVERRIDE }, { planningUnitId: 'up-1' }, 'planningUnits/up-1/applications/application-1/activityOverrides/entity-1'],
    [{ ...base, applicationId: 'application-1', classId: 'class-1', entityType: PLANNING_ENTITY_TYPES.CALENDAR_SESSION }, { planningUnitId: 'up-1' }, 'planningUnits/up-1/applications/application-1/sessions/entity-1'],
    [{ ...base, applicationId: 'application-1', entityType: PLANNING_ENTITY_TYPES.SESSION_ITEM, sessionId: 'session-1' }, { planningUnitId: 'up-1' }, 'planningUnits/up-1/applications/application-1/sessions/session-1/items/entity-1'],
    [{ ...base, applicationId: 'application-1', entityType: PLANNING_ENTITY_TYPES.ACTIVITY_RESULT, sessionId: 'session-1' }, { planningUnitId: 'up-1' }, 'planningUnits/up-1/applications/application-1/sessions/session-1/results/entity-1'],
    [{ ...base, entityType: PLANNING_ENTITY_TYPES.PRIVATE_NOTE, planningUnitId: 'up-1' }, {}, 'planningPrivateNotes/entity-1'],
  ]

  cases.forEach(([entity, context, expectedPath]) => {
    assert.equal(getPlanningEntityLocation(entity, context).path, expectedPath)
  })
})

test('una entitat local i la cua sobreviuen el tancament de cada connexió IndexedDB', async () => {
  await savePlanningEntityLocally('teacher-1', academicYear('teacher-1'))

  const reloaded = await loadPlanningScope('teacher-1', 'academicYears')
  const pending = await loadPlanningOutbox('teacher-1')
  assert.equal(reloaded.length, 1)
  assert.equal(reloaded[0].label, '2026-2027')
  assert.equal(pending.length, 1)
  assert.equal(pending[0].operation, 'upsert')
})

test('horari, franges i excepcions es recuperen per abast després d’una recàrrega offline', async () => {
  const uid = 'teacher-1'
  const now = '2026-09-19T08:00:00.000Z'
  const timetable = createTimetableVersion({
    id: 'plan-timetable-offline',
    ownerUid: uid,
    academicYearId: 'year-2026',
    label: 'Horari inicial',
    effectiveFrom: '2026-09-01',
  }, { now })
  const slot = createTimetableSlot({
    id: 'plan-slot-offline',
    ownerUid: uid,
    timetableVersionId: timetable.id,
    classId: 'class-1',
    weekday: 2,
    startsAt: '09:30',
    durationMinutes: 90,
    subject: 'Música',
    subgroupId: 'Grup A',
  }, { now })
  const calendarEvent = createCalendarEvent({
    id: 'plan-event-offline',
    ownerUid: uid,
    academicYearId: 'year-2026',
    type: 'extraordinarySession',
    title: 'Substitució',
    startsOn: '2026-09-22',
    classIds: ['class-1'],
    consumesPlannedSession: true,
  }, { now })

  await savePlanningEntityLocally(uid, timetable)
  await savePlanningEntityLocally(uid, slot)
  await savePlanningEntityLocally(uid, calendarEvent)

  assert.equal((await loadPlanningScope(uid, 'academicYear:year-2026:planningTimetables'))[0].label, 'Horari inicial')
  assert.equal((await loadPlanningScope(uid, `timetable:${timetable.id}:slots`))[0].subgroupId, 'Grup A')
  assert.equal((await loadPlanningScope(uid, 'academicYear:year-2026:planningCalendarEvents'))[0].consumesPlannedSession, true)
  assert.equal((await loadPlanningOutbox(uid)).length, 3)
})

test('una calendarització confirmada conserva aplicació, sessió i vincle amb l’activitat offline', async () => {
  const uid = 'teacher-1'
  const now = '2026-09-19T10:00:00.000Z'
  const application = createGroupApplication({
    id: 'plan-application-offline', ownerUid: uid, academicYearId: 'year-2026',
    planningUnitId: 'up-1', classId: 'class-1', status: 'active',
  }, { now })
  const session = createCalendarSession({
    id: 'plan-session-offline', ownerUid: uid, applicationId: application.id,
    classId: 'class-1', startsAt: '2026-09-21T09:30:00', durationMinutes: 60,
  }, { now })
  const item = createSessionItem({
    id: 'plan-session-item-offline', ownerUid: uid, applicationId: application.id,
    sessionId: session.id, sourceActivityId: 'activity-1', type: 'activity',
    title: 'Taller', order: 0, plannedMinutes: 55,
  }, { now })

  await savePlanningEntityLocally(uid, application)
  await savePlanningEntityLocally(uid, session, { planningUnitId: 'up-1' })
  await savePlanningEntityLocally(uid, item, { planningUnitId: 'up-1' })

  assert.equal((await loadPlanningScope(uid, 'planningUnit:up-1:applications'))[0].status, 'active')
  assert.equal((await loadPlanningScope(uid, `application:${application.id}:sessions`))[0].startsAt, '2026-09-21T09:30:00')
  assert.equal((await loadPlanningScope(uid, `session:${session.id}:detail`))[0].sourceActivityId, 'activity-1')
  assert.equal((await loadPlanningOutbox(uid)).length, 3)
})

test('treure un fragment programat elimina només aquell element i en conserva la baixa pendent', async () => {
  const uid = 'teacher-1'
  const now = '2026-09-23T08:00:00.000Z'
  const base = {
    applicationId: 'application-1', ownerUid: uid, sessionId: 'session-1',
    sourceActivityId: 'activity-1', type: 'activity', title: 'Activitat intel·ligències',
  }
  const first = createSessionItem({ ...base, id: 'item-1', order: 0, plannedMinutes: 5 }, { now })
  const second = createSessionItem({ ...base, id: 'item-2', order: 1, plannedMinutes: 20 }, { now })

  await savePlanningEntityLocally(uid, first, { planningUnitId: 'up-1' })
  await savePlanningEntityLocally(uid, second, { planningUnitId: 'up-1' })
  await deletePlanningEntityLocally(uid, first, { planningUnitId: 'up-1' })

  const remaining = await loadPlanningScope(uid, 'session:session-1:detail')
  assert.deepEqual(remaining.map((item) => item.id), ['item-2'])
  const pendingDeletion = (await loadPlanningOutbox(uid)).find((operation) => operation.documentId === first.id)
  assert.equal(pendingDeletion.operation, 'delete')
})

test('Mode aula conserva offline l’obertura, el temps real i el tancament de la sessió', async () => {
  const uid = 'teacher-1'
  const now = '2026-09-19T10:00:00.000Z'
  const session = createCalendarSession({
    id: 'plan-session-classroom', ownerUid: uid, applicationId: 'application-1',
    classId: 'class-1', startsAt: '2026-09-21T09:30:00', durationMinutes: 60,
    classroomOpenedAt: now, attendanceConfirmedAt: '2026-09-19T10:01:00.000Z',
    classroomClosedAt: '2026-09-19T10:55:00.000Z', status: 'held',
  }, { now })
  const result = createActivityResult({
    id: 'plan-result-classroom', ownerUid: uid, applicationId: 'application-1',
    sessionId: session.id, sessionItemId: 'item-1', sourceActivityId: 'activity-1',
    status: 'completed', actualMinutes: 12.5,
  }, { now })
  const privateNote = createPlanningPrivateNote({
    id: 'plan-private-note-classroom', ownerUid: uid, planningUnitId: 'up-1',
    sessionId: session.id, text: 'Recordar una incidència només per a mi.',
  }, { now })

  await savePlanningEntityLocally(uid, session, { planningUnitId: 'up-1' })
  await savePlanningEntityLocally(uid, result, { planningUnitId: 'up-1' })
  await savePlanningEntityLocally(uid, privateNote)

  const storedSession = (await loadPlanningScope(uid, 'application:application-1:sessions'))[0]
  const storedResult = (await loadPlanningScope(uid, `session:${session.id}:detail`))[0]
  assert.equal(storedSession.status, 'held')
  assert.equal(storedSession.attendanceConfirmedAt, '2026-09-19T10:01:00.000Z')
  assert.equal(storedResult.actualMinutes, 12.5)
  assert.equal((await loadPlanningScope(uid, `session:${session.id}:privateNotes`))[0].text, 'Recordar una incidència només per a mi.')
  assert.equal((await loadPlanningOutbox(uid)).length, 3)
})

test('una segona edició substitueix la pendent i una confirmació antiga no la retira', async () => {
  const first = await savePlanningEntityLocally('teacher-1', academicYear('teacher-1'))
  await savePlanningEntityLocally('teacher-1', academicYear('teacher-1', {
    label: 'Curs actualitzat',
    updatedAt: '2026-09-18T09:00:00.000Z',
  }))

  assert.equal(await acknowledgePlanningOperation(first), false)
  const [pending] = await loadPlanningOutbox('teacher-1')
  assert.equal(pending.value.label, 'Curs actualitzat')
  assert.notEqual(pending.revision, first.revision)
})

test('cada compte només carrega la seva còpia local', async () => {
  await savePlanningEntityLocally('teacher-1', academicYear('teacher-1', { label: 'Docent 1' }))
  await savePlanningEntityLocally('teacher-2', academicYear('teacher-2', { label: 'Docent 2' }))

  assert.equal((await loadPlanningScope('teacher-1', 'academicYears'))[0].label, 'Docent 1')
  assert.equal((await loadPlanningScope('teacher-2', 'academicYears'))[0].label, 'Docent 2')
})

test('sense connexió conserva la cua i mostra un estat explícit', async () => {
  await savePlanningEntityLocally('teacher-1', academicYear('teacher-1'))
  let calls = 0
  const summary = await flushPlanningOutbox('teacher-1', async () => {
    calls += 1
  }, { isOnline: false })

  assert.equal(calls, 0)
  assert.equal(summary.state, PLANNING_SYNC_STATES.OFFLINE)
  assert.equal(summary.label, 'Sense connexió')
  assert.equal((await loadPlanningOutbox('teacher-1')).length, 1)
})

test('una sincronització correcta buida només la revisió que realment ha enviat', async () => {
  await savePlanningEntityLocally('teacher-1', academicYear('teacher-1'))
  const sent = []
  const summary = await flushPlanningOutbox('teacher-1', async (operation) => {
    sent.push(operation)
    return { applied: true }
  })

  assert.equal(sent.length, 1)
  assert.equal(summary.state, PLANNING_SYNC_STATES.SAVED)
  assert.equal((await loadPlanningOutbox('teacher-1')).length, 0)
})

test('una edició remota posterior crea un conflicte i no substitueix la còpia local', async () => {
  const initialRemote = academicYear('teacher-1', {
    label: 'Versió inicial',
    updatedAt: '2026-09-18T08:00:00.000Z',
  })
  await mergePlanningRemoteScope('teacher-1', 'academicYears', [initialRemote])
  await savePlanningEntityLocally('teacher-1', academicYear('teacher-1', {
    label: 'Canvi de l’ordinador',
    updatedAt: '2026-09-18T09:00:00.000Z',
  }))
  const newerRemote = academicYear('teacher-1', {
    label: 'Canvi de l’iPad',
    updatedAt: '2026-09-18T09:30:00.000Z',
  })

  await mergePlanningRemoteScope('teacher-1', 'academicYears', [newerRemote])

  assert.equal((await loadPlanningScope('teacher-1', 'academicYears'))[0].label, 'Canvi de l’ordinador')
  assert.equal((await loadPlanningConflicts('teacher-1'))[0].remoteValue.label, 'Canvi de l’iPad')
  assert.equal((await getPlanningSyncSummary('teacher-1')).state, PLANNING_SYNC_STATES.REVIEW)
})

test('una consulta remota parcial no interpreta els documents absents com eliminats', async () => {
  await mergePlanningRemoteScope('teacher-1', 'academicYears', [
    academicYear('teacher-1', { id: 'year-2025', label: '2025-2026' }),
    academicYear('teacher-1', { id: 'year-2026', label: '2026-2027' }),
  ])

  await mergePlanningRemoteScope('teacher-1', 'academicYears', [
    academicYear('teacher-1', { id: 'year-2026', label: '2026-2027' }),
  ])

  assert.equal((await loadPlanningScope('teacher-1', 'academicYears')).length, 2)
})

test('la resolució remota descarta la cua només després d’una decisió explícita', async () => {
  const initial = academicYear('teacher-1')
  await mergePlanningRemoteScope('teacher-1', 'academicYears', [initial])
  await savePlanningEntityLocally('teacher-1', academicYear('teacher-1', {
    label: 'Local',
    updatedAt: '2026-09-18T09:00:00.000Z',
  }))
  const remote = academicYear('teacher-1', {
    label: 'Remota',
    updatedAt: '2026-09-18T10:00:00.000Z',
  })
  await mergePlanningRemoteScope('teacher-1', 'academicYears', [remote])
  const [conflict] = await loadPlanningConflicts('teacher-1')

  await resolvePlanningConflict('teacher-1', conflict.path, 'remote')

  assert.equal((await loadPlanningScope('teacher-1', 'academicYears'))[0].label, 'Remota')
  assert.equal((await loadPlanningOutbox('teacher-1')).length, 0)
  assert.equal((await loadPlanningConflicts('teacher-1')).length, 0)
})

test('la resolució local es rebasa sobre la versió remota abans de tornar a enviar', async () => {
  const initial = academicYear('teacher-1')
  await mergePlanningRemoteScope('teacher-1', 'academicYears', [initial])
  await savePlanningEntityLocally('teacher-1', academicYear('teacher-1', {
    label: 'Local escollida',
    updatedAt: '2026-09-18T09:00:00.000Z',
  }))
  const remote = academicYear('teacher-1', {
    label: 'Remota descartada',
    updatedAt: '2026-09-18T10:00:00.000Z',
  })
  await mergePlanningRemoteScope('teacher-1', 'academicYears', [remote])
  const [conflict] = await loadPlanningConflicts('teacher-1')

  await resolvePlanningConflict('teacher-1', conflict.path, 'local', {
    now: '2026-09-18T10:05:00.000Z',
  })

  const [pending] = await loadPlanningOutbox('teacher-1')
  assert.equal(pending.baseUpdatedAt, '2026-09-18T10:00:00.000Z')
  assert.equal(pending.value.label, 'Local escollida')
  assert.equal(pending.value.updatedAt, '2026-09-18T10:05:00.000Z')
  assert.equal((await loadPlanningConflicts('teacher-1')).length, 0)
})

test('un conflicte detectat pel servidor queda pendent de revisió', async () => {
  await savePlanningEntityLocally('teacher-1', academicYear('teacher-1'))
  const summary = await flushPlanningOutbox('teacher-1', async () => ({
    conflict: true,
    remoteUpdatedAt: '2026-09-18T10:00:00.000Z',
    remoteValue: academicYear('teacher-1', { label: 'Remota' }),
  }))

  assert.equal(summary.state, PLANNING_SYNC_STATES.REVIEW)
  assert.equal((await loadPlanningOutbox('teacher-1')).length, 1)
  assert.equal((await loadPlanningConflicts('teacher-1')).length, 1)
})

test('el repositori carrega sota demanda i no consulta la xarxa quan està offline', async () => {
  await savePlanningEntityLocally('teacher-1', academicYear('teacher-1'))
  let remoteLoads = 0
  const repository = createPlanningRepository({
    applyRemoteOperation: async () => ({ applied: true }),
    isOnline: () => false,
    uid: 'teacher-1',
  })
  const result = await repository.loadScope('academicYears', async () => {
    remoteLoads += 1
    return []
  })

  assert.equal(result.source, 'local')
  assert.equal(result.entities.length, 1)
  assert.equal(remoteLoads, 0)
})

test('si la consulta remota falla el repositori retorna la còpia local sense perdre-la', async () => {
  await savePlanningEntityLocally('teacher-1', academicYear('teacher-1'))
  const repository = createPlanningRepository({
    applyRemoteOperation: async () => ({ applied: true }),
    isOnline: () => true,
    uid: 'teacher-1',
  })

  const result = await repository.loadScope('academicYears', async () => {
    throw Object.assign(new Error('Sense resposta'), { code: 'firestore/unavailable' })
  })

  assert.equal(result.source, 'local')
  assert.equal(result.entities.length, 1)
  assert.equal(result.error.code, 'firestore/unavailable')
})

test('el tancament de sessió neteja la còpia local però protegeix canvis pendents', async () => {
  const operation = await savePlanningEntityLocally('teacher-1', academicYear('teacher-1'))
  await assert.rejects(clearPlanningLocalData('teacher-1'), { code: 'planning/pending-logout' })
  await acknowledgePlanningOperation(operation)
  await clearPlanningLocalData('teacher-1')

  assert.equal((await loadPlanningScope('teacher-1', 'academicYears')).length, 0)
})

test('els sis estats públics de sincronització tenen una prioritat estable', () => {
  assert.equal(getPlanningSyncState(), PLANNING_SYNC_STATES.SAVED)
  assert.equal(getPlanningSyncState({ pendingCount: 1 }), PLANNING_SYNC_STATES.PENDING)
  assert.equal(getPlanningSyncState({ syncing: true }), PLANNING_SYNC_STATES.SAVING)
  assert.equal(getPlanningSyncState({ error: 'error' }), PLANNING_SYNC_STATES.ERROR)
  assert.equal(getPlanningSyncState({ isOnline: false }), PLANNING_SYNC_STATES.OFFLINE)
  assert.equal(getPlanningSyncState({ conflictCount: 1, isOnline: false }), PLANNING_SYNC_STATES.REVIEW)
})
