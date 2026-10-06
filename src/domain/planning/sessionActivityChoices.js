import { createSessionItem } from './model.js'
import { getSessionLoad } from './rules.js'
import { groupParallelSessionBundles, isUnperformedNoClassBundle, summarizeAssignedActivityProgress, summarizeCompletedActivityIds } from './scheduler.js'
import { getAgendaSessionItemRemovalState } from '../../lib/agendaToday.js'

function relevantBundles(application, target, bundles) {
  return bundles.filter(({ session }) => session.applicationId === application.id
    && (!target.session.subgroupId || !session.subgroupId || session.subgroupId === target.session.subgroupId))
}

/** Els minuts fora del calendari són propis del grup i, si cal, del mig grup. */
export function getSessionActivityChoices({ activities, application, existingSessionBundles, targetSessionId, manuallyCompletedSourceActivityIds = [], calendarEvents = [] }) {
  const target = existingSessionBundles.find(({ session }) => session.id === targetSessionId)
  if (!target) throw new Error('No s’ha trobat la sessió.')
  const bundles = relevantBundles(application, target, existingSessionBundles)
    .filter((bundle) => !isUnperformedNoClassBundle(bundle, calendarEvents))
  const { assignedMinutesByActivityId, assignedSourceActivityIds } = summarizeAssignedActivityProgress(bundles)
  const completed = new Set([...manuallyCompletedSourceActivityIds, ...summarizeCompletedActivityIds(bundles)])
  return activities.map((activity, index) => {
    const timed = Number(activity.plannedMinutes) > 0
    const assignedMinutes = assignedMinutesByActivityId[activity.id] || 0
    const remainingMinutes = timed ? Math.max(0, Number(activity.plannedMinutes) - assignedMinutes) : null
    const available = !completed.has(activity.id) && (timed ? remainingMinutes > 0 : !assignedSourceActivityIds.has(activity.id))
    return { ...activity, code: `A${index + 1}`, assignedMinutes, remainingMinutes, available,
      calendarLabel: completed.has(activity.id) ? 'Ja feta' : !available ? 'Ja calendaritzada'
        : assignedSourceActivityIds.has(activity.id) ? `${remainingMinutes} min fora del calendari` : 'Fora del calendari' }
  })
}

/** Afegeix només minuts pendents; conserva la UP, les altres activitats i l'historial. */
export function buildSessionActivityAddition(input, activityId, plannedMinutes, options = {}) {
  const target = input.existingSessionBundles.find(({ session }) => session.id === input.targetSessionId)
  if (!target || !getAgendaSessionItemRemovalState(target, { id: 'new-activity' }, options).canRemove) {
    throw new Error('Aquesta sessió ja té dades de classe i no es pot modificar.')
  }
  if (isUnperformedNoClassBundle(target, input.calendarEvents)) {
    throw new Error('Aquesta sessió no es fa. Tria una altra sessió.')
  }
  const activity = getSessionActivityChoices(input).find((choice) => choice.id === activityId)
  if (!activity?.available) throw new Error('Aquesta activitat ja està feta o calendaritzada.')
  const minutes = Number(activity.plannedMinutes) > 0 ? Number(plannedMinutes) : null
  const load = getSessionLoad(target.items, target.session.durationMinutes)
  const freeMinutes = Math.max(0, load.programmableMinutes - load.plannedMinutes)
  if (minutes !== null && (!Number.isFinite(minutes) || minutes <= 0 || minutes > activity.remainingMinutes || minutes > freeMinutes)) {
    throw new Error(`Pots afegir com a màxim ${Math.min(freeMinutes, activity.remainingMinutes)} minuts. Ajusta el temps o allibera espai a la sessió.`)
  }
  let item = createSessionItem({ ownerUid: target.session.ownerUid, applicationId: input.application.id,
    sessionId: target.session.id, sourceActivityId: activity.id, sourcePlanningUnitId: input.application.planningUnitId,
    title: activity.title, type: activity.type, plannedMinutes: minutes,
    order: Math.max(-1, ...target.items.map((current) => Number(current.order) || 0)) + 1 }, options)
  const bundles = relevantBundles(input.application, target, input.existingSessionBundles)
    .filter((bundle) => !isUnperformedNoClassBundle(bundle, input.calendarEvents))
    .map((bundle) => bundle.session.id === target.session.id ? { ...bundle, items: [...bundle.items, item] } : bundle)
    .sort((left, right) => left.session.startsAt.localeCompare(right.session.startsAt))
  const groups = groupParallelSessionBundles(bundles).flatMap((group) => {
    const parts = group.bundles.map((bundle) => bundle.items.filter((part) => part.sourceActivityId === activity.id))
    return Array.from({ length: Math.max(0, ...parts.map((list) => list.length)) }, (_, index) => parts.flatMap((list) => list[index] ? [list[index]] : []))
  })
  const changedItems = []
  groups.forEach((parts, index) => parts.forEach((part) => {
    const updated = createSessionItem({ ...part, segmentIndex: index + 1, segmentCount: groups.length }, options)
    if (part.id === item.id) item = updated
    else if (part.segmentIndex !== updated.segmentIndex || part.segmentCount !== updated.segmentCount) changedItems.push(updated)
  }))
  const removedItems = relevantBundles(input.application, target, input.existingSessionBundles)
    .filter((bundle) => isUnperformedNoClassBundle(bundle, input.calendarEvents))
    .flatMap((bundle) => bundle.items.filter((part) => part.sourceActivityId === activity.id))
  return { item, activity, changedItems, removedItems }
}
