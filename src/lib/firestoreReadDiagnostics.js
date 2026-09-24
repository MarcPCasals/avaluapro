const STORAGE_KEY = 'avaluapro-firestore-read-diagnostics-v1'

let memoryState = { estimatedReads: 0, operations: 0, scopes: {} }

function getSessionStorage() {
  try {
    return globalThis.sessionStorage || null
  } catch {
    return null
  }
}

function readState() {
  const storage = getSessionStorage()
  if (!storage) return memoryState
  try {
    return JSON.parse(storage.getItem(STORAGE_KEY) || 'null') || memoryState
  } catch {
    return memoryState
  }
}

function writeState(state) {
  memoryState = state
  const storage = getSessionStorage()
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // El diagnòstic no pot interferir mai amb el funcionament de l'aplicació.
  }
}

/**
 * Registra una estimació conservadora. Firestore cobra com a mínim una lectura
 * per consulta, també quan no retorna cap document. Les lectures dependents de
 * regles i d'índex no es poden conèixer des del client i no s'hi inclouen.
 */
export function recordFirestoreRead(scope, { documents = 0, kind = 'query' } = {}) {
  const cleanScope = String(scope || 'unknown')
  const estimatedReads = kind === 'query' ? Math.max(1, Number(documents) || 0) : 1
  const current = readState()
  const scopeState = current.scopes?.[cleanScope] || { estimatedReads: 0, operations: 0 }
  const next = {
    estimatedReads: Number(current.estimatedReads || 0) + estimatedReads,
    operations: Number(current.operations || 0) + 1,
    scopes: {
      ...(current.scopes || {}),
      [cleanScope]: {
        estimatedReads: Number(scopeState.estimatedReads || 0) + estimatedReads,
        operations: Number(scopeState.operations || 0) + 1,
      },
    },
  }
  writeState(next)
  return next
}

export function recordFirestoreQuerySnapshot(scope, snapshot) {
  return recordFirestoreRead(scope, { documents: snapshot?.size || 0, kind: 'query' })
}

export function recordFirestoreLookup(scope) {
  return recordFirestoreRead(scope, { documents: 1, kind: 'lookup' })
}

export function recordFirestoreListenerSnapshot(scope, snapshot) {
  const changedDocuments = typeof snapshot?.docChanges === 'function'
    ? snapshot.docChanges().length
    : snapshot?.size || 0
  // La primera resposta d'un listener buit també factura la lectura mínima
  // d'una consulta. Comptar-la manté el diagnòstic deliberadament conservador.
  return recordFirestoreRead(scope, { documents: changedDocuments, kind: 'query' })
}

export function getFirestoreReadDiagnostics() {
  return readState()
}

export function resetFirestoreReadDiagnostics() {
  const empty = { estimatedReads: 0, operations: 0, scopes: {} }
  writeState(empty)
  return empty
}
