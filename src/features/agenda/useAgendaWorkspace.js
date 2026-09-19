import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  applyPlanningCloudOperation,
  loadPlanningAcademicYears,
  loadOwnedPlanningUnits,
  loadPlanningApplications,
  loadPlanningCalendarEvents,
  loadPlanningSessionDetail,
  loadPlanningSessions,
  loadPlanningTimetables,
  loadPlanningTimetableSlots,
  loadPlanningUnitStructure,
} from '../../data/cloud/planningFirestore'
import { createPlanningRepository } from '../../data/planningRepository'
import { PLANNING_SYNC_LABELS, PLANNING_SYNC_STATES } from '../../data/sync/planningSync'
import {
  copyTimetableVersionStructure,
  buildActivitySessionDistribution,
  buildTimetableSessionCandidates,
  createCalendarEvent,
  createCalendarSession,
  createGroupApplication,
  createSessionItem,
  createTimetableSlot,
  createTimetableVersion,
  findTimetableSlotConflicts,
  getSessionCandidateKey,
  moveTimetableSlot,
  orderActivitiesForScheduling,
  planActivityChange,
  selectEffectiveTimetable,
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
export function useAgendaWorkspace(user) {
  const [academicYears, setAcademicYears] = useState([])
  const [timetables, setTimetables] = useState([])
  const [slots, setSlots] = useState([])
  const [calendarEvents, setCalendarEvents] = useState([])
  const [planningUnits, setPlanningUnits] = useState([])
  const [sessionBundles, setSessionBundles] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [activeAcademicYearId, setActiveAcademicYearId] = useState('')
  const [activeTimetableId, setActiveTimetableId] = useState('')
  const [loading, setLoading] = useState(true)
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
    ]).then(([timetableResult, eventResult, unitResult]) => {
      if (cancelled) return
      const nextTimetables = sortTimetables(timetableResult.entities)
      setTimetables(nextTimetables)
      setCalendarEvents(sortEvents(eventResult.entities))
      setPlanningUnits([...unitResult.entities].sort((left, right) =>
        String(right.updatedAt).localeCompare(String(left.updatedAt))))
      setActiveTimetableId((current) => nextTimetables.some((item) => item.id === current)
        ? current
        : selectEffectiveTimetable(nextTimetables, today)?.id || nextTimetables[0]?.id || '')
      if (timetableResult.error || eventResult.error || unitResult.error) {
        setError('S’han carregat dades locals perquè Firebase no ha respost.')
      }
    }).catch((loadError) => !cancelled && setError(loadError.message || 'No s’ha pogut obrir l’Agenda del curs.'))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [activeAcademicYear, repository, today, user?.uid])

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
    await persist(next)
    setSlots((items) => sortSlots(replaceById(items, next)))
    return next
  }, [activeTimetable, persist, user])

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
    if (!repository || !activeAcademicYear || !from || !to) return []
    setSessionsLoading(true)
    try {
      const visibleUnits = planningUnits.filter((unit) => unit.status !== 'archived')
      const applicationResults = await Promise.all(visibleUnits.map((unit) => repository.loadScope(
        `planningUnit:${unit.id}:applications`,
        () => loadPlanningApplications(unit.id, classId || undefined, 100),
      )))
      const applications = applicationResults.flatMap((result, index) => result.entities
        .filter((application) => application.planningUnitId === visibleUnits[index].id)
        .filter((application) => !classId || application.classId === classId)
        .filter((application) => application.status !== 'archived')
        .map((application) => ({ application, planningUnit: visibleUnits[index] })))
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
      const structureResults = await Promise.all(unitIds.map((planningUnitId) => repository.loadScope(
        `planningUnit:${planningUnitId}:structure`,
        async () => {
          const structure = await loadPlanningUnitStructure(planningUnitId)
          return [structure.planningUnit, ...structure.phases, ...structure.activities]
        },
        { completeSnapshot: true },
      )))
      const activitiesByUnitId = new Map(unitIds.map((planningUnitId, index) => [
        planningUnitId,
        new Map(structureResults[index].entities
          .filter((entity) => entity.entityType === 'planningActivity')
          .map((activity) => [activity.id, activity])),
      ]))
      const bundles = sessionRecords.map((record, index) => {
        const entities = detailResults[index].entities
        const activityById = activitiesByUnitId.get(record.planningUnit.id) || new Map()
        return {
          ...record,
          items: entities
            .filter((entity) => entity.entityType === 'sessionItem')
            .sort((left, right) => Number(left.order) - Number(right.order))
            .map((item) => ({ ...item, sourceActivity: activityById.get(item.sourceActivityId) || null })),
          results: entities.filter((entity) => entity.entityType === 'activityResult'),
        }
      }).sort((left, right) => left.session.startsAt.localeCompare(right.session.startsAt))
      setSessionBundles(bundles)
      return bundles
    } finally {
      setSessionsLoading(false)
    }
  }, [activeAcademicYear, planningUnits, repository])

  useEffect(() => {
    if (!activeAcademicYear || planningUnits.length === 0) {
      queueMicrotask(() => setSessionBundles([]))
      return
    }
    const date = new Date(`${today}T12:00:00Z`)
    const weekday = date.getUTCDay() || 7
    date.setUTCDate(date.getUTCDate() - weekday + 1)
    const from = date.toISOString().slice(0, 10)
    date.setUTCDate(date.getUTCDate() + 6)
    const to = date.toISOString().slice(0, 10)
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      loadSessionRange({ from, to }).catch((loadError) => {
        if (!cancelled) setError(loadError.message || 'No s’han pogut carregar les sessions de la setmana.')
      })
    })
    return () => { cancelled = true }
  }, [activeAcademicYear, loadSessionRange, planningUnits.length, today])

  const saveSessionStatus = useCallback(async (bundle, status) => {
    const now = new Date().toISOString()
    const session = createCalendarSession({ ...bundle.session, status, updatedAt: now }, { now })
    await persist({ entity: session, context: { planningUnitId: bundle.planningUnit.id } })
    setSessionBundles((items) => items.map((item) => item.session.id === session.id ? { ...item, session } : item))
    return session
  }, [persist])

  /**
   * Carrega sota demanda la UP, les franges de totes les versions d'horari i
   * les sessions ja creades. La finestra de proposta pot així detectar què ja
   * està assignat sense mantenir obertes totes aquestes dades a l'Agenda.
   */
  const loadSchedulingSetup = useCallback(async ({ classId, planningUnitId }) => {
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
        `planningUnit:${planningUnitId}:applications`,
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
    const activities = orderActivitiesForScheduling(
      phases,
      structureResult.entities.filter((item) => item.entityType === 'planningActivity'),
    )
    const applications = applicationResult.entities
      .filter((item) => item.classId === classId)
      .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
    const application = applications[0] || createGroupApplication({
      academicYearId: activeAcademicYear.id,
      classId,
      ownerUid: user.uid,
      planningUnitId,
      planningUnitVersion: planningUnit.versionNumber,
      status: 'draft',
    })
    let existingSessions = []
    let existingItems = []
    let existingSessionBundles = []
    if (applications[0]) {
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
      existingItems = detailResults.flatMap((result) =>
        result.entities.filter((item) => item.entityType === 'sessionItem'))
      existingSessionBundles = existingSessions.map((session, index) => ({
        items: detailResults[index].entities.filter((item) => item.entityType === 'sessionItem'),
        session,
      }))
    }
    const slotsByTimetableId = Object.fromEntries(timetables.map((timetable, index) => [
      timetable.id,
      sortSlots(slotResults[index]?.entities || []),
    ]))
    const activeSessionIds = new Set(existingSessions
      .filter((session) => !['cancelled', 'notHeld'].includes(session.status))
      .map((session) => session.id))
    const activeItems = existingItems.filter((item) => activeSessionIds.has(item.sessionId))
    const assignedMinutesByActivityId = activeItems.reduce((totals, item) => {
      totals[item.sourceActivityId] = (totals[item.sourceActivityId] || 0) + (Number(item.plannedMinutes) || 0)
      return totals
    }, {})
    const remainingMinutesByActivityId = Object.fromEntries(activities.map((activity) => {
      const plannedMinutes = Number(activity.plannedMinutes)
      if (!Number.isFinite(plannedMinutes) || plannedMinutes <= 0) {
        return [activity.id, activeItems.some((item) => item.sourceActivityId === activity.id) ? 0 : null]
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
      isNewApplication: !applications[0],
      planningUnit,
      remainingMinutesByActivityId,
      scheduledSourceActivityIds,
      slotsByTimetableId,
      timetables,
    }
  }, [activeAcademicYear, calendarEvents, repository, timetables, user])

  const buildSchedulingPreview = useCallback((setup, { selectedActivityIds, startDate }) => {
    if (!setup || !activeAcademicYear) throw new Error('Cal carregar primer la seqüència de la UP.')
    const selected = new Set(selectedActivityIds || [])
    const activities = setup.activities
      .filter((activity) => selected.has(activity.id))
      .map((activity) => ({
        ...activity,
        plannedMinutes: setup.remainingMinutesByActivityId[activity.id] ?? activity.plannedMinutes,
      }))
    if (activities.length === 0) throw new Error('Selecciona almenys una activitat per calendaritzar.')
    const occupiedCandidateKeys = setup.existingSessions.map((session) => getSessionCandidateKey({
      date: String(session.startsAt).slice(0, 10),
      calendarEventId: session.calendarEventId,
      startsAt: session.startsAt,
      timetableSlotId: session.timetableSlotId,
    }))
    const temporalProposal = buildTimetableSessionCandidates({
      calendarEvents: setup.calendarEvents,
      classId: setup.application.classId,
      from: startDate,
      occupiedCandidateKeys,
      slotsByTimetableId: setup.slotsByTimetableId,
      timetables: setup.timetables,
      to: activeAcademicYear.endsOn,
    })
    const distribution = buildActivitySessionDistribution({
      activities,
      application: setup.application,
      candidates: temporalProposal.candidates,
      existingSessionBundles: setup.existingSessionBundles.filter((bundle) =>
        String(bundle.session.startsAt).slice(0, 10) >= startDate),
      options: { now: new Date().toISOString() },
      scheduledSourceActivityIds: setup.scheduledSourceActivityIds,
    })
    const lastAffectedDate = distribution.sessions.at(-1)?.candidate.date || startDate
    return {
      ...distribution,
      ...temporalProposal,
      skippedDates: temporalProposal.skippedDates.filter((item) => item.date <= lastAffectedDate),
      setup,
    }
  }, [activeAcademicYear])

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
    await persist(entries)
    return { application, sessionCount: preview.sessions.length }
  }, [persist])

  /**
   * Aplica l'abast triat pel docent: només la còpia del grup, la UP base o
   * una proposta pendent. L'element concret de la sessió sempre reflecteix
   * el canvi que el docent acaba de confirmar.
   */
  const saveSessionItemChange = useCallback(async (bundle, item, changes, scope) => {
    const now = new Date().toISOString()
    const normalizedChanges = {
      plannedMinutes: changes.plannedMinutes,
      title: changes.title,
    }
    const itemChange = createSessionItem({ ...item, ...normalizedChanges, updatedAt: now }, { now })
    const entries = [{
      entity: itemChange,
      context: {
        applicationId: bundle.application.id,
        planningUnitId: bundle.planningUnit.id,
        sessionId: bundle.session.id,
      },
    }]
    let sourceActivity = item.sourceActivity
    if (sourceActivity) {
      const plannedChange = planActivityChange({
        activity: sourceActivity,
        application: bundle.application,
        changes: normalizedChanges,
        now,
        scope,
      })
      sourceActivity = plannedChange.baseActivity
      if (plannedChange.baseActivity !== item.sourceActivity) entries.push({ entity: plannedChange.baseActivity })
      if (plannedChange.groupOverride) {
        entries.push({
          entity: plannedChange.groupOverride,
          context: { applicationId: bundle.application.id, planningUnitId: bundle.planningUnit.id },
        })
      }
    }
    await persist(entries)
    setSessionBundles((bundles) => bundles.map((current) => current.session.id === bundle.session.id
      ? {
          ...current,
          items: current.items.map((currentItem) => currentItem.id === item.id
            ? { ...itemChange, sourceActivity }
            : currentItem),
        }
      : current))
    return itemChange
  }, [persist])

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
    const entries = preview.changedExistingItems.map((item) => ({
      entity: item,
      context: { applicationId: item.applicationId, planningUnitId, sessionId: item.sessionId },
    }))
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
    return preview
  }, [persist])

  return {
    academicYears,
    activeAcademicYear,
    activeAcademicYearId,
    activeTimetable,
    activeTimetableId,
    calendarEvents,
    buildSchedulingPreview,
    buildContinuationPreview,
    confirmContinuationPreview,
    confirmSchedulingPreview,
    createTimetable,
    error,
    isOnline,
    loading,
    loadSchedulingSetup,
    loadSessionRange,
    moveSlot,
    removeCalendarEvent,
    removeSlot,
    saveCalendarEvent,
    saveSessionItemChange,
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
    timetables,
    today,
    planningUnits,
  }
}
