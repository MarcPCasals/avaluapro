import assert from 'node:assert/strict'
import test from 'node:test'
import { getEffectiveMeasures, saveEffectiveMeasure } from '../src/lib/effectiveMeasures.js'

test('afegeix i edita una mesura observada sense perdre les altres entrades', () => {
  const first = saveEffectiveMeasure([], {
    measure: '  Instruccions d’una en una  ',
    context: '  Tasques de diversos passos  ',
    reviewedOn: '2026-11-06',
  }, 'measure-1', '2026-11-06T10:00:00Z')
  const second = saveEffectiveMeasure(first, {
    measure: 'Pausa curta', context: 'Després de lectura', reviewedOn: '',
  }, 'measure-2', '2026-11-06T10:05:00Z')
  const edited = saveEffectiveMeasure(second, {
    measure: 'Instruccions breus', context: 'Tasques de diversos passos', reviewedOn: '2026-11-07',
  }, 'measure-1', '2026-11-07T10:00:00Z')

  assert.equal(edited.length, 2)
  assert.equal(edited[0].measure, 'Instruccions breus')
  assert.equal(edited[0].createdAt, first[0].createdAt)
  assert.equal(edited[0].reviewedOn, '2026-11-07')
  assert.deepEqual(edited[1], second[1])
  assert.deepEqual(getEffectiveMeasures({ effectiveMeasures: edited }), edited)
})

test('no desa mesures buides i accepta alumnes sense el camp nou', () => {
  assert.deepEqual(getEffectiveMeasures({}), [])
  assert.deepEqual(saveEffectiveMeasure([], { measure: 'Text', context: ' ' }, 'measure-1'), [])
  assert.deepEqual(getEffectiveMeasures({ effectiveMeasures: [null, { measure: '' }] }), [])
})
