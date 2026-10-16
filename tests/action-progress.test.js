import assert from 'node:assert/strict'
import test from 'node:test'
import { buildActionProgress } from '../src/lib/actionProgress.js'

const actionMarks = marks => marks.map(mark => ({ ...mark, gradingMode: 'actions', actionGrades: { C1R1: mark.value } }))
const subject = 'Ciències Físiques i de la Natura'
function fixture() {
  const uts = [1, 2, 3].map(n => ({ id: `ut${n}`, classId: 'science', name: `UT${n}`, order: n }))
  return {
    classes: [{ id: 'science', subject }, { id: 'other', subject: 'Català' }], semesters: [], uts,
    students: [{ id: 's1', name: 'Alumne fictici 1', classId: 'science' }, { id: 's2', name: 'Alumne fictici 2', classId: 'science' },
      { id: 'exempt', classId: 'science', tutorialExemptSubjects: [subject] }, { id: 'other-student', classId: 'other' }],
    competencies: uts.map(ut => ({ id: `comp-${ut.id}`, name: 'C1: Modelització', classId: 'science', utId: ut.id })),
    criteria: uts.map(ut => ({ id: `ca-${ut.id}`, competencyId: `comp-${ut.id}`, name: 'CA1: Rigor', selectedActionIds: ['C1R1'] })),
    marks: actionMarks([{ studentId: 's1', criterionId: 'ca-ut1', value: 'A' }, { studentId: 's2', criterionId: 'ca-ut1', value: 'D' },
      { studentId: 's1', criterionId: 'ca-ut2', value: 'B' }, { studentId: 'exempt', criterionId: 'ca-ut2', value: 'D' },
      { studentId: 'other-student', criterionId: 'ca-ut2', value: 'D' }]),
  }
}
const action = (report, id = 'C1R1') => report.rows.find(row => row.action.id === id)

test('la classe mostra cobertura, distribució, mitjana i última UT amb dades sense comptar pendents com a zero', () => {
  const report = buildActionProgress(fixture(), 'science')
  assert.equal(report.rows.length, 35)
  assert.equal(report.students.length, 2)
  const row = action(report)
  assert.equal(row.cells[0].score, 2.5)
  assert.deepEqual(row.cells[0].distribution, { A: 1, B: 0, C: 0, D: 1, NA: 0 })
  assert.equal(row.cells[1].score, 3)
  assert.equal(row.cells[1].evaluated, 1)
  assert.equal(row.cells[1].pending, 1)
  assert.equal(row.cells[1].achievedPercent, 100)
  assert.equal(row.cells[2].score, null)
  assert.equal(row.cells[2].pending, 2)
  assert.equal(row.cells[2].achievedPercent, null)
  assert.equal(row.latest.ut.id, 'ut2')
})

test('l’evolució grupal compara els mateixos alumnes i evita la falsa millora per notes incompletes', () => {
  const row = action(buildActionProgress(fixture(), 'science'))
  assert.ok(row.cells[1].score > row.cells[0].score)
  assert.equal(row.trend.kind, 'down')
  assert.equal(row.trend.delta, -1)
  assert.equal(row.trend.count, 1)
})

test('l’evolució individual només fa servir les notes de l’alumne i respecta els salts entre UT', () => {
  const state = fixture()
  state.criteria[1].selectedActionIds = []
  state.marks.push(...actionMarks([{ studentId: 's2', criterionId: 'ca-ut3', value: 'B' }]))
  const row = action(buildActionProgress(state, 'science', { studentId: 's2' }))
  assert.equal(row.cells[0].grades[0].grade, 'D')
  assert.equal(row.cells[1].selected, false)
  assert.equal(row.cells[1].score, null)
  assert.equal(row.cells[2].grades[0].grade, 'B')
  assert.equal(row.trend.kind, 'up')
  assert.equal(row.trend.firstUt.id, 'ut1')
  assert.equal(row.trend.lastUt.id, 'ut3')
})

test('una acció nova no hereta notes de les UT on encara no s’havia seleccionat', () => {
  const state = fixture()
  state.criteria[1].selectedActionIds.push('C1R2')
  state.marks.find(mark => mark.criterionId === 'ca-ut2').actionGrades.C1R2 = 'A'
  const row = action(buildActionProgress(state, 'science'), 'C1R2')
  assert.equal(row.cells[0].selected, false)
  assert.equal(row.cells[0].evaluated, 0)
  assert.equal(row.cells[1].score, 4)
  assert.equal(row.trend.kind, 'insufficient')
  assert.equal(action(buildActionProgress(state, 'science'), 'C1R3').latest, null)
})

test('no es declara una tendència grupal si no hi ha alumnat compartit entre les UT', () => {
  const state = fixture()
  state.marks = actionMarks([{ studentId: 's1', criterionId: 'ca-ut1', value: 'D' }, { studentId: 's2', criterionId: 'ca-ut2', value: 'A' }])
  assert.equal(action(buildActionProgress(state, 'science')).trend.kind, 'incomparable')
})

test('NA conserva la seva categoria i les notes esborrades no generen evidència', () => {
  const state = fixture()
  state.marks = actionMarks([{ studentId: 's1', criterionId: 'ca-ut1', value: 'NA' }, { studentId: 's2', criterionId: 'ca-ut1', value: '' }])
  const row = action(buildActionProgress(state, 'science'))
  assert.equal(row.cells[0].distribution.NA, 1)
  assert.equal(row.cells[0].distribution.D, 0)
  assert.equal(row.cells[0].score, 1)
  assert.equal(row.cells[0].evaluated, 1)
  assert.equal(row.cells[0].pending, 1)
})

test('els catàlegs manuals i les transversals queden aïllats per classe i àmbit', () => {
  const state = fixture()
  state.classes[0].evaluationActionCatalogs = { [`${subject}::specific`]: { 'C1/CA1': [{ id: 'MAN1', description: 'Acció manual' }] } }
  state.criteria[0].selectedActionIds = ['MAN1']
  state.marks.filter(mark => mark.criterionId === 'ca-ut1').forEach(mark => { mark.actionGrades = { MAN1: mark.value } })
  assert.equal(action(buildActionProgress(state, 'science'), 'MAN1').cells[0].score, 2.5)
  assert.equal(buildActionProgress(state, 'other').rows.length, 0)
  assert.equal(buildActionProgress(state, 'science', { scope: 'transversal' }).rows.length, 0)
  assert.deepEqual(buildActionProgress(state, 'missing').rows, [])
  assert.equal(buildActionProgress(state, 'science', { studentId: 'other-student' }).students.length, 0)
})

test('les accions de competències inactives no reben les notes de criteris desactivats', () => {
  const state = fixture()
  state.competencies[0].inactive = true
  const row = action(buildActionProgress(state, 'science'))
  assert.equal(row.cells[0].selected, false)
  assert.equal(row.cells[0].evaluated, 0)
})


test('les notes antigues de criteri no es converteixen en notes per acció', () => {
  const state = fixture()
  state.marks = [{ studentId: 's1', criterionId: 'ca-ut1', value: 'A' }]
  const row = action(buildActionProgress(state, 'science'))
  assert.equal(row.cells[0].evaluated, 0)
  assert.equal(row.cells[0].pending, 2)
  assert.equal(row.latest, null)
})
