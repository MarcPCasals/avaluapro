import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function readProjectFile(relativePath) {
  return readFile(path.join(projectRoot, relativePath), 'utf8')
}

test('la tutoria real prepara les files i delega la llista d’informes', async () => {
  const source = await readProjectFile('src/features/tutoring/TutoringView.jsx')

  assert.match(source, /const tutorialProfileRows = filteredTutorialProfiles\.map/)
  assert.match(source, /<TutorialProfileList/)
  assert.match(source, /setSelectedTutorialProfileId\(row\.student\.id\)/)
  assert.match(source, /getTutorialProfilePriority/)
})

test('assistència només genera perfils tutorials ficticis i una vista prèvia limitada', async () => {
  const source = await readProjectFile('assistencia/src/AssistanceApp.jsx')

  assert.match(source, /activeSurface === 'tutoring'/)
  assert.match(source, /Mirada acadèmica fictícia/)
  assert.match(source, /No conté diagnòstics, comentaris familiars ni informació personal real/)
  assert.match(source, /<TutorialProfileList/)
})

test('la llista compartida no coneix formularis, coordinació ni persistència', async () => {
  const source = await readProjectFile('src/features/tutoring/TutorialProfileList.jsx')

  assert.doesNotMatch(
    source,
    /useAvaluaproStore|firebase|firestore|indexedDB|localStorage|sessionStorage|family|sociometric|coordination/i,
  )
  assert.match(source, /data-tutorial-student-row/)
  assert.match(source, /aria-pressed/)
})
