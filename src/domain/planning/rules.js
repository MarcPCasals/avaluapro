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
