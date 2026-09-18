export const PLANNING_SCHEMA_VERSION = 1

export const PLANNING_ENTITY_TYPES = Object.freeze({
  ACADEMIC_YEAR: 'academicYear',
  TEMPORAL_UNIT: 'temporalUnit',
  PLANNING_UNIT: 'planningUnit',
  PLANNING_PHASE: 'planningPhase',
  PLANNING_ACTIVITY: 'planningActivity',
  GROUP_APPLICATION: 'groupApplication',
  ACTIVITY_OVERRIDE: 'activityOverride',
  TIMETABLE_VERSION: 'timetableVersion',
  TIMETABLE_SLOT: 'timetableSlot',
  CALENDAR_EVENT: 'calendarEvent',
  CALENDAR_SESSION: 'calendarSession',
  SESSION_ITEM: 'sessionItem',
  ACTIVITY_RESULT: 'activityResult',
  ACCESS_GRANT: 'accessGrant',
  PRIVATE_NOTE: 'planningPrivateNote',
})

export const PLANNING_ID_PREFIXES = Object.freeze({
  [PLANNING_ENTITY_TYPES.ACADEMIC_YEAR]: 'plan-year',
  [PLANNING_ENTITY_TYPES.TEMPORAL_UNIT]: 'plan-ut',
  [PLANNING_ENTITY_TYPES.PLANNING_UNIT]: 'plan-up',
  [PLANNING_ENTITY_TYPES.PLANNING_PHASE]: 'plan-phase',
  [PLANNING_ENTITY_TYPES.PLANNING_ACTIVITY]: 'plan-activity',
  [PLANNING_ENTITY_TYPES.GROUP_APPLICATION]: 'plan-application',
  [PLANNING_ENTITY_TYPES.ACTIVITY_OVERRIDE]: 'plan-override',
  [PLANNING_ENTITY_TYPES.TIMETABLE_VERSION]: 'plan-timetable',
  [PLANNING_ENTITY_TYPES.TIMETABLE_SLOT]: 'plan-slot',
  [PLANNING_ENTITY_TYPES.CALENDAR_EVENT]: 'plan-event',
  [PLANNING_ENTITY_TYPES.CALENDAR_SESSION]: 'plan-session',
  [PLANNING_ENTITY_TYPES.SESSION_ITEM]: 'plan-session-item',
  [PLANNING_ENTITY_TYPES.ACTIVITY_RESULT]: 'plan-result',
  [PLANNING_ENTITY_TYPES.ACCESS_GRANT]: 'plan-grant',
  [PLANNING_ENTITY_TYPES.PRIVATE_NOTE]: 'plan-private-note',
})

export const PLANNING_UNIT_STATUSES = Object.freeze(['draft', 'active', 'archived'])
export const PLANNING_PHASE_KINDS = Object.freeze([
  'preparation',
  'resolution',
  'closing',
  'custom',
])
export const EVIDENCE_MODES = Object.freeze(['none', 'final', 'perSession'])
export const APPLICATION_STATUSES = Object.freeze(['draft', 'active', 'completed', 'archived'])
export const CHANGE_SCOPES = Object.freeze(['groupOnly', 'baseAndGroup', 'groupAndProposal'])
export const SESSION_ITEM_TYPES = Object.freeze(['activity', 'indication', 'transition'])
export const SESSION_STATUSES = Object.freeze(['planned', 'held', 'cancelled', 'notHeld'])
export const RESULT_STATUSES = Object.freeze(['completed', 'continued', 'notHeld', 'skipped'])
export const CALENDAR_EVENT_TYPES = Object.freeze([
  'holiday',
  'nonTeaching',
  'specialDay',
  'extraordinarySession',
  'cancellation',
])
export const ACCESS_ROLES = Object.freeze([
  'owner',
  'directionReader',
  'planningEditor',
  'planningAgendaEditor',
])
