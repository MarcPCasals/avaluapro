import assert from 'node:assert/strict'
import test from 'node:test'
import { getNextGradingTarget } from '../src/lib/evaluationNavigation.js'

const students = [{ id: 'a' }, { id: 'b' }]
const competencies = [
  { id: 'c1', criteria: [{ id: 'c1p1' }, { id: 'c1p2' }] },
  { id: 'c2', criteria: [{ id: 'c2p1' }] },
]

test('avança pels criteris del mateix alumne dins de la competència', () => {
  assert.deepEqual(getNextGradingTarget(students, competencies, 'a', 'c1p1'), {
    student: students[0], competency: competencies[0], criterion: competencies[0].criteria[1], label: 'Criteri següent',
  })
})

test('després de l’últim criteri de C1 continua amb C1 de l’alumne següent', () => {
  assert.deepEqual(getNextGradingTarget(students, competencies, 'a', 'c1p2'), {
    student: students[1], competency: competencies[0], criterion: competencies[0].criteria[0], label: 'Alumne següent',
  })
  assert.equal(getNextGradingTarget(students, competencies, 'b', 'c1p2'), null)
})

test('després de l’últim criteri de C2 continua amb C2 de l’alumne següent', () => {
  assert.deepEqual(getNextGradingTarget(students, competencies, 'a', 'c2p1'), {
    student: students[1], competency: competencies[1], criterion: competencies[1].criteria[0], label: 'Alumne següent',
  })
  assert.equal(getNextGradingTarget(students, competencies, 'b', 'c2p1'), null)
})

test('respecta la llista visible d’alumnes', () => {
  assert.equal(getNextGradingTarget(students.slice(0, 1), competencies, 'a', 'c2p1'), null)
})
