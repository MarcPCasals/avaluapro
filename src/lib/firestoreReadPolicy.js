/**
 * Límits remots dels historials globals. Centralitzar-los evita que una pantalla
 * torni a convertir una consulta acotada en una descàrrega completa sense que
 * les proves de pressupost de lectures ho detectin.
 */
export const FIRESTORE_QUERY_LIMITS = Object.freeze({
  feedbackMessages: 100,
  internalAnnouncements: 50,
  internalMessages: 200,
  teacherGradePackages: 20,
  tutoringInvitations: 20,
  tutoringSpaces: 20,
})

export function getBoundedFirestoreLimit(requested, fallback, maximum = fallback) {
  const parsed = Number(requested)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(Math.floor(parsed), maximum)
}

/**
 * Una edició ordinària de cotutoria només ha de consultar les col·leccions que
 * ha modificat. Una llista buida conserva expressament el comportament de
 * sincronització completa que fan servir la creació i la reparació manual.
 */
export function getTutoringCollectionsToSync(changeCollections = [], allowedCollections = []) {
  const allowed = new Set(allowedCollections)
  const requested = Array.from(new Set(changeCollections)).filter((collectionName) => allowed.has(collectionName))
  return requested.length > 0 ? requested : [...allowedCollections]
}

/**
 * La coordinació compartida només manté listeners per l'espai que el docent
 * està mirant. Sense una tutoria oberta, la interfície reutilitza la memòria
 * local i no obre una connexió remota per cada espai compartit.
 */
export function getActiveTutoringListenerSpaceIds(allowedSpaceIds = [], activeSpaceId = '') {
  const normalizedActiveSpaceId = String(activeSpaceId || '').trim()
  if (!normalizedActiveSpaceId) return []
  return allowedSpaceIds.includes(normalizedActiveSpaceId) ? [normalizedActiveSpaceId] : []
}

/**
 * Els historials de missatgeria només necessiten temps real mentre el modal és
 * obert. El recompte conegut es conserva en memòria quan es tanca.
 */
export function shouldOpenInternalMessagingListeners({ isOpen = false, userEmail = '', userUid = '' } = {}) {
  return Boolean(isOpen && String(userEmail).trim() && String(userUid).trim())
}
