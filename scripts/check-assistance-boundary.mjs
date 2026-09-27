import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputRoot = path.join(projectRoot, 'dist-assistance')
const assistanceSourceRoot = path.join(projectRoot, 'assistencia')
const runtimeBoundaryPath = path.join(assistanceSourceRoot, 'src/secureRuntime.js')
const pureComponentPaths = [
  path.join(projectRoot, 'src/features/students/StudentOverviewTable.jsx'),
  path.join(projectRoot, 'src/features/evaluation/EvaluationTable.jsx'),
  path.join(projectRoot, 'src/features/tracking/TrackingTable.jsx'),
  path.join(projectRoot, 'src/features/attendance/AbsenceControl.jsx'),
  path.join(projectRoot, 'src/features/analytics/CrossAnalysisTable.jsx'),
  path.join(projectRoot, 'src/features/tutoring/TutorialProfileList.jsx'),
  path.join(projectRoot, 'src/features/tutoring/SociometricSummaryPanel.jsx'),
  path.join(projectRoot, 'src/features/tutoring/SeatingPlanBoard.jsx'),
  path.join(projectRoot, 'src/features/tutoring/CooperativeGroupGrid.jsx'),
]
const safeModulePaths = [
  ...pureComponentPaths,
  path.join(projectRoot, 'src/data/adapters/safeAssistancePackage.js'),
  path.join(projectRoot, 'src/data/adapters/generateSafeAssistancePackage.js'),
  path.join(projectRoot, 'src/features/data/safeAssistanceExport.js'),
  path.join(projectRoot, 'src/data/adapters/importSafeAssistancePackage.js'),
]

const forbiddenPatterns = [
  ['projecte Firebase real', /avaluapro\.firebaseapp\.com|projectId["':=]+avaluapro/i],
  ['base IndexedDB real', /avaluapro-v2/i],
  ['API de Firebase o Firestore', /firestore\.googleapis\.com|firebaseinstallations\.googleapis\.com|identitytoolkit\.googleapis\.com/i],
  ['autenticació Google', /GoogleAuthProvider|signInWithPopup|signInWithRedirect/i],
]

const forbiddenPureOverviewPatterns = [
  ['botiga real de l’aplicació', /useAvaluaproStore|\/store\//i],
  ['serveis de Firebase', /firebase|firestore/i],
  ['persistència IndexedDB', /indexedDB|idb/i],
]

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map((entry) => {
    const absolutePath = path.join(directory, entry.name)
    return entry.isDirectory() ? listFiles(absolutePath) : [absolutePath]
  }))
  return nested.flat()
}

const files = (await listFiles(outputRoot)).filter((filePath) => /\.(?:html|js|css)$/.test(filePath))
if (files.length === 0) throw new Error('No s’ha trobat cap paquet d’assistència compilat.')

const assistanceSourceFiles = (await listFiles(assistanceSourceRoot))
  .filter((filePath) => /\.(?:html|js|jsx|css)$/.test(filePath) && filePath !== runtimeBoundaryPath)
for (const filePath of assistanceSourceFiles) {
  const contents = await readFile(filePath, 'utf8')
  if (/(?:indexedDB|localStorage|sessionStorage|CacheStorage|serviceWorker)\s*(?:\.|\[)/i.test(contents)) {
    throw new Error(
      `Frontera d’assistència trencada: ${path.relative(projectRoot, filePath)} intenta usar persistència del navegador.`,
    )
  }
}

for (const filePath of files) {
  const contents = await readFile(filePath, 'utf8')
  for (const [label, pattern] of forbiddenPatterns) {
    if (pattern.test(contents)) {
      throw new Error(`Frontera d’assistència trencada: s’ha detectat ${label} a ${path.relative(projectRoot, filePath)}.`)
    }
  }
}

const indexContents = await readFile(path.join(outputRoot, 'index.html'), 'utf8')
if (!/AvaluaPro Assistència/.test(indexContents)) {
  throw new Error('El paquet compilat no està identificat com a AvaluaPro Assistència.')
}
if (!/data-avaluapro-environment=["']assistance["']/.test(indexContents)) {
  throw new Error('El paquet compilat no conté el marcador estructural de l’entorn d’assistència.')
}
if (!/Content-Security-Policy/i.test(indexContents) || !/connect-src 'self' ws:\/\/127\.0\.0\.1:\*/.test(indexContents)) {
  throw new Error('El paquet compilat no conté la política de xarxa restrictiva prevista.')
}

const buildMetadata = JSON.parse(await readFile(path.join(outputRoot, 'assistance-build.json'), 'utf8'))
if (
  buildMetadata.environment !== 'assistance' ||
  buildMetadata.dataPolicy !== 'synthetic-only' ||
  buildMetadata.persistence !== 'memory-only' ||
  buildMetadata.operationalGuard !== 'required' ||
  buildMetadata.credentials !== 'excluded' ||
  typeof buildMetadata.revision !== 'string' ||
  typeof buildMetadata.dirty !== 'boolean'
) {
  throw new Error('L’empremta del paquet d’assistència és incompleta o no és segura.')
}

for (const safeModulePath of safeModulePaths) {
  const pureComponentContents = await readFile(safeModulePath, 'utf8')
  for (const [label, pattern] of forbiddenPureOverviewPatterns) {
    if (pattern.test(pureComponentContents)) {
      throw new Error(
        `Frontera del mòdul segur trencada a ${path.basename(safeModulePath)}: s’ha detectat ${label}.`,
      )
    }
  }
}

console.log(
  `Frontera d’assistència verificada en ${files.length} fitxers compilats, ${pureComponentPaths.length} components visuals purs, ${safeModulePaths.length - pureComponentPaths.length} mòduls de paquet segur i una empremta de build.`,
)
