import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function readProjectFile(relativePath) {
  return readFile(path.join(projectRoot, relativePath), 'utf8')
}

test('la guia diferencia clarament el compte real de l’entorn fictici', async () => {
  const guide = await readProjectFile('docs/GUIA-US-ASSISTENCIA-SEGURA.md')

  assert.match(guide, /Marc continua veient els noms i les dades reals/)
  assert.match(guide, /assistent tècnic només ha de treballar.*alumnes ficticis/s)
  assert.match(guide, /exportador segur ja està publicat/)
  assert.match(guide, /continua sent local i separat/)
})

test('la guia identifica les dues frases i l’únic fitxer admès', async () => {
  const guide = await readProjectFile('docs/GUIA-US-ASSISTENCIA-SEGURA.md')

  assert.match(guide, /EXPORTAR PAQUET SEGUR/)
  assert.match(guide, /CARREGAR PAQUET SEGUR/)
  assert.match(guide, /avaluapro-paquet-segur-v1\.json/)
  assert.match(guide, /còpies de seguretat d’AvaluaPro/)
})

test('la guia reserva la pantalla real a Marc i limita l’assistent als comandaments segurs', async () => {
  const guide = await readProjectFile('docs/GUIA-US-ASSISTENCIA-SEGURA.md')

  assert.match(guide, /Aquests passos els fa \*\*Marc tot sol\*\*/)
  assert.match(guide, /npm run dev:assistance/)
  assert.match(guide, /npm run preview:assistance/)
  assert.match(guide, /no entra al compte real/)
})

test('l’auditoria manté visibles els riscos residuals i documenta la publicació explícita', async () => {
  const audit = await readProjectFile('docs/AUDITORIA-FINAL-ASSISTENCIA-SEGURA.md')

  assert.match(audit, /Riscos residuals/)
  assert.match(audit, /Error humà en triar l’adjunt/)
  assert.match(audit, /Verificació autenticada pendent/)
  assert.match(audit, /petició explícita i separada de Marc/)
  assert.match(audit, /commit selectiu `71d0004`/)
  assert.match(audit, /desplegament exclusiu de Firebase Hosting/)
})
