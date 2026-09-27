import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function readProjectFile(relativePath) {
  return readFile(path.join(projectRoot, relativePath), 'utf8')
}

test('la sociometria real delega el resum visual sense moure els càlculs ni els formularis', async () => {
  const source = await readProjectFile('src/features/tutoring/TutoringView.jsx')

  assert.match(source, /const sociometricMetrics = useMemo/)
  assert.match(source, /<SociometricSummaryPanel/)
  assert.match(source, /handleCreateSociometricSurvey/)
  assert.match(source, /handleSyncSociometricSurveyResponses/)
})

test('assistència genera relacions fictícies i exclou els fluxos públics', async () => {
  const appSource = await readProjectFile('assistencia/src/AssistanceApp.jsx')
  const datasetSource = await readProjectFile('assistencia/src/assistanceDataset.js')

  assert.match(appSource, /activeSurface === 'sociometry'/)
  assert.match(appSource, /Indicadors sociomètrics ficticis/)
  assert.match(appSource, /Sense qüestionaris públics, enllaços, respostes reals, notes lliures ni sincronització/)
  assert.match(datasetSource, /buildSociometricRelations/)
  assert.match(datasetSource, /synthetic-relation-positive/)
  assert.doesNotMatch(datasetSource, /firebase|firestore|https?:\/\//i)
})

test('el resum sociomètric compartit només presenta dades preparades', async () => {
  const source = await readProjectFile('src/features/tutoring/SociometricSummaryPanel.jsx')

  assert.doesNotMatch(
    source,
    /useAvaluaproStore|firebase|firestore|indexedDB|localStorage|sessionStorage|survey|questionari|response/i,
  )
  assert.match(source, /data-sociometric-summary/)
  assert.match(source, /categoryRows/)
  assert.match(source, /metrics/)
})
