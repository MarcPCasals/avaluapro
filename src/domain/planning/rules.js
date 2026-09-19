import { CHANGE_SCOPES } from './constants.js'
import {
  createGroupActivityOverride,
  updatePlanningActivity,
} from './model.js'

export function getProgrammableMinutes(sessionDurationMinutes, marginMinutes = 5) {
  const duration = Math.max(0, Number(sessionDurationMinutes) || 0)
  const margin = Math.max(0, Number(marginMinutes) || 0)
  return Math.max(0, duration - margin)
}

export function getSessionPlannedMinutes(sessionItems) {
  return (sessionItems || []).reduce((total, item) => {
    const minutes = Number(item.plannedMinutes)
    return total + (Number.isFinite(minutes) && minutes > 0 ? minutes : 0)
  }, 0)
}

/**
 * Retorna el color pedagògic acordat. Els elements sense temps continuen dins
 * la cronologia, però no consumeixen el pressupost de la sessió.
 */
export function getSessionLoad(sessionItems, sessionDurationMinutes, marginMinutes = 5) {
  const plannedMinutes = getSessionPlannedMinutes(sessionItems)
  const programmableMinutes = getProgrammableMinutes(sessionDurationMinutes, marginMinutes)
  const ratio = programmableMinutes > 0
    ? plannedMinutes / programmableMinutes
    : plannedMinutes > 0 ? Number.POSITIVE_INFINITY : 0
  return {
    plannedMinutes,
    programmableMinutes,
    ratio,
    status: ratio <= 0.85 ? 'green' : ratio <= 1 ? 'orange' : 'red',
  }
}

export function getPlanningTotals(phases, activities) {
  const totalsByPhase = Object.fromEntries((phases || []).map((phase) => [phase.id, 0]))
  let totalMinutes = 0
  for (const activity of activities || []) {
    const minutes = Number(activity.plannedMinutes)
    if (!Number.isFinite(minutes) || minutes <= 0) continue
    totalMinutes += minutes
    totalsByPhase[activity.phaseId] = (totalsByPhase[activity.phaseId] || 0) + minutes
  }
  return { totalMinutes, totalsByPhase }
}

/**
 * Mou un element de la seqüència per la seva nansa i renumera només les fases
 * afectades. Això permet canviar-lo de fase sense recrear-lo ni perdre els
 * vincles que en el futur utilitzaran Agenda i Mode aula.
 */
export function movePlanningActivityInSequence(
  activities,
  { activityId, targetActivityId = null, targetPhaseId },
  options = {},
) {
  const source = (activities || []).find((activity) => activity.id === activityId)
  if (!source) throw new Error("No s'ha trobat l'element que es vol moure")
  if (!targetPhaseId) throw new Error('Cal indicar la fase de destinació')
  if (targetActivityId === activityId) return { activities: [...activities], changedActivities: [] }

  const remaining = activities.filter((activity) => activity.id !== activityId)
  const destination = remaining
    .filter((activity) => activity.phaseId === targetPhaseId)
    .sort((left, right) => Number(left.order) - Number(right.order))
  const targetIndex = targetActivityId
    ? destination.findIndex((activity) => activity.id === targetActivityId)
    : destination.length
  if (targetActivityId && targetIndex < 0) throw new Error("La destinació no pertany a la fase indicada")

  destination.splice(targetIndex, 0, { ...source, phaseId: targetPhaseId })
  const affectedPhaseIds = new Set([source.phaseId, targetPhaseId])
  const nextById = new Map()
  const changedActivities = []

  for (const phaseId of affectedPhaseIds) {
    const phaseActivities = phaseId === targetPhaseId
      ? destination
      : remaining
          .filter((activity) => activity.phaseId === phaseId)
          .sort((left, right) => Number(left.order) - Number(right.order))
    phaseActivities.forEach((activity, order) => {
      const original = activities.find((candidate) => candidate.id === activity.id)
      if (original.phaseId === phaseId && Number(original.order) === order) {
        nextById.set(original.id, original)
        return
      }
      const updated = updatePlanningActivity(
        original,
        { phaseId, order },
        { now: options.now },
      )
      nextById.set(updated.id, updated)
      changedActivities.push(updated)
    })
  }

  return {
    activities: activities.map((activity) => nextById.get(activity.id) || activity),
    changedActivities,
  }
}

/**
 * Planifica un canvi d'activitat sense barrejar la UP ideal amb el que només
 * ha passat en un grup. L'únic abast que modifica la base és baseAndGroup.
 */
export function planActivityChange({
  activity,
  application,
  changes,
  scope,
  now,
  idFactory,
}) {
  if (!CHANGE_SCOPES.includes(scope)) throw new Error(`Abast de canvi desconegut: ${scope}`)

  if (scope === 'baseAndGroup') {
    return {
      baseActivity: updatePlanningActivity(activity, changes, { now, idFactory }),
      groupOverride: null,
    }
  }

  return {
    baseActivity: activity,
    groupOverride: createGroupActivityOverride(
      {
        ownerUid: application.ownerUid,
        applicationId: application.id,
        activityId: activity.id,
        changeScope: scope,
        changes,
      },
      { now, idFactory },
    ),
  }
}

export function selectEffectiveTimetable(timetableVersions, date) {
  const candidates = (timetableVersions || [])
    .filter((version) => version.effectiveFrom <= date && (!version.effectiveTo || version.effectiveTo >= date))
    .sort((left, right) => right.effectiveFrom.localeCompare(left.effectiveFrom))
  return candidates[0] || null
}
