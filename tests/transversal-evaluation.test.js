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

test('els comentaris es desen sense qualificar i només les orientacions reapareixen a les UT posteriors', async () => {
  setup()
  const studentId = 'synthetic-student'
  const criterion = { id: 'specific-criterion', name: 'CA1: Rigor', competencyId: 'specific', selectedActionIds: ['R1', 'R2'] }
  const laterCompetency = { id: 'later', utId: 'ut-a2', name: 'C1: Modelitzar' }
  const laterCriterion = { ...criterion, id: 'later-criterion', competencyId: 'later' }
  store.setState(current => ({
    students: [{ id: studentId, classId: 'class-a' }],
    competencies: [...current.competencies, laterCompetency],
    criteria: [criterion, laterCriterion],
  }))
  const action = { id: 'R1', description: 'Acció fictícia 1' }
  const { updateActionNote, updateActionGrades } = store.getState()
  await updateActionNote(studentId, criterion.id, action, { text: ' Practicar una altra representació. ', orientation: true })
  assert.equal(store.getState().marks[0].value, '')
  await updateActionGrades(studentId, criterion.id, { R1: 'B' })
  await updateActionNote(studentId, criterion.id, { id: 'R2', description: 'Acció fictícia 2' }, { text: 'Justificació fictícia.', orientation: false })
  const saved = (await db.loadDataset()).marks.find(mark => mark.criterionId === criterion.id)
  assert.equal(saved.value, 'B')
  assert.equal(saved.actionNotes.R1.text, 'Practicar una altra representació.')
  assert.deepEqual(saved.actionGrades, { R1: 'B' })
  const { listStudentActionNotes, getPreviousActionOrientations } = await import('../src/lib/actionNotes.js')
  const context = store.getState()
  assert.equal(listStudentActionNotes(context, studentId).length, 2)
  assert.deepEqual(getPreviousActionOrientations(context, studentId, laterCompetency, laterCriterion, 'ut-a2').map(note => note.actionId), ['R1'])
  assert.deepEqual(getPreviousActionOrientations(context, 'other-student', laterCompetency, laterCriterion, 'ut-a2'), [])
  assert.deepEqual(getPreviousActionOrientations(context, studentId, laterCompetency, laterCriterion, 'ut-a1'), [])
  assert.deepEqual(getPreviousActionOrientations(context, studentId, laterCompetency, laterCriterion, 'ut-b1'), [])
  await updateActionNote(studentId, criterion.id, action, { text: '', orientation: false })
  assert.equal(store.getState().marks[0].actionNotes.R1, undefined)
  assert.equal(store.getState().marks[0].value, 'B')
})

test('els comentaris es poden desfer i sobreviuen a canvis manuals i a una còpia de seguretat sintètica', async () => {
  setup()
  const studentId = 'synthetic-student'
  store.setState({ students: [{ id: studentId, classId: 'class-a', name: 'Alumne fictici' }],
    criteria: [{ id: 'specific-criterion', name: 'CA1: Rigor', competencyId: 'specific', selectedActionIds: ['R1'] }],
  })
  const action = { id: 'R1', description: 'Acció fictícia' }
  await store.getState().updateActionNote(studentId, 'specific-criterion', action, { text: 'Orientació fictícia.', orientation: true })
  assert.equal(await history.undo(), true)
  assert.equal(store.getState().marks.length, 0)
  assert.equal(await history.redo(), true)
  assert.equal(store.getState().marks[0].actionNotes.R1.text, 'Orientació fictícia.')
  await assert.rejects(store.getState().updateActionNote('missing', 'specific-criterion', action, { text: 'Prova' }))
  await assert.rejects(store.getState().updateActionNote(studentId, 'specific-criterion', { id: 'wrong' }, { text: 'Prova' }))
  store.setState(current => ({ criteria: current.criteria.map(item => ({ ...item, selectedActionIds: [] })) }))
  await store.getState().updateMark(studentId, 'specific-criterion', '')
  await store.getState().updateMarksBulk([{ studentId, criterionId: 'specific-criterion', value: 'A' }])
  assert.equal(store.getState().marks[0].actionNotes.R1.text, 'Orientació fictícia.')
  const backup = store.getState().createBackup()
  await store.getState().restoreBackup(backup)
  const restored = store.getState().marks.find(mark => mark.studentId === studentId)
  assert.equal(restored.actionNotes.R1.orientation, true)
  assert.equal(restored.value, 'A')
})
