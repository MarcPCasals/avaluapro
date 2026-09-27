import { spawn } from 'node:child_process'
import { access, realpath } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const projectRoot = await realpath(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'))
const assistanceMarker = 'synthetic-only'
const blockedCredentialNames = [
  'FIREBASE_TOKEN',
  'FIREBASE_WEB_API_KEY',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'GOOGLE_CLOUD_PROJECT',
  'GCLOUD_PROJECT',
]

const commands = {
  build: ['build'],
  dev: ['--host', '127.0.0.1', '--port', '4174', '--strictPort'],
  preview: ['preview', '--host', '127.0.0.1', '--port', '4175', '--strictPort'],
}

function fail(message) {
  console.error(`Entorn d'assistència rebutjat: ${message}`)
  process.exitCode = 1
}

async function run() {
  const requestedCommand = process.argv[2] || 'check'
  if (requestedCommand !== 'check' && !Object.hasOwn(commands, requestedCommand)) {
    fail(`comandament desconegut “${requestedCommand}”.`)
    return
  }

  const currentDirectory = await realpath(process.cwd())
  if (currentDirectory !== projectRoot) {
    fail('el llançador s’ha d’executar des de l’arrel exacta del projecte.')
    return
  }

  const requiredFiles = [
    'assistencia/index.html',
    'assistencia/src/assistanceDataset.js',
    'assistencia/src/secureRuntime.js',
    'vite.assistance.config.js',
  ]
  await Promise.all(requiredFiles.map((relativePath) => access(path.join(projectRoot, relativePath))))

  const sanitizedEnvironment = { ...process.env }
  const removedCredentials = []
  for (const variableName of blockedCredentialNames) {
    if (sanitizedEnvironment[variableName]) removedCredentials.push(variableName)
    delete sanitizedEnvironment[variableName]
  }
  sanitizedEnvironment.AVALUAPRO_ASSISTANCE_SESSION = assistanceMarker
  sanitizedEnvironment.BROWSER = 'none'

  if (requestedCommand === 'check') {
    console.log('Porta d’assistència preparada: dades sintètiques, credencials excloses i navegador automàtic desactivat.')
    if (removedCredentials.length > 0) {
      console.log(`Variables de credencials que el llançador exclourà: ${removedCredentials.join(', ')}.`)
    }
    return
  }

  const viteBinary = path.join(projectRoot, 'node_modules', '.bin', 'vite')
  await access(viteBinary)
  const child = spawn(viteBinary, [...commands[requestedCommand], '--config', 'vite.assistance.config.js'], {
    cwd: projectRoot,
    env: sanitizedEnvironment,
    stdio: 'inherit',
  })

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => child.kill(signal))
  }

  child.once('error', (error) => {
    console.error(`No s’ha pogut iniciar l’entorn d’assistència: ${error.message}`)
    process.exitCode = 1
  })
  child.once('exit', (code, signal) => {
    process.exitCode = signal ? 1 : (code ?? 1)
  })
}

try {
  await run()
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}
