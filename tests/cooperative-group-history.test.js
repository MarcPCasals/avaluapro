import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  getCooperativeGroupSetOrigin,
  normalizeCooperativeGenerationMeta,
  normalizeCooperativeQualitySnapshot,
} from '../src/features/tutoring/cooperativeGroupHistoryUtils.js'

describe('historial de grups cooperatius', () => {
  it('normalitza la qualitat guardada i limita la puntuació', () => {
    assert.deepEqual(
      normalizeCooperativeQualitySnapshot({
        criticalGroupCount: 1,
        incompatibilityCount: 2,
        label: 'A revisar',
        reviewGroupCount: 3,
        score: 130,
        unsupportedStudentCount: 4,
      }),
      {
        criticalGroupCount: 1,
        incompatibilityCount: 2,
        label: 'A revisar',
        reviewGroupCount: 3,
        score: 100,
        unsupportedStudentCount: 4,
      },
    )
  })

  it('manté compatibles les versions antigues sense metadades', () => {
    assert.equal(normalizeCooperativeQualitySnapshot(undefined), null)
    assert.deepEqual(normalizeCooperativeGenerationMeta(undefined), {
      dataSources: [],
      halfGroups: '',
      strategyLabel: '',
      strategySummary: '',
    })
    assert.equal(getCooperativeGroupSetOrigin({}), 'Proposta automàtica')
  })

  it('distingeix propostes manuals i derivades', () => {
    assert.equal(
      getCooperativeGroupSetOrigin({ manualChangeCount: 2, sourceType: 'manual' }),
      'Proposta editada manualment',
    )
    assert.equal(
      getCooperativeGroupSetOrigin({ sourceGroupSetId: 'groups-previous' }),
      'Derivada d’una versió anterior',
    )
  })
})
