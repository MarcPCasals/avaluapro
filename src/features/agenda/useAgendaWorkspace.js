import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { createPlanningRepository } from '../../data/planningRepository'
import { PLANNING_SYNC_LABELS, PLANNING_SYNC_STATES } from '../../data/sync/planningSync'
import { buildAgendaSessionItemUpdate } from '../../lib/agendaToday'
import {
  copyTimetableVersionStructure,
  buildAgendaRecoveryReflow,
  buildActivitySessionDistribution,
  buildActivitySessionReflow,
  buildTimetableSessionCandidates,
  applyPlanningActivityOverrides,
  createAcademicYear,
  createActivityResult,
  createCalendarEvent,
  createCalendarSession,
  createGroupApplication,
  createPlanningPrivateNote,
  createSessionItem,
  createTimetableSlot,
  createTimetableVersion,
  findTimetableSlotConflicts,
  getSessionCandidateKey,
  moveTimetableSlot,
  orderActivitiesForScheduling,
  selectEffectiveTimetable,
  summarizeAssignedActivityProgress,
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

/**
 * Aïlla les dades privades d'Agenda de la pantalla. Horaris, franges i
 * excepcions passen pel mateix repositori local-first que Programació, però es
 * carreguen només per al curs i la versió que el docent ha obert.
 */
export function useAgendaWorkspace(user, classes = []) {
  const [academicYears, setAcademicYears] = useState([])
  const [timetables, setTimetables] = useState([])
  const [slots, setSlots] = useState([])
  const [calendarEvents, setCalendarEvents] = useState([])
  const [planningUnits, setPlanningUnits] = useState([])
  const [sharedPlanningUnits, setSharedPlanningUnits] = useState([])
  const [sharedClasses, setSharedClasses] = useState([])
  const [temporalUnits, setTemporalUnits] = useState([])
  const [sessionBundles, setSessionBundles] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [activeAcademicYearId, setActiveAcademicYearId] = useState('')
  const [activeTimetableId, setActiveTimetableId] = useState('')
  const [loading, setLoading] = useState(true)
  const [sharedLoading, setSharedLoading] = useState(true)
  const [error, setError] = useState('')
  const [sync, setSync] = useState(EMPTY_SYNC)
  const [isOnline, setIsOnline] = useState(() => globalThis.navigator?.onLine !== false)
  const today = localDateKey()
  const repository = useMemo(() => user?.uid
    ? createPlanningRepository({
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
    let cancelled = false
    if (!repository || !user?.uid) return undefined
    queueMicrotask(() => !cancelled && setLoading(true))
    repository.loadScope('academicYears', () => loadPlanningAcademicYears(user.uid), { completeSnapshot: true })
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
  }, [repository, today, user])

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
        { completeSnapshot: true },
      ),
      repository.loadScope(
        `academicYear:${activeAcademicYear.id}:planningCalendarEvents`,
        () => loadPlanningCalendarEvents(
          user.uid,
          activeAcademicYear.id,
          activeAcademicYear.startsOn,
          activeAcademicYear.endsOn,
        ),
        { completeSnapshot: true },
      ),
      repository.loadScope(
        `academicYear:${activeAcademicYear.id}:planningUnits`,
        () => loadOwnedPlanningUnits(user.uid, { academicYearId: activeAcademicYear.id }),
        { completeSnapshot: true },
      ),
      repository.loadScope(
        `academicYear:${activeAcademicYear.id}:planningTemporalUnits`,
        () => loadPlanningTemporalUnits(user.uid, activeAcademicYear.id),
        { completeSnapshot: true },
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
  }, [activeAcademicYear, repository, today, user?.uid])

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
      { completeSnapshot: true },
    ).then(async (result) => {
      if (cancelled) return
      const sharedUnits = result.entities
        .filter((unit) => unit.ownerUid !== user?.uid)
        .filter((unit) => unit.accessByEmail?.[userEmail]?.role === 'planningAgendaEditor')
        .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
      setSharedPlanningUnits(sharedUnits)
      const classEntries = await Promise.all(sharedUnits.flatMap((unit) =>
        (unit.accessByEmail?.[userEmail]?.classIds || []).map(async (classId) => {
          const applicationResult = await repository.loadScope(
            `planningUnit:${unit.id}:applications:${classId}`,
            () => loadPlanningApplications(unit.id, classId, 20),
            { completeSnapshot: true },
          )
          const application = applicationResult.entities.find((item) => item.classId === classId)
          return {
            id: classId,
            name: application?.classLabel || classes.find((item) => item.id === classId)?.name || 'Grup compartit',
          }
        })))
      if (!cancelled) {
        setSharedClasses(Array.from(new Map(classEntries.map((item) => [item.id, item])).values()))
      }
      if (result.error && result.entities.length === 0) {
        setError('No s’han pogut comprovar les Agendes compartides amb tu.')
      }
    }).catch((loadError) => !cancelled && setError(loadError.message || 'No s’han pogut carregar les Agendes compartides.'))
      .finally(() => !cancelled && setSharedLoading(false))
    return () => { cancelled = true }
  }, [classes, repository, user?.uid, userEmail])

  useEffect(() => {
    let cancelled = false
    if (!repository || !user?.uid || !activeTimetableId) {
      queueMicrotask(() => !cancelled && setSlots([]))
      return undefined
    }
    repository.loadScope(
      `timetable:${activeTimetableId}:slots`,
      () => loadPlanningTimetableSlots(user.uid, activeTimetableId),
      { completeSnapshot: true },
    ).then((result) => {
      if (cancelled) return
      setSlots(sortSlots(result.entities))
      if (result.error) setError('L’horari mostra la còpia local perquè Firebase no ha respost.')
    }).catch((loadError) => !cancelled && setError(loadError.message || 'No s’han pogut carregar les franges.'))
    return () => { cancelled = true }
  }, [activeTimetableId, repository, user?.uid])

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

  const saveCalendarEvent = useCallback(async (values, current = null) => {
    if (!activeAcademicYear) throw new Error('Cal seleccionar un curs acadèmic.')
    const now = new Date().toISOString()
    const next = createCalendarEvent({
      ...(current || {}),
      ...values,
      academicYearId: activeAcademicYear.id,
      ownerUid: user.uid,
      updatedAt: now,
    }, { now })
    await persist(next)
    setCalendarEvents((items) => sortEvents(replaceById(items, next)))
    return next
  }, [activeAcademicYear, persist, user])

  const removeCalendarEvent = useCallback(async (event) => {
    await remove(event)
    setCalendarEvents((items) => items.filter((item) => item.id !== event.id))
  }, [remove])

  /**
   * Obre només el tram temporal que la vista necessita. Les aplicacions viuen
   * sota cada UP, per això primer es resolen aquestes relacions i després es
   * carreguen les sessions i els seus elements concrets.
   */
  const loadSessionRange = useCallback(async ({ classId = '', from, to }) => {
    if (!repository || !from || !to) return []
    setSessionsLoading(true)
    try {
      const visibleUnits = allPlanningUnits.filter((unit) => unit.status !== 'archived')
      const applicationGroups = await Promise.all(visibleUnits.map(async (unit) => {
        const isOwner = unit.ownerUid === user?.uid
        const allowedClassIds = isOwner
          ? (classId ? [classId] : [null])
          : (unit.accessByEmail?.[userEmail]?.classIds || []).filter((allowedId) => !classId || allowedId === classId)
        const results = await Promise.all(allowedClassIds.map((allowedClassId) => repository.loadScope(
          `planningUnit:${unit.id}:applications${allowedClassId ? `:${allowedClassId}` : ''}`,
          () => loadPlanningApplications(unit.id, allowedClassId || undefined, 100),
          { completeSnapshot: true },
        )))
        return results.flatMap((result) => result.entities
          .filter((application) => application.planningUnitId === unit.id)
          .filter((application) => !classId || application.classId === classId)
          .filter((application) => application.status !== 'archived')
          .map((application) => ({ application, planningUnit: unit })))
      }))
      const applications = applicationGroups.flat()
      const sessionResults = await Promise.all(applications.map(({ application, planningUnit }) =>
        repository.loadScope(
          `application:${application.id}:sessions`,
          () => loadPlanningSessions({
            applicationId: application.id,
            from: `${from}T00:00:00`,
            maxItems: 500,
            planningUnitId: planningUnit.id,
            to: `${to}T23:59:59`,
          }),
        )))
      const sessionRecords = sessionResults.flatMap((result, index) => result.entities
        .filter((session) => String(session.startsAt).slice(0, 10) >= from && String(session.startsAt).slice(0, 10) <= to)
        .filter((session) => !classId || session.classId === classId)
        .map((session) => ({ ...applications[index], session })))
      const detailResults = await Promise.all(sessionRecords.map(({ application, planningUnit, session }) =>
        repository.loadScope(
          `session:${session.id}:detail`,
          async () => {
            const detail = await loadPlanningSessionDetail(planningUnit.id, application.id, session.id)
            return [detail.session, ...detail.items, ...detail.results]
          },
          { completeSnapshot: true },
        )))
      const unitIds = [...new Set(sessionRecords.map((record) => record.planningUnit.id))]
      // Una sessió pot recuperar una activitat d'una UP anterior. Carreguem
      // també les estructures pròpies arxivades perquè la descripció i els
      // materials es resolguin des de la seva font, sense duplicar-los dins
      // del document de l'Agenda.
      const sourceUnitIds = [...new Set([
        ...unitIds,
        ...allPlanningUnits
          .filter((unit) => unit.ownerUid === user?.uid)
          .map((unit) => unit.id),
      ])]
      const structureResults = await Promise.all(sourceUnitIds.map((planningUnitId) => repository.loadScope(
        `planningUnit:${planningUnitId}:structure`,
        async () => {
          const structure = await loadPlanningUnitStructure(planningUnitId)
          return [structure.planningUnit, ...structure.phases, ...structure.activities]
        },
        { completeSnapshot: true },
      )))
      const applicationRecords = Array.from(new Map(sessionRecords.map((record) => [
        `${record.planningUnit.id}:${record.application.id}`,
        record,
      ])).values())
      const overrideResults = await Promise.all(applicationRecords.map((record) => repository.loadScope(
        `application:${record.application.id}:overrides`,
        () => loadPlanningActivityOverrides(record.planningUnit.id, record.application.id),
        { completeSnapshot: true },
      )))
      const baseActivitiesByUnitId = new Map(sourceUnitIds.map((planningUnitId, index) => [
        planningUnitId,
        structureResults[index].entities.filter((entity) => entity.entityType === 'planningActivity'),
      ]))
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
      const bundles = sessionRecords.map((record, index) => {
        const entities = detailResults[index].entities
        const activityById = activitiesByApplicationKey.get(
          `${record.planningUnit.id}:${record.application.id}`,
        ) || new Map()
        return {
          ...record,
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
        }
      }).sort((left, right) => left.session.startsAt.localeCompare(right.session.startsAt))
      setSessionBundles(bundles)
      return bundles
    } finally {
      setSessionsLoading(false)
    }
  }, [allPlanningUnits, repository, user?.uid, userEmail])

  /**
   * La portada d'Agenda necessita les sessions d'avui i prou futur per poder
   * mostrar la pròxima classe real. Sis setmanes cobreixen també els períodes
   * habituals de vacances sense carregar els detalls de tot el curs.
   */
  const loadTodaySessions = useCallback(() => {
    const fromDate = new Date(`${today}T12:00:00Z`)
    const weekday = fromDate.getUTCDay() || 7
    fromDate.setUTCDate(fromDate.getUTCDate() - weekday + 1)
    const toDate = new Date(`${today}T12:00:00Z`)
    toDate.setUTCDate(toDate.getUTCDate() + 42)
    return loadSessionRange({
      from: fromDate.toISOString().slice(0, 10),
      to: toDate.toISOString().slice(0, 10),
    })
  }, [loadSessionRange, today])

  useEffect(() => {
    if (allPlanningUnits.length === 0) {
      queueMicrotask(() => setSessionBundles([]))
      return
    }
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      loadTodaySessions().catch((loadError) => {
        if (!cancelled) setError(loadError.message || 'No s’han pogut carregar les sessions de la setmana.')
      })
    })
    return () => { cancelled = true }
  }, [allPlanningUnits.length, loadTodaySessions])

  const saveSessionStatus = useCallback(async (bundle, status) => {
    const now = new Date().toISOString()
    const session = createCalendarSession({ ...bundle.session, status, updatedAt: now }, { now })
    await persist({ entity: session, context: { planningUnitId: bundle.planningUnit.id } })
    setSessionBundles((items) => items.map((item) => item.session.id === session.id ? { ...item, session } : item))
    return session
  }, [persist])

  const saveSessionClassroomState = useCallback(async (bundle, changes) => {
    const now = new Date().toISOString()
    const session = createCalendarSession({ ...bundle.session, ...changes, updatedAt: now }, { now })
    await persist({ entity: session, context: { planningUnitId: bundle.planningUnit.id } })
    setSessionBundles((items) => items.map((item) => item.session.id === session.id ? { ...item, session } : item))
    return session
  }, [persist])

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
    await persist({
      entity: result,
      context: {
        applicationId: bundle.application.id,
        planningUnitId: bundle.planningUnit.id,
        sessionId: bundle.session.id,
      },
    })
    setSessionBundles((bundles) => bundles.map((current) => current.session.id === bundle.session.id
      ? { ...current, results: replaceById(current.results, result) }
      : current))
    return result
  }, [persist])

  const loadClassroomPrivateNotes = useCallback(async (bundle) => {
    if (!repository || !user?.uid) return { ...bundle, privateNotes: [] }
    const result = await repository.loadScope(
      `session:${bundle.session.id}:privateNotes`,
      () => loadPlanningPrivateNotes(user.uid, {
        planningUnitId: bundle.planningUnit.id,
        sessionId: bundle.session.id,
      }),
      { completeSnapshot: true },
    )
    const nextBundle = { ...bundle, privateNotes: result.entities }
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
      && session.startsAt > bundle.session.startsAt
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
        || unit.accessByEmail?.[userEmail]?.classIds?.includes(bundle.session.classId))
    const applicationResults = await Promise.all(visibleUnits.map((unit) => repository.loadScope(
      `planningUnit:${unit.id}:applications:${bundle.session.classId}`,
      () => loadPlanningApplications(unit.id, bundle.session.classId, 100),
    )))
    const applications = applicationResults.flatMap((result, index) => result.entities
      .filter((application) => application.classId === bundle.session.classId)
      .filter((application) => application.status !== 'archived')
      .map((application) => ({ application, planningUnit: visibleUnits[index] })))
    const sessionResults = await Promise.all(applications.map(({ application, planningUnit }) => repository.loadScope(
      `application:${application.id}:sessions`,
      () => loadPlanningSessions({
        applicationId: application.id,
        from: bundle.session.startsAt,
        maxItems: 500,
        planningUnitId: planningUnit.id,
        to: '9999-12-31T23:59:59',
      }),
    )))
    return sessionResults.flatMap((result) => result.entities)
      .filter(isNextValidSession)
      .sort((left, right) => left.startsAt.localeCompare(right.startsAt))[0] || null
  }, [allPlanningUnits, repository, sessionBundles, user?.uid, userEmail])

  const saveClassroomPrivateNote = useCallback(async (bundle, text) => {
    const cleanText = String(text || '').trim()
    const existing = (bundle.privateNotes || [])[0]
    if (!cleanText) {
      if (existing) await remove(existing)
      setSessionBundles((bundles) => bundles.map((current) => current.session.id === bundle.session.id
        ? { ...current, privateNotes: [] }
        : current))
      return null
    }
    const now = new Date().toISOString()
    const note = createPlanningPrivateNote({
      ...(existing || {}),
      // Les notes personals pertanyen sempre al compte que les escriu. Així
      // un col·laborador d'Agenda no pot veure les del propietari ni a l'inrevés.
      ownerUid: user.uid,
      planningUnitId: bundle.planningUnit.id,
      sessionId: bundle.session.id,
      text: cleanText,
      updatedAt: now,
    }, { now })
    await persist(note)
    setSessionBundles((bundles) => bundles.map((current) => current.session.id === bundle.session.id
      ? { ...current, privateNotes: [note] }
      : current))
    return note
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
  const loadSchedulingSetup = useCallback(async ({ applicationId = '', classId, planningUnitId }) => {
    if (!repository || !activeAcademicYear || !planningUnitId || !classId) {
      throw new Error('Cal seleccionar una UP i un grup.')
    }
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
        () => loadPlanningApplications(planningUnitId, classId),
      ),
      ...timetables.map((timetable) => repository.loadScope(
        `timetable:${timetable.id}:slots`,
        () => loadPlanningTimetableSlots(user.uid, timetable.id),
        { completeSnapshot: true },
      )),
    ])
    const planningUnit = structureResult.entities.find((item) => item.entityType === 'planningUnit')
    if (!planningUnit) throw new Error('No s’ha pogut obrir aquesta UP.')
    const phases = structureResult.entities.filter((item) => item.entityType === 'planningPhase')
    const baseActivities = structureResult.entities.filter((item) => item.entityType === 'planningActivity')
    const applications = applicationResult.entities
      .filter((item) => item.classId === classId)
      .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
    const savedApplication = applicationId
      ? applications.find((item) => item.id === applicationId)
      : applications[0]
    const application = savedApplication || createGroupApplication({
      academicYearId: activeAcademicYear.id,
      classId,
      classLabel: classes.find((item) => item.id === classId)?.name || '',
      ownerUid: user.uid,
      planningUnitId,
      planningUnitVersion: planningUnit.versionNumber,
      status: 'draft',
    })
    const overrideResult = savedApplication
      ? await repository.loadScope(
          `application:${application.id}:overrides`,
          () => loadPlanningActivityOverrides(planningUnitId, application.id),
          { completeSnapshot: true },
        )
      : { entities: [] }
    const activities = orderActivitiesForScheduling(
      phases,
      applyPlanningActivityOverrides(baseActivities, overrideResult.entities),
    )
    let existingSessions = []
    let existingSessionBundles = []
    if (savedApplication) {
      const sessionResult = await repository.loadScope(
        `application:${application.id}:sessions`,
        () => loadPlanningSessions({
          applicationId: application.id,
          from: `${activeAcademicYear.startsOn}T00:00:00`,
          maxItems: 500,
          planningUnitId,
          to: `${activeAcademicYear.endsOn}T23:59:59`,
        }),
        { completeSnapshot: true },
      )
      existingSessions = sessionResult.entities
      const detailResults = await Promise.all(existingSessions.map((session) => repository.loadScope(
        `session:${session.id}:detail`,
        async () => {
          const detail = await loadPlanningSessionDetail(planningUnitId, application.id, session.id)
          return [detail.session, ...detail.items, ...detail.results]
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
    const { assignedMinutesByActivityId, assignedSourceActivityIds } =
      summarizeAssignedActivityProgress(existingSessionBundles)
    const remainingMinutesByActivityId = Object.fromEntries(activities.map((activity) => {
      const plannedMinutes = Number(activity.plannedMinutes)
      if (!Number.isFinite(plannedMinutes) || plannedMinutes <= 0) {
        return [activity.id, assignedSourceActivityIds.has(activity.id) ? 0 : null]
      }
      return [activity.id, Math.max(0, plannedMinutes - (assignedMinutesByActivityId[activity.id] || 0))]
    }))
    const scheduledSourceActivityIds = activities
      .filter((activity) => remainingMinutesByActivityId[activity.id] === 0)
      .map((activity) => activity.id)
    return {
      activities,
      application,
      calendarEvents,
      existingSessions,
      existingSessionBundles,
      isNewApplication: !savedApplication,
      planningUnit,
      remainingMinutesByActivityId,
      scheduledSourceActivityIds,
      slotsByTimetableId,
      timetables,
    }
  }, [activeAcademicYear, calendarEvents, classes, repository, timetables, user])

  const buildSchedulingPreview = useCallback((setup, { mode = 'progressive', selectedActivityIds, startDate }) => {
    if (!setup || !activeAcademicYear) throw new Error('Cal carregar primer la seqüència de la UP.')
    // Una reorganització mai no pot reescriure una sessió d'un dia anterior.
    // Les sessions passades formen l'històric i es conserven intactes.
    const effectiveStartDate = startDate < today ? today : startDate
    const occupiedCandidateKeys = setup.existingSessions.map((session) => getSessionCandidateKey({
      date: String(session.startsAt).slice(0, 10),
      calendarEventId: session.calendarEventId,
      startsAt: session.startsAt,
      timetableSlotId: session.timetableSlotId,
    }))
    const temporalProposal = buildTimetableSessionCandidates({
      calendarEvents: setup.calendarEvents,
      classId: setup.application.classId,
      from: effectiveStartDate,
      occupiedCandidateKeys,
      slotsByTimetableId: setup.slotsByTimetableId,
      timetables: setup.timetables,
      to: activeAcademicYear.endsOn,
    })
    if (mode === 'smart') {
      const distribution = buildActivitySessionReflow({
        activities: setup.activities,
        application: setup.application,
        candidates: temporalProposal.candidates,
        existingSessionBundles: setup.existingSessionBundles,
        fromDate: effectiveStartDate,
        options: { now: new Date().toISOString() },
      })
      const lastAffectedDate = distribution.sessions.at(-1)?.candidate.date
        || String(distribution.removedSessions.at(-1)?.startsAt || effectiveStartDate).slice(0, 10)
      return {
        ...distribution,
        ...temporalProposal,
        skippedDates: temporalProposal.skippedDates.filter((item) => item.date <= lastAffectedDate),
        setup,
      }
    }
    const selected = new Set(selectedActivityIds || [])
    const activities = setup.activities
      .filter((activity) => selected.has(activity.id))
      .map((activity) => ({
        ...activity,
        plannedMinutes: setup.remainingMinutesByActivityId[activity.id] ?? activity.plannedMinutes,
      }))
    if (activities.length === 0) throw new Error('Selecciona almenys una activitat per calendaritzar.')
    const distribution = buildActivitySessionDistribution({
      activities,
      application: setup.application,
      candidates: temporalProposal.candidates,
      existingSessionBundles: setup.existingSessionBundles.filter((bundle) =>
        String(bundle.session.startsAt).slice(0, 10) >= effectiveStartDate),
      options: { now: new Date().toISOString() },
      scheduledSourceActivityIds: setup.scheduledSourceActivityIds,
    })
    const lastAffectedDate = distribution.sessions.at(-1)?.candidate.date || effectiveStartDate
    return {
      ...distribution,
      ...temporalProposal,
      skippedDates: temporalProposal.skippedDates.filter((item) => item.date <= lastAffectedDate),
      setup,
    }
  }, [activeAcademicYear, today])

  const confirmSchedulingPreview = useCallback(async (preview) => {
    if (!preview?.setup?.planningUnit?.id || preview.unscheduled.length > 0) {
      throw new Error('La proposta encara té activitats sense sessió.')
    }
    const now = new Date().toISOString()
    const planningUnitId = preview.setup.planningUnit.id
    const application = createGroupApplication({
      ...preview.setup.application,
      status: 'active',
      updatedAt: now,
    }, { now })
    const entries = [{ entity: application }]
    for (const bundle of preview.sessions) {
      if (!bundle.isExisting) entries.push({ entity: bundle.session, context: { planningUnitId } })
      for (const item of bundle.items) {
        entries.push({
          entity: item,
          context: { applicationId: application.id, planningUnitId, sessionId: bundle.session.id },
        })
      }
    }
    if (preview.kind === 'reflow') {
      if (!repository) throw new Error('Cal iniciar sessió abans de reorganitzar l’Agenda.')
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
      await synchronize()
      return {
        application,
        logicalSessionCount: preview.logicalSessionCount ?? preview.sessions.length,
        physicalSessionCount: preview.sessions.length,
        reflowed: true,
        replacedItemCount: preview.replacedItemCount,
        sessionCount: preview.sessions.length,
      }
    }
    await persist(entries)
    return {
      application,
      logicalSessionCount: preview.logicalSessionCount ?? preview.sessions.length,
      physicalSessionCount: preview.sessions.length,
      sessionCount: preview.sessions.length,
    }
  }, [persist, refreshSync, repository, synchronize])

  /**
   * Ajusta només la còpia de l'activitat que viu en aquesta sessió d'Agenda.
   * La font de Programació es manté intacta i només es pot editar des del seu
   * mòdul propi.
   */
  const saveSessionItemChange = useCallback(async (bundle, item, changes) => {
    const now = new Date().toISOString()
    const entry = buildAgendaSessionItemUpdate(bundle, item, {
      plannedMinutes: changes.plannedMinutes,
      title: changes.title,
    }, { now })
    const itemChange = entry.entity
    await persist(entry)
    setSessionBundles((bundles) => bundles.map((current) => current.session.id === bundle.session.id
      ? {
          ...current,
          items: current.items.map((currentItem) => currentItem.id === item.id
            ? { ...itemChange, sourceActivity: item.sourceActivity }
            : currentItem),
        }
      : current))
    return itemChange
  }, [persist])

  /**
   * Treu només la còpia programada d'una activitat. La font de la UP no es
   * modifica i les sessions ja iniciades queden protegides com a historial.
   */
  const removeSessionItem = useCallback(async (bundle, item) => {
    const hasClassroomData = bundle.session.status !== 'planned'
      || bundle.session.classroomOpenedAt
      || bundle.session.attendanceConfirmedAt
      || bundle.session.classroomClosedAt
      || (bundle.results || []).some((result) => result.sessionItemId === item.id)
    if (hasClassroomData) {
      throw new Error('Aquesta activitat ja té dades de classe i no es pot eliminar de l’historial.')
    }
    if (!repository) throw new Error('Cal iniciar sessió abans de modificar l’Agenda.')

    await repository.remove(item, {
      applicationId: bundle.application.id,
      planningUnitId: bundle.planningUnit.id,
      sessionId: bundle.session.id,
    })
    await refreshSync()
    await synchronize()
    setSessionBundles((bundles) => bundles.map((current) => current.session.id === bundle.session.id
      ? { ...current, items: current.items.filter((currentItem) => currentItem.id !== item.id) }
      : current))
    return item
  }, [refreshSync, repository, synchronize])

  /**
   * Ofereix les activitats ja treballades abans de la sessió actual. Es pren
   * l'últim fragment de cada activitat perquè el docent pugui reprendre-la
   * sense haver d'editar la UP ni conèixer-ne l'identificador intern.
   */
  const loadAgendaRecoveryOptions = useCallback(async (bundle) => {
    if (!repository || !activeAcademicYear) return []
    const latestByActivityId = new Map()
    const ownedUnits = allPlanningUnits.filter((unit) => unit.ownerUid === user?.uid)
    const histories = await Promise.all(ownedUnits.map(async (unit) => {
      const [applicationResult, structureResult] = await Promise.all([
        repository.loadScope(
          `planningUnit:${unit.id}:applications:${bundle.session.classId}`,
          () => loadPlanningApplications(unit.id, bundle.session.classId, 100),
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
        () => loadPlanningSessions({
          applicationId: application.id,
          from: `${activeAcademicYear.startsOn}T00:00:00`,
          maxItems: 500,
          planningUnitId: unit.id,
          to: bundle.session.startsAt,
        }),
      )))
      const previousSessions = sessionResults.flatMap((result, index) => result.entities
        .filter((session) => session.startsAt < bundle.session.startsAt)
        .map((session) => ({ application: applications[index], session })))
        .sort((left, right) => left.session.startsAt.localeCompare(right.session.startsAt))
      const detailResults = await Promise.all(previousSessions.map(({ application, session }) =>
        repository.loadScope(
          `session:${session.id}:detail`,
          async () => {
            const detail = await loadPlanningSessionDetail(unit.id, application.id, session.id)
            return [detail.session, ...detail.items, ...detail.results]
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
        const programmableMinutes = Math.max(1, Number(bundle.session.durationMinutes) - 5)
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
  }, [activeAcademicYear, allPlanningUnits, repository, user?.uid])

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
      options: { currentDateKey: localDateKey(), now: new Date().toISOString() },
      recoveryItem,
      recoveryMinutes: Number(minutes),
      targetSessionId: targetBundle.session.id,
    })
    if (preview.unscheduled.length > 0) {
      throw new Error('No hi ha prou sessions disponibles per desplaçar totes les activitats posteriors.')
    }
    return { ...preview, setup }
  }, [activeAcademicYear, loadSchedulingSetup])

  /** Desa el reajustament confirmat només dins de l'Agenda del grup. */
  const confirmAgendaRecoveryPreview = useCallback(async (preview) => {
    if (!repository) throw new Error('Cal iniciar sessió abans de modificar l’Agenda.')
    const planningUnitId = preview.setup.planningUnit.id
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
      if (!candidate.isExisting) {
        entries.push({ entity: candidate.session, context: { planningUnitId } })
      }
      for (const item of candidate.items) {
        entries.push({
          entity: item,
          context: { applicationId: item.applicationId, planningUnitId, sessionId: item.sessionId },
        })
      }
    }
    for (const entry of entries) await repository.save(entry.entity, entry.context)
    await refreshSync()
    await synchronize()

    const activityById = new Map(preview.setup.activities.map((activity) => [activity.id, activity]))
    const changedById = new Map(preview.changedLockedItems.map((item) => [item.id, item]))
    const replacementBySessionId = new Map(preview.sessions.map((candidate) => [
      candidate.session.id,
      {
        application: preview.setup.application,
        items: candidate.items.map((item) => ({
          ...item,
          sourceActivity: activityById.get(item.sourceActivityId)
            || (item.sourceActivityId === preview.recoveryItem.sourceActivityId
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
    setSessionBundles((currentBundles) => {
      const next = currentBundles
        .filter((current) => !removedSessionIds.has(current.session.id))
        .map((current) => {
          const replacement = replacementBySessionId.get(current.session.id)
          if (replacement) return replacement
          return {
            ...current,
            items: current.items.map((item) => changedById.has(item.id)
              ? { ...changedById.get(item.id), sourceActivity: item.sourceActivity }
              : item),
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

  /**
   * Una continuació no altera el temps ideal de la UP. Construeix fragments
   * nous per al grup i actualitza els comptadors de parts, però espera una
   * confirmació separada abans de desar-los.
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
      from: String(bundle.session.startsAt).slice(0, 10),
      occupiedCandidateKeys,
      slotsByTimetableId: setup.slotsByTimetableId,
      timetables: setup.timetables,
      to: activeAcademicYear.endsOn,
    })
    const futureBundles = setup.existingSessionBundles.filter((candidate) =>
      candidate.session.status === 'planned' && candidate.session.startsAt > bundle.session.startsAt)
    const distribution = buildActivitySessionDistribution({
      activities: [{
        id: item.sourceActivityId,
        plannedMinutes: Number(minutes),
        title: item.title,
        type: item.type,
      }],
      application: setup.application,
      candidates: temporalProposal.candidates.filter((candidate) => candidate.startsAt > bundle.session.startsAt),
      existingSessionBundles: futureBundles,
      options: { now: new Date().toISOString() },
    })
    if (distribution.unscheduled.length > 0) {
      throw new Error('No hi ha prou temps disponible per afegir aquesta continuació.')
    }
    const activeSourceItems = setup.existingSessionBundles
      .filter((candidate) => !['cancelled', 'notHeld'].includes(candidate.session.status))
      .flatMap((candidate) => candidate.items)
      .filter((candidate) => candidate.sourceActivityId === item.sourceActivityId)
    const segmentOffset = Math.max(0, ...activeSourceItems.map((candidate) => Number(candidate.segmentIndex) || 0))
    const newSegmentCount = segmentOffset + distribution.sessions.reduce((total, candidate) => total + candidate.items.length, 0)
    const now = new Date().toISOString()
    const changedExistingItems = activeSourceItems.map((candidate) => createSessionItem({
      ...candidate,
      segmentCount: newSegmentCount,
      updatedAt: now,
    }, { now }))
    let addedIndex = 0
    const sessions = distribution.sessions.map((candidate) => ({
      ...candidate,
      items: candidate.items.map((newItem) => {
        addedIndex += 1
        return createSessionItem({
          ...newItem,
          segmentCount: newSegmentCount,
          segmentIndex: segmentOffset + addedIndex,
          updatedAt: now,
        }, { now })
      }),
    }))
    return { bundle, changedExistingItems, item, minutes: Number(minutes), sessions, setup }
  }, [activeAcademicYear, loadSchedulingSetup])

  /** Desa en una sola cua la continuació confirmada i els comptadors revisats. */
  const confirmContinuationPreview = useCallback(async (preview) => {
    const planningUnitId = preview.setup.planningUnit.id
    const now = new Date().toISOString()
    const existingResult = preview.bundle.results.find((result) => result.sessionItemId === preview.item.id)
    const sourceResult = createActivityResult({
      ...existingResult,
      applicationId: preview.bundle.application.id,
      ownerUid: preview.bundle.session.ownerUid,
      sessionId: preview.bundle.session.id,
      sessionItemId: preview.item.id,
      sourceActivityId: preview.item.sourceActivityId,
      status: 'continued',
      updatedAt: now,
    }, { now })
    const entries = preview.changedExistingItems.map((item) => ({
      entity: item,
      context: { applicationId: item.applicationId, planningUnitId, sessionId: item.sessionId },
    }))
    entries.push({
      entity: sourceResult,
      context: {
        applicationId: preview.bundle.application.id,
        planningUnitId,
        sessionId: preview.bundle.session.id,
      },
    })
    for (const bundle of preview.sessions) {
      if (!bundle.isExisting) entries.push({ entity: bundle.session, context: { planningUnitId } })
      for (const item of bundle.items) {
        entries.push({
          entity: item,
          context: { applicationId: item.applicationId, planningUnitId, sessionId: item.sessionId },
        })
      }
    }
    await persist(entries)
    const changedById = new Map(preview.changedExistingItems.map((item) => [item.id, item]))
    setSessionBundles((currentBundles) => {
      const next = currentBundles.map((current) => {
        const continuation = preview.sessions.find((candidate) => candidate.session.id === current.session.id)
        return {
          ...current,
          items: [
            ...current.items.map((currentItem) => changedById.has(currentItem.id)
              ? { ...changedById.get(currentItem.id), sourceActivity: currentItem.sourceActivity }
              : currentItem),
            ...(continuation?.items || []).map((newItem) => ({ ...newItem, sourceActivity: preview.item.sourceActivity })),
          ].sort((left, right) => Number(left.order) - Number(right.order)),
          results: current.session.id === preview.bundle.session.id
            ? replaceById(current.results, sourceResult)
            : current.results,
        }
      })
      const knownIds = new Set(next.map((current) => current.session.id))
      for (const continuation of preview.sessions.filter((candidate) => !knownIds.has(candidate.session.id))) {
        next.push({
          application: preview.setup.application,
          items: continuation.items.map((newItem) => ({ ...newItem, sourceActivity: preview.item.sourceActivity })),
          planningUnit: preview.setup.planningUnit,
          results: [],
          session: continuation.session,
        })
      }
      return next.sort((left, right) => left.session.startsAt.localeCompare(right.session.startsAt))
    })
    return { ...preview, sourceResult }
  }, [persist])

  return {
    academicYears,
    activeAcademicYear,
    activeAcademicYearId,
    activeTimetable,
    activeTimetableId,
    calendarEvents,
    buildSchedulingPreview,
    buildAgendaRecoveryPreview,
    buildContinuationPreview,
    confirmAgendaRecoveryPreview,
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
    loadSessionRange,
    loadTodaySessions,
    moveSlot,
    ownedPlanningUnits: planningUnits,
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
    setActiveAcademicYearId,
    setActiveTimetableId,
    setError,
    slots,
    sessionBundles,
    sessionsLoading,
    sync,
    synchronize,
    temporalUnits,
    timetables,
    today,
    planningUnits: allPlanningUnits,
    sharedPlanningUnits,
    sharedClasses,
  }
}
