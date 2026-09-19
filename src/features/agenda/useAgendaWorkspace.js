import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  applyPlanningCloudOperation,
  loadPlanningAcademicYears,
  loadPlanningCalendarEvents,
  loadPlanningTimetables,
  loadPlanningTimetableSlots,
} from '../../data/cloud/planningFirestore'
import { createPlanningRepository } from '../../data/planningRepository'
import { PLANNING_SYNC_LABELS, PLANNING_SYNC_STATES } from '../../data/sync/planningSync'
import {
  copyTimetableVersionStructure,
  createCalendarEvent,
  createTimetableSlot,
  createTimetableVersion,
  findTimetableSlotConflicts,
  moveTimetableSlot,
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
      await repository.save(entry)
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
    ]).then(([timetableResult, eventResult]) => {
      if (cancelled) return
      const nextTimetables = sortTimetables(timetableResult.entities)
      setTimetables(nextTimetables)
      setCalendarEvents(sortEvents(eventResult.entities))
      setActiveTimetableId((current) => nextTimetables.some((item) => item.id === current)
        ? current
        : selectEffectiveTimetable(nextTimetables, today)?.id || nextTimetables[0]?.id || '')
      if (timetableResult.error || eventResult.error) {
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

  return {
    academicYears,
    activeAcademicYear,
    activeAcademicYearId,
    activeTimetable,
    activeTimetableId,
    calendarEvents,
    createTimetable,
    error,
    isOnline,
    loading,
    moveSlot,
    removeCalendarEvent,
    removeSlot,
    saveCalendarEvent,
    saveSlot,
    saveTimetable,
    setActiveAcademicYearId,
    setActiveTimetableId,
    setError,
    slots,
    sync,
    synchronize,
    timetables,
    today,
  }
}
