import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canonicalizeSubjectScopedKey,
  getSubjectOption,
  getSubjectStructure,
  SUBJECT_OPTIONS,
} from '../src/data/subjects.js'
import {
  getTutorialExemptSubjects,
  isStudentExemptFromSubject,
  normalizeTutorialExemptSubjects,
  toggleTutorialExemptSubject,
} from '../src/lib/tutorialExemptions.js'

test('carrega les exempcions existents sense compartir la referència', () => {
  const student = { tutorialExemptSubjects: ['Matemàtiques', 'Música'] }
  const subjects = getTutorialExemptSubjects(student)

  assert.deepEqual(subjects, ['Matemàtiques', 'Música'])
  assert.notEqual(subjects, student.tutorialExemptSubjects)
})

test('permet afegir i retirar diverses assignatures abans de desar', () => {
  let subjects = ['Matemàtiques']
  subjects = toggleTutorialExemptSubject(subjects, 'Música')
  subjects = toggleTutorialExemptSubject(subjects, 'Educació física')
  subjects = toggleTutorialExemptSubject(subjects, 'Matemàtiques')

  assert.deepEqual(subjects, ['Educació física', 'Música'])
})

test('desa una llista única i només amb assignatures vàlides', () => {
  const subjects = normalizeTutorialExemptSubjects(
    ['Música', 'Matemàtiques', 'Música', 'Assignatura inexistent'],
    ['Matemàtiques', 'Música'],
  )

  assert.deepEqual(subjects, ['Matemàtiques', 'Música'])
})

test('unifica Educació musical amb Música sense duplicar-la', () => {
  const student = { tutorialExemptSubjects: ['Educació musical', 'Música'] }

  assert.deepEqual(getTutorialExemptSubjects(student), ['Música'])
  assert.equal(isStudentExemptFromSubject(student, 'Música'), true)
  assert.equal(isStudentExemptFromSubject(student, 'Educació musical'), true)
  assert.equal(SUBJECT_OPTIONS.filter((subject) => subject.areaId === 'arts' && subject.name.includes('Música')).length, 1)
  assert.equal(getSubjectOption('Educació musical')?.name, 'Música')
  assert.equal(getSubjectStructure('Educació musical'), getSubjectStructure('Música'))
  assert.equal(canonicalizeSubjectScopedKey('Educació musical__c2__ca1'), 'Música__c2__ca1')
})
