import assert from 'node:assert/strict'
import test from 'node:test'
import { getPreviewModules } from '../src/config/featureFlags.js'

test('els mòduls opcionals estan desactivats si no es demana cap previsualització', () => {
  assert.deepEqual([...getPreviewModules('')], [])
})

test('la previsualització només accepta mòduls opcionals coneguts', () => {
  assert.deepEqual([...getPreviewModules('?preview=Agenda,unknown,planning')], ['agenda', 'planning'])
})

test('preview=all activa tots els mòduls opcionals', () => {
  assert.deepEqual([...getPreviewModules('?preview=all')], ['planning', 'agenda'])
})
