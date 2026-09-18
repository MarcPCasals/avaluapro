import { createId } from '../../lib/ids.js'
import { PLANNING_ID_PREFIXES } from './constants.js'

function getEntityPrefix(entityType) {
  const prefix = PLANNING_ID_PREFIXES[entityType]
  if (!prefix) throw new Error(`Tipus d'entitat de planificació desconegut: ${entityType}`)
  return prefix
}

/**
 * Genera un identificador de domini amb un prefix llegible. La persistència no
 * depèn de l'ordre dels elements ni del títol, de manera que renombrar o moure
 * una activitat no en trenca les referències.
 */
export function createPlanningId(entityType, idFactory = createId) {
  return idFactory(getEntityPrefix(entityType))
}

/** Conserva l'identificador existent quan una entitat es torna a normalitzar. */
export function ensurePlanningId(id, entityType, idFactory = createId) {
  const normalizedId = String(id || '').trim()
  return normalizedId || createPlanningId(entityType, idFactory)
}
