import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  applyPlanningCloudOperation,
  loadOwnedPlanningUnits,
  loadPlanningAcademicYears,
  loadPlanningTemporalUnits,
  loadPlanningUnitStructure,
} from '../../data/cloud/planningFirestore'
import { createPlanningRepository } from '../../data/planningRepository'
import {
  copyPlanningActivityToPhase,
  copyPlanningUnitStructureToAcademicYear,
  createAcademicYear,
  createPlanningActivity,
  createPlanningPhase,
  createPlanningUnit,
  createTemporalUnit,
} from '../../domain/planning/model'
import { applyImprovementProposals, movePlanningActivityInSequence } from '../../domain/planning/rules'
import { PLANNING_SYNC_LABELS, PLANNING_SYNC_STATES } from '../../data/sync/planningSync'

const EMPTY_SYNC = {
  conflictCount: 0,
  label: PLANNING_SYNC_LABELS[PLANNING_SYNC_STATES.SAVED],
  pendingCount: 0,
  state: PLANNING_SYNC_STATES.SAVED,
}

function replaceById(items, nextItem) {
  const exists = items.some((item) => item.id === nextItem.id)
  return exists ? items.map((item) => item.id === nextItem.id ? nextItem : item) : [...items, nextItem]
}

function preserveSharingFields(current, next) {
  return {
    ...next,
    accessByEmail: current.accessByEmail || {},
    authorizedEmails: current.authorizedEmails || [],
    ownerEmailLower: current.ownerEmailLower || '',
  }
}

function sortByOrder(items) {
  return [...items].sort((first, second) => Number(first.order) - Number(second.order))
}

/**
 * Manté el primer flux vertical de Programació fora del component visual. Tota
 * escriptura passa pel repositori local-first i la interfície només rep l'estat
 * final de la cua, sense confondre el desament local amb la confirmació remota.
 */
export function usePlanningWorkspace(user) {
  const [academicYears, setAcademicYears] = useState([])
  const [temporalUnits, setTemporalUnits] = useState([])
  const [planningUnits, setPlanningUnits] = useState([])
  const [phases, setPhases] = useState([])
  const [activities, setActivities] = useState([])
  const [activeAcademicYearId, setActiveAcademicYearId] = useState('')
  const [activePlanningUnitId, setActivePlanningUnitId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sync, setSync] = useState(EMPTY_SYNC)
  const [isOnline, setIsOnline] = useState(() => globalThis.navigator?.onLine !== false)
  const repository = useMemo(() => user?.uid
    ? createPlanningRepository({
        applyRemoteOperation: applyPlanningCloudOperation,
        uid: user.uid,
        isOnline: () => globalThis.navigator?.onLine !== false,
      })
    : null, [user])

  const activeAcademicYear = academicYears.find((item) => item.id === activeAcademicYearId) || null
  const activePlanningUnit = planningUnits.find((item) => item.id === activePlanningUnitId) || null

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

  const persist = useCallback(async (entitiesWithContext) => {
    if (!repository) throw new Error('Cal iniciar sessió abans de desar la programació.')
    const entries = Array.isArray(entitiesWithContext) ? entitiesWithContext : [entitiesWithContext]
    for (const entry of entries) {
      await repository.save(entry.entity || entry, entry.context || {})
    }
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
    repository.loadScope('academicYears', () => loadPlanningAcademicYears(user.uid))
      .then((result) => {
        if (cancelled) return
        const years = [...result.entities].sort((first, second) => second.startsOn.localeCompare(first.startsOn))
        setAcademicYears(years)
        setActiveAcademicYearId((current) => years.some((item) => item.id === current) ? current : years[0]?.id || '')
        if (result.error) setError('S’ha carregat la còpia local perquè Firebase no ha respost.')
      })
      .catch((loadError) => !cancelled && setError(loadError.message || 'No s’han pogut carregar els cursos.'))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [repository, user])

  useEffect(() => {
    let cancelled = false
    if (!repository || !user?.uid || !activeAcademicYearId) return undefined
    queueMicrotask(() => !cancelled && setLoading(true))
    Promise.all([
      repository.loadScope(
        `academicYear:${activeAcademicYearId}:planningTemporalUnits`,
        () => loadPlanningTemporalUnits(user.uid, activeAcademicYearId),
      ),
      repository.loadScope(
        `academicYear:${activeAcademicYearId}:planningUnits`,
        () => loadOwnedPlanningUnits(user.uid, { academicYearId: activeAcademicYearId }),
      ),
    ]).then(([utResult, unitResult]) => {
      if (cancelled) return
      const nextUnits = [...unitResult.entities].sort((first, second) =>
        String(second.updatedAt).localeCompare(String(first.updatedAt)))
      setTemporalUnits(sortByOrder(utResult.entities))
      setPlanningUnits(nextUnits)
      setActivePlanningUnitId((current) => nextUnits.some((item) => item.id === current)
        ? current
        : nextUnits.find((item) => item.status !== 'archived')?.id || nextUnits[0]?.id || '')
      if (utResult.error || unitResult.error) setError('S’han carregat dades locals perquè Firebase no ha respost.')
    }).catch((loadError) => !cancelled && setError(loadError.message || 'No s’ha pogut obrir aquest curs.'))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [activeAcademicYearId, repository, user?.uid])

  useEffect(() => {
    let cancelled = false
    if (!repository || !activePlanningUnitId) return undefined
    repository.loadScope(
      `planningUnit:${activePlanningUnitId}:structure`,
      async () => {
        const structure = await loadPlanningUnitStructure(activePlanningUnitId)
        return [
          structure.planningUnit,
          ...structure.phases,
          ...structure.activities,
        ]
      },
      { completeSnapshot: true },
    ).then((result) => {
      if (cancelled) return
      const unit = result.entities.find((item) => item.entityType === 'planningUnit')
      if (unit) setPlanningUnits((items) => replaceById(items, unit))
      setPhases(sortByOrder(result.entities.filter((item) => item.entityType === 'planningPhase')))
      setActivities(sortByOrder(result.entities.filter((item) => item.entityType === 'planningActivity')))
      if (result.error) setError('La UP mostra la còpia local perquè Firebase no ha respost.')
    }).catch((loadError) => !cancelled && setError(loadError.message || 'No s’ha pogut obrir aquesta UP.'))
    return () => { cancelled = true }
  }, [activePlanningUnitId, repository])

  const createYear = useCallback(async (values) => {
    const year = createAcademicYear({ ...values, ownerUid: user.uid })
    await persist(year)
    setAcademicYears((items) => [...items, year].sort((a, b) => b.startsOn.localeCompare(a.startsOn)))
    setActiveAcademicYearId(year.id)
    return year
  }, [persist, user])

  const createTemporalUnitForYear = useCallback(async (values) => {
    const temporalUnit = createTemporalUnit({
      ...values,
      academicYearId: activeAcademicYearId,
      order: values.order ?? temporalUnits.length,
      ownerUid: user.uid,
    })
    await persist(temporalUnit)
    setTemporalUnits((items) => sortByOrder(replaceById(items, temporalUnit)))
    return temporalUnit
  }, [activeAcademicYearId, persist, temporalUnits.length, user])

  const saveTemporalUnit = useCallback(async (current, values) => {
    const temporalUnit = createTemporalUnit({ ...current, ...values, updatedAt: new Date().toISOString() })
    await persist(temporalUnit)
    setTemporalUnits((items) => sortByOrder(replaceById(items, temporalUnit)))
    return temporalUnit
  }, [persist])

  const createUnit = useCallback(async (values) => {
    const now = new Date().toISOString()
    const unit = {
      ...createPlanningUnit({
        ...values,
        academicYearId: activeAcademicYearId,
        ownerUid: user.uid,
        status: 'draft',
      }, { now }),
      accessByEmail: {},
      authorizedEmails: [],
      ownerEmailLower: String(user.email || '').trim().toLowerCase(),
    }
    const defaultPhases = [
      ['preparation', 'Preparació'],
      ['resolution', 'Resolució'],
      ['closing', 'Tancament'],
    ].map(([kind, title], order) => createPlanningPhase({
      kind,
      order,
      ownerUid: user.uid,
      planningUnitId: unit.id,
      title,
    }, { now }))
    await persist([unit, ...defaultPhases])
    setPlanningUnits((items) => [unit, ...items])
    setPhases(defaultPhases)
    setActivities([])
    setActivePlanningUnitId(unit.id)
    return unit
  }, [activeAcademicYearId, persist, user])

  const saveUnit = useCallback(async (current, values) => {
    const next = preserveSharingFields(current, createPlanningUnit({
      ...current,
      ...values,
      updatedAt: new Date().toISOString(),
    }))
    await persist(next)
    setPlanningUnits((items) => replaceById(items, next))
    return next
  }, [persist])

  const archiveUnit = useCallback((unit) => saveUnit(unit, { status: 'archived' }), [saveUnit])

  const savePhase = useCallback(async (values, current = null) => {
    const next = createPlanningPhase({
      ...(current || {}),
      ...values,
      order: current?.order ?? phases.length,
      ownerUid: user.uid,
      planningUnitId: activePlanningUnitId,
      updatedAt: new Date().toISOString(),
    })
    await persist(next)
    setPhases((items) => sortByOrder(replaceById(items, next)))
    return next
  }, [activePlanningUnitId, persist, phases.length, user])

  const saveActivity = useCallback(async (values, current = null) => {
    const now = new Date().toISOString()
    if (current && values.phaseId !== current.phaseId) {
      // Primer conservem l'element dins la fase d'origen amb el contingut nou;
      // el moviment posterior renumera les dues fases sense recrear-lo.
      const staged = createPlanningActivity({
        ...current,
        ...values,
        phaseId: current.phaseId,
        order: current.order,
        updatedAt: now,
      })
      const result = movePlanningActivityInSequence(
        replaceById(activities, staged),
        { activityId: staged.id, targetPhaseId: values.phaseId },
        { now },
      )
      await persist(result.changedActivities)
      setActivities(result.activities)
      return result.activities.find((activity) => activity.id === staged.id)
    }
    const next = createPlanningActivity({
      ...(current || {}),
      ...values,
      order: current?.order
        ?? activities.filter((activity) => activity.phaseId === values.phaseId).length,
      ownerUid: user.uid,
      planningUnitId: activePlanningUnitId,
      updatedAt: now,
    })
    await persist(next)
    setActivities((items) => sortByOrder(replaceById(items, next)))
    return next
  }, [activePlanningUnitId, activities, persist, user])

  const removeActivity = useCallback(async (activity) => {
    if (!repository) throw new Error('Cal iniciar sessió abans de modificar la programació.')
    await repository.remove(activity)
    setActivities((items) => items.filter((item) => item.id !== activity.id))
    await refreshSync()
    return synchronize()
  }, [refreshSync, repository, synchronize])

  const moveActivity = useCallback(async (move) => {
    const result = movePlanningActivityInSequence(activities, move, { now: new Date().toISOString() })
    if (result.changedActivities.length === 0) return result
    await persist(result.changedActivities)
    setActivities(result.activities)
    return result
  }, [activities, persist])

  const loadTemporalUnitsForYear = useCallback(async (academicYearId) => {
    if (!repository || !user?.uid || !academicYearId) return []
    const result = await repository.loadScope(
      `academicYear:${academicYearId}:planningTemporalUnits`,
      () => loadPlanningTemporalUnits(user.uid, academicYearId),
    )
    if (result.error) throw new Error('No s’han pogut carregar les UT del curs seleccionat.')
    return sortByOrder(result.entities)
  }, [repository, user])

  const loadHistoricalUnits = useCallback(async () => {
    if (!repository || !user?.uid) return []
    const historicalYears = academicYears.filter((year) => year.id !== activeAcademicYearId)
    const results = await Promise.all(historicalYears.map(async (year) => {
      const result = await repository.loadScope(
        `academicYear:${year.id}:planningUnits`,
        () => loadOwnedPlanningUnits(user.uid, { academicYearId: year.id }),
      )
      return result.entities.map((unit) => ({ ...unit, academicYearLabel: year.label }))
    }))
    return results.flat().sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
  }, [academicYears, activeAcademicYearId, repository, user])

  const loadHistoricalUnitStructure = useCallback(async (planningUnitId) => {
    if (!repository || !planningUnitId) return { activities: [], phases: [], planningUnit: null }
    const result = await repository.loadScope(
      `planningUnit:${planningUnitId}:structure`,
      async () => {
        const structure = await loadPlanningUnitStructure(planningUnitId)
        return [structure.planningUnit, ...structure.phases, ...structure.activities]
      },
      { completeSnapshot: true },
    )
    if (result.error) throw new Error('No s’ha pogut obrir la programació antiga.')
    return {
      planningUnit: result.entities.find((item) => item.entityType === 'planningUnit') || null,
      phases: sortByOrder(result.entities.filter((item) => item.entityType === 'planningPhase')),
      activities: sortByOrder(result.entities.filter((item) => item.entityType === 'planningActivity')),
    }
  }, [repository])

  const duplicateUnitToAcademicYear = useCallback(async ({ academicYearId, temporalUnitId }) => {
    if (!activePlanningUnit) throw new Error('Cal seleccionar una UP per duplicar-la.')
    const copied = copyPlanningUnitStructureToAcademicYear({
      planningUnit: activePlanningUnit,
      phases,
      activities,
    }, {
      academicYearId,
      temporalUnitId,
      ownerEmailLower: String(user.email || '').trim().toLowerCase(),
    }, { now: new Date().toISOString() })
    await persist([copied.planningUnit, ...copied.phases, ...copied.activities])
    setActivePlanningUnitId(copied.planningUnit.id)
    setActiveAcademicYearId(academicYearId)
    if (academicYearId === activeAcademicYearId) {
      setPlanningUnits((items) => [copied.planningUnit, ...items])
      setPhases(copied.phases)
      setActivities(copied.activities)
    }
    return copied
  }, [activeAcademicYearId, activePlanningUnit, activities, persist, phases, user])

  const copyHistoricalActivity = useCallback(async ({ activity, phaseId, sourceAcademicYearId }) => {
    if (!activePlanningUnitId) throw new Error('Cal seleccionar una UP de destinació.')
    const order = activities.filter((item) => item.phaseId === phaseId).length
    const copy = copyPlanningActivityToPhase(activity, {
      planningUnitId: activePlanningUnitId,
      phaseId,
      order,
      sourceAcademicYearId,
      sourcePlanningUnitId: activity.planningUnitId,
    }, { now: new Date().toISOString() })
    await persist(copy)
    setActivities((items) => sortByOrder([...items, copy]))
    return copy
  }, [activePlanningUnitId, activities, persist])

  const acceptImprovementSuggestions = useCallback(async (proposalIds) => {
    if (!activePlanningUnit) throw new Error('Cal seleccionar una UP.')
    const result = applyImprovementProposals(
      activePlanningUnit,
      activities,
      proposalIds,
      { now: new Date().toISOString() },
    )
    await persist([result.planningUnit, ...result.changedActivities])
    setPlanningUnits((items) => replaceById(items, result.planningUnit))
    setActivities(sortByOrder(result.activities))
    return result
  }, [activePlanningUnit, activities, persist])

  return {
    academicYears,
    activities,
    activeAcademicYear,
    activeAcademicYearId,
    activePlanningUnit,
    activePlanningUnitId,
    archiveUnit,
    acceptImprovementSuggestions,
    copyHistoricalActivity,
    createTemporalUnit: createTemporalUnitForYear,
    createUnit,
    createYear,
    duplicateUnitToAcademicYear,
    error,
    isOnline,
    loading,
    loadHistoricalUnits,
    loadHistoricalUnitStructure,
    loadTemporalUnitsForYear,
    phases,
    planningUnits,
    moveActivity,
    removeActivity,
    saveActivity,
    savePhase,
    saveTemporalUnit,
    saveUnit,
    setActiveAcademicYearId,
    setActivePlanningUnitId,
    setError,
    sync,
    synchronize,
    temporalUnits,
  }
}
