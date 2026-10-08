import { isBabeliumItem } from './babelium.js'
import { createSessionItem } from './model.js'
import { getNoClassCalendarEvent } from '../../lib/agendaCalendar.js'

/** Les activitats pròpies antigues conserven la fixació aplicada abans del botó. */
export function isFixedAgendaItem(item) {
  return !isBabeliumItem(item) && (item.fixedToSession === true
    || (item.type === 'activity' && !item.sourceActivityId && item.fixedToSession == null))
}

export function canReorderAgendaSession(bundle, calendarEvents = []) {
  const session = bundle.session
  return session.status === 'planned' && !session.classroomOpenedAt && !session.attendanceConfirmedAt
    && !session.classroomClosedAt && !(bundle.results || []).length
    && !getNoClassCalendarEvent(calendarEvents, String(session.startsAt).slice(0, 10), session.classId,
      { sessionId: session.id, timetableSlotId: session.timetableSlotId })
}

/** Mou l'activitat visible amb tots els fragments; Babèlium manté el primer lloc. */
export function moveAgendaSessionItem(bundle, itemId, direction, options = {}) {
  if (!canReorderAgendaSession(bundle, options.calendarEvents)) throw new Error('Aquesta sessió no es pot reordenar perquè no es fa o ja té dades de classe.')
  if (!['up', 'down'].includes(direction)) throw new Error('Cal indicar si l’activitat puja o baixa.')
  const ordered = [...bundle.items].sort((a, b) => Number(a.order) - Number(b.order))
  const fixed = ordered.filter(isBabeliumItem)
  const groups = combineAgendaSessionItems(ordered.filter((item) => !isBabeliumItem(item)), bundle.planningUnit?.id)
  const index = groups.findIndex((item) => item.id === itemId || item.combinedItems?.some((part) => part.id === itemId))
  if (index < 0) throw new Error('No s’ha trobat l’activitat dins la sessió.')
  const destination = index + (direction === 'up' ? -1 : 1)
  if (destination < 0 || destination >= groups.length) return { items: ordered, changedItems: [] }
  ;[groups[index], groups[destination]] = [groups[destination], groups[index]]
  const items = [...fixed, ...groups.flatMap((item) => item.combinedItems || [item])]
    .map((item, order) => Number(item.order) === order ? item
      : ({ ...item, ...createSessionItem({ ...item, order }, options) }))
  const originalById = new Map(bundle.items.map((item) => [item.id, item]))
  return { items, changedItems: items.filter((item) => item.order !== originalById.get(item.id).order) }
}

/** Una entrada per títol dins de la sessió, conservant totes les fonts. */
export function combineAgendaSessionItems(items = [], planningUnitId = '') {
  const combined = []
  const byTitle = new Map()
  for (const item of items) {
    const title = String(item.title || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('ca')
    const minutes = Number(item.plannedMinutes)
    const canCombine = title && !isBabeliumItem(item) && item.plannedMinutes != null
      && Number.isFinite(minutes) && minutes > 0
    const key = JSON.stringify([title, item.type, item.sourcePlanningUnitId || planningUnitId, isFixedAgendaItem(item)])
    const current = canCombine ? byTitle.get(key) : null
    if (!current) {
      const entry = { ...item }
      combined.push(entry)
      if (canCombine) byTitle.set(key, entry)
      continue
    }
    current.combinedItems = [...(current.combinedItems || [items.find((original) => original.id === current.id)]), item]
    current.plannedMinutes = Number(current.plannedMinutes) + minutes
    current.segmentIndex = null
    current.segmentCount = null
    const descriptions = [...new Set(current.combinedItems
      .map((part) => part.sourceActivity?.description?.trim()).filter(Boolean))]
    if (descriptions.length) current.sourceActivity = {
      ...current.sourceActivity,
      description: descriptions.join('\n\n'),
    }
  }
  return combined
}
