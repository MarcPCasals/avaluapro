/**
 * Límits remots dels historials globals. Centralitzar-los evita que una pantalla
 * torni a convertir una consulta acotada en una descàrrega completa sense que
 * les proves de pressupost de lectures ho detectin.
 */
export const FIRESTORE_QUERY_LIMITS = Object.freeze({
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
