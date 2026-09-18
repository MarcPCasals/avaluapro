import { PLANNING_ENTITY_TYPES } from '../domain/planning/constants.js'

const OWNER_COLLECTIONS = Object.freeze({
  [PLANNING_ENTITY_TYPES.ACADEMIC_YEAR]: 'planningAcademicYears',
  [PLANNING_ENTITY_TYPES.TEMPORAL_UNIT]: 'planningTemporalUnits',
  [PLANNING_ENTITY_TYPES.TIMETABLE_VERSION]: 'planningTimetables',
  [PLANNING_ENTITY_TYPES.TIMETABLE_SLOT]: 'planningTimetableSlots',
  [PLANNING_ENTITY_TYPES.CALENDAR_EVENT]: 'planningCalendarEvents',
})

function requiredId(value, label) {
  const id = String(value || '').trim().replaceAll('/', '_')
  if (!id) throw new Error(`No s'ha pogut identificar ${label}`)
  return id
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

/**
 * Converteix una entitat de domini en una ubicació estable. La mateixa ruta
 * identifica el document a IndexedDB, la cua local i Firestore; així una
 * confirmació antiga mai no pot retirar una edició posterior d'un altre lloc.
 */
export function getPlanningEntityLocation(entity, context = {}) {
  const entityType = entity?.entityType
  const entityId = requiredId(entity?.id, "l'entitat de planificació")
  const ownerUid = requiredId(context.ownerUid || entity?.ownerUid, 'el docent')
  const extraScopeKeys = Array.isArray(context.scopeKeys) ? context.scopeKeys : []
  const ownerCollection = OWNER_COLLECTIONS[entityType]

  if (ownerCollection) {
    const scopeKeys = [`owner:${ownerUid}`]
    if (entityType === PLANNING_ENTITY_TYPES.ACADEMIC_YEAR) scopeKeys.push('academicYears')
    if (entity.academicYearId) scopeKeys.push(`academicYear:${entity.academicYearId}:${ownerCollection}`)
    if (entity.timetableVersionId) scopeKeys.push(`timetable:${entity.timetableVersionId}:slots`)
    return {
      documentId: entityId,
      path: `users/${ownerUid}/${ownerCollection}/${entityId}`,
      scopeKeys: unique([...scopeKeys, ...extraScopeKeys]),
    }
  }

  if (entityType === PLANNING_ENTITY_TYPES.PLANNING_UNIT) {
    return {
      documentId: entityId,
      path: `planningUnits/${entityId}`,
      scopeKeys: unique([
        `academicYear:${entity.academicYearId}:planningUnits`,
        `temporalUnit:${entity.temporalUnitId}:planningUnits`,
        `planningUnit:${entityId}:structure`,
        ...extraScopeKeys,
      ]),
    }
  }

  const planningUnitId = requiredId(
    context.planningUnitId || entity.planningUnitId,
    'la UP de l’entitat',
  )
  const unitPath = `planningUnits/${planningUnitId}`

  if (entityType === PLANNING_ENTITY_TYPES.PLANNING_PHASE) {
    return {
      documentId: entityId,
      path: `${unitPath}/phases/${entityId}`,
      scopeKeys: unique([`planningUnit:${planningUnitId}:structure`, ...extraScopeKeys]),
    }
  }

  if (entityType === PLANNING_ENTITY_TYPES.PLANNING_ACTIVITY) {
    return {
      documentId: entityId,
      path: `${unitPath}/activities/${entityId}`,
      scopeKeys: unique([`planningUnit:${planningUnitId}:structure`, ...extraScopeKeys]),
    }
  }

  if (entityType === PLANNING_ENTITY_TYPES.ACCESS_GRANT) {
    const email = requiredId(entity.granteeEmail, 'el correu convidat').toLowerCase()
    return {
      documentId: email,
      path: `${unitPath}/accessGrants/${email}`,
      scopeKeys: unique([`planningUnit:${planningUnitId}:grants`, ...extraScopeKeys]),
    }
  }

  if (entityType === PLANNING_ENTITY_TYPES.GROUP_APPLICATION) {
    return {
      documentId: entityId,
      path: `${unitPath}/applications/${entityId}`,
      scopeKeys: unique([
        `planningUnit:${planningUnitId}:applications`,
        `class:${entity.classId}:applications`,
        ...extraScopeKeys,
      ]),
    }
  }

  if (entityType === PLANNING_ENTITY_TYPES.PRIVATE_NOTE) {
    return {
      documentId: entityId,
      path: `planningPrivateNotes/${entityId}`,
      scopeKeys: unique([
        `planningUnit:${planningUnitId}:privateNotes`,
        entity.sessionId ? `session:${entity.sessionId}:privateNotes` : '',
        ...extraScopeKeys,
      ]),
    }
  }

  const applicationId = requiredId(context.applicationId || entity.applicationId, "l'aplicació de grup")
  const applicationPath = `${unitPath}/applications/${applicationId}`

  if (entityType === PLANNING_ENTITY_TYPES.ACTIVITY_OVERRIDE) {
    return {
      documentId: entityId,
      path: `${applicationPath}/activityOverrides/${entityId}`,
      scopeKeys: unique([`application:${applicationId}:overrides`, ...extraScopeKeys]),
    }
  }

  if (entityType === PLANNING_ENTITY_TYPES.CALENDAR_SESSION) {
    return {
      documentId: entityId,
      path: `${applicationPath}/sessions/${entityId}`,
      scopeKeys: unique([
        `application:${applicationId}:sessions`,
        `class:${entity.classId}:sessions`,
        ...extraScopeKeys,
      ]),
    }
  }

  const sessionId = requiredId(context.sessionId || entity.sessionId, 'la sessió')
  const sessionPath = `${applicationPath}/sessions/${sessionId}`

  if (entityType === PLANNING_ENTITY_TYPES.SESSION_ITEM) {
    return {
      documentId: entityId,
      path: `${sessionPath}/items/${entityId}`,
      scopeKeys: unique([`session:${sessionId}:detail`, ...extraScopeKeys]),
    }
  }

  if (entityType === PLANNING_ENTITY_TYPES.ACTIVITY_RESULT) {
    return {
      documentId: entityId,
      path: `${sessionPath}/results/${entityId}`,
      scopeKeys: unique([`session:${sessionId}:detail`, ...extraScopeKeys]),
    }
  }

  throw new Error(`Entitat de planificació desconeguda: ${entityType || 'sense tipus'}`)
}

export function getPlanningCacheKey(uid, path) {
  return `${requiredId(uid, 'el docent')}::${requiredId(path, 'el document')}`
}
