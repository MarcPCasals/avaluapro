import { getAgendaSessionItemRemovalState } from '../../lib/agendaToday.js'
import { isBabeliumItem } from '../../domain/planning/babelium.js'

/** Future, untouched sessions belonging to an earlier temporal unit. */
export function selectPriorTemporalUnitCleanup(bundles, temporalUnits, currentUnit, now = new Date().toISOString()) {
  if (!currentUnit) return []
  const priorIds = new Set(temporalUnits
    .filter((unit) => unit.id !== currentUnit.id && unit.endsOn < currentUnit.startsOn)
    .map((unit) => unit.id))
  return bundles.flatMap((bundle) => {
    if (!priorIds.has(bundle.planningUnit?.temporalUnitId)
      || bundle.session.classroomOpenedAt
      || bundle.session.startsAt.slice(0, 10) < currentUnit.startsOn) return []
    const items = bundle.items.filter((item) => {
      if (isBabeliumItem(item)) return false
      const state = getAgendaSessionItemRemovalState(bundle, item, { now })
      return state.canRemove && state.isFutureSession
    })
    return items.length ? [{ bundle, items }] : []
  })
}
