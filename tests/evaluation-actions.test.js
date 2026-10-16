import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CFN_ACTION_CATALOG, buildEvaluationActionsPatch, getCriterionActionKey,
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
