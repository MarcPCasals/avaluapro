import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import 'fake-indexeddb/auto'

const preferences = new Map()
globalThis.localStorage = {
  getItem: (key) => preferences.get(key) || null,
  setItem: (key, value) => preferences.set(key, value),
  removeItem: (key) => preferences.delete(key),
}

let server
let store
let db

test.before(async () => {
  const blockedModules = new Set(['src/lib/firebase.js', 'src/data/cloud/planningFirestore.js'].map((path) => resolve(path)))
  server = await createServer({ configFile: false, envFile: false, optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, hmr: false, ws: false }, plugins: [{
      name: 'synthetic-planned-absence-connectors', enforce: 'pre',
      resolveId(id) { if (id.startsWith('firebase/')) throw new Error('Firebase prohibit a la prova sintètica') },
      async load(id) {
        if (!blockedModules.has(id)) return null
        const source = await readFile(id, 'utf8')
        return [...source.matchAll(/export\s+(?:async\s+)?(function|const)\s+(\w+)/g)]
          .map(([, kind, name]) => kind === 'const' ? `export const ${name} = [];`
            : `export async function ${name}() { throw new Error('Connector remot prohibit: ${name}'); }`).join('\n')
      },
    }] })
  store = (await server.ssrLoadModule('/src/store/useAvaluaproStore.js')).useAvaluaproStore
  db = await server.ssrLoadModule('/src/db/indexedDb.js')
})

test.after(async () => { await server?.close(); delete globalThis.localStorage })

test('cleanup waits for cloud startup and persists only active planned periods', async () => {
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
  const students = [{ id: 'synthetic-student', classId: 'synthetic-class', name: 'Prova, Alumna',
    plannedAbsences: [
      { id: 'expired', startsOn: yesterdayKey, endsOn: yesterdayKey },
      { id: 'active', startsOn: todayKey, endsOn: todayKey },
    ] }]
  const absenceRecords = [{ id: 'attendance', studentId: 'synthetic-student', classId: 'synthetic-class', date: yesterdayKey }]
  await db.resetDatabase()
  await db.saveCollections({ students, absenceRecords }, ['students', 'absenceRecords'])
  store.setState({ status: 'ready', students, absenceRecords,
    cloud: { ...store.getState().cloud, user: null, status: 'signed-out', startupComplete: false } })
  assert.equal(await store.getState().cleanupExpiredPlannedAbsences(), 0)
  assert.equal(store.getState().students[0].plannedAbsences.length, 2)
  store.setState({ cloud: { ...store.getState().cloud, startupComplete: true } })
  assert.equal(await store.getState().cleanupExpiredPlannedAbsences(), 1)
  assert.deepEqual((await db.loadDataset()).students[0].plannedAbsences.map((period) => period.id), ['active'])
  assert.deepEqual((await db.loadDataset()).absenceRecords, absenceRecords)
})
