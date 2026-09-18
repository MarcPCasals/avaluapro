import {
  acknowledgePlanningOperation,
  loadPlanningConflicts,
  loadPlanningOutbox,
  recordPlanningOperationConflict,
  recordPlanningOperationFailure,
} from '../local/planningIndexedDb.js'

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
  const state = getPlanningSyncState({
    conflictCount: conflicts.length,
    error: options.error,
    isOnline: options.isOnline,
    pendingCount: pending.length,
    syncing: options.syncing,
  })
  return {
    conflictCount: conflicts.length,
    label: PLANNING_SYNC_LABELS[state],
    pendingCount: pending.length,
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
      await recordPlanningOperationFailure(operation, error)
      if (options.stopOnError !== false) break
    }
  }
  return getPlanningSyncSummary(uid, { error: lastError, isOnline: true })
}
