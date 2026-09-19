import {
  ACCESS_ROLES,
  APPLICATION_STATUSES,
  CALENDAR_EVENT_TYPES,
  CHANGE_SCOPES,
  EVIDENCE_MODES,
  PLANNING_ENTITY_TYPES,
  PLANNING_PHASE_KINDS,
  PLANNING_SCHEMA_VERSION,
  PLANNING_UNIT_STATUSES,
  RESULT_STATUSES,
  SESSION_ITEM_TYPES,
  SESSION_STATUSES,
} from './constants.js'
import { ensurePlanningId } from './ids.js'
import { createId } from '../../lib/ids.js'

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

function requiredText(value, fieldName) {
  const text = String(value || '').trim()
  if (!text) throw new Error(`El camp ${fieldName} és obligatori`)
  return text
}

function optionalText(value) {
  const text = String(value || '').trim()
  return text || null
}

function normalizedOrder(value) {
  const order = Number(value)
  if (!Number.isFinite(order) || order < 0) throw new Error("L'ordre no pot ser negatiu")
  return order
}

function optionalMinutes(value, fieldName = 'minuts') {
  if (value === null || value === undefined || value === '') return null
  const minutes = Number(value)
  if (!Number.isFinite(minutes) || minutes <= 0) {
    throw new Error(`El camp ${fieldName} ha de ser superior a zero`)
  }
  return minutes
}

function positiveMinutes(value, fieldName = 'minuts') {
  const minutes = optionalMinutes(value, fieldName)
  if (minutes === null) throw new Error(`El camp ${fieldName} és obligatori`)
  return minutes
}

function enumValue(value, allowedValues, fieldName) {
  if (!allowedValues.includes(value)) {
    throw new Error(`Valor no admès per a ${fieldName}: ${value}`)
  }
  return value
}

function isoDate(value, fieldName) {
  const date = requiredText(value, fieldName)
  if (!ISO_DATE_PATTERN.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new Error(`El camp ${fieldName} ha de tenir el format AAAA-MM-DD`)
  }
  return date
}

function optionalIsoDate(value, fieldName) {
  return value ? isoDate(value, fieldName) : null
}

function isoDateTime(value, fieldName) {
  const dateTime = requiredText(value, fieldName)
  if (Number.isNaN(Date.parse(dateTime))) throw new Error(`El camp ${fieldName} no és una data i hora vàlida`)
  return dateTime
}

function normalizedEmail(value, fieldName) {
  const email = requiredText(value, fieldName).toLocaleLowerCase('ca')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`El camp ${fieldName} no és un correu vàlid`)
  return email
}

function assertDateRange(startsOn, endsOn, label) {
  if (startsOn > endsOn) throw new Error(`La data inicial de ${label} no pot ser posterior a la final`)
}

function normalizedTimestamp(value) {
  return value || new Date().toISOString()
}

function copyObject(value) {
  if (!value) return {}
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]))
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue)
  if (value && typeof value === 'object') return copyObject(value)
  return value
}

function textList(values) {
  return [...new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean))]
}

const CURRICULUM_KEYS = [
  'competencies',
  'expectedLearnings',
  'assessmentCriteria',
  'indicators',
]

function embeddedId(value, prefix, idFactory = createId) {
  return optionalText(value) || idFactory(prefix)
}

/**
 * Conserva una fotografia llegible del currículum dins la UP. Els sourceId
 * només mantenen el vincle opcional amb AvaluaPro; direcció no depèn d'aquell
 * espai privat per poder llegir el text oficial.
 */
function normalizeCurriculum(input = {}, options = {}) {
  return Object.fromEntries(CURRICULUM_KEYS.map((key) => [key, (input?.[key] || []).map((item) => ({
    id: embeddedId(item?.id, 'plan-curriculum', options.idFactory),
    label: requiredText(item?.label, 'contingut curricular'),
    sourceId: optionalText(item?.sourceId),
  }))]))
}

/**
 * Les mesures compartibles contenen únicament la decisió pedagògica i
 * l'alumnat al qual s'aplica. Qualsevol diagnòstic o nota rebut a l'entrada es
 * descarta expressament en normalitzar l'activitat.
 */
function normalizeDiversityMeasures(measures = [], options = {}) {
  return measures.map((measure) => ({
    id: embeddedId(measure?.id, 'plan-measure', options.idFactory),
    label: requiredText(measure?.label, 'mesura d’atenció a la diversitat'),
    classId: optionalText(measure?.classId),
    className: optionalText(measure?.className),
    studentIds: textList(measure?.studentIds),
    studentNames: textList(measure?.studentNames),
  }))
}

function entityBase(entityType, input, options = {}) {
  const timestamp = normalizedTimestamp(options.now)
  return {
    id: ensurePlanningId(input.id, entityType, options.idFactory),
    entityType,
    schemaVersion: PLANNING_SCHEMA_VERSION,
    createdAt: input.createdAt || timestamp,
    updatedAt: input.updatedAt || timestamp,
  }
}

function normalizeMaterials(materials) {
  return (materials || []).map((material) => {
    const kind = enumValue(material.kind || 'link', ['link', 'physical'], 'tipus de material')
    const url = optionalText(material.url)
    if (kind === 'link' && !url) throw new Error("Un material d'enllaç necessita una URL")
    return {
      id: optionalText(material.id),
      kind,
      label: requiredText(material.label, 'nom del material'),
      url,
    }
  })
}

export function createAcademicYear(input, options = {}) {
  const startsOn = isoDate(input.startsOn, 'inici del curs')
  const endsOn = isoDate(input.endsOn, 'final del curs')
  assertDateRange(startsOn, endsOn, 'curs acadèmic')
  return {
    ...entityBase(PLANNING_ENTITY_TYPES.ACADEMIC_YEAR, input, options),
    ownerUid: requiredText(input.ownerUid, 'propietari'),
    label: requiredText(input.label, 'nom del curs'),
    startsOn,
    endsOn,
  }
}

export function createTemporalUnit(input, options = {}) {
  const startsOn = isoDate(input.startsOn, 'inici de la UT')
  const endsOn = isoDate(input.endsOn, 'final de la UT')
  assertDateRange(startsOn, endsOn, 'UT')
  return {
    ...entityBase(PLANNING_ENTITY_TYPES.TEMPORAL_UNIT, input, options),
    academicYearId: requiredText(input.academicYearId, 'curs acadèmic'),
    ownerUid: requiredText(input.ownerUid, 'propietari'),
    label: requiredText(input.label, 'nom de la UT'),
    order: normalizedOrder(input.order),
    startsOn,
    endsOn,
  }
}

export function createPlanningUnit(input, options = {}) {
  const curriculum = normalizeCurriculum(input.curriculum, options)
  const hasCurriculum = Object.prototype.hasOwnProperty.call(input, 'curriculum')
  const curriculumSourceIds = (key, fallback) => hasCurriculum
    ? curriculum[key].map((item) => item.sourceId).filter(Boolean)
    : textList(fallback)
  return {
    ...entityBase(PLANNING_ENTITY_TYPES.PLANNING_UNIT, input, options),
    ownerUid: requiredText(input.ownerUid, 'propietari'),
    academicYearId: requiredText(input.academicYearId, 'curs acadèmic'),
    temporalUnitId: requiredText(input.temporalUnitId, 'UT'),
    code: requiredText(input.code, 'codi de la UP'),
    level: requiredText(input.level, 'nivell'),
    title: requiredText(input.title, 'títol de la UP'),
    status: enumValue(input.status || 'draft', PLANNING_UNIT_STATUSES, 'estat de la UP'),
    versionNumber: Math.max(1, Number(input.versionNumber) || 1),
    complexSituation: optionalText(input.complexSituation),
    expectedProduct: optionalText(input.expectedProduct),
    vehicularLanguage: optionalText(input.vehicularLanguage),
    curriculum,
    competencyIds: curriculumSourceIds('competencies', input.competencyIds),
    expectedLearningIds: curriculumSourceIds('expectedLearnings', input.expectedLearningIds),
    assessmentCriterionIds: curriculumSourceIds('assessmentCriteria', input.assessmentCriterionIds),
    indicatorIds: curriculumSourceIds('indicators', input.indicatorIds),
    specificResources: textList(input.specificResources),
    transversalResources: textList(input.transversalResources),
    factsAndConcepts: textList(input.factsAndConcepts),
    procedures: textList(input.procedures),
    attitudesAndValues: textList(input.attitudesAndValues),
    copiedFrom: input.copiedFrom
      ? {
          planningUnitId: requiredText(input.copiedFrom.planningUnitId, 'UP original'),
          academicYearId: requiredText(input.copiedFrom.academicYearId, 'curs original'),
          copiedAt: normalizedTimestamp(input.copiedFrom.copiedAt || options.now),
        }
      : null,
  }
}

export function copyPlanningUnitToAcademicYear(source, target, options = {}) {
  return createPlanningUnit(
    {
      ...cloneValue(source),
      id: null,
      createdAt: null,
      updatedAt: null,
      academicYearId: requiredText(target.academicYearId, 'nou curs acadèmic'),
      temporalUnitId: requiredText(target.temporalUnitId, 'nova UT'),
      code: target.code || source.code,
      status: 'draft',
      versionNumber: Number(source.versionNumber || 1) + 1,
      copiedFrom: {
        planningUnitId: source.id,
        academicYearId: source.academicYearId,
        copiedAt: options.now,
      },
    },
    options,
  )
}

export function createPlanningPhase(input, options = {}) {
  return {
    ...entityBase(PLANNING_ENTITY_TYPES.PLANNING_PHASE, input, options),
    ownerUid: requiredText(input.ownerUid, 'propietari'),
    planningUnitId: requiredText(input.planningUnitId, 'UP'),
    parentPhaseId: optionalText(input.parentPhaseId),
    kind: enumValue(input.kind || 'custom', PLANNING_PHASE_KINDS, 'tipus de fase'),
    title: requiredText(input.title, 'títol de la fase'),
    order: normalizedOrder(input.order),
  }
}

export function createPlanningActivity(input, options = {}) {
  const diversityMeasures = normalizeDiversityMeasures(input.diversityMeasures, options)
  return {
    ...entityBase(PLANNING_ENTITY_TYPES.PLANNING_ACTIVITY, input, options),
    ownerUid: requiredText(input.ownerUid, 'propietari'),
    planningUnitId: requiredText(input.planningUnitId, 'UP'),
    phaseId: requiredText(input.phaseId, 'fase'),
    type: enumValue(input.type || 'activity', SESSION_ITEM_TYPES, "tipus d'element"),
    title: requiredText(input.title, "títol de l'activitat"),
    description: optionalText(input.description),
    order: normalizedOrder(input.order),
    plannedMinutes: optionalMinutes(input.plannedMinutes, 'temps previst'),
    teacherMaterials: normalizeMaterials(input.teacherMaterials),
    studentMaterials: normalizeMaterials(input.studentMaterials),
    grouping: optionalText(input.grouping),
    space: optionalText(input.space),
    indicatorIds: textList(input.indicatorIds),
    diversityMeasureIds: Object.prototype.hasOwnProperty.call(input, 'diversityMeasures')
      ? diversityMeasures.map((measure) => measure.id)
      : textList(input.diversityMeasureIds),
    diversityMeasures,
    applicationComment: optionalText(input.applicationComment),
    evidenceMode: enumValue(input.evidenceMode || 'none', EVIDENCE_MODES, "mode d'evidència"),
  }
}

export function updatePlanningActivity(activity, changes, options = {}) {
  const immutableFields = new Set([
    'id',
    'entityType',
    'schemaVersion',
    'createdAt',
    'ownerUid',
    'planningUnitId',
  ])
  const allowedChanges = Object.fromEntries(
    Object.entries(changes || {}).filter(([field]) => !immutableFields.has(field)),
  )
  return createPlanningActivity(
    {
      ...cloneValue(activity),
      ...cloneValue(allowedChanges),
      updatedAt: normalizedTimestamp(options.now),
    },
    options,
  )
}

export function createGroupApplication(input, options = {}) {
  return {
    ...entityBase(PLANNING_ENTITY_TYPES.GROUP_APPLICATION, input, options),
    ownerUid: requiredText(input.ownerUid, 'propietari'),
    academicYearId: requiredText(input.academicYearId, 'curs acadèmic'),
    planningUnitId: requiredText(input.planningUnitId, 'UP base'),
    planningUnitVersion: Math.max(1, Number(input.planningUnitVersion) || 1),
    classId: requiredText(input.classId, 'grup'),
    status: enumValue(input.status || 'draft', APPLICATION_STATUSES, "estat de l'aplicació"),
  }
}

export function createGroupActivityOverride(input, options = {}) {
  return {
    ...entityBase(PLANNING_ENTITY_TYPES.ACTIVITY_OVERRIDE, input, options),
    ownerUid: requiredText(input.ownerUid, 'propietari'),
    applicationId: requiredText(input.applicationId, 'aplicació de grup'),
    activityId: requiredText(input.activityId, 'activitat base'),
    changeScope: enumValue(input.changeScope || 'groupOnly', CHANGE_SCOPES, "abast del canvi"),
    changes: copyObject(input.changes),
    proposalStatus: input.changeScope === 'groupAndProposal' ? 'pending' : null,
  }
}

export function createTimetableVersion(input, options = {}) {
  const effectiveFrom = isoDate(input.effectiveFrom, "entrada en vigor de l'horari")
  const effectiveTo = optionalIsoDate(input.effectiveTo, "final de vigència de l'horari")
  if (effectiveTo) assertDateRange(effectiveFrom, effectiveTo, 'versió horària')
  return {
    ...entityBase(PLANNING_ENTITY_TYPES.TIMETABLE_VERSION, input, options),
    ownerUid: requiredText(input.ownerUid, 'propietari'),
    academicYearId: requiredText(input.academicYearId, 'curs acadèmic'),
    label: requiredText(input.label, "nom de l'horari"),
    effectiveFrom,
    effectiveTo,
  }
}

export function createTimetableSlot(input, options = {}) {
  const startsAt = requiredText(input.startsAt, "hora d'inici")
  if (!TIME_PATTERN.test(startsAt)) throw new Error("L'hora d'inici ha de tenir el format HH:mm")
  const weekday = Number(input.weekday)
  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) {
    throw new Error('El dia de la setmana ha de ser un enter entre 1 i 7')
  }
  return {
    ...entityBase(PLANNING_ENTITY_TYPES.TIMETABLE_SLOT, input, options),
    ownerUid: requiredText(input.ownerUid, 'propietari'),
    timetableVersionId: requiredText(input.timetableVersionId, 'versió horària'),
    classId: requiredText(input.classId, 'grup'),
    weekday,
    startsAt,
    durationMinutes: positiveMinutes(input.durationMinutes, 'durada de la sessió'),
    subject: requiredText(input.subject, 'assignatura'),
    space: optionalText(input.space),
    subgroupId: optionalText(input.subgroupId),
  }
}

export function createCalendarEvent(input, options = {}) {
  const startsOn = isoDate(input.startsOn, "inici de l'esdeveniment")
  const endsOn = optionalIsoDate(input.endsOn, "final de l'esdeveniment") || startsOn
  assertDateRange(startsOn, endsOn, 'esdeveniment')
  return {
    ...entityBase(PLANNING_ENTITY_TYPES.CALENDAR_EVENT, input, options),
    ownerUid: requiredText(input.ownerUid, 'propietari'),
    academicYearId: requiredText(input.academicYearId, 'curs acadèmic'),
    type: enumValue(input.type, CALENDAR_EVENT_TYPES, "tipus d'esdeveniment"),
    title: requiredText(input.title, "títol de l'esdeveniment"),
    startsOn,
    endsOn,
    classIds: textList(input.classIds),
    reason: optionalText(input.reason),
    consumesPlannedSession: Boolean(input.consumesPlannedSession),
  }
}

export function createCalendarSession(input, options = {}) {
  return {
    ...entityBase(PLANNING_ENTITY_TYPES.CALENDAR_SESSION, input, options),
    ownerUid: requiredText(input.ownerUid, 'propietari'),
    applicationId: requiredText(input.applicationId, 'aplicació de grup'),
    classId: requiredText(input.classId, 'grup'),
    timetableSlotId: optionalText(input.timetableSlotId),
    startsAt: isoDateTime(input.startsAt, "data i hora d'inici"),
    durationMinutes: positiveMinutes(input.durationMinutes, 'durada de la sessió'),
    subgroupId: optionalText(input.subgroupId),
    status: enumValue(input.status || 'planned', SESSION_STATUSES, 'estat de la sessió'),
  }
}

export function createSessionItem(input, options = {}) {
  const type = enumValue(input.type, SESSION_ITEM_TYPES, "tipus d'element de sessió")
  const sourceActivityId = optionalText(input.sourceActivityId)
  return {
    ...entityBase(PLANNING_ENTITY_TYPES.SESSION_ITEM, input, options),
    ownerUid: requiredText(input.ownerUid, 'propietari'),
    applicationId: requiredText(input.applicationId, 'aplicació de grup'),
    sessionId: requiredText(input.sessionId, 'sessió'),
    type,
    sourceActivityId,
    title: requiredText(input.title, "títol de l'element"),
    order: normalizedOrder(input.order),
    plannedMinutes: optionalMinutes(input.plannedMinutes, 'temps previst'),
    segmentIndex: sourceActivityId ? Math.max(1, Number(input.segmentIndex) || 1) : null,
    segmentCount: sourceActivityId ? Math.max(1, Number(input.segmentCount) || 1) : null,
  }
}

export function createActivityResult(input, options = {}) {
  return {
    ...entityBase(PLANNING_ENTITY_TYPES.ACTIVITY_RESULT, input, options),
    ownerUid: requiredText(input.ownerUid, 'propietari'),
    applicationId: requiredText(input.applicationId, 'aplicació de grup'),
    sessionId: requiredText(input.sessionId, 'sessió'),
    sessionItemId: requiredText(input.sessionItemId, 'element de sessió'),
    sourceActivityId: optionalText(input.sourceActivityId),
    status: enumValue(input.status || 'completed', RESULT_STATUSES, "estat del resultat"),
    actualMinutes: optionalMinutes(input.actualMinutes, 'temps real'),
    pedagogicalReflection: optionalText(input.pedagogicalReflection),
    applicationComment: optionalText(input.applicationComment),
    reviewedAt: input.reviewedAt || null,
  }
}

export function createAccessGrant(input, options = {}) {
  const role = enumValue(input.role, ACCESS_ROLES, 'rol de compartició')
  if (role === 'owner') throw new Error('El propietari es defineix a la UP, no mitjançant una invitació')
  return {
    ...entityBase(PLANNING_ENTITY_TYPES.ACCESS_GRANT, input, options),
    ownerUid: requiredText(input.ownerUid, 'propietari'),
    planningUnitId: requiredText(input.planningUnitId, 'UP compartida'),
    granteeEmail: normalizedEmail(input.granteeEmail, 'correu convidat'),
    granteeUid: optionalText(input.granteeUid),
    role,
    classIds: textList(input.classIds),
    status: enumValue(input.status || 'active', ['active', 'revoked'], "estat de l'accés"),
  }
}

export function createPlanningPrivateNote(input, options = {}) {
  return {
    ...entityBase(PLANNING_ENTITY_TYPES.PRIVATE_NOTE, input, options),
    ownerUid: requiredText(input.ownerUid, 'propietari'),
    planningUnitId: requiredText(input.planningUnitId, 'UP'),
    applicationId: optionalText(input.applicationId),
    sessionId: optionalText(input.sessionId),
    text: requiredText(input.text, 'nota privada'),
  }
}
