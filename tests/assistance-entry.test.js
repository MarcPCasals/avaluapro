import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function readProjectFile(relativePath) {
  return readFile(path.join(projectRoot, relativePath), 'utf8')
}

test('l’entrada d’assistència s’identifica abans d’arrencar React', async () => {
  const [html, main] = await Promise.all([
    readProjectFile('assistencia/index.html'),
    readProjectFile('assistencia/main.jsx'),
  ])

  assert.match(html, /data-avaluapro-environment="assistance"/)
  assert.match(html, /data-data-policy="synthetic-only"/)
  assert.match(html, /Content-Security-Policy/)
  assert.match(html, /connect-src 'self' ws:\/\/127\.0\.0\.1:\* ws:\/\/localhost:\*/)
  assert.ok(main.indexOf('installAssistanceRuntimeBoundary()') < main.indexOf('createRoot('))
  assert.doesNotMatch(main, /src\/(?:main|App)\.jsx|useAvaluaproStore|firebase|indexedDb/i)
})

test('la frontera d’execució bloqueja xarxa externa i persistència del navegador', async () => {
  const runtime = await readProjectFile('assistencia/src/secureRuntime.js')

  for (const requiredProtection of [
    'assertSameOrigin',
    'window.fetch',
    'XMLHttpRequest',
    'WebSocket',
    'EventSource',
    'sendBeacon',
    'indexedDB',
    'Storage',
    'CacheStorage',
    'ServiceWorkerContainer',
  ]) {
    assert.match(runtime, new RegExp(requiredProtection))
  }
  assert.match(runtime, /Operació no disponible a l’entorn d’assistència/)
  assert.match(runtime, /dataset\.runtimeBoundary = 'verified'/)
  assert.match(runtime, /avaluapro-assistance-blocked\.invalid/)
  assert.match(runtime, /avaluapro-assistance-forbidden-probe/)
})

test('la configuració fixa un origen local i inspecciona els mòduls compilats', async () => {
  const config = await readProjectFile('vite.assistance.config.js')

  assert.match(config, /root:.*assistencia/)
  assert.match(config, /publicDir: false/)
  assert.match(config, /host: '127\.0\.0\.1'/)
  assert.match(config, /port: 4174/)
  assert.match(config, /strictPort: true/)
  assert.match(config, /moduleParsed/)
  assert.match(config, /node_modules\\\/firebase/)
  assert.match(config, /src\\\/store/)
  assert.match(config, /assistance-build\.json/)
})

test('els comandaments d’assistència no poden obrir el servidor real', async () => {
  const packageJson = JSON.parse(await readProjectFile('package.json'))
  const developmentCommand = packageJson.scripts['dev:assistance']
  const previewCommand = packageJson.scripts['preview:assistance']
  const launcher = await readProjectFile('scripts/run-assistance-command.mjs')

  for (const command of [developmentCommand, previewCommand]) {
    assert.match(command, /run-assistance-command\.mjs/)
    assert.doesNotMatch(command, /firebase|src\/main|--open/i)
  }
  assert.match(launcher, /vite\.assistance\.config\.js/)
  assert.match(launcher, /'--host', '127\.0\.0\.1'/)
  assert.match(launcher, /'--strictPort'/)
  assert.match(launcher, /BROWSER = 'none'/)
  assert.match(launcher, /delete sanitizedEnvironment\[variableName\]/)
})
