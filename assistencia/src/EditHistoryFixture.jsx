import { useEffect, useState } from 'react'
import { EditHistoryControls } from '../../src/components/EditHistoryControls.jsx'
import { editHistory, EDIT_HISTORY_REFRESH_EVENT } from '../../src/lib/editHistory.js'
import '../../src/App.css'

export function EditHistoryFixture() {
  const [rows, setRows] = useState([{ id: 'activity', title: 'Activitat fictícia', minutes: 55 }, { id: 'session', title: 'Sessió fictícia', date: 'Dilluns' }])
  const [adapter] = useState(() => {
    let values = [{ id: 'activity', title: 'Activitat fictícia', minutes: 55 }, { id: 'session', title: 'Sessió fictícia', date: 'Dilluns' }]
    const syntheticAdapter = {
      id: 'synthetic-ui',
      readMany: async changes => changes.map(change => values.find(row => row.id === change.key) || null),
      writeMany: async (changes, side) => {
        const map = new Map(values.map(row => [row.id, row]))
        changes.forEach(change => { if (change[side]) map.set(change.key, change[side]); else map.delete(change.key) })
        values = [...map.values()]; setRows(values)
      },
      change: async () => editHistory.run('Reprogramar activitat i sessió', () => {
        const next = values.map(row => row.id === 'activity' ? { ...row, minutes: row.minutes + 15 } : { ...row, date: row.date === 'Dilluns' ? 'Dimarts' : 'Dilluns' })
        next.forEach(row => editHistory.record(syntheticAdapter, row.id, values.find(value => value.id === row.id), row))
        values = next; setRows(next)
      }),
    }
    return syntheticAdapter
  })
  useEffect(() => {
    editHistory.clear()
    const listener = () => {}
    globalThis.addEventListener(EDIT_HISTORY_REFRESH_EVENT, listener)
    return () => { editHistory.clear(); globalThis.removeEventListener(EDIT_HISTORY_REFRESH_EVENT, listener) }
  }, [])
  return <main style={{ padding: 24 }}><h1>Desfer i refer · prova amb dades fictícies</h1>
    <div className="topbar-actions"><EditHistoryControls /></div>
    <button type="button" onClick={adapter.change}>Reprogramar</button>
    <p data-testid="history-values">{rows.map(row => `${row.title}: ${row.minutes || row.date}`).join(' · ')}</p>
    <label>Text de prova <input aria-label="Text de prova" defaultValue="Text editable" /></label>
  </main>
}
