import { getManuallyCompletedActivityIds } from '../../domain/planning/classPlanning.js'

/** Activitats fetes manualment que ja no necessiten tenir cap sessió a l'Agenda. */
export function getManuallyCompletedRecoveryOptions({ activities = [], overrides = [], unit, session }) {
  const completedIds = getManuallyCompletedActivityIds(overrides)
  const programmableMinutes = Math.max(1,
    Number(session.durationMinutes) - 5 - (session.babeliumEnabled ? 30 : 0))

  return activities.flatMap((activity, index) => {
    if (!completedIds.has(activity.id)) return []
    const plannedMinutes = Number(activity.plannedMinutes)
    return [{
      id: `${unit.id}:activity:${activity.id}`,
      fallbackRank: activities.length - index,
      isManuallyCompleted: true,
      isProgrammingFallback: true,
      lastStartsAt: '',
      plannedMinutes: Number.isFinite(plannedMinutes) && plannedMinutes > 0
        ? Math.min(plannedMinutes, programmableMinutes)
        : programmableMinutes,
      segmentCount: Number.isFinite(plannedMinutes) && plannedMinutes > 0
        ? Math.max(1, Math.ceil(plannedMinutes / programmableMinutes))
        : 1,
      segmentIndex: 0,
      sourceActivity: activity,
      sourceActivityId: activity.id,
      sourcePlanningUnitId: unit.id,
      sourcePlanningUnitLabel: [unit.code, unit.title].filter(Boolean).join(' · '),
      title: activity.title,
      type: activity.type || 'activity',
    }]
  })
}
