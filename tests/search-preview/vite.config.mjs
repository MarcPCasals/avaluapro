import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const root = fileURLToPath(new URL('../../', import.meta.url))
const blocked = new Set(['src/lib/firebase.js', 'src/data/cloud/planningFirestore.js', 'src/data/cloud/planningCloudSync.js', 'src/data/cloud/studentOverviewShares.js', 'src/data/cloud/planningDirectionSubscription.js'].map(name => path.resolve(root, name)))
export default defineConfig({
  root, envFile: false, publicDir: false, cacheDir: 'node_modules/.vite-search-preview',
  resolve: { dedupe: ['react', 'react-dom'] },
  optimizeDeps: { noDiscovery: true, entries: [], include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'zustand', 'lucide-react', 'fake-indexeddb/auto'] },
  plugins: [{
    name: 'search-synthetic-connectors', enforce: 'pre',
    resolveId(id) { if (id.startsWith('firebase/')) throw new Error('Firebase prohibit a la prova sintètica') },
    async load(id) {
      if (!blocked.has(id)) return null
      const source = await readFile(id, 'utf8')
      return [...source.matchAll(/export\s+(?:async\s+)?(function|const)\s+(\w+)/g)]
        .map(([, kind, name]) => kind === 'const' ? `export const ${name} = [];` : `export async function ${name}() { throw new Error('Connector remot prohibit: ${name}'); }`).join('\n')
    },
  }, react(), tailwindcss()],
  server: { host: '127.0.0.1', port: 4186, strictPort: true, hmr: false, headers: { 'Content-Security-Policy': "connect-src 'self'; img-src 'self' data: blob:;" } },
})
