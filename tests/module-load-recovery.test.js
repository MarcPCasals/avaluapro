import test from 'node:test'
import assert from 'node:assert/strict'
import { isStaleModuleLoadError, recoverStaleModuleLoad } from '../src/lib/moduleLoadRecovery.js'

function createStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  }
}

test('reconeix un mòdul dinàmic antic després d una publicació', () => {
  assert.equal(
    isStaleModuleLoadError(new TypeError('Failed to fetch dynamically imported module: https://avaluapro.web.app/assets/PlanningModule-old.js')),
    true,
  )
  assert.equal(isStaleModuleLoadError(new Error('La validació del formulari ha fallat')), false)
})

test('recarrega una vegada per obtenir la versió publicada actual', () => {
  const storage = createStorage()
  let reloads = 0
  const input = {
    error: new TypeError('Failed to fetch dynamically imported module: /assets/PlanningModule-old.js'),
    now: 100_000,
    reload: () => { reloads += 1 },
    storage,
  }

  assert.equal(recoverStaleModuleLoad(input), true)
  assert.equal(recoverStaleModuleLoad({ ...input, now: 100_100 }), false)
  assert.equal(reloads, 1)
})

test('permet un nou intent passat el temps de protecció', () => {
  const storage = createStorage()
  let reloads = 0
  const error = new Error('ChunkLoadError: Loading chunk PlanningModule failed')

  assert.equal(recoverStaleModuleLoad({ error, now: 100_000, reload: () => { reloads += 1 }, storage }), true)
  assert.equal(recoverStaleModuleLoad({ error, now: 161_000, reload: () => { reloads += 1 }, storage }), true)
  assert.equal(reloads, 2)
})

test('l avís específic de Vite pot forçar la recuperació encara que no porti missatge', () => {
  let reloads = 0
  assert.equal(recoverStaleModuleLoad({ force: true, reload: () => { reloads += 1 }, storage: createStorage() }), true)
  assert.equal(reloads, 1)
})
