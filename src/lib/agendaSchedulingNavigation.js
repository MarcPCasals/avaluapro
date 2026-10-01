const AGENDA_SCHEDULING_REQUEST_KEY = 'avaluapro:open-agenda-scheduling'

export function saveAgendaSchedulingRequest(storage, request = {}) {
  const planningUnitId = String(request.planningUnitId || '')
  if (!storage || !planningUnitId) return
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
