import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createMemoryDataAdapter } from '../src/data/adapters/createMemoryDataAdapter.js'
import { generateSafeAssistancePackage } from '../src/data/adapters/generateSafeAssistancePackage.js'
import {
  MAX_SAFE_ASSISTANCE_PACKAGE_BYTES,
  buildAssistanceDatasetFromSafePackage,
  parseSafeAssistancePackageText,
} from '../src/data/adapters/importSafeAssistancePackage.js'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function createDeterministicRandom() {
  let counter = 0
  return {
    randomUUID() {
      counter += 1
      return `10000000-0000-4000-8000-${counter.toString(16).padStart(12, '0')}`
    },
    randomNumber: () => 0.42,
  }
}

function createSafePackage() {
  return generateSafeAssistancePackage({
    classes: [{ id: 'source-class', isTutoringGroup: true }],
    students: Array.from({ length: 17 }, (_, index) => ({ id: `source-student-${index}`, classId: 'source-class' })),
    evaluationCompetencies: [{ id: 'source-competency', criteria: [{ id: 'source-criterion' }] }],
    trackingTasks: [{ id: 'source-task', classId: 'source-class' }],
  }, createDeterministicRandom()).package
}

function createBuiltInDataset() {
  return {
    metadata: { label: 'Conjunt integrat' },
    classes: [{ id: 'built-in-class', name: 'Grup fictici' }],
    students: [],
    evaluationCompetencies: [],
    evaluationMarks: [],
    trackingTasks: [],
    trackingRecords: [],
    absenceRecords: [],
    sociometricRelations: [],
  }
}

test('analitza un paquet vàlid i només retorna una còpia i els recomptes', () => {
  const safePackage = createSafePackage()
  const parsed = parseSafeAssistancePackageText(JSON.stringify(safePackage))

  assert.deepEqual(Object.keys(parsed).sort(), ['package', 'summary'])
  assert.equal(parsed.summary.classes, 1)
  assert.equal(parsed.summary.students, 18)
  assert.notEqual(parsed.package, safePackage)
})

test('rebutja JSON invàlid, camps desconeguts i mida excessiva sense revelar contingut', () => {
  const sentinel = 'NOM-PRIVAT-SENTINELLA'
  const invalidPackage = { ...createSafePackage(), forbidden: sentinel }

  for (const input of [
    `{ "private": "${sentinel}"`,
    JSON.stringify(invalidPackage),
    'x'.repeat(MAX_SAFE_ASSISTANCE_PACKAGE_BYTES + 1),
  ]) {
    assert.throws(
      () => parseSafeAssistancePackageText(input),
      (error) => !String(error.message).includes(sentinel),
    )
  }
})

test('transforma el paquet validat en un conjunt sintètic compatible i sense persistència', () => {
  const dataset = buildAssistanceDatasetFromSafePackage(createSafePackage())

  assert.equal(dataset.metadata.label, 'Paquet segur carregat')
  assert.equal(dataset.metadata.containsRealData, false)
  assert.equal(dataset.metadata.persistent, false)
  assert.equal(dataset.students.length, 18)
  assert.equal(dataset.students[0].personalNotes, '')
  assert.deepEqual(dataset.students[0].diagnoses, [])
  assert.match(dataset.trackingTasks[0].date, /^2032-/)
  assert.doesNotMatch(JSON.stringify(dataset), /source-class|source-student|source-task/)
})

test('torna a validar abans de transformar i rebutja un paquet alterat', () => {
  const safePackage = createSafePackage()
  safePackage.students[0].displayName = 'Nom privat'

  assert.throws(() => buildAssistanceDatasetFromSafePackage(safePackage))
})

test('l’adaptador només carrega el paquet validat en memòria i pot tornar al conjunt integrat', () => {
  const adapter = createMemoryDataAdapter(createBuiltInDataset())
  const loaded = adapter.loadSafePackage(createSafePackage())

  assert.equal(loaded.metadata.label, 'Paquet segur carregat')
  assert.equal(loaded.classes.length, 1)
  assert.equal(loaded.students.length, 18)
  assert.equal(loaded.pendingChangeCount, 1)
  assert.equal(loaded.dirty, true)

  const restored = adapter.reset()
  assert.equal(restored.metadata.label, 'Conjunt integrat')
  assert.equal(restored.classes[0].id, 'built-in-class')
})

test('la pantalla exigeix dues fases, no mostra el nom del fitxer i no usa persistència', async () => {
  const panel = await readFile(
    path.join(projectRoot, 'assistencia/src/SafeAssistancePackageImportPanel.jsx'),
    'utf8',
  )

  assert.match(panel, /CARREGAR PAQUET SEGUR/)
  assert.match(panel, /parseSafeAssistancePackageText\(await file\.text\(\)\)/)
  assert.match(panel, /confirmation === SAFE_IMPORT_CONFIRMATION/)
  assert.match(panel, /onLoadPackage\(preparedImport\.package\)/)
  assert.match(panel, /MAX_SAFE_ASSISTANCE_PACKAGE_BYTES/)
  assert.doesNotMatch(panel, /file\.name|localStorage|sessionStorage|indexedDB|firebase|useAvaluaproStore/i)
})

test('la importació només està connectada a l’aplicació d’assistència', async () => {
  const [assistanceApp, dataSafetyModal] = await Promise.all([
    readFile(path.join(projectRoot, 'assistencia/src/AssistanceApp.jsx'), 'utf8'),
    readFile(path.join(projectRoot, 'src/features/data/DataSafetyModal.jsx'), 'utf8'),
  ])

  assert.match(assistanceApp, /SafeAssistancePackageImportPanel/)
  assert.match(assistanceApp, /assistanceAdapter\.loadSafePackage\(candidate\)/)
  assert.match(assistanceApp, /student\.totalTasks > 0/)
  assert.doesNotMatch(dataSafetyModal, /SafeAssistancePackageImportPanel|loadSafePackage/)
})
