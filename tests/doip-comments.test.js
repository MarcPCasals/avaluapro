import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import test from 'node:test'
import { createServer } from 'vite'
import 'fake-indexeddb/auto'

const preferences = new Map()
globalThis.localStorage = {
  getItem: key => preferences.get(key) || null,
  setItem: (key, value) => preferences.set(key, value),
  removeItem: key => preferences.delete(key),
}

let server
let store
let db

test.before(async () => {
  const blockedModules = new Set(['src/lib/firebase.js', 'src/data/cloud/planningFirestore.js'].map(path => resolve(path)))
  server = await createServer({
    configFile: false,
    envFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, hmr: false, ws: false },
    plugins: [{
      name: 'synthetic-doip-connectors',
      enforce: 'pre',
      resolveId(id) { if (id.startsWith('firebase/')) throw new Error('Firebase prohibit a la prova sintètica') },
      async load(id) {
        if (!blockedModules.has(id)) return null
        const source = await readFile(id, 'utf8')
        const exports = [...source.matchAll(/export\s+(?:async\s+)?(function|const)\s+(\w+)/g)]
        return exports.map(([, kind, name]) => kind === 'const'
          ? `export const ${name} = [];`
          : `export async function ${name}() { throw new Error('Connector remot prohibit: ${name}'); }`).join('\n')
      },
    }],
  })
  store = (await server.ssrLoadModule('/src/store/useAvaluaproStore.js')).useAvaluaproStore
  db = await server.ssrLoadModule('/src/db/indexedDb.js')
})

test.after(async () => {
  await server?.close()
  delete globalThis.localStorage
})

test('els comentaris posteriors es desen al DOIP sense modificar-ne el contingut original', async () => {
  store.setState({ tutorialRecords: [{ id: 'doip-fictici', classId: 'grup-fictici', studentId: 'alumne-fictici', type: 'doip', date: '2026-11-02', note: 'Contingut inicial' }] })

  assert.equal(await store.getState().addDoipComment('doip-fictici', '  Acord nou  '), true)
  assert.equal(await store.getState().addDoipComment('doip-fictici', 'Segona observació'), true)
  assert.equal(await store.getState().addDoipComment('inexistent', 'No s’ha de desar'), false)

  const record = store.getState().tutorialRecords[0]
  assert.equal(record.note, 'Contingut inicial')
  assert.deepEqual(record.doipComments.map(comment => comment.text), ['Acord nou', 'Segona observació'])
  assert.ok(record.doipComments.every(comment => comment.id && comment.createdAt))
  assert.deepEqual((await db.loadDataset()).tutorialRecords[0].doipComments, record.doipComments)
})
