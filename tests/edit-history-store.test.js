import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import 'fake-indexeddb/auto'

// El mòdul real es carrega amb IndexedDB fictici i connectors remots substituïts.
// Cap import del SDK Firebase, credencial o lectura de xarxa està permès aquí.
const preferences = new Map()
globalThis.localStorage = { getItem: key => preferences.get(key) || null, setItem: (key, value) => preferences.set(key, value), removeItem: key => preferences.delete(key) }
let server, store, history, db

test.before(async () => {
  const blockedModules = new Set(['src/lib/firebase.js', 'src/data/cloud/planningFirestore.js'].map(path => resolve(path)))
  server = await createServer({ configFile: false, envFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null }, plugins: [{
    name: 'synthetic-history-connectors', enforce: 'pre',
    resolveId(id) { if (id.startsWith('firebase/')) throw new Error('Firebase prohibit a la prova sintètica') },
    async load(id) {
      if (!blockedModules.has(id)) return null
      const source = await readFile(id, 'utf8')
      const exports = [...source.matchAll(/export\s+(?:async\s+)?(function|const)\s+(\w+)/g)]
      return exports.map(([, kind, name]) => kind === 'const' ? `export const ${name} = [];` : `export async function ${name}() { throw new Error('Connector remot prohibit: ${name}'); }`).join('\n')
    },
  }] })
  store = (await server.ssrLoadModule('/src/store/useAvaluaproStore.js')).useAvaluaproStore
  history = (await server.ssrLoadModule('/src/lib/editHistory.js')).editHistory
  db = await server.ssrLoadModule('/src/db/indexedDb.js')
})
test.after(async () => { await server?.close(); delete globalThis.localStorage })

test('una qualificació es desfà i refà al magatzem real i a IndexedDB fictici', async () => {
  store.setState({ marks: [] }); history.clear()
  await store.getState().updateMark('synthetic-student', 'synthetic-criterion', 'B')
  assert.equal(store.getState().marks[0].value, 'B')
  assert.equal(history.getSnapshot().canUndo, true)
  await history.undo()
  assert.equal(store.getState().marks.length, 0)
  assert.equal((await db.loadDataset()).marks.length, 0)
  await history.redo()
  assert.equal(store.getState().marks[0].value, 'B')
  assert.equal((await db.loadDataset()).marks[0].value, 'B')
})
test('crear un grup i la seva estructura es recupera com un sol bloc', async () => {
  history.clear()
  await store.getState().addClass({ name: 'Grup fictici', subject: 'Ciències' })
  const created = store.getState().classes[0]
  const utCount = store.getState().uts.filter(row => row.classId === created.id).length
  assert.ok(utCount > 0)
  await history.undo()
  assert.equal(store.getState().classes.length, 0)
  assert.equal(store.getState().ui.activeClassId, '')
  assert.equal(store.getState().uts.filter(row => row.classId === created.id).length, 0)
  await history.redo()
  assert.equal(store.getState().classes[0].name, 'Grup fictici')
  assert.equal(store.getState().uts.filter(row => row.classId === created.id).length, utCount)
})
test('un canvi extern de la qualificació bloqueja la restauració i conserva el valor nou', async () => {
  history.clear()
  await store.getState().updateMark('synthetic-student', 'synthetic-criterion', 'A')
  store.setState({ marks: store.getState().marks.map(row => ({ ...row, value: 'D' })) })
  assert.equal(await history.undo(), false)
  assert.equal(store.getState().marks[0].value, 'D')
})
test('la cotutoria compartida deixa l’historial buit en lloc de prometre una inversió local', async () => {
  const classId = store.getState().classes[0].id
  store.setState({ classes: store.getState().classes.map(row => ({ ...row, sharedTutoringSpaceId: 'synthetic-space' })), students: [{ id: 'synthetic-student', classId, name: 'Fictici' }] })
  history.clear()
  await store.getState().updateStudent('synthetic-student', { name: 'Fictici modificat' })
  assert.equal(history.getSnapshot().canUndo, false)
})


test('modificar una disposició conserva la versió i persisteix els llocs i l’activació', async () => {
  store.setState({ classes: [{ id: 'synthetic-class' }], tutorialSeatingPlans: [] })
  const original = await store.getState().saveTutorialSeatingPlan({
    classId: 'synthetic-class', isActive: true, title: 'Original',
    contentUpdatedAt: '2025-01-01T00:00:00.000Z',
    layout: { rows: 2 }, seats: [{ studentId: 'synthetic-student', x: 0, y: 0 }],
  })
  await store.getState().updateTutorialSeatingPlan(original.id, {
    title: 'Modificada', layout: { rows: 3 }, seats: [{ studentId: 'synthetic-student', x: 2, y: 1 }],
  })
  const rows = store.getState().tutorialSeatingPlans
  assert.equal(rows.length, 1)
  assert.equal(rows[0].id, original.id)
  assert.equal(rows[0].createdAt, original.createdAt)
  assert.equal(rows[0].isActive, true)
  assert.notEqual(rows[0].contentUpdatedAt, original.contentUpdatedAt)
  assert.equal(rows[0].seats[0].x, 2)
  assert.deepEqual((await db.loadDataset()).tutorialSeatingPlans, rows)
})

test('crear una versió conserva l’anterior i només canvia l’activa si es demana', async () => {
  const original = store.getState().tutorialSeatingPlans[0]
  const copy = await store.getState().saveTutorialSeatingPlan({
    ...original, title: 'Nova versió', isActive: false,
    seats: [{ studentId: 'synthetic-student', x: 1, y: 2 }],
  })
  assert.notEqual(copy.id, original.id)
  assert.equal(store.getState().tutorialSeatingPlans.length, 2)
  assert.deepEqual(store.getState().tutorialSeatingPlans.find(row => row.id === original.id), original)
  const contentUpdatedAt = copy.contentUpdatedAt
  await store.getState().updateTutorialSeatingPlan(copy.id, { isActive: true })
  assert.equal(store.getState().tutorialSeatingPlans.filter(row => row.isActive).length, 1)
  assert.equal(store.getState().tutorialSeatingPlans.find(row => row.isActive).id, copy.id)
  assert.equal(store.getState().tutorialSeatingPlans.find(row => row.id === copy.id).contentUpdatedAt, contentUpdatedAt)
  const byId = rows => [...rows].sort((a, b) => a.id.localeCompare(b.id))
  assert.deepEqual(byId((await db.loadDataset()).tutorialSeatingPlans), byId(store.getState().tutorialSeatingPlans))
})
