import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import 'fake-indexeddb/auto'

const blockedModules = new Set(['src/lib/firebase.js', 'src/data/cloud/planningFirestore.js'].map((path) => resolve(path)))
let server

test.before(async () => {
  server = await createServer({
    configFile: false,
    envFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, hmr: false, ws: false },
    plugins: [{
      name: 'synthetic-cooperative-connectors',
      enforce: 'pre',
      resolveId(id) { if (id.startsWith('firebase/')) throw new Error('Firebase prohibit') },
      async load(id) {
        if (!blockedModules.has(id)) return null
        const source = await readFile(id, 'utf8')
        return [...source.matchAll(/export\s+(?:async\s+)?(function|const)\s+(\w+)/g)]
          .map(([, kind, name]) => kind === 'const'
            ? `export const ${name} = [];`
            : `export async function ${name}() { throw new Error('Connector remot prohibit'); }`)
          .join('\n')
      },
    }],
  })
})

test.after(async () => { await server?.close() })

test('el rol dels grups vigents es guarda sense canviar la composició ni la data de creació', async () => {
  const store = (await server.ssrLoadModule('/src/store/useAvaluaproStore.js')).useAvaluaproStore
  const db = await server.ssrLoadModule('/src/db/indexedDb.js')
  const current = {
    id: 'groups-current',
    classId: 'class-synthetic',
    createdAt: '2026-11-27T09:00:00Z',
    updatedAt: '2026-11-27T09:00:00Z',
    groups: [{ id: 'group-1', memberIds: ['student-1', 'student-2'], memberRoles: {} }],
  }
  store.setState({ tutorialGroupSets: [current] })
  await store.getState().updateTutorialGroupMemberRole({
    groupSetId: current.id, studentId: 'student-1', role: 'Coordinador',
  })
  let saved = (await db.loadDataset()).tutorialGroupSets.find((item) => item.id === current.id)
  assert.deepEqual(saved.groups[0].memberIds, ['student-1', 'student-2'])
  assert.equal(saved.groups[0].memberRoles['student-1'], 'Coordinador')
  assert.equal(saved.createdAt, current.createdAt)

  await store.getState().updateTutorialGroupMemberRole({
    groupSetId: current.id, studentId: 'student-1', role: '',
  })
  saved = (await db.loadDataset()).tutorialGroupSets.find((item) => item.id === current.id)
  assert.deepEqual(saved.groups[0].memberRoles, {})
  assert.deepEqual(saved.groups[0].memberIds, ['student-1', 'student-2'])
})
