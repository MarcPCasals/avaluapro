import { isBabeliumItem } from './babelium.js'

/** Una entrada per títol dins de la sessió, conservant totes les fonts. */
export function combineAgendaSessionItems(items = [], planningUnitId = '') {
  const combined = []
  const byTitle = new Map()
  for (const item of items) {
    const title = String(item.title || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('ca')
    const minutes = Number(item.plannedMinutes)
    const canCombine = title && !isBabeliumItem(item) && item.plannedMinutes != null
      && Number.isFinite(minutes) && minutes > 0
    const key = JSON.stringify([title, item.type, item.sourcePlanningUnitId || planningUnitId])
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
