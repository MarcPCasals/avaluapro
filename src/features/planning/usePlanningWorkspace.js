import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  applyPlanningCloudOperation,
  loadOwnedPlanningUnits,
  loadPlanningAccessGrants,
  loadPlanningAcademicYears,
  loadPlanningActivityOverrides,
  loadPlanningApplications,
  loadPlanningSessionDetail,
  loadPlanningSessions,
  loadPlanningTemporalUnits,
  loadPlanningUnitStructure,
  loadSharedPlanningUnits,
  revokePlanningAccessGrant,
  savePlanningAccessGrant,
} from '../../data/cloud/planningFirestore'
import { createPlanningRepository } from '../../data/planningRepository'
import {
  copyPlanningActivityToPhase,
  copyPlanningUnitStructureToAcademicYear,
  createAccessGrant,
  createAcademicYear,
  createGroupActivityOverride,
  createGroupApplication,
  createPlanningActivity,
  createPlanningPhase,
  createPlanningUnit,
  createTemporalUnit,
} from '../../domain/planning/model'
import {
  applyPlanningActivityOverrides,
  getPlanningActivityOverrideSnapshot,
  getPlanningUnitsForClass,
} from '../../domain/planning/classPlanning'
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

function comparableLabel(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('ca').trim()
}

/**
 * Manté el primer flux vertical de Programació fora del component visual. Tota
 * escriptura passa pel repositori local-first i la interfície només rep l'estat
 * final de la cua, sense confondre el desament local amb la confirmació remota.
 */
export function usePlanningWorkspace(user, activeClassId = '', options = {}) {
  const tutoringSpaceId = String(options.tutoringSpaceId || '').trim()
  const [academicYears, setAcademicYears] = useState([])
  const [temporalUnits, setTemporalUnits] = useState([])
  const [planningUnits, setPlanningUnits] = useState([])
  const [sharedPlanningUnits, setSharedPlanningUnits] = useState([])
  const [applications, setApplications] = useState([])
  const [applicationsLoading, setApplicationsLoading] = useState(true)
  const [accessGrants, setAccessGrants] = useState([])
  const [phases, setPhases] = useState([])
  const [activities, setActivities] = useState([])
  const [activityOverrides, setActivityOverrides] = useState([])
  const [activityOverridesLoading, setActivityOverridesLoading] = useState(false)
  const [activeAcademicYearId, setActiveAcademicYearId] = useState('')
  const [activePlanningUnitId, setActivePlanningUnitId] = useState('')
  const [loading, setLoading] = useState(true)
  const [sharedLoading, setSharedLoading] = useState(true)
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

  const allPlanningUnits = useMemo(() => Array.from(new Map(
    [...planningUnits, ...sharedPlanningUnits].map((item) => [item.id, item]),
  ).values()), [planningUnits, sharedPlanningUnits])
  const classPlanningUnits = useMemo(() => tutoringSpaceId
    ? allPlanningUnits.filter((unit) => unit.tutoringSpaceId === tutoringSpaceId)
    : getPlanningUnitsForClass(allPlanningUnits, applications, activeClassId),
  [activeClassId, allPlanningUnits, applications, tutoringSpaceId])
  const activeAcademicYear = academicYears.find((item) => item.id === activeAcademicYearId) || null
  const activePlanningUnit = classPlanningUnits.find((item) => item.id === activePlanningUnitId) || null
  const userEmail = String(user?.email || '').trim().toLowerCase()
  const activeRole = activePlanningUnit?.ownerUid === user?.uid
    ? 'owner'
    : activePlanningUnit?.accessByEmail?.[userEmail]?.role || ''
  const canEditActiveUnit = ['owner', 'planningEditor', 'tutoringCollaborator'].includes(activeRole)
  const canManageActiveAgenda = ['owner', 'planningAgendaEditor', 'tutoringCollaborator'].includes(activeRole)
  const canReadActiveApplications = activeRole === 'owner'
    || activeRole === 'directionReader'
    || activeRole === 'planningAgendaEditor'
    || activeRole === 'tutoringCollaborator'
  const activeApplication = applications.find((application) => (
    application.planningUnitId === activePlanningUnitId
    && application.classId === activeClassId
    && (!(activePlanningUnit?.tutoringSpaceId || activeRole === 'tutoringCollaborator')
      || (application.managerUid || application.ownerUid) === user?.uid)
    && application.status !== 'archived'
  )) || null
  const effectiveActivities = useMemo(
    () => applyPlanningActivityOverrides(activities, activityOverrides),
    [activities, activityOverrides],
  )

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
    if (!repository || !userEmail) {
      queueMicrotask(() => !cancelled && setSharedLoading(false))
      return () => { cancelled = true }
    }
    queueMicrotask(() => !cancelled && setSharedLoading(true))
    repository.loadScope(
      `sharedPlanningUnits:${userEmail}`,
      () => loadSharedPlanningUnits(userEmail, { maxItems: 100 }),
      { completeSnapshot: true },
    ).then((result) => {
      if (cancelled) return
      const shared = result.entities
        .filter((unit) => unit.ownerUid !== user?.uid)
        .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
      setSharedPlanningUnits(shared)
      setActivePlanningUnitId((current) => current || shared[0]?.id || '')
      if (result.error && result.entities.length === 0) {
        setError('No s’han pogut comprovar les programacions compartides amb tu.')
      }
    }).catch((loadError) => !cancelled && setError(loadError.message || 'No s’han pogut carregar les programacions compartides.'))
      .finally(() => !cancelled && setSharedLoading(false))
    return () => { cancelled = true }
  }, [repository, user?.uid, userEmail])

  const applicationUnitKey = useMemo(
    () => allPlanningUnits.map((unit) => `${unit.id}:${unit.ownerUid}`).sort().join('|'),
    [allPlanningUnits],
  )

  useEffect(() => {
    let cancelled = false
    if (!repository || !applicationUnitKey) {
      queueMicrotask(() => {
        if (!cancelled) {
          setApplications([])
          setApplicationsLoading(false)
        }
      })
      return () => { cancelled = true }
    }
    queueMicrotask(() => !cancelled && setApplicationsLoading(true))
    const units = allPlanningUnits
    Promise.all(units.map(async (unit) => {
      const role = unit.ownerUid === user?.uid
        ? 'owner'
        : unit.accessByEmail?.[userEmail]?.role || ''
      const allowedClassIds = role === 'planningAgendaEditor'
        ? unit.accessByEmail?.[userEmail]?.classIds || []
        : []
      if (!['owner', 'directionReader', 'planningAgendaEditor', 'tutoringCollaborator'].includes(role)) return []
      if (role === 'planningAgendaEditor' && allowedClassIds.length === 0) return []
      // La UP de tutoria és comuna, però cada docent només carrega la seva
      // aplicació: calendari, ajustos i sessions continuen sent personals.
      if (role === 'tutoringCollaborator' || (role === 'owner' && unit.tutoringSpaceId)) {
        const result = await repository.loadScope(
          `planningUnit:${unit.id}:applications:manager:${user.uid}`,
          () => loadPlanningApplications(unit.id, undefined, 100, user.uid),
          { completeSnapshot: true },
        )
        return result.entities
      }
      const results = allowedClassIds.length > 0
        ? await Promise.all(allowedClassIds.map((classId) => repository.loadScope(
            `planningUnit:${unit.id}:applications:${classId}`,
            () => loadPlanningApplications(unit.id, classId, 100),
            { completeSnapshot: true },
          )))
        : [await repository.loadScope(
            `planningUnit:${unit.id}:applications`,
            () => loadPlanningApplications(unit.id, undefined, 100),
            { completeSnapshot: true },
          )]
      return results.flatMap((result) => result.entities)
    })).then((groups) => {
      if (cancelled) return
      setApplications(Array.from(new Map(groups.flat().map((item) => [item.id, item])).values()))
    }).catch((loadError) => {
      if (!cancelled) setError(loadError.message || 'No s’han pogut carregar les connexions entre classes i programacions.')
    }).finally(() => !cancelled && setApplicationsLoading(false))
    return () => { cancelled = true }
  // Només recarreguem quan canvia el conjunt de UP; les edicions internes no
  // han de provocar consultes repetides de totes les connexions.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationUnitKey, repository, user?.uid, userEmail])

  useEffect(() => {
    if (applicationsLoading) return
    queueMicrotask(() => setActivePlanningUnitId((current) => classPlanningUnits.some((unit) => unit.id === current)
      ? current
      : classPlanningUnits.find((unit) => unit.status !== 'archived')?.id || classPlanningUnits[0]?.id || ''))
  }, [applicationsLoading, classPlanningUnits])

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
      if (unit) {
        if (unit.ownerUid === user?.uid) setPlanningUnits((items) => replaceById(items, unit))
        else setSharedPlanningUnits((items) => replaceById(items, unit))
      }
      setPhases(sortByOrder(result.entities.filter((item) => item.entityType === 'planningPhase')))
      setActivities(sortByOrder(result.entities.filter((item) => item.entityType === 'planningActivity')))
      if (result.error) setError('La UP mostra la còpia local perquè Firebase no ha respost.')
    }).catch((loadError) => !cancelled && setError(loadError.message || 'No s’ha pogut obrir aquesta UP.'))
    return () => { cancelled = true }
  }, [activePlanningUnitId, repository, user?.uid])

  useEffect(() => {
    let cancelled = false
    if (!repository || !activePlanningUnitId || !activeApplication?.id) {
      queueMicrotask(() => {
        if (cancelled) return
        setActivityOverrides([])
        setActivityOverridesLoading(false)
      })
      return () => { cancelled = true }
    }
    queueMicrotask(() => !cancelled && setActivityOverridesLoading(true))
    repository.loadScope(
      `application:${activeApplication.id}:overrides`,
      () => loadPlanningActivityOverrides(activePlanningUnitId, activeApplication.id),
      { completeSnapshot: true },
    ).then((result) => {
      if (cancelled) return
      setActivityOverrides(result.entities)
      if (result.error) setError('La programació del grup mostra la còpia local perquè Firebase no ha respost.')
    }).catch((loadError) => {
      if (!cancelled) setError(loadError.message || 'No s’han pogut carregar els canvis propis d’aquest grup.')
    }).finally(() => !cancelled && setActivityOverridesLoading(false))
    return () => { cancelled = true }
  }, [activeApplication?.id, activePlanningUnitId, repository])

  useEffect(() => {
    let cancelled = false
    if (!activePlanningUnit || activePlanningUnit.ownerUid !== user?.uid) {
      queueMicrotask(() => !cancelled && setAccessGrants([]))
      return () => { cancelled = true }
    }
    loadPlanningAccessGrants(activePlanningUnit.id)
      .then((grants) => !cancelled && setAccessGrants(grants))
      .catch(() => !cancelled && setError('No s’han pogut carregar els accessos d’aquesta UP.'))
    return () => { cancelled = true }
  }, [activePlanningUnit, user?.uid])

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

  const createUnit = useCallback(async (values, classContext = {}) => {
    const now = new Date().toISOString()
    const unit = {
      ...createPlanningUnit({
        ...values,
        academicYearId: activeAcademicYearId,
        ownerUid: user.uid,
        status: 'draft',
        tutoringSpaceId,
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
    const application = classContext.classId ? createGroupApplication({
      academicYearId: activeAcademicYearId,
      classId: classContext.classId,
      classLabel: classContext.classLabel || '',
      managerUid: user.uid,
      ownerUid: user.uid,
      planningUnitId: unit.id,
      planningUnitVersion: unit.versionNumber,
      status: 'draft',
    }, { now }) : null
    await persist([unit, ...defaultPhases, ...(application ? [application] : [])])
    setPlanningUnits((items) => [unit, ...items])
    if (application) setApplications((items) => replaceById(items, application))
    setPhases(defaultPhases)
    setActivities([])
    setActivePlanningUnitId(unit.id)
    return unit
  }, [activeAcademicYearId, persist, tutoringSpaceId, user])

  const connectUnitToClass = useCallback(async (unit, classContext = {}) => {
    if (!unit?.id || !classContext.classId) throw new Error('Selecciona una UP i una classe per connectar-les.')
    const existing = applications.find((application) => (
      application.planningUnitId === unit.id
      && application.classId === classContext.classId
      && (application.managerUid || application.ownerUid) === user.uid
      && application.status !== 'archived'
    ))
    if (existing) {
      setActivePlanningUnitId(unit.id)
      return existing
    }
    const now = new Date().toISOString()
    const application = createGroupApplication({
      // Cada cotutor conserva el seu curs/horari privat encara que la UP
      // compartida provingui del curs creat pel propietari.
      academicYearId: activeAcademicYearId || unit.academicYearId,
      classId: classContext.classId,
      classLabel: classContext.classLabel || '',
      managerUid: user.uid,
      ownerUid: unit.ownerUid,
      planningUnitId: unit.id,
      planningUnitVersion: unit.versionNumber,
      status: 'draft',
    }, { now })
    await persist(application)
    setApplications((items) => replaceById(items, application))
    setActivePlanningUnitId(unit.id)
    return application
  }, [activeAcademicYearId, applications, persist, user.uid])

  /**
   * Una importació sempre crea una UP nova i regenera tots els identificadors.
   * Això impedeix heretar permisos, propietaris o vincles del fitxer d’origen.
   */
  const importPlanningBundle = useCallback(async (bundle, temporalUnitId, classContext = {}) => {
    if (!activeAcademicYearId || !temporalUnitId) throw new Error('Selecciona la UT on vols crear la còpia importada.')
    const now = new Date().toISOString()
    const importedCurriculum = Object.fromEntries(
      ['competencies', 'expectedLearnings', 'assessmentCriteria', 'indicators'].map((key) => [
        key,
        (bundle.unit.curriculum?.[key] || []).map((item) => ({ ...item, id: null })),
      ]),
    )
    const unit = {
      ...createPlanningUnit({
        ...bundle.unit,
        academicYearId: activeAcademicYearId,
        curriculum: importedCurriculum,
        id: null,
        ownerUid: user.uid,
        status: 'draft',
        temporalUnitId,
        tutoringSpaceId,
      }, { now }),
      accessByEmail: {},
      authorizedEmails: [],
      ownerEmailLower: String(user.email || '').trim().toLowerCase(),
    }
    const phaseIdByKey = new Map()
    const importedPhases = []
    const pendingPhases = [...bundle.phases]
    while (pendingPhases.length) {
      const sourceIndex = pendingPhases.findIndex((source) => !source.parentKey || phaseIdByKey.has(source.parentKey))
      if (sourceIndex < 0) throw new Error('Les fases importades contenen una jerarquia no vàlida.')
      const [source] = pendingPhases.splice(sourceIndex, 1)
      const phase = createPlanningPhase({
        kind: source.kind || 'custom',
        order: Number.isFinite(Number(source.order)) ? Number(source.order) : 0,
        ownerUid: user.uid,
        parentPhaseId: source.parentKey ? phaseIdByKey.get(source.parentKey) || null : null,
        planningUnitId: unit.id,
        title: source.title,
      }, { now })
      phaseIdByKey.set(source.key, phase.id)
      importedPhases.push(phase)
    }
    const indicatorByLabel = new Map((unit.curriculum?.indicators || [])
      .map((indicator) => [comparableLabel(indicator.label), indicator.id]))
    const importedActivities = bundle.activities.map((source, index) => createPlanningActivity({
      ...source,
      diversityMeasures: (source.diversityMeasures || []).map((measure) => ({ ...measure, id: null })),
      id: null,
      indicatorIds: (source.indicatorLabels || []).map((label) => indicatorByLabel.get(comparableLabel(label))).filter(Boolean),
      order: Number.isFinite(Number(source.order)) ? Number(source.order) : index,
      ownerUid: user.uid,
      phaseId: phaseIdByKey.get(source.phaseKey),
      planningUnitId: unit.id,
      studentMaterials: (source.studentMaterials || []).map((material) => ({ ...material, id: null })),
      teacherMaterials: (source.teacherMaterials || []).map((material) => ({ ...material, id: null })),
    }, { now }))
    const application = classContext.classId ? createGroupApplication({
      academicYearId: activeAcademicYearId,
      classId: classContext.classId,
      classLabel: classContext.classLabel || '',
      managerUid: user.uid,
      ownerUid: user.uid,
      planningUnitId: unit.id,
      planningUnitVersion: unit.versionNumber,
      status: 'draft',
    }, { now }) : null
    await persist([unit, ...importedPhases, ...importedActivities, ...(application ? [application] : [])])
    setPlanningUnits((items) => [unit, ...items])
    if (application) setApplications((items) => replaceById(items, application))
    setPhases(sortByOrder(importedPhases))
    setActivities(sortByOrder(importedActivities))
    setActivePlanningUnitId(unit.id)
    return unit
  }, [activeAcademicYearId, persist, tutoringSpaceId, user])

  const saveUnit = useCallback(async (current, values) => {
    const next = preserveSharingFields(current, createPlanningUnit({
      ...current,
      ...values,
      updatedAt: new Date().toISOString(),
    }))
    await persist(next)
    if (next.ownerUid === user?.uid) setPlanningUnits((items) => replaceById(items, next))
    else setSharedPlanningUnits((items) => replaceById(items, next))
    return next
  }, [persist, user])

  /**
   * Afegeix files previsualitzades d’Excel/Numbers a la UP activa. Les fases i
   * els IA desconeguts s’incorporen abans de crear les activitats.
   */
  const importPlanningTable = useCallback(async (rows, fallbackPhaseId) => {
    if (!activePlanningUnit || rows.length === 0) throw new Error('No hi ha cap activitat per importar.')
    const now = new Date().toISOString()
    const nextPhases = [...phases]
    const createdPhases = []
    const findRoot = (label) => {
      const normalized = comparableLabel(label)
      return nextPhases.find((phase) => !phase.parentPhaseId && (
        comparableLabel(phase.title) === normalized
        || normalized.includes(comparableLabel(phase.kind))
        || (phase.kind === 'preparation' && normalized.includes('preparaci'))
        || (phase.kind === 'resolution' && normalized.includes('resoluci'))
        || (phase.kind === 'closing' && normalized.includes('tancament'))
      )) || nextPhases.find((phase) => phase.id === fallbackPhaseId) || nextPhases[0]
    }
    const resolvePhase = (row) => {
      const root = findRoot(row.phaseLabel)
      if (!root) throw new Error('La UP necessita almenys una fase.')
      if (!row.subphaseLabel) return root
      const normalized = comparableLabel(row.subphaseLabel)
      let child = nextPhases.find((phase) => phase.parentPhaseId === root.id && comparableLabel(phase.title) === normalized)
      if (!child) {
        child = createPlanningPhase({
          kind: root.kind,
          order: nextPhases.filter((phase) => phase.parentPhaseId === root.id).length,
          ownerUid: activePlanningUnit.ownerUid,
          parentPhaseId: root.id,
          planningUnitId: activePlanningUnit.id,
          title: row.subphaseLabel,
        }, { now })
        nextPhases.push(child)
        createdPhases.push(child)
      }
      return child
    }
    const newIndicatorLabels = [...new Set(rows.flatMap((row) => row.indicatorLabels || []))]
      .filter((label) => !(activePlanningUnit.curriculum?.indicators || [])
        .some((indicator) => comparableLabel(indicator.label) === comparableLabel(label)))
    const nextUnit = newIndicatorLabels.length ? preserveSharingFields(activePlanningUnit, createPlanningUnit({
      ...activePlanningUnit,
      curriculum: {
        ...activePlanningUnit.curriculum,
        indicators: [
          ...(activePlanningUnit.curriculum?.indicators || []),
          ...newIndicatorLabels.map((label) => ({ label })),
        ],
      },
      updatedAt: now,
    })) : activePlanningUnit
    const indicatorByLabel = new Map((nextUnit.curriculum?.indicators || [])
      .map((indicator) => [comparableLabel(indicator.label), indicator.id]))
    const rowPhases = rows.map(resolvePhase)
    const imported = rows.map((row, index) => {
      const phase = rowPhases[index]
      return createPlanningActivity({
        ...row,
        indicatorIds: (row.indicatorLabels || []).map((label) => indicatorByLabel.get(comparableLabel(label))).filter(Boolean),
        order: activities.filter((activity) => activity.phaseId === phase.id).length
          + rowPhases.slice(0, index).filter((candidate) => candidate.id === phase.id).length,
        ownerUid: activePlanningUnit.ownerUid,
        phaseId: phase.id,
        planningUnitId: activePlanningUnit.id,
      }, { now })
    })
    const changedUnit = nextUnit !== activePlanningUnit
    await persist([...(changedUnit ? [nextUnit] : []), ...createdPhases, ...imported])
    if (changedUnit) setPlanningUnits((items) => replaceById(items, nextUnit))
    setPhases(sortByOrder(nextPhases))
    setActivities((items) => sortByOrder([...items, ...imported]))
    return imported
  }, [activePlanningUnit, activities, persist, phases])

  const archiveUnit = useCallback((unit) => saveUnit(unit, { status: 'archived' }), [saveUnit])

  const savePhase = useCallback(async (values, current = null) => {
    const next = createPlanningPhase({
      ...(current || {}),
      ...values,
      order: current?.order ?? phases.length,
      ownerUid: activePlanningUnit?.ownerUid || user.uid,
      planningUnitId: activePlanningUnitId,
      updatedAt: new Date().toISOString(),
    })
    await persist(next)
    setPhases((items) => sortByOrder(replaceById(items, next)))
    return next
  }, [activePlanningUnit, activePlanningUnitId, persist, phases.length, user])

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
      ownerUid: activePlanningUnit?.ownerUid || user.uid,
      planningUnitId: activePlanningUnitId,
      updatedAt: now,
    })
    await persist(next)
    setActivities((items) => sortByOrder(replaceById(items, next)))
    return next
  }, [activePlanningUnit, activePlanningUnitId, activities, persist, user])

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

  const saveGroupActivitySnapshots = useCallback(async (nextEffectiveActivities, activityIds, hiddenIds = []) => {
    if (!activeApplication || !activePlanningUnit) {
      throw new Error('No s’ha trobat la connexió d’aquesta classe amb la UP.')
    }
    const now = new Date().toISOString()
    const hidden = new Set(hiddenIds)
    const nextOverrides = activityIds.map((activityId) => {
      const activity = nextEffectiveActivities.find((item) => item.id === activityId)
        || effectiveActivities.find((item) => item.id === activityId)
        || activities.find((item) => item.id === activityId)
      if (!activity) throw new Error("No s'ha trobat l'activitat que es vol adaptar")
      return createGroupActivityOverride({
        activityId,
        applicationId: activeApplication.id,
        changeScope: 'groupOnly',
        changes: getPlanningActivityOverrideSnapshot(activity, { hidden: hidden.has(activityId) }),
        ownerUid: activePlanningUnit.ownerUid,
      }, { now })
    })
    await persist(nextOverrides.map((entity) => ({
      entity,
      context: { applicationId: activeApplication.id, planningUnitId: activePlanningUnit.id },
    })))
    setActivityOverrides((items) => [...items, ...nextOverrides])
    return nextOverrides
  }, [activeApplication, activePlanningUnit, activities, effectiveActivities, persist])

  const saveActivityForActiveClass = useCallback(async (values, current = null) => {
    const now = new Date().toISOString()
    if (!activeApplication || !activePlanningUnit) {
      throw new Error('No s’ha trobat la connexió d’aquesta classe amb la UP.')
    }
    if (!current) {
      // Una activitat nova existeix a la UP base, però queda amagada a les
      // altres classes que ja hi estan connectades. Així només apareix al grup
      // que el docent ha triat sense crear una segona programació paral·lela.
      const activity = createPlanningActivity({
        ...values,
        order: effectiveActivities.filter((item) => item.phaseId === values.phaseId).length,
        ownerUid: activePlanningUnit.ownerUid,
        planningUnitId: activePlanningUnit.id,
        updatedAt: now,
      }, { now })
      const otherApplications = applications.filter((application) => (
        application.planningUnitId === activePlanningUnit.id
        && application.id !== activeApplication.id
        && application.status !== 'archived'
      ))
      const hiddenOverrides = otherApplications.map((application) => createGroupActivityOverride({
        activityId: activity.id,
        applicationId: application.id,
        changeScope: 'groupOnly',
        changes: getPlanningActivityOverrideSnapshot(activity, { hidden: true }),
        ownerUid: activePlanningUnit.ownerUid,
      }, { now }))
      await persist([
        activity,
        ...hiddenOverrides.map((entity) => ({
          entity,
          context: { applicationId: entity.applicationId, planningUnitId: activePlanningUnit.id },
        })),
      ])
      setActivities((items) => sortByOrder([...items, activity]))
      return activity
    }

    const staged = createPlanningActivity({
      ...current,
      ...values,
      order: current.order,
      ownerUid: activePlanningUnit.ownerUid,
      planningUnitId: activePlanningUnit.id,
      updatedAt: now,
    }, { now })
    let nextEffectiveActivities = replaceById(effectiveActivities, staged)
    let changedActivityIds = [staged.id]
    if (values.phaseId !== current.phaseId) {
      const moved = movePlanningActivityInSequence(
        replaceById(effectiveActivities, { ...staged, phaseId: current.phaseId }),
        { activityId: staged.id, targetPhaseId: values.phaseId },
        { now },
      )
      nextEffectiveActivities = moved.activities
      changedActivityIds = [...new Set(moved.changedActivities.map((activity) => activity.id))]
    }
    await saveGroupActivitySnapshots(nextEffectiveActivities, changedActivityIds)
    return nextEffectiveActivities.find((activity) => activity.id === staged.id)
  }, [activeApplication, activePlanningUnit, applications, effectiveActivities, persist, saveGroupActivitySnapshots])

  const moveActivityForActiveClass = useCallback(async (move) => {
    const result = movePlanningActivityInSequence(effectiveActivities, move, { now: new Date().toISOString() })
    if (result.changedActivities.length === 0) return result
    await saveGroupActivitySnapshots(
      result.activities,
      [...new Set(result.changedActivities.map((activity) => activity.id))],
    )
    return result
  }, [effectiveActivities, saveGroupActivitySnapshots])

  const removeActivityForActiveClass = useCallback(async (activity) => {
    await saveGroupActivitySnapshots(effectiveActivities, [activity.id], [activity.id])
    return activity
  }, [effectiveActivities, saveGroupActivitySnapshots])

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

  const duplicateUnitToAcademicYear = useCallback(async ({ academicYearId, temporalUnitId }, classContext = {}) => {
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
    const application = classContext.classId ? createGroupApplication({
      academicYearId,
      classId: classContext.classId,
      classLabel: classContext.classLabel || '',
      managerUid: user.uid,
      ownerUid: copied.planningUnit.ownerUid,
      planningUnitId: copied.planningUnit.id,
      planningUnitVersion: copied.planningUnit.versionNumber,
      status: 'draft',
    }, { now: new Date().toISOString() }) : null
    await persist([copied.planningUnit, ...copied.phases, ...copied.activities, ...(application ? [application] : [])])
    if (application) setApplications((items) => replaceById(items, application))
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
    if (result.planningUnit.ownerUid === user?.uid) {
      setPlanningUnits((items) => replaceById(items, result.planningUnit))
    } else {
      setSharedPlanningUnits((items) => replaceById(items, result.planningUnit))
    }
    setActivities(sortByOrder(result.activities))
    return result
  }, [activePlanningUnit, activities, persist, user])

  const refreshActiveUnitFromCloud = useCallback(async () => {
    if (!repository || !activePlanningUnitId) return null
    const result = await repository.loadScope(
      `planningUnit:${activePlanningUnitId}:structure`,
      async () => {
        const structure = await loadPlanningUnitStructure(activePlanningUnitId)
        return [structure.planningUnit, ...structure.phases, ...structure.activities]
      },
      { completeSnapshot: true },
    )
    if (result.error) throw new Error('Firebase no ha confirmat el canvi d’accés.')
    const unit = result.entities.find((item) => item.entityType === 'planningUnit') || null
    if (unit) {
      if (unit.ownerUid === user?.uid) setPlanningUnits((items) => replaceById(items, unit))
      else setSharedPlanningUnits((items) => replaceById(items, unit))
    }
    setPhases(sortByOrder(result.entities.filter((item) => item.entityType === 'planningPhase')))
    setActivities(sortByOrder(result.entities.filter((item) => item.entityType === 'planningActivity')))
    return unit
  }, [activePlanningUnitId, repository, user])

  const saveAccessGrant = useCallback(async ({ classIds = [], email, role }) => {
    if (!activePlanningUnit || activeRole !== 'owner') throw new Error('Només el propietari pot gestionar els accessos.')
    if (!isOnline) throw new Error('Cal connexió per canviar qui pot accedir a la UP.')
    const cleanEmail = String(email || '').trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) throw new Error('Escriu el correu complet de la persona convidada.')
    if (cleanEmail === userEmail) throw new Error('El teu compte ja és el propietari de la UP.')
    const allowedClassIds = role === 'planningAgendaEditor' ? [...new Set(classIds.filter(Boolean))] : []
    if (role === 'planningAgendaEditor' && allowedClassIds.length === 0) {
      throw new Error('Selecciona almenys un grup per compartir l’Agenda.')
    }
    const syncSummary = await synchronize()
    if (syncSummary.conflictCount || syncSummary.pendingCount) {
      throw new Error('Acaba de sincronitzar els canvis de la UP abans de modificar els accessos.')
    }
    const current = accessGrants.find((grant) => grant.granteeEmail === cleanEmail)
    const grant = createAccessGrant({
      ...(current || {}),
      classIds: allowedClassIds,
      granteeEmail: cleanEmail,
      ownerUid: activePlanningUnit.ownerUid,
      planningUnitId: activePlanningUnit.id,
      role,
      status: 'active',
      updatedAt: new Date().toISOString(),
    })
    await savePlanningAccessGrant(activePlanningUnit.id, grant)
    await refreshActiveUnitFromCloud()
    setAccessGrants(await loadPlanningAccessGrants(activePlanningUnit.id))
    return grant
  }, [accessGrants, activePlanningUnit, activeRole, isOnline, refreshActiveUnitFromCloud, synchronize, userEmail])

  /**
   * Manté la coedició tutorial alineada amb els membres de la cotutoria. Només
   * el propietari crea concessions i mai no amplia l'accés a altres UP.
   */
  const syncTutoringCollaborators = useCallback(async (emails = []) => {
    if (!activePlanningUnit || activePlanningUnit.ownerUid !== user?.uid || !activePlanningUnit.tutoringSpaceId) return []
    if (!isOnline) return []
    const targets = [...new Set(emails
      .map((email) => String(email || '').trim().toLowerCase())
      .filter((email) => email && email !== userEmail && email.includes('@')))]
    const targetSet = new Set(targets)
    const additions = targets.filter((email) => (
      activePlanningUnit.accessByEmail?.[email]?.role !== 'tutoringCollaborator'
      || activePlanningUnit.accessByEmail?.[email]?.status !== 'active'
    ))
    const removals = Object.entries(activePlanningUnit.accessByEmail || {})
      .filter(([email, access]) => (
        access?.role === 'tutoringCollaborator'
        && access?.status === 'active'
        && !targetSet.has(email)
      ))
      .map(([email]) => email)
    if (additions.length === 0 && removals.length === 0) return []
    const syncSummary = await synchronize()
    if (syncSummary.conflictCount || syncSummary.pendingCount) {
      throw new Error('Acaba de sincronitzar la UP abans d’actualitzar la cotutoria compartida.')
    }
    const saved = []
    for (const email of additions) {
      const current = accessGrants.find((grant) => grant.granteeEmail === email)
      const grant = createAccessGrant({
        ...(current || {}),
        classIds: [],
        granteeEmail: email,
        ownerUid: activePlanningUnit.ownerUid,
        planningUnitId: activePlanningUnit.id,
        role: 'tutoringCollaborator',
        status: 'active',
        updatedAt: new Date().toISOString(),
      })
      saved.push(await savePlanningAccessGrant(activePlanningUnit.id, grant))
    }
    for (const email of removals) {
      await revokePlanningAccessGrant(activePlanningUnit.id, email)
      saved.push({ granteeEmail: email, status: 'revoked' })
    }
    await refreshActiveUnitFromCloud()
    setAccessGrants(await loadPlanningAccessGrants(activePlanningUnit.id))
    return saved
  }, [accessGrants, activePlanningUnit, isOnline, refreshActiveUnitFromCloud, synchronize, user, userEmail])

  const revokeAccessGrant = useCallback(async (grant) => {
    if (!activePlanningUnit || activeRole !== 'owner') throw new Error('Només el propietari pot retirar accessos.')
    if (!isOnline) throw new Error('Cal connexió per retirar un accés.')
    const syncSummary = await synchronize()
    if (syncSummary.conflictCount || syncSummary.pendingCount) {
      throw new Error('Acaba de sincronitzar els canvis de la UP abans de modificar els accessos.')
    }
    await revokePlanningAccessGrant(activePlanningUnit.id, grant.granteeEmail)
    await refreshActiveUnitFromCloud()
    setAccessGrants(await loadPlanningAccessGrants(activePlanningUnit.id))
    return grant.granteeEmail
  }, [activePlanningUnit, activeRole, isOnline, refreshActiveUnitFromCloud, synchronize])

  const loadApplicationOverview = useCallback(async (planningUnit = activePlanningUnit) => {
    if (!repository || !planningUnit) return []
    const role = planningUnit.ownerUid === user?.uid
      ? 'owner'
      : planningUnit.accessByEmail?.[userEmail]?.role || ''
    if (!['owner', 'directionReader', 'planningAgendaEditor', 'tutoringCollaborator'].includes(role)) return []
    const allowedClassIds = role === 'planningAgendaEditor'
      ? planningUnit.accessByEmail?.[userEmail]?.classIds || []
      : []
    if (role === 'planningAgendaEditor' && allowedClassIds.length === 0) return []
    const applicationResults = role === 'tutoringCollaborator'
      || (role === 'owner' && planningUnit.tutoringSpaceId)
      ? [await repository.loadScope(
          `planningUnit:${planningUnit.id}:applications:manager:${user.uid}`,
          () => loadPlanningApplications(planningUnit.id, undefined, 100, user.uid),
          { completeSnapshot: true },
        )]
      : allowedClassIds.length > 0
      ? await Promise.all(allowedClassIds.map((classId) => repository.loadScope(
          `planningUnit:${planningUnit.id}:applications:${classId}`,
          () => loadPlanningApplications(planningUnit.id, classId, 100),
          { completeSnapshot: true },
        )))
      : [await repository.loadScope(
          `planningUnit:${planningUnit.id}:applications`,
          () => loadPlanningApplications(planningUnit.id, undefined, 100),
          { completeSnapshot: true },
        )]
    const applications = Array.from(new Map(applicationResults
      .flatMap((result) => result.entities)
      .map((application) => [application.id, application])).values())
      .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
    return Promise.all(applications.map(async (application) => {
      const sessionResult = await repository.loadScope(
        `application:${application.id}:sessions`,
        () => loadPlanningSessions({
          applicationId: application.id,
          from: '0000-01-01T00:00:00',
          maxItems: 500,
          planningUnitId: planningUnit.id,
          to: '9999-12-31T23:59:59',
        }),
        { completeSnapshot: true },
      )
      const sessions = [...sessionResult.entities]
        .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
      const detailResults = await Promise.all(sessions.map((session) => repository.loadScope(
        `session:${session.id}:detail`,
        async () => {
          const detail = await loadPlanningSessionDetail(planningUnit.id, application.id, session.id)
          return [detail.session, ...detail.items, ...detail.results]
        },
        { completeSnapshot: true },
      )))
      return {
        application,
        sessions: sessions.map((session, index) => ({
          items: detailResults[index].entities
            .filter((entity) => entity.entityType === 'sessionItem')
            .sort((left, right) => Number(left.order) - Number(right.order)),
          results: detailResults[index].entities.filter((entity) => entity.entityType === 'activityResult'),
          session,
        })),
      }
    }))
  }, [activePlanningUnit, repository, user, userEmail])

  return {
    accessGrants,
    academicYears,
    activities: effectiveActivities,
    activityOverrides,
    activeAcademicYear,
    activeAcademicYearId,
    activePlanningUnit,
    activePlanningUnitId,
    activeApplication,
    activeRole,
    applications,
    applicationsLoading,
    archiveUnit,
    acceptImprovementSuggestions,
    copyHistoricalActivity,
    canEditActiveUnit,
    canManageActiveAgenda,
    canReadActiveApplications,
    classPlanningUnits,
    connectUnitToClass,
    createTemporalUnit: createTemporalUnitForYear,
    createUnit,
    createYear,
    duplicateUnitToAcademicYear,
    error,
    importPlanningBundle,
    importPlanningTable,
    isOnline,
    loading: loading || sharedLoading || applicationsLoading || activityOverridesLoading,
    loadHistoricalUnits,
    loadHistoricalUnitStructure,
    loadTemporalUnitsForYear,
    loadApplicationOverview,
    phases,
    ownedPlanningUnits: planningUnits,
    planningUnits: allPlanningUnits,
    moveActivity,
    moveActivityForActiveClass,
    removeActivity,
    removeActivityForActiveClass,
    saveActivity,
    saveActivityForActiveClass,
    saveAccessGrant,
    savePhase,
    saveTemporalUnit,
    saveUnit,
    setActiveAcademicYearId,
    setActivePlanningUnitId,
    setError,
    sharedPlanningUnits,
    sync,
    syncTutoringCollaborators,
    synchronize,
    temporalUnits,
    revokeAccessGrant,
  }
}
