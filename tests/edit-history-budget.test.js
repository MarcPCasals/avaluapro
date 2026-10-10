import assert from 'node:assert/strict'
import test from 'node:test'
import { createEditHistoryBudget } from '../src/lib/editHistoryBudget.js'
import { createEditHistory } from '../src/lib/editHistory.js'
import { createPlanningRepository } from '../src/data/planningRepository.js'
import { acknowledgePlanningOperation, loadPlanningOutbox } from '../src/data/local/planningIndexedDb.js'
import 'fake-indexeddb/auto'

function clockBudget() {
  let time = 100_000
  const saved = new Map()
  const storage = { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value) }
  return { budget: createEditHistoryBudget({ now: () => time, storage: () => storage }), storage, now: () => time, advance: ms => { time += ms } }
}
test('10 clics per minut es mantenen després de recarregar i es desbloquegen sense perdre historial', () => {
  const clock = clockBudget()
  for (let i = 0; i < 10; i++) assert.equal(clock.budget.consume(1).allowed, true)
  assert.equal(clock.budget.consume(1).allowed, false)
  const reloaded = createEditHistoryBudget({ now: clock.now, storage: () => clock.storage })
  assert.equal(reloaded.consume(1).allowed, false)
  clock.advance(60_001)
  assert.equal(reloaded.consume(1).allowed, true)
})
test('compta documents: 300 per minut i 1500 per 24 hores encara que hi hagi pocs clics', () => {
  const clock = clockBudget()
  assert.equal(clock.budget.consume(250).allowed, true)
  assert.equal(clock.budget.consume(51).allowed, false)
  for (let i = 0; i < 4; i++) { clock.advance(60_001); assert.equal(clock.budget.consume(300).allowed, true) }
  clock.advance(60_001)
  assert.equal(clock.budget.consume(51).allowed, false)
  assert.match(clock.budget.check(51).message, /24 hores/)
  clock.advance(86_400_001)
  assert.equal(clock.budget.consume(300).allowed, true)
  assert.match(clock.budget.check(301).message, /més de 300/)
})
test('100 recuperacions per 24 hores i fre en memòria si no hi ha emmagatzematge', () => {
  let time = 100_000
  const budget = createEditHistoryBudget({ now: () => time, storage: () => undefined })
  for (let minute = 0; minute < 10; minute++) {
    for (let i = 0; i < 10; i++) assert.equal(budget.consume(1).allowed, true)
    time += 60_001
  }
  assert.equal(budget.consume(1).allowed, false)
})
test('el clic onze no llegeix adaptadors, no escriu i no consumeix l’operació pendent', async () => {
  const clock = clockBudget(), history = createEditHistory({ budget: clock.budget })
  let value = { id: 'synthetic' }, reads = 0, writes = 0
  const adapter = { id: 'synthetic', readMany: async () => { reads++; return [value] }, writeMany: async (changes, side) => { writes++; value = changes[0][side] } }
  await history.run('crear', () => history.record(adapter, 'synthetic', null, value))
  for (let i = 0; i < 5; i++) { await history.undo(); await history.redo() }
  const oldReads = reads, oldWrites = writes
  assert.equal(await history.undo(), false)
  assert.equal(reads, oldReads); assert.equal(writes, oldWrites)
  clock.advance(60_001); history.refreshLimits()
  assert.equal(history.getSnapshot().canUndo, true)
  assert.equal(await history.undo(), true)
})
test('reconstruir l’Agenda després de desfer usa IndexedDB, sense consultes remotes extra', async () => {
  const history = createEditHistory({ budget: null })
  let queries = 0, cloudOperations = 0
  const uid = 'budget-synthetic-teacher'
  const entity = { id: 'budget-year', ownerUid: uid, entityType: 'academicYear', label: 'Curs fictici' }
  const repository = createPlanningRepository({ uid, history, isOnline: () => true, applyRemoteOperation: async () => { cloudOperations++; return { applied: true } } })
  await repository.save(entity)
  for (const operation of await loadPlanningOutbox(uid)) await acknowledgePlanningOperation(operation)
  await history.run('editar', () => repository.save({ ...entity, label: 'Modificat' }))
  assert.equal(await history.undo(), true)
  const remote = async () => { queries++; return [] }
  const local = await repository.loadScope('academicYears', remote, { refreshToken: 1, completeSnapshot: true })
  assert.equal(local.source, 'local'); assert.equal(queries, 0)
  assert.equal(local.entities[0].label, entity.label)
  assert.equal(cloudOperations, 1)
  repository.resumeRemoteReads()
  await repository.loadScope('academicYears', remote, { refreshToken: 2, completeSnapshot: true })
  assert.equal(queries, 1)
})
