import {
  arrayRemove,
  arrayUnion,
  deleteField,
  doc,
  FieldPath,
  runTransaction,
} from 'firebase/firestore'
import { PLANNING_ENTITY_TYPES } from '../../domain/planning/constants.js'
import { areCloudDocumentsEqual } from '../../lib/cloudSyncDiff.js'

const OWNER_COLLECTIONS = Object.freeze({
  academicYear: 'planningAcademicYears',
  temporalUnit: 'planningTemporalUnits',
  timetableVersion: 'planningTimetables',
  timetableSlot: 'planningTimetableSlots',
  calendarEvent: 'planningCalendarEvents',
})

function cleanValue(value) {
  if (Array.isArray(value)) return value.map(cleanValue)
  if (!value || typeof value !== 'object') return value ?? null
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, cleanValue(entry)]),
  )
}

function isAccessGrantPath(pathParts) {
  return pathParts.length === 4 && pathParts[0] === 'planningUnits' && pathParts[2] === 'accessGrants'
}

function requiresCurrentUserOwnership(entityType) {
  return Boolean(OWNER_COLLECTIONS[entityType])
    || entityType === PLANNING_ENTITY_TYPES.ACCESS_GRANT
    || entityType === PLANNING_ENTITY_TYPES.PRIVATE_NOTE
}

function isExpectedPath(operation, pathParts) {
  const ownerCollection = OWNER_COLLECTIONS[operation.entityType]
  if (ownerCollection) {
    return pathParts.length === 4 && pathParts[0] === 'users' &&
      pathParts[1] === operation.uid && pathParts[2] === ownerCollection
  }
  if (operation.entityType === PLANNING_ENTITY_TYPES.PLANNING_UNIT) {
    return pathParts.length === 2 && pathParts[0] === 'planningUnits'
  }
  if (operation.entityType === PLANNING_ENTITY_TYPES.PLANNING_PHASE) {
    return pathParts.length === 4 && pathParts[0] === 'planningUnits' && pathParts[2] === 'phases'
  }
  if (operation.entityType === PLANNING_ENTITY_TYPES.PLANNING_ACTIVITY) {
    return pathParts.length === 4 && pathParts[0] === 'planningUnits' && pathParts[2] === 'activities'
  }
  if (operation.entityType === PLANNING_ENTITY_TYPES.ACCESS_GRANT) return isAccessGrantPath(pathParts)
  if (operation.entityType === PLANNING_ENTITY_TYPES.GROUP_APPLICATION) {
    return pathParts.length === 4 && pathParts[0] === 'planningUnits' && pathParts[2] === 'applications'
  }
  if (operation.entityType === PLANNING_ENTITY_TYPES.ACTIVITY_OVERRIDE) {
    return pathParts.length === 6 && pathParts[0] === 'planningUnits' &&
      pathParts[2] === 'applications' && pathParts[4] === 'activityOverrides'
  }
  if (operation.entityType === PLANNING_ENTITY_TYPES.CALENDAR_SESSION) {
    return pathParts.length === 6 && pathParts[0] === 'planningUnits' &&
      pathParts[2] === 'applications' && pathParts[4] === 'sessions'
  }
  if (operation.entityType === PLANNING_ENTITY_TYPES.SESSION_ITEM) {
    return pathParts.length === 8 && pathParts[0] === 'planningUnits' &&
      pathParts[2] === 'applications' && pathParts[4] === 'sessions' && pathParts[6] === 'items'
  }
  if (operation.entityType === PLANNING_ENTITY_TYPES.ACTIVITY_RESULT) {
    return pathParts.length === 8 && pathParts[0] === 'planningUnits' &&
      pathParts[2] === 'applications' && pathParts[4] === 'sessions' && pathParts[6] === 'results'
  }
  if (operation.entityType === PLANNING_ENTITY_TYPES.PRIVATE_NOTE) {
    return pathParts.length === 2 && pathParts[0] === 'planningPrivateNotes'
  }
  return false
}

/**
 * Aplica una operació local contra la base indicada i compara la versió remota
 * dins la mateixa transacció. Acceptar la base com a paràmetre permet provar el
 * recorregut complet a l'emulador amb les mateixes regles que producció.
 */
export async function applyPlanningCloudOperationToDatabase(database, operation) {
  if (!operation?.path || !operation.uid || !['upsert', 'delete'].includes(operation.operation)) {
    throw new Error('Operació de planificació incompleta')
  }
  const pathParts = operation.path.split('/').filter(Boolean)
  if (!isExpectedPath(operation, pathParts)) {
    throw new Error('La ruta no correspon al tipus d’entitat de planificació')
  }
  if (operation.operation === 'upsert' && (
    operation.value?.entityType !== operation.entityType
    || (requiresCurrentUserOwnership(operation.entityType) && operation.value?.ownerUid !== operation.uid)
  )) {
    throw new Error('L’operació no correspon al docent o al tipus d’entitat')
  }
  const reference = doc(database, operation.path)

  return runTransaction(database, async (transaction) => {
    const snapshot = await transaction.get(reference)
    const remoteValue = snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
    const remoteUpdatedAt = remoteValue?.updatedAt || ''
    const operationAlreadyApplied = operation.operation === 'upsert' &&
      remoteValue && areCloudDocumentsEqual(operation.value, remoteValue)
    const remoteAlreadyDeleted = operation.operation === 'delete' && !remoteValue

    if (operationAlreadyApplied || remoteAlreadyDeleted) return { applied: true, remoteUpdatedAt }
    if (remoteUpdatedAt !== (operation.baseUpdatedAt || '')) {
      return { conflict: true, remoteUpdatedAt, remoteValue }
    }

    if (isAccessGrantPath(pathParts)) {
      const planningUnitId = pathParts[1]
      const email = decodeURIComponent(pathParts[3]).toLowerCase()
      const unitReference = doc(database, 'planningUnits', planningUnitId)
      await transaction.get(unitReference)
      if (operation.operation === 'delete') {
        transaction.delete(reference)
        transaction.update(
          unitReference,
          new FieldPath('accessByEmail', email),
          deleteField(),
          'authorizedEmails',
          arrayRemove(email),
          'updatedAt',
          new Date().toISOString(),
        )
      } else {
        const value = cleanValue(operation.value)
        transaction.set(reference, value)
        transaction.update(
          unitReference,
          new FieldPath('accessByEmail', email),
          cleanValue({ classIds: value.classIds || [], role: value.role, status: 'active' }),
          'authorizedEmails',
          arrayUnion(email),
          'updatedAt',
          new Date().toISOString(),
        )
      }
      return { applied: true, remoteUpdatedAt: operation.value?.updatedAt || '' }
    }

    if (operation.operation === 'delete') transaction.delete(reference)
    else transaction.set(reference, cleanValue(operation.value), {
      merge: pathParts.length === 2 && pathParts[0] === 'planningUnits',
    })
    return { applied: true, remoteUpdatedAt: operation.value?.updatedAt || '' }
  })
}
