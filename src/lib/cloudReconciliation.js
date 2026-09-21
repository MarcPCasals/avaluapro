import { areCloudDocumentsEqual } from './cloudSyncDiff.js'

const UPDATED_AT_FIELDS = [
  'updatedAt',
  'completedAt',
  'capturedAt',
  'importedAt',
  'createdAt',
]

function asMillis(value) {
  if (!value) return 0
  if (typeof value?.toDate === 'function') return value.toDate().getTime()
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function getRowUpdatedAt(row = {}) {
  return UPDATED_AT_FIELDS.reduce((latest, field) => Math.max(latest, asMillis(row[field])), 0)
}

function isMergeableObject(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof value.toDate !== 'function',
  )
}

function keepMissingFields(preferred, fallback) {
  if (!isMergeableObject(preferred) || !isMergeableObject(fallback)) return preferred

  return Object.keys(fallback).reduce((result, key) => {
    if (result[key] === undefined) return { ...result, [key]: fallback[key] }
    if (isMergeableObject(result[key]) && isMergeableObject(fallback[key])) {
      return { ...result, [key]: keepMissingFields(result[key], fallback[key]) }
    }
    return result
  }, { ...preferred })
}

function getRowLabel(row = {}) {
  return row.name || row.title || row.studentName || row.id || ''
}

/**
 * Reuneix dues còpies del mateix espai de treball sense interpretar una absència
 * com una eliminació. Els registres exclusius de qualsevol costat es conserven.
 * Quan el mateix id és diferent, només es decideix automàticament si una de les
 * dues versions té una data de modificació posterior inequívoca.
 */
export function reconcileCloudDatasets(localDataset = {}, cloudDataset = {}, collections = []) {
  const dataset = {}
  const conflicts = []
  const stats = {
    cloudOnly: 0,
    cloudNewer: 0,
    equal: 0,
    localOnly: 0,
    localNewer: 0,
  }

  collections.forEach((collectionName) => {
    const localRows = localDataset[collectionName] || []
    const cloudRows = cloudDataset[collectionName] || []
    const localById = new Map(localRows.map((row) => [String(row.id), row]))
    const cloudById = new Map(cloudRows.map((row) => [String(row.id), row]))
    const orderedIds = [
      ...localRows.map((row) => String(row.id)),
      ...cloudRows.map((row) => String(row.id)).filter((id) => !localById.has(id)),
    ]

    dataset[collectionName] = orderedIds.map((id) => {
      const localRow = localById.get(id)
      const cloudRow = cloudById.get(id)

      if (!localRow) {
        stats.cloudOnly += 1
        return cloudRow
      }
      if (!cloudRow) {
        stats.localOnly += 1
        return localRow
      }
      if (areCloudDocumentsEqual(localRow, cloudRow)) {
        stats.equal += 1
        return localRow
      }

      const localUpdatedAt = getRowUpdatedAt(localRow)
      const cloudUpdatedAt = getRowUpdatedAt(cloudRow)
      if (localUpdatedAt > cloudUpdatedAt) {
        stats.localNewer += 1
        return keepMissingFields(localRow, cloudRow)
      }
      if (cloudUpdatedAt > localUpdatedAt) {
        stats.cloudNewer += 1
        return keepMissingFields(cloudRow, localRow)
      }

      conflicts.push({
        collection: collectionName,
        id,
        label: getRowLabel(localRow) || getRowLabel(cloudRow),
      })
      return localRow
    })
  })

  return {
    canReconcile: conflicts.length === 0,
    conflicts,
    dataset,
    stats,
  }
}
