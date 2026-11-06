import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { formatMeasureReviewDate, getEffectiveMeasures, saveEffectiveMeasure } from '../../lib/effectiveMeasures'

const EMPTY_DRAFT = { measure: '', context: '', reviewedOn: '' }

export function StudentEffectiveMeasures({ student, onChange }) {
  const measures = getEffectiveMeasures(student)
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [editingId, setEditingId] = useState('')

  const resetDraft = () => {
    setDraft(EMPTY_DRAFT)
    setEditingId('')
  }

  const save = async () => {
    if (!draft.measure.trim() || !draft.context.trim()) return
    await onChange(saveEffectiveMeasure(measures, draft, editingId || crypto.randomUUID()))
    resetDraft()
  }

  return (
    <section className="annotation-section effective-measures-section">
      <h3>Mesures que funcionen</h3>
      <p className="effective-measures-intro">Anota les mesures que has comprovat amb aquest alumne per tenir-les presents.</p>
      {measures.length > 0 && <div className="effective-measures-list">
        {measures.map((entry) => <article className="effective-measure-card" key={entry.id}>
          <div>
            <strong>{entry.measure}</strong>
            <p>{entry.context}</p>
            {entry.reviewedOn && <small>Revisat el {formatMeasureReviewDate(entry.reviewedOn)}</small>}
          </div>
          <div className="effective-measure-actions">
            <button aria-label={`Editar mesura: ${entry.measure}`} onClick={() => {
              setEditingId(entry.id)
              setDraft({ measure: entry.measure, context: entry.context, reviewedOn: entry.reviewedOn || '' })
            }} title="Editar mesura" type="button"><Pencil size={16} /></button>
            <button aria-label={`Eliminar mesura: ${entry.measure}`} onClick={() => {
              if (!window.confirm('Vols eliminar aquesta mesura?')) return
              onChange(measures.filter((item) => item.id !== entry.id))
              if (editingId === entry.id) resetDraft()
            }} title="Eliminar mesura" type="button"><Trash2 size={16} /></button>
          </div>
        </article>)}
      </div>}
      <div className="effective-measure-form">
        <label>Mesura que funciona
          <input maxLength={180} onChange={(event) => setDraft((current) => ({ ...current, measure: event.target.value }))} placeholder="Per exemple, donar les instruccions d’una en una" value={draft.measure} />
        </label>
        <label>En quina situació funciona
          <textarea maxLength={350} onChange={(event) => setDraft((current) => ({ ...current, context: event.target.value }))} placeholder="Per exemple, quan la tasca té diversos passos" value={draft.context} />
        </label>
        <label>Darrera revisió
          <input onChange={(event) => setDraft((current) => ({ ...current, reviewedOn: event.target.value }))} type="date" value={draft.reviewedOn} />
        </label>
        <div className="effective-measure-form-actions">
          {editingId && <button className="secondary-action compact" onClick={resetDraft} type="button">Cancel·lar</button>}
          <button className="primary-action compact" disabled={!draft.measure.trim() || !draft.context.trim()} onClick={save} type="button">
            <Plus size={16} /> {editingId ? 'Desar canvis' : 'Afegir mesura'}
          </button>
        </div>
      </div>
    </section>
  )
}
