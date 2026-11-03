import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

let server, Timeline
test.before(async () => {
  server = await createServer({ configFile: false, envFile: false, plugins: [react()],
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, hmr: false, ws: false },
  })
  Timeline = (await server.ssrLoadModule('/src/features/agenda/AgendaSessionViews.jsx')).AgendaTimelineView
})
test.after(async () => { await server?.close() })

const science = 'Ciències Físiques i de la Natura'
function render(subject, subjects) {
  return renderToStaticMarkup(createElement(Timeline, {
    selectedClassId: 'synthetic-class',
    classes: [{ id: 'synthetic-class', name: 'Grup fictici', subject }],
    bundles: [], today: '2026-11-03',
    slots: subjects.map((subject, index) => ({ id: `slot-${index}`, classId: 'synthetic-class', subject })),
  }))
}

test('calendarització selecciona la matèria del grup encara que també hi hagi tutoria', () => {
  const html = render(science, ['Tutoria', science])
  assert.ok(html.includes(`<option value="${science}" selected="">`))
  assert.ok(html.includes('<option value="">Totes les matèries</option>'))
})

test('la matèria del grup es mostra i se selecciona sense sessions ni horari carregat', () => {
  assert.ok(render(science, []).includes(`<option value="${science}" selected="">`))
})

test('un grup de tutoria selecciona tutoria i un grup ambigu conserva totes les matèries', () => {
  assert.ok(render('Tutoria', [science, 'Tutoria']).includes('<option value="Tutoria" selected="">'))
  assert.ok(render('', [science, 'Tutoria']).includes('<option value="" selected="">Totes les matèries</option>'))
})
