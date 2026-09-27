import assert from 'node:assert/strict'
import test from 'node:test'
import {
  SAFE_GENERATOR_POLICY,
  generateSafeAssistancePackage,
} from '../src/data/adapters/generateSafeAssistancePackage.js'
import { validateSafeAssistancePackage } from '../src/data/adapters/safeAssistancePackage.js'

function createDeterministicRandom() {
  let uuidCounter = 0
  let numberCounter = 0
  return {
    randomUUID() {
      uuidCounter += 1
      return `00000000-0000-4000-8000-${uuidCounter.toString(16).padStart(12, '0')}`
    },
    randomNumber() {
      const value = (numberCounter % 10) / 10
      numberCounter += 1
      return value
    },
  }
}

function createSensitiveSource({ studentCount = 17 } = {}) {
  const classId = 'classe-real-identificable'
  return {
    ownerEmail: 'docent-real@example.org',
    classes: [{ id: classId, name: 'Nom real del grup', isTutoringGroup: true }],
    students: Array.from({ length: studentCount }, (_, index) => ({
      id: `firebase-real-${index}`,
      classId,
      displayName: `Nom Real ${index}`,
      email: `alumne${index}@example.org`,
      diagnosis: `Diagnòstic privat ${index}`,
      personalNotes: `Observació privada ${index}`,
      evaluation: index % 2 === 0 ? 'A' : 'D',
      absenceHours: 97 - index,
      incidents: 42,
    })),
    evaluationCompetencies: [{
      id: 'competencia-real',
      name: 'Nom curricular real',
      criteria: [
        { id: 'criteri-real-1', name: 'Text real 1' },
        { id: 'criteri-real-2', name: 'Text real 2' },
      ],
    }],
    trackingTasks: [
      { id: 'tasca-real-1', classId, title: 'Tasca real identificable', date: '2026-09-27' },
      { id: 'tasca-real-2', classId, title: 'Una altra tasca real', date: '2026-10-04' },
    ],
    evaluationMarks: [{ studentId: 'firebase-real-0', value: 'A' }],
    trackingRecords: [{ studentId: 'firebase-real-0', status: 'MISSING' }],
    absenceRecords: [{ studentId: 'firebase-real-0', date: '2026-09-27' }],
    sociometricRelations: [{ sourceStudentId: 'firebase-real-0', targetStudentId: 'firebase-real-1' }],
  }
}

test('genera un paquet vàlid sense copiar cap valor textual o identificador de la font', () => {
  const source = createSensitiveSource()
  const generated = generateSafeAssistancePackage(source, createDeterministicRandom())
  const serialized = JSON.stringify(generated.package)

  assert.equal(validateSafeAssistancePackage(generated.package).ok, true)
  for (const forbiddenSentinel of [
    'docent-real',
    'example.org',
    'Nom Real',
    'firebase-real',
    'Diagnòstic privat',
    'Observació privada',
    'Nom curricular real',
    'Tasca real identificable',
    '2026-09-27',
  ]) {
    assert.doesNotMatch(serialized, new RegExp(forbiddenSentinel))
  }
})

test('arrodoneix la mida real del grup a una franja segura i crea perfils nous', () => {
  const generated = generateSafeAssistancePackage(
    createSensitiveSource({ studentCount: 17 }),
    createDeterministicRandom(),
  )

  assert.equal(generated.package.students.length, 18)
  assert.equal(generated.summary.students, 18)
  assert.deepEqual(SAFE_GENERATOR_POLICY.classSizeBuckets, [12, 18, 24, 30, 36])
})

test('ignora qualificacions, absències, incidències, notes i relacions originals', () => {
  const sourceA = createSensitiveSource()
  const sourceB = structuredClone(sourceA)
  sourceB.students.forEach((student, index) => {
    student.displayName = `Una altra identitat ${index}`
    student.evaluation = 'B'
    student.absenceHours = 0
    student.incidents = 0
    student.diagnosis = 'Un altre contingut privat'
  })
  sourceB.evaluationMarks = [{ studentId: 'una-altra-id', value: 'D' }]
  sourceB.absenceRecords = []
  sourceB.sociometricRelations = []

  const generatedA = generateSafeAssistancePackage(sourceA, createDeterministicRandom())
  const generatedB = generateSafeAssistancePackage(sourceB, createDeterministicRandom())
  assert.deepEqual(generatedA, generatedB)
})

test('no modifica la font rebuda i només retorna el paquet nou i el resum', () => {
  const source = createSensitiveSource()
  const original = structuredClone(source)
  const generated = generateSafeAssistancePackage(source, createDeterministicRandom())

  assert.deepEqual(source, original)
  assert.deepEqual(Object.keys(generated).sort(), ['package', 'summary'])
  assert.equal(Object.hasOwn(generated, 'source'), false)
})

test('limita classes, competències, criteris i tasques abans de generar dades', () => {
  const source = {
    classes: Array.from({ length: 10 }, (_, index) => ({ id: `class-${index}` })),
    students: Array.from({ length: 10 }, (_, classIndex) => ({ id: `student-${classIndex}`, classId: `class-${classIndex}` })),
    evaluationCompetencies: Array.from({ length: 10 }, (_, competencyIndex) => ({
      id: `competency-${competencyIndex}`,
      criteria: Array.from({ length: 10 }, (_, criterionIndex) => ({ id: `criterion-${criterionIndex}` })),
    })),
    trackingTasks: Array.from({ length: 10 }, (_, classIndex) => Array.from(
      { length: 10 },
      (_, taskIndex) => ({ id: `task-${classIndex}-${taskIndex}`, classId: `class-${classIndex}` }),
    )).flat(),
  }
  const generated = generateSafeAssistancePackage(source, createDeterministicRandom())

  assert.equal(generated.package.classes.length, SAFE_GENERATOR_POLICY.maxClasses)
  assert.equal(generated.package.evaluationCompetencies.length, SAFE_GENERATOR_POLICY.maxCompetencies)
  assert.ok(generated.package.evaluationCompetencies.every(
    (competency) => competency.criteria.length === SAFE_GENERATOR_POLICY.maxCriteriaPerCompetency,
  ))
  assert.equal(generated.package.trackingTasks.length, SAFE_GENERATOR_POLICY.maxClasses * SAFE_GENERATOR_POLICY.maxTasksPerClass)
  assert.equal(validateSafeAssistancePackage(generated.package).ok, true)
})

test('genera relacions sociomètriques noves sense autorelacions', () => {
  const generated = generateSafeAssistancePackage(createSensitiveSource(), createDeterministicRandom())

  assert.ok(generated.package.sociometricRelations.length > 0)
  assert.ok(generated.package.sociometricRelations.every(
    (relation) => relation.sourceStudentId !== relation.targetStudentId,
  ))
  assert.ok(generated.package.sociometricRelations.every(
    (relation) => relation.sourceStudentId.startsWith('safe-student-') && relation.targetStudentId.startsWith('safe-student-'),
  ))
})

test('rebutja una font si el generador criptogràfic injectat no crea UUID segurs', () => {
  assert.throws(
    () => generateSafeAssistancePackage(createSensitiveSource(), {
      randomUUID: () => 'identificador-no-segur',
      randomNumber: () => 0.5,
    }),
    /^Error: El generador local ha produït un paquet no vàlid \([0-9]+ incidències\)\.$/,
  )
})
