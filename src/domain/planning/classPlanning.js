/**
 * Retorna les aplicacions actives que connecten una UP amb classes concretes.
 * La connexió reutilitza l'entitat que ja fa servir l'Agenda, de manera que la
 * Programació i les sessions comparteixen una sola font pedagògica.
 */
export function getActivePlanningApplications(applications = [], planningUnitId = '') {
  return applications.filter((application) => (
    application.planningUnitId === planningUnitId
    && application.status !== 'archived'
  ))
}

export function getConnectedClassIds(applications = [], planningUnitId = '') {
  return [...new Set(getActivePlanningApplications(applications, planningUnitId)
    .map((application) => application.classId)
    .filter(Boolean))]
}

/**
 * Una classe només veu les UP que tenen una aplicació seva. Les UP antigues
 * sense grup continuen disponibles per connectar-les manualment, però no es
 * mostren per error a totes les classes.
 */
export function getPlanningUnitsForClass(planningUnits = [], applications = [], classId = '') {
  if (!classId) return []
  const connectedUnitIds = new Set(applications
    .filter((application) => application.classId === classId && application.status !== 'archived')
    .map((application) => application.planningUnitId))
  return planningUnits.filter((unit) => connectedUnitIds.has(unit.id))
}

export function getConnectablePlanningUnits(planningUnits = [], applications = [], classId = '') {
  const connectedIds = new Set(getPlanningUnitsForClass(planningUnits, applications, classId)
    .map((unit) => unit.id))
  return planningUnits.filter((unit) => unit.status !== 'archived' && !connectedIds.has(unit.id))
}

const ACTIVITY_OVERRIDE_FIELDS = Object.freeze([
  'applicationComment',
  'description',
  'diversityMeasureIds',
  'diversityMeasures',
  'evidenceMode',
  'grouping',
  'indicatorIds',
  'order',
  'pedagogicalType',
  'phaseId',
  'plannedMinutes',
  'space',
  'studentMaterials',
  'teacherMaterials',
  'title',
  'type',
])

/**
 * Desa una fotografia completa dels camps editables d'una activitat. Fer-ho
 * així permet tornar un camp al valor de la UP base sense que reaparegui una
 * excepció antiga del mateix grup.
 */
export function getPlanningActivityOverrideSnapshot(activity, { hidden = false } = {}) {
  const changes = Object.fromEntries(ACTIVITY_OVERRIDE_FIELDS
    .filter((field) => Object.prototype.hasOwnProperty.call(activity || {}, field))
    .map((field) => [field, structuredClone(activity[field])]))
  return { ...changes, hidden }
}

/**
 * Construeix la seqüència efectiva d'un grup sense tocar la UP compartida.
 * Les excepcions s'apliquen per data, de manera que els ajustos nous completen
 * o corregeixen els anteriors i una activitat amagada no es mostra al grup.
 */
export function applyPlanningActivityOverrides(activities = [], overrides = []) {
  const changesByActivityId = new Map()
  ;[...overrides]
    .sort((left, right) => String(left.updatedAt || left.createdAt || '')
      .localeCompare(String(right.updatedAt || right.createdAt || '')))
    .forEach((override) => {
      if (!override?.activityId) return
      changesByActivityId.set(override.activityId, {
        ...(changesByActivityId.get(override.activityId) || {}),
        ...(override.changes || {}),
      })
    })

  return activities.flatMap((activity) => {
    const changes = changesByActivityId.get(activity.id)
    if (!changes) return [activity]
    if (changes.hidden) return []
    const editableChanges = Object.fromEntries(ACTIVITY_OVERRIDE_FIELDS
      .filter((field) => Object.prototype.hasOwnProperty.call(changes, field))
      .map((field) => [field, structuredClone(changes[field])]))
    return [{
      ...activity,
      ...editableChanges,
      groupOverride: true,
      updatedAt: [...overrides]
        .filter((override) => override.activityId === activity.id)
        .sort((left, right) => String(right.updatedAt || '').localeCompare(String(left.updatedAt || '')))[0]?.updatedAt
        || activity.updatedAt,
    }]
  })
}
