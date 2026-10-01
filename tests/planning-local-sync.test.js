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
  recordPlanningOperationFailure,
  resolvePlanningConflict,
  savePlanningEntityLocally,
} from '../src/data/local/planningIndexedDb.js'
import {
  clearSharedPlanningRepository,
  createPlanningRepository,
  getSharedPlanningRepository,
  withPlanningRemoteContext,
} from '../src/data/planningRepository.js'
import { getPlanningEntityLocation } from '../src/data/planningEntityLocation.js'
import {
  PLANNING_QUOTA_RETRY_DELAY_MS,
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
  createPlanningUnit,
  createPlanningPrivateNote,
  createSessionItem,
  createTimetableSlot,
  createTimetableVersion,
} from '../src/domain/planning/model.js'
import { PLANNING_ENTITY_TYPES } from '../src/domain/planning/constants.js'
import { buildActivitySessionReflow } from '../src/domain/planning/scheduler.js'

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

test.beforeEach(async () => {
  clearSharedPlanningRepository()
  await deleteTestDatabase()
})
test.after(async () => {
  clearSharedPlanningRepository()
  await deleteTestDatabase()
})

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

test('els materials transversals desats sobreviuen una recàrrega de la planificació', async () => {
  const uid = 'teacher-1'
  const unit = createPlanningUnit({
    academicYearId: 'year-2026',
    code: 'UP-01',
    id: 'up-materials-reload',
    level: '2n ESO',
    ownerUid: uid,
    temporalUnitId: 'ut-1',
    title: 'Projecte científic',
    transversalMaterials: [{
      id: 'material-transversal-1',
      kind: 'link',
      label: 'Guia de treball',
      teacherUrl: 'https://example.test/docent',
      url: 'https://example.test/alumnat',
    }],
  }, { now: '2026-09-30T08:00:00.000Z' })

  await savePlanningEntityLocally(uid, unit)

  const reloaded = await loadPlanningScope(uid, 'academicYear:year-2026:planningUnits')
  assert.equal(reloaded.length, 1)
  assert.equal(reloaded[0].transversalMaterials.length, 1)
  assert.equal(reloaded[0].transversalMaterials[0].label, 'Guia de treball')
  assert.equal(reloaded[0].transversalMaterials[0].url, 'https://example.test/alumnat')
  assert.equal((await loadPlanningOutbox(uid))[0].value.transversalMaterials[0].teacherUrl, 'https://example.test/docent')
})

test('els ajustos remots del grup recuperen la ruta completa després de recarregar', async () => {
  const uid = 'teacher-1'
  const override = {
    activityId: 'activity-1',
    applicationId: 'application-1',
    changeScope: 'groupOnly',
    changes: { manuallyCompleted: true },
    createdAt: '2026-09-26T17:41:00.000Z',
    entityType: PLANNING_ENTITY_TYPES.ACTIVITY_OVERRIDE,
    id: 'override-1',
    ownerUid: uid,
    proposalStatus: 'none',
    schemaVersion: 1,
    updatedAt: '2026-09-26T17:41:00.000Z',
  }
  const repository = createPlanningRepository({ uid })
  const result = await repository.loadScope(
    'application:application-1:overrides',
    async () => withPlanningRemoteContext([override], {
      applicationId: 'application-1',
      planningUnitId: 'up-1',
    }),
    { completeSnapshot: true },
  )

  assert.equal(result.error, undefined)
  assert.equal(result.source, 'remote')
  assert.equal(result.entities.length, 1)
  assert.equal(result.entities[0].changes.manuallyCompleted, true)
  assert.equal((await loadPlanningScope(uid, 'application:application-1:overrides')).length, 1)
})

test('les sessions remotes i el seu detall recuperen la ruta completa sense duplicar la UP als documents', async () => {
  const uid = 'teacher-1'
  const now = '2026-09-30T18:00:00.000Z'
  const session = createCalendarSession({
    applicationId: 'application-1',
    classId: 'class-sg',
    durationMinutes: 60,
    id: 'session-sg-1',
    ownerUid: uid,
    startsAt: '2026-10-01T09:00:00',
  }, { now })
  const item = createSessionItem({
    applicationId: 'application-1',
    id: 'item-sg-1',
    order: 0,
    ownerUid: uid,
    plannedMinutes: 50,
    sessionId: session.id,
    sourceActivityId: 'activity-1',
    title: 'Activitat de SG',
    type: 'activity',
  }, { now })
  const result = createActivityResult({
    applicationId: 'application-1',
    id: 'result-sg-1',
    ownerUid: uid,
    sessionId: session.id,
    sessionItemId: item.id,
    status: 'completed',
  }, { now })
  const repository = createPlanningRepository({ uid })

  const sessionLoad = await repository.loadScope(
    'application:application-1:sessions',
    async () => withPlanningRemoteContext([session], {
      applicationId: 'application-1',
      planningUnitId: 'up-sg',
    }),
    { completeSnapshot: true },
  )
  const detailLoad = await repository.loadScope(
    `session:${session.id}:detail`,
    async () => withPlanningRemoteContext([item, result], {
      applicationId: 'application-1',
      planningUnitId: 'up-sg',
      sessionId: session.id,
    }),
    { completeSnapshot: true },
  )

  assert.equal(sessionLoad.error, undefined)
  assert.equal(sessionLoad.entities[0].id, session.id)
  assert.equal(detailLoad.error, undefined)
  assert.deepEqual(detailLoad.entities.map((entity) => entity.id).sort(), [item.id, result.id].sort())
  assert.equal((await loadPlanningScope(uid, 'application:application-1:sessions')).length, 1)
  assert.equal((await loadPlanningScope(uid, `session:${session.id}:detail`)).length, 2)
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

test('una quota esgotada protegeix el canvi local i atura els reintents fins al moment segur', async () => {
  await savePlanningEntityLocally('teacher-1', academicYear('teacher-1'))
  const now = Date.now()
  let calls = 0
  const quotaError = Object.assign(new Error('Quota exceeded.'), { code: 'firestore/resource-exhausted' })
  const firstSummary = await flushPlanningOutbox('teacher-1', async () => {
    calls += 1
    throw quotaError
  }, { now })

  assert.equal(calls, 1)
  assert.equal(firstSummary.state, PLANNING_SYNC_STATES.PENDING)
  assert.equal(firstSummary.label, 'Desat al dispositiu')
  assert.equal(firstSummary.errorKind, 'quota')
  assert.equal((await loadPlanningOutbox('teacher-1')).length, 1)

  await flushPlanningOutbox('teacher-1', async () => {
    calls += 1
  }, { now: now + 1000 })
  assert.equal(calls, 1)

  const finalSummary = await flushPlanningOutbox('teacher-1', async () => {
    calls += 1
    return { applied: true }
  }, { now: now + PLANNING_QUOTA_RETRY_DELAY_MS + 1 })
  assert.equal(calls, 2)
  assert.equal(finalSummary.state, PLANNING_SYNC_STATES.SAVED)
  assert.equal((await loadPlanningOutbox('teacher-1')).length, 0)
})

test('una nova edició conserva la pausa de quota i no força una altra lectura remota', async () => {
  await savePlanningEntityLocally('teacher-1', academicYear('teacher-1'))
  const retryAt = new Date(Date.now() + PLANNING_QUOTA_RETRY_DELAY_MS).toISOString()
  const [operation] = await loadPlanningOutbox('teacher-1')
  await recordPlanningOperationFailure(
    operation,
    Object.assign(new Error('Quota exceeded.'), { code: 'firestore/resource-exhausted' }),
    { retryAt },
  )
  await savePlanningEntityLocally('teacher-1', academicYear('teacher-1', { label: 'Canvi protegit' }))

  const [pending] = await loadPlanningOutbox('teacher-1')
  assert.equal(pending.retryAt, retryAt)
  assert.equal(pending.value.label, 'Canvi protegit')
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

test('Agenda i Programació comparteixen les consultes simultànies del mateix àmbit', async () => {
  let remoteLoads = 0
  const repositoryFromAgenda = getSharedPlanningRepository({
    applyRemoteOperation: async () => ({ applied: true }),
    isOnline: () => true,
    uid: 'teacher-1',
  })
  const repositoryFromPlanning = getSharedPlanningRepository({
    applyRemoteOperation: async () => ({ applied: true }),
    isOnline: () => true,
    uid: 'teacher-1',
  })
  const loadRemote = async () => {
    remoteLoads += 1
    await new Promise((resolve) => setTimeout(resolve, 5))
    return [academicYear('teacher-1')]
  }

  const [agendaResult, planningResult] = await Promise.all([
    repositoryFromAgenda.loadScope('academicYears', loadRemote, { completeSnapshot: true }),
    repositoryFromPlanning.loadScope('academicYears', loadRemote, { completeSnapshot: true }),
  ])

  assert.equal(repositoryFromAgenda, repositoryFromPlanning)
  assert.equal(remoteLoads, 1)
  assert.deepEqual(new Set([agendaResult.source, planningResult.source]), new Set(['remote', 'shared']))
  assert.equal(agendaResult.entities.length, 1)
  assert.equal(planningResult.entities.length, 1)
})

test('una validació recent s’aprofita fins que hi ha una edició local', async () => {
  let remoteLoads = 0
  let remoteYear = academicYear('teacher-1')
  const repository = getSharedPlanningRepository({
    applyRemoteOperation: async () => ({ applied: true }),
    isOnline: () => true,
    uid: 'teacher-1',
  })
  const loadRemote = async () => {
    remoteLoads += 1
    return [remoteYear]
  }

  await repository.loadScope('academicYears', loadRemote, { completeSnapshot: true })
  const recent = await repository.loadScope('academicYears', loadRemote, { completeSnapshot: true })
  remoteYear = academicYear('teacher-1', {
    label: 'Curs actualitzat',
    updatedAt: '2026-09-18T09:00:00.000Z',
  })
  await repository.save(remoteYear)
  await repository.loadScope('academicYears', loadRemote, { completeSnapshot: true })

  assert.equal(recent.source, 'memory')
  assert.equal(remoteLoads, 2)
})

test('carregar una setmana no elimina les sessions de novembre de la còpia local', async () => {
  const uid = 'teacher-1'
  const scope = 'application:application-1:sessions'
  const session = (id, startsAt) => createCalendarSession({
    id, startsAt, ownerUid: uid, applicationId: 'application-1', classId: 'class-1', durationMinutes: 60,
  }, { now: '2026-10-01T10:00:00.000Z' })
  const october = session('october', '2026-10-02T08:30:00')
  const november = session('november', '2026-11-06T08:30:00')
  const descriptors = (sessions) => withPlanningRemoteContext(sessions, {
    applicationId: 'application-1', planningUnitId: 'up-1',
  })
  await mergePlanningRemoteScope(uid, scope, descriptors([october, november]))
  await mergePlanningRemoteScope(uid, scope, descriptors([october]), {
    completeSnapshot: true,
    snapshotRange: { field: 'startsAt', from: '2026-10-01T00:00:00', to: '2026-10-08T23:59:59' },
  })

  assert.deepEqual((await loadPlanningScope(uid, scope)).map((entry) => entry.id).sort(), ['november', 'october'])
  assert.equal((await loadPlanningOutbox(uid)).length, 0)
})

test('la consulta de tota la UT no reutilitza la resposta fresca de només una setmana', async () => {
  const uid = 'teacher-1'
  const scope = 'application:application-1:sessions'
  const repository = createPlanningRepository({ uid, freshForMs: 30_000 })
  const session = (id, startsAt) => createCalendarSession({
    id, startsAt, ownerUid: uid, applicationId: 'application-1', classId: 'class-1', durationMinutes: 60,
  }, { now: '2026-10-01T10:00:00.000Z' })
  const october = session('october', '2026-10-02T08:30:00')
  const november = session('november', '2026-11-06T08:30:00')
  const descriptors = (sessions) => withPlanningRemoteContext(sessions, {
    applicationId: 'application-1', planningUnitId: 'up-1',
  })
  let fullLoads = 0
  await repository.loadScope(scope, async () => descriptors([october]), {
    completeSnapshot: true,
    snapshotRange: { field: 'startsAt', from: '2026-10-01T00:00:00', to: '2026-10-08T23:59:59' },
  })
  const result = await repository.loadScope(scope, async () => {
    fullLoads += 1
    return descriptors([october, november])
  }, {
    completeSnapshot: true,
    snapshotRange: { field: 'startsAt', from: '2026-09-01T00:00:00', to: '2026-11-30T23:59:59' },
  })

  assert.equal(fullLoads, 1)
  assert.equal(result.entities.length, 2)
})

test('un rang complet reconcilia baixes només dins del rang i la lectura offline no inclou altres setmanes', async () => {
  const uid = 'teacher-1'
  const scope = 'application:application-1:sessions'
  const context = { applicationId: 'application-1', planningUnitId: 'up-1' }
  const makeSession = (id, startsAt) => createCalendarSession({
    id, startsAt, ownerUid: uid, applicationId: context.applicationId, classId: 'class-1', durationMinutes: 60,
  })
  const october = makeSession('october', '2026-10-02T08:30:00')
  const november = makeSession('november', '2026-11-06T08:30:00')
  await mergePlanningRemoteScope(uid, scope, withPlanningRemoteContext([october, november], context))
  await savePlanningEntityLocally(uid, { ...november, durationMinutes: 90 }, context)
  const options = {
    completeSnapshot: true,
    snapshotRange: { field: 'startsAt', from: '2026-10-01T00:00:00', to: '2026-10-08T23:59:59' },
  }
  await mergePlanningRemoteScope(uid, scope, [], options)
  const rows = await loadPlanningScope(uid, scope)
  assert.deepEqual(rows.map((session) => session.id), ['november'])
  assert.equal(rows[0].durationMinutes, 90)
  assert.equal((await loadPlanningOutbox(uid)).length, 1)
  assert.equal((await loadPlanningConflicts(uid)).length, 0)
  const repository = createPlanningRepository({ uid, isOnline: () => false })
  assert.equal((await repository.loadScope(scope, null, options)).entities.length, 0)
})

test('dues consultes simultànies amb rangs diferents no comparteixen una resposta incompleta', async () => {
  const uid = 'teacher-1'
  const scope = 'application:application-1:sessions'
  const repository = createPlanningRepository({ uid, freshForMs: 30_000 })
  let unblockWeek
  const waitingWeek = new Promise((resolve) => { unblockWeek = resolve })
  let weekStarted
  const started = new Promise((resolve) => { weekStarted = resolve })
  const week = repository.loadScope(scope, async () => {
    weekStarted()
    await waitingWeek
    return []
  }, {
    completeSnapshot: true,
    snapshotRange: { field: 'startsAt', from: '2026-10-01', to: '2026-10-08' },
  })
  await started
  const november = createCalendarSession({
    id: 'november', startsAt: '2026-11-06T08:30:00', ownerUid: uid,
    applicationId: 'application-1', classId: 'class-1', durationMinutes: 60,
  })
  const full = await repository.loadScope(scope, async () => withPlanningRemoteContext([november], {
    applicationId: 'application-1', planningUnitId: 'up-1',
  }), {
    completeSnapshot: true,
    snapshotRange: { field: 'startsAt', from: '2026-09-01', to: '2026-11-30' },
  })
  unblockWeek()
  await week

  assert.equal(full.entities.length, 1)
  assert.equal((await loadPlanningScope(uid, scope))[0].id, 'november')
})

test('tres reinicis amb una setmana de tres sessions conserven les quinze sessions i els seus ids al servidor', async () => {
  const uid = 'teacher-1'
  const now = '2026-10-01T10:00:00.000Z'
  const application = createGroupApplication({
    id: 'application-1', ownerUid: uid, classId: 'class-1', planningUnitId: 'up-1', academicYearId: 'year-1',
  }, { now })
  const context = { applicationId: application.id, planningUnitId: 'up-1' }
  const scope = `application:${application.id}:sessions`
  const remoteDocuments = new Map()
  const makeRepository = () => createPlanningRepository({
    uid, freshForMs: 30_000, isOnline: () => true,
    applyRemoteOperation: async (operation) => {
      if (operation.operation === 'delete') remoteDocuments.delete(operation.path)
      else remoteDocuments.set(operation.path, operation.value)
      return { applied: true }
    },
  })
  const candidates = [
    '2026-10-06T11:00:00', '2026-10-08T09:30:00', '2026-10-08T11:00:00',
    '2026-10-13T11:00:00', '2026-10-15T09:30:00', '2026-10-15T11:00:00',
    '2026-10-20T11:00:00', '2026-10-22T09:30:00', '2026-10-22T11:00:00',
    '2026-10-27T11:00:00', '2026-10-29T09:30:00', '2026-10-29T11:00:00',
    '2026-11-03T11:00:00', '2026-11-05T09:30:00', '2026-11-05T11:00:00',
  ].map((startsAt) => ({ startsAt, date: startsAt.slice(0, 10), durationMinutes: 60 }))
  const activities = candidates.map((_, index) => ({
    id: `activity-${index}`, title: `Activitat ${index}`, plannedMinutes: 55, type: 'activity',
  }))
  const savePreview = async (repository, preview) => {
    for (const item of preview.removedItems) await repository.remove(item, { ...context, sessionId: item.sessionId })
    for (const session of preview.removedSessions) await repository.remove(session, context)
    for (const bundle of preview.sessions) {
      await repository.save(bundle.session, context)
      for (const item of bundle.items) await repository.save(item, { ...context, sessionId: bundle.session.id })
    }
    assert.equal((await repository.synchronize()).state, PLANNING_SYNC_STATES.SAVED)
  }
  const input = { application, activities, candidates, fromDate: '2026-10-01', options: { now } }
  const initial = buildActivitySessionReflow(input)
  await savePreview(makeRepository(), initial)
  const initialIds = initial.sessions.map((bundle) => bundle.session.id).sort()
  for (let restart = 0; restart < 3; restart += 1) {
    const repository = makeRepository()
    const readRange = (from, to) => repository.loadScope(scope, async () => withPlanningRemoteContext(
      [...remoteDocuments.values()].filter((entity) => entity.entityType === PLANNING_ENTITY_TYPES.CALENDAR_SESSION
        && entity.startsAt >= from && entity.startsAt <= to), context,
    ), { completeSnapshot: true, snapshotRange: { field: 'startsAt', from, to } })
    assert.equal((await readRange('2026-10-01T00:00:00', '2026-10-08T23:59:59')).entities.length, 3)
    const full = await readRange('2026-09-01T00:00:00', '2027-06-30T23:59:59')
    assert.equal(full.entities.length, 15)
    const bundles = await Promise.all(full.entities.map(async (session) => ({
      session, results: [],
      items: (await repository.loadScope(`session:${session.id}:detail`)).entities
        .filter((entity) => entity.entityType === PLANNING_ENTITY_TYPES.SESSION_ITEM),
    })))
    const repeated = buildActivitySessionReflow({ ...input, existingSessionBundles: bundles })
    assert.deepEqual(repeated.sessions.map((bundle) => bundle.session.id).sort(), initialIds)
    assert.equal(repeated.sessions.flatMap((bundle) => bundle.items).reduce((sum, item) => sum + item.plannedMinutes, 0), 825)
    await savePreview(repository, repeated)
    assert.equal([...remoteDocuments.values()].filter((entity) => entity.entityType === PLANNING_ENTITY_TYPES.CALENDAR_SESSION).length, 15)
    assert.equal((await loadPlanningOutbox(uid)).length, 0)
    assert.equal((await loadPlanningConflicts(uid)).length, 0)
  }
})

test('una actualització entre dispositius força Firebase encara que la còpia recent sigui vigent', async () => {
  let remoteLoads = 0
  let remoteYear = academicYear('teacher-1')
  const repository = getSharedPlanningRepository({
    applyRemoteOperation: async () => ({ applied: true }),
    isOnline: () => true,
    uid: 'teacher-1',
  })
  const loadRemote = async () => {
    remoteLoads += 1
    return [remoteYear]
  }

  await repository.loadScope('academicYears', loadRemote, { completeSnapshot: true, refreshToken: 0 })
  remoteYear = academicYear('teacher-1', {
    label: 'Canvi fet a l’altre dispositiu',
    updatedAt: '2026-09-18T10:00:00.000Z',
  })
  const cached = await repository.loadScope('academicYears', loadRemote, {
    completeSnapshot: true,
    refreshToken: 0,
  })
  const refreshed = await repository.loadScope('academicYears', loadRemote, {
    completeSnapshot: true,
    refreshToken: 1,
  })
  const deduplicated = await repository.loadScope('academicYears', loadRemote, {
    completeSnapshot: true,
    refreshToken: 1,
  })

  assert.equal(cached.entities[0].label, '2026-2027')
  assert.equal(refreshed.entities[0].label, 'Canvi fet a l’altre dispositiu')
  assert.equal(deduplicated.source, 'memory')
  assert.equal(remoteLoads, 2)
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
