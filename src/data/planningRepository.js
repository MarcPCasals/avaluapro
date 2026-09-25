import {
  deletePlanningEntityLocally,
  loadPlanningScope,
  mergePlanningRemoteScope,
  savePlanningEntityLocally,
} from './local/planningIndexedDb.js'
import { flushPlanningOutbox, getPlanningSyncSummary } from './sync/planningSync.js'

async function missingRemotePlanningService() {
  throw new Error('Falta el servei remot de Planificació')
}

const SHARED_SCOPE_FRESHNESS_MS = 30_000
const sharedRepositories = new Map()

/**
 * Fa de frontera única entre els futurs formularis i les dades. La interfície
 * escriu primer a IndexedDB i mai no ha d'esperar Firestore per conservar el
 * canvi; la xarxa només buida la cua persistent quan està disponible.
 */
export function createPlanningRepository({
  applyRemoteOperation = missingRemotePlanningService,
  freshForMs = 0,
  isOnline = () => globalThis.navigator?.onLine !== false,
  uid,
} = {}) {
  if (!uid) throw new Error('Cal un usuari per obrir la planificació')

  const freshScopes = new Map()
  const pendingScopeLoads = new Map()

  function invalidateLoadedScopes() {
    freshScopes.clear()
  }

  return {
    async loadScope(scopeKey, loadRemote, options = {}) {
      const cached = await loadPlanningScope(uid, scopeKey)
      if (!isOnline() || typeof loadRemote !== 'function') {
        return { entities: cached, source: 'local' }
      }
      const requestKey = `${scopeKey}:${options.completeSnapshot === true ? 'complete' : 'partial'}`
      if (options.forceRemote !== true && Number(freshScopes.get(requestKey)) > Date.now()) {
        return { entities: cached, source: 'memory' }
      }
      if (pendingScopeLoads.has(requestKey)) {
        try {
          await pendingScopeLoads.get(requestKey)
          return { entities: await loadPlanningScope(uid, scopeKey), source: 'shared' }
        } catch (error) {
          return { entities: cached, error, source: 'local' }
        }
      }
      const remoteLoad = (async () => {
        const remoteDescriptors = await loadRemote()
        const entities = await mergePlanningRemoteScope(uid, scopeKey, remoteDescriptors, options)
        if (freshForMs > 0) freshScopes.set(requestKey, Date.now() + freshForMs)
        return entities
      })()
      pendingScopeLoads.set(requestKey, remoteLoad)
      try {
        const entities = await remoteLoad
        return { entities, source: 'remote' }
      } catch (error) {
        return { entities: cached, error, source: 'local' }
      } finally {
        pendingScopeLoads.delete(requestKey)
      }
    },

    remove(entity, context) {
      invalidateLoadedScopes()
      return deletePlanningEntityLocally(uid, entity, context)
    },

    save(entity, context) {
      invalidateLoadedScopes()
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

/**
 * Agenda i Programació comparteixen aquesta instància lleugera. La informació
 * continua vivint a IndexedDB; aquí només es recorda durant uns segons quins
 * àmbits ja s'han validat i quines consultes idèntiques estan en curs.
 */
export function getSharedPlanningRepository({ uid, ...options } = {}) {
  if (!uid) throw new Error('Cal un usuari per obrir la planificació')
  if (!sharedRepositories.has(uid)) {
    sharedRepositories.set(uid, createPlanningRepository({
      ...options,
      freshForMs: options.freshForMs ?? SHARED_SCOPE_FRESHNESS_MS,
      uid,
    }))
  }
  return sharedRepositories.get(uid)
}

export function clearSharedPlanningRepository(uid) {
  if (uid) sharedRepositories.delete(uid)
  else sharedRepositories.clear()
}
