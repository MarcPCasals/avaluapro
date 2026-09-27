const PACKAGE_TYPE = 'avaluapro-assistance-safe-package'
const SCHEMA_VERSION = 1
const POLICY_VERSION = '1'
const MAX_ISSUES = 50

const COLLECTION_LIMITS = Object.freeze({
  absenceRecords: 10000,
  classes: 20,
  evaluationCompetencies: 100,
  evaluationMarks: 5000,
  sociometricRelations: 10000,
  students: 600,
  trackingRecords: 10000,
  trackingTasks: 500,
})

const SAFE_ID_TYPES = Object.freeze({
  absenceRecords: 'absence',
  classes: 'class',
  evaluationCompetencies: 'competency',
  evaluationMarks: 'mark',
  sociometricRelations: 'relation',
  students: 'student',
  trackingRecords: 'record',
  trackingTasks: 'task',
})

const TOP_LEVEL_KEYS = Object.freeze([
  'packageType',
  'schemaVersion',
  'metadata',
  ...Object.keys(COLLECTION_LIMITS),
])

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function createCollector() {
  const issues = []
  let truncated = false

  return {
    add(code, path, message) {
      if (issues.length >= MAX_ISSUES) {
        truncated = true
        return
      }
      issues.push(Object.freeze({ code, path, message }))
    },
    finish() {
      if (truncated && issues.length < MAX_ISSUES) {
        issues.push(Object.freeze({
          code: 'TOO_MANY_ISSUES',
          path: '$',
          message: 'El paquet conté més incidències de les que es poden mostrar de manera segura.',
        }))
      }
      return Object.freeze(issues)
    },
  }
}

function assertObjectShape(value, path, allowedKeys, requiredKeys, collector) {
  if (!isPlainObject(value)) {
    collector.add('INVALID_OBJECT', path, 'S’esperava un objecte JSON simple.')
    return false
  }

  const allowed = new Set(allowedKeys)
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      collector.add('UNKNOWN_FIELD', path, 'S’ha detectat un camp no permès; el seu nom i valor no es mostren.')
    }
  }
  for (const key of requiredKeys) {
    if (!Object.hasOwn(value, key)) {
      collector.add('MISSING_FIELD', `${path}.${key}`, 'Falta un camp obligatori de l’esquema segur.')
    }
  }
  return true
}

function assertExact(value, expected, path, collector) {
  if (value !== expected) collector.add('INVALID_CONSTANT', path, 'El valor fix de seguretat no és vàlid.')
}

function assertBoolean(value, path, collector) {
  if (typeof value !== 'boolean') collector.add('INVALID_BOOLEAN', path, 'S’esperava un valor booleà.')
}

function assertInteger(value, min, max, path, collector) {
  if (!Number.isInteger(value) || value < min || value > max) {
    collector.add('INVALID_INTEGER', path, `S’esperava un enter entre ${min} i ${max}.`)
  }
}

function assertEnum(value, allowed, path, collector) {
  if (!allowed.includes(value)) collector.add('INVALID_ENUM', path, 'El valor no forma part de la llista segura.')
}

function assertPattern(value, pattern, path, collector) {
  if (typeof value !== 'string' || !pattern.test(value)) {
    collector.add('INVALID_SAFE_LABEL', path, 'L’etiqueta no compleix el patró fictici obligatori.')
  }
}

function safeIdPattern(type) {
  return new RegExp(
    `^safe-${type}-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`,
    'i',
  )
}

function assertSafeId(value, type, path, collector) {
  if (typeof value !== 'string' || !safeIdPattern(type).test(value)) {
    collector.add('INVALID_REGENERATED_ID', path, 'L’identificador no té el format aleatori regenerat obligatori.')
  }
}

function assertArray(value, collectionName, collector) {
  const path = `$.${collectionName}`
  if (!Array.isArray(value)) {
    collector.add('INVALID_ARRAY', path, 'S’esperava una col·lecció JSON.')
    return []
  }
  const limit = COLLECTION_LIMITS[collectionName]
  if (value.length > limit) {
    collector.add('COLLECTION_LIMIT', path, `La col·lecció supera el màxim segur de ${limit} elements.`)
  }
  return value.slice(0, limit)
}

function validateMetadata(metadata, collector) {
  const path = '$.metadata'
  if (!assertObjectShape(
    metadata,
    path,
    ['containsRealData', 'dataPolicy', 'generator', 'persistence', 'validation'],
    ['containsRealData', 'dataPolicy', 'generator', 'persistence', 'validation'],
    collector,
  )) return

  assertExact(metadata.containsRealData, false, `${path}.containsRealData`, collector)
  assertExact(metadata.dataPolicy, 'deidentified-safe-package', `${path}.dataPolicy`, collector)
  assertExact(metadata.generator, 'avaluapro-local-safe-export-v1', `${path}.generator`, collector)
  assertExact(metadata.persistence, 'memory-only', `${path}.persistence`, collector)

  const validationPath = `${path}.validation`
  if (!assertObjectShape(
    metadata.validation,
    validationPath,
    ['policyVersion', 'status'],
    ['policyVersion', 'status'],
    collector,
  )) return
  assertExact(metadata.validation.policyVersion, POLICY_VERSION, `${validationPath}.policyVersion`, collector)
  assertExact(metadata.validation.status, 'passed', `${validationPath}.status`, collector)
}

function validateClasses(value, collector) {
  return assertArray(value, 'classes', collector).map((item, index) => {
    const path = `$.classes[${index}]`
    if (!assertObjectShape(
      item,
      path,
      ['id', 'name', 'subject', 'isTutoringGroup'],
      ['id', 'name', 'subject', 'isTutoringGroup'],
      collector,
    )) return null
    assertSafeId(item.id, 'class', `${path}.id`, collector)
    assertPattern(item.name, /^Grup [0-9]{2}$/, `${path}.name`, collector)
    assertPattern(item.subject, /^Àrea [0-9]{2}$/, `${path}.subject`, collector)
    assertBoolean(item.isTutoringGroup, `${path}.isTutoringGroup`, collector)
    return item
  }).filter(Boolean)
}

function validateStudents(value, collector) {
  return assertArray(value, 'students', collector).map((item, index) => {
    const path = `$.students[${index}]`
    const keys = [
      'id', 'classId', 'displayName', 'halfGroup', 'evaluation', 'completedTasks', 'totalTasks',
      'absenceHours', 'incidents', 'tutorialRecordCount', 'supportCase',
    ]
    if (!assertObjectShape(item, path, keys, keys, collector)) return null
    assertSafeId(item.id, 'student', `${path}.id`, collector)
    assertSafeId(item.classId, 'class', `${path}.classId`, collector)
    assertPattern(item.displayName, /^Alumne [0-9]{2,3}$/, `${path}.displayName`, collector)
    assertEnum(item.halfGroup, ['Grup A', 'Grup B'], `${path}.halfGroup`, collector)
    assertEnum(item.evaluation, ['A', 'B', 'C', 'D', 'NA'], `${path}.evaluation`, collector)
    assertInteger(item.completedTasks, 0, 500, `${path}.completedTasks`, collector)
    assertInteger(item.totalTasks, 0, 500, `${path}.totalTasks`, collector)
    assertInteger(item.absenceHours, 0, 2000, `${path}.absenceHours`, collector)
    assertInteger(item.incidents, 0, 100, `${path}.incidents`, collector)
    assertInteger(item.tutorialRecordCount, 0, 500, `${path}.tutorialRecordCount`, collector)
    assertEnum(
      item.supportCase,
      ['NONE', 'FICTIONAL_CASE_1', 'FICTIONAL_CASE_2', 'FICTIONAL_CASE_3'],
      `${path}.supportCase`,
      collector,
    )
    if (Number.isInteger(item.completedTasks) && Number.isInteger(item.totalTasks) && item.completedTasks > item.totalTasks) {
      collector.add('INCONSISTENT_COUNT', path, 'El recompte completat supera el total.')
    }
    return item
  }).filter(Boolean)
}

function validateCompetencies(value, collector) {
  return assertArray(value, 'evaluationCompetencies', collector).map((item, index) => {
    const path = `$.evaluationCompetencies[${index}]`
    if (!assertObjectShape(
      item,
      path,
      ['id', 'name', 'color', 'criteria'],
      ['id', 'name', 'color', 'criteria'],
      collector,
    )) return null
    assertSafeId(item.id, 'competency', `${path}.id`, collector)
    assertPattern(item.name, /^Competència [0-9]{2,3}$/, `${path}.name`, collector)
    assertEnum(item.color, ['blue', 'green', 'amber', 'violet', 'slate'], `${path}.color`, collector)
    if (!Array.isArray(item.criteria)) {
      collector.add('INVALID_ARRAY', `${path}.criteria`, 'S’esperava una col·lecció JSON.')
      return item
    }
    if (item.criteria.length > 50) {
      collector.add('COLLECTION_LIMIT', `${path}.criteria`, 'La competència supera el màxim segur de 50 criteris.')
    }
    item.criteria.slice(0, 50).forEach((criterion, criterionIndex) => {
      const criterionPath = `${path}.criteria[${criterionIndex}]`
      if (!assertObjectShape(
        criterion,
        criterionPath,
        ['id', 'name'],
        ['id', 'name'],
        collector,
      )) return
      assertSafeId(criterion.id, 'criterion', `${criterionPath}.id`, collector)
      assertPattern(criterion.name, /^Criteri [0-9]{2,3}$/, `${criterionPath}.name`, collector)
    })
    return item
  }).filter(Boolean)
}

function validateEvaluationMarks(value, collector) {
  return assertArray(value, 'evaluationMarks', collector).map((item, index) => {
    const path = `$.evaluationMarks[${index}]`
    const keys = ['id', 'criterionId', 'studentId', 'value']
    if (!assertObjectShape(item, path, keys, keys, collector)) return null
    assertSafeId(item.id, 'mark', `${path}.id`, collector)
    assertSafeId(item.criterionId, 'criterion', `${path}.criterionId`, collector)
    assertSafeId(item.studentId, 'student', `${path}.studentId`, collector)
    assertEnum(item.value, ['A', 'B', 'C', 'D', 'NA'], `${path}.value`, collector)
    return item
  }).filter(Boolean)
}

function validateTasks(value, collector) {
  return assertArray(value, 'trackingTasks', collector).map((item, index) => {
    const path = `$.trackingTasks[${index}]`
    const keys = ['id', 'classId', 'title', 'periodIndex']
    if (!assertObjectShape(item, path, keys, keys, collector)) return null
    assertSafeId(item.id, 'task', `${path}.id`, collector)
    assertSafeId(item.classId, 'class', `${path}.classId`, collector)
    assertPattern(item.title, /^Tasca [0-9]{2,3}$/, `${path}.title`, collector)
    assertInteger(item.periodIndex, 1, 200, `${path}.periodIndex`, collector)
    return item
  }).filter(Boolean)
}

function validateTrackingRecords(value, collector) {
  return assertArray(value, 'trackingRecords', collector).map((item, index) => {
    const path = `$.trackingRecords[${index}]`
    const keys = ['id', 'classId', 'studentId', 'taskId', 'status']
    if (!assertObjectShape(item, path, keys, keys, collector)) return null
    assertSafeId(item.id, 'record', `${path}.id`, collector)
    assertSafeId(item.classId, 'class', `${path}.classId`, collector)
    assertSafeId(item.studentId, 'student', `${path}.studentId`, collector)
    assertSafeId(item.taskId, 'task', `${path}.taskId`, collector)
    assertEnum(item.status, ['DONE', 'LATE', 'MISSING', 'EXEMPT'], `${path}.status`, collector)
    return item
  }).filter(Boolean)
}

function validateAbsenceRecords(value, collector) {
  return assertArray(value, 'absenceRecords', collector).map((item, index) => {
    const path = `$.absenceRecords[${index}]`
    const keys = ['id', 'classId', 'studentId', 'dayIndex', 'slotIndex', 'hours']
    if (!assertObjectShape(item, path, keys, keys, collector)) return null
    assertSafeId(item.id, 'absence', `${path}.id`, collector)
    assertSafeId(item.classId, 'class', `${path}.classId`, collector)
    assertSafeId(item.studentId, 'student', `${path}.studentId`, collector)
    assertInteger(item.dayIndex, 1, 366, `${path}.dayIndex`, collector)
    assertInteger(item.slotIndex, 1, 24, `${path}.slotIndex`, collector)
    assertInteger(item.hours, 1, 8, `${path}.hours`, collector)
    return item
  }).filter(Boolean)
}

function validateRelations(value, collector) {
  return assertArray(value, 'sociometricRelations', collector).map((item, index) => {
    const path = `$.sociometricRelations[${index}]`
    const keys = ['id', 'classId', 'sourceStudentId', 'targetStudentId', 'type']
    if (!assertObjectShape(item, path, keys, keys, collector)) return null
    assertSafeId(item.id, 'relation', `${path}.id`, collector)
    assertSafeId(item.classId, 'class', `${path}.classId`, collector)
    assertSafeId(item.sourceStudentId, 'student', `${path}.sourceStudentId`, collector)
    assertSafeId(item.targetStudentId, 'student', `${path}.targetStudentId`, collector)
    assertEnum(item.type, ['positive', 'avoid'], `${path}.type`, collector)
    if (item.sourceStudentId === item.targetStudentId) {
      collector.add('SELF_RELATION', path, 'Una relació segura no pot apuntar al mateix perfil.')
    }
    return item
  }).filter(Boolean)
}

function checkUniqueIds(collections, collector) {
  const seen = new Set()
  for (const [collectionName, items] of Object.entries(collections)) {
    const type = SAFE_ID_TYPES[collectionName]
    items.forEach((item, index) => {
      if (!safeIdPattern(type).test(item.id || '')) return
      if (seen.has(item.id)) {
        collector.add('DUPLICATE_ID', `$.${collectionName}[${index}].id`, 'S’ha repetit un identificador regenerat.')
      }
      seen.add(item.id)
    })
  }
  collections.evaluationCompetencies.forEach((competency, competencyIndex) => {
    if (!Array.isArray(competency.criteria)) return
    competency.criteria.slice(0, 50).forEach((criterion, criterionIndex) => {
      if (!isPlainObject(criterion) || !safeIdPattern('criterion').test(criterion.id || '')) return
      if (seen.has(criterion.id)) {
        collector.add(
          'DUPLICATE_ID',
          `$.evaluationCompetencies[${competencyIndex}].criteria[${criterionIndex}].id`,
          'S’ha repetit un identificador regenerat.',
        )
      }
      seen.add(criterion.id)
    })
  })
}

function checkReferences(collections, collector) {
  const classIds = new Set(collections.classes.map((item) => item.id))
  const students = new Map(collections.students.map((item) => [item.id, item]))
  const criterionIds = new Set(collections.evaluationCompetencies.flatMap(
    (item) => Array.isArray(item.criteria) ? item.criteria.map((criterion) => criterion.id) : [],
  ))
  const tasks = new Map(collections.trackingTasks.map((item) => [item.id, item]))

  collections.students.forEach((item, index) => {
    if (!classIds.has(item.classId)) collector.add('BROKEN_REFERENCE', `$.students[${index}].classId`, 'La referència no existeix dins el paquet.')
  })
  collections.evaluationMarks.forEach((item, index) => {
    if (!students.has(item.studentId)) collector.add('BROKEN_REFERENCE', `$.evaluationMarks[${index}].studentId`, 'La referència no existeix dins el paquet.')
    if (!criterionIds.has(item.criterionId)) collector.add('BROKEN_REFERENCE', `$.evaluationMarks[${index}].criterionId`, 'La referència no existeix dins el paquet.')
  })
  collections.trackingTasks.forEach((item, index) => {
    if (!classIds.has(item.classId)) collector.add('BROKEN_REFERENCE', `$.trackingTasks[${index}].classId`, 'La referència no existeix dins el paquet.')
  })
  collections.trackingRecords.forEach((item, index) => {
    const student = students.get(item.studentId)
    const task = tasks.get(item.taskId)
    if (!student) collector.add('BROKEN_REFERENCE', `$.trackingRecords[${index}].studentId`, 'La referència no existeix dins el paquet.')
    if (!task) collector.add('BROKEN_REFERENCE', `$.trackingRecords[${index}].taskId`, 'La referència no existeix dins el paquet.')
    if (!classIds.has(item.classId)) collector.add('BROKEN_REFERENCE', `$.trackingRecords[${index}].classId`, 'La referència no existeix dins el paquet.')
    if (student && student.classId !== item.classId) collector.add('CROSS_CLASS_REFERENCE', `$.trackingRecords[${index}]`, 'Les referències pertanyen a grups diferents.')
    if (task && task.classId !== item.classId) collector.add('CROSS_CLASS_REFERENCE', `$.trackingRecords[${index}]`, 'Les referències pertanyen a grups diferents.')
  })
  collections.absenceRecords.forEach((item, index) => {
    const student = students.get(item.studentId)
    if (!student) collector.add('BROKEN_REFERENCE', `$.absenceRecords[${index}].studentId`, 'La referència no existeix dins el paquet.')
    if (!classIds.has(item.classId)) collector.add('BROKEN_REFERENCE', `$.absenceRecords[${index}].classId`, 'La referència no existeix dins el paquet.')
    if (student && student.classId !== item.classId) collector.add('CROSS_CLASS_REFERENCE', `$.absenceRecords[${index}]`, 'Les referències pertanyen a grups diferents.')
  })
  collections.sociometricRelations.forEach((item, index) => {
    const source = students.get(item.sourceStudentId)
    const target = students.get(item.targetStudentId)
    if (!source) collector.add('BROKEN_REFERENCE', `$.sociometricRelations[${index}].sourceStudentId`, 'La referència no existeix dins el paquet.')
    if (!target) collector.add('BROKEN_REFERENCE', `$.sociometricRelations[${index}].targetStudentId`, 'La referència no existeix dins el paquet.')
    if (!classIds.has(item.classId)) collector.add('BROKEN_REFERENCE', `$.sociometricRelations[${index}].classId`, 'La referència no existeix dins el paquet.')
    if ((source && source.classId !== item.classId) || (target && target.classId !== item.classId)) {
      collector.add('CROSS_CLASS_REFERENCE', `$.sociometricRelations[${index}]`, 'Les referències pertanyen a grups diferents.')
    }
  })
}

function createSummary(collections) {
  return Object.freeze({
    absenceRecords: collections.absenceRecords.length,
    classes: collections.classes.length,
    competencies: collections.evaluationCompetencies.length,
    evaluationMarks: collections.evaluationMarks.length,
    sociometricRelations: collections.sociometricRelations.length,
    students: collections.students.length,
    trackingRecords: collections.trackingRecords.length,
    trackingTasks: collections.trackingTasks.length,
  })
}

export function validateSafeAssistancePackage(candidate) {
  const collector = createCollector()
  if (!assertObjectShape(candidate, '$', TOP_LEVEL_KEYS, TOP_LEVEL_KEYS, collector)) {
    return Object.freeze({ ok: false, policyVersion: POLICY_VERSION, issues: collector.finish(), summary: null })
  }

  assertExact(candidate.packageType, PACKAGE_TYPE, '$.packageType', collector)
  assertExact(candidate.schemaVersion, SCHEMA_VERSION, '$.schemaVersion', collector)
  validateMetadata(candidate.metadata, collector)

  const collections = {
    classes: validateClasses(candidate.classes, collector),
    students: validateStudents(candidate.students, collector),
    evaluationCompetencies: validateCompetencies(candidate.evaluationCompetencies, collector),
    evaluationMarks: validateEvaluationMarks(candidate.evaluationMarks, collector),
    trackingTasks: validateTasks(candidate.trackingTasks, collector),
    trackingRecords: validateTrackingRecords(candidate.trackingRecords, collector),
    absenceRecords: validateAbsenceRecords(candidate.absenceRecords, collector),
    sociometricRelations: validateRelations(candidate.sociometricRelations, collector),
  }
  checkUniqueIds(collections, collector)
  checkReferences(collections, collector)

  const issues = collector.finish()
  return Object.freeze({
    ok: issues.length === 0,
    policyVersion: POLICY_VERSION,
    issues,
    summary: issues.length === 0 ? createSummary(collections) : null,
  })
}

export class SafeAssistancePackageError extends Error {
  constructor(issues) {
    super(`Paquet segur rebutjat (${issues.length} incidències).`)
    this.name = 'SafeAssistancePackageError'
    this.issues = issues
  }
}

export function assertSafeAssistancePackage(candidate) {
  const result = validateSafeAssistancePackage(candidate)
  if (!result.ok) throw new SafeAssistancePackageError(result.issues)
  return structuredClone(candidate)
}

export const SAFE_ASSISTANCE_PACKAGE_POLICY = Object.freeze({
  collectionLimits: COLLECTION_LIMITS,
  packageType: PACKAGE_TYPE,
  policyVersion: POLICY_VERSION,
  schemaVersion: SCHEMA_VERSION,
})
