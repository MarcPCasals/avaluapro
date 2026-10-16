import { useDialogSave } from '../../lib/useDialogSave'
import './ActionDialogs.css'
import { useEffect, useState } from 'react'
import { Modal } from '../../components/Modal'
import { GRADE_OPTIONS, gradeClassName } from '../../lib/grades'
import { getActionGradeSummary } from '../../lib/actionGrades'
import { createActionGradeAutosave } from '../../lib/actionGradeAutosave'

export function CriterionGradeModal({ student, competency, criterion, actions, value, mark, utName, onSave, onSaveActions, onClose, onConfigure }) {
  const { busy, error, close, save: runSave } = useDialogSave(onClose, 'No s’han pogut desar les notes.')
  const [grades, setGrades] = useState(() => Object.fromEntries(actions.map(action => [action.id, mark?.actionGrades?.[action.id] || ''])))
  const [autosaveState, setAutosaveState] = useState({ status: 'idle', error: '' })
  const [autosave] = useState(() => createActionGradeAutosave({ save: onSaveActions, onState: setAutosaveState }))
  useEffect(() => { autosave.setSave(onSaveActions) }, [autosave, onSaveActions])
  useEffect(() => {
    autosave.activate()
    return () => autosave.dispose()
  }, [autosave])
  const summary = getActionGradeSummary(criterion, { actionGrades: grades })
  const save = grade => runSave(() => onSave(grade))
  const changeGrade = (actionId, grade) => {
    setGrades(current => ({ ...current, [actionId]: grade }))
    autosave.enqueue({ [actionId]: grade })
  }
  const closeAfterSave = async () => { if (await autosave.flush()) close() }
  const configureAfterSave = async () => { if (await autosave.flush()) onConfigure() }
  return <Modal title={`${criterion.name} · ${utName || 'UT'}`} panelClassName="evaluation-actions-dialog" onClose={closeAfterSave}>
    <p><strong>{student.name}</strong><br />{competency.name}</p>
    <section className="criterion-actions-preview">
      <h3>Accions que s’avaluen en aquesta UT</h3>
      {actions.length ? <>
        <p>Qualifica cada acció. La nota del criteri serà la més baixa: A &gt; B &gt; C &gt; D &gt; NA.</p>
        {value && !mark?.actionGrades && <p className="action-legacy-notice">Nota anterior del criteri: <strong>{value}</strong>. Les accions no hereten aquesta nota; es conservarà fins que qualifiquis una acció.</p>}
        <div className="action-grade-fields">{actions.map(action => <label key={action.id}>
          <span>{!action.id.startsWith('text:') && <strong>{action.id}: </strong>}{action.description}</span>
          <select aria-label={`Nota de ${action.id.startsWith('text:') ? action.description : action.id}`} disabled={!onSaveActions}
            value={grades[action.id] || ''} onChange={event => changeGrade(action.id, event.target.value)}>
            {GRADE_OPTIONS.map(grade => <option key={grade} value={grade}>{grade || 'Pendent'}</option>)}
          </select>
        </label>)}</div>
      </> : <p>Encara no has seleccionat accions per a aquest criteri en aquesta UT.</p>}
      {onConfigure && <button className="secondary-action compact" type="button" disabled={busy} onClick={configureAfterSave}>Escollir accions de la UT</button>}
    </section>
    <h3>Nota del criteri</h3>
    {actions.length ? <>
      <div className="action-criterion-result" role="status"><strong className={gradeClassName(summary.value)}>{summary.value || 'Sense nota'}</strong>
        <span>{summary.evaluated}/{summary.total} accions qualificades{summary.provisional ? ' · Nota provisional' : ''}</span>
      </div>
      <p role="status" aria-live="polite">{autosaveState.status === 'saving' ? 'Desant les notes…' : autosaveState.status === 'saved' ? 'Notes desades.' : autosaveState.status === 'error' ? 'Hi ha notes pendents de desar.' : 'Les notes es desen automàticament en canviar cada acció.'}</p>
      {autosaveState.error && <div role="alert"><p>{autosaveState.error}</p><button className="secondary-action" type="button" onClick={() => autosave.flush()}>Tornar a provar</button></div>}
    </> : <div className="criterion-grade-options" role="group" aria-label="Nota del criteri">
      {GRADE_OPTIONS.map(grade => <button key={grade} type="button" disabled={busy} aria-pressed={value === grade}
        className={gradeClassName(grade)} onClick={() => save(grade)}>{grade || 'Esborrar'}</button>)}
    </div>}
    {error && <p role="alert">{error}</p>}
    {busy && <p role="status">Desant els canvis… Pots tancar la finestra.</p>}
    <div className="evaluation-actions-footer"><button className="secondary-action" type="button" onClick={closeAfterSave}>Tancar</button></div>
  </Modal>
}
