import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createCustomStudentInterviewQuestion,
  createStudentInterviewDraft,
  prepareStudentInterview,
} from '../src/lib/studentInterviewTemplate.js'

test('les preguntes afegides i les respostes no modifiquen la plantilla de la següent entrevista', () => {
  const first = createStudentInterviewDraft()
  first[0].question = 'Pregunta adaptada per a aquest alumne?'
  first[0].answer = 'Una resposta.'
  first.push({ ...createCustomStudentInterviewQuestion(), question: 'Pregunta puntual?', answer: 'Una altra resposta.' })

  const saved = prepareStudentInterview(first)
  const next = createStudentInterviewDraft()

  assert.equal(saved.studentInterview.questions.length, 2)
  assert.match(saved.note, /Pregunta puntual\?\nResposta: Una altra resposta\./)
  assert.equal(next.length, 5)
  assert.match(next[0].question, /Què t’està anant millor/)
  assert.equal(next[0].answer, '')
})

test('les preguntes sense resposta no entren al registre i la nota addicional es conserva', () => {
  const questions = createStudentInterviewDraft()
  questions[1].answer = 'A gust amb el grup.'
  const saved = prepareStudentInterview(questions, 'Acord de seguiment.')

  assert.equal(saved.studentInterview.questions.length, 1)
  assert.equal(saved.studentInterview.questions[0].section, 'Grup')
  assert.match(saved.note, /Grup\nAmb qui estàs més a gust/)
  assert.match(saved.note, /Nota addicional\nAcord de seguiment\./)
  assert.doesNotMatch(saved.note, /Escola/)
})
