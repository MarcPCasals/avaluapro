import assert from 'node:assert/strict'
import test from 'node:test'
import 'fake-indexeddb/auto'
import { createEditHistory, editHistory } from '../src/lib/editHistory.js'
import { createPlanningRepository } from '../src/data/planningRepository.js'
import { clearPlanningLocalData, loadPlanningOutbox, loadPlanningScope, mergePlanningRemoteScope, recordPlanningOperationConflict } from '../src/data/local/planningIndexedDb.js'

function memory(history) {
  const rows = new Map()
  const adapter = { id: 'memory', readMany: async changes => changes.map(change => rows.get(change.key) || null),
    writeMany: async (changes, side) => changes.forEach(change => { if (change[side]) rows.set(change.key, change[side]); else rows.delete(change.key) }) }
  return { rows, save(key, value) { const before = rows.get(key); rows.set(key, value); history.record(adapter, key, before, value) } }
}
test('agrupa documents, múltiples edicions i conserva canvis aliens en desfer/refer', async () => {
  const history = createEditHistory(), data = memory(history)
  await history.run('reprogramar', async () => { data.save('a', { id: 'a', time: 1 }); data.save('a', { id: 'a', time: 2 }); data.save('b', { id: 'b', time: 3 }) })
  data.rows.set('other', { id: 'other' })
  assert.equal(history.getSnapshot().canUndo, true)
  await history.undo()
  assert.equal(data.rows.size, 1)
  await history.redo()
  assert.equal(data.rows.get('a').time, 2)
  assert.equal(data.rows.get('b').time, 3)
  await history.undo()
  await history.run('nou', () => data.save('new', { id: 'new' }))
  assert.equal(history.getSnapshot().canRedo, false)
})
test('bloqueja sobreescriptures i no aplica cap document si un altre ha canviat', async () => {
  const history = createEditHistory(), data = memory(history)
  await history.run('canvi', () => { data.save('a', { id: 'a' }); data.save('b', { id: 'b' }) })
  data.rows.set('b', { id: 'b', external: true })
  assert.equal(await history.undo(), false)
  assert.ok(data.rows.has('a'))
  assert.match(history.getSnapshot().error, /han canviat/)
})
test('limita a 50 operacions i buida l’historial en canvi de compte', async () => {
  const history = createEditHistory(), data = memory(history)
  for (let i = 0; i < 55; i++) await history.run('canvi', () => data.save(String(i), { id: String(i) }))
  for (let i = 0; i < 50; i++) assert.equal(await history.undo(), true)
  assert.equal(history.getSnapshot().canUndo, false)
  let finish
  const pending = history.run('pendent', () => new Promise(resolve => { finish = resolve }))
  history.clear(); data.save('private', { id: 'private' }); finish(); await pending
  assert.equal(history.getSnapshot().canUndo, false)
})
test('una acció sense efectes no elimina el refer, i no es pot desfer mentre es desa', async () => {
  const history = createEditHistory(), data = memory(history)
  await history.run('canvi', () => data.save('a', { id: 'a' })); await history.undo()
  await history.run('sense canvi', () => {})
  assert.equal(history.getSnapshot().canRedo, true)
  await history.run('lent', async () => { assert.equal(await history.redo(), false) })
})

const uid = 'synthetic-history-teacher'
const phase = { id: 'phase', entityType: 'planningPhase', planningUnitId: 'up', ownerUid: uid, title: 'Fase' }
const activity = { id: 'activity', entityType: 'planningActivity', planningUnitId: 'up', phaseId: 'phase', ownerUid: uid, title: 'Activitat' }
const session = { id: 'session', entityType: 'calendarSession', planningUnitId: 'up', applicationId: 'group', classId: 'class', ownerUid: uid, startsAt: '2026-10-10T10:00:00' }
const item = { id: 'part', entityType: 'sessionItem', sessionId: 'session', applicationId: 'group', planningUnitId: 'up', ownerUid: uid, activityId: 'activity', plannedMinutes: 55 }
test.beforeEach(async () => { editHistory.clear(); await clearPlanningLocalData(uid, { discardPending: true }) })
test('recupera una eliminació de fase i tota la cronologia local amb rutes i cua correctes', async () => {
  const repository = createPlanningRepository({ uid, isOnline: () => false })
  for (const entity of [phase, activity, session, item]) await repository.save(entity)
  await editHistory.run('eliminar i redistribuir', async () => {
    await repository.remove(activity); await repository.remove(phase)
    await repository.save({ ...session, startsAt: '2026-10-12T10:00:00' }); await repository.remove(item)
  })
  assert.equal(await editHistory.undo(), true)
  assert.equal((await loadPlanningScope(uid, 'planningUnit:up:structure')).length, 2)
  assert.equal((await loadPlanningScope(uid, 'session:session:detail'))[0].plannedMinutes, 55)
  assert.equal((await loadPlanningScope(uid, 'application:group:sessions'))[0].startsAt, session.startsAt)
  const operations = await loadPlanningOutbox(uid)
  assert.equal(operations.length, 4)
  assert.ok(operations.every(operation => operation.operation === 'upsert' && operation.revision))
  assert.equal(await editHistory.redo(), true)
  assert.equal((await loadPlanningScope(uid, 'planningUnit:up:structure')).length, 0)
  assert.equal((await loadPlanningOutbox(uid)).filter(operation => operation.operation === 'delete').length, 3)
  assert.equal(await editHistory.undo(), true)
})
test('desfer una creació genera baixes, refer torna a guardar i un canvi remot bloqueja l’historial', async () => {
  const repository = createPlanningRepository({ uid, isOnline: () => false })
  await editHistory.run('crear', async () => { await repository.save(phase); await repository.save(activity) })
  await editHistory.undo()
  assert.ok((await loadPlanningOutbox(uid)).every(operation => operation.operation === 'delete'))
  await editHistory.redo()
  // Simula un canvi posterior fora de la nostra acció.
  await repository.save({ ...activity, title: 'Edició externa' })
  assert.equal(await editHistory.undo(), false)
  assert.equal((await loadPlanningScope(uid, 'planningUnit:up:structure')).length, 2)
})
test('un conflicte remot bloqueja tota la restauració local sense canviar els altres documents', async () => {
  const repository = createPlanningRepository({ uid, isOnline: () => false })
  await editHistory.run('crear', async () => { await repository.save(phase); await repository.save(activity) })
  const operations = await loadPlanningOutbox(uid)
  await recordPlanningOperationConflict(operations.find(op => op.value?.id === activity.id), { ...activity, title: 'Altre docent' }, '2026-10-11T10:00:00Z')
  assert.equal(await editHistory.undo(), false)
  assert.equal((await loadPlanningScope(uid, 'planningUnit:up:structure')).length, 2)
})
test('una entitat ja sincronitzada manté la revisió remota com a base del canvi invers', async () => {
  const repository = createPlanningRepository({ uid, isOnline: () => false })
  await mergePlanningRemoteScope(uid, 'planningUnit:up:structure', [{ entity: { ...activity, updatedAt: '2026-10-09T10:00:00Z' } }])
  await editHistory.run('editar', () => repository.save({ ...activity, title: 'Nova' }))
  assert.equal(await editHistory.undo(), true)
  assert.equal((await loadPlanningOutbox(uid))[0].baseUpdatedAt, '2026-10-09T10:00:00Z')
})

test('un error de desament conserva l’acció i compensa altres blocs ja restaurats', async () => {
  const history = createEditHistory(), data = memory(history)
  let value = { id: 'second' }
  let fail = true
  const adapter = { id: 'failing', readMany: async () => [value], writeMany: async (changes, side) => {
    if (fail) throw new Error('Sense espai')
    value = changes[0][side]
  } }
  await history.run('dos blocs', () => { data.save('a', { id: 'a' }); history.record(adapter, 'second', null, value) })
  assert.equal(await history.undo(), false)
  assert.ok(data.rows.has('a'))
  assert.equal(history.getSnapshot().canUndo, true)
  assert.match(history.getSnapshot().error, /Sense espai/)
  fail = false
  assert.equal(await history.undo(), true)
  assert.equal(data.rows.size, 0)
  assert.equal(value, null)
})
