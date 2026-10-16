import { useDialogSave } from '../../lib/useDialogSave'
import './ActionDialogs.css'
import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { GRADE_OPTIONS, gradeClassName } from '../../lib/grades'
import { getActionGradeSummary } from '../../lib/actionGrades'

export function CriterionGradeModal({ student, competency, criterion, actions, value, mark, utName, onSave, onSaveActions, onClose, onConfigure }) {
  const { busy, error, close, save: runSave } = useDialogSave(onClose, 'No s’han pogut desar les notes.')
  const [grades, setGrades] = useState(() => Object.fromEntries(actions.map(action => [action.id, mark?.actionGrades?.[action.id] || ''])))
  const summary = getActionGradeSummary(criterion, { actionGrades: grades })
  const save = grade => runSave(() => onSave(grade))
  const saveActions = () => runSave(() => onSaveActions(grades))
  return <Modal title={`${criterion.name} · ${utName || 'UT'}`} panelClassName="evaluation-actions-dialog" onClose={close}>
    <p><strong>{student.name}</strong><br />{competency.name}</p>
    <section className="criterion-actions-preview">
      <h3>Accions que s’avaluen en aquesta UT</h3>
      {actions.length ? <>
        <p>Qualifica cada acció. La nota del criteri serà la més baixa: A &gt; B &gt; C &gt; D &gt; NA.</p>
        {value && !mark?.actionGrades && <p className="action-legacy-notice">Nota anterior del criteri: <strong>{value}</strong>. Les accions no hereten aquesta nota; es conservarà fins que desis les notes de les accions.</p>}
        <div className="action-grade-fields">{actions.map(action => <label key={action.id}>
          <span>{!action.id.startsWith('text:') && <strong>{action.id}: </strong>}{action.description}</span>
          <select aria-label={`Nota de ${action.id.startsWith('text:') ? action.description : action.id}`} disabled={busy}
            value={grades[action.id] || ''} onChange={event => setGrades(current => ({ ...current, [action.id]: event.target.value }))}>
            {GRADE_OPTIONS.map(grade => <option key={grade} value={grade}>{grade || 'Pendent'}</option>)}
          </select>
        </label>)}</div>
      </> : <p>Encara no has seleccionat accions per a aquest criteri en aquesta UT.</p>}
      {onConfigure && <button className="secondary-action compact" type="button" disabled={busy} onClick={onConfigure}>Escollir accions de la UT</button>}
    </section>
    <h3>Nota del criteri</h3>
    {actions.length ? <>
      <div className="action-criterion-result" role="status"><strong className={gradeClassName(summary.value)}>{summary.value || 'Sense nota'}</strong>
        <span>{summary.evaluated}/{summary.total} accions qualificades{summary.provisional ? ' · Nota provisional' : ''}</span>
      </div>
      <button className="primary-action" type="button" disabled={busy || !onSaveActions} onClick={saveActions}>{busy ? 'Desant…' : 'Desar notes de les accions'}</button>
    </> : <div className="criterion-grade-options" role="group" aria-label="Nota del criteri">
      {GRADE_OPTIONS.map(grade => <button key={grade} type="button" disabled={busy} aria-pressed={value === grade}
        className={gradeClassName(grade)} onClick={() => save(grade)}>{grade || 'Esborrar'}</button>)}
    </div>}
    {error && <p role="alert">{error}</p>}
    {busy && <p role="status">Desant els canvis… Pots tancar la finestra.</p>}
    <div className="evaluation-actions-footer"><button className="secondary-action" type="button" onClick={close}>Tancar</button></div>
  </Modal>
}
