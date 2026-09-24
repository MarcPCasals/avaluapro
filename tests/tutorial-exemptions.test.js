import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getTutorialExemptSubjects,
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

  assert.deepEqual(subjects, ['Música', 'Educació física'])
})

test('desa una llista única i només amb assignatures vàlides', () => {
  const subjects = normalizeTutorialExemptSubjects(
    ['Música', 'Matemàtiques', 'Música', 'Assignatura inexistent'],
    ['Matemàtiques', 'Música'],
  )

  assert.deepEqual(subjects, ['Matemàtiques', 'Música'])
})
