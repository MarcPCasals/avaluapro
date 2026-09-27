import assert from 'node:assert/strict'
import test from 'node:test'
import {
  SafeAssistancePackageError,
  assertSafeAssistancePackage,
  validateSafeAssistancePackage,
} from '../src/data/adapters/safeAssistancePackage.js'

const IDS = Object.freeze({
  absence: 'safe-absence-88888888-8888-4888-8888-888888888888',
  class: 'safe-class-11111111-1111-4111-8111-111111111111',
  competency: 'safe-competency-44444444-4444-4444-8444-444444444444',
  criterion: 'safe-criterion-55555555-5555-4555-8555-555555555555',
  mark: 'safe-mark-66666666-6666-4666-8666-666666666666',
  record: 'safe-record-77777777-7777-4777-8777-777777777777',
  relation: 'safe-relation-99999999-9999-4999-8999-999999999999',
  student1: 'safe-student-22222222-2222-4222-8222-222222222222',
  student2: 'safe-student-33333333-3333-4333-8333-333333333333',
  task: 'safe-task-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
})

function createSafePackage() {
  return {
    packageType: 'avaluapro-assistance-safe-package',
    schemaVersion: 1,
    metadata: {
      containsRealData: false,
      dataPolicy: 'deidentified-safe-package',
      generator: 'avaluapro-local-safe-export-v1',
      persistence: 'memory-only',
      validation: { policyVersion: '1', status: 'passed' },
    },
    classes: [{ id: IDS.class, name: 'Grup 01', subject: 'Àrea 01', isTutoringGroup: true }],
    students: [
      {
        id: IDS.student1,
        classId: IDS.class,
        displayName: 'Alumne 01',
        halfGroup: 'Grup A',
        evaluation: 'B',
        completedTasks: 4,
        totalTasks: 6,
        absenceHours: 1,
        incidents: 0,
        tutorialRecordCount: 2,
        supportCase: 'FICTIONAL_CASE_1',
      },
      {
        id: IDS.student2,
        classId: IDS.class,
        displayName: 'Alumne 02',
        halfGroup: 'Grup B',
        evaluation: 'C',
        completedTasks: 3,
        totalTasks: 6,
        absenceHours: 0,
        incidents: 1,
        tutorialRecordCount: 0,
        supportCase: 'NONE',
      },
    ],
    evaluationCompetencies: [{
      id: IDS.competency,
      name: 'Competència 01',
      color: 'blue',
      criteria: [{ id: IDS.criterion, name: 'Criteri 01' }],
    }],
    evaluationMarks: [{
      id: IDS.mark,
      criterionId: IDS.criterion,
      studentId: IDS.student1,
      value: 'B',
    }],
    trackingTasks: [{ id: IDS.task, classId: IDS.class, title: 'Tasca 01', periodIndex: 4 }],
    trackingRecords: [{
      id: IDS.record,
      classId: IDS.class,
      studentId: IDS.student1,
      taskId: IDS.task,
      status: 'DONE',
    }],
    absenceRecords: [{
      id: IDS.absence,
      classId: IDS.class,
      studentId: IDS.student1,
      dayIndex: 12,
      slotIndex: 3,
      hours: 1,
    }],
    sociometricRelations: [{
      id: IDS.relation,
      classId: IDS.class,
      sourceStudentId: IDS.student1,
      targetStudentId: IDS.student2,
      type: 'positive',
    }],
  }
}

test('accepta un paquet mínim amb etiquetes fictícies, IDs regenerats i referències internes', () => {
  const result = validateSafeAssistancePackage(createSafePackage())

  assert.equal(result.ok, true)
  assert.equal(result.issues.length, 0)
  assert.deepEqual(result.summary, {
    absenceRecords: 1,
    classes: 1,
    competencies: 1,
    evaluationMarks: 1,
    sociometricRelations: 1,
    students: 2,
    trackingRecords: 1,
    trackingTasks: 1,
  })
})

test('rebutja qualsevol camp desconegut sense reproduir-ne el nom ni el valor', () => {
  const candidate = createSafePackage()
  const secretField = 'diagnosticRealConfidencial'
  const secretValue = 'informació que no pot aparèixer al resultat'
  candidate.students[0][secretField] = secretValue

  const resultText = JSON.stringify(validateSafeAssistancePackage(candidate))
  assert.doesNotMatch(resultText, new RegExp(secretField))
  assert.doesNotMatch(resultText, new RegExp(secretValue))
  assert.match(resultText, /UNKNOWN_FIELD/)
})

test('rebutja noms, correus, URLs i dates exactes perquè cap camp admet text lliure', () => {
  const candidate = createSafePackage()
  candidate.students[0].displayName = 'Persona Exemple persona@example.org https://example.org 2026-09-27'

  const result = validateSafeAssistancePackage(candidate)
  assert.equal(result.ok, false)
  assert.ok(result.issues.some((issue) => issue.code === 'INVALID_SAFE_LABEL'))
  assert.doesNotMatch(JSON.stringify(result), /Persona Exemple|persona@example|example\.org|2026-09-27/)
})

test('rebutja identificadors originals o que no siguin UUID v4 regenerats', () => {
  const candidate = createSafePackage()
  candidate.students[0].id = 'firebase-original-student-id'

  const result = validateSafeAssistancePackage(candidate)
  assert.equal(result.ok, false)
  assert.ok(result.issues.some((issue) => issue.code === 'INVALID_REGENERATED_ID'))
  assert.doesNotMatch(JSON.stringify(result), /firebase-original-student-id/)
})

test('rebutja referències inexistents o creuades entre grups', () => {
  const candidate = createSafePackage()
  candidate.trackingRecords[0].studentId = 'safe-student-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

  const result = validateSafeAssistancePackage(candidate)
  assert.equal(result.ok, false)
  assert.ok(result.issues.some((issue) => issue.code === 'BROKEN_REFERENCE'))
})

test('rebutja valors fora de catàleg i recomptes incoherents', () => {
  const candidate = createSafePackage()
  candidate.students[0].supportCase = 'DIAGNOSI_REAL'
  candidate.students[0].completedTasks = 7

  const result = validateSafeAssistancePackage(candidate)
  assert.equal(result.ok, false)
  assert.ok(result.issues.some((issue) => issue.code === 'INVALID_ENUM'))
  assert.ok(result.issues.some((issue) => issue.code === 'INCONSISTENT_COUNT'))
  assert.doesNotMatch(JSON.stringify(result), /DIAGNOSI_REAL/)
})

test('rebutja relacions d’un perfil amb si mateix i identificadors repetits', () => {
  const candidate = createSafePackage()
  candidate.sociometricRelations[0].targetStudentId = IDS.student1
  candidate.students[1].id = IDS.student1

  const result = validateSafeAssistancePackage(candidate)
  assert.equal(result.ok, false)
  assert.ok(result.issues.some((issue) => issue.code === 'SELF_RELATION'))
  assert.ok(result.issues.some((issue) => issue.code === 'DUPLICATE_ID'))
})

test('rebutja un identificador de criteri repetit entre competències', () => {
  const candidate = createSafePackage()
  candidate.evaluationCompetencies.push({
    id: 'safe-competency-cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    name: 'Competència 02',
    color: 'green',
    criteria: [{ id: IDS.criterion, name: 'Criteri 02' }],
  })

  const result = validateSafeAssistancePackage(candidate)
  assert.equal(result.ok, false)
  assert.ok(result.issues.some((issue) =>
    issue.code === 'DUPLICATE_ID' && issue.path.includes('criteria[0].id'),
  ))
})

test('l’assertor només retorna una còpia validada i els errors no inclouen contingut del paquet', () => {
  const validPackage = createSafePackage()
  const acceptedCopy = assertSafeAssistancePackage(validPackage)
  acceptedCopy.students[0].displayName = 'Alumne 99'
  assert.equal(validPackage.students[0].displayName, 'Alumne 01')

  const invalidPackage = createSafePackage()
  invalidPackage.students[0].privateNotes = 'contingut privat sentinella'
  assert.throws(
    () => assertSafeAssistancePackage(invalidPackage),
    (error) => {
      assert.ok(error instanceof SafeAssistancePackageError)
      assert.match(error.message, /^Paquet segur rebutjat \([0-9]+ incidències\)\.$/)
      assert.doesNotMatch(`${error.message} ${JSON.stringify(error.issues)}`, /privat sentinella|privateNotes/)
      return true
    },
  )
})
