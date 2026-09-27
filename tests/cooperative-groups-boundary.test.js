import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function readProjectFile(relativePath) {
  return readFile(path.join(projectRoot, relativePath), 'utf8')
}

test('els grups reals conserven rols, edició, desament i compartició fora del component segur', async () => {
  const source = await readProjectFile('src/features/tutoring/TutoringView.jsx')

  assert.match(source, /buildCooperativeGroups/)
  assert.match(source, /saveTutorialGroupSet/)
  assert.match(source, /handleCopyCooperativeGroups/)
  assert.match(source, /cooperativeGroupSetObservation/)
})

test('assistència forma cinc grups només amb perfils ficticis', async () => {
  const source = await readProjectFile('assistencia/src/AssistanceApp.jsx')

  assert.match(source, /activeSurface === 'groups'/)
  assert.match(source, /Agrupament completament fictici/)
  assert.match(source, /Nova proposta cooperativa fictícia generada només en memòria/)
  assert.match(source, /Sense rols, observacions, restriccions, historial, còpia, compartició ni versions desades reals/)
  assert.match(source, /<CooperativeGroupGrid/)
})

test('la graella cooperativa només presenta grups preparats', async () => {
  const source = await readProjectFile('src/features/tutoring/CooperativeGroupGrid.jsx')

  assert.doesNotMatch(
    source,
    /useAvaluaproStore|firebase|firestore|indexedDB|localStorage|sessionStorage|observation|history|download|save|share/i,
  )
  assert.match(source, /data-cooperative-group-grid/)
  assert.match(source, /data-cooperative-group/)
  assert.match(source, /data-cooperative-student/)
  assert.match(source, /aria-pressed/)
})
