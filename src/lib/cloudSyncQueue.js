import { areCloudDocumentsEqual } from './cloudSyncDiff.js'

export const CLOUD_SYNC_QUEUE_STORE = 'cloudSyncQueue'

export function getCloudDocumentId(row, collectionName, index) {
  return String(row?.id || `${collectionName}_${index}`).replaceAll('/', '_')
}

export function getCloudSyncQueueEntryId(uid, collectionName, documentId) {
  return `${uid}::${collectionName}::${documentId}`
}

function createRevision() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function toDocumentMap(rows = [], collectionName) {
  return new Map(
    rows.map((row, index) => {
      const documentId = getCloudDocumentId(row, collectionName, index)
      return [documentId, { ...row, id: documentId }]
    }),
  )
}

export function buildCloudSyncQueueChanges({ uid, collectionName, previousRows = [], nextRows = [], now }) {
  if (!uid || !collectionName) return []
  const previousById = toDocumentMap(previousRows, collectionName)
  const nextById = toDocumentMap(nextRows, collectionName)
  const updatedAt = now || new Date().toISOString()
  const changes = []

  nextById.forEach((value, documentId) => {
    if (previousById.has(documentId) && areCloudDocumentsEqual(previousById.get(documentId), value)) return
    changes.push({
      id: getCloudSyncQueueEntryId(uid, collectionName, documentId),
      uid,
      collectionName,
      documentId,
      operation: 'upsert',
      value,
      updatedAt,
      revision: createRevision(),
      attempts: 0,
      lastError: '',
    })
  })

  previousById.forEach((_value, documentId) => {
    if (nextById.has(documentId)) return
    changes.push({
      id: getCloudSyncQueueEntryId(uid, collectionName, documentId),
      uid,
      collectionName,
      documentId,
      operation: 'delete',
      updatedAt,
      revision: createRevision(),
      attempts: 0,
      lastError: '',
    })
  })

  return changes
}

export function getPendingCollectionNames(entries = []) {
  return Array.from(new Set(entries.map((entry) => entry.collectionName).filter(Boolean)))
}

export function getSafeCloudSyncError(error) {
  const code = String(error?.code || error?.cause?.code || '').trim()
  if (code) return code.slice(0, 160)
  const name = String(error?.name || error?.cause?.name || '').trim()
  return name && name !== 'Error' ? name.slice(0, 80) : 'cloud-sync-error'
}
