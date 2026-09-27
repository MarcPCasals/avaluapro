import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import test from 'node:test'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function readProjectFile(relativePath) {
  return readFile(path.join(projectRoot, relativePath), 'utf8')
}

test('el protocol persistent prohibeix a l’assistent accedir a dades reals', async () => {
  const instructions = await readProjectFile('AGENTS.md')

  assert.match(instructions, /No obrir ni inspeccionar l'aplicació real autenticada/)
  assert.match(instructions, /No navegar a dominis de producció/)
  assert.match(instructions, /No obrir còpies de seguretat, exports/)
  assert.match(instructions, /no autoritza cap desplegament/i)
  assert.match(instructions, /verificació funcional autenticada.*correspon a Marc/i)
})

test('tots els comandaments d’assistència passen pel llançador únic', async () => {
  const [packageContents, launcher] = await Promise.all([
    readProjectFile('package.json'),
    readProjectFile('scripts/run-assistance-command.mjs'),
  ])
  const packageJson = JSON.parse(packageContents)

  assert.equal(packageJson.scripts['dev:assistance'], 'node scripts/run-assistance-command.mjs dev')
  assert.equal(packageJson.scripts['build:assistance'], 'node scripts/run-assistance-command.mjs build')
  assert.equal(packageJson.scripts['preview:assistance'], 'node scripts/run-assistance-command.mjs preview')
  assert.match(launcher, /build: \['build'\]/)
})

test('la configuració Vite rebutja una arrencada que no vingui del llançador', async () => {
  await assert.rejects(
    execFileAsync(process.execPath, ['-e', "import('./vite.assistance.config.js')"], {
      cwd: projectRoot,
      env: { ...process.env, AVALUAPRO_ASSISTANCE_SESSION: '' },
    }),
    /Arrencada directa rebutjada/,
  )
})

test('el marcador segur no permet arrencar si queda una credencial de producció', async () => {
  await assert.rejects(
    execFileAsync(process.execPath, ['-e', "import('./vite.assistance.config.js')"], {
      cwd: projectRoot,
      env: {
        ...process.env,
        AVALUAPRO_ASSISTANCE_SESSION: 'synthetic-only',
        FIREBASE_TOKEN: 'valor-sentinella-que-no-es-pot-utilitzar',
      },
    }),
    /variable de credencials FIREBASE_TOKEN no s’ha exclòs/,
  )
})

test('el preflight és local, sintètic i no revela el valor de cap credencial', async () => {
  const sentinel = 'NO_HA_D_APAREIXER_MAI'
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    ['scripts/run-assistance-command.mjs', 'check'],
    {
      cwd: projectRoot,
      env: { ...process.env, FIREBASE_TOKEN: sentinel, GOOGLE_APPLICATION_CREDENTIALS: sentinel },
    },
  )

  assert.equal(stderr, '')
  assert.match(stdout, /dades sintètiques/)
  assert.match(stdout, /credencials excloses/)
  assert.match(stdout, /FIREBASE_TOKEN/)
  assert.match(stdout, /GOOGLE_APPLICATION_CREDENTIALS/)
  assert.doesNotMatch(stdout, new RegExp(sentinel))
})
