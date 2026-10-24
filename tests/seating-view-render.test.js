import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
let server, Selector, Viewer, StructureOptions

test.before(async () => {
  server = await createServer({ configFile: false, envFile: false, plugins: [react()], optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null, hmr: false, ws: false } })
  StructureOptions = (await server.ssrLoadModule('/src/features/tutoring/SeatingStructureOptions.jsx')).SeatingStructureOptions
  Selector = (await server.ssrLoadModule('/src/features/tutoring/SeatingContextSelector.jsx')).SeatingContextSelector
  Viewer = (await server.ssrLoadModule('/src/features/tutoring/SeatingPlanViewer.jsx')).SeatingPlanViewer
})
test.after(async () => { await server?.close() })

test('el selector mostra les aules i el recompte exclusiu del mig grup', () => {
  const html = renderToStaticMarkup(createElement(Selector, { context: { roomId: 'lab', halfGroup: 'A' }, rooms: [{ roomId: 'main', roomName: 'Aula principal' }, { roomId: 'lab', roomName: 'Laboratori' }], students: [{ id: 'a', halfGroup: 'Grup A' }, { id: 'b', halfGroup: 'Grup B' }], onChange() {}, onAddRoom() {} }))
  assert.match(html, /value="lab" selected=""/)
  assert.match(html, /value="A" selected=""/)
  assert.match(html, /1 alumnes/)
  assert.match(html, /Afegir aula/)
})
test('la consulta del Mode aula conserva els llocs i només mostra noms de la llista admesa', () => {
  const html = renderToStaticMarkup(createElement(Viewer, { plan: { title: 'Versió sintètica', observation: 'PRIVATE_NOTE', qualitySnapshot: { score: 42 }, layout: { columns: 3, rows: 1, seatingContext: { roomId: 'lab', roomName: 'Laboratori', halfGroup: 'A' } }, seats: [{ studentId: 'a', x: 1, y: 0 }, { studentId: 'b', x: 2, y: 0 }] }, students: [{ id: 'a', name: 'ALUMNE_A' }] }))
  assert.match(html, /Laboratori · Mig grup A/)
  assert.match(html, /ALUMNE_A/)
  assert.doesNotMatch(html, /PRIVATE_NOTE|ALUMNE_B|42/)
  assert.equal((html.match(/seating-viewer-seat/g) || []).length, 3)
})
test('si falta la disposició correcta es mostra un missatge per activar-la', () => {
  const html = renderToStaticMarkup(createElement(Viewer, { plan: null }))
  assert.match(html, /No hi ha cap disposició activa/)
  assert.match(html, /Tutoria/)
})

test('files i taula docent es configuren amb desplegables que admeten dues files i centre', () => {
  const html = renderToStaticMarkup(createElement(StructureOptions, { value: { rows: 2, teacherDeskSide: 'center' }, onChange() {} }))
  assert.equal((html.match(/<select/g) || []).length, 2)
  assert.match(html, /value="2" selected=""/)
  assert.match(html, /value="center" selected=""/)
  assert.doesNotMatch(html, /<button/)
})
