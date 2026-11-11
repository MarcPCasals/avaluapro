import { useDialogSave } from '../../lib/useDialogSave'
import './ActionDialogs.css'
import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
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
      setNotice(`${actions.length} accions afegides al catàleg de l’assignatura. En desar, estaran disponibles a totes les UT.`)
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

function ActionOption({ action, selected, onSelect, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [description, setDescription] = useState(action.description)
  const trimmed = description.trim()
  const saveEdit = () => {
    if (!trimmed) return
    onUpdate(trimmed)
    setEditing(false)
  }
  return <div className="evaluation-action-option">
    {editing ? <div className="evaluation-action-edit">
      <label className="field-label">{action.id.startsWith('text:') ? 'Text de l’acció' : `Text de l’acció ${action.id}`}
        <input autoFocus maxLength={500} value={description} onChange={event => setDescription(event.target.value)} onKeyDown={event => {
          if (event.key === 'Enter') saveEdit()
          if (event.key === 'Escape') { setDescription(action.description); setEditing(false) }
        }} />
      </label>
      <button className="primary-action compact" type="button" disabled={!trimmed} onClick={saveEdit}>Desar text</button>
      <button className="secondary-action compact" type="button" onClick={() => { setDescription(action.description); setEditing(false) }}>Cancel·lar</button>
    </div> : <>
      <label className="evaluation-action-choice">
        <input type="checkbox" checked={selected} onChange={event => onSelect(event.target.checked)} />
        <span>{!action.id.startsWith('text:') && <strong>{action.id}: </strong>}{action.description}</span>
      </label>
      <div className="evaluation-action-controls">
        <button className="secondary-action compact" type="button" aria-label={`Modificar ${action.id}`} onClick={() => { setDescription(action.description); setConfirmDelete(false); setEditing(true) }}><Pencil size={15} /> Modificar</button>
        <button className="danger-soft" type="button" aria-label={`Eliminar ${action.id}`} onClick={() => setConfirmDelete(true)}><Trash2 size={15} /> Eliminar</button>
      </div>
    </>}
    {confirmDelete && <div className="evaluation-action-delete-confirm" role="group" aria-label={`Confirmar eliminació de ${action.id}`}>
      <span>Eliminar aquesta acció del catàleg i de les seleccions de totes les UT d’aquesta classe?</span>
      <button className="danger-soft" type="button" onClick={onDelete}>Sí, eliminar</button>
      <button className="secondary-action compact" type="button" onClick={() => setConfirmDelete(false)}>Cancel·lar</button>
    </div>}
  </div>
}

function ActionCopyControls({ destinations, busy, onCopy }) {
  const [selectedClasses, setSelectedClasses] = useState([])
  const targets = destinations.filter(item => selectedClasses.includes(item.id))
  return <details className="action-copy-panel">
    <summary>Copiar accions a altres classes</summary>
    <p>Tria les classes on vols afegir tot el catàleg de l’assignatura. Les accions estaran disponibles a totes les seves UT, també a les que creïs més endavant. A cada UT escolliràs quines avalues.</p>
    <p>Es desaran els canvis d’aquesta finestra. Les seleccions i les notes de les classes de destí es conserven.</p>
    <fieldset className="evaluation-actions-fields" disabled={busy}>
      {destinations.length === 0 && <p>Encara no hi ha altres classes on copiar les accions.</p>}
      <div className="action-copy-destinations">{destinations.map(item => <div className="action-copy-destination" key={item.id}>
        <label className="action-copy-option"><input type="checkbox" checked={selectedClasses.includes(item.id)} onChange={event => {
          const checked = event.target.checked
          setSelectedClasses(current => checked ? [...current, item.id] : current.filter(id => id !== item.id))
        }} /><span><strong>{item.name}</strong>{item.subject && <small>{item.subject}</small>}</span></label>
      </div>)}</div>
      <button className="secondary-action" type="button" disabled={!targets.length} onClick={() => onCopy({
        targets: targets.map(item => ({ classId: item.id })),
      })}>{busy ? 'Copiant…' : `Copiar a ${targets.length} ${targets.length === 1 ? 'classe' : 'classes'}`}</button>
    </fieldset>
  </details>
}

export function EvaluationActionsModal({ competencies, catalog: initialCatalog, utName, onSave, onClose, copyDestinations = [], onCopy }) {
  const { busy, error, notice, close, save: runSave } = useDialogSave(onClose, 'No s’han pogut desar les accions.')
  const activeCompetencies = competencies.filter(competency => !competency.inactive)
  const [catalog, setCatalog] = useState(initialCatalog)
  const [selections, setSelections] = useState(() => Object.fromEntries(activeCompetencies.flatMap(comp =>
    comp.criteria.map(criterion => [criterion.id, criterion.selectedActionIds || []]),
  )))
  const select = (criterionId, ids) => setSelections(current => ({ ...current, [criterionId]: ids }))
  const save = () => runSave(() => onSave({ catalog, selections }))
  const copy = options => runSave(() => onCopy({ catalog, selections, ...options }), {
    closeOnSuccess: false,
    successMessage: report => `Catàleg copiat a ${report.classes} ${report.classes === 1 ? 'classe' : 'classes'}. Les accions ja estan disponibles a totes les seves UT. Les seleccions i les notes existents es conserven.`,
  })
  return <Modal title={`Accions que s’avaluen · ${utName || 'UT'}`} size="lg" panelClassName="evaluation-actions-dialog" onClose={close}>
    <p>Les accions pertanyen al catàleg de l’assignatura i estan disponibles a totes les UT. Aquí només es mostren les competències actives; selecciona les accions que avaluaràs en aquesta UT.</p>
    {onCopy && <ActionCopyControls destinations={copyDestinations} busy={busy} onCopy={copy} />}
    {notice && <p className="action-copy-notice" role="status">{notice}</p>}
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
              <div className="evaluation-action-options">{available.map(action => <ActionOption key={action.id} action={action}
                selected={selected.includes(action.id)}
                onSelect={checked => select(criterion.id, checked ? [...selected, action.id] : selected.filter(id => id !== action.id))}
                onUpdate={description => setCatalog(current => ({ ...current, [key]: current[key].map(item => item.id === action.id ? { ...item, description } : item) }))}
                onDelete={() => {
                  setCatalog(current => ({ ...current, [key]: current[key].filter(item => item.id !== action.id) }))
                  select(criterion.id, selected.filter(id => id !== action.id))
                }} />)}</div>
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
