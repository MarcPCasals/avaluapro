import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execFileSync } from 'node:child_process'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))
const blockedCredentialNames = [
  'FIREBASE_TOKEN',
  'FIREBASE_WEB_API_KEY',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'GOOGLE_CLOUD_PROJECT',
  'GCLOUD_PROJECT',
]

if (process.env.AVALUAPRO_ASSISTANCE_SESSION !== 'synthetic-only') {
  throw new Error(
    'Arrencada directa rebutjada. Utilitza npm run dev:assistance, build:assistance o preview:assistance.',
  )
}

const exposedCredentialName = blockedCredentialNames.find((variableName) => process.env[variableName])
if (exposedCredentialName) {
  throw new Error(
    `Arrencada d’assistència rebutjada: la variable de credencials ${exposedCredentialName} no s’ha exclòs.`,
  )
}

const forbiddenAssistanceModules = [
  ['Firebase', /\/node_modules\/firebase\//i],
  ['entrada real', /\/src\/(?:main\.jsx|App\.jsx)$/i],
  ['botiga real', /\/src\/store\//i],
  ['IndexedDB real', /\/src\/db\//i],
  ['connector Firebase real', /\/src\/lib\/firebase(?:\.|\/)/i],
]

function readGitValue(args, fallback) {
  try {
    return execFileSync('git', args, { cwd: projectRoot, encoding: 'utf8' }).trim() || fallback
  } catch {
    return fallback
  }
}

function assistanceBoundaryPlugin() {
  return {
    name: 'avaluapro-assistance-boundary',
    moduleParsed(moduleInfo) {
      const moduleId = moduleInfo.id.replaceAll('\\', '/').split('?')[0]
      for (const [label, pattern] of forbiddenAssistanceModules) {
        if (pattern.test(moduleId)) {
          throw new Error(`El paquet d’assistència no pot importar ${label}: ${moduleId}`)
        }
      }
    },
    generateBundle() {
      const revision = process.env.GITHUB_SHA || readGitValue(['rev-parse', 'HEAD'], 'unknown')
      const dirty = readGitValue(['status', '--porcelain', '--untracked-files=no'], '') !== ''
      this.emitFile({
        type: 'asset',
        fileName: 'assistance-build.json',
        source: `${JSON.stringify({
          environment: 'assistance',
          dataPolicy: 'synthetic-only',
          persistence: 'memory-only',
          operationalGuard: 'required',
          credentials: 'excluded',
          revision,
          dirty,
        }, null, 2)}\n`,
      })
    },
  }
}

export default defineConfig({
  root: fileURLToPath(new URL('./assistencia', import.meta.url)),
  publicDir: false,
  plugins: [assistanceBoundaryPlugin(), react(), tailwindcss()],
  base: '/',
  server: {
    host: '127.0.0.1',
    port: 4174,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4175,
    strictPort: true,
  },
  build: {
    emptyOutDir: true,
    outDir: fileURLToPath(new URL('./dist-assistance', import.meta.url)),
  },
})
