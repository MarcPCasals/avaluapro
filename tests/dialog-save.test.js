import assert from 'node:assert/strict'
import test from 'node:test'
import { createDialogSaveLifecycle } from '../src/lib/useDialogSave.js'

function fixture() {
  let closed = 0
  const states = []
  const lifecycle = createDialogSaveLifecycle({ onClose: () => { closed++ }, onState: state => states.push(state), errorMessage: 'Error en desar' })
  return { lifecycle, states, get closed() { return closed } }
}

test('Tancar respon immediatament encara que el desat continuï pendent', async () => {
  const state = fixture()
  let complete
  const saving = state.lifecycle.save(() => new Promise(resolve => { complete = resolve }))
  assert.equal(state.states.at(-1).busy, true)
  state.lifecycle.close()
  assert.equal(state.closed, 1)
  complete()
  await saving
  assert.equal(state.closed, 1)
  assert.equal(state.states.length, 1)
})

test('un desat que falla després de tancar no modifica una finestra nova', async () => {
  const previous = fixture()
  let reject
  const saving = previous.lifecycle.save(() => new Promise((_, fail) => { reject = fail }))
  previous.lifecycle.close()
  const next = fixture()
  reject(new Error('Error tardà'))
  await saving
  assert.equal(next.closed, 0)
  assert.equal(next.states.length, 0)
  assert.equal(previous.closed, 1)
  assert.equal(previous.states.length, 1)
})

test('un error visible reactiva el formulari i permet tornar a desar', async () => {
  const state = fixture()
  await state.lifecycle.save(async () => { throw new Error('No s’ha pogut desar') })
  assert.deepEqual(state.states.at(-1), { busy: false, error: 'No s’ha pogut desar' })
  assert.equal(state.closed, 0)
  await state.lifecycle.save(async () => {})
  assert.equal(state.closed, 1)
})

test('un doble clic no duplica el desat i desmuntar evita qualsevol tancament tardà', async () => {
  const state = fixture()
  let complete, calls = 0
  const saving = state.lifecycle.save(() => { calls++; return new Promise(resolve => { complete = resolve }) })
  await state.lifecycle.save(async () => { calls++ })
  assert.equal(calls, 1)
  state.lifecycle.dispose()
  complete()
  await saving
  assert.equal(state.closed, 0)
})

test('copiar pot mostrar el resultat i continuar amb la finestra oberta', async () => {
  const state = fixture()
  await state.lifecycle.save(async () => ({ classes: 2 }), { closeOnSuccess: false, successMessage: report => `Copiat a ${report.classes} classes` })
  assert.equal(state.closed, 0)
  assert.deepEqual(state.states.at(-1), { busy: false, error: '', notice: 'Copiat a 2 classes' })
  state.lifecycle.close()
  assert.equal(state.closed, 1)
})

test('tancar mentre es copia impedeix mostrar un resultat tardà', async () => {
  const state = fixture()
  let complete
  const saving = state.lifecycle.save(() => new Promise(resolve => { complete = resolve }), { closeOnSuccess: false, successMessage: () => 'Copiat' })
  state.lifecycle.close()
  complete()
  await saving
  assert.equal(state.states.length, 1)
  assert.equal(state.closed, 1)
})
