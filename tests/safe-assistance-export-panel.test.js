import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  buildSafeAssistanceExportSource,
  prepareSafeAssistanceExport,
} from '../src/features/data/safeAssistanceExport.js'
import { validateSafeAssistancePackage } from '../src/data/adapters/safeAssistancePackage.js'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function createDeterministicRandom() {
  let counter = 0
  return {
    randomUUID() {
      counter += 1
      return `00000000-0000-4000-8000-${counter.toString(16).padStart(12, '0')}`
    },
    randomNumber: () => 0.42,
  }
}

function createStateWithSentinels() {
  return {
    classes: [{
      id: 'real-class-id',
      name: 'Nom de classe sentinella',
      subject: 'Matèria sentinella',
      isTutoringGroup: true,
    }],
    students: Array.from({ length: 17 }, (_, index) => ({
      id: `real-student-${index}`,
      classId: 'real-class-id',
      name: `Nom privat ${index}`,
      email: `privat${index}@example.org`,
      diagnoses: ['diagnosi-sentinella'],
      personalNotes: 'observació sentinella',
      photoUrl: 'data:image/png;base64,SENTINELLA',
    })),
    competencies: [{ id: 'real-competency', name: 'Competència sentinella' }],
    criteria: [{ id: 'real-criterion', competencyId: 'real-competency', name: 'Criteri sentinella' }],
    tasks: [{ id: 'real-task', classId: 'real-class-id', title: 'Tasca sentinella', date: '2026-09-27' }],
    marks: [{ studentId: 'real-student-0', value: 'A' }],
    absenceRecords: [{ studentId: 'real-student-0', date: '2026-09-27' }],
    tutorialRelations: [{ sourceStudentId: 'real-student-0', targetStudentId: 'real-student-1' }],
    cloud: { user: { email: 'docent@example.org', uid: 'real-owner-uid' } },
  }
}

test('la font mínima exclou noms, diagnòstics, notes, fotos, compte i resultats reals', () => {
  const source = buildSafeAssistanceExportSource(createStateWithSentinels())
  const serialized = JSON.stringify(source)

  assert.deepEqual(Object.keys(source).sort(), [
    'classes',
    'evaluationCompetencies',
    'students',
    'trackingTasks',
  ])
  for (const forbidden of [
    'Nom de classe', 'Matèria sentinella', 'Nom privat', 'example.org', 'diagnosi-sentinella',
    'observació sentinella', 'data:image', 'Competència sentinella', 'Criteri sentinella',
    'Tasca sentinella', '2026-09-27', 'real-owner-uid', 'marks', 'tutorialRelations',
  ]) {
    assert.doesNotMatch(serialized, new RegExp(forbidden))
  }
})

test('la preparació local produeix un paquet validat i només retorna recomptes impersonals', () => {
  const prepared = prepareSafeAssistanceExport(createStateWithSentinels(), createDeterministicRandom())

  assert.equal(validateSafeAssistancePackage(prepared.package).ok, true)
  assert.equal(prepared.summary.students, 18)
  assert.deepEqual(Object.keys(prepared).sort(), ['package', 'summary'])
  assert.doesNotMatch(JSON.stringify(prepared), /Nom privat|example\.org|sentinella|real-owner-uid/i)
})

test('la pantalla exigeix la frase exacta, revalida abans de descarregar i elimina la còpia temporal', async () => {
  const panel = await readFile(
    path.join(projectRoot, 'src/features/data/SafeAssistanceExportPanel.jsx'),
    'utf8',
  )

  assert.match(panel, /EXPORTAR PAQUET SEGUR/)
  assert.match(panel, /confirmation === SAFE_EXPORT_CONFIRMATION/)
  assert.match(panel, /validateSafeAssistancePackage\(preparedExport\.package\)/)
  assert.ok(
    panel.indexOf('validateSafeAssistancePackage(preparedExport.package)') <
      panel.indexOf('downloadJson(preparedExport.package'),
  )
  assert.match(panel, /setPreparedExport\(null\)/)
  assert.match(panel, /avaluapro-paquet-segur-v1\.json/)
  assert.doesNotMatch(panel, /localStorage|sessionStorage|indexedDB|firebase|useAvaluaproStore/i)
})

test('el resum visual només conté les vuit categories de recompte aprovades', async () => {
  const panel = await readFile(
    path.join(projectRoot, 'src/features/data/SafeAssistanceExportPanel.jsx'),
    'utf8',
  )
  const expectedLabels = [
    'Absències regenerades',
    'Grups ficticis',
    'Competències numerades',
    'Qualificacions regenerades',
    'Relacions regenerades',
    'Alumnes ficticis',
    'Registres regenerats',
    'Tasques numerades',
  ]

  expectedLabels.forEach((label) => assert.match(panel, new RegExp(label)))
  assert.doesNotMatch(panel, /displayName|student\.name|diagnos|personalNotes|email|photo/i)
})

test('la pantalla queda integrada a Còpies i estat sense substituir els fluxos existents', async () => {
  const dataSafetyModal = await readFile(
    path.join(projectRoot, 'src/features/data/DataSafetyModal.jsx'),
    'utf8',
  )

  assert.match(dataSafetyModal, /SafeAssistanceExportPanel/)
  assert.match(dataSafetyModal, /<SafeAssistanceExportPanel state=\{state\} \/>/)
  assert.match(dataSafetyModal, /handleDownloadBackup/)
  assert.match(dataSafetyModal, /handleRestoreFile/)
})

test('l’entorn aïllat permet provar la pantalla només amb el conjunt sintètic', async () => {
  const assistanceApp = await readFile(
    path.join(projectRoot, 'assistencia/src/AssistanceApp.jsx'),
    'utf8',
  )

  assert.match(assistanceApp, /SafeAssistanceExportPanel/)
  assert.match(assistanceApp, /activeSurface === 'safe-package'/)
  assert.match(assistanceApp, /state=\{safeExportDemoState\}/)
  assert.match(assistanceApp, /classes: dataset\.classes/)
  assert.match(assistanceApp, /students: dataset\.students/)
  assert.doesNotMatch(
    assistanceApp,
    /^import .*?(useAvaluaproStore|firebase|indexedDB|localStorage).*$/gim,
  )
})
