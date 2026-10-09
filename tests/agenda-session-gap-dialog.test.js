import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

test('el diàleg conserva les opcions, passa la tria i només es tanca quan el canvi s’ha desat', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { AgendaSessionDetailDialog } = await server.ssrLoadModule('/src/features/agenda/AgendaSessionDialogs.jsx')
    const bundle = { session: { id: 'fictional-session' } }
    const gapChoice = { title: 'Presentació fictícia', itemId: 'fictional-item', availableMinutes: 10, remainingMinutes: 15 }
    const calls = []
    let closed = 0
    const onResolveGap = async (target, selection) => {
      calls.push({ target, selection })
      return selection ? true : { gapChoice }
    }
    const dialog = AgendaSessionDetailDialog({ bundle, onResolveGap, onClose: () => { closed += 1 } })
    const resolve = dialog.props.children.props.onResolveGap
    const pending = await resolve(bundle, null)
    assert.deepEqual(pending, { gapChoice })
    assert.equal(closed, 0, 'la resposta amb opcions no pot tancar el diàleg')
    const selection = { ...gapChoice, mode: 'extend' }
    assert.equal(await resolve(bundle, selection), true)
    assert.deepEqual(calls, [{ target: bundle, selection: null }, { target: bundle, selection }])
    assert.equal(closed, 1)

    const error = new Error('No es pot desar el canvi fictici')
    const failing = AgendaSessionDetailDialog({ bundle,
      onResolveGap: async () => { throw error }, onClose: () => { closed += 1 } })
    await assert.rejects(failing.props.children.props.onResolveGap(bundle, selection), error)
    assert.equal(closed, 1, 'un error ha de mantenir obert el diàleg per mostrar-lo')
  } finally { await server.close() }
})
