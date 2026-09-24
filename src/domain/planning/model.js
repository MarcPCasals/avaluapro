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
import { normalizeResourceSections, PEDAGOGICAL_TYPES } from './documents.js'

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

const IMPROVEMENT_KINDS = ['time', 'materials', 'adaptation', 'reflection', 'sequence']
const IMPROVEMENT_STATUSES = ['pending', 'accepted', 'dismissed']
const IMPROVEMENT_RECOMMENDATIONS = ['keep', 'modify', 'remove']

function normalizeSuggestedChanges(changes = {}) {
  const normalized = {}
  if (Object.prototype.hasOwnProperty.call(changes, 'plannedMinutes')) {
    normalized.plannedMinutes = optionalMinutes(changes.plannedMinutes, 'temps proposat')
  }
  if (Object.prototype.hasOwnProperty.call(changes, 'description')) {
    normalized.description = optionalText(changes.description)
  }
  if (Object.prototype.hasOwnProperty.call(changes, 'applicationComment')) {
    normalized.applicationComment = optionalText(changes.applicationComment)
  }
  return normalized
}

/**
 * Les propostes són dades revisables, no canvis automàtics. Només guarden
 * evidències pedagògiques i modificacions explícites que el docent podrà
 * acceptar en una versió nova de la UP.
 */
function normalizeImprovementProposals(proposals = [], options = {}) {
  return proposals.map((proposal) => ({
    id: embeddedId(proposal?.id, 'plan-improvement', options.idFactory),
    activityId: requiredText(proposal?.activityId, 'activitat de la proposta'),
    kind: enumValue(proposal?.kind || 'reflection', IMPROVEMENT_KINDS, 'tipus de proposta'),
    title: requiredText(proposal?.title, 'títol de la proposta'),
    detail: optionalText(proposal?.detail),
    status: enumValue(proposal?.status || 'pending', IMPROVEMENT_STATUSES, 'estat de la proposta'),
    suggestedChanges: normalizeSuggestedChanges(proposal?.suggestedChanges),
    sourceGroupNames: textList(proposal?.sourceGroupNames),
    plannedMinutes: optionalMinutes(proposal?.plannedMinutes, 'temps previst de la proposta'),
    actualMinutesAverage: optionalMinutes(proposal?.actualMinutesAverage, 'temps real mitjà'),
    sampleCount: Math.max(0, Number(proposal?.sampleCount) || 0),
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
    const preparationKind = enumValue(
      material.preparationKind || 'reference',
      ['reference', 'student', 'teacher', 'print', 'buy', 'reserve'],
      'funció del material',
    )
    const url = optionalText(material.url)
    if (kind === 'link' && !url) throw new Error("Un material d'enllaç necessita una URL")
    return {
      id: optionalText(material.id),
      kind,
      label: requiredText(material.label, 'nom del material'),
      preparationKind,
      reminderDaysBefore: preparationKind === 'reference'
        ? 0
        : Math.min(365, Math.max(0, Math.round(Number(material.reminderDaysBefore ?? 1) || 0))),
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
    tutoringSpaceId: optionalText(input.tutoringSpaceId),
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
    resourceSections: normalizeResourceSections(input.resourceSections, input),
    improvementProposals: normalizeImprovementProposals(input.improvementProposals, options),
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
      improvementProposals: target.improvementProposals || [],
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
    pedagogicalType: enumValue(input.pedagogicalType || 'custom', PEDAGOGICAL_TYPES, 'tipus pedagògic'),
    copiedFrom: input.copiedFrom
      ? {
          planningUnitId: requiredText(input.copiedFrom.planningUnitId, 'UP original de l’activitat'),
          activityId: requiredText(input.copiedFrom.activityId, 'activitat original'),
          academicYearId: requiredText(input.copiedFrom.academicYearId, 'curs original de l’activitat'),
          copiedAt: normalizedTimestamp(input.copiedFrom.copiedAt || options.now),
        }
      : null,
  }
}

/** Crea una activitat independent i en conserva una traça discreta d'origen. */
export function copyPlanningActivityToPhase(source, target, options = {}) {
  return createPlanningActivity({
    ...cloneValue(source),
    id: null,
    createdAt: null,
    updatedAt: null,
    planningUnitId: requiredText(target.planningUnitId, 'UP de destinació'),
    phaseId: requiredText(target.phaseId, 'fase de destinació'),
    order: normalizedOrder(target.order),
    copiedFrom: {
      planningUnitId: target.sourcePlanningUnitId || source.planningUnitId,
      activityId: source.id,
      academicYearId: requiredText(target.sourceAcademicYearId, 'curs original de l’activitat'),
      copiedAt: options.now,
    },
  }, options)
}

/**
 * Duplica tota la jerarquia amb identificadors nous. El mapa previ de fases
 * permet conservar subfases i moviments sense deixar cap vincle cap a l'UP
 * antiga. Els permisos de compartició no s'hereten entre cursos.
 */
export function copyPlanningUnitStructureToAcademicYear(source, target, options = {}) {
  const sourceUnit = source.planningUnit
  const planningUnit = {
    ...copyPlanningUnitToAcademicYear(sourceUnit, target, options),
    accessByEmail: {},
    authorizedEmails: [],
    ownerEmailLower: optionalText(target.ownerEmailLower) || '',
  }
  const phaseIdMap = new Map((source.phases || []).map((phase) => [
    phase.id,
    ensurePlanningId(null, PLANNING_ENTITY_TYPES.PLANNING_PHASE, options.idFactory),
  ]))
  const phases = (source.phases || []).map((phase) => createPlanningPhase({
    ...cloneValue(phase),
    id: phaseIdMap.get(phase.id),
    createdAt: null,
    updatedAt: null,
    planningUnitId: planningUnit.id,
    parentPhaseId: phase.parentPhaseId ? phaseIdMap.get(phase.parentPhaseId) : null,
  }, options))
  const activityIdMap = new Map()
  const activities = (source.activities || []).map((activity) => {
    const copy = copyPlanningActivityToPhase(activity, {
      planningUnitId: planningUnit.id,
      phaseId: phaseIdMap.get(activity.phaseId),
      order: activity.order,
      sourceAcademicYearId: sourceUnit.academicYearId,
      sourcePlanningUnitId: sourceUnit.id,
    }, options)
    activityIdMap.set(activity.id, copy.id)
    return copy
  })
  const improvementProposals = (sourceUnit.improvementProposals || [])
    .filter((proposal) => proposal.status !== 'dismissed' && activityIdMap.has(proposal.activityId))
    .map((proposal) => ({
      ...cloneValue(proposal),
      id: null,
      activityId: activityIdMap.get(proposal.activityId),
      status: 'pending',
    }))
  const normalizedUnit = createPlanningUnit({ ...planningUnit, improvementProposals }, options)
  return {
    planningUnit: {
      ...normalizedUnit,
      accessByEmail: {},
      authorizedEmails: [],
      ownerEmailLower: planningUnit.ownerEmailLower,
    },
    phases,
    activities,
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
    // La UP conserva el seu propietari, però cada cotutor gestiona una
    // aplicació independent al seu horari. En aplicacions antigues ambdós
    // camps coincideixen, de manera que no cal cap migració destructiva.
    managerUid: requiredText(input.managerUid || input.ownerUid, 'docent responsable de l’agenda'),
    academicYearId: requiredText(input.academicYearId, 'curs acadèmic'),
    planningUnitId: requiredText(input.planningUnitId, 'UP base'),
    planningUnitVersion: Math.max(1, Number(input.planningUnitVersion) || 1),
    classId: requiredText(input.classId, 'grup'),
    classLabel: optionalText(input.classLabel),
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
    sharedProgrammingSlotId: optionalText(input.sharedProgrammingSlotId),
  }
}

/**
 * Crea una nova versió anual o de canvi d'horari sense reutilitzar cap
 * identificador. Les franges es copien com a punt de partida i l'horari
 * d'origen queda intacte, incloses les sessions que ja se n'hagin derivat.
 */
export function copyTimetableVersionStructure(
  { timetableVersion, slots = [] },
  { effectiveFrom, effectiveTo = null, label },
  options = {},
) {
  const nextVersion = createTimetableVersion({
    ...timetableVersion,
    id: undefined,
    createdAt: undefined,
    updatedAt: undefined,
    effectiveFrom,
    effectiveTo,
    label,
  }, options)
  const nextSlots = slots.map((slot) => createTimetableSlot({
    ...slot,
    id: undefined,
    createdAt: undefined,
    updatedAt: undefined,
    sharedProgrammingSlotId: null,
    timetableVersionId: nextVersion.id,
  }, options))
  const copiedSlotIdBySourceId = new Map(slots.map((slot, index) => [slot.id, nextSlots[index].id]))
  return {
    timetableVersion: nextVersion,
    slots: nextSlots.map((slot, index) => ({
      ...slot,
      sharedProgrammingSlotId: copiedSlotIdBySourceId.get(slots[index].sharedProgrammingSlotId) || null,
    })),
  }
}

export function createCalendarEvent(input, options = {}) {
  const startsOn = isoDate(input.startsOn, "inici de l'esdeveniment")
  const endsOn = optionalIsoDate(input.endsOn, "final de l'esdeveniment") || startsOn
  const startsAt = optionalText(input.startsAt)
  if (startsAt && !TIME_PATTERN.test(startsAt)) {
    throw new Error("L'hora de la classe extraordinària ha de tenir el format HH:mm")
  }
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
    startsAt,
    durationMinutes: optionalMinutes(input.durationMinutes, 'durada de la classe extraordinària'),
    subgroupId: optionalText(input.subgroupId),
    scope: optionalText(input.scope),
    sessionId: optionalText(input.sessionId),
    timetableSlotId: optionalText(input.timetableSlotId),
  }
}

export function createCalendarSession(input, options = {}) {
  return {
    ...entityBase(PLANNING_ENTITY_TYPES.CALENDAR_SESSION, input, options),
    ownerUid: requiredText(input.ownerUid, 'propietari'),
    applicationId: requiredText(input.applicationId, 'aplicació de grup'),
    classId: requiredText(input.classId, 'grup'),
    calendarEventId: optionalText(input.calendarEventId),
    timetableSlotId: optionalText(input.timetableSlotId),
    startsAt: isoDateTime(input.startsAt, "data i hora d'inici"),
    durationMinutes: positiveMinutes(input.durationMinutes, 'durada de la sessió'),
    subgroupId: optionalText(input.subgroupId),
    parallelProgrammingKey: optionalText(input.parallelProgrammingKey),
    status: enumValue(input.status || 'planned', SESSION_STATUSES, 'estat de la sessió'),
    classroomOpenedAt: input.classroomOpenedAt ? isoDateTime(input.classroomOpenedAt, "obertura de Mode aula") : null,
    attendanceConfirmedAt: input.attendanceConfirmedAt ? isoDateTime(input.attendanceConfirmedAt, "confirmació de l'assistència") : null,
    classroomClosedAt: input.classroomClosedAt ? isoDateTime(input.classroomClosedAt, "tancament de Mode aula") : null,
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
    missingMaterials: textList(input.missingMaterials),
    usefulAdaptationIds: textList(input.usefulAdaptationIds),
    improvementRecommendation: input.improvementRecommendation
      ? enumValue(input.improvementRecommendation, IMPROVEMENT_RECOMMENDATIONS, 'recomanació de millora')
      : null,
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
