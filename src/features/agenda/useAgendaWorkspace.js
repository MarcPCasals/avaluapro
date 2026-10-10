import { saveCalendarEventWithAutomaticReflow } from './agendaCancellation.js'
import { getNoClassCalendarEvent } from '../../lib/agendaCalendar.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  applyPlanningCloudOperation,
  loadPlanningAcademicYears,
  loadOwnedPlanningUnits,
  loadPlanningActivityOverrides,
  loadPlanningApplications,
  loadPlanningCalendarEvents,
  loadPlanningPrivateNotes,
  loadPlanningSessionDetail,
  loadPlanningSessions,
  loadPlanningTemporalUnits,
  loadPlanningTimetables,
  loadPlanningTimetableSlots,
  loadPlanningUnitStructure,
  loadSharedPlanningUnits,
} from '../../data/cloud/planningFirestore'
import { getSharedPlanningRepository, withPlanningRemoteContext } from '../../data/planningRepository'
import {
  loadPlanningConflicts,
  resolvePlanningConflict,
} from '../../data/local/planningIndexedDb'
import { PLANNING_SYNC_LABELS, PLANNING_SYNC_STATES } from '../../data/sync/planningSync'
import { getAgendaSessionItemRemovalState } from '../../lib/agendaToday'
import { CROSS_DEVICE_REFRESH_EVENT } from '../../lib/crossDeviceRefresh'
import {
  buildSchedulingPersistenceEntries,
  requireConfirmedSchedulingSync,
  selectCurrentPlanningApplicationRecords,
} from './agendaSchedulingPersistence'
import {
  copyTimetableVersionStructure,
  buildAgendaContinuationReflow,
  getSessionActivityChoices,
  buildSessionActivityAddition,
  buildOwnSessionActivityChange,
  buildSessionActivityInPlaceChange,
  buildSessionActivityPinChanges,
  isFixedAgendaItem,
  buildAgendaItemChangeReflow,
  buildAgendaRecoveryReflow,
  buildAgendaSessionReplacement,
  getAgendaReplacementActivityOptions,
  buildAgendaSessionCompaction,
  buildAgendaOwnActivityInsertion,
  buildActivitySessionDistribution,
  buildActivitySessionReflow,
  buildTimetableSessionCandidates,
  getClassPlanningSubjects,
  getSchedulingSubject,
  resolvePlanningSubject,
  sessionMatchesPlanningSubject,
  applyPlanningActivityOverrides,
  createAcademicYear,
  createActivityResult,
  createCalendarEvent,
  createCalendarSession,
  createGroupApplication,
  createGroupActivityOverride,
  getAgendaActivityMinutesById,
  createPlanningActivity,
  buildSessionNoteChange,
  getTimetableSessionNoteId,
  createTemporalUnit,
  createTimetableSlot,
  isBabeliumItem,
  isUnperformedNoClassBundle,
  withBabelium,
  createTimetableVersion,
  findTimetableSlotConflicts,
  getManuallyCompletedActivityIds,
  getSessionCandidateKey,
  moveTimetableSlot,
  moveAgendaSessionItem,
  orderActivitiesForScheduling,
  reserveLastLogicalSessionCandidates,
  reconcileSessionOccurrences,
  resolveSchedulingStartDate,
  selectEffectiveTimetable,
  summarizeAssignedActivityProgress,
  summarizeCompletedActivityIds,
  summarizeUnscheduledPlanningActivities,
} from '../../domain/planning'

const EMPTY_SYNC = {
  conflictCount: 0,
  label: PLANNING_SYNC_LABELS[PLANNING_SYNC_STATES.SAVED],
  pendingCount: 0,
  state: PLANNING_SYNC_STATES.SAVED,
}

function replaceById(items, nextItem) {
  return items.some((item) => item.id === nextItem.id)
    ? items.map((item) => item.id === nextItem.id ? nextItem : item)
    : [...items, nextItem]
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function previousDate(dateKey) {
  const date = new Date(`${dateKey}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

function sortTimetables(items) {
  return [...items].sort((left, right) => right.effectiveFrom.localeCompare(left.effectiveFrom))
}

function sortSlots(items) {
  return [...items].sort((left, right) => left.weekday - right.weekday || left.startsAt.localeCompare(right.startsAt))
}

function sortEvents(items) {
  return [...items].sort((left, right) => left.startsOn.localeCompare(right.startsOn))
}

function mergeSessionBundles(current, incoming) {
  return reconcileSessionOccurrences(
    [...new Map([...current, ...incoming].map((bundle) => [bundle.session.id, bundle])).values()],
  ).bundles
}


/**
 * Aïlla les dades privades d'Agenda de la pantalla. Horaris, franges i
 * excepcions passen pel mateix repositori local-first que Programació, però es
 * carreguen només per al curs i la versió que el docent ha obert.
 */
export function useAgendaWorkspace(user, classes = []) {
  const [academicYears, setAcademicYears] = useState([])
  const [timetables, setTimetables] = useState([])
  const [slots, setSlots] = useState([])
  const [slotsByTimetableId, setSlotsByTimetableId] = useState({})
  const [calendarEvents, setCalendarEvents] = useState([])
  const [planningUnits, setPlanningUnits] = useState([])
  const [sharedPlanningUnits, setSharedPlanningUnits] = useState([])
  const [sharedClasses, setSharedClasses] = useState([])
  const [temporalUnits, setTemporalUnits] = useState([])
  const [sessionBundles, setSessionBundles] = useState([])
  const [sessionPrivateNotes, setSessionPrivateNotes] = useState({})
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const sessionRangeRequest = useRef(0)
  const [activeAcademicYearId, setActiveAcademicYearId] = useState('')
  const [activeTimetableId, setActiveTimetableId] = useState('')
  const [loading, setLoading] = useState(true)
  const [sharedLoading, setSharedLoading] = useState(true)
  const [error, setError] = useState('')
  const [sync, setSync] = useState(EMPTY_SYNC)
  const [refreshRevision, setRefreshRevision] = useState(0)
  const [isOnline, setIsOnline] = useState(() => globalThis.navigator?.onLine !== false)
  const today = localDateKey()
  const repository = useMemo(() => user?.uid
    ? getSharedPlanningRepository({
        applyRemoteOperation: applyPlanningCloudOperation,
        uid: user.uid,
        isOnline: () => globalThis.navigator?.onLine !== false,
      })
    : null, [user])

  const activeAcademicYear = academicYears.find((item) => item.id === activeAcademicYearId) || null
  const activeTimetable = timetables.find((item) => item.id === activeTimetableId) || null
  const userEmail = String(user?.email || '').trim().toLowerCase()
  const allPlanningUnits = useMemo(() => Array.from(new Map(
    [...planningUnits, ...sharedPlanningUnits].map((unit) => [unit.id, unit]),
  ).values()), [planningUnits, sharedPlanningUnits])

  const refreshSync = useCallback(async (options = {}) => {
    if (!repository) return EMPTY_SYNC
    const summary = await repository.status(options)
    setSync(summary)
    return summary
  }, [repository])

  const synchronize = useCallback(async () => {
    if (!repository) return EMPTY_SYNC
    setSync((current) => ({ ...current, label: PLANNING_SYNC_LABELS.saving, state: 'saving' }))
    const summary = await repository.synchronize()
    setSync(summary)
    return summary
  }, [repository])

  const refreshFromCloud = useCallback(async () => {
    if (!repository) return EMPTY_SYNC
    const summary = await synchronize()
    setRefreshRevision((current) => current + 1)
    return summary
  }, [repository, synchronize])

  const resolveConflicts = useCallback(async (strategy) => {
    if (!repository || !user?.uid) return EMPTY_SYNC
    const conflicts = await loadPlanningConflicts(user.uid)
    for (const conflict of conflicts) {
      await resolvePlanningConflict(user.uid, conflict.path, strategy)
    }
    const summary = strategy === 'local'
      ? await repository.synchronize()
      : await repository.status()
    setSync(summary)
    setRefreshRevision((current) => current + 1)
    return summary
  }, [repository, user])

  const persist = useCallback(async (entries) => {
    if (!repository) throw new Error('Cal iniciar sessió abans de desar l’Agenda.')
    for (const entry of Array.isArray(entries) ? entries : [entries]) {
      await repository.save(entry.entity || entry, entry.context || {})
    }
    await refreshSync()
    return synchronize()
  }, [refreshSync, repository, synchronize])

  const remove = useCallback(async (entity) => {
    if (!repository) throw new Error('Cal iniciar sessió abans de modificar l’Agenda.')
    await repository.remove(entity)
    await refreshSync()
    return synchronize()
  }, [refreshSync, repository, synchronize])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    globalThis.addEventListener?.('online', handleOnline)
    globalThis.addEventListener?.('offline', handleOffline)
    return () => {
      globalThis.removeEventListener?.('online', handleOnline)
      globalThis.removeEventListener?.('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (!repository) return
    if (!isOnline) {
      repository.status({ isOnline }).then(setSync)
      return
    }
    repository.synchronize().then(setSync).catch(() => refreshSync({ error: 'planning/sync-error' }))
  }, [isOnline, refreshSync, repository])

  useEffect(() => {
    if (!repository) return undefined
    const handleCrossDeviceRefresh = () => {
      refreshFromCloud().catch(() => refreshSync({ error: 'planning/sync-error' }))
    }
    globalThis.addEventListener?.(CROSS_DEVICE_REFRESH_EVENT, handleCrossDeviceRefresh)
    return () => globalThis.removeEventListener?.(CROSS_DEVICE_REFRESH_EVENT, handleCrossDeviceRefresh)
  }, [refreshFromCloud, refreshSync, repository])

  useEffect(() => {
    let cancelled = false
    if (!repository || !user?.uid) return undefined
    queueMicrotask(() => !cancelled && setLoading(true))
    repository.loadScope(
      'academicYears',
      () => loadPlanningAcademicYears(user.uid),
      { completeSnapshot: true, refreshToken: refreshRevision },
    )
      .then((result) => {
        if (cancelled) return
        const years = [...result.entities].sort((left, right) => right.startsOn.localeCompare(left.startsOn))
        setAcademicYears(years)
        setActiveAcademicYearId((current) => years.some((year) => year.id === current)
          ? current
          : years.find((year) => year.startsOn <= today && year.endsOn >= today)?.id || years[0]?.id || '')
        if (result.error) setError('S’ha carregat la còpia local perquè Firebase no ha respost.')
      })
      .catch((loadError) => !cancelled && setError(loadError.message || 'No s’han pogut carregar els cursos.'))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [refreshRevision, repository, today, user])

  useEffect(() => {
    let cancelled = false
    if (!repository || !user?.uid || !activeAcademicYear) {
      queueMicrotask(() => {
        if (cancelled) return
        setTimetables([])
        setCalendarEvents([])
        setPlanningUnits([])
        setTemporalUnits([])
        setActiveTimetableId('')
      })
      return undefined
    }
    queueMicrotask(() => !cancelled && setLoading(true))
    Promise.all([
      repository.loadScope(
        `academicYear:${activeAcademicYear.id}:planningTimetables`,
        () => loadPlanningTimetables(user.uid, activeAcademicYear.id),
        { completeSnapshot: true, refreshToken: refreshRevision },
      ),
      repository.loadScope(
        `academicYear:${activeAcademicYear.id}:planningCalendarEvents`,
        () => loadPlanningCalendarEvents(
          user.uid,
          activeAcademicYear.id,
          activeAcademicYear.startsOn,
          activeAcademicYear.endsOn,
        ),
        { completeSnapshot: true, refreshToken: refreshRevision },
      ),
      repository.loadScope(
        `academicYear:${activeAcademicYear.id}:planningUnits`,
        () => loadOwnedPlanningUnits(user.uid, { academicYearId: activeAcademicYear.id }),
        { completeSnapshot: true, refreshToken: refreshRevision },
      ),
      repository.loadScope(
        `academicYear:${activeAcademicYear.id}:planningTemporalUnits`,
        () => loadPlanningTemporalUnits(user.uid, activeAcademicYear.id),
        { completeSnapshot: true, refreshToken: refreshRevision },
      ),
    ]).then(([timetableResult, eventResult, unitResult, temporalUnitResult]) => {
      if (cancelled) return
      const nextTimetables = sortTimetables(timetableResult.entities)
      setTimetables(nextTimetables)
      setCalendarEvents(sortEvents(eventResult.entities))
      setPlanningUnits([...unitResult.entities].sort((left, right) =>
        String(right.updatedAt).localeCompare(String(left.updatedAt))))
      setTemporalUnits([...temporalUnitResult.entities].sort((left, right) =>
        String(left.startsOn).localeCompare(String(right.startsOn))))
      setActiveTimetableId((current) => nextTimetables.some((item) => item.id === current)
        ? current
        : selectEffectiveTimetable(nextTimetables, today)?.id || nextTimetables[0]?.id || '')
      if (timetableResult.error || eventResult.error || unitResult.error || temporalUnitResult.error) {
        setError('S’han carregat dades locals perquè Firebase no ha respost.')
      }
    }).catch((loadError) => !cancelled && setError(loadError.message || 'No s’ha pogut obrir l’Agenda del curs.'))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [activeAcademicYear, refreshRevision, repository, today, user?.uid])

  /**
   * L'Agenda també pot iniciar el curs acadèmic. Això evita obligar un docent
   * nou a descobrir Programació abans de poder configurar el seu horari.
   */
  const createYear = useCallback(async (values) => {
    const year = createAcademicYear({ ...values, ownerUid: user.uid })
    await persist(year)
    setAcademicYears((items) => [...items, year]
      .sort((left, right) => right.startsOn.localeCompare(left.startsOn)))
    setActiveAcademicYearId(year.id)
    return year
  }, [persist, user])

  useEffect(() => {
    let cancelled = false
    if (!repository || !userEmail) {
      queueMicrotask(() => {
        if (cancelled) return
        setSharedClasses([])
        setSharedLoading(false)
      })
      return () => { cancelled = true }
    }
    queueMicrotask(() => !cancelled && setSharedLoading(true))
    repository.loadScope(
      `sharedAgendaPlanningUnits:${userEmail}`,
      () => loadSharedPlanningUnits(userEmail, { maxItems: 100 }),
      { completeSnapshot: true, refreshToken: refreshRevision },
    ).then(async (result) => {
      if (cancelled) return
      const sharedUnits = result.entities
        .filter((unit) => unit.ownerUid !== user?.uid)
        .filter((unit) => ['planningAgendaEditor', 'tutoringCollaborator']
          .includes(unit.accessByEmail?.[userEmail]?.role))
        .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
      setSharedPlanningUnits(sharedUnits)
      const classEntries = await Promise.all(sharedUnits.flatMap((unit) => {
        const role = unit.accessByEmail?.[userEmail]?.role
        if (role === 'tutoringCollaborator') {
          return [repository.loadScope(
            `planningUnit:${unit.id}:applications:manager:${user.uid}`,
            () => loadPlanningApplications(unit.id, undefined, 100, user.uid),
            { completeSnapshot: true, refreshToken: refreshRevision },
          ).then((applicationResult) => applicationResult.entities.map((application) => ({
            id: application.classId,
            name: application.classLabel || classes.find((item) => item.id === application.classId)?.name || 'Tutoria',
          })))]
        }
        return (unit.accessByEmail?.[userEmail]?.classIds || []).map(async (classId) => {
          const applicationResult = await repository.loadScope(
            `planningUnit:${unit.id}:applications:${classId}`,
            () => loadPlanningApplications(unit.id, classId, 20),
            { completeSnapshot: true, refreshToken: refreshRevision },
          )
          const application = applicationResult.entities.find((item) => item.classId === classId)
          return {
            id: classId,
            name: application?.classLabel || classes.find((item) => item.id === classId)?.name || 'Grup compartit',
          }
        })
      }))
      if (!cancelled) {
        setSharedClasses(Array.from(new Map(classEntries.flat().map((item) => [item.id, item])).values()))
      }
      if (result.error && result.entities.length === 0) {
        setError('No s’han pogut comprovar les Agendes compartides amb tu.')
      }
    }).catch((loadError) => !cancelled && setError(loadError.message || 'No s’han pogut carregar les Agendes compartides.'))
      .finally(() => !cancelled && setSharedLoading(false))
    return () => { cancelled = true }
  }, [classes, refreshRevision, repository, user?.uid, userEmail])

  useEffect(() => {
    let cancelled = false
    if (!repository || !user?.uid || !activeTimetableId) {
      queueMicrotask(() => !cancelled && setSlots([]))
      return undefined
    }
    repository.loadScope(
      `timetable:${activeTimetableId}:slots`,
      () => loadPlanningTimetableSlots(user.uid, activeTimetableId),
      { completeSnapshot: true, refreshToken: refreshRevision },
    ).then((result) => {
      if (cancelled) return
      setSlots(sortSlots(result.entities))
      if (result.error) setError('L’horari mostra la còpia local perquè Firebase no ha respost.')
    }).catch((loadError) => !cancelled && setError(loadError.message || 'No s’han pogut carregar les franges.'))
    return () => { cancelled = true }
  }, [activeTimetableId, refreshRevision, repository, user?.uid])

  useEffect(() => {
    let cancelled = false
    if (!repository || !user?.uid || timetables.length === 0) {
      queueMicrotask(() => !cancelled && setSlotsByTimetableId({}))
      return () => { cancelled = true }
    }
    Promise.all(timetables.map((timetable) => repository.loadScope(
      `timetable:${timetable.id}:slots`,
      () => loadPlanningTimetableSlots(user.uid, timetable.id),
      { completeSnapshot: true, refreshToken: refreshRevision },
    ))).then((results) => {
      if (cancelled) return
      setSlotsByTimetableId(Object.fromEntries(timetables.map((timetable, index) => [
        timetable.id,
        sortSlots(results[index]?.entities || []),
      ])))
    }).catch(() => {
      // La versió activa continua disponible a `slots`; el recompte podrà
      // mostrar-la encara que una versió històrica no s'hagi pogut carregar.
    })
    return () => { cancelled = true }
  }, [refreshRevision, repository, timetables, user?.uid])

  const createTimetable = useCallback(async (values) => {
    if (!activeAcademicYear) throw new Error('Cal seleccionar un curs acadèmic.')
    const now = new Date().toISOString()
    const current = activeTimetable
    const copied = values.copyCurrent && current
      ? copyTimetableVersionStructure(
          { timetableVersion: current, slots },
          { label: values.label, effectiveFrom: values.effectiveFrom, effectiveTo: values.effectiveTo || null },
          { now },
        )
      : {
          timetableVersion: createTimetableVersion({
            ownerUid: user.uid,
            academicYearId: activeAcademicYear.id,
            label: values.label,
            effectiveFrom: values.effectiveFrom,
            effectiveTo: values.effectiveTo || null,
          }, { now }),
          slots: [],
        }
    let closedCurrent = null
    if (values.closeCurrent && current && current.effectiveFrom < copied.timetableVersion.effectiveFrom) {
      const newEnd = previousDate(copied.timetableVersion.effectiveFrom)
      if (!current.effectiveTo || current.effectiveTo > newEnd) {
        closedCurrent = createTimetableVersion({
          ...current,
          effectiveTo: newEnd,
          updatedAt: now,
        }, { now })
      }
    }
    await persist([...(closedCurrent ? [closedCurrent] : []), copied.timetableVersion, ...copied.slots])
    setTimetables((items) => sortTimetables([
      ...items.filter((item) => item.id !== closedCurrent?.id),
      ...(closedCurrent ? [closedCurrent] : []),
      copied.timetableVersion,
    ]))
    setSlots(sortSlots(copied.slots))
    setSlotsByTimetableId((items) => ({ ...items, [copied.timetableVersion.id]: sortSlots(copied.slots) }))
    setActiveTimetableId(copied.timetableVersion.id)
    return copied
  }, [activeAcademicYear, activeTimetable, persist, slots, user])

  const saveTimetable = useCallback(async (current, values) => {
    const now = new Date().toISOString()
    const next = createTimetableVersion({ ...current, ...values, updatedAt: now }, { now })
    await persist(next)
    setTimetables((items) => sortTimetables(replaceById(items, next)))
    return next
  }, [persist])

  const saveSlot = useCallback(async (values, current = null) => {
    if (!activeTimetable) throw new Error('Cal seleccionar una versió de l’horari.')
    const now = new Date().toISOString()
    const next = createTimetableSlot({
      ...(current || {}),
      ...values,
      ownerUid: user.uid,
      timetableVersionId: activeTimetable.id,
      updatedAt: now,
    }, { now })
    // Totes les entrades, inclosos el clic ràpid i el canvi de durada, passen
    // per la mateixa validació abans d'arribar a Firestore.
    if (findTimetableSlotConflicts(slots, next).length > 0) {
      throw new Error('Aquesta franja se solapa amb una altra classe del mateix horari.')
    }
    await persist(next)
    setSlots((items) => sortSlots(replaceById(items, next)))
    return next
  }, [activeTimetable, persist, slots, user])

  const moveSlot = useCallback(async (slot, destination) => {
    const next = moveTimetableSlot(slot, destination, { now: new Date().toISOString() })
    if (findTimetableSlotConflicts(slots, next).length > 0) {
      throw new Error('Aquesta franja se solapa amb una altra classe del mateix horari.')
    }
    await persist(next)
    setSlots((items) => sortSlots(replaceById(items, next)))
    return next
  }, [persist, slots])

  const removeSlot = useCallback(async (slot) => {
    await remove(slot)
    setSlots((items) => items.filter((item) => item.id !== slot.id))
  }, [remove])

  const removeCalendarEvent = useCallback(async (event) => {
    await remove(event)
    setCalendarEvents((items) => items.filter((item) => item.id !== event.id))
  }, [remove])

  const saveTemporalUnit = useCallback(async (current, values) => {
    const temporalUnit = createTemporalUnit({
      ...current,
      ...values,
      updatedAt: new Date().toISOString(),
    })
    await persist(temporalUnit)
    setTemporalUnits((items) => items
      .map((item) => item.id === temporalUnit.id ? temporalUnit : item)
      .sort((left, right) => String(left.startsOn).localeCompare(String(right.startsOn))))
    return temporalUnit
  }, [persist])

  /**
   * Obre només el tram temporal que la vista necessita. Les aplicacions viuen
   * sota cada UP, per això primer es resolen aquestes relacions i després es
   * carreguen les sessions i els seus elements concrets.
   */
  const loadAccessiblePlanningApplications = useCallback(async ({ classId = '', temporalUnitId = '' } = {}) => {
    if (!repository) return []
    const visibleUnits = allPlanningUnits.filter((unit) => (
      unit.status !== 'archived'
      && (!temporalUnitId || unit.temporalUnitId === temporalUnitId)
    ))
    const applicationGroups = await Promise.all(visibleUnits.map(async (unit) => {
      const isOwner = unit.ownerUid === user?.uid
      const role = unit.accessByEmail?.[userEmail]?.role || ''
      if ((!isOwner && role === 'tutoringCollaborator') || (isOwner && unit.tutoringSpaceId)) {
        const result = await repository.loadScope(
          `planningUnit:${unit.id}:applications:manager:${user.uid}`,
          () => loadPlanningApplications(unit.id, undefined, 100, user.uid),
          { completeSnapshot: true, refreshToken: refreshRevision },
        )
        if (result.error) throw result.error
        return result.entities
          .filter((application) => !classId || application.classId === classId)
          .filter((application) => application.status !== 'archived')
          .map((application) => ({ application, planningUnit: unit }))
      }
      const allowedClassIds = isOwner
        ? (classId ? [classId] : [null])
        : (unit.accessByEmail?.[userEmail]?.classIds || []).filter((allowedId) => !classId || allowedId === classId)
      const results = await Promise.all(allowedClassIds.map((allowedClassId) => repository.loadScope(
        `planningUnit:${unit.id}:applications${allowedClassId ? `:${allowedClassId}` : ''}`,
        () => loadPlanningApplications(unit.id, allowedClassId || undefined, 100),
        { completeSnapshot: true, refreshToken: refreshRevision },
      )))
      const failed = results.find((result) => result.error)
      if (failed) throw failed.error
      return results.flatMap((result) => result.entities
        .filter((application) => application.planningUnitId === unit.id)
        .filter((application) => !classId || application.classId === classId)
        .filter((application) => application.status !== 'archived')
        .map((application) => ({ application, planningUnit: unit })))
    }))
    return selectCurrentPlanningApplicationRecords(applicationGroups.flat())
  }, [allPlanningUnits, refreshRevision, repository, user, userEmail])

  const loadSessionRange = useCallback(async ({
    classId = '',
    from,
    includeDetails = true,
    mergeWithExisting = false,
    to,
  }) => {
    if (!repository || !from || !to) return []
    const requestId = ++sessionRangeRequest.current
    setSessionsLoading(true)
    try {
      const applications = await loadAccessiblePlanningApplications({ classId })
      const sessionResults = await Promise.all(applications.map(({ application, planningUnit }) =>
        repository.loadScope(
          `application:${application.id}:sessions`,
          async () => withPlanningRemoteContext(
            await loadPlanningSessions({
              applicationId: application.id,
              from: `${from}T00:00:00`,
              maxItems: 500,
              planningUnitId: planningUnit.id,
              to: `${to}T23:59:59`,
            }),
            { applicationId: application.id, planningUnitId: planningUnit.id },
          ),
          {
            completeSnapshot: true,
            refreshToken: refreshRevision,
            snapshotRange: { field: 'startsAt', from: `${from}T00:00:00`, to: `${to}T23:59:59` },
          },
        )))
      const failedSessionLoad = sessionResults.find((result) => result.error)
      if (failedSessionLoad) throw failedSessionLoad.error
      const sessionRecords = sessionResults.flatMap((result, index) => result.entities
        .filter((session) => String(session.startsAt).slice(0, 10) >= from && String(session.startsAt).slice(0, 10) <= to)
        .filter((session) => !classId || session.classId === classId)
        .map((session) => ({ ...applications[index], session })))
      if (!includeDetails) {
        // Calendari i selectors només necessiten l'encapçalament de
        // sessió. Recuperem els títols que ja existeixin a IndexedDB, però no
        // fem cap consulta remota d'elements, resultats, descripcions o materials.
        const cachedDetails = await Promise.all(sessionRecords.map(({ session }) =>
          repository.loadScope(`session:${session.id}:detail`)))
        const rawBundles = sessionRecords.map((record, index) => ({
          ...record,
          detailsLoaded: false,
          items: cachedDetails[index].entities
            .filter((entity) => entity.entityType === 'sessionItem')
            .sort((left, right) => Number(left.order) - Number(right.order))
            .map((item) => ({ ...item, sourceActivity: null })),
          results: cachedDetails[index].entities
            .filter((entity) => entity.entityType === 'activityResult'),
        })).sort((left, right) => left.session.startsAt.localeCompare(right.session.startsAt))
        const bundles = reconcileSessionOccurrences(rawBundles).bundles
        if (requestId === sessionRangeRequest.current) {
          setSessionBundles((current) => mergeWithExisting ? mergeSessionBundles(current, bundles) : bundles)
        }
        return bundles
      }
      const detailResults = await Promise.all(sessionRecords.map(({ application, planningUnit, session }) =>
        repository.loadScope(
          `session:${session.id}:detail`,
          async () => {
            const detail = await loadPlanningSessionDetail(planningUnit.id, application.id, session.id, { session })
            return withPlanningRemoteContext(
              [detail.session, ...detail.items, ...detail.results],
              { applicationId: application.id, planningUnitId: planningUnit.id, sessionId: session.id },
            )
          },
          { completeSnapshot: true, refreshToken: refreshRevision },
        )))
      const unitIds = [...new Set(sessionRecords.map((record) => record.planningUnit.id))]
      const declaredSourceUnitIds = detailResults.flatMap((result) => result.entities
        .filter((entity) => entity.entityType === 'sessionItem')
        .map((item) => item.sourcePlanningUnitId)
        .filter(Boolean))
      // Els elements nous indiquen la UP font. Això permet carregar només les
      // estructures realment utilitzades, incloses les recuperacions d'una UP
      // anterior, en lloc de rellegir totes les UP pròpies i arxivades.
      const sourceUnitIds = [...new Set([
        ...unitIds,
        ...declaredSourceUnitIds,
      ])]
      const structureResults = await Promise.all(sourceUnitIds.map((planningUnitId) => repository.loadScope(
        `planningUnit:${planningUnitId}:structure`,
        async () => {
          const structure = await loadPlanningUnitStructure(planningUnitId)
          return [structure.planningUnit, ...structure.phases, ...structure.activities]
        },
        { completeSnapshot: true, refreshToken: refreshRevision },
      )))
      // Les recuperacions creades abans de guardar sourcePlanningUnitId poden
      // aprofitar estructures ja presents a la còpia local, sense generar
      // lectures remotes addicionals.
      const legacySourceUnitIds = allPlanningUnits
        .filter((unit) => unit.ownerUid === user?.uid && !sourceUnitIds.includes(unit.id))
        .map((unit) => unit.id)
      const legacyStructureResults = await Promise.all(legacySourceUnitIds.map((planningUnitId) =>
        repository.loadScope(`planningUnit:${planningUnitId}:structure`)))
      const applicationRecords = Array.from(new Map(sessionRecords.map((record) => [
        `${record.planningUnit.id}:${record.application.id}`,
        record,
      ])).values())
      const overrideResults = await Promise.all(applicationRecords.map((record) => repository.loadScope(
        `application:${record.application.id}:overrides`,
        async () => withPlanningRemoteContext(
          await loadPlanningActivityOverrides(record.planningUnit.id, record.application.id),
          { applicationId: record.application.id, planningUnitId: record.planningUnit.id },
        ),
        { completeSnapshot: true, refreshToken: refreshRevision },
      )))
      const baseActivitiesByUnitId = new Map([
        ...sourceUnitIds.map((planningUnitId, index) => [
          planningUnitId,
          structureResults[index].entities.filter((entity) => entity.entityType === 'planningActivity'),
        ]),
        ...legacySourceUnitIds.map((planningUnitId, index) => [
          planningUnitId,
          legacyStructureResults[index].entities.filter((entity) => entity.entityType === 'planningActivity'),
        ]),
      ])
      const sourceActivityById = new Map([...baseActivitiesByUnitId.values()]
        .flat()
        .map((activity) => [activity.id, activity]))
      const activitiesByApplicationKey = new Map(applicationRecords.map((record, index) => [
        `${record.planningUnit.id}:${record.application.id}`,
        new Map(applyPlanningActivityOverrides(
          baseActivitiesByUnitId.get(record.planningUnit.id) || [],
          overrideResults[index].entities,
        ).map((activity) => [activity.id, activity])),
      ]))
      const rawBundles = sessionRecords.map((record, index) => {
        const entities = detailResults[index].entities
        const activityById = activitiesByApplicationKey.get(
          `${record.planningUnit.id}:${record.application.id}`,
        ) || new Map()
        return withBabelium({
          ...record,
          detailsLoaded: true,
          items: entities
            .filter((entity) => entity.entityType === 'sessionItem')
            .sort((left, right) => Number(left.order) - Number(right.order))
            .map((item) => ({
              ...item,
              sourceActivity: activityById.get(item.sourceActivityId)
                || sourceActivityById.get(item.sourceActivityId)
                || null,
            })),
          results: entities.filter((entity) => entity.entityType === 'activityResult'),
        }, Object.values(slotsByTimetableId).flat().find((slot) => slot.id === record.session.timetableSlotId))
      }).sort((left, right) => left.session.startsAt.localeCompare(right.session.startsAt))
      const bundles = reconcileSessionOccurrences(rawBundles).bundles
      if (requestId === sessionRangeRequest.current) {
        setSessionBundles((current) => mergeWithExisting ? mergeSessionBundles(current, bundles) : bundles)
      }
      return bundles
    } finally {
      if (requestId === sessionRangeRequest.current) setSessionsLoading(false)
    }
  }, [allPlanningUnits, loadAccessiblePlanningApplications, refreshRevision, repository, slotsByTimetableId, user?.uid])

  /**
   * Completa una única sessió quan el docent l'obre des del calendari o la
   * cronologia. Les vistes de navegació no necessiten mantenir carregats els
   * resultats, les descripcions i els materials de tot el curs.
   */
  const loadSessionDetails = useCallback(async (bundle) => {
    if (!repository || !bundle?.session?.id) return bundle
    setSessionsLoading(true)
    try {
      const detailResult = await repository.loadScope(
        `session:${bundle.session.id}:detail`,
        async () => {
          const detail = await loadPlanningSessionDetail(
            bundle.planningUnit.id,
            bundle.application.id,
            bundle.session.id,
            { session: bundle.session },
          )
          return withPlanningRemoteContext(
            [detail.session, ...detail.items, ...detail.results],
            {
              applicationId: bundle.application.id,
              planningUnitId: bundle.planningUnit.id,
              sessionId: bundle.session.id,
            },
          )
        },
        { completeSnapshot: true, refreshToken: refreshRevision },
      )
      if (detailResult.error && detailResult.entities.length === 0) {
        throw detailResult.error
      }
      const rawItems = detailResult.entities
        .filter((entity) => entity.entityType === 'sessionItem')
        .sort((left, right) => Number(left.order) - Number(right.order))
      const declaredSourceUnitIds = rawItems.map((item) => item.sourcePlanningUnitId).filter(Boolean)
      const sourceUnitIds = [...new Set([bundle.planningUnit.id, ...declaredSourceUnitIds])]
      const [structureResults, overrideResult] = await Promise.all([
        Promise.all(sourceUnitIds.map((planningUnitId) => repository.loadScope(
          `planningUnit:${planningUnitId}:structure`,
          async () => {
            const structure = await loadPlanningUnitStructure(planningUnitId)
            return [structure.planningUnit, ...structure.phases, ...structure.activities]
          },
          { completeSnapshot: true, refreshToken: refreshRevision },
        ))),
        repository.loadScope(
          `application:${bundle.application.id}:overrides`,
          async () => withPlanningRemoteContext(
            await loadPlanningActivityOverrides(bundle.planningUnit.id, bundle.application.id),
            { applicationId: bundle.application.id, planningUnitId: bundle.planningUnit.id },
          ),
          { completeSnapshot: true, refreshToken: refreshRevision },
        ),
      ])
      const legacySourceUnitIds = allPlanningUnits
        .filter((unit) => unit.ownerUid === user?.uid && !sourceUnitIds.includes(unit.id))
        .map((unit) => unit.id)
      const legacyStructures = await Promise.all(legacySourceUnitIds.map((planningUnitId) =>
        repository.loadScope(`planningUnit:${planningUnitId}:structure`)))
      const baseActivitiesByUnitId = new Map([
        ...sourceUnitIds.map((planningUnitId, index) => [
          planningUnitId,
          structureResults[index].entities.filter((entity) => entity.entityType === 'planningActivity'),
        ]),
        ...legacySourceUnitIds.map((planningUnitId, index) => [
          planningUnitId,
          legacyStructures[index].entities.filter((entity) => entity.entityType === 'planningActivity'),
        ]),
      ])
      const sourceActivityById = new Map([...baseActivitiesByUnitId.values()]
        .flat()
        .map((activity) => [activity.id, activity]))
      const currentActivityById = new Map(applyPlanningActivityOverrides(
        baseActivitiesByUnitId.get(bundle.planningUnit.id) || [],
        overrideResult.entities,
      ).map((activity) => [activity.id, activity]))
      const detailedBundle = withBabelium({
        ...bundle,
        detailsLoaded: true,
        items: rawItems.map((item) => ({
          ...item,
          sourceActivity: currentActivityById.get(item.sourceActivityId)
            || sourceActivityById.get(item.sourceActivityId)
            || null,
        })),
        results: detailResult.entities.filter((entity) => entity.entityType === 'activityResult'),
      }, Object.values(slotsByTimetableId).flat().find((slot) => slot.id === bundle.session.timetableSlotId))
      setSessionBundles((bundles) => bundles.map((current) =>
        current.session.id === detailedBundle.session.id ? detailedBundle : current))
      return detailedBundle
    } finally {
      setSessionsLoading(false)
    }
  }, [allPlanningUnits, refreshRevision, repository, slotsByTimetableId, user?.uid])

  /**
   * La portada d'Agenda només obre el tram necessari per a avui i la setmana
   * següent. El calendari mensual, la cronologia i el selector de recordatoris
   * amplien el rang sota demanda; així entrar a Agenda no descarrega sis
   * setmanes de descripcions, resultats i materials.
   */
  const loadTodaySessions = useCallback(() => {
    const fromDate = new Date(`${today}T12:00:00Z`)
    const weekday = fromDate.getUTCDay() || 7
    fromDate.setUTCDate(fromDate.getUTCDate() - weekday + 1)
    const toDate = new Date(fromDate)
    toDate.setUTCDate(toDate.getUTCDate() + 13)
    return loadSessionRange({
      from: fromDate.toISOString().slice(0, 10),
      includeDetails: true,
      to: toDate.toISOString().slice(0, 10),
    })
  }, [loadSessionRange, today])

  useEffect(() => {
    if (allPlanningUnits.length === 0) {
      queueMicrotask(() => setSessionBundles([]))
    }
  }, [allPlanningUnits.length])

  const persistSessionSnapshot = useCallback(async (bundle, session) => {
    if (!repository) throw new Error('Cal iniciar sessió abans de desar la sessió.')
    for (const item of bundle.removedBabeliumItems || []) {
      await repository.remove(item, {
        planningUnitId: bundle.planningUnit.id,
        applicationId: bundle.application.id,
        sessionId: session.id,
      })
    }
    await persist([
      { entity: session, context: { planningUnitId: bundle.planningUnit.id } },
      ...bundle.items.filter(isBabeliumItem).map((item) => ({
        entity: item,
        context: { planningUnitId: bundle.planningUnit.id, applicationId: bundle.application.id, sessionId: session.id },
      })),
    ])
    setSessionBundles((items) => items.map((item) => item.session.id === session.id
      ? { ...item, items: bundle.items, session } : item))
    return session
  }, [persist, repository])

  const saveSessionClassroomState = useCallback(async (bundle, changes) => {
    const now = new Date().toISOString()
    const session = createCalendarSession({ ...bundle.session, ...changes, updatedAt: now }, { now })
    return persistSessionSnapshot(bundle, session)
  }, [persistSessionSnapshot])

  /**
   * Un resultat és únic per element de sessió. Aturar o revisar el temporitzador
   * actualitza el mateix document, de manera que no duplica mesures reals.
   */
  const saveActivityResult = useCallback(async (bundle, item, changes = {}) => {
    const now = new Date().toISOString()
    const existing = bundle.results.find((result) => result.sessionItemId === item.id)
    const result = createActivityResult({
      ...existing,
      ...changes,
      applicationId: bundle.application.id,
      ownerUid: bundle.session.ownerUid,
      sessionId: bundle.session.id,
      sessionItemId: item.id,
      sourceActivityId: item.sourceActivityId,
      updatedAt: now,
    }, { now })
    if (bundle.standalone) return result
    const entries = [{
      entity: result,
      context: {
        applicationId: bundle.application.id,
        planningUnitId: bundle.planningUnit.id,
        sessionId: bundle.session.id,
      },
    }]
    let updatedSourceActivity = null
    const applicationComment = String(changes.applicationComment || '').trim()
    if (applicationComment && item.sourceActivity) {
      const currentComment = String(item.sourceActivity.applicationComment || '').trim()
      const mergedComment = currentComment && !currentComment.includes(applicationComment)
        ? `${currentComment}\n\n${applicationComment}`
        : applicationComment || currentComment
      updatedSourceActivity = createPlanningActivity({
        ...item.sourceActivity,
        applicationComment: mergedComment,
        updatedAt: now,
      }, { now })
      entries.push({ entity: updatedSourceActivity })
    }
    await persist(entries)
    setSessionBundles((bundles) => bundles.map((current) => current.session.id === bundle.session.id
      ? {
          ...current,
          items: updatedSourceActivity
            ? current.items.map((currentItem) => currentItem.sourceActivityId === updatedSourceActivity.id
              ? { ...currentItem, sourceActivity: updatedSourceActivity }
              : currentItem)
            : current.items,
          results: replaceById(current.results, result),
        }
      : current))
    return result
  }, [persist])

  /** Aplica a la UP, amb confirmació prèvia de Mode aula, el temps real observat. */
  const applyClassroomTimingToPlanning = useCallback(async (bundle, item, actualMinutes) => {
    if (!item?.sourceActivity) throw new Error('No s’ha trobat l’activitat original de la UP.')
    const minutes = Number(actualMinutes)
    if (!Number.isFinite(minutes) || minutes <= 0) throw new Error('El temps real no és vàlid.')
    const now = new Date().toISOString()
    const activity = createPlanningActivity({
      ...item.sourceActivity,
      plannedMinutes: minutes,
      updatedAt: now,
    }, { now })
    await persist(activity)
    setSessionBundles((bundles) => bundles.map((current) => ({
      ...current,
      items: current.items.map((currentItem) => currentItem.sourceActivityId === activity.id
        ? { ...currentItem, sourceActivity: activity }
        : currentItem),
    })))
    return activity
  }, [persist])

  const loadTimelinePrivateNotes = useCallback(async (sessionIds) => {
    if (!repository || !user?.uid) return
    const results = await Promise.all(sessionIds.map((sessionId) => repository.loadScope(
      `session:${sessionId}:privateNotes`,
      () => loadPlanningPrivateNotes(user.uid, { sessionId }),
      { completeSnapshot: true, refreshToken: refreshRevision },
    )))
    const failed = results.find((result) => result.error)
    if (failed) throw failed.error
    setSessionPrivateNotes((current) => ({ ...current,
      ...Object.fromEntries(sessionIds.map((id, index) => [id, results[index].entities])),
    }))
  }, [repository, user, refreshRevision])

  const loadClassroomPrivateNotes = useCallback(async (bundle) => {
    if (!repository || !user?.uid) return { ...bundle, privateNotes: [] }
    const sessionIds = [...new Set([bundle.session.id, getTimetableSessionNoteId(bundle.session)].filter(Boolean))]
    const results = await Promise.all(sessionIds.map((sessionId) => repository.loadScope(
      `session:${sessionId}:privateNotes`,
      () => loadPlanningPrivateNotes(user.uid, { sessionId }),
      { completeSnapshot: true },
    )))
    const failed = results.find((result) => result.error)
    if (failed) throw failed.error
    const notes = [...new Map(results.flatMap((result) => result.entities).map((note) => [note.id, note])).values()]
      .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
    const nextBundle = { ...bundle, privateNotes: notes }
    setSessionBundles((bundles) => bundles.map((current) =>
      current.session.id === bundle.session.id ? nextBundle : current))
    return nextBundle
  }, [repository, user])

  /**
   * La recuperació necessita la data de la pròxima classe real del mateix
   * grup. La consulta revisa les aplicacions del grup fins al final de curs i,
   * sense connexió, aprofita les sessions que ja existeixen a la còpia local.
   */
  const findNextClassroomSession = useCallback(async (bundle) => {
    if (!repository) return null
    const isNextValidSession = (session) => session.entityType === 'calendarSession'
      && session.id !== bundle.session.id
      && session.classId === bundle.session.classId
      && String(session.startsAt).slice(0, 10) > String(bundle.session.startsAt).slice(0, 10)
      && !['cancelled', 'notHeld'].includes(session.status)
    const alreadyLoaded = sessionBundles
      .map((candidate) => candidate.session)
      .filter(isNextValidSession)
      .sort((left, right) => left.startsAt.localeCompare(right.startsAt))[0]
    if (alreadyLoaded) return alreadyLoaded

    // La pròxima classe pot pertànyer a una altra UP. Busquem totes les
    // aplicacions del grup, però només carreguem els encapçalaments de sessió:
    // no cal descarregar activitats ni resultats per programar el recordatori.
    const visibleUnits = allPlanningUnits
      .filter((unit) => unit.status !== 'archived')
      .filter((unit) => unit.ownerUid === user?.uid
        || unit.accessByEmail?.[userEmail]?.role === 'tutoringCollaborator'
        || unit.accessByEmail?.[userEmail]?.classIds?.includes(bundle.session.classId))
    const applicationResults = await Promise.all(visibleUnits.map((unit) => {
      const managerUid = unit.tutoringSpaceId ? user.uid : ''
      return repository.loadScope(
        `planningUnit:${unit.id}:applications:${bundle.session.classId}${managerUid ? `:manager:${managerUid}` : ''}`,
        () => loadPlanningApplications(unit.id, bundle.session.classId, 100, managerUid),
      )
    }))
    const applications = applicationResults.flatMap((result, index) => result.entities
      .filter((application) => application.classId === bundle.session.classId)
      .filter((application) => application.status !== 'archived')
      .map((application) => ({ application, planningUnit: visibleUnits[index] })))
    const sessionResults = await Promise.all(applications.map(({ application, planningUnit }) => repository.loadScope(
      `application:${application.id}:sessions`,
      async () => withPlanningRemoteContext(
        await loadPlanningSessions({
          applicationId: application.id,
          from: bundle.session.startsAt,
          maxItems: 500,
          planningUnitId: planningUnit.id,
          to: '9999-12-31T23:59:59',
        }),
        { applicationId: application.id, planningUnitId: planningUnit.id },
      ),
      { snapshotRange: { field: 'startsAt', from: bundle.session.startsAt, to: '9999-12-31T23:59:59' } },
    )))
    return sessionResults.flatMap((result) => result.entities)
      .filter(isNextValidSession)
      .sort((left, right) => left.startsAt.localeCompare(right.startsAt))[0] || null
  }, [allPlanningUnits, repository, sessionBundles, user, userEmail])

  const saveClassroomPrivateNote = useCallback(async (bundle, text, options = {}) => {
    const { note, existing, session, applicationNotesChanged } = buildSessionNoteChange({
      bundle, ownerUid: user.uid, text, recordInPlanning: options.recordInPlanning,
    })
    const entries = []
    if (note) entries.push({ entity: note })
    if (!bundle.standalone && applicationNotesChanged) entries.push({ entity: session, context: { planningUnitId: bundle.planningUnit.id } })
    if (entries.length) await persist(entries)
    if (!note && existing) await remove(existing)
    setSessionBundles((bundles) => bundles.map((current) => current.session.id === bundle.session.id
      ? { ...current, session, privateNotes: note ? [note] : [] }
      : current))
    const noteSessionId = note?.sessionId || existing?.sessionId || getTimetableSessionNoteId(bundle.session) || bundle.session.id
    setSessionPrivateNotes((current) => ({ ...current, [noteSessionId]: note ? [note] : [] }))
    return { note, session }
  }, [persist, remove, user])

  /**
   * Tancar Mode aula confirma com a fet tot element que no tingui una excepció.
   * Aquest és el comportament mínim acordat per evitar marcar cada activitat.
   */
  const closeClassroomSession = useCallback(async (bundle) => {
    const now = new Date().toISOString()
    const session = createCalendarSession({
      ...bundle.session,
      classroomClosedAt: now,
      classroomOpenedAt: bundle.session.classroomOpenedAt || now,
      status: 'held',
      updatedAt: now,
    }, { now })
    const resultByItemId = new Map(bundle.results.map((result) => [result.sessionItemId, result]))
    const results = [...bundle.results]
    const entries = [{ entity: session, context: { planningUnitId: bundle.planningUnit.id } }]
    for (const item of bundle.items) {
      if (resultByItemId.has(item.id)) continue
      const result = createActivityResult({
        applicationId: bundle.application.id,
        ownerUid: bundle.session.ownerUid,
        sessionId: bundle.session.id,
        sessionItemId: item.id,
        sourceActivityId: item.sourceActivityId,
        status: 'completed',
      }, { now })
      results.push(result)
      entries.push({
        entity: result,
        context: {
          applicationId: bundle.application.id,
          planningUnitId: bundle.planningUnit.id,
          sessionId: bundle.session.id,
        },
      })
    }
    await persist(entries)
    setSessionBundles((bundles) => bundles.map((current) => current.session.id === bundle.session.id
      ? { ...current, results, session }
      : current))
    return { results, session }
  }, [persist])

  /**
   * Carrega sota demanda la UP, les franges de totes les versions d'horari i
   * les sessions ja creades. La finestra de proposta pot així detectar què ja
   * està assignat sense mantenir obertes totes aquestes dades a l'Agenda.
   */
  const loadSchedulingSetup = useCallback(async ({ applicationId = '', classId, planningUnitId, subject = '' }) => {
    if (!repository || !activeAcademicYear || !planningUnitId || !classId) {
      throw new Error('Cal seleccionar una UP i un grup.')
    }
    const targetUnit = allPlanningUnits.find((unit) => unit.id === planningUnitId)
    const role = targetUnit?.ownerUid === user?.uid
      ? 'owner'
      : targetUnit?.accessByEmail?.[userEmail]?.role || ''
    const applicationManagerUid = role === 'tutoringCollaborator' || targetUnit?.tutoringSpaceId
      ? user.uid
      : ''
    const [structureResult, applicationResult, ...slotResults] = await Promise.all([
      repository.loadScope(
        `planningUnit:${planningUnitId}:structure`,
        async () => {
          const structure = await loadPlanningUnitStructure(planningUnitId)
          return [structure.planningUnit, ...structure.phases, ...structure.activities]
        },
        { completeSnapshot: true },
      ),
      repository.loadScope(
        `planningUnit:${planningUnitId}:applications:${classId}`,
        () => loadPlanningApplications(planningUnitId, classId, 50, applicationManagerUid),
      ),
      ...timetables.map((timetable) => repository.loadScope(
        `timetable:${timetable.id}:slots`,
        () => loadPlanningTimetableSlots(user.uid, timetable.id),
        { completeSnapshot: true },
      )),
    ])
    const planningUnit = structureResult.entities.find((item) => item.entityType === 'planningUnit')
    if (!planningUnit) throw new Error('No s’ha pogut obrir aquesta UP.')
    const temporalUnit = temporalUnits.find((item) => item.id === planningUnit.temporalUnitId) || null
    const phases = structureResult.entities.filter((item) => item.entityType === 'planningPhase')
    const baseActivities = structureResult.entities.filter((item) => item.entityType === 'planningActivity')
    const applications = applicationResult.entities
      .filter((item) => item.classId === classId)
      .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
    const savedApplication = applicationId
      ? applications.find((item) => item.id === applicationId)
      : applications[0]
    let application = savedApplication || createGroupApplication({
      academicYearId: activeAcademicYear.id,
      classId,
      classLabel: classes.find((item) => item.id === classId)?.name || '',
      managerUid: user.uid,
      ownerUid: planningUnit.ownerUid,
      planningUnitId,
      planningUnitVersion: planningUnit.versionNumber,
      status: 'draft',
    })
    const overrideResult = savedApplication
      ? await repository.loadScope(
          `application:${application.id}:overrides`,
          async () => withPlanningRemoteContext(
            await loadPlanningActivityOverrides(planningUnitId, application.id),
            { applicationId: application.id, planningUnitId },
          ),
          { completeSnapshot: true },
        )
      : { entities: [] }
    const planningActivities = orderActivitiesForScheduling(
      phases,
      applyPlanningActivityOverrides(baseActivities, overrideResult.entities),
    )
    const agendaMinutesById = getAgendaActivityMinutesById(planningActivities, overrideResult.entities)
    const activities = planningActivities.map((activity) => ({
      ...activity,
      plannedMinutes: agendaMinutesById[activity.id],
    }))
    let existingSessions = []
    let existingSessionBundles = []
    if (savedApplication) {
      const sessionResult = await repository.loadScope(
        `application:${application.id}:sessions`,
        async () => withPlanningRemoteContext(
          await loadPlanningSessions({
            applicationId: application.id,
            from: `${activeAcademicYear.startsOn}T00:00:00`,
            maxItems: 500,
            planningUnitId,
            to: `${activeAcademicYear.endsOn}T23:59:59`,
          }),
          { applicationId: application.id, planningUnitId },
        ),
        {
          completeSnapshot: true,
          snapshotRange: {
            field: 'startsAt',
            from: `${activeAcademicYear.startsOn}T00:00:00`,
            to: `${activeAcademicYear.endsOn}T23:59:59`,
          },
        },
      )
      existingSessions = sessionResult.entities
      const detailResults = await Promise.all(existingSessions.map((session) => repository.loadScope(
        `session:${session.id}:detail`,
        async () => {
          const detail = await loadPlanningSessionDetail(planningUnitId, application.id, session.id, { session })
          return withPlanningRemoteContext(
            [detail.session, ...detail.items, ...detail.results],
            { applicationId: application.id, planningUnitId, sessionId: session.id },
          )
        },
        { completeSnapshot: true },
      )))
      existingSessionBundles = existingSessions.map((session, index) => ({
        items: detailResults[index].entities.filter((item) => item.entityType === 'sessionItem'),
        results: detailResults[index].entities.filter((item) => item.entityType === 'activityResult'),
        session,
      }))
    }
    const slotsByTimetableId = Object.fromEntries(timetables.map((timetable, index) => [
      timetable.id,
      sortSlots(slotResults[index]?.entities || []),
    ]))
    const slotById = new Map(Object.values(slotsByTimetableId).flat().map((slot) => [slot.id, slot]))
    const subjects = getClassPlanningSubjects([...slotById.values()], classId)
    application = { ...application, subject: subject || resolvePlanningSubject({
      application, planningUnit, classItem: classes.find((item) => item.id === classId), subjects,
    }) }
    existingSessionBundles = existingSessionBundles.map((bundle) => ({
      ...withBabelium(bundle, slotById.get(bundle.session.timetableSlotId)),
      timetableSubject: slotById.get(bundle.session.timetableSlotId)?.subject || '',
    }))
    const currentSessionBundles = reconcileSessionOccurrences(existingSessionBundles).bundles
      .filter(bundle => !isUnperformedNoClassBundle(bundle, calendarEvents))
    const { assignedMinutesByActivityId, assignedSourceActivityIds } =
      summarizeAssignedActivityProgress(currentSessionBundles)
    const remainingMinutesByActivityId = Object.fromEntries(activities.map((activity) => {
      const plannedMinutes = Number(agendaMinutesById[activity.id])
      if (!Number.isFinite(plannedMinutes) || plannedMinutes <= 0) {
        return [activity.id, assignedSourceActivityIds.has(activity.id) ? 0 : null]
      }
      return [activity.id, Math.max(0, plannedMinutes - (assignedMinutesByActivityId[activity.id] || 0))]
    }))
    const scheduledSourceActivityIds = activities
      .filter((activity) => remainingMinutesByActivityId[activity.id] === 0)
      .map((activity) => activity.id)
    const manuallyCompletedSourceActivityIds = getManuallyCompletedActivityIds(overrideResult.entities)
    const completedSourceActivityIds = [...new Set([
      ...summarizeCompletedActivityIds(currentSessionBundles),
      ...manuallyCompletedSourceActivityIds,
    ])]
    const unavailableSourceActivityIds = [...new Set([
      ...scheduledSourceActivityIds,
      ...completedSourceActivityIds,
    ])]
    return {
      activities,
      application,
      calendarEvents,
      completedSourceActivityIds,
      existingSessions,
      existingSessionBundles,
      isNewApplication: !savedApplication,
      activityOverrides: overrideResult.entities,
      planningUnit,
      remainingMinutesByActivityId,
      scheduledSourceActivityIds,
      subjects,
      slotsByTimetableId,
      temporalUnit,
      timetables,
      unavailableSourceActivityIds,
    }
  }, [activeAcademicYear, allPlanningUnits, calendarEvents, classes, repository, temporalUnits, timetables, user, userEmail])

  const loadUnscheduledPlanningActivities = useCallback(async ({ classId, temporalUnitId = '' }) => {
    if (!classId) return { activities: [], hasApplications: false }
    const applicationRecords = await loadAccessiblePlanningApplications({ classId, temporalUnitId })
    const uniqueApplications = Array.from(new Map(applicationRecords.map((record) => [
      record.application.id,
      record,
    ])).values())
    const setups = await Promise.all(uniqueApplications.map(({ application, planningUnit }) =>
      loadSchedulingSetup({
        applicationId: application.id,
        classId,
        planningUnitId: planningUnit.id,
      })))
    const activities = setups.flatMap((setup) => summarizeUnscheduledPlanningActivities(setup).map((activity) => ({
      ...activity,
      planningUnitCode: setup.planningUnit.code,
      planningUnitId: setup.planningUnit.id,
      planningUnitTitle: setup.planningUnit.title,
      subject: setup.application.subject,
    })))
    return {
      activities,
      hasApplications: uniqueApplications.length > 0,
    }
  }, [loadAccessiblePlanningApplications, loadSchedulingSetup])

  const buildSchedulingPreview = useCallback((setup, { mode = 'progressive', selectedActivityIds, startDate }) => {
    if (!setup || !activeAcademicYear) throw new Error('Cal carregar primer la seqüència de la UP.')
    if (!setup.application.subject && setup.subjects.length > 1) throw new Error('Selecciona la matèria de la calendarització.')
    const effectiveStartDate = resolveSchedulingStartDate({
      academicYear: activeAcademicYear,
      startDate,
    })
    const occupiedCandidateKeys = setup.existingSessions.map((session) => getSessionCandidateKey({
      date: String(session.startsAt).slice(0, 10),
      calendarEventId: session.calendarEventId,
      startsAt: session.startsAt,
      timetableSlotId: session.timetableSlotId,
    }))
    const horizonEnd = setup.temporalUnit?.endsOn || activeAcademicYear.endsOn
    const temporalProposal = buildTimetableSessionCandidates({
      calendarEvents: setup.calendarEvents,
      classId: setup.application.classId,
      subject: getSchedulingSubject(setup),
      from: effectiveStartDate,
      occupiedCandidateKeys,
      slotsByTimetableId: setup.slotsByTimetableId,
      timetables: setup.timetables,
      to: horizonEnd,
    })
    if (mode === 'smart') {
      const distribution = buildActivitySessionReflow({
        activities: setup.activities,
        application: setup.application,
        calendarEvents: setup.calendarEvents,
        candidates: temporalProposal.candidates,
        completedSourceActivityIds: setup.completedSourceActivityIds,
        existingSessionBundles: setup.existingSessionBundles,
        fromDate: effectiveStartDate,
        options: { now: new Date().toISOString() },
        reservedSessionCount: 0,
      })
      const lastAffectedDate = distribution.sessions.at(-1)?.candidate.date
        || String(distribution.removedSessions.at(-1)?.startsAt || effectiveStartDate).slice(0, 10)
      return {
        ...distribution,
        ...temporalProposal,
        availability: {
          ...distribution.availability,
          horizonEnd,
        },
        schedulingMode: mode,
        skippedDates: [...temporalProposal.skippedDates, ...distribution.skippedCalendarDates]
          .filter((item, index, items) => item.date <= lastAffectedDate
            && items.findIndex(candidate => candidate.date === item.date) === index),
        setup,
      }
    }
    const selected = new Set(selectedActivityIds || [])
    const activities = setup.activities
      .filter((activity) => selected.has(activity.id))
      .map((activity) => ({
        ...activity,
        plannedMinutes: setup.remainingMinutesByActivityId[activity.id] ?? activity.plannedMinutes,
        sourcePlannedMinutes: activity.plannedMinutes,
      }))
    if (activities.length === 0) throw new Error('Selecciona almenys una activitat per calendaritzar.')
    const futureExistingBundles = reconcileSessionOccurrences(setup.existingSessionBundles).bundles.filter((bundle) => {
      const date = String(bundle.session.startsAt).slice(0, 10)
      return bundle.session.status === 'planned' && date >= effectiveStartDate && date <= horizonEnd
        && sessionMatchesPlanningSubject(bundle, setup.application.subject)
        && !getNoClassCalendarEvent(setup.calendarEvents, date, bundle.session.classId,
          { sessionId: bundle.session.id, timetableSlotId: bundle.session.timetableSlotId })
    })
    const capacityCandidates = [
      ...futureExistingBundles.map((bundle) => ({
        date: String(bundle.session.startsAt).slice(0, 10),
        existingSessionId: bundle.session.id,
        parallelProgrammingKey: bundle.session.parallelProgrammingKey,
        startsAt: bundle.session.startsAt,
      })),
      ...temporalProposal.candidates,
    ]
    const availability = reserveLastLogicalSessionCandidates(
      capacityCandidates,
      0,
    )
    const availableCandidateSet = new Set(availability.availableCandidates)
    const availableExistingSessionIds = new Set(availability.availableCandidates
      .map((candidate) => candidate.existingSessionId)
      .filter(Boolean))
    const distribution = buildActivitySessionDistribution({
      activities,
      application: setup.application,
      candidates: temporalProposal.candidates.filter((candidate) => availableCandidateSet.has(candidate)),
      existingSessionBundles: futureExistingBundles.filter((bundle) =>
        availableExistingSessionIds.has(bundle.session.id)),
      options: { now: new Date().toISOString(), calendarEvents: setup.calendarEvents },
      scheduledSourceActivityIds: setup.unavailableSourceActivityIds,
    })
    const lastAffectedDate = distribution.sessions.at(-1)?.candidate.date || effectiveStartDate
    return {
      ...distribution,
      ...temporalProposal,
      availability: {
        availableLogicalSessionCount: availability.availableLogicalSessionCount,
        horizonEnd,
        reservedCandidates: availability.reservedCandidates,
        reservedLogicalSessionCount: availability.reservedLogicalSessionCount,
        totalLogicalSessionCount: availability.totalLogicalSessionCount,
      },
      schedulingMode: mode,
      skippedDates: temporalProposal.skippedDates.filter((item) => item.date <= lastAffectedDate),
      setup,
    }
  }, [activeAcademicYear])

  const confirmSchedulingPreview = useCallback(async (preview) => {
    if (!preview?.setup?.planningUnit?.id) {
      throw new Error('La proposta no és vàlida.')
    }
    if (preview.unscheduled.length > 0 && !['complete', 'smart'].includes(preview.schedulingMode)) {
      throw new Error('La proposta encara té activitats sense sessió.')
    }
    const now = new Date().toISOString()
    const planningUnitId = preview.setup.planningUnit.id
    const { application, entries } = buildSchedulingPersistenceEntries(preview, now)
    if (preview.kind === 'reflow') {
      if (!repository) throw new Error('Cal iniciar sessió abans de reorganitzar l’Agenda.')
      for (const result of preview.removedResults || []) {
        await repository.remove(result, {
          applicationId: application.id,
          planningUnitId,
          sessionId: result.sessionId,
        })
      }
      for (const item of preview.removedItems) {
        await repository.remove(item, {
          applicationId: application.id,
          planningUnitId,
          sessionId: item.sessionId,
        })
      }
      for (const session of preview.removedSessions) {
        await repository.remove(session, { applicationId: application.id, planningUnitId })
      }
      for (const entry of entries) await repository.save(entry.entity || entry, entry.context || {})
      await refreshSync()
      requireConfirmedSchedulingSync(await synchronize())
      return {
        application,
        logicalSessionCount: preview.logicalSessionCount ?? preview.sessions.length,
        physicalSessionCount: preview.sessions.length,
        reflowed: true,
        replacedItemCount: preview.replacedItemCount,
        sessionCount: preview.sessions.length,
        unscheduled: preview.unscheduled,
      }
    }
    requireConfirmedSchedulingSync(await persist(entries))
    return {
      application,
      logicalSessionCount: preview.logicalSessionCount ?? preview.sessions.length,
      physicalSessionCount: preview.sessions.length,
      sessionCount: preview.sessions.length,
      unscheduled: preview.unscheduled,
    }
  }, [persist, refreshSync, repository, synchronize])

  /**
   * Treu només la còpia programada d'una activitat. La font de la UP no es
   * modifica i les sessions ja iniciades queden protegides com a historial.
   */
  const removeSessionItem = useCallback(async (bundle, item) => {
    const parts = item.combinedItems || [item]
    const removalStates = parts.map((part) => getAgendaSessionItemRemovalState(bundle, part))
    if (removalStates.some((state) => !state.canRemove)) {
      throw new Error('Aquesta activitat ja té dades de classe i no es pot eliminar de l’historial.')
    }
    if (!repository) throw new Error('Cal iniciar sessió abans de modificar l’Agenda.')
    if (isBabeliumItem(item)) {
      const now = new Date().toISOString()
      const session = createCalendarSession({ ...bundle.session, babeliumEnabled: false, babeliumSuppressed: true, updatedAt: now }, { now })
      await persistSessionSnapshot({ ...bundle, items: bundle.items.filter(part => !isBabeliumItem(part)), removedBabeliumItems: parts }, session)
      return { ...item, updatedSession: session }
    }
    const removedIds = new Set(parts.map((part) => part.id))
    const context = {
      applicationId: bundle.application.id,
      planningUnitId: bundle.planningUnit.id,
      sessionId: bundle.session.id,
    }
    for (const result of removalStates.flatMap((state) => state.linkedResults)) {
      await repository.remove(result, context)
    }
    // La retirada deixa una traça del grup; no modifica la UP base.
    for (const activityId of new Set(parts.map(part => part.sourceActivityId).filter(Boolean))) {
      await repository.save(createGroupActivityOverride({
        activityId, applicationId: bundle.application.id, ownerUid: bundle.planningUnit.ownerUid,
        changes: { withdrawnFromAgenda: true },
      }), { applicationId: bundle.application.id, planningUnitId: bundle.planningUnit.id })
    }
    for (const part of parts) await repository.remove(part, context)
    await refreshSync()
    await synchronize()
    setSessionBundles((bundles) => bundles.map((current) => current.session.id === bundle.session.id
      ? {
          ...current,
          items: current.items.filter((currentItem) => !removedIds.has(currentItem.id)),
          results: current.results.filter((result) => !removedIds.has(result.sessionItemId)),
        }
      : current))
    return item
  }, [persistSessionSnapshot, refreshSync, repository, synchronize])

  /**
   * Ofereix les activitats ja treballades abans de la sessió actual. Es pren
   * l'últim fragment de cada activitat perquè el docent pugui reprendre-la
   * sense haver d'editar la UP ni conèixer-ne l'identificador intern.
   */
  const loadAgendaRecoveryOptions = useCallback(async (bundle) => {
    if (!repository || !activeAcademicYear) return []
    const latestByActivityId = new Map()
    const visibleUnits = allPlanningUnits.filter((unit) => unit.ownerUid === user?.uid
      || unit.accessByEmail?.[userEmail]?.role === 'tutoringCollaborator')
    const histories = await Promise.all(visibleUnits.map(async (unit) => {
      const applicationManagerUid = unit.tutoringSpaceId ? user.uid : ''
      const [applicationResult, structureResult] = await Promise.all([
        repository.loadScope(
          `planningUnit:${unit.id}:applications:${bundle.session.classId}${applicationManagerUid ? `:manager:${applicationManagerUid}` : ''}`,
          () => loadPlanningApplications(unit.id, bundle.session.classId, 100, applicationManagerUid),
          { completeSnapshot: true },
        ),
        repository.loadScope(
          `planningUnit:${unit.id}:structure`,
          async () => {
            const structure = await loadPlanningUnitStructure(unit.id)
            return [structure.planningUnit, ...structure.phases, ...structure.activities]
          },
          { completeSnapshot: true },
        ),
      ])
      const applications = applicationResult.entities.filter((application) =>
        application.classId === bundle.session.classId)
      const phases = structureResult.entities
        .filter((entity) => entity.entityType === 'planningPhase')
      const activities = structureResult.entities
        .filter((entity) => entity.entityType === 'planningActivity')
      const activityById = new Map(activities.map((activity) => [activity.id, activity]))
      const sessionResults = await Promise.all(applications.map((application) => repository.loadScope(
        `application:${application.id}:sessions`,
        async () => withPlanningRemoteContext(
          await loadPlanningSessions({
            applicationId: application.id,
            from: `${activeAcademicYear.startsOn}T00:00:00`,
            maxItems: 500,
            planningUnitId: unit.id,
            to: bundle.session.startsAt,
          }),
          { applicationId: application.id, planningUnitId: unit.id },
        ),
        {
          snapshotRange: {
            field: 'startsAt', from: `${activeAcademicYear.startsOn}T00:00:00`, to: bundle.session.startsAt,
          },
        },
      )))
      const previousSessions = sessionResults.flatMap((result, index) => result.entities
        .filter((session) => session.startsAt < bundle.session.startsAt)
        .map((session) => ({ application: applications[index], session })))
        .sort((left, right) => left.session.startsAt.localeCompare(right.session.startsAt))
      const detailResults = await Promise.all(previousSessions.map(({ application, session }) =>
        repository.loadScope(
          `session:${session.id}:detail`,
          async () => {
            const detail = await loadPlanningSessionDetail(unit.id, application.id, session.id, { session })
            return withPlanningRemoteContext(
              [detail.session, ...detail.items, ...detail.results],
              { applicationId: application.id, planningUnitId: unit.id, sessionId: session.id },
            )
          },
          { completeSnapshot: true },
        )))
      return {
        activityById,
        detailResults,
        orderedActivities: orderActivitiesForScheduling(phases, activities),
        previousSessions,
        unit,
      }
    }))
    histories.forEach(({ activityById, detailResults, orderedActivities, previousSessions, unit }) => {
      previousSessions.forEach(({ session }, index) => {
        if (['cancelled', 'notHeld'].includes(session.status)) return
        detailResults[index].entities
          .filter((entity) => entity.entityType === 'sessionItem')
          .sort((left, right) => Number(left.order) - Number(right.order))
          .forEach((item) => {
            if (!item.sourceActivityId) return
            const sourceActivity = activityById.get(item.sourceActivityId) || null
            latestByActivityId.set(`${unit.id}:${item.sourceActivityId}`, {
              ...item,
              id: `${unit.id}:${item.id}`,
              lastStartsAt: session.startsAt,
              sourceActivity,
              sourcePlanningUnitId: unit.id,
              sourcePlanningUnitLabel: [unit.code, unit.title].filter(Boolean).join(' · '),
            })
          })
      })
      // Si una replanificació antiga ja va retirar les sessions de la
      // cronologia, l'activitat mestra continua existint a la UP. Oferim les
      // activitats anteriors a la que consta avui, començant per la més
      // propera, perquè es puguin recuperar sense alterar la Programació.
      if (unit.id === bundle.planningUnit.id) {
        const currentActivityIds = new Set((bundle.items || [])
          .map((item) => item.sourceActivityId)
          .filter(Boolean))
        const currentIndex = orderedActivities.findIndex((activity) =>
          currentActivityIds.has(activity.id))
        const programmableMinutes = Math.max(1, Number(bundle.session.durationMinutes) - 5 - (bundle.session.babeliumEnabled ? 30 : 0))
        const precedingActivities = currentIndex > 0
          ? orderedActivities.slice(0, currentIndex).reverse()
          : []
        precedingActivities.forEach((activity, fallbackRank) => {
          const activityKey = `${unit.id}:${activity.id}`
          if (latestByActivityId.has(activityKey)) return
          const totalSegments = activity.plannedMinutes
            ? Math.max(1, Math.ceil(Number(activity.plannedMinutes) / programmableMinutes))
            : 1
          latestByActivityId.set(activityKey, {
            id: `${unit.id}:activity:${activity.id}`,
            fallbackRank,
            isProgrammingFallback: true,
            lastStartsAt: '',
            plannedMinutes: activity.plannedMinutes
              ? Math.min(Number(activity.plannedMinutes), programmableMinutes)
              : programmableMinutes,
            segmentCount: totalSegments,
            segmentIndex: Math.max(0, totalSegments - 1),
            sourceActivity: activity,
            sourceActivityId: activity.id,
            sourcePlanningUnitId: unit.id,
            sourcePlanningUnitLabel: [unit.code, unit.title].filter(Boolean).join(' · '),
            title: activity.title,
            type: activity.type || 'activity',
          })
        })
      }
    })
    return [...latestByActivityId.values()]
      .sort((left, right) => {
        if (left.lastStartsAt && right.lastStartsAt) {
          return right.lastStartsAt.localeCompare(left.lastStartsAt)
        }
        if (left.lastStartsAt) return -1
        if (right.lastStartsAt) return 1
        return Number(left.fallbackRank) - Number(right.fallbackRank)
      })
  }, [activeAcademicYear, allPlanningUnits, repository, user, userEmail])

  /**
   * Insereix una recuperació abans del contingut previst i calcula l'efecte
   * dominó complet en memòria. Encara no s'escriu res fins que el docent veu
   * la proposta i la confirma.
   */
  const buildAgendaRecoveryPreview = useCallback(async (bundle, recoveryItem, minutes) => {
    if (!activeAcademicYear) throw new Error('Cal tenir un curs actiu per reajustar l’Agenda.')
    const setup = await loadSchedulingSetup({
      applicationId: bundle.application.id,
      classId: bundle.session.classId,
      planningUnitId: bundle.planningUnit.id,
    })
    const targetBundle = setup.existingSessionBundles.find((candidate) =>
      candidate.session.id === bundle.session.id)
    if (!targetBundle) throw new Error('No s’ha trobat la sessió dins de la cronologia actual.')

    const occupiedCandidateKeys = setup.existingSessions.map((session) => getSessionCandidateKey({
      calendarEventId: session.calendarEventId,
      date: String(session.startsAt).slice(0, 10),
      startsAt: session.startsAt,
      timetableSlotId: session.timetableSlotId,
    }))
    const temporalProposal = buildTimetableSessionCandidates({
      calendarEvents: setup.calendarEvents,
      classId: setup.application.classId,
      subject: getSchedulingSubject(setup),
      from: String(targetBundle.session.startsAt).slice(0, 10),
      occupiedCandidateKeys,
      slotsByTimetableId: setup.slotsByTimetableId,
      timetables: setup.timetables,
      to: activeAcademicYear.endsOn,
    })
    const preview = buildAgendaRecoveryReflow({
      application: setup.application,
      candidates: temporalProposal.candidates.filter((candidate) =>
        candidate.startsAt > targetBundle.session.startsAt),
      existingSessionBundles: setup.existingSessionBundles,
      options: { currentDateKey: localDateKey(), now: new Date().toISOString(), calendarEvents: setup.calendarEvents },
      recoveryItem,
      recoveryMinutes: Number(minutes),
      targetSessionId: targetBundle.session.id,
    })
    if (preview.unscheduled.length > 0) {
      throw new Error('No hi ha prou sessions disponibles per desplaçar totes les activitats posteriors.')
    }
    return { ...preview, setup }
  }, [activeAcademicYear, loadSchedulingSetup])

  const reorderSessionItem = useCallback(async (bundle, item, direction) => {
    const current = await loadSessionDetails(bundle)
    const result = moveAgendaSessionItem(current, item.id, direction,
      { now: new Date().toISOString(), calendarEvents })
    if (result.changedItems.length) await persist(result.changedItems.map((entity) => ({ entity,
      context: { planningUnitId: current.planningUnit.id, applicationId: current.application.id, sessionId: current.session.id } })))
    const updated = { ...current, items: result.items }
    setSessionBundles((bundles) => bundles.map((candidate) => candidate.session.id === updated.session.id ? updated : candidate))
    return updated
  }, [calendarEvents, loadSessionDetails, persist])

  const loadSessionActivityChoices = useCallback(async (bundle) => {
    const setup = await loadSchedulingSetup({ applicationId: bundle.application.id,
      classId: bundle.session.classId, planningUnitId: bundle.planningUnit.id })
    return getSessionActivityChoices({ ...setup, targetSessionId: bundle.session.id,
      manuallyCompletedSourceActivityIds: getManuallyCompletedActivityIds(setup.activityOverrides) })
  }, [loadSchedulingSetup])

  const addPlanningSessionActivity = useCallback(async (bundle, activityId, minutes) => {
    const setup = await loadSchedulingSetup({ applicationId: bundle.application.id,
      classId: bundle.session.classId, planningUnitId: bundle.planningUnit.id })
    const target = setup.existingSessionBundles.find(({ session }) => session.id === bundle.session.id)
    if (!target || getNoClassCalendarEvent(setup.calendarEvents, String(target.session.startsAt).slice(0, 10),
      target.session.classId, { sessionId: target.session.id, timetableSlotId: target.session.timetableSlotId })) {
      throw new Error('Aquesta sessió no es fa. Tria una altra sessió.')
    }
    const addition = buildSessionActivityAddition({ ...setup, targetSessionId: bundle.session.id,
      manuallyCompletedSourceActivityIds: getManuallyCompletedActivityIds(setup.activityOverrides) }, activityId, minutes)
    for (const item of addition.removedItems) {
      await repository.remove(item, { planningUnitId: setup.planningUnit.id,
        applicationId: setup.application.id, sessionId: item.sessionId })
    }
    await persist([addition.item, ...addition.changedItems].map((entity) => ({ entity,
      context: { planningUnitId: setup.planningUnit.id, applicationId: setup.application.id, sessionId: entity.sessionId } })))
    await persist({ entity: createGroupActivityOverride({
      activityId, applicationId: setup.application.id, ownerUid: setup.planningUnit.ownerUid,
      changes: { withdrawnFromAgenda: false },
    }), context: { applicationId: setup.application.id, planningUnitId: setup.planningUnit.id } })
    const changes = new Map(addition.changedItems.map((item) => [item.id, item]))
    const removedIds = new Set(addition.removedItems.map((item) => item.id))
    const updateBundle = (current) => ({ ...current, items: [
      ...current.items.filter((item) => !removedIds.has(item.id))
        .map((item) => changes.has(item.id) ? { ...item, ...changes.get(item.id) } : item),
      ...(current.session.id === bundle.session.id ? [{ ...addition.item, sourceActivity: addition.activity }] : []),
    ] })
    setSessionBundles((current) => current.map(updateBundle))
    return updateBundle({ ...bundle, session: target.session, items: target.items.map((item) => ({ ...item,
      sourceActivity: setup.activities.find((activity) => activity.id === item.sourceActivityId) || null })), results: target.results })
  }, [loadSchedulingSetup, persist, repository])

  const loadSessionReplacementActivities = useCallback(async (bundle) => {
    const setup = await loadSchedulingSetup({
      applicationId: bundle.application.id, classId: bundle.session.classId,
      planningUnitId: bundle.planningUnit.id,
    })
    return getAgendaReplacementActivityOptions({ ...setup,
      targetSessionId: bundle.session.id, options: { now: new Date().toISOString(), calendarEvents: setup.calendarEvents } })
  }, [loadSchedulingSetup])

  const buildSessionReplacementPreview = useCallback(async (bundle, changes) => {
    if (!activeAcademicYear) throw new Error('Cal tenir un curs actiu.')
    const setup = await loadSchedulingSetup({
      applicationId: bundle.application.id, classId: bundle.session.classId,
      planningUnitId: bundle.planningUnit.id,
    })
    const replacementActivity = changes.replacementActivityId
      ? getAgendaReplacementActivityOptions({ ...setup,
          targetSessionId: bundle.session.id, options: { now: new Date().toISOString(), calendarEvents: setup.calendarEvents } })
          .find((activity) => activity.id === changes.replacementActivityId)
      : null
    if (changes.replacementActivityId && !replacementActivity) {
      throw new Error('L’activitat seleccionada ja no està disponible a la Programació.')
    }
    const occupiedCandidateKeys = setup.existingSessions.map((session) => getSessionCandidateKey({
      calendarEventId: session.calendarEventId, date: String(session.startsAt).slice(0, 10),
      startsAt: session.startsAt, timetableSlotId: session.timetableSlotId,
    }))
    const proposal = buildTimetableSessionCandidates({
      calendarEvents: setup.calendarEvents, classId: setup.application.classId,
      subject: getSchedulingSubject(setup),
      from: String(bundle.session.startsAt).slice(0, 10), occupiedCandidateKeys,
      slotsByTimetableId: setup.slotsByTimetableId, timetables: setup.timetables,
      to: activeAcademicYear.endsOn,
    })
    const otherApplications = changes.disposition === 'postpone'
      ? (await loadAccessiblePlanningApplications({ classId: bundle.session.classId }))
          .filter(({ application }) => application.id !== setup.application.id)
      : []
    const otherSessionScopes = await Promise.all(otherApplications.map(({ application, planningUnit }) =>
      repository.loadScope(`application:${application.id}:sessions`, async () => withPlanningRemoteContext(
        await loadPlanningSessions({
          applicationId: application.id, planningUnitId: planningUnit.id, maxItems: 500,
          from: `${String(bundle.session.startsAt).slice(0, 10)}T00:00:00`,
          to: `${activeAcademicYear.endsOn}T23:59:59`,
        }), { applicationId: application.id, planningUnitId: planningUnit.id },
      ))))
    const failedScope = otherSessionScopes.find((scope) => scope.error)
    if (failedScope) throw failedScope.error
    const occupiedSessions = otherSessionScopes.flatMap((scope) => scope.entities)
      .filter((session) => !['cancelled', 'notHeld'].includes(session.status))
    const availableCandidates = proposal.candidates.filter((candidate) => !occupiedSessions.some((session) => {
      if (session.subgroupId && candidate.subgroupId && session.subgroupId !== candidate.subgroupId) return false
      const startsAt = new Date(candidate.startsAt).getTime()
      const occupiedAt = new Date(session.startsAt).getTime()
      return startsAt < occupiedAt + session.durationMinutes * 60_000
        && occupiedAt < startsAt + candidate.durationMinutes * 60_000
    }))
    const preview = buildAgendaSessionReplacement({
      application: setup.application, candidates: availableCandidates,
      existingSessionBundles: setup.existingSessionBundles, options: { now: new Date().toISOString(), calendarEvents: setup.calendarEvents },
      targetSessionId: bundle.session.id, ...changes, replacementActivity,
      title: replacementActivity?.title || changes.title,
    })
    if (preview.unscheduled.length) throw new Error('No hi ha prou classes disponibles per ajornar tot el contingut. No s’ha desat cap canvi.')
    return { ...preview, setup }
  }, [activeAcademicYear, loadAccessiblePlanningApplications, loadSchedulingSetup, repository])

  /** Desa qualsevol reajustament en cadena només dins de l'Agenda del grup. */
  const persistAgendaReflowPreview = useCallback(async (preview) => {
    if (!repository) throw new Error('Cal iniciar sessió abans de modificar l’Agenda.')
    const planningUnitId = preview.setup.planningUnit.id
    for (const result of preview.removedResults || []) {
      await repository.remove(result, {
        applicationId: preview.setup.application.id,
        planningUnitId,
        sessionId: result.sessionId,
      })
    }
    for (const item of preview.removedItems) {
      await repository.remove(item, {
        applicationId: preview.setup.application.id,
        planningUnitId,
        sessionId: item.sessionId,
      })
    }
    for (const session of preview.removedSessions) {
      await repository.remove(session, {
        applicationId: preview.setup.application.id,
        planningUnitId,
      })
    }
    const entries = preview.changedLockedItems.map((item) => ({
      entity: item,
      context: { applicationId: item.applicationId, planningUnitId, sessionId: item.sessionId },
    }))
    for (const result of preview.changedTargetResults || []) {
      entries.push({
        entity: result,
        context: {
          applicationId: result.applicationId,
          planningUnitId,
          sessionId: result.sessionId,
        },
      })
    }
    for (const candidate of preview.sessions) {
      entries.push({ entity: candidate.session, context: { planningUnitId } })
      for (const item of candidate.items) {
        entries.push({
          entity: item,
          context: { applicationId: item.applicationId, planningUnitId, sessionId: item.sessionId },
        })
      }
    }
    for (const [activityId, agendaPlannedMinutes] of Object.entries(preview.activityMinutesChanges || {})) {
      entries.push({
        entity: createGroupActivityOverride({
          activityId,
          applicationId: preview.setup.application.id,
          ownerUid: preview.setup.planningUnit.ownerUid,
          changes: { agendaPlannedMinutes },
        }),
        context: { applicationId: preview.setup.application.id, planningUnitId },
      })
    }
    for (const entry of entries) await repository.save(entry.entity, entry.context)
    await refreshSync()
    const summary = await synchronize()
    if (preview.kind === 'agenda-cancellation') requireConfirmedSchedulingSync(summary)

    const activityById = new Map(preview.setup.activities.map((activity) => [activity.id, activity]))
    const changedById = new Map(preview.changedLockedItems.map((item) => [item.id, item]))
    const changedResultsBySessionId = new Map()
    for (const result of preview.changedTargetResults || []) {
      changedResultsBySessionId.set(result.sessionId, [
        ...(changedResultsBySessionId.get(result.sessionId) || []),
        result,
      ])
    }
    const replacementBySessionId = new Map(preview.sessions.map((candidate) => [
      candidate.session.id,
      {
        application: preview.setup.application,
        items: candidate.items.map((item) => ({
          ...item,
          sourceActivity: activityById.get(item.sourceActivityId)
            || (preview.recoveryItem && item.sourceActivityId === preview.recoveryItem.sourceActivityId
              ? preview.recoveryItem.sourceActivity
              : null)
            || null,
        })),
        planningUnit: preview.setup.planningUnit,
        results: candidate.session.id === preview.targetBundle.session.id
          ? (preview.changedTargetResults || preview.targetBundle.results || [])
          : [],
        session: candidate.session,
      },
    ]))
    const removedSessionIds = new Set(preview.removedSessions.map((session) => session.id))
    const removedItemIds = new Set(preview.removedItems.map((item) => item.id))
    const removedResultIds = new Set((preview.removedResults || []).map((result) => result.id))
    setSessionBundles((currentBundles) => {
      const next = currentBundles
        .filter((current) => !removedSessionIds.has(current.session.id))
        .map((current) => {
          const replacement = replacementBySessionId.get(current.session.id)
          if (replacement) return replacement
          const changedResults = changedResultsBySessionId.get(current.session.id) || []
          return {
            ...current,
            items: current.items
              .filter((item) => !removedItemIds.has(item.id))
              .map((item) => changedById.has(item.id)
                ? { ...changedById.get(item.id), sourceActivity: item.sourceActivity }
                : item),
            results: changedResults.reduce(
              (results, result) => replaceById(results, result),
              current.results.filter((result) => !removedResultIds.has(result.id)),
            ),
          }
        })
      const knownIds = new Set(next.map((current) => current.session.id))
      for (const replacement of replacementBySessionId.values()) {
        if (!knownIds.has(replacement.session.id)) next.push(replacement)
      }
      return next.sort((left, right) => left.session.startsAt.localeCompare(right.session.startsAt))
    })
    return {
      ...preview,
      sessionCount: preview.sessions.length,
    }
  }, [refreshSync, repository, synchronize])

  const saveCalendarEvent = useCallback(async (values, current = null) => {
    if (!activeAcademicYear) throw new Error('Cal seleccionar un curs acadèmic.')
    const now = new Date().toISOString()
    const next = createCalendarEvent({ ...(current || {}), ...values,
      academicYearId: activeAcademicYear.id, ownerUid: user.uid, updatedAt: now }, { now })
    await saveCalendarEventWithAutomaticReflow({
      event: next, calendarEvents, academicYear: activeAcademicYear, now,
      loadApplications: loadAccessiblePlanningApplications,
      loadSetup: loadSchedulingSetup,
      saveEvent: persist,
      saveReflow: persistAgendaReflowPreview,
    })
    setCalendarEvents((items) => sortEvents(replaceById(items, next)))
    return next
  }, [activeAcademicYear, calendarEvents, loadAccessiblePlanningApplications, loadSchedulingSetup,
    persist, persistAgendaReflowPreview, user])

  const saveSessionStatus = useCallback(async (bundle, status) => {
    const now = new Date().toISOString()
    if (status === 'cancelled') {
      if (bundle.session.classroomOpenedAt || bundle.session.attendanceConfirmedAt
        || bundle.session.classroomClosedAt || bundle.session.applicationNotes?.length || bundle.results?.length
        || bundle.session.status === 'held') {
        throw new Error('Aquesta sessió ja té dades de classe i es conserva com a historial.')
      }
      const event = { id: `cancel-session:${bundle.session.id}`, type: 'cancellation',
        title: 'Classe anul·lada', startsOn: String(bundle.session.startsAt).slice(0, 10),
        classIds: [bundle.session.classId], sessionId: bundle.session.id }
      let cancelledSession = null
      let currentBundle = bundle
      await saveCalendarEventWithAutomaticReflow({
        event, calendarEvents, academicYear: activeAcademicYear, now,
        loadApplications: () => loadAccessiblePlanningApplications({ classId: bundle.session.classId }),
        loadSetup: async (request) => {
          const setup = await loadSchedulingSetup(request)
          const current = setup.existingSessionBundles.find((candidate) => candidate.session.id === bundle.session.id)
          if (current) currentBundle = { ...bundle, ...current }
          return setup
        },
        saveEvent: async () => {},
        saveReflow: async (preview) => {
          preview.sessions = preview.sessions.map((candidate) => candidate.session.id === bundle.session.id
            ? { ...candidate, session: createCalendarSession({ ...candidate.session, status, updatedAt: now }, { now }) }
            : candidate)
          await persistAgendaReflowPreview(preview)
          cancelledSession = preview.sessions.find((candidate) => candidate.session.id === bundle.session.id)?.session
        },
      })
      if (cancelledSession) return cancelledSession
      if (currentBundle.session.status === 'held' || currentBundle.session.classroomOpenedAt
        || currentBundle.session.attendanceConfirmedAt || currentBundle.session.classroomClosedAt
        || currentBundle.session.applicationNotes?.length || currentBundle.results?.length) {
        throw new Error('Aquesta sessió ja té dades de classe i es conserva com a historial.')
      }
      return persistSessionSnapshot(currentBundle,
        createCalendarSession({ ...currentBundle.session, status, updatedAt: now }, { now }))
    }
    const session = createCalendarSession({ ...bundle.session, status, updatedAt: now }, { now })
    return persistSessionSnapshot(bundle, session)
  }, [activeAcademicYear, calendarEvents, loadAccessiblePlanningApplications, loadSchedulingSetup, persistAgendaReflowPreview, persistSessionSnapshot])

  const confirmSessionReplacementPreview = useCallback(async (preview) => {
    const currentSetup = await loadSchedulingSetup({
      applicationId: preview.setup.application.id, classId: preview.targetBundle.session.classId,
      planningUnitId: preview.setup.planningUnit.id,
    })
    const snapshot = (bundles) => JSON.stringify(bundles
      .map(({ session, items, results }) => ({ session, items, results }))
      .sort((left, right) => left.session.id.localeCompare(right.session.id)))
    if (JSON.stringify(currentSetup.activities) !== JSON.stringify(preview.setup.activities)
      || JSON.stringify(currentSetup.completedSourceActivityIds) !== JSON.stringify(preview.setup.completedSourceActivityIds)
      || snapshot(currentSetup.existingSessionBundles) !== snapshot(preview.setup.existingSessionBundles)
      || new Date(preview.targetBundle.session.startsAt).getTime() <= Date.now()) {
      throw new Error('La cronologia ha canviat. Torna a previsualitzar la substitució abans de confirmar-la.')
    }
    return persistAgendaReflowPreview(preview)
  }, [loadSchedulingSetup, persistAgendaReflowPreview])

  const confirmAgendaRecoveryPreview = useCallback(
    (preview) => persistAgendaReflowPreview(preview),
    [persistAgendaReflowPreview],
  )

  /**
   * Canvia un fragment futur i compacta automàticament tota la cronologia
   * posterior. La font de Programació es manté intacta.
   */
  const addSessionActivity = useCallback(async (bundle, activityId, minutes) => {
    if (!activityId || typeof activityId !== 'object') return addPlanningSessionActivity(bundle, activityId, minutes)
    if (!activeAcademicYear) throw new Error('Cal tenir un curs actiu.')
    const setup = await loadSchedulingSetup({ applicationId: bundle.application.id,
      classId: bundle.session.classId, planningUnitId: bundle.planningUnit.id })
    const occupiedCandidateKeys = setup.existingSessions.map((session) => getSessionCandidateKey({
      calendarEventId: session.calendarEventId, date: String(session.startsAt).slice(0, 10),
      startsAt: session.startsAt, timetableSlotId: session.timetableSlotId,
    }))
    const proposal = buildTimetableSessionCandidates({ calendarEvents: setup.calendarEvents,
      classId: bundle.session.classId, subject: getSchedulingSubject(setup), from: String(bundle.session.startsAt).slice(0, 10),
      to: activeAcademicYear.endsOn, occupiedCandidateKeys, slotsByTimetableId: setup.slotsByTimetableId, timetables: setup.timetables })
    const preview = buildAgendaOwnActivityInsertion({ application: setup.application,
      activityMinutesById: getAgendaActivityMinutesById(setup.activities, setup.activityOverrides),
      existingSessionBundles: setup.existingSessionBundles, targetSessionId: bundle.session.id,
      candidates: proposal.candidates.filter((candidate) => candidate.startsAt > bundle.session.startsAt),
      title: activityId.title, plannedMinutes: minutes, fixedToSession: activityId.fixedToSession,
      options: { now: new Date().toISOString(), calendarEvents: setup.calendarEvents } })
    await persistAgendaReflowPreview({ ...preview, setup })
    const updated = preview.sessions.find((candidate) => candidate.session.id === bundle.session.id)
    const activityById = new Map(setup.activities.map((activity) => [activity.id, activity]))
    return { ...bundle, session: updated.session, items: updated.items.map((item) => ({ ...item, sourceActivity: activityById.get(item.sourceActivityId) || null })) }
  }, [activeAcademicYear, addPlanningSessionActivity, loadSchedulingSetup, persistAgendaReflowPreview])

  const saveSessionItemChange = useCallback(async (bundle, item, changes) => {
    if (!activeAcademicYear) throw new Error('Cal tenir un curs actiu per reajustar l’Agenda.')
    const setup = await loadSchedulingSetup({
      applicationId: bundle.application.id,
      classId: bundle.session.classId,
      planningUnitId: bundle.planningUnit.id,
    })
    const targetBundle = setup.existingSessionBundles.find((candidate) =>
      candidate.session.id === bundle.session.id)
    if (!targetBundle) throw new Error('No s’ha trobat la sessió dins de la cronologia actual.')
    if (typeof changes.fixedToSession === 'boolean' || !item.sourceActivityId || isFixedAgendaItem(item)) {
      const currentItem = targetBundle.items.find((candidate) => candidate.id === item.id)
      if (!currentItem || isBabeliumItem(currentItem)
        || !getAgendaSessionItemRemovalState(targetBundle, currentItem).canRemove) {
        throw new Error('Només pots modificar la fixació en sessions sense dades de classe.')
      }
      const updatedItems = typeof changes.fixedToSession === 'boolean' && changes.title == null && changes.plannedMinutes == null
        ? buildSessionActivityPinChanges(targetBundle, item, changes.fixedToSession)
        : [(currentItem.sourceActivityId ? buildSessionActivityInPlaceChange : buildOwnSessionActivityChange)(targetBundle, currentItem.id, changes)]
      const entries = updatedItems.map((entity) => ({ entity, context: { planningUnitId: setup.planningUnit.id, applicationId: setup.application.id, sessionId: targetBundle.session.id } }))
      if (currentItem.sourceActivityId && changes.plannedMinutes != null) {
        const budget = getAgendaActivityMinutesById(setup.activities, setup.activityOverrides)[currentItem.sourceActivityId]
        entries.push({ entity: createGroupActivityOverride({ activityId: currentItem.sourceActivityId,
          applicationId: setup.application.id, ownerUid: setup.planningUnit.ownerUid,
          changes: { agendaPlannedMinutes: Math.max(0, Number(budget || 0) + Number(changes.plannedMinutes) - Number(currentItem.plannedMinutes || 0)) } }),
          context: { applicationId: setup.application.id, planningUnitId: setup.planningUnit.id } })
      }
      await persist(entries)
      const changed = new Map(updatedItems.map((candidate) => [candidate.id, candidate]))
      const update = (current) => ({ ...current, items: current.items.map((candidate) => changed.has(candidate.id) ? { ...candidate, ...changed.get(candidate.id) } : candidate) })
      setSessionBundles((current) => current.map(update))
      return { sessions: [update(targetBundle)], setup, changedTargetResults: targetBundle.results || [] }
    }

    const occupiedCandidateKeys = setup.existingSessions.map((session) => getSessionCandidateKey({
      calendarEventId: session.calendarEventId,
      date: String(session.startsAt).slice(0, 10),
      startsAt: session.startsAt,
      timetableSlotId: session.timetableSlotId,
    }))
    const temporalProposal = buildTimetableSessionCandidates({
      calendarEvents: setup.calendarEvents,
      classId: setup.application.classId,
      subject: getSchedulingSubject(setup),
      from: String(targetBundle.session.startsAt).slice(0, 10),
      occupiedCandidateKeys,
      slotsByTimetableId: setup.slotsByTimetableId,
      timetables: setup.timetables,
      to: activeAcademicYear.endsOn,
    })
    const reflowInput = {
      activityMinutesById: getAgendaActivityMinutesById(setup.activities, setup.activityOverrides),
      application: setup.application,
      candidates: temporalProposal.candidates.filter((candidate) =>
        candidate.startsAt > targetBundle.session.startsAt),
      changes,
      existingSessionBundles: setup.existingSessionBundles,
      options: { currentDateKey: localDateKey(), now: new Date().toISOString(), calendarEvents: setup.calendarEvents },
      targetItemId: item.id,
      targetSessionId: targetBundle.session.id,
    }
    const preview = buildAgendaItemChangeReflow(reflowInput)
    if (preview.unscheduled.length > 0) {
      throw new Error('No hi ha prou sessions disponibles per reajustar totes les activitats posteriors.')
    }
    return persistAgendaReflowPreview({ ...preview, setup })
  }, [activeAcademicYear, loadSchedulingSetup, persistAgendaReflowPreview, persist])

  /** Omple els minuts lliures d'una sessió avançant la seqüència posterior. */
  const compactAgendaSession = useCallback(async (bundle, gapResolution = null) => {
    if (!activeAcademicYear) throw new Error('Cal tenir un curs actiu per reajustar l’Agenda.')
    const setup = await loadSchedulingSetup({
      applicationId: bundle.application.id,
      classId: bundle.session.classId,
      planningUnitId: bundle.planningUnit.id,
    })
    const targetBundle = setup.existingSessionBundles.find((candidate) =>
      candidate.session.id === bundle.session.id)
    if (!targetBundle) throw new Error('No s’ha trobat la sessió dins de la cronologia actual.')
    const occupiedCandidateKeys = setup.existingSessions.map((session) => getSessionCandidateKey({
      calendarEventId: session.calendarEventId,
      date: String(session.startsAt).slice(0, 10),
      startsAt: session.startsAt,
      timetableSlotId: session.timetableSlotId,
    }))
    const temporalProposal = buildTimetableSessionCandidates({
      calendarEvents: setup.calendarEvents,
      classId: setup.application.classId,
      subject: getSchedulingSubject(setup),
      from: String(targetBundle.session.startsAt).slice(0, 10),
      occupiedCandidateKeys,
      slotsByTimetableId: setup.slotsByTimetableId,
      timetables: setup.timetables,
      to: activeAcademicYear.endsOn,
    })
    const reflowInput = {
      activityMinutesById: getAgendaActivityMinutesById(setup.activities, setup.activityOverrides),
      application: setup.application,
      candidates: temporalProposal.candidates.filter((candidate) =>
        candidate.startsAt > targetBundle.session.startsAt),
      existingSessionBundles: setup.existingSessionBundles,
      options: { currentDateKey: localDateKey(), now: new Date().toISOString(), calendarEvents: setup.calendarEvents },
      targetSessionId: targetBundle.session.id,
    }
    const preview = buildAgendaSessionCompaction({ ...reflowInput, gapResolution })
    const previousMinutes = targetBundle.items.reduce((total, item) =>
      total + (Number(item.plannedMinutes) || 0), 0)
    const compactedTarget = preview.sessions.find((candidate) =>
      candidate.session.id === targetBundle.session.id)
    const compactedMinutes = (compactedTarget?.items || []).reduce((total, item) =>
      total + (Number(item.plannedMinutes) || 0), 0)
    if (compactedMinutes <= previousMinutes) {
      if (preview.gapChoice) return { gapChoice: preview.gapChoice }
      throw new Error(preview.noAdvanceReason)
    }
    if (preview.unscheduled.length > 0) {
      throw new Error('No hi ha prou sessions disponibles per compactar tota la cronologia.')
    }
    return persistAgendaReflowPreview({ ...preview, setup })
  }, [activeAcademicYear, loadSchedulingSetup, persistAgendaReflowPreview])

  /**
   * Una continuació amplia només el temps de l’Agenda del grup. Refà la part
   * futura, fusiona els fragments repetits i conserva la Programació original.
   */
  const buildContinuationPreview = useCallback(async (bundle, item, minutes) => {
    if (!item?.sourceActivityId || Number(minutes) <= 0) {
      throw new Error('Cal seleccionar una activitat i indicar els minuts de continuació.')
    }
    const setup = await loadSchedulingSetup({
      applicationId: bundle.application.id,
      classId: bundle.session.classId,
      planningUnitId: bundle.planningUnit.id,
    })
    const occupiedCandidateKeys = setup.existingSessions.map((session) => getSessionCandidateKey({
      calendarEventId: session.calendarEventId,
      date: String(session.startsAt).slice(0, 10),
      startsAt: session.startsAt,
      timetableSlotId: session.timetableSlotId,
    }))
    const temporalProposal = buildTimetableSessionCandidates({
      calendarEvents: setup.calendarEvents,
      classId: bundle.session.classId,
      subject: getSchedulingSubject(setup),
      from: String(bundle.session.startsAt).slice(0, 10),
      occupiedCandidateKeys,
      slotsByTimetableId: setup.slotsByTimetableId,
      timetables: setup.timetables,
      to: activeAcademicYear.endsOn,
    })
    const reflowInput = {
      additionalActivities: [{
        plannedMinutes: Number(minutes),
        sourceActivityId: item.sourceActivityId,
        sourcePlanningUnitId: item.sourcePlanningUnitId || bundle.planningUnit.id,
        title: item.title,
        type: item.type,
      }],
      activityMinutesById: getAgendaActivityMinutesById(setup.activities, setup.activityOverrides),
      application: setup.application,
      candidates: temporalProposal.candidates.filter((candidate) => candidate.startsAt > bundle.session.startsAt),
      continuationMinutes: Number(minutes),
      existingSessionBundles: setup.existingSessionBundles,
      moveFromTarget: bundle.session.status === 'planned'
        && new Date(bundle.session.startsAt).getTime() > Date.now()
        && !bundle.session.classroomOpenedAt && !bundle.session.attendanceConfirmedAt
        && !bundle.session.classroomClosedAt && !(bundle.results || []).length,
      options: { currentDateKey: localDateKey(), now: new Date().toISOString(), calendarEvents: setup.calendarEvents },
      targetItemId: item.id,
      targetSessionId: bundle.session.id,
    }
    const preview = buildAgendaContinuationReflow(reflowInput)
    if (preview.unscheduled.length > 0) {
      throw new Error('No hi ha prou temps disponible per afegir aquesta continuació.')
    }
    const now = new Date().toISOString()
    const existingResult = bundle.results.find((result) => result.sessionItemId === item.id)
    const sourceResult = preview.movedFromTarget ? null : createActivityResult({
      ...existingResult,
      applicationId: bundle.application.id,
      ownerUid: bundle.session.ownerUid,
      sessionId: bundle.session.id,
      sessionItemId: item.id,
      sourceActivityId: item.sourceActivityId,
      status: 'continued',
      updatedAt: now,
    }, { now })
    return {
      ...preview,
      bundle,
      changedTargetResults: sourceResult ? [sourceResult] : [],
      item,
      minutes: Number(minutes),
      setup,
    }
  }, [activeAcademicYear, loadSchedulingSetup])

  /** Desa en una sola cua la continuació i tota la cronologia futura normalitzada. */
  const confirmContinuationPreview = useCallback(
    (preview) => persistAgendaReflowPreview(preview),
    [persistAgendaReflowPreview],
  )

  return {
    academicYears,
    applyClassroomTimingToPlanning,
    activeAcademicYear,
    activeAcademicYearId,
    activeTimetable,
    activeTimetableId,
    calendarEvents,
    buildSchedulingPreview,
    buildAgendaRecoveryPreview,
    buildSessionReplacementPreview,
    loadSessionReplacementActivities,
    loadSessionActivityChoices,
    addSessionActivity,
    reorderSessionItem,
    buildContinuationPreview,
    compactAgendaSession,
    confirmAgendaRecoveryPreview,
    confirmSessionReplacementPreview,
    confirmContinuationPreview,
    confirmSchedulingPreview,
    closeClassroomSession,
    createYear,
    createTimetable,
    error,
    findNextClassroomSession,
    isOnline,
    loading: loading || sharedLoading,
    loadSchedulingSetup,
    loadAgendaRecoveryOptions,
    loadClassroomPrivateNotes,
    loadTimelinePrivateNotes,
    sessionPrivateNotes,
    loadSessionDetails,
    loadSessionRange,
    loadUnscheduledPlanningActivities,
    loadTodaySessions,
    moveSlot,
    ownedPlanningUnits: planningUnits,
    refreshFromCloud,
    resolveConflicts,
    removeCalendarEvent,
    removeSlot,
    saveCalendarEvent,
    saveActivityResult,
    saveClassroomPrivateNote,
    saveSessionClassroomState,
    saveSessionItemChange,
    removeSessionItem,
    saveSessionStatus,
    saveSlot,
    saveTimetable,
    saveTemporalUnit,
    setActiveAcademicYearId,
    setActiveTimetableId,
    setError,
    slots,
    slotsByTimetableId: activeTimetableId
      ? { ...slotsByTimetableId, [activeTimetableId]: slots }
      : slotsByTimetableId,
    sessionBundles,
    sessionsLoading,
    sync,
    synchronize,
    temporalUnits,
    timetables,
    today,
    planningUnits: allPlanningUnits,
    schedulablePlanningUnits: allPlanningUnits.filter((unit) => (
      unit.ownerUid === user?.uid
      || ['planningAgendaEditor', 'tutoringCollaborator'].includes(unit.accessByEmail?.[userEmail]?.role)
    )),
    sharedPlanningUnits,
    sharedClasses,
  }
}
