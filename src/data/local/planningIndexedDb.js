import { areCloudDocumentsEqual } from '../../lib/cloudSyncDiff.js'
import { getSafeCloudSyncError } from '../../lib/cloudSyncQueue.js'
import { getPlanningCacheKey, getPlanningEntityLocation } from '../planningEntityLocation.js'

export const PLANNING_LOCAL_DB_NAME = 'avaluapro-planning-v1'

const DB_VERSION = 1
const ENTITY_STORE = 'entities'
const OUTBOX_STORE = 'outbox'
const CONFLICT_STORE = 'conflicts'

function createRevision() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function openPlanningDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PLANNING_LOCAL_DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      const entityStore = db.createObjectStore(ENTITY_STORE, { keyPath: 'cacheKey' })
      entityStore.createIndex('uid', 'uid', { unique: false })
      entityStore.createIndex('scopeKeys', 'scopeKeys', { multiEntry: true, unique: false })
      const outboxStore = db.createObjectStore(OUTBOX_STORE, { keyPath: 'cacheKey' })
      outboxStore.createIndex('uid', 'uid', { unique: false })
      outboxStore.createIndex('scopeKeys', 'scopeKeys', { multiEntry: true, unique: false })
      const conflictStore = db.createObjectStore(CONFLICT_STORE, { keyPath: 'cacheKey' })
      conflictStore.createIndex('uid', 'uid', { unique: false })
      conflictStore.createIndex('scopeKeys', 'scopeKeys', { multiEntry: true, unique: false })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function storageError(error) {
  const quotaExceeded = error?.name === 'QuotaExceededError' || error?.code === 22 || error?.code === 1014
  const message = quotaExceeded
    ? 'El navegador no té prou espai per guardar la planificació.'
    : 'No s’ha pogut guardar la còpia local de la planificació.'
  return new Error(message, { cause: error })
}

function stripLocalMetadata(row) {
  return row?.value
}

async function rowsForUid(storeName, uid) {
  if (!uid) return []
  const db = await openPlanningDatabase()
  try {
    const transaction = db.transaction(storeName, 'readonly')
    return (await requestResult(transaction.objectStore(storeName).index('uid').getAll(uid))) || []
  } finally {
    db.close()
  }
}

/** Desa l'entitat i la seva operació pendent dins la mateixa transacció. */
export async function savePlanningEntityLocally(uid, entity, context = {}) {
  const location = getPlanningEntityLocation(entity, { ...context, ownerUid: uid })
  const cacheKey = getPlanningCacheKey(uid, location.path)
  const queuedAt = context.now || new Date().toISOString()
  let db
  try {
    db = await openPlanningDatabase()
    const transaction = db.transaction([ENTITY_STORE, OUTBOX_STORE, CONFLICT_STORE], 'readwrite')
    const entityStore = transaction.objectStore(ENTITY_STORE)
    const outboxStore = transaction.objectStore(OUTBOX_STORE)
    const previousEntity = await requestResult(entityStore.get(cacheKey))
    const previousOperation = await requestResult(outboxStore.get(cacheKey))
    const baseUpdatedAt = previousOperation?.baseUpdatedAt || previousEntity?.remoteUpdatedAt || ''
    const row = {
      cacheKey,
      documentId: location.documentId,
      entityType: entity.entityType,
      localUpdatedAt: queuedAt,
      path: location.path,
      remoteUpdatedAt: previousEntity?.remoteUpdatedAt || '',
      scopeKeys: location.scopeKeys,
      uid,
      value: entity,
    }
    const operation = {
      attempts: 0,
      baseUpdatedAt,
      cacheKey,
      documentId: location.documentId,
      entityType: entity.entityType,
      lastError: '',
      operation: 'upsert',
      path: location.path,
      queuedAt,
      revision: createRevision(),
      scopeKeys: location.scopeKeys,
      uid,
      value: entity,
    }
    entityStore.put(row)
    outboxStore.put(operation)
    transaction.objectStore(CONFLICT_STORE).delete(cacheKey)
    await transactionDone(transaction)
    return operation
  } catch (error) {
    throw storageError(error)
  } finally {
    if (db) db.close()
  }
}

/** Elimina la vista local immediatament però conserva una baixa pendent. */
export async function deletePlanningEntityLocally(uid, entity, context = {}) {
  const location = getPlanningEntityLocation(entity, { ...context, ownerUid: uid })
  const cacheKey = getPlanningCacheKey(uid, location.path)
  const queuedAt = context.now || new Date().toISOString()
  let db
  try {
    db = await openPlanningDatabase()
    const transaction = db.transaction([ENTITY_STORE, OUTBOX_STORE, CONFLICT_STORE], 'readwrite')
    const entityStore = transaction.objectStore(ENTITY_STORE)
    const outboxStore = transaction.objectStore(OUTBOX_STORE)
    const previousEntity = await requestResult(entityStore.get(cacheKey))
    const previousOperation = await requestResult(outboxStore.get(cacheKey))
    const operation = {
      attempts: 0,
      baseUpdatedAt: previousOperation?.baseUpdatedAt || previousEntity?.remoteUpdatedAt || '',
      cacheKey,
      documentId: location.documentId,
      entityType: entity.entityType,
      lastError: '',
      operation: 'delete',
      path: location.path,
      queuedAt,
      revision: createRevision(),
      scopeKeys: location.scopeKeys,
      uid,
    }
    entityStore.delete(cacheKey)
    outboxStore.put(operation)
    transaction.objectStore(CONFLICT_STORE).delete(cacheKey)
    await transactionDone(transaction)
    return operation
  } catch (error) {
    throw storageError(error)
  } finally {
    if (db) db.close()
  }
}

export async function loadPlanningScope(uid, scopeKey) {
  if (!uid || !scopeKey) return []
  const db = await openPlanningDatabase()
  try {
    const transaction = db.transaction(ENTITY_STORE, 'readonly')
    const rows = await requestResult(transaction.objectStore(ENTITY_STORE).index('scopeKeys').getAll(scopeKey))
    return (rows || []).filter((row) => row.uid === uid).map(stripLocalMetadata)
  } finally {
    db.close()
  }
}

export function loadPlanningOutbox(uid) {
  return rowsForUid(OUTBOX_STORE, uid)
}

export function loadPlanningConflicts(uid) {
  return rowsForUid(CONFLICT_STORE, uid)
}

export async function acknowledgePlanningOperation(operation) {
  if (!operation?.cacheKey || !operation?.revision) return false
  const db = await openPlanningDatabase()
  try {
    const transaction = db.transaction([ENTITY_STORE, OUTBOX_STORE], 'readwrite')
    const outboxStore = transaction.objectStore(OUTBOX_STORE)
    const current = await requestResult(outboxStore.get(operation.cacheKey))
    if (current?.revision !== operation.revision) {
      transaction.abort()
      return false
    }
    outboxStore.delete(operation.cacheKey)
    if (operation.operation === 'upsert') {
      const entityStore = transaction.objectStore(ENTITY_STORE)
      const entityRow = await requestResult(entityStore.get(operation.cacheKey))
      if (entityRow) {
        entityStore.put({
          ...entityRow,
          remoteUpdatedAt: operation.value?.updatedAt || operation.queuedAt,
        })
      }
    }
    await transactionDone(transaction)
    return true
  } finally {
    db.close()
  }
}

export async function recordPlanningOperationFailure(operation, error) {
  if (!operation?.cacheKey || !operation?.revision) return
  const db = await openPlanningDatabase()
  try {
    const transaction = db.transaction(OUTBOX_STORE, 'readwrite')
    const store = transaction.objectStore(OUTBOX_STORE)
    const current = await requestResult(store.get(operation.cacheKey))
    if (current?.revision === operation.revision) {
      store.put({
        ...current,
        attempts: Math.max(0, Number(current.attempts) || 0) + 1,
        lastError: getSafeCloudSyncError(error),
      })
    }
    await transactionDone(transaction)
  } finally {
    db.close()
  }
}

export async function recordPlanningOperationConflict(operation, remoteValue, remoteUpdatedAt, options = {}) {
  if (!operation?.uid || !operation.cacheKey) return
  const db = await openPlanningDatabase()
  try {
    const transaction = db.transaction(CONFLICT_STORE, 'readwrite')
    transaction.objectStore(CONFLICT_STORE).put({
      cacheKey: operation.cacheKey,
      createdAt: options.now || new Date().toISOString(),
      entityType: operation.entityType,
      localOperation: operation,
      path: operation.path,
      remoteUpdatedAt: remoteUpdatedAt || '',
      remoteValue: remoteValue || null,
      scopeKeys: operation.scopeKeys,
      status: 'open',
      uid: operation.uid,
    })
    await transactionDone(transaction)
  } finally {
    db.close()
  }
}

function toRemoteRow(uid, descriptor, scopeKey) {
  const entity = descriptor.entity || descriptor.value || descriptor
  const location = getPlanningEntityLocation(entity, {
    ...(descriptor.context || {}),
    ownerUid: uid,
    scopeKeys: [scopeKey, ...(descriptor.context?.scopeKeys || [])],
  })
  return {
    cacheKey: getPlanningCacheKey(uid, location.path),
    documentId: location.documentId,
    entityType: entity.entityType,
    localUpdatedAt: '',
    path: location.path,
    remoteUpdatedAt: entity.updatedAt || '',
    scopeKeys: location.scopeKeys,
    uid,
    value: entity,
  }
}

/**
 * Incorpora una consulta remota d'un únic abast. Si el mateix document té una
 * edició local basada en una versió remota diferent, conserva la còpia local i
 * crea un conflicte explícit en comptes de substituir-la silenciosament.
 */
export async function mergePlanningRemoteScope(uid, scopeKey, descriptors = [], options = {}) {
  const remoteRows = descriptors.map((descriptor) => toRemoteRow(uid, descriptor, scopeKey))
  const remoteByKey = new Map(remoteRows.map((row) => [row.cacheKey, row]))
  const now = options.now || new Date().toISOString()
  const db = await openPlanningDatabase()
  try {
    const transaction = db.transaction([ENTITY_STORE, OUTBOX_STORE, CONFLICT_STORE], 'readwrite')
    const entityStore = transaction.objectStore(ENTITY_STORE)
    const outboxStore = transaction.objectStore(OUTBOX_STORE)
    const conflictStore = transaction.objectStore(CONFLICT_STORE)
    const [localRows, pendingRows] = await Promise.all([
      requestResult(entityStore.index('scopeKeys').getAll(scopeKey)),
      requestResult(outboxStore.index('scopeKeys').getAll(scopeKey)),
    ])
    const localByKey = new Map((localRows || []).filter((row) => row.uid === uid).map((row) => [row.cacheKey, row]))
    const pendingByKey = new Map((pendingRows || []).filter((row) => row.uid === uid).map((row) => [row.cacheKey, row]))

    remoteRows.forEach((remoteRow) => {
      const pending = pendingByKey.get(remoteRow.cacheKey)
      const previousLocal = localByKey.get(remoteRow.cacheKey)
      const mergedRemoteRow = previousLocal
        ? { ...remoteRow, scopeKeys: [...new Set([...previousLocal.scopeKeys, ...remoteRow.scopeKeys])] }
        : remoteRow
      if (!pending) {
        entityStore.put(mergedRemoteRow)
        conflictStore.delete(remoteRow.cacheKey)
        return
      }
      if (pending.operation === 'upsert' && areCloudDocumentsEqual(pending.value, remoteRow.value)) {
        entityStore.put(mergedRemoteRow)
        outboxStore.delete(remoteRow.cacheKey)
        conflictStore.delete(remoteRow.cacheKey)
        return
      }
      if (pending.baseUpdatedAt === remoteRow.remoteUpdatedAt) return
      conflictStore.put({
        cacheKey: remoteRow.cacheKey,
        createdAt: now,
        entityType: remoteRow.entityType,
        localOperation: pending,
        path: remoteRow.path,
        remoteUpdatedAt: remoteRow.remoteUpdatedAt,
        remoteValue: remoteRow.value,
        scopeKeys: remoteRow.scopeKeys,
        status: 'open',
        uid,
      })
    })

    if (options.completeSnapshot === true) {
      localByKey.forEach((localRow, cacheKey) => {
        if (remoteByKey.has(cacheKey)) return
        const pending = pendingByKey.get(cacheKey)
        if (!pending) {
          entityStore.delete(cacheKey)
          conflictStore.delete(cacheKey)
          return
        }
        if (pending.operation === 'delete') {
          outboxStore.delete(cacheKey)
          conflictStore.delete(cacheKey)
          return
        }
        if (!pending.baseUpdatedAt) return
        conflictStore.put({
          cacheKey,
          createdAt: now,
          entityType: pending.entityType,
          localOperation: pending,
          path: pending.path,
          remoteUpdatedAt: '',
          remoteValue: null,
          scopeKeys: pending.scopeKeys,
          status: 'open',
          uid,
        })
      })
    }
    await transactionDone(transaction)
  } finally {
    db.close()
  }
  return loadPlanningScope(uid, scopeKey)
}

export async function resolvePlanningConflict(uid, path, strategy, options = {}) {
  const cacheKey = getPlanningCacheKey(uid, path)
  const db = await openPlanningDatabase()
  try {
    const transaction = db.transaction([ENTITY_STORE, OUTBOX_STORE, CONFLICT_STORE], 'readwrite')
    const entityStore = transaction.objectStore(ENTITY_STORE)
    const outboxStore = transaction.objectStore(OUTBOX_STORE)
    const conflictStore = transaction.objectStore(CONFLICT_STORE)
    const conflict = await requestResult(conflictStore.get(cacheKey))
    if (!conflict || conflict.uid !== uid) throw new Error("No s'ha trobat el conflicte de planificació")

    if (strategy === 'remote') {
      outboxStore.delete(cacheKey)
      if (conflict.remoteValue) {
        entityStore.put({
          cacheKey,
          documentId: conflict.localOperation.documentId,
          entityType: conflict.entityType,
          localUpdatedAt: '',
          path,
          remoteUpdatedAt: conflict.remoteUpdatedAt,
          scopeKeys: conflict.scopeKeys,
          uid,
          value: conflict.remoteValue,
        })
      } else {
        entityStore.delete(cacheKey)
      }
    } else if (strategy === 'local') {
      const resolvedAt = options.now || new Date().toISOString()
      const localValue = conflict.localOperation.value
        ? { ...conflict.localOperation.value, updatedAt: resolvedAt }
        : undefined
      outboxStore.put({
        ...conflict.localOperation,
        attempts: 0,
        baseUpdatedAt: conflict.remoteUpdatedAt,
        lastError: '',
        queuedAt: resolvedAt,
        revision: createRevision(),
        ...(localValue ? { value: localValue } : {}),
      })
      if (localValue) {
        const entityRow = await requestResult(entityStore.get(cacheKey))
        if (entityRow) entityStore.put({ ...entityRow, localUpdatedAt: resolvedAt, value: localValue })
      }
    } else {
      throw new Error('Cal escollir la versió local o la remota')
    }
    conflictStore.delete(cacheKey)
    await transactionDone(transaction)
  } finally {
    db.close()
  }
}

/** Elimina totes les dades locals del compte quan es tanca la sessió. */
export async function clearPlanningLocalData(uid, { discardPending = false } = {}) {
  if (!uid) return
  if (!discardPending && (await loadPlanningOutbox(uid)).length > 0) {
    const error = new Error('Hi ha canvis de planificació pendents de sincronitzar. Connecta’t abans de tancar la sessió.')
    error.code = 'planning/pending-logout'
    throw error
  }
  const db = await openPlanningDatabase()
  try {
    const transaction = db.transaction([ENTITY_STORE, OUTBOX_STORE, CONFLICT_STORE], 'readwrite')
    ;[ENTITY_STORE, OUTBOX_STORE, CONFLICT_STORE].forEach((storeName) => {
      const store = transaction.objectStore(storeName)
      const request = store.index('uid').getAllKeys(uid)
      request.onsuccess = () => request.result.forEach((key) => store.delete(key))
      request.onerror = () => transaction.abort()
    })
    await transactionDone(transaction)
  } finally {
    db.close()
  }
}
