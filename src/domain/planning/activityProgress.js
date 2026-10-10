import { groupParallelSessionBundles, summarizeCompletedActivityIds } from './scheduler.js'
import { getAgendaActivityMinutesById } from './classPlanning.js'

/** Progrés del grup: minuts de fragments, sense duplicar els mitjos grups. */
export function getPlanningActivityProgress(activities = [], bundles = [], overrides = [], { now = new Date().toISOString() } = {}) {
  const budgetById = getAgendaActivityMinutesById(activities, overrides)
  const legacyCompleted = summarizeCompletedActivityIds(bundles, { now })
  const totals = new Map()
  const nowMs = new Date(now).getTime()
  const valid = bundles.filter(({ session }) => session && !['cancelled', 'notHeld'].includes(session.status))
  for (const group of groupParallelSessionBundles(valid)) {
    const perBundle = group.bundles.map(({ session, items = [], results = [] }) => {
      const byActivity = new Map()
      const resultByItem = new Map(results.map(result => [result.sessionItemId, result]))
      const elapsed = Boolean(session.startsAt) && Number(session.durationMinutes) > 0
        && new Date(session.startsAt).getTime() + Number(session.durationMinutes) * 60_000 <= nowMs
      for (const item of items) {
        if (!item.sourceActivityId) continue
        const result = resultByItem.get(item.id)
        const completed = result ? result.status === 'completed' : elapsed
        const entry = byActivity.get(item.sourceActivityId) || { assigned: 0, completed: 0, pending: false }
        const minutes = Math.max(0, Number(item.plannedMinutes) || 0)
        entry.assigned += minutes
        if (completed) entry.completed += minutes
        else entry.pending = true
        byActivity.set(item.sourceActivityId, entry)
      }
      return byActivity
    })
    for (const id of new Set(perBundle.flatMap(map => [...map.keys()]))) {
      const entries = perBundle.map(map => map.get(id) || { assigned: 0, completed: 0, pending: true })
      const total = totals.get(id) || { assigned: 0, completed: 0, pending: false }
      total.assigned += Math.max(...entries.map(entry => entry.assigned))
      total.completed += Math.min(...entries.map(entry => entry.completed))
      total.pending ||= entries.some(entry => entry.pending)
      totals.set(id, total)
    }
  }
  const changesById = new Map()
  for (const override of [...overrides].sort((a, b) => String(a.updatedAt || a.createdAt || '').localeCompare(String(b.updatedAt || b.createdAt || '')))) {
    changesById.set(override.activityId, { ...changesById.get(override.activityId), ...override.changes })
  }
  return Object.fromEntries(activities.map(activity => {
    const total = totals.get(activity.id) || { assigned: 0, completed: 0, pending: false }
    const budget = Math.max(0, Number(budgetById[activity.id]) || 0, total.assigned)
    const remainingMinutes = budget > 0 ? Math.max(0, budget - total.completed) : null
    const completed = legacyCompleted.has(activity.id) || (totals.has(activity.id) && !total.pending && (budget === 0 || remainingMinutes === 0))
    const withdrawn = changesById.get(activity.id)?.withdrawnFromAgenda === true && total.assigned === 0
    return [activity.id, { completed, withdrawn, completedMinutes: total.completed, remainingMinutes: completed || withdrawn ? 0 : remainingMinutes, hasHistory: total.completed > 0, hasSchedule: totals.has(activity.id) }]
  }))
}
