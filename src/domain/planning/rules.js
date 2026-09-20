import { CHANGE_SCOPES } from './constants.js'
import {
  createPlanningUnit,
  createGroupActivityOverride,
  createTimetableSlot,
  updatePlanningActivity,
} from './model.js'
import { createId } from '../../lib/ids.js'

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
 * Resumeix els resultats reals per activitat sense modificar la programació
 * ideal. Agenda podrà alimentar aquesta funció quan hi hagi sessions fetes.
 */
export function getActivityActualComparisons(activities, results, options = {}) {
  const groupNames = options.groupNamesByApplicationId || {}
  return (activities || []).map((activity) => {
    const activityResults = (results || []).filter((result) => result.sourceActivityId === activity.id)
    const actualValues = activityResults
      .map((result) => Number(result.actualMinutes))
      .filter((minutes) => Number.isFinite(minutes) && minutes > 0)
    const actualMinutesAverage = actualValues.length > 0
      ? Math.round(actualValues.reduce((total, minutes) => total + minutes, 0) / actualValues.length)
      : null
    const plannedMinutes = Number(activity.plannedMinutes) > 0 ? Number(activity.plannedMinutes) : null
    const sourceGroupNames = [...new Set(activityResults
      .map((result) => groupNames[result.applicationId])
      .filter(Boolean))]
    return {
      activityId: activity.id,
      actualMinutesAverage,
      plannedMinutes,
      sampleCount: activityResults.length,
      sourceGroupNames,
      status: actualMinutesAverage === null || plannedMinutes === null
        ? 'noData'
        : actualMinutesAverage > plannedMinutes ? 'overrun' : 'withinPlan',
    }
  })
}

/**
 * Converteix revisions d'Agenda en propostes pendents. La informació real
 * explica la proposta, però cap canvi s'aplica fins que el docent l'accepta.
 */
export function buildActivityImprovementProposals(activities, results, options = {}) {
  const comparisons = getActivityActualComparisons(activities, results, options)
  const idFactory = options.idFactory || createId
  return comparisons.flatMap((comparison) => {
    const activity = (activities || []).find((candidate) => candidate.id === comparison.activityId)
    const activityResults = (results || []).filter((result) => result.sourceActivityId === comparison.activityId)
    const missingMaterials = [...new Set(activityResults.flatMap((result) => result.missingMaterials || []))]
    const usefulAdaptationIds = [...new Set(activityResults.flatMap((result) => result.usefulAdaptationIds || []))]
    const recommendations = activityResults.map((result) => result.improvementRecommendation).filter(Boolean)
    const reflections = activityResults
      .flatMap((result) => [result.pedagogicalReflection, result.applicationComment])
      .filter(Boolean)
    const recommendation = recommendations.includes('remove')
      ? 'remove'
      : recommendations.includes('modify') ? 'modify' : recommendations.includes('keep') ? 'keep' : null
    const hasEvidence = comparison.status === 'overrun' || missingMaterials.length > 0 ||
      usefulAdaptationIds.length > 0 || reflections.length > 0 || ['modify', 'remove'].includes(recommendation)
    if (!hasEvidence) return []

    const detailParts = []
    if (comparison.status === 'overrun') {
      detailParts.push(`Ha durat una mitjana de ${comparison.actualMinutesAverage} min en lloc de ${comparison.plannedMinutes} min.`)
    }
    if (missingMaterials.length > 0) detailParts.push(`Materials que han faltat: ${missingMaterials.join(', ')}.`)
    if (usefulAdaptationIds.length > 0) detailParts.push(`${usefulAdaptationIds.length} adaptacions han resultat útils.`)
    if (recommendation === 'modify') detailParts.push('S’ha recomanat modificar l’activitat.')
    if (recommendation === 'remove') detailParts.push('S’ha recomanat retirar o substituir l’activitat.')
    if (reflections.length > 0) detailParts.push(reflections.join(' · '))
    const suggestedChanges = {}
    if (comparison.status === 'overrun') suggestedChanges.plannedMinutes = comparison.actualMinutesAverage
    if (recommendation === 'modify' || recommendation === 'remove' || missingMaterials.length > 0) {
      suggestedChanges.applicationComment = detailParts.join(' ')
    }
    const kind = recommendation === 'remove'
      ? 'sequence'
      : missingMaterials.length > 0
        ? 'materials'
        : usefulAdaptationIds.length > 0
          ? 'adaptation'
          : comparison.status === 'overrun' ? 'time' : 'reflection'
    return [{
      id: idFactory('plan-improvement'),
      activityId: activity.id,
      kind,
      title: `Revisar «${activity.title}»`,
      detail: detailParts.join(' '),
      status: 'pending',
      suggestedChanges,
      sourceGroupNames: comparison.sourceGroupNames,
      plannedMinutes: comparison.plannedMinutes,
      actualMinutesAverage: comparison.actualMinutesAverage,
      sampleCount: comparison.sampleCount,
    }]
  })
}

/** Aplica només les propostes seleccionades i conserva la resta pendents. */
export function applyImprovementProposals(planningUnit, activities, proposalIds, options = {}) {
  const selected = new Set(proposalIds || [])
  const changedActivitiesById = new Map()
  const activitiesById = new Map((activities || []).map((activity) => [activity.id, activity]))
  const proposals = (planningUnit.improvementProposals || []).map((proposal) => {
    if (!selected.has(proposal.id) || proposal.status !== 'pending') return proposal
    const activity = activitiesById.get(proposal.activityId)
    if (activity && Object.keys(proposal.suggestedChanges || {}).length > 0) {
      const updated = updatePlanningActivity(activity, proposal.suggestedChanges, { now: options.now })
      activitiesById.set(updated.id, updated)
      changedActivitiesById.set(updated.id, updated)
    }
    return { ...proposal, status: 'accepted' }
  })
  const normalizedUnit = createPlanningUnit({
    ...planningUnit,
    improvementProposals: proposals,
    updatedAt: options.now || new Date().toISOString(),
  }, options)
  return {
    planningUnit: {
      ...normalizedUnit,
      accessByEmail: planningUnit.accessByEmail || {},
      authorizedEmails: planningUnit.authorizedEmails || [],
      ownerEmailLower: planningUnit.ownerEmailLower || '',
    },
    activities: (activities || []).map((activity) => activitiesById.get(activity.id) || activity),
    changedActivities: [...changedActivitiesById.values()],
  }
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

/**
 * Mou una franja sense recrear-la. Les sessions ja materialitzades conserven
 * la data i l'hora pròpies; només les generacions futures veuran el canvi.
 */
export function moveTimetableSlot(slot, { startsAt, weekday }, options = {}) {
  return createTimetableSlot({
    ...slot,
    startsAt,
    weekday,
    updatedAt: options.now || new Date().toISOString(),
  }, options)
}

const TIMETABLE_DURATION_STEPS = [60, 90, 120]

/**
 * Reprodueix el gest ràpid de l'Agenda docent: cada clic avança la durada
 * d'una franja i, després de dues hores, torna a una hora.
 */
export function getNextTimetableDuration(currentDuration) {
  const currentIndex = TIMETABLE_DURATION_STEPS.indexOf(Number(currentDuration))
  return TIMETABLE_DURATION_STEPS[(currentIndex + 1) % TIMETABLE_DURATION_STEPS.length]
}

function timeInMinutes(value) {
  const [hours, minutes] = String(value || '').split(':').map(Number)
  return hours * 60 + minutes
}

/** Retorna només els solapaments reals; dues franges consecutives no xoquen. */
export function findTimetableSlotConflicts(slots, candidate) {
  const candidateStart = timeInMinutes(candidate.startsAt)
  const candidateEnd = candidateStart + Number(candidate.durationMinutes || 0)
  return (slots || []).filter((slot) => {
    if (slot.id === candidate.id || Number(slot.weekday) !== Number(candidate.weekday)) return false
    const slotStart = timeInMinutes(slot.startsAt)
    const slotEnd = slotStart + Number(slot.durationMinutes || 0)
    return candidateStart < slotEnd && candidateEnd > slotStart
  })
}
