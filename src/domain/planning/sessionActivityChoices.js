import { createSessionItem } from './model.js'
import { isBabeliumItem } from './babelium.js'
import { getSessionLoad } from './rules.js'
import { groupParallelSessionBundles, isUnperformedNoClassBundle, summarizeAssignedActivityProgress, summarizeCompletedActivityIds } from './scheduler.js'
import { getAgendaSessionItemRemovalState } from '../../lib/agendaToday.js'

function relevantBundles(application, target, bundles) {
  return bundles.filter(({ session }) => session.applicationId === application.id
    && (!target.session.subgroupId || !session.subgroupId || session.subgroupId === target.session.subgroupId))
}

function movableBundles(application, target, bundles, options = {}) {
  return relevantBundles(application, target, bundles).filter(bundle => bundle.session.id !== target.session.id
    && new Date(bundle.session.startsAt).getTime() > new Date(options.now || new Date().toISOString()).getTime()
    && !bundle.results?.length
    && getAgendaSessionItemRemovalState(bundle, { id: 'activity-choice' }, options).canRemove)
}

/** Distingeix els minuts ja fets dels que només estan previstos en una altra sessió. */
export function getSessionActivityChoices({ activities, application, existingSessionBundles, targetSessionId, manuallyCompletedSourceActivityIds = [], calendarEvents = [], options = {} }) {
  const target = existingSessionBundles.find(({ session }) => session.id === targetSessionId)
  if (!target) throw new Error('No s’ha trobat la sessió.')
  const bundles = relevantBundles(application, target, existingSessionBundles)
    .filter(bundle => !isUnperformedNoClassBundle(bundle, calendarEvents))
  const movableIds = new Set(movableBundles(application, target, bundles, options).map(bundle => bundle.session.id))
  const { assignedMinutesByActivityId, assignedSourceActivityIds } = summarizeAssignedActivityProgress(bundles)
  const fixed = summarizeAssignedActivityProgress(bundles.filter(bundle => !movableIds.has(bundle.session.id)))
  const history = summarizeAssignedActivityProgress(bundles.filter(bundle => bundle.session.id !== target.session.id && !movableIds.has(bundle.session.id)))
  const completed = new Set([...manuallyCompletedSourceActivityIds, ...summarizeCompletedActivityIds(bundles)])
  return activities.map((activity, index) => {
    const timed = Number(activity.plannedMinutes) > 0
    const assignedMinutes = assignedMinutesByActivityId[activity.id] || 0
    const remainingMinutes = timed ? Math.max(0, Number(activity.plannedMinutes) - assignedMinutes) : null
    const availableMinutes = timed ? Math.max(0, Number(activity.plannedMinutes) - (fixed.assignedMinutesByActivityId[activity.id] || 0)) : null
    const isCompleted = completed.has(activity.id) || (timed
      ? (history.assignedMinutesByActivityId[activity.id] || 0) >= Number(activity.plannedMinutes)
      : history.assignedSourceActivityIds.has(activity.id))
    const available = !isCompleted && (timed ? availableMinutes > 0 : !fixed.assignedSourceActivityIds.has(activity.id))
    return { ...activity, code: `A${index + 1}`, assignedMinutes, remainingMinutes, availableMinutes, available, completed: isCompleted, isScheduled: assignedSourceActivityIds.has(activity.id),
      calendarLabel: isCompleted ? 'Ja feta' : !available ? 'Ja en aquesta sessió o en una sessió passada'
        : assignedSourceActivityIds.has(activity.id) ? remainingMinutes > 0 ? `${remainingMinutes} min fora del calendari` : 'Programada · pendent de fer' : 'Fora del calendari' }
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
  if (activityId && typeof activityId === 'object') {
    const title = String(activityId.title || '').trim()
    const minutes = Number(plannedMinutes)
    const load = getSessionLoad(target.items, target.session.durationMinutes)
    const freeMinutes = Math.max(0, load.programmableMinutes - load.plannedMinutes)
    if (!title || !Number.isFinite(minutes) || minutes <= 0 || minutes > freeMinutes) {
      throw new Error(`Escriu l’activitat i indica una durada entre 1 i ${freeMinutes} minuts.`)
    }
    const item = createSessionItem({ ownerUid: target.session.ownerUid, applicationId: input.application.id,
      sessionId: target.session.id, title, type: 'activity', plannedMinutes: minutes, fixedToSession: Boolean(activityId.fixedToSession),
      order: Math.max(-1, ...target.items.map((current) => Number(current.order) || 0)) + 1 }, options)
    return { item, activity: null, changedItems: [], removedItems: [] }
  }
  const activity = getSessionActivityChoices({ ...input, options }).find((choice) => choice.id === activityId)
  if (!activity?.available) throw new Error('Aquesta activitat ja està feta o calendaritzada en aquesta sessió o en una sessió passada.')
  const minutes = Number(activity.plannedMinutes) > 0 ? Number(plannedMinutes) : null
  const load = getSessionLoad(target.items, target.session.durationMinutes)
  const freeMinutes = Math.max(0, load.programmableMinutes - load.plannedMinutes)
  if (minutes !== null && (!Number.isFinite(minutes) || minutes <= 0 || minutes > activity.availableMinutes || minutes > freeMinutes)) {
    throw new Error(`Pots afegir com a màxim ${Math.min(freeMinutes, activity.availableMinutes)} minuts. Ajusta el temps o allibera espai a la sessió.`)
  }
  let item = createSessionItem({ ownerUid: target.session.ownerUid, applicationId: input.application.id,
    sessionId: target.session.id, sourceActivityId: activity.id, sourcePlanningUnitId: input.application.planningUnitId,
    title: activity.title, type: activity.type, plannedMinutes: minutes,
    order: Math.max(-1, ...target.items.map((current) => Number(current.order) || 0)) + 1 }, options)
  const transferredChanges = new Map()
  const transferredRemoved = []
  let toMove = minutes === null ? (activity.isScheduled ? 1 : 0) : Math.max(0, minutes - activity.remainingMinutes)
  const sourceGroups = groupParallelSessionBundles(movableBundles(input.application, target, input.existingSessionBundles, options)
    .filter(bundle => !isUnperformedNoClassBundle(bundle, input.calendarEvents))
    .sort((left, right) => left.session.startsAt.localeCompare(right.session.startsAt)))
  for (const group of sourceGroups) {
    const parts = group.bundles.map(bundle => bundle.items.filter(part => part.sourceActivityId === activity.id))
    for (let index = 0; index < Math.max(0, ...parts.map(list => list.length)) && toMove > 0; index += 1) {
      const copies = parts.flatMap(list => list[index] ? [list[index]] : [])
      const moved = minutes === null ? 1 : Math.min(toMove, ...copies.map(part => Number(part.plannedMinutes) || 0))
      for (const part of copies) {
        const left = minutes === null ? 0 : Number(part.plannedMinutes) - moved
        if (left > 0) transferredChanges.set(part.id, createSessionItem({ ...part, plannedMinutes: left }, options))
        else transferredRemoved.push(part)
      }
      toMove -= moved
    }
  }
  if (toMove > 0) throw new Error('La calendarització ha canviat. Torna a carregar les activitats.')
  const transferredRemovedIds = new Set(transferredRemoved.map(part => part.id))
  const bundles = relevantBundles(input.application, target, input.existingSessionBundles)
    .filter((bundle) => !isUnperformedNoClassBundle(bundle, input.calendarEvents))
    .map(bundle => ({ ...bundle, items: [
      ...bundle.items.filter(part => !transferredRemovedIds.has(part.id)).map(part => transferredChanges.get(part.id) || part),
      ...(bundle.session.id === target.session.id ? [item] : []),
    ] }))
    .sort((left, right) => left.session.startsAt.localeCompare(right.session.startsAt))
  const groups = groupParallelSessionBundles(bundles).flatMap((group) => {
    const parts = group.bundles.map((bundle) => bundle.items.filter((part) => part.sourceActivityId === activity.id))
    return Array.from({ length: Math.max(0, ...parts.map((list) => list.length)) }, (_, index) => parts.flatMap((list) => list[index] ? [list[index]] : []))
  })
  const changedItems = [...transferredChanges.values()]
  groups.forEach((parts, index) => parts.forEach((part) => {
    const updated = createSessionItem({ ...part, segmentIndex: index + 1, segmentCount: groups.length }, options)
    if (part.id === item.id) item = updated
    else if (part.segmentIndex !== updated.segmentIndex || part.segmentCount !== updated.segmentCount) {
      const index = changedItems.findIndex(current => current.id === updated.id)
      if (index >= 0) changedItems[index] = updated
      else changedItems.push(updated)
    }
  }))
  const removedItems = relevantBundles(input.application, target, input.existingSessionBundles)
    .filter((bundle) => isUnperformedNoClassBundle(bundle, input.calendarEvents))
    .flatMap((bundle) => bundle.items.filter((part) => part.sourceActivityId === activity.id))
  return { item, activity, changedItems, removedItems: [...removedItems, ...transferredRemoved] }
}


/** Edita una activitat pròpia en la seva sessió sense alterar la font ni la fixació. */
export function buildOwnSessionActivityChange(bundle, itemId, changes, options = {}) {
  const item = bundle.items.find((candidate) => candidate.id === itemId)
  if (!item || item.sourceActivityId || item.type !== 'activity' || isBabeliumItem(item)
    || !getAgendaSessionItemRemovalState(bundle, item, options).canRemove) {
    throw new Error('Aquesta activitat no es pot modificar perquè no és una activitat pròpia editable.')
  }
  const title = String(changes.title ?? item.title).trim()
  const minutes = Number(changes.plannedMinutes ?? item.plannedMinutes)
  const load = getSessionLoad(bundle.items.filter((candidate) => candidate.id !== item.id), bundle.session.durationMinutes)
  const capacity = Math.max(0, load.programmableMinutes - load.plannedMinutes)
  if (!title || !Number.isFinite(minutes) || minutes <= 0 || minutes > capacity) {
    throw new Error(`Escriu un títol i indica una durada entre 1 i ${capacity} minuts. Allibera espai si necessites més temps.`)
  }
  return createSessionItem({ ...item, title, plannedMinutes: minutes,
    ...(typeof changes.fixedToSession === 'boolean' ? { fixedToSession: changes.fixedToSession } : {}),
    updatedAt: options.now || new Date().toISOString() }, options)
}
