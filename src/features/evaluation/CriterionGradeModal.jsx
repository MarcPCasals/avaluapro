import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { GRADE_OPTIONS, gradeClassName } from '../../lib/grades'

export function CriterionGradeModal({ student, competency, criterion, actions, value, utName, onSave, onClose, onConfigure }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const save = async grade => {
    setBusy(true)
    setError('')
    try { await onSave(grade); onClose() }
    catch (cause) { setError(cause.message || 'No s’ha pogut desar la nota.'); setBusy(false) }
  }
  return <Modal title={`${criterion.name} · ${utName || 'UT'}`} onClose={() => !busy && onClose()}>
    <p><strong>{student.name}</strong><br />{competency.name}</p>
    <section className="criterion-actions-preview">
      <h3>Accions que s’avaluen en aquesta UT</h3>
      {actions.length ? <ul>{actions.map(action => <li key={action.id}>
        {!action.id.startsWith('text:') && <strong>{action.id}: </strong>}{action.description}
      </li>)}</ul> : <p>Encara no has seleccionat accions per a aquest criteri en aquesta UT.</p>}
      {onConfigure && <button className="secondary-action compact" type="button" disabled={busy} onClick={onConfigure}>Escollir accions de la UT</button>}
    </section>
    <h3>Nota del criteri</h3>
    <div className="criterion-grade-options" role="group" aria-label="Nota del criteri">
      {GRADE_OPTIONS.map(grade => <button key={grade} type="button" disabled={busy} aria-pressed={value === grade}
        className={gradeClassName(grade)} onClick={() => save(grade)}>{grade || 'Esborrar'}</button>)}
    </div>
    {error && <p role="alert">{error}</p>}
  </Modal>
}
