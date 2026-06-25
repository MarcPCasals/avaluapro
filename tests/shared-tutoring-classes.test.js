import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { findSharedTutoringClassTarget, normalizeClassName } from '../src/lib/sharedTutoringClasses.js'

describe('deteccio de classe per cotutoria compartida', () => {
  test('normalitza noms amb accents, espais i majuscules', () => {
    assert.equal(normalizeClassName('  2n  ÈSO   A  '), '2n eso a')
  })

  test('prioritza una classe ja vinculada al mateix espai', () => {
    const result = findSharedTutoringClassTarget({
      className: '2n ESO A',
      spaceId: 'space-1',
      classes: [
        { id: 'class-existing', name: '2n ESO A' },
        { id: 'class-linked', name: 'Un altre nom', sharedTutoringSpaceId: 'space-1' },
      ],
    })

    assert.equal(result.classItem.id, 'class-linked')
    assert.equal(result.matchType, 'shared-space')
    assert.equal(result.needsConfirmation, false)
  })

  test('detecta una classe existent amb el mateix nom encara que no sigui tutoria', () => {
    const result = findSharedTutoringClassTarget({
      className: '2n ESO A',
      spaceId: 'space-1',
      classes: [
        {
          id: 'class-cfn',
          isTutoringGroup: false,
          name: '  2N   ESO À ',
          subject: 'Ciències Físiques i de la Natura',
        },
      ],
    })

    assert.equal(result.classItem.id, 'class-cfn')
    assert.equal(result.matchType, 'name')
    assert.equal(result.needsConfirmation, true)
  })
})
