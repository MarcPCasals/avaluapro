import { useDialogSave } from '../../lib/useDialogSave'
import './ActionDialogs.css'
import { useEffect, useRef, useState } from 'react'
import { StickyNote } from 'lucide-react'
import { Modal } from '../../components/Modal'
import { GRADE_OPTIONS, gradeClassName } from '../../lib/grades'
import { getActionGradeSummary } from '../../lib/actionGrades'

export function CriterionGradeModal({ student, competency, criterion, actions, value, mark, utName, onSave, onSaveActions, onNext, nextLabel, onClose, onConfigure, onSaveActionNote, previousOrientations = [], previousClassResults = {} }) {
  const { busy, error, close, save: runSave } = useDialogSave(onClose, 'No s’han pogut desar les notes.')
  const [grades, setGrades] = useState(() => Object.fromEntries(actions.map(action => [action.id, mark?.actionGrades?.[action.id] || ''])))
  const gradesRef = useRef(grades)
  const dirtyRef = useRef(false)
  const savingRef = useRef(null)
  const [savingGrades, setSavingGrades] = useState(false)
  const [gradeError, setGradeError] = useState('')
  const [noteDraft, setNoteDraft] = useState(null)
  const [noteError, setNoteError] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [savedNotes, setSavedNotes] = useState(mark?.actionNotes || {})
  const noteButtons = useRef({})
  const noteInput = useRef(null)
  const editingActionId = noteDraft?.action.id
  useEffect(() => { if (editingActionId) noteInput.current?.focus() }, [editingActionId])
  const summary = getActionGradeSummary(criterion, { actionGrades: grades })
  const save = grade => runSave(() => onSave(grade))
  const flushGrades = () => {
    if (savingRef.current) return savingRef.current
    if (!dirtyRef.current || !onSaveActions) return Promise.resolve()
    setSavingGrades(true)
    const operation = (async () => {
      while (dirtyRef.current) {
        dirtyRef.current = false
        try { await onSaveActions(gradesRef.current) }
        catch (cause) {
          dirtyRef.current = true
          throw cause
        }
      }
    })()
    savingRef.current = operation
    operation.finally(() => {
      if (savingRef.current === operation) savingRef.current = null
      setSavingGrades(false)
    }).catch(() => {})
    return operation
  }
  const changeGrade = (actionId, grade) => {
    const next = { ...gradesRef.current, [actionId]: grade }
    gradesRef.current = next
    dirtyRef.current = true
    setGrades(next)
    setGradeError('')
    flushGrades().catch(cause => setGradeError(cause?.message || 'No s’han pogut desar les qualificacions.'))
  }
  const afterGradesSaved = async callback => {
    if (!canLeave()) return
    try {
      await flushGrades()
      if (!dirtyRef.current) callback()
    } catch (cause) { setGradeError(cause?.message || 'No s’han pogut desar les qualificacions.') }
  }
  const canLeave = () => {
    if (!noteDraft && !noteSaving) return true
    setNoteError('Desa o cancel·la el comentari abans de continuar.')
    return false
  }
  const closeAfterSave = () => afterGradesSaved(close)
  const configureAfterSave = () => afterGradesSaved(onConfigure)
  const openNote = action => {
    if (!canLeave()) return
    const note = savedNotes[action.id]
    setNoteError('')
    setNoteDraft({ action, text: note?.text || '', orientation: Boolean(note?.orientation) })
  }
  const closeNote = () => {
    noteButtons.current[noteDraft.action.id]?.focus()
    setNoteDraft(null)
    setNoteError('')
  }
  const saveNote = async event => {
    event.preventDefault()
    if (noteSaving) return
    setNoteSaving(true)
    setNoteError('')
    try {
      const { action, text, orientation } = noteDraft
      await onSaveActionNote(action, { text, orientation })
      setSavedNotes(current => {
        const next = { ...current }
        if (text.trim()) next[action.id] = { text: text.trim(), orientation }
        else delete next[action.id]
        return next
      })
      closeNote()
    } catch (cause) {
      setNoteError(cause?.message || 'No s’ha pogut desar el comentari.')
    } finally { setNoteSaving(false) }
  }
  return <Modal title={`${criterion.name} · ${utName || 'UT'}`} panelClassName="evaluation-actions-dialog" closeButtonTabIndex={-1} onClose={closeAfterSave}>
    <p><strong>{student.name}</strong><br />{competency.name}</p>
    <section className="criterion-actions-preview">
      <h3>Accions que s’avaluen en aquesta UT</h3>
      {actions.length ? <>
        <p>Qualifica cada acció. La nota del criteri serà la més baixa: A &gt; B &gt; C &gt; D &gt; NA.</p>
        {value && !mark?.actionGrades && <p className="action-legacy-notice">Nota anterior del criteri: <strong>{value}</strong>. Les accions no hereten aquesta nota; es conservarà fins que desis les qualificacions de les accions.</p>}
        <div className="action-grade-fields">{actions.map(action => {
          const note = savedNotes[action.id]
          const orientations = previousOrientations.filter(item => item.actionId === action.id)
          const classResult = previousClassResults[action.id]
          const needsReinforcement = classResult && classResult.evaluated >= Math.max(2, Math.ceil(classResult.total * 2 / 3))
            && (classResult.distribution.D + classResult.distribution.NA) > classResult.evaluated / 2
          const editing = noteDraft?.action.id === action.id
          return <div className="action-note-item" key={action.id}>
          <div className="action-note-row"><label>
          <span>{!action.id.startsWith('text:') && <strong>{action.id}: </strong>}{action.description}</span>
          <select aria-label={`Nota de ${action.id.startsWith('text:') ? action.description : action.id}`} className={gradeClassName(grades[action.id])} disabled={busy || Boolean(noteDraft)}
            value={grades[action.id] || ''} onChange={event => changeGrade(action.id, event.target.value)}>
            {GRADE_OPTIONS.map(grade => <option key={grade} value={grade}>{grade || 'Pendent'}</option>)}
          </select>
          </label>
          {onSaveActionNote && <button type="button" className={`secondary-action compact action-note-trigger${note ? ' has-note' : ''}`}
            ref={element => { noteButtons.current[action.id] = element }}
            disabled={busy || noteSaving || savingGrades} onClick={() => openNote(action)} aria-expanded={editing} tabIndex={-1}
            aria-label={`${note ? 'Editar comentari' : 'Afegir comentari'}: ${action.description}`}>
            <StickyNote size={16} aria-hidden="true" /> {note ? 'Amb comentari' : 'Notes'}
          </button>}
          </div>
          {note && !editing && <p className="action-note-preview"><strong>{note.orientation ? 'Orientació' : 'Justificació'}:</strong> {note.text}</p>}
          {classResult && <div className={`action-class-history${needsReinforcement ? ' needs-reinforcement' : ''}`}>
            <strong>Última avaluació de la classe · {classResult.utName}</strong>
            <span title="A=4, B=3, C=2, D=1 i NA=1. Els pendents no compten.">Mitjana: {classResult.score.toLocaleString('ca-AD', { maximumFractionDigits: 2 })}/4 · {classResult.evaluated} de {classResult.total} amb nota</span>
            <span>{GRADE_OPTIONS.filter(grade => classResult.distribution[grade] > 0).map(grade => `${grade}: ${classResult.distribution[grade]}`).join(' · ')}</span>
            {needsReinforcement && <strong>Majoria de D o NA entre els avaluats · Convé reforçar aquesta acció</strong>}
          </div>}
          {orientations.length > 0 && <details open className="action-note-history">
            <summary tabIndex={-1}>Orientacions de les UT anteriors ({orientations.length})</summary>
            {orientations.map(item => <p key={item.criterionId}><strong>{item.utName}:</strong> {item.text}</p>)}
          </details>}
          {editing && <form className="action-note-editor" onSubmit={saveNote}>
            <label>Comentari de l’acció
              <textarea ref={noteInput} rows={4} maxLength={4000} value={noteDraft.text} disabled={noteSaving}
                onChange={event => setNoteDraft(current => ({ ...current, text: event.target.value }))} />
            </label>
            <label className="action-note-orientation"><input type="checkbox" checked={noteDraft.orientation} disabled={noteSaving}
              onChange={event => setNoteDraft(current => ({ ...current, orientation: event.target.checked }))} /> Marca com a orientació o mesura educativa</label>
            <small>Les orientacions reapareixen en avaluar aquesta acció en una UT posterior. Per eliminar el comentari, buida el text i desa.</small>
            {noteError && <p role="alert">{noteError}</p>}
            <div className="action-note-buttons">
              <button type="button" className="secondary-action compact" disabled={noteSaving} onClick={closeNote}>Cancel·lar</button>
              <button type="submit" className="primary-action compact" disabled={noteSaving}>{noteSaving ? 'Desant…' : 'Desar comentari'}</button>
            </div>
          </form>}
          </div>
        })}</div>
      </> : <p>Encara no has seleccionat accions per a aquest criteri en aquesta UT.</p>}
      {onConfigure && <button className="secondary-action compact" type="button" disabled={busy} onClick={configureAfterSave} tabIndex={-1}>Escollir accions de la UT</button>}
    </section>
    <h3>Nota del criteri</h3>
    {actions.length ? <>
      <div className="action-criterion-result" role="status"><strong className={gradeClassName(summary.value)}>{summary.value || 'Sense nota'}</strong>
        <span>{summary.evaluated}/{summary.total} accions qualificades{summary.provisional ? ' · Nota provisional' : ''}</span>
      </div>
      <button className="primary-action" type="button" disabled={busy || noteSaving || !onNext} onClick={() => afterGradesSaved(onNext)}>{nextLabel || 'Últim alumne'}</button>
    </> : <div className="criterion-grade-options" role="group" aria-label="Nota del criteri">
      {GRADE_OPTIONS.map(grade => <button key={grade} type="button" disabled={busy} aria-pressed={value === grade}
        className={gradeClassName(grade)} onClick={() => save(grade)}>{grade || 'Esborrar'}</button>)}
    </div>}
    {gradeError && <p role="alert">{gradeError} Torna-ho a provar amb «Tancar» o canviant una nota.</p>}
    {savingGrades && <p role="status">Desant les qualificacions…</p>}
    {error && <p role="alert">{error}</p>}
    {busy && <p role="status">Desant els canvis… Pots tancar la finestra.</p>}
    <div className="evaluation-actions-footer"><button className="secondary-action" type="button" onClick={closeAfterSave}>Tancar</button>

    </div>
  </Modal>
}
