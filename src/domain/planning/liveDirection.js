/** Subscriu exclusivament la UP i les aplicacions pedagògiques autoritzades. */
export function subscribeDirectionGraph({ db, doc, collection, onSnapshot }, unitId, onChange, onError, { applicationId = '' } = {}) {
  const reference = doc(db, 'planningUnits', unitId)
  const state = { unit: null, phases: [], activities: [], applications: [], fromCache: true }
  const stops = new Map()
  const cacheStates = new Map()
  const confirmedKeys = new Set()
  let closed = false
  const emit = () => { if (!closed) onChange({ ...state, applications: [...state.applications] }) }
  const fail = (error) => {
    if (closed) return
    closed = true
    stops.forEach((stop) => stop())
    stops.clear()
    onError(error)
  }
  const watch = (key, ref, update) => {
    if (stops.has(key) || closed) return
    cacheStates.set(key, true)
    stops.set(key, onSnapshot(ref, { includeMetadataChanges: true }, (snapshot) => {
      if (closed) return
      cacheStates.set(key, snapshot.metadata.fromCache)
      state.fromCache = [...cacheStates.values()].some(Boolean)
      // Una memòria cau d’un compte anterior no acredita l’accés actual.
      if (!snapshot.metadata.fromCache) confirmedKeys.add(key)
      if (confirmedKeys.has(key)) update(snapshot)
      emit()
    }, fail))
  }
  const rows = (snapshot) => snapshot.docs.map((item) => ({ ...item.data(), id: item.id }))
  const reconcile = (prefix, ids) => {
    for (const [key, stop] of stops) {
      if (key.startsWith(prefix) && !ids.some((id) => key.startsWith(`${prefix}${id}/`))) {
        stop()
        stops.delete(key)
        cacheStates.delete(key)
        confirmedKeys.delete(key)
      }
    }
  }
  watch('unit', reference, (snapshot) => {
    if (!snapshot.exists()) { fail(new Error('Aquesta programació ja no està disponible.')); return }
    state.unit = { ...snapshot.data(), id: snapshot.id }
  })
  for (const field of ['phases', 'activities']) watch(field, collection(reference, field), (snapshot) => {
    state[field] = rows(snapshot).sort((a, b) => Number(a.order) - Number(b.order))
  })
  watch('applications', applicationId ? doc(reference, 'applications', applicationId) : collection(reference, 'applications'), (snapshot) => {
    if (applicationId && !snapshot.exists()) { fail(new Error('La programació d’aquesta classe no està disponible.')); return }
    const applications = applicationId ? [{ ...snapshot.data(), id: snapshot.id }] : rows(snapshot)
    reconcile('app/', applications.map((item) => item.id))
    state.applications = applications.map((application) => ({
      ...(state.applications.find((item) => item.application.id === application.id) || { sessions: [], overrides: [] }), application,
    }))
    for (const bundle of state.applications) {
      const id = bundle.application.id
      const appRef = doc(reference, 'applications', id)
      const current = () => state.applications.find((item) => item.application.id === id)
      watch(`app/${id}/overrides`, collection(appRef, 'activityOverrides'), (snap) => { current().overrides = rows(snap) })
      watch(`app/${id}/sessions`, collection(appRef, 'sessions'), (snap) => {
        const sessions = rows(snap).sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)))
        reconcile(`app/${id}/session/`, sessions.map((item) => item.id))
        current().sessions = sessions.map((session) => ({
          ...(current().sessions.find((item) => item.session.id === session.id) || { items: [], results: [] }), session,
        }))
        for (const session of sessions) {
          const sessionRef = doc(appRef, 'sessions', session.id)
          for (const field of ['items', 'results']) watch(`app/${id}/session/${session.id}/${field}`, collection(sessionRef, field), (detail) => {
            const target = current()?.sessions.find((item) => item.session.id === session.id)
            if (target) target[field] = rows(detail).sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
          })
        }
      })
    }
  })
  return () => { closed = true; stops.forEach((stop) => stop()); stops.clear() }
}
