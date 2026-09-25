import test from 'node:test'
import assert from 'node:assert/strict'
import { DIAGNOSIS_LIBRARY } from '../src/data/diagnosisLibrary.js'
import {
  cycleAttentionDiagnosis,
  getDiagnosisLabels,
  LITERACY_DIAGNOSIS_IDS,
  replaceDiagnosisGroup,
} from '../src/data/studentAnnotations.js'

test('el botó d’atenció fa el cicle cap → TDA → TDAH → cap sense duplicats', () => {
  const withTda = cycleAttentionDiagnosis(['tea'])
  assert.deepEqual(withTda, ['tea', 'tda'])

  const withTdah = cycleAttentionDiagnosis(withTda)
  assert.deepEqual(withTdah, ['tea', 'tdah'])

  assert.deepEqual(cycleAttentionDiagnosis(withTdah), ['tea'])
})

test('la configuració de lectoescriptura admet qualsevol combinació i conserva la resta', () => {
  const diagnoses = ['tea', 'dyslexia']
  const next = replaceDiagnosisGroup(diagnoses, LITERACY_DIAGNOSIS_IDS, ['dyslexia', 'dyscalculia'])
  assert.deepEqual(next, ['tea', 'dyslexia', 'dyscalculia'])
})

test('QI límit, TDL, TDA, TDAH i disortografia tenen pautes independents', () => {
  for (const diagnosisId of ['qi-limit', 'tdl', 'tda', 'tdah', 'dysorthography', 'down-syndrome']) {
    assert.ok(DIAGNOSIS_LIBRARY[diagnosisId]?.summary.length > 0, diagnosisId)
    assert.ok(DIAGNOSIS_LIBRARY[diagnosisId]?.sections.length > 0, diagnosisId)
  }
  assert.equal(DIAGNOSIS_LIBRARY['qi-tdl'], undefined)
})

test('el motiu de Progrés acompanya l’etiqueta en resums i exportacions', () => {
  assert.deepEqual(getDiagnosisLabels(['progress'], 'down-syndrome'), ['Alumne de progrés · Síndrome de Down'])
})
