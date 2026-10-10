import { editHistory } from '../lib/editHistory.js'
import { getPlanningEntityLocation } from './planningEntityLocation.js'
import {
  deletePlanningEntityLocally,
  readPlanningHistoryRows,
  restorePlanningHistoryRows,
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
 * Afegeix a una resposta remota el context de ruta que Firestore no desa dins
 * dels documents fills. Així IndexedDB pot reconstruir la ruta completa sense
 * contaminar l'entitat de domini amb identificadors redundants.
 */
export function withPlanningRemoteContext(entities = [], context = {}) {
  return entities.map((entity) => ({ entity, context }))
}

/**
 * Fa de frontera única entre els futurs formularis i les dades. La interfície
 * escriu primer a IndexedDB i mai no ha d'esperar Firestore per conservar el
 * canvi; la xarxa només buida la cua persistent quan està disponible.
 */
export function createPlanningRepository({
  applyRemoteOperation = missingRemotePlanningService,
  freshForMs = 0,
  history = editHistory,
  isOnline = () => globalThis.navigator?.onLine !== false,
  uid,
} = {}) {
  if (!uid) throw new Error('Cal un usuari per obrir la planificació')

  const freshScopes = new Map()
  const appliedRefreshTokens = new Map()
  const pendingScopeLoads = new Map()
  let historyLocalRefreshUntil = 0

  function invalidateLoadedScopes() {
    freshScopes.clear()
  }

  const historyAdapter = {
    id: `planning:${uid}`,
    readMany: (changes) => readPlanningHistoryRows(uid, changes),
    writeMany: (changes, side) => restorePlanningHistoryRows(uid, changes, side),
    refresh: async () => {
      invalidateLoadedScopes()
      try { await flushPlanningOutbox(uid, applyRemoteOperation, { isOnline: isOnline() }) }
      finally { historyLocalRefreshUntil = Date.now() + 5000 }
    },
  }
  async function mutate(entity, context = {}, remove = false) {
    invalidateLoadedScopes()
    const location = getPlanningEntityLocation(entity, { ...context, ownerUid: uid })
    const [before] = await historyAdapter.readMany([{ key: location.path }])
    const operation = await (remove ? deletePlanningEntityLocally : savePlanningEntityLocally)(uid, entity, context)
    history.record(historyAdapter, location.path, before, remove ? null : operation.value,
      { ...location, entityType: entity.entityType })
    return operation
  }

  return {
    async loadScope(scopeKey, loadRemote, options = {}) {
      const selectSnapshotEntities = (entities) => options.snapshotRange
        ? entities.filter((entity) => {
            const { field, from, to } = options.snapshotRange
            return entity[field] >= from && entity[field] <= to
          })
        : entities
      const cached = selectSnapshotEntities(await loadPlanningScope(uid, scopeKey))
      if ((!options.forceRemote && Date.now() < historyLocalRefreshUntil) || !isOnline() || typeof loadRemote !== 'function') {
        return { entities: cached, source: 'local' }
      }
      // La setmana, la cronologia i el curs s'emmagatzemen al mateix abast,
      // però no són la mateixa consulta ni comparteixen la mateixa frescor.
      const requestKey = `${scopeKey}:${options.completeSnapshot === true ? 'complete' : 'partial'}:${JSON.stringify(options.snapshotRange || null)}`
      const refreshTokenPending = options.refreshToken !== undefined
        && appliedRefreshTokens.get(requestKey) !== options.refreshToken
      if (options.forceRemote !== true && !refreshTokenPending && Number(freshScopes.get(requestKey)) > Date.now()) {
        return { entities: cached, source: 'memory' }
      }
      if (pendingScopeLoads.has(requestKey)) {
        try {
          await pendingScopeLoads.get(requestKey)
          return { entities: selectSnapshotEntities(await loadPlanningScope(uid, scopeKey)), source: 'shared' }
        } catch (error) {
          return { entities: cached, error, source: 'local' }
        }
      }
      const remoteLoad = (async () => {
        const remoteDescriptors = await loadRemote()
        const entities = await mergePlanningRemoteScope(uid, scopeKey, remoteDescriptors, options)
        if (freshForMs > 0) freshScopes.set(requestKey, Date.now() + freshForMs)
        if (options.refreshToken !== undefined) appliedRefreshTokens.set(requestKey, options.refreshToken)
        return entities
      })()
      pendingScopeLoads.set(requestKey, remoteLoad)
      try {
        const entities = await remoteLoad
        return { entities: selectSnapshotEntities(entities), source: 'remote' }
      } catch (error) {
        return { entities: cached, error, source: 'local' }
      } finally {
        pendingScopeLoads.delete(requestKey)
      }
    },

    remove(entity, context) {
      return mutate(entity, context, true)
    },

    save(entity, context) {
      return mutate(entity, context)
    },

    resumeRemoteReads() { historyLocalRefreshUntil = 0 },

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
