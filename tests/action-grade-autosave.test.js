import assert from 'node:assert/strict'
import test from 'node:test'
import { createActionGradeAutosave } from '../src/lib/actionGradeAutosave.js'
import { buildActionGradeMark } from '../src/lib/actionGrades.js'

function deferred() {
  let resolve, reject
  const promise = new Promise((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}

test('els pedaços del desat automàtic mantenen la resta de notes i recalculen el mínim A, A, C com a C', async () => {
  let mark
  const criterion = { id: 'synthetic-criterion', selectedActionIds: ['R1', 'R2', 'R3'] }
  const queue = createActionGradeAutosave({ save: async grades => {
    mark = buildActionGradeMark({ existing: mark, criterion, studentId: 'synthetic-student', grades, createId: () => 'synthetic-mark' })
  }, onState() {} })
  await queue.enqueue({ R1: 'A' })
  await queue.enqueue({ R2: 'A' })
  await queue.enqueue({ R3: 'C' })
  assert.equal(mark.value, 'C')
  assert.deepEqual(mark.actionGrades, { R1: 'A', R2: 'A', R3: 'C' })
  await queue.enqueue({ R3: '' })
  assert.equal(mark.value, 'A')
  assert.deepEqual(mark.actionGrades, { R1: 'A', R2: 'A', R3: '' })
})

test('obrir el diàleg no crea notes i cada canvi desa només les accions modificades', async () => {
  const writes = [], states = []
  const queue = createActionGradeAutosave({ save: async patch => writes.push(patch), onState: state => states.push(state) })
  assert.equal(await queue.flush(), true)
  assert.equal(writes.length, 0)
  await queue.enqueue({ R1: 'A' })
  assert.deepEqual(writes, [{ R1: 'A' }])
  assert.equal(states.at(-1).status, 'saved')
})

test('els canvis ràpids es desen en ordre i preval l’últim valor de cada acció', async () => {
  const first = deferred(), writes = [], saved = {}
  const queue = createActionGradeAutosave({ save: async patch => {
    writes.push(patch)
    if (writes.length === 1) await first.promise
    Object.assign(saved, patch)
  }, onState() {} })
  queue.enqueue({ R1: 'A' })
  await Promise.resolve()
  queue.enqueue({ R2: 'A' })
  queue.enqueue({ R1: 'C' })
  queue.enqueue({ R3: 'B' })
  assert.equal(writes.length, 1)
  first.resolve()
  assert.equal(await queue.flush(), true)
  assert.deepEqual(writes, [{ R1: 'A' }, { R2: 'A', R1: 'C', R3: 'B' }])
  assert.deepEqual(saved, { R1: 'C', R2: 'A', R3: 'B' })
})

test('esborrar una nota també es desa automàticament', async () => {
  const writes = []
  const queue = createActionGradeAutosave({ save: async patch => writes.push(patch), onState() {} })
  await queue.enqueue({ R1: 'C' })
  await queue.enqueue({ R1: '' })
  assert.deepEqual(writes, [{ R1: 'C' }, { R1: '' }])
})

test('el tancament espera també els canvis introduïts mentre hi ha un desat pendent', async () => {
  const first = deferred(), second = deferred()
  let calls = 0, closed = false
  const queue = createActionGradeAutosave({ save: async () => {
    calls++
    await (calls === 1 ? first.promise : second.promise)
  }, onState() {} })
  queue.enqueue({ R1: 'A' })
  await Promise.resolve()
  const closing = queue.flush().then(ok => { if (ok) closed = true })
  queue.enqueue({ R2: 'C' })
  first.resolve()
  await Promise.resolve()
  await Promise.resolve()
  assert.equal(closed, false)
  second.resolve()
  await closing
  assert.equal(calls, 2)
  assert.equal(closed, true)
})

test('un error conserva els canvis i permet tornar a provar sense tancar el diàleg', async () => {
  const states = [], writes = []
  let fail = true
  const queue = createActionGradeAutosave({ save: async patch => {
    writes.push(patch)
    if (fail) throw new Error('Error de desat')
  }, onState: state => states.push(state) })
  assert.equal(await queue.enqueue({ R1: 'A' }), false)
  assert.deepEqual(states.at(-1), { status: 'error', error: 'Error de desat' })
  fail = false
  assert.equal(await queue.enqueue({ R1: 'C', R2: 'B' }), true)
  assert.deepEqual(writes.at(-1), { R1: 'C', R2: 'B' })
  assert.equal(states.at(-1).status, 'saved')
})

test('Tornar a provar desa el canvi fallit encara que no es modifiqui cap altra nota', async () => {
  let fail = true
  const saved = {}
  const queue = createActionGradeAutosave({ save: async patch => {
    if (fail) throw new Error('Error')
    Object.assign(saved, patch)
  }, onState() {} })
  await queue.enqueue({ R1: 'NA' })
  fail = false
  assert.equal(await queue.flush(), true)
  assert.deepEqual(saved, { R1: 'NA' })
})

test('desmuntar la pantalla no descarta els canvis pendents ni notifica un diàleg desmuntat', async () => {
  const first = deferred(), saved = {}, states = []
  let calls = 0
  const queue = createActionGradeAutosave({ save: async patch => {
    if (++calls === 1) await first.promise
    Object.assign(saved, patch)
  }, onState: state => states.push(state) })
  queue.enqueue({ R1: 'A' })
  await Promise.resolve()
  queue.enqueue({ R2: 'C' })
  queue.dispose()
  const notifications = states.length
  first.resolve()
  assert.equal(await queue.flush(), true)
  assert.deepEqual(saved, { R1: 'A', R2: 'C' })
  assert.equal(states.length, notifications)
})
