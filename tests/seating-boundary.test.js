import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function readProjectFile(relativePath) {
  return readFile(path.join(projectRoot, relativePath), 'utf8')
}

test('la disposició real conserva la planificació avançada i la persistència fora del component segur', async () => {
  const source = await readProjectFile('src/features/tutoring/TutoringView.jsx')

  assert.match(source, /buildTutorialSeatingPlan/)
  assert.match(source, /saveTutorialSeatingPlan/)
  assert.match(source, /handleDeleteTutorialSeatingPlan/)
  assert.match(source, /downloadTutorialSeatingJpeg/)
})

test('assistència crea un plànol exclusivament fictici i temporal', async () => {
  const source = await readProjectFile('assistencia/src/AssistanceApp.jsx')

  assert.match(source, /activeSurface === 'classroom'/)
  assert.match(source, /Disposició completament fictícia/)
  assert.match(source, /Alternativa fictícia generada només en memòria/)
  assert.match(source, /Sense fotografies, observacions, restriccions, historial, exportació ni versions desades reals/)
  assert.match(source, /<SeatingPlanBoard/)
})

test('el plànol compartit no coneix dades reals, persistència ni exportació', async () => {
  const source = await readProjectFile('src/features/tutoring/SeatingPlanBoard.jsx')

  assert.doesNotMatch(
    source,
    /useAvaluaproStore|firebase|firestore|indexedDB|localStorage|sessionStorage|photo|observation|history|download|save/i,
  )
  assert.match(source, /data-seating-plan-board/)
  assert.match(source, /data-seating-student/)
  assert.match(source, /Totes les posicions són simulades/)
})
