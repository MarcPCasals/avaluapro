import assert from 'node:assert/strict'
import test from 'node:test'
import { selectEvaluationCompetencies } from '../src/lib/transversalEvaluation.js'
import {
  CFN_ACTION_CATALOG, buildCopyEvaluationActionsPatch, buildEvaluationActionsPatch, getActionCatalogScope, getCriterionActionKey, getEvaluationActionCopyDestinations,
  getEvaluationActionCatalog, getSelectedCriterionActions, parseActionLines,
} from '../src/lib/evaluationActions.js'

const subject = 'Ciències Físiques i de la Natura'
const c1 = { id: 'c1-ut1', classId: 'science', utId: 'ut1', name: 'C1: Modelització' }
const ca1 = { id: 'ca1-ut1', competencyId: c1.id, name: 'CA1: Rigor', rubric: { A: 'Rigorós' } }
function fixture() {
  return {
    classes: [{ id: 'science', subject }, { id: 'language', subject: 'Català' }],
    uts: [{ id: 'ut1', classId: 'science' }, { id: 'ut2', classId: 'science' }],
    competencies: [c1, { ...c1, id: 'c1-ut2', utId: 'ut2' }, { ...c1, id: 'inactive', inactive: true }],
    criteria: [ca1, { ...ca1, id: 'ca1-ut2', competencyId: 'c1-ut2' }, { ...ca1, id: 'inactive-ca', competencyId: 'inactive' }],
    marks: [{ studentId: 'synthetic-student', criterionId: ca1.id, value: 'B' }],
  }
}

test('CFN inclou les 35 accions amb els codis, criteris i ordre indicats', () => {
  for (const [key, prefix, count] of [['C1/CA1', 'C1R', 4], ['C1/CA2', 'C1P', 5], ['C2/CA1', 'C2P', 7], ['C2/CA2', 'C2R', 5], ['C3/CA1', 'C3S', 6], ['C3/CA2', 'C3C', 8]]) {
    assert.deepEqual(CFN_ACTION_CATALOG[key].map(action => action.id), Array.from({ length: count }, (_, i) => `${prefix}${i + 1}`))
  }
  assert.equal(Object.values(CFN_ACTION_CATALOG).flat().length, 35)
  assert.equal(CFN_ACTION_CATALOG['C3/CA2'][7].description, 'Contraargumentar.')
  assert.equal(getEvaluationActionCatalog({ subject })['C1/CA1'][0].description, 'Utilitzar lèxic científic.')
  assert.deepEqual(getEvaluationActionCatalog({ subject }, 'transversal'), {})
  assert.deepEqual(getEvaluationActionCatalog({ subject: 'Català' }), {})
})

test('seleccionar accions només afecta la UT activa, conserva rúbriques i notes i filtra codis inexistents', () => {
  const original = fixture()
  const patch = buildEvaluationActionsPatch(original, { classId: 'science', utId: 'ut1', catalog: CFN_ACTION_CATALOG,
    selections: { [ca1.id]: ['C1R1', 'C1R4', 'C1R1', 'INVALID'], 'ca1-ut2': ['C1R2'], 'inactive-ca': ['C1R1'] },
  })
  assert.deepEqual(patch.criteria[0].selectedActionIds, ['C1R1', 'C1R4'])
  assert.deepEqual(patch.criteria[0].rubric, ca1.rubric)
  assert.equal(patch.criteria[1], original.criteria[1])
  assert.equal(patch.criteria[2], original.criteria[2])
  assert.equal(patch.classes[1], original.classes[1])
  assert.equal(Object.hasOwn(patch, 'marks'), false)
  assert.equal(original.criteria[0].selectedActionIds, undefined)
  assert.deepEqual(getSelectedCriterionActions(getEvaluationActionCatalog(patch.classes[0]), c1, patch.criteria[0]).map(action => action.id), ['C1R1', 'C1R4'])
  assert.deepEqual(getSelectedCriterionActions(CFN_ACTION_CATALOG, c1, ca1), [])
})

test('desmarcar totes és persistent i el catàleg manual es reutilitza en altres UT', () => {
  const state = fixture()
  const catalog = { 'C1/CA1': parseActionLines('MAN1: Acció manual\nUna altra acció') }
  const first = buildEvaluationActionsPatch(state, { classId: 'science', utId: 'ut1', catalog, selections: { [ca1.id]: ['MAN1'] } })
  const next = { ...state, ...first }
  const second = buildEvaluationActionsPatch(next, { classId: 'science', utId: 'ut2', catalog: getEvaluationActionCatalog(next.classes[0]), selections: { 'ca1-ut2': ['MAN1'] } })
  const clear = buildEvaluationActionsPatch({ ...next, ...second }, { classId: 'science', utId: 'ut1', catalog, selections: { [ca1.id]: [] } })
  assert.deepEqual(clear.criteria[0].selectedActionIds, [])
  assert.deepEqual(clear.criteria[1].selectedActionIds, ['MAN1'])
  assert.throws(() => buildEvaluationActionsPatch(state, { classId: 'language', utId: 'ut1', catalog, selections: {} }), /classe o la UT/)
})

test('una mateixa etiqueta de criteri pertany al catàleg de la seva competència', () => {
  assert.notEqual(getCriterionActionKey({ name: 'C1: Modelització' }, { name: 'CA1: Rigor' }), getCriterionActionKey({ name: 'C2: Indagació' }, { name: 'CA1: Pertinència' }))
  assert.equal(getCriterionActionKey({ name: 'C2 — Investigar' }, { name: 'CA2 — Rigor' }), 'C2/CA2')
})

test('la importació admet Markdown, CRLF i text sense codi, conserva identitats i rebutja codis ambigus', () => {
  assert.deepEqual(parseActionLines('- **C1R1:** Utilitzar lèxic científic.\r\n\n• C1R2: Representar.'), [
    { id: 'C1R1', description: 'Utilitzar lèxic científic.' }, { id: 'C1R2', description: 'Representar.' },
  ])
  assert.deepEqual(parseActionLines('Primera\nSegona').map(action => action.id).sort(), parseActionLines('Segona\nPrimera').map(action => action.id).sort())
  assert.throws(() => parseActionLines('X1: Una\nX1: Diferent'), /dues descripcions/)
  assert.throws(() => parseActionLines('X1:'), /descripció/)
})

test('les transversals reutilitzades de PI admeten selecció sense contaminar el catàleg específic', () => {
  const state = fixture()
  state.classes[0].transversalCompetencyNames = ['TRANS C1: Emprendre projectes per millorar l’entorn']
  state.competencies[0] = { ...c1, name: state.classes[0].transversalCompetencyNames[0] }
  const key = getCriterionActionKey(state.competencies[0], ca1)
  const catalog = { [key]: [{ id: 'T1', description: 'Acció transversal' }] }
  const patch = buildEvaluationActionsPatch(state, { classId: 'science', utId: 'ut1', scope: 'transversal', catalog, selections: { [ca1.id]: ['T1'] } })
  assert.deepEqual(patch.criteria[0].selectedActionIds, ['T1'])
  assert.deepEqual(getEvaluationActionCatalog(patch.classes[0], 'transversal'), catalog)
  assert.equal(getEvaluationActionCatalog(patch.classes[0])['C1/CA1'][0].id, 'C1R1')
})

test('la selecció d’avaluació respecta les competències desactivades a la UT encara que la fila sigui antiga', () => {
  const state = fixture()
  state.uts[0].disabledCompetencyNames = [c1.name]
  assert.deepEqual(selectEvaluationCompetencies(state, state.classes[0], 'ut1', 'specific'), [])
  assert.equal(selectEvaluationCompetencies(state, state.classes[0], 'ut2', 'specific').length, 1)
  const patch = buildEvaluationActionsPatch(state, { classId: 'science', utId: 'ut1', catalog: CFN_ACTION_CATALOG, selections: { [ca1.id]: ['C1R1'] } })
  assert.equal(patch.criteria[0].selectedActionIds, undefined)
})

function copyFixture() {
  const state = fixture()
  state.classes.push({ id: 'parallel', name: 'Classe paral·lela', subject }, { id: 'empty', name: 'Sense UT', subject })
  state.uts.push({ id: 'parallel-ut1', classId: 'parallel', name: 'UT1', order: 1 }, { id: 'parallel-ut2', classId: 'parallel', name: 'UT2', order: 2 }, { id: 'language-ut', classId: 'language', name: 'UT1' })
  state.uts[0].order = 1
  state.competencies.push({ ...c1, id: 'parallel-comp', classId: 'parallel', utId: 'parallel-ut1' }, { ...c1, id: 'parallel-comp2', classId: 'parallel', utId: 'parallel-ut2' })
  state.criteria.push({ ...ca1, id: 'parallel-ca', competencyId: 'parallel-comp' }, { ...ca1, id: 'parallel-ca2', competencyId: 'parallel-comp2' })
  return state
}

test('copiar el catàleg a diverses classes no demana cap UT ni copia les seleccions', () => {
  const state = copyFixture()
  const catalog = { ...CFN_ACTION_CATALOG, 'C1/CA1': [...CFN_ACTION_CATALOG['C1/CA1'], { id: 'MANUAL1', description: 'Acció carregada manualment' }] }
  const { patch, report } = buildCopyEvaluationActionsPatch(state, { classId: 'science', utId: 'ut1', catalog,
    selections: { [ca1.id]: ['MANUAL1'] }, targets: [{ classId: 'parallel' }, { classId: 'language' }, { classId: 'empty' }] })
  assert.deepEqual(report, { classes: 3 })
  assert.deepEqual(patch.criteria[0].selectedActionIds, ['MANUAL1'])
  for (const id of ['parallel', 'language', 'empty']) {
    const copied = getEvaluationActionCatalog(patch.classes.find(item => item.id === id))
    assert.equal(copied['C1/CA1'].at(-1).id, 'MANUAL1')
  }
  for (const id of ['parallel-ca', 'parallel-ca2']) {
    assert.equal(patch.criteria.find(item => item.id === id), state.criteria.find(item => item.id === id))
  }
  assert.equal(Object.hasOwn(patch, 'marks'), false)
  assert.equal(state.classes[0].evaluationActionCatalogs, undefined)
})

test('el catàleg carregat és comú a totes les UT actuals i futures i no s’esborra en desactivar competències', () => {
  const state = copyFixture()
  const catalog = { 'C1/CA1': [{ id: 'MANUAL1', description: 'Acció carregada manualment' }] }
  const { patch } = buildCopyEvaluationActionsPatch(state, { classId: 'science', utId: 'ut1', catalog,
    selections: {}, targets: [{ classId: 'parallel' }] })
  const next = { ...state, ...patch }
  next.uts.push({ id: 'future-ut', classId: 'parallel', name: 'UT3' })
  next.competencies.push({ ...c1, id: 'future-comp', classId: 'parallel', utId: 'future-ut' })
  next.criteria.push({ ...ca1, id: 'future-ca', competencyId: 'future-comp' })
  const target = next.classes.find(item => item.id === 'parallel')
  for (const utId of ['parallel-ut1', 'parallel-ut2', 'future-ut']) {
    const comp = selectEvaluationCompetencies(next, target, utId, 'specific')[0]
    assert.equal(getEvaluationActionCatalog(target)[getCriterionActionKey(comp, comp.criteria[0])].at(-1).id, 'MANUAL1')
  }
  next.uts.find(item => item.id === 'parallel-ut1').disabledCompetencyNames = [c1.name]
  assert.deepEqual(selectEvaluationCompetencies(next, target, 'parallel-ut1', 'specific'), [])
  assert.equal(getEvaluationActionCatalog(target)['C1/CA1'].at(-1).id, 'MANUAL1')
  next.uts.find(item => item.id === 'parallel-ut1').disabledCompetencyNames = []
  assert.equal(selectEvaluationCompetencies(next, target, 'parallel-ut1', 'specific').length, 1)
  assert.equal(getEvaluationActionCatalog(target)['C1/CA1'].at(-1).id, 'MANUAL1')
})

test('es conserven les seleccions, les notes i les accions pròpies de totes les UT de destí', () => {
  const state = copyFixture()
  state.criteria.find(item => item.id === 'parallel-ca').selectedActionIds = ['C1R2']
  state.marks.push({ id: 'target-mark', studentId: 'other-student', criterionId: 'parallel-ca2', value: 'A' })
  state.classes.find(item => item.id === 'parallel').evaluationActionCatalogs = { [getActionCatalogScope(subject)]: {
    'C1/CA1': [...CFN_ACTION_CATALOG['C1/CA1'], { id: 'LOCAL', description: 'Acció pròpia' }],
  } }
  const { patch } = buildCopyEvaluationActionsPatch(state, { classId: 'science', utId: 'ut1', catalog: CFN_ACTION_CATALOG,
    selections: { [ca1.id]: ['C1R1'] }, targets: [{ classId: 'parallel' }] })
  assert.equal(patch.criteria.find(item => item.id === 'parallel-ca'), state.criteria.find(item => item.id === 'parallel-ca'))
  assert.equal(patch.criteria.find(item => item.id === 'parallel-ca2'), state.criteria.find(item => item.id === 'parallel-ca2'))
  assert.equal(getEvaluationActionCatalog(patch.classes.find(item => item.id === 'parallel'))['C1/CA1'].at(-1).id, 'LOCAL')
  assert.equal(Object.hasOwn(patch, 'marks'), false)
})

test('els catàlegs específics i transversals continuen separats després de copiar', () => {
  const state = copyFixture()
  const catalog = { custom: [{ id: 'T1', description: 'Acció transversal' }] }
  const { patch } = buildCopyEvaluationActionsPatch(state, { classId: 'science', utId: 'ut1', scope: 'transversal', catalog,
    selections: {}, targets: [{ classId: 'empty' }] })
  const target = patch.classes.find(item => item.id === 'empty')
  assert.deepEqual(getEvaluationActionCatalog(target, 'transversal'), catalog)
  assert.equal(getEvaluationActionCatalog(target)['C1/CA1'][0].id, 'C1R1')
  assert.deepEqual(patch.criteria, state.criteria)
})

test('es rebutgen destins i codis ambigus sense aplicar canvis parcials', () => {
  const state = copyFixture()
  const config = { classId: 'science', utId: 'ut1', catalog: CFN_ACTION_CATALOG, selections: { [ca1.id]: ['C1R1'] }, targets: [{ classId: 'parallel' }] }
  for (const targets of [[], [{ classId: 'missing' }], [{ classId: 'science' }], [...config.targets, ...config.targets]]) {
    assert.throws(() => buildCopyEvaluationActionsPatch(state, { ...config, targets }))
  }
  state.classes.find(item => item.id === 'language').evaluationActionCatalogs = { [getActionCatalogScope('Català')]: { 'C1/CA1': [{ id: 'C1R1', description: 'Significat diferent' }] } }
  const snapshot = JSON.stringify(state)
  assert.throws(() => buildCopyEvaluationActionsPatch(state, { ...config, targets: [...config.targets, { classId: 'language' }] }), /descripció diferent/)
  assert.equal(JSON.stringify(state), snapshot)
})

test('els destins inclouen totes les altres classes encara que no tinguin cap UT', () => {
  const state = copyFixture()
  const options = getEvaluationActionCopyDestinations(state, 'science')
  assert.equal(options.length, 3)
  assert.ok(options.some(item => item.id === 'empty'))
  assert.equal(options.some(item => item.id === 'science'), false)
  assert.equal(options.some(item => Object.hasOwn(item, 'uts')), false)
})
