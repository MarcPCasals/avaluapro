import { assertSafeAssistancePackage, validateSafeAssistancePackage } from './safeAssistancePackage.js'

const MAX_CLASSES = 6
const MAX_COMPETENCIES = 4
const MAX_CRITERIA_PER_COMPETENCY = 4
const MAX_TASKS_PER_CLASS = 8
const CLASS_SIZE_BUCKETS = Object.freeze([12, 18, 24, 30, 36])
const LEVELS = Object.freeze(['A', 'B', 'C', 'D', 'NA'])
const TASK_STATUSES = Object.freeze(['DONE', 'LATE', 'MISSING', 'EXEMPT'])
const SUPPORT_CASES = Object.freeze(['NONE', 'FICTIONAL_CASE_1', 'FICTIONAL_CASE_2', 'FICTIONAL_CASE_3'])
const COLORS = Object.freeze(['blue', 'green', 'amber', 'violet', 'slate'])

function defaultRandomUUID() {
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    throw new Error('No hi ha disponible un generador criptogràfic d’identificadors.')
  }
  return globalThis.crypto.randomUUID()
}

function defaultRandomNumber() {
  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    throw new Error('No hi ha disponible un generador criptogràfic de valors.')
  }
  const values = new Uint32Array(1)
  globalThis.crypto.getRandomValues(values)
  return values[0] / 0x100000000
}

function createRandomTools(overrides = {}) {
  const randomUUID = overrides.randomUUID || defaultRandomUUID
  const randomNumber = overrides.randomNumber || defaultRandomNumber

  return {
    id(type) {
      return `safe-${type}-${randomUUID()}`
    },
    index(length) {
      const value = Number(randomNumber())
      if (!Number.isFinite(value)) throw new Error('El generador aleatori no ha retornat un valor vàlid.')
      return Math.min(length - 1, Math.floor(Math.max(0, Math.min(value, 0.999999999)) * length))
    },
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function normalizeClassSize(realCount) {
  if (realCount <= 0) return 0
  return CLASS_SIZE_BUCKETS.find((bucket) => realCount <= bucket) || CLASS_SIZE_BUCKETS.at(-1)
}

function safeSourceKey(item, index, prefix) {
  const sourceId = item && (typeof item.id === 'string' || typeof item.id === 'number') ? item.id : index
  return `${prefix}:${String(sourceId)}`
}

function countBySourceClass(items, sourceClass, classIndex) {
  const classKey = safeSourceKey(sourceClass, classIndex, 'class')
  return asArray(items).filter((item) => {
    const itemClassId = item && (typeof item.classId === 'string' || typeof item.classId === 'number')
      ? item.classId
      : null
    return itemClassId !== null && `class:${String(itemClassId)}` === classKey
  }).length
}

function buildClassContexts(source, random) {
  const sourceClasses = asArray(source?.classes).slice(0, MAX_CLASSES)
  const sourceStudents = asArray(source?.students)
  const sourceTasks = asArray(source?.trackingTasks)

  return sourceClasses.map((sourceClass, classIndex) => {
    const classNumber = classIndex + 1
    const studentCount = normalizeClassSize(countBySourceClass(sourceStudents, sourceClass, classIndex))
    const sourceTaskCount = countBySourceClass(sourceTasks, sourceClass, classIndex)
    const taskCount = Math.min(sourceTaskCount, MAX_TASKS_PER_CLASS)
    const classItem = {
      id: random.id('class'),
      name: `Grup ${String(classNumber).padStart(2, '0')}`,
      subject: `Àrea ${String(classNumber).padStart(2, '0')}`,
      isTutoringGroup: sourceClass?.isTutoringGroup === true,
    }
    return { classIndex, classItem, studentCount, taskCount }
  })
}

function buildStudents(classContexts, random) {
  let globalStudentNumber = 0
  return classContexts.flatMap((context) => Array.from({ length: context.studentCount }, (_, studentIndex) => {
    globalStudentNumber += 1
    const totalTasks = context.taskCount
    const completedTasks = totalTasks === 0 ? 0 : random.index(totalTasks + 1)
    return {
      id: random.id('student'),
      classId: context.classItem.id,
      displayName: `Alumne ${String(globalStudentNumber).padStart(2, '0')}`,
      halfGroup: studentIndex % 2 === 0 ? 'Grup A' : 'Grup B',
      evaluation: LEVELS[random.index(LEVELS.length)],
      completedTasks,
      totalTasks,
      absenceHours: random.index(5),
      incidents: random.index(3),
      tutorialRecordCount: random.index(5),
      supportCase: SUPPORT_CASES[random.index(SUPPORT_CASES.length)],
    }
  }))
}

function buildCompetencies(source, random) {
  return asArray(source?.evaluationCompetencies)
    .slice(0, MAX_COMPETENCIES)
    .map((sourceCompetency, competencyIndex) => {
      const competencyNumber = competencyIndex + 1
      const sourceCriteria = asArray(sourceCompetency?.criteria).slice(0, MAX_CRITERIA_PER_COMPETENCY)
      return {
        id: random.id('competency'),
        name: `Competència ${String(competencyNumber).padStart(2, '0')}`,
        color: COLORS[competencyIndex % COLORS.length],
        criteria: sourceCriteria.map((_, criterionIndex) => ({
          id: random.id('criterion'),
          name: `Criteri ${String(competencyIndex * MAX_CRITERIA_PER_COMPETENCY + criterionIndex + 1).padStart(2, '0')}`,
        })),
      }
    })
}

function buildTasks(classContexts, random) {
  let globalTaskNumber = 0
  return classContexts.flatMap((context) => Array.from({ length: context.taskCount }, (_, taskIndex) => {
    globalTaskNumber += 1
    return {
      id: random.id('task'),
      classId: context.classItem.id,
      title: `Tasca ${String(globalTaskNumber).padStart(2, '0')}`,
      periodIndex: taskIndex + 1,
    }
  }))
}

function buildEvaluationMarks(students, competencies, random) {
  const criteria = competencies.flatMap((competency) => competency.criteria)
  return students.flatMap((student) => criteria.map((criterion) => ({
    id: random.id('mark'),
    criterionId: criterion.id,
    studentId: student.id,
    value: LEVELS[random.index(LEVELS.length)],
  })))
}

function buildTrackingRecords(students, tasks, random) {
  const tasksByClass = new Map()
  tasks.forEach((task) => {
    const classTasks = tasksByClass.get(task.classId) || []
    classTasks.push(task)
    tasksByClass.set(task.classId, classTasks)
  })

  return students.flatMap((student) => (tasksByClass.get(student.classId) || []).map((task) => ({
    id: random.id('record'),
    classId: student.classId,
    studentId: student.id,
    taskId: task.id,
    status: TASK_STATUSES[random.index(TASK_STATUSES.length)],
  })))
}

function buildAbsenceRecords(students, random) {
  return students.flatMap((student, studentIndex) => Array.from(
    { length: random.index(4) },
    (_, absenceIndex) => ({
      id: random.id('absence'),
      classId: student.classId,
      studentId: student.id,
      dayIndex: 1 + ((studentIndex * 7 + absenceIndex * 11 + random.index(31)) % 120),
      slotIndex: 1 + random.index(8),
      hours: 1,
    }),
  ))
}

function buildSociometricRelations(students, classContexts, random) {
  return classContexts.flatMap((context) => {
    const classStudents = students.filter((student) => student.classId === context.classItem.id)
    if (classStudents.length < 2) return []

    return classStudents.flatMap((student, index) => {
      const positiveTarget = classStudents[(index + 1 + random.index(classStudents.length - 1)) % classStudents.length]
      const positiveRelation = {
        id: random.id('relation'),
        classId: context.classItem.id,
        sourceStudentId: student.id,
        targetStudentId: positiveTarget.id === student.id
          ? classStudents[(index + 1) % classStudents.length].id
          : positiveTarget.id,
        type: 'positive',
      }
      if (classStudents.length < 4 || random.index(3) !== 0) return [positiveRelation]

      const avoidTarget = classStudents[(index + 2 + random.index(classStudents.length - 2)) % classStudents.length]
      return [positiveRelation, {
        id: random.id('relation'),
        classId: context.classItem.id,
        sourceStudentId: student.id,
        targetStudentId: avoidTarget.id === student.id
          ? classStudents[(index + 2) % classStudents.length].id
          : avoidTarget.id,
        type: 'avoid',
      }]
    })
  })
}

export function generateSafeAssistancePackage(source, randomOverrides) {
  const random = createRandomTools(randomOverrides)
  const classContexts = buildClassContexts(source, random)
  const classes = classContexts.map((context) => context.classItem)
  const students = buildStudents(classContexts, random)
  const evaluationCompetencies = buildCompetencies(source, random)
  const trackingTasks = buildTasks(classContexts, random)
  const evaluationMarks = buildEvaluationMarks(students, evaluationCompetencies, random)
  const trackingRecords = buildTrackingRecords(students, trackingTasks, random)
  const absenceRecords = buildAbsenceRecords(students, random)
  const sociometricRelations = buildSociometricRelations(students, classContexts, random)

  const candidate = {
    packageType: 'avaluapro-assistance-safe-package',
    schemaVersion: 1,
    metadata: {
      containsRealData: false,
      dataPolicy: 'deidentified-safe-package',
      generator: 'avaluapro-local-safe-export-v1',
      persistence: 'memory-only',
      validation: { policyVersion: '1', status: 'passed' },
    },
    classes,
    students,
    evaluationCompetencies,
    evaluationMarks,
    trackingTasks,
    trackingRecords,
    absenceRecords,
    sociometricRelations,
  }

  const result = validateSafeAssistancePackage(candidate)
  if (!result.ok) {
    throw new Error(`El generador local ha produït un paquet no vàlid (${result.issues.length} incidències).`)
  }
  return Object.freeze({
    package: assertSafeAssistancePackage(candidate),
    summary: result.summary,
  })
}

export const SAFE_GENERATOR_POLICY = Object.freeze({
  classSizeBuckets: CLASS_SIZE_BUCKETS,
  maxClasses: MAX_CLASSES,
  maxCompetencies: MAX_COMPETENCIES,
  maxCriteriaPerCompetency: MAX_CRITERIA_PER_COMPETENCY,
  maxTasksPerClass: MAX_TASKS_PER_CLASS,
  preservesOriginalNumericProfiles: false,
  preservesOriginalRelations: false,
})
