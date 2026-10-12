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
let server, store, history, db, evaluation

test.before(async () => {
  const blockedModules = new Set(['src/lib/firebase.js', 'src/data/cloud/planningFirestore.js'].map(path => resolve(path)))
  server = await createServer({ configFile: false, envFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null, hmr: false }, plugins: [{
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
  evaluation = await server.ssrLoadModule('/src/lib/studentEvaluation.js')
})
test.after(async () => { await server?.close(); delete globalThis.localStorage })


const templates = ['TRANS C1: Emprendre projectes per millorar l’entorn', "TRANS C2: Gestionar el propi aprenentatge considerant l'entorn i els recursos disponibles"]
function setup() {
  store.setState({ classes: [{ id: 'class-a', subject: 'Ciències Físiques i de la Natura' }, { id: 'class-b', subject: 'Català' }],
    semesters: [], uts: [{ id: 'ut-a1', classId: 'class-a', name: 'UT1', order: 1 }, { id: 'ut-a2', classId: 'class-a', name: 'UT2', order: 2 }, { id: 'ut-b1', classId: 'class-b', name: 'UT1', order: 1 }],
    competencies: [{ id: 'specific', utId: 'ut-a1', name: 'C1: Modelització', order: 1 }],
    criteria: [{ id: 'specific-criterion', competencyId: 'specific', order: 1 }], marks: [],
    cloud: { ...store.getState().cloud, user: null }, onboarding: { demoMode: true } })
  history.clear()
}
test('selecció per classe, notes per UT, persistència i desactivació sense pèrdua', async () => {
  setup()
  await store.getState().setClassTransversalCompetencies('class-a', [templates[0]])
  const first = store.getState().competencies.find(item => item.utId === 'ut-a1' && item.kind === 'transversal')
  const second = store.getState().competencies.find(item => item.utId === 'ut-a2' && item.kind === 'transversal')
  assert.ok(first && second)
  assert.notEqual(first.id, second.id)
  assert.equal(store.getState().competencies.filter(item => item.utId === 'ut-b1').length, 0)
  const criterion = store.getState().criteria.find(item => item.competencyId === first.id)
  await store.getState().updateMark('synthetic-student', criterion.id, 'A')
  await store.getState().setClassTransversalCompetencies('class-a', [])
  await store.getState().setClassTransversalCompetencies('class-a', [templates[0]])
  assert.equal(store.getState().marks[0].value, 'A')
  assert.equal(store.getState().competencies.filter(item => item.kind === 'transversal').length, 2)
  const saved = await db.loadDataset()
  assert.deepEqual(saved.classes.find(item => item.id === 'class-a').transversalCompetencyNames, [templates[0]])
  assert.equal(saved.marks[0].value, 'A')
  assert.deepEqual(evaluation.getUtCompetencies(store.getState(), 'ut-a1').map(item => item.id), ['specific'])
  assert.equal(evaluation.getStudentUtGrade(store.getState(), 'synthetic-student', 'ut-a1').grade, '')
})
test('activar i desfer recupera conjuntament la selecció i estructura', async () => {
  setup()
  await store.getState().setClassTransversalCompetencies('class-a', templates)
  assert.equal(store.getState().criteria.length, 11)
  assert.equal(await history.undo(), true, JSON.stringify(history.getSnapshot()))
  assert.equal(store.getState().competencies.length, 1)
  assert.equal(store.getState().classes[0].transversalCompetencyNames, undefined)
  await history.redo()
  assert.deepEqual(store.getState().classes[0].transversalCompetencyNames, templates)
})
test('PI i SG reutilitzen els criteris, rúbriques i notes existents', async () => {
  for (const subject of ['Projecte Integrador', 'Situació Global']) {
    setup()
    store.setState({ classes: [{ id: 'class-a', subject }], competencies: [{ id: 'native', utId: 'ut-a1', name: templates[0] }],
      criteria: [{ id: 'native-criterion', competencyId: 'native', rubric: { A: 'Descriptor fictici' } }],
      marks: [{ id: 'native-mark', studentId: 'synthetic-student', criterionId: 'native-criterion', value: 'B' }] })
    await store.getState().setClassTransversalCompetencies('class-a', [templates[0]])
    assert.equal(store.getState().competencies.filter(item => item.utId === 'ut-a1').length, 1)
    assert.equal(store.getState().criteria.find(item => item.id === 'native-criterion').rubric.A, 'Descriptor fictici')
    assert.equal(store.getState().marks[0].value, 'B')
  }
})
test('una nova UT hereta la selecció i preparar-la dues vegades no duplica registres', async () => {
  setup()
  await store.getState().setClassTransversalCompetencies('class-a', [templates[0], 'desconeguda'])
  store.setState({ uts: [...store.getState().uts, { id: 'ut-new', classId: 'class-a' }] })
  await store.getState().setClassTransversalCompetencies('class-a', [templates[0]])
  const count = store.getState().competencies.length
  await store.getState().setClassTransversalCompetencies('class-a', [templates[0]])
  assert.equal(store.getState().competencies.length, count)
  assert.equal(store.getState().competencies.filter(item => item.utId === 'ut-new').length, 1)
})
