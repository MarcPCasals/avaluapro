import assert from 'node:assert/strict'
import test from 'node:test'
import { buildActionGradeMark, getActionGradeSummary, getLowestActionGrade, recalculateActionCriteria } from '../src/lib/actionGrades.js'

const criterion = { id: 'synthetic-ca', selectedActionIds: ['R1', 'R2', 'R3'] }
const build = (grades, existing, current = criterion) => buildActionGradeMark({ existing, criterion: current, studentId: 'synthetic-student', grades, createId: () => 'synthetic-mark' })

test('el criteri sempre pren el mínim, independentment de l’ordre i la majoria de notes', () => {
  for (const grades of [['A', 'A', 'C'], ['C', 'A', 'A'], ['A', 'C', 'A'], ['B', 'D', 'A'], ['A', 'A', 'NA']]) {
    const expected = grades.includes('NA') ? 'NA' : grades.includes('D') ? 'D' : 'C'
    assert.equal(getLowestActionGrade(grades), expected)
  }
  assert.equal(build({ R1: 'A', R2: 'A', R3: 'C' }).value, 'C')
  assert.equal(getLowestActionGrade(['D', 'NA']), 'NA')
})

test('les accions pendents no compten com a zero i el mínim parcial s’identifica com a provisional', () => {
  const mark = build({ R1: 'B', R2: '', R3: '' })
  assert.deepEqual(getActionGradeSummary(criterion, mark), { value: 'B', evaluated: 1, total: 3, pending: 2, provisional: true })
  assert.equal(build({ R1: '', R2: '', R3: '' }).value, '')
})

test('canviar o esborrar la nota més baixa recalcula el mínim sense perdre les altres accions', () => {
  const original = build({ R1: 'A', R2: 'A', R3: 'C' })
  const improved = build({ R3: 'B' }, original)
  assert.equal(improved.value, 'B')
  const cleared = build({ R3: '' }, original)
  assert.equal(cleared.value, 'A')
  assert.equal(cleared.actionGrades.R1, 'A')
  assert.equal(getActionGradeSummary(criterion, cleared).provisional, true)
  assert.equal(original.actionGrades.R3, 'C')
})

test('la nota antiga del criteri no es reparteix automàticament a les accions', () => {
  const mark = build({ R1: 'C' }, { id: 'existing', studentId: 'synthetic-student', criterionId: criterion.id, value: 'A' })
  assert.equal(mark.value, 'C')
  assert.deepEqual(mark.actionGrades, { R1: 'C' })
  assert.equal(mark.id, 'existing')
})

test('canviar la selecció exclou el mínim desmarcat i recupera les notes si es torna a seleccionar', () => {
  const mark = build({ R1: 'A', R2: 'A', R3: 'C' })
  const deselected = recalculateActionCriteria([mark], [{ ...criterion, selectedActionIds: ['R1', 'R2'] }])[0]
  assert.equal(deselected.value, 'A')
  assert.equal(deselected.actionGrades.R3, 'C')
  assert.equal(recalculateActionCriteria([deselected], [criterion])[0].value, 'C')
  assert.equal(recalculateActionCriteria([mark], [{ ...criterion, selectedActionIds: [] }])[0].value, '')
})

test('la validació impedeix notes invàlides i accions que no pertanyen a la selecció', () => {
  assert.throws(() => build({ R1: 'Z' }), /no és vàlida/)
  assert.throws(() => build({ other: 'A' }), /no està seleccionada/)
  assert.throws(() => build({ R1: 'A' }, null, { ...criterion, selectedActionIds: [] }), /Selecciona primer/)
})
