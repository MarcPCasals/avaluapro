import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

let server, Stats, GradeModal, ActionsModal
test.before(async () => {
  server = await createServer({ configFile: false, envFile: false, plugins: [react()],
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, hmr: false, ws: false },
  })
  Stats = (await server.ssrLoadModule('/src/features/analytics/ActionProgressStats.jsx')).ActionProgressStats
  GradeModal = (await server.ssrLoadModule('/src/features/evaluation/CriterionGradeModal.jsx')).CriterionGradeModal
  ActionsModal = (await server.ssrLoadModule('/src/features/evaluation/EvaluationActionsModal.jsx')).EvaluationActionsModal
})
test.after(async () => { await server?.close() })

function fixture() {
  return {
    classes: [{ id: 'synthetic-class', subject: 'Ciències Físiques i de la Natura' }],
    semesters: [], uts: [{ id: 'synthetic-ut1', classId: 'synthetic-class', name: 'UT1', order: 1 },
      { id: 'synthetic-ut2', classId: 'synthetic-class', name: 'UT2', order: 2 }],
    students: [{ id: 'synthetic-student', classId: 'synthetic-class', name: 'Alumne fictici' }],
    competencies: [{ id: 'synthetic-comp', classId: 'synthetic-class', utId: 'synthetic-ut1', name: 'C1: Modelització' }],
    criteria: [{ id: 'synthetic-ca', competencyId: 'synthetic-comp', name: 'CA1: Rigor', selectedActionIds: ['C1R1'] }],
    marks: [{ studentId: 'synthetic-student', criterionId: 'synthetic-ca', value: 'B', gradingMode: 'actions', actionGrades: { C1R1: 'B' } }],
  }
}

test('la vista grupal distingeix notes, UT no seleccionades i la referència al criteri', () => {
  const html = renderToStaticMarkup(createElement(Stats, { state: fixture(), classId: 'synthetic-class' }))
  assert.match(html, /Evolució de les accions · Classe/)
  assert.match(html, /Cada acció té la seva pròpia nota/)
  assert.match(html, /C1R1 · UT1: mitjana 3, 1 de 1 alumnes amb nota/)
  assert.match(html, /No seleccionada/)
  assert.match(html, /100% A\/B/)
  assert.match(html, /<th scope="col">UT2<\/th>/)
  assert.match(html, /aria-label="A: 0, B: 1, C: 0, D: 0, NA: 0"/)
})

test('la vista individual mostra la nota i no presenta una distribució grupal', () => {
  const html = renderToStaticMarkup(createElement(Stats, { state: fixture(), classId: 'synthetic-class', studentId: 'synthetic-student' }))
  assert.match(html, /Evolució de les accions · Individual/)
  assert.match(html, /Nota de cada acció per UT/)
  assert.match(html, /grade-B[^>]*>B<\/span>/)
  assert.doesNotMatch(html, /class="action-distribution"/)
  assert.match(html, /Calen dues UT amb nota/)
})

test('el diàleg permet qualificar cada acció i presenta C com a mínim de A, A i C', () => {
  const actions = ['R1', 'R2', 'R3'].map(id => ({ id, description: `Acció ${id}` }))
  const html = renderToStaticMarkup(createElement(GradeModal, {
    student: { name: 'Alumne fictici' }, competency: { name: 'C1: Modelització' },
    criterion: { name: 'CA1: Rigor', selectedActionIds: actions.map(action => action.id) }, actions,
    mark: { value: 'C', actionGrades: { R1: 'A', R2: 'A', R3: 'C' } }, value: 'C',
    onClose() {}, onSaveActions() {},
  }))
  assert.equal((html.match(/aria-label="Nota de R/g) || []).length, 3)
  assert.match(html, /class="action-criterion-result" role="status"><strong class="grade grade-C">C/)
  assert.match(html, /3\/3 accions qualificades/)
  assert.doesNotMatch(html, /Nota provisional/)
  assert.match(html, /Desar notes de les accions/)
})


test('la finestra d’accions només mostra les competències actives i sempre ofereix Tancar', () => {
  const state = fixture()
  const active = { ...state.competencies[0], criteria: state.criteria }
  const inactive = { id: 'inactive-comp', name: 'C2: Indagació', inactive: true, criteria: [] }
  const html = renderToStaticMarkup(createElement(ActionsModal, {
    competencies: [active, inactive], catalog: {}, utName: 'UT1', onClose() {}, onSave() {},
  }))
  assert.match(html, /C1: Modelització/)
  assert.doesNotMatch(html, /C2: Indagació/)
  assert.match(html, /aria-label="Tancar"/)
  assert.match(html, /class="secondary-action" type="button">Tancar<\/button>/)
})

test('les estadístiques no mostren les competències inactives del catàleg general', () => {
  const html = renderToStaticMarkup(createElement(Stats, { state: fixture(), classId: 'synthetic-class' }))
  assert.match(html, /C1R1/)
  assert.doesNotMatch(html, /C2P1|C3S1|C2: Indagació|C3: Argumentació/)
})

test('la còpia ofereix el catàleg per a totes les UT i només demana classes de destí', () => {
  const state = fixture()
  const html = renderToStaticMarkup(createElement(ActionsModal, {
    competencies: [{ ...state.competencies[0], criteria: state.criteria }], catalog: {}, utName: 'UT1', onClose() {}, onSave() {}, onCopy() {},
    copyDestinations: [{ id: 'other-class', name: 'Classe sense UT', subject: 'Ciències' }],
  }))
  assert.match(html, /Les accions pertanyen al catàleg de l’assignatura i estan disponibles a totes les UT/)
  assert.match(html, /també a les que creïs més endavant/)
  assert.match(html, /Classe sense UT/)
  assert.doesNotMatch(html, /UT de destí|Copiar també les accions seleccionades|<select/)
})
