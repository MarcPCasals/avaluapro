import { useDialogSave } from '../../lib/useDialogSave'
import './ActionDialogs.css'
import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { getCriterionActionKey, parseActionLines } from '../../lib/evaluationActions'

function ActionImporter({ onImport }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const load = (value) => {
    try {
      const actions = parseActionLines(value)
      if (!actions.length) throw new Error('Introdueix almenys una acció.')
      onImport(actions)
      setText('')
      setError('')
      setNotice(`${actions.length} accions carregades. Selecciona les que avaluaràs.`)
    } catch (cause) { setError(cause.message) }
  }
  return <details className="action-importer">
    <summary>Carregar accions manualment</summary>
    <label className="field-label">Una acció per línia, amb codi opcional (p. ex. C1R1: Utilitzar lèxic científic).
      <textarea rows={4} value={text} onChange={event => setText(event.target.value)} />
    </label>
    <div className="inline-actions">
      <button className="secondary-action" type="button" disabled={!text.trim()} onClick={() => load(text)}>Carregar llista</button>
      <label className="field-label">O importar un fitxer de text (.txt)
        <input type="file" accept=".txt,text/plain" onChange={async event => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          if (file.size > 100_000) { setError('El fitxer ha de ser inferior a 100 kB.'); return }
          try { load(await file.text()) } catch { setError('No s’ha pogut llegir el fitxer.') }
        }} />
      </label>
    </div>
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
  </details>
}

export function EvaluationActionsModal({ competencies, catalog: initialCatalog, utName, onSave, onClose }) {
  const { busy, error, close, save: runSave } = useDialogSave(onClose, 'No s’han pogut desar les accions.')
  const activeCompetencies = competencies.filter(competency => !competency.inactive)
  const [catalog, setCatalog] = useState(initialCatalog)
  const [selections, setSelections] = useState(() => Object.fromEntries(activeCompetencies.flatMap(comp =>
    comp.criteria.map(criterion => [criterion.id, criterion.selectedActionIds || []]),
  )))
  const select = (criterionId, ids) => setSelections(current => ({ ...current, [criterionId]: ids }))
  const save = () => runSave(() => onSave({ catalog, selections }))
  return <Modal title={`Accions que s’avaluen · ${utName || 'UT'}`} size="lg" panelClassName="evaluation-actions-dialog" onClose={close}>
    <p>Marca només les accions que avaluaràs en aquesta UT. El catàleg es pot reutilitzar a les altres UT del grup; cada UT conserva la seva selecció.</p>
    {activeCompetencies.length === 0 && <p>Activa primer les competències d’aquesta UT.</p>}
    <fieldset className="evaluation-actions-fields" disabled={busy}>
      {activeCompetencies.map(competency => <section className="action-competency" key={competency.id}>
        <h3>{competency.name}</h3>
        {competency.criteria.map(criterion => {
          const key = getCriterionActionKey(competency, criterion)
          const available = catalog[key] || []
          const selected = selections[criterion.id] || []
          const selectedCount = available.filter(action => selected.includes(action.id)).length
          return <section className="action-criterion" key={criterion.id}>
            <div className="section-title-row"><h4>{criterion.name}</h4><small>{selectedCount}/{available.length} seleccionades</small></div>
            {available.length > 0 ? <>
              <div className="inline-actions">
                <button className="secondary-action compact" type="button" onClick={() => select(criterion.id, available.map(action => action.id))}>Seleccionar totes</button>
                <button className="secondary-action compact" type="button" onClick={() => select(criterion.id, [])}>Desmarcar totes</button>
              </div>
              <div className="evaluation-action-options">{available.map(action => <label key={action.id}>
                <input type="checkbox" checked={selected.includes(action.id)} onChange={event => select(criterion.id, event.target.checked ? [...selected, action.id] : selected.filter(id => id !== action.id))} />
                <span>{!action.id.startsWith('text:') && <strong>{action.id}: </strong>}{action.description}</span>
              </label>)}</div>
            </> : <p>Encara no hi ha accions carregades per a aquest criteri.</p>}
            <ActionImporter onImport={imported => setCatalog(current => ({ ...current, [key]: [...new Map([...(current[key] || []), ...imported].map(action => [action.id, action])).values()] }))} />
          </section>
        })}
      </section>)}
    </fieldset>
    {error && <p role="alert">{error}</p>}
    {busy && <p role="status">Desant els canvis… Pots tancar la finestra.</p>}
    <div className="evaluation-actions-footer">
      <button className="secondary-action" type="button" onClick={close}>Tancar</button>
      <button className="primary-action" type="button" disabled={busy || !activeCompetencies.length} onClick={save}>{busy ? 'Desant…' : 'Desar selecció'}</button>
    </div>
  </Modal>
}
