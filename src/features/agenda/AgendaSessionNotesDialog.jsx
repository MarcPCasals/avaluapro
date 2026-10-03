import { useState } from 'react'
import { Loader2, Save, StickyNote } from 'lucide-react'
import { Modal } from '../../components/Modal'

export function AgendaSessionNotesDialog({ bundle, onClose, onSave }) {
  const existing = bundle.privateNotes?.[0]
  const [text, setText] = useState(existing?.text || '')
  const [recordInPlanning, setRecordInPlanning] = useState(Boolean(existing?.recordInPlanning))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const save = async () => {
    setBusy(true)
    setError('')
    try {
      await onSave(bundle, text, { recordInPlanning })
      onClose()
    } catch (saveError) {
      setError(saveError.message || 'No s’ha pogut desar la nota.')
    } finally { setBusy(false) }
  }
  const date = new Date(bundle.session.startsAt).toLocaleDateString('ca-AD', { weekday: 'long', day: 'numeric', month: 'long' })
  return <Modal title="Notes de la sessió" onClose={() => !busy && onClose()} panelClassName="agenda-dialog agenda-session-notes-dialog">
    <div className="agenda-dialog-form">
    <p>{date} · {String(bundle.session.startsAt).slice(11, 16)}{bundle.session.subgroupId ? ` · ${bundle.session.subgroupId}` : ''}</p>
    <label>Nota<textarea autoFocus maxLength={4000} rows={5} placeholder="Què vols recordar durant aquesta classe?" value={text} onChange={(event) => setText(event.target.value)} /></label>
    <label className="agenda-check"><input type="checkbox" disabled={Boolean(bundle.standalone)} checked={recordInPlanning && !bundle.standalone} onChange={(event) => setRecordInPlanning(event.target.checked)} />Registrar també a l’aplicació a l’aula de la Programació</label>
    <p className="agenda-session-notes-help"><StickyNote size={15} /> {bundle.standalone ? 'La nota apareixerà al Mode aula. Cal vincular la sessió a una UP per registrar-la a la Programació.' : recordInPlanning ? 'El text apareixerà al Mode aula i a l’aplicació real de la UP, visible per a qui tingui accés a aquesta aplicació.' : 'Només per a tu: apareixerà al Mode aula d’aquesta sessió i no s’afegirà a la Programació.'}</p>
    {error && <p role="alert" className="agenda-inline-error">{error}</p>}
    <div className="modal-actions"><button className="secondary-action" disabled={busy} onClick={onClose} type="button">Cancel·lar</button><button className="primary-action" disabled={busy} onClick={save} type="button">{busy ? <Loader2 className="spin" size={16} /> : <Save size={16} />}Desar nota</button></div>
    </div>
  </Modal>
}
