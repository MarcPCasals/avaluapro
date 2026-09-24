import {
  acknowledgePlanningOperation,
  loadPlanningConflicts,
  loadPlanningOutbox,
  recordPlanningOperationConflict,
  recordPlanningOperationFailure,
} from '../local/planningIndexedDb.js'
import { isFirestoreQuotaError } from '../../lib/cloudSyncDiff.js'

export const PLANNING_QUOTA_RETRY_DELAY_MS = 60 * 60 * 1000

export const PLANNING_SYNC_STATES = Object.freeze({
  SAVED: 'saved',
  SAVING: 'saving',
  PENDING: 'pending',
  OFFLINE: 'offline',
  REVIEW: 'review',
  ERROR: 'error',
})

export const PLANNING_SYNC_LABELS = Object.freeze({
  [PLANNING_SYNC_STATES.SAVED]: 'Desat',
  [PLANNING_SYNC_STATES.SAVING]: 'Desant',
  [PLANNING_SYNC_STATES.PENDING]: 'Pendent',
  [PLANNING_SYNC_STATES.OFFLINE]: 'Sense connexió',
  [PLANNING_SYNC_STATES.REVIEW]: 'Cal revisar',
  [PLANNING_SYNC_STATES.ERROR]: 'Error',
})

function activeQuotaRetry(operations, now = Date.now()) {
  return operations
    .map((operation) => operation.retryAt || '')
    .filter((retryAt) => Date.parse(retryAt) > now)
    .sort()[0] || ''
}

export function getPlanningSyncState({ conflictCount = 0, error = '', isOnline = true, pendingCount = 0, syncing = false } = {}) {
  if (conflictCount > 0) return PLANNING_SYNC_STATES.REVIEW
  if (!isOnline) return PLANNING_SYNC_STATES.OFFLINE
  if (syncing) return PLANNING_SYNC_STATES.SAVING
  if (error) return PLANNING_SYNC_STATES.ERROR
  if (pendingCount > 0) return PLANNING_SYNC_STATES.PENDING
  return PLANNING_SYNC_STATES.SAVED
}

export async function getPlanningSyncSummary(uid, options = {}) {
  const [pending, conflicts] = await Promise.all([
    loadPlanningOutbox(uid),
    loadPlanningConflicts(uid),
  ])
  const quotaRetryAt = options.quotaRetryAt || activeQuotaRetry(pending, options.now || Date.now())
  if (conflicts.length === 0 && quotaRetryAt) {
    return {
      conflictCount: 0,
      errorKind: 'quota',
      label: 'Desat al dispositiu',
      message: 'El canvi està protegit en aquest dispositiu. Firebase ha arribat temporalment al límit i AvaluaPro el sincronitzarà automàticament quan la quota torni a estar disponible.',
      pendingCount: pending.length,
      retryAvailableAt: quotaRetryAt,
      state: PLANNING_SYNC_STATES.PENDING,
    }
  }
  const state = getPlanningSyncState({
    conflictCount: conflicts.length,
    error: options.error,
    isOnline: options.isOnline,
    pendingCount: pending.length,
    syncing: options.syncing,
  })
  return {
    conflictCount: conflicts.length,
    errorKind: '',
    label: PLANNING_SYNC_LABELS[state],
    message: '',
    pendingCount: pending.length,
    retryAvailableAt: '',
    state,
  }
}

function operationDepth(operation) {
  return String(operation.path || '').split('/').length
}

function orderedOperations(operations) {
  return [...operations].sort((first, second) => {
    const depthDifference = operationDepth(first) - operationDepth(second)
    if (first.operation === 'delete' && second.operation === 'delete') return -depthDifference
    if (first.operation !== second.operation) return first.operation === 'delete' ? 1 : -1
    if (depthDifference !== 0) return depthDifference
    return String(first.queuedAt).localeCompare(String(second.queuedAt))
  })
}

/**
 * Buida la cua una operació cada vegada. El servidor ha de comprovar
 * `baseUpdatedAt` abans d'escriure; si retorna un conflicte, l'operació es
 * conserva perquè la interfície pugui demanar quina versió s'ha de mantenir.
 */
export async function flushPlanningOutbox(uid, applyRemoteOperation, options = {}) {
  if (!uid) throw new Error('Cal iniciar sessió per sincronitzar la planificació')
  if (typeof applyRemoteOperation !== 'function') throw new Error('Falta el servei de sincronització remota')
  if (options.isOnline === false) return getPlanningSyncSummary(uid, { isOnline: false })
  const operations = orderedOperations(await loadPlanningOutbox(uid))
  const now = Number(options.now) || Date.now()
  const quotaRetryAt = activeQuotaRetry(operations, now)
  if (quotaRetryAt) return getPlanningSyncSummary(uid, { now, quotaRetryAt })
  let lastError = ''

  for (const operation of operations) {
    try {
      const result = await applyRemoteOperation(operation)
      if (result?.conflict) {
        lastError = 'planning/conflict'
        await recordPlanningOperationConflict(
          operation,
          result.remoteValue,
          result.remoteUpdatedAt,
        )
        continue
      }
      await acknowledgePlanningOperation(operation)
    } catch (error) {
      lastError = error?.code || 'planning/sync-error'
      const retryAt = isFirestoreQuotaError(error)
        ? new Date(now + PLANNING_QUOTA_RETRY_DELAY_MS).toISOString()
        : ''
      await recordPlanningOperationFailure(operation, error, { retryAt })
      if (options.stopOnError !== false) break
    }
  }
  return getPlanningSyncSummary(uid, { error: lastError, isOnline: true })
}
