function normalizeComparableValue(value) {
  if (value === undefined) return undefined
  if (value === null || typeof value !== 'object') return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value.toDate === 'function') {
    const date = value.toDate()
    if (date instanceof Date && !Number.isNaN(date.getTime())) return date.toISOString()
  }
  if (Array.isArray(value)) return value.map(normalizeComparableValue)

  return Object.keys(value)
    .sort()
    .reduce((result, key) => {
      const normalized = normalizeComparableValue(value[key])
      if (normalized !== undefined) result[key] = normalized
      return result
    }, {})
}

export function isFirestoreSpecialValue(value) {
  if (!value || typeof value !== 'object') return false
  if (value instanceof Date || typeof value.toDate === 'function') return true
  return ['serverTimestamp', 'deleteField', 'arrayUnion', 'arrayRemove', 'increment'].includes(value._methodName)
}

export function areCloudDocumentsEqual(first, second) {
  return JSON.stringify(normalizeComparableValue(first)) === JSON.stringify(normalizeComparableValue(second))
}

export function buildCloudDocumentDiff(localDocuments = [], remoteDocuments = []) {
  const localById = new Map(localDocuments.map((item) => [item.id, item.value]))
  const remoteById = new Map(remoteDocuments.map((item) => [item.id, item.value]))
  const upserts = []
  const deleteIds = []
  const skippedIds = []

  localById.forEach((value, id) => {
    if (remoteById.has(id) && areCloudDocumentsEqual(value, remoteById.get(id))) {
      skippedIds.push(id)
      return
    }
    upserts.push({ id, value })
  })

  remoteById.forEach((_value, id) => {
    if (!localById.has(id)) deleteIds.push(id)
  })

  return {
    upserts,
    deleteIds,
    skippedIds,
    stats: {
      read: remoteDocuments.length,
      written: upserts.length,
      deleted: deleteIds.length,
      skipped: skippedIds.length,
    },
  }
}

export function isFirestoreQuotaError(error) {
  const code = String(error?.code || error?.cause?.code || '').toLowerCase()
  const message = String(error?.message || error?.cause?.message || '').toLowerCase()
  return code.includes('resource-exhausted') || message.includes('resource_exhausted') || message.includes('quota exceeded')
}

export function isFirestoreNetworkError(error) {
  const code = String(error?.code || error?.cause?.code || '').toLowerCase()
  const message = String(error?.message || error?.cause?.message || '').toLowerCase()
  return (
    ['deadline-exceeded', 'network-request-failed', 'unavailable'].some((value) => code.includes(value)) ||
    message.includes('failed to get document because the client is offline')
  )
}
