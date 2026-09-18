import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '../../components/Modal'

function DialogActions({ busy, onClose, submitLabel }) {
  return (
    <div className="modal-actions">
      <button className="secondary-action" disabled={busy} onClick={onClose} type="button">Cancel·lar</button>
      <button className="primary-action" disabled={busy} form="planning-dialog-form" type="submit">
        {busy && <Loader2 className="spin" size={17} />}
        {submitLabel}
      </button>
    </div>
  )
}

function PlanningDialog({ children, error, onClose, onSubmit, submitLabel, title }) {
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState('')
  const handleSubmit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setLocalError('')
    try {
      await onSubmit()
      onClose()
    } catch (submitError) {
      setLocalError(submitError.message || 'No s’ha pogut desar.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal onClose={onClose} panelClassName="planning-dialog" title={title}>
      <form className="planning-dialog-form" id="planning-dialog-form" onSubmit={handleSubmit}>
        {children}
        {(localError || error) && <p className="planning-inline-error">{localError || error}</p>}
      </form>
      <DialogActions busy={busy} onClose={onClose} submitLabel={submitLabel} />
    </Modal>
  )
}

export function AcademicYearDialog({ onClose, onSave }) {
  const today = new Date()
  const currentYear = today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1
  const [values, setValues] = useState({
    endsOn: `${currentYear + 1}-06-30`,
    label: `${currentYear}-${currentYear + 1}`,
    startsOn: `${currentYear}-09-01`,
  })
  return (
    <PlanningDialog onClose={onClose} onSubmit={() => onSave(values)} submitLabel="Crear curs" title="Nou curs acadèmic">
      <label>Nom del curs<input autoFocus required value={values.label} onChange={(event) => setValues({ ...values, label: event.target.value })} /></label>
      <div className="planning-form-row">
        <label>Comença<input required type="date" value={values.startsOn} onChange={(event) => setValues({ ...values, startsOn: event.target.value })} /></label>
        <label>Acaba<input required type="date" value={values.endsOn} onChange={(event) => setValues({ ...values, endsOn: event.target.value })} /></label>
      </div>
    </PlanningDialog>
  )
}

export function TemporalUnitDialog({ initialValue, onClose, onSave }) {
  const [values, setValues] = useState(() => ({
    endsOn: initialValue?.endsOn || '',
    label: initialValue?.label || '',
    startsOn: initialValue?.startsOn || '',
  }))
  return (
    <PlanningDialog onClose={onClose} onSubmit={() => onSave(values)} submitLabel={initialValue ? 'Desar canvis' : 'Crear UT'} title={initialValue ? 'Editar UT' : 'Nova unitat temporal'}>
      <label>Nom de la UT<input autoFocus placeholder="Per exemple, UT1" required value={values.label} onChange={(event) => setValues({ ...values, label: event.target.value })} /></label>
      <div className="planning-form-row">
        <label>Comença<input required type="date" value={values.startsOn} onChange={(event) => setValues({ ...values, startsOn: event.target.value })} /></label>
        <label>Acaba<input required type="date" value={values.endsOn} onChange={(event) => setValues({ ...values, endsOn: event.target.value })} /></label>
      </div>
    </PlanningDialog>
  )
}

export function PlanningUnitDialog({ onClose, onSave, temporalUnits }) {
  const [values, setValues] = useState({ code: '', level: '', temporalUnitId: temporalUnits[0]?.id || '', title: '' })
  return (
    <PlanningDialog onClose={onClose} onSubmit={() => onSave(values)} submitLabel="Crear UP" title="Nova unitat de programació">
      <div className="planning-form-row compact">
        <label>Codi<input autoFocus placeholder="UP 1" required value={values.code} onChange={(event) => setValues({ ...values, code: event.target.value })} /></label>
        <label>Nivell<input placeholder="1r d’ESO" required value={values.level} onChange={(event) => setValues({ ...values, level: event.target.value })} /></label>
      </div>
      <label>Títol<input required value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} /></label>
      <label>Unitat temporal<select required value={values.temporalUnitId} onChange={(event) => setValues({ ...values, temporalUnitId: event.target.value })}>
        {temporalUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.label}</option>)}
      </select></label>
    </PlanningDialog>
  )
}

export function PhaseDialog({ initialValue, onClose, onSave, parentPhaseId = '' }) {
  const [values, setValues] = useState(() => ({
    kind: initialValue?.kind || 'custom',
    parentPhaseId: initialValue?.parentPhaseId || parentPhaseId,
    title: initialValue?.title || '',
  }))
  return (
    <PlanningDialog onClose={onClose} onSubmit={() => onSave(values, initialValue)} submitLabel="Desar fase" title={initialValue ? 'Editar fase' : parentPhaseId ? 'Nova subfase' : 'Nova fase'}>
      <label>Nom<input autoFocus required value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} /></label>
      <label>Tipus<select value={values.kind} onChange={(event) => setValues({ ...values, kind: event.target.value })}>
        <option value="preparation">Preparació</option>
        <option value="resolution">Resolució</option>
        <option value="closing">Tancament</option>
        <option value="custom">Personalitzada</option>
      </select></label>
    </PlanningDialog>
  )
}
