import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  getCooperativeGroupSetOrigin,
  getVisibleCooperativeGroupSet,
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

  it('obre la darrera versió creada fins que s’activa l’edició', () => {
    const versions = [
      { id: 'recent', createdAt: '2026-11-27T09:00:00Z', updatedAt: '2026-11-27T09:00:00Z' },
      { id: 'old', createdAt: '2026-11-20T09:00:00Z', updatedAt: '2026-11-27T10:00:00Z' },
    ]
    assert.equal(getVisibleCooperativeGroupSet(versions)?.id, 'recent')
    assert.equal(getVisibleCooperativeGroupSet(versions, 'old')?.id, 'old')
    assert.equal(getVisibleCooperativeGroupSet(versions, 'old', true), null)
    assert.equal(getVisibleCooperativeGroupSet(versions, 'missing')?.id, 'recent')
  })
})
