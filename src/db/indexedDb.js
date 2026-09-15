import { COLLECTIONS, EMPTY_DATASET } from '../data/seedData.js'
import {
  CLOUD_SYNC_QUEUE_STORE,
  buildCloudSyncQueueChanges,
  getSafeCloudSyncError,
} from '../lib/cloudSyncQueue.js'

const DB_NAME = 'avaluapro-v2'
const DB_VERSION = 14
const TUTORING_COORDINATION_CACHE_STORE = 'tutoringCoordinationCache'
const TUTORING_COORDINATION_OUTBOX_STORE = 'tutoringCoordinationOutbox'

const INDEXES = {
  students: ['classId'],
  semesters: ['classId'],
  uts: ['classId', 'semesterId'],
  competencies: ['classId', 'utId'],
  marks: ['studentId', 'criterionId'],
  tasks: ['classId', 'utId'],
  taskRecords: ['classId', 'utId', 'studentId', 'taskId'],
  behaviorEvents: ['classId', 'studentId'],
  agendaNotes: ['classId', 'studentId'],
  tutorialRecords: ['classId', 'studentId', 'type'],
  tutorialMarks: ['classId', 'studentId', 'subject', 'criterionKey'],
  tutorialRelations: ['classId', 'sourceStudentId', 'targetStudentId', 'type'],
  tutorialGroupSets: ['classId', 'strategy'],
  tutorialSociometricMoments: ['classId', 'capturedAt', 'source'],
  tutorialSociogramLayouts: ['classId'],
  tutorialStudentRoles: ['classId', 'studentId', 'role'],
  tutorialSeatingPlans: ['classId'],
  seatingCharts: ['classId', 'halfGroup'],
  studentAntecedents: ['studentId', 'classId'],
  sociometricSurveys: ['classId', 'ownerUid', 'status'],
}

function ensureStore(db, collection) {
  if (!db.objectStoreNames.contains(collection)) {
    return db.createObjectStore(collection, { keyPath: 'id' })
  }

  return null
}

function ensureCustomStore(db, collection, keyPath) {
  if (!db.objectStoreNames.contains(collection)) {
    return db.createObjectStore(collection, { keyPath })
  }

  return null
}

function ensureIndexes(store, collection) {
  const indexes = INDEXES[collection] || []
  indexes.forEach((indexName) => {
    if (!store.indexNames.contains(indexName)) {
      store.createIndex(indexName, indexName, { unique: false })
    }
  })
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      COLLECTIONS.forEach((collection) => {
        const store = ensureStore(db, collection) || request.transaction.objectStore(collection)
        ensureIndexes(store, collection)
      })
      const queueStore = ensureStore(db, CLOUD_SYNC_QUEUE_STORE) || request.transaction.objectStore(CLOUD_SYNC_QUEUE_STORE)
      if (!queueStore.indexNames.contains('uid')) queueStore.createIndex('uid', 'uid', { unique: false })
      if (!queueStore.indexNames.contains('collectionName')) {
        queueStore.createIndex('collectionName', 'collectionName', { unique: false })
      }
      const coordinationCacheStore = ensureCustomStore(db, TUTORING_COORDINATION_CACHE_STORE, 'cacheKey') ||
        request.transaction.objectStore(TUTORING_COORDINATION_CACHE_STORE)
      if (!coordinationCacheStore.indexNames.contains('uid')) {
        coordinationCacheStore.createIndex('uid', 'uid', { unique: false })
      }
      if (!coordinationCacheStore.indexNames.contains('spaceKey')) {
        coordinationCacheStore.createIndex('spaceKey', 'spaceKey', { unique: false })
      }
      const coordinationOutboxStore = ensureCustomStore(db, TUTORING_COORDINATION_OUTBOX_STORE, 'id') ||
        request.transaction.objectStore(TUTORING_COORDINATION_OUTBOX_STORE)
      if (!coordinationOutboxStore.indexNames.contains('uid')) {
        coordinationOutboxStore.createIndex('uid', 'uid', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function getStorageErrorMessage(error) {
  const isQuotaError =
    error?.name === 'QuotaExceededError' ||
    error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error?.code === 22 ||
    error?.code === 1014

  if (isQuotaError) {
    return 'Límit d’emmagatzematge superat. Avaluapro no ha pogut guardar aquest canvi perquè el navegador no té prou espai disponible.'
  }

  return 'No s’han pogut guardar les dades locals. Revisa l’espai disponible del navegador.'
}

function readStore(db, collection) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(collection, 'readonly')
    const store = transaction.objectStore(collection)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function replaceStore(db, collection, rows) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(collection, 'readwrite')
    const store = transaction.objectStore(collection)
    store.clear()
    rows.forEach((row) => store.put(row))

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

export async function loadDataset() {
  const db = await openDatabase()
  const entries = await Promise.all(
    COLLECTIONS.map(async (collection) => [collection, await readStore(db, collection)]),
  )
  db.close()
  return entries.reduce((dataset, [collection, rows]) => ({ ...dataset, [collection]: rows }), {
    ...EMPTY_DATASET,
  })
}

export async function saveDataset(dataset) {
  await saveCollections(dataset, COLLECTIONS)
}

export async function saveCollections(dataset, collections) {
  let db
  try {
    db = await openDatabase()
    await Promise.all(
      collections.map((collection) => replaceStore(db, collection, dataset[collection] || [])),
    )
  } catch (error) {
    throw new Error(getStorageErrorMessage(error), { cause: error })
  } finally {
    if (db) {
      db.close()
    }
  }
}

export async function saveCollectionsWithCloudQueue(dataset, collections, uid) {
  if (!uid) return saveCollections(dataset, collections)
  let db
  try {
    db = await openDatabase()
    await new Promise((resolve, reject) => {
      const transaction = db.transaction([...new Set([...collections, CLOUD_SYNC_QUEUE_STORE])], 'readwrite')
      const queueStore = transaction.objectStore(CLOUD_SYNC_QUEUE_STORE)

      collections.forEach((collection) => {
        const store = transaction.objectStore(collection)
        const readRequest = store.getAll()
        readRequest.onsuccess = () => {
          const nextRows = dataset[collection] || []
          const changes = buildCloudSyncQueueChanges({
            uid,
            collectionName: collection,
            previousRows: readRequest.result || [],
            nextRows,
          })
          store.clear()
          nextRows.forEach((row) => store.put(row))
          changes.forEach((change) => queueStore.put(change))
        }
        readRequest.onerror = () => transaction.abort()
      })

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } catch (error) {
    throw new Error(getStorageErrorMessage(error), { cause: error })
  } finally {
    if (db) db.close()
  }
}

export async function loadCloudSyncQueue(uid) {
  if (!uid) return []
  const db = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(CLOUD_SYNC_QUEUE_STORE, 'readonly')
      const request = transaction.objectStore(CLOUD_SYNC_QUEUE_STORE).index('uid').getAll(uid)
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

export async function acknowledgeCloudSyncQueue(entries = []) {
  if (entries.length === 0) return
  const db = await openDatabase()
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(CLOUD_SYNC_QUEUE_STORE, 'readwrite')
      const store = transaction.objectStore(CLOUD_SYNC_QUEUE_STORE)
      entries.forEach((entry) => {
        const request = store.get(entry.id)
        request.onsuccess = () => {
          if (request.result?.revision === entry.revision) store.delete(entry.id)
        }
      })
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    db.close()
  }
}

export async function recordCloudSyncQueueFailure(entries = [], error) {
  if (entries.length === 0) return
  const db = await openDatabase()
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(CLOUD_SYNC_QUEUE_STORE, 'readwrite')
      const store = transaction.objectStore(CLOUD_SYNC_QUEUE_STORE)
      entries.forEach((entry) => {
        const request = store.get(entry.id)
        request.onsuccess = () => {
          const current = request.result
          if (current?.revision !== entry.revision) return
          store.put({
            ...current,
            attempts: Math.max(0, Number(current.attempts) || 0) + 1,
            lastError: getSafeCloudSyncError(error),
          })
        }
      })
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    db.close()
  }
}

export async function clearCloudSyncQueue(uid) {
  const entries = await loadCloudSyncQueue(uid)
  if (entries.length === 0) return
  const db = await openDatabase()
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(CLOUD_SYNC_QUEUE_STORE, 'readwrite')
      const store = transaction.objectStore(CLOUD_SYNC_QUEUE_STORE)
      entries.forEach((entry) => store.delete(entry.id))
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    db.close()
  }
}

function coordinationCacheRow(uid, spaceId, item) {
  return {
    ...item,
    cacheKey: `${uid}:${spaceId}:${item.id}`,
    spaceId,
    spaceKey: `${uid}:${spaceId}`,
    uid,
  }
}

function stripCoordinationCacheMeta(row = {}) {
  const item = { ...row }
  delete item.cacheKey
  delete item.spaceKey
  delete item.uid
  return item
}

export async function loadTutoringCoordinationCache(uid) {
  if (!uid) return []
  const db = await openDatabase()
  try {
    const rows = await new Promise((resolve, reject) => {
      const request = db
        .transaction(TUTORING_COORDINATION_CACHE_STORE, 'readonly')
        .objectStore(TUTORING_COORDINATION_CACHE_STORE)
        .index('uid')
        .getAll(uid)
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
    return rows.map(stripCoordinationCacheMeta)
  } finally {
    db.close()
  }
}

export async function replaceTutoringCoordinationCache(uid, spaceId, items = []) {
  if (!uid || !spaceId) return
  const db = await openDatabase()
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(TUTORING_COORDINATION_CACHE_STORE, 'readwrite')
      const store = transaction.objectStore(TUTORING_COORDINATION_CACHE_STORE)
      const request = store.index('spaceKey').getAllKeys(`${uid}:${spaceId}`)
      request.onsuccess = () => {
        request.result.forEach((key) => store.delete(key))
        items.forEach((item) => store.put(coordinationCacheRow(uid, spaceId, item)))
      }
      request.onerror = () => transaction.abort()
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    db.close()
  }
}

export async function queueTutoringCoordinationOperation(uid, operation) {
  if (!uid || !operation?.id) return
  const db = await openDatabase()
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [TUTORING_COORDINATION_CACHE_STORE, TUTORING_COORDINATION_OUTBOX_STORE],
        'readwrite',
      )
      if (operation.type === 'item' && operation.item?.id && operation.spaceId) {
        transaction
          .objectStore(TUTORING_COORDINATION_CACHE_STORE)
          .put(coordinationCacheRow(uid, operation.spaceId, operation.item))
      }
      transaction.objectStore(TUTORING_COORDINATION_OUTBOX_STORE).put({ ...operation, uid })
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    db.close()
  }
}

export async function loadTutoringCoordinationOutbox(uid) {
  if (!uid) return []
  const db = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const request = db
        .transaction(TUTORING_COORDINATION_OUTBOX_STORE, 'readonly')
        .objectStore(TUTORING_COORDINATION_OUTBOX_STORE)
        .index('uid')
        .getAll(uid)
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

export async function acknowledgeTutoringCoordinationOperation(operationId, revision) {
  if (!operationId) return
  const db = await openDatabase()
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(TUTORING_COORDINATION_OUTBOX_STORE, 'readwrite')
      const store = transaction.objectStore(TUTORING_COORDINATION_OUTBOX_STORE)
      const request = store.get(operationId)
      request.onsuccess = () => {
        if (!revision || request.result?.revision === revision) store.delete(operationId)
      }
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    db.close()
  }
}

export async function resetDatabase() {
  const db = await openDatabase()
  await Promise.all(COLLECTIONS.map((collection) => replaceStore(db, collection, [])))
  db.close()
}
