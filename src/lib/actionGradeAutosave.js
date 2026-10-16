// Serialize patches so a slower save cannot overwrite a later grade change.
// Pending changes survive closing/unmounting; only UI notifications stop.
export function createActionGradeAutosave({ save, onState }) {
  let pending = {}
  let inFlight = null
  let notify = true
  let savePatch = save
  const emit = state => { if (notify) onState(state) }

  const flush = () => {
    if (inFlight) return inFlight
    if (!Object.keys(pending).length) return Promise.resolve(true)
    emit({ status: 'saving', error: '' })
    inFlight = Promise.resolve().then(async () => {
      while (Object.keys(pending).length) {
        const batch = pending
        pending = {}
        try {
          await savePatch(batch)
        } catch (cause) {
          pending = { ...batch, ...pending }
          emit({ status: 'error', error: cause?.message || 'No s’han pogut desar les notes. Torna-ho a provar.' })
          return false
        }
      }
      emit({ status: 'saved', error: '' })
      return true
    }).finally(() => { inFlight = null })
    return inFlight
  }

  return {
    enqueue(patch) {
      pending = { ...pending, ...patch }
      emit({ status: 'saving', error: '' })
      return flush()
    },
    flush,
    setSave(callback) { savePatch = callback },
    activate() { notify = true },
    dispose() { notify = false },
  }
}
