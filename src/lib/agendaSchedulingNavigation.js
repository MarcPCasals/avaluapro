const AGENDA_SCHEDULING_REQUEST_KEY = 'avaluapro:open-agenda-scheduling'

export function saveAgendaSchedulingRequest(storage, request = {}) {
  const planningUnitId = String(request.planningUnitId || '')
  if (!storage || !planningUnitId) return
  storage.removeItem(AGENDA_VIEW_REQUEST_KEY)
  storage.setItem(AGENDA_SCHEDULING_REQUEST_KEY, JSON.stringify({
    mode: request.mode === 'smart' ? 'smart' : 'progressive',
    planningUnitId,
  }))
}

export function consumeAgendaSchedulingRequest(storage) {
  if (!storage) return { mode: 'progressive', planningUnitId: '' }
  const stored = storage.getItem(AGENDA_SCHEDULING_REQUEST_KEY) || ''
  if (stored) storage.removeItem(AGENDA_SCHEDULING_REQUEST_KEY)
  if (!stored) return { mode: 'progressive', planningUnitId: '' }

  try {
    const request = JSON.parse(stored)
    return {
      mode: request?.mode === 'smart' ? 'smart' : 'progressive',
      planningUnitId: String(request?.planningUnitId || ''),
    }
  } catch {
    // Compatibilitat amb les peticions desades abans d'afegir el mode.
    return { mode: 'progressive', planningUnitId: stored }
  }
}

const AGENDA_VIEW_REQUEST_KEY = 'avaluapro:open-agenda-view'

export function saveAgendaTimelineRequest(storage) {
  if (!storage) return
  storage.removeItem(AGENDA_SCHEDULING_REQUEST_KEY)
  storage.setItem(AGENDA_VIEW_REQUEST_KEY, 'timeline')
}

export function consumeAgendaViewRequest(storage) {
  const view = storage?.getItem(AGENDA_VIEW_REQUEST_KEY)
  storage?.removeItem(AGENDA_VIEW_REQUEST_KEY)
  return view === 'timeline' ? 'timeline' : 'today'
}
