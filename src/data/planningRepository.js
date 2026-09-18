import {
  deletePlanningEntityLocally,
  loadPlanningScope,
  mergePlanningRemoteScope,
  savePlanningEntityLocally,
} from './local/planningIndexedDb.js'
import { flushPlanningOutbox, getPlanningSyncSummary } from './sync/planningSync.js'

async function applyPlanningOperationToFirebase(operation) {
  const { applyPlanningCloudOperation } = await import('./cloud/planningFirestore.js')
  return applyPlanningCloudOperation(operation)
}

/**
 * Fa de frontera única entre els futurs formularis i les dades. La interfície
 * escriu primer a IndexedDB i mai no ha d'esperar Firestore per conservar el
 * canvi; la xarxa només buida la cua persistent quan està disponible.
 */
export function createPlanningRepository({
  applyRemoteOperation = applyPlanningOperationToFirebase,
  isOnline = () => globalThis.navigator?.onLine !== false,
  uid,
} = {}) {
  if (!uid) throw new Error('Cal un usuari per obrir la planificació')

  return {
    async loadScope(scopeKey, loadRemote, options = {}) {
      const cached = await loadPlanningScope(uid, scopeKey)
      if (!isOnline() || typeof loadRemote !== 'function') {
        return { entities: cached, source: 'local' }
      }
      const remoteDescriptors = await loadRemote()
      const entities = await mergePlanningRemoteScope(uid, scopeKey, remoteDescriptors, options)
      return { entities, source: 'remote' }
    },

    remove(entity, context) {
      return deletePlanningEntityLocally(uid, entity, context)
    },

    save(entity, context) {
      return savePlanningEntityLocally(uid, entity, context)
    },

    status(options = {}) {
      return getPlanningSyncSummary(uid, { isOnline: isOnline(), ...options })
    },

    synchronize(options = {}) {
      return flushPlanningOutbox(uid, applyRemoteOperation, {
        isOnline: isOnline(),
        ...options,
      })
    },
  }
}
