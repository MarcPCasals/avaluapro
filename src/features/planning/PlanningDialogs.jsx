import { useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Modal } from '../../components/Modal'
import { PlanningDiversityEditor } from './PlanningDiversityEditor'

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

function PlanningDialog({ children, error, onClose, onSubmit, size = 'md', submitLabel, title }) {
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
    <Modal onClose={onClose} panelClassName="planning-dialog" size={size} title={title}>
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

function materialDrafts(initialValue) {
  const teacher = (initialValue?.teacherMaterials || []).map((material) => ({ ...material, audience: 'teacher' }))
  const students = (initialValue?.studentMaterials || []).map((material) => ({ ...material, audience: 'students' }))
  return [...teacher, ...students]
}

export function ActivityDialog({ availableIndicators = [], classes = [], initialPhaseId = '', initialValue, onClose, onSave, phases, students = [] }) {
  const [values, setValues] = useState(() => ({
    description: initialValue?.description || '',
    evidenceMode: initialValue?.evidenceMode || 'none',
    grouping: initialValue?.grouping || '',
    hasTiming: initialValue?.plannedMinutes !== null && initialValue?.plannedMinutes !== undefined,
    phaseId: initialValue?.phaseId || initialPhaseId || phases[0]?.id || '',
    plannedMinutes: initialValue?.plannedMinutes || '',
    space: initialValue?.space || '',
    title: initialValue?.title || '',
    type: initialValue?.type || 'activity',
  }))
  const [materials, setMaterials] = useState(() => materialDrafts(initialValue))
  const [indicatorIds, setIndicatorIds] = useState(() => initialValue?.indicatorIds || [])
  const [diversityMeasures, setDiversityMeasures] = useState(() => initialValue?.diversityMeasures || [])
  const updateMaterial = (index, field, value) => setMaterials((items) => items.map((item, itemIndex) => (
    itemIndex === index ? { ...item, [field]: value } : item
  )))
  const addMaterial = () => setMaterials((items) => [...items, {
    audience: 'teacher',
    id: globalThis.crypto?.randomUUID?.() || `material-${Date.now()}`,
    kind: 'link',
    label: '',
    url: '',
  }])
  const save = () => {
    const normalizedMaterials = materials.map((material) => ({
      id: material.id,
      kind: material.kind,
      label: material.label,
      url: material.kind === 'link' ? material.url : '',
    }))
    return onSave({
      ...values,
      evidenceMode: values.type === 'activity' ? values.evidenceMode : 'none',
      plannedMinutes: values.hasTiming ? Number(values.plannedMinutes) : null,
      indicatorIds,
      diversityMeasureIds: diversityMeasures.map((measure) => measure.id),
      diversityMeasures,
      studentMaterials: normalizedMaterials.filter((_, index) => materials[index].audience === 'students'),
      teacherMaterials: normalizedMaterials.filter((_, index) => materials[index].audience === 'teacher'),
    }, initialValue)
  }

  return (
    <PlanningDialog onClose={onClose} onSubmit={save} size="lg" submitLabel={initialValue ? 'Desar element' : 'Afegir a la seqüència'} title={initialValue ? 'Editar element' : 'Nou element de la seqüència'}>
      <div className="planning-form-row">
        <label>Tipus<select value={values.type} onChange={(event) => setValues({ ...values, type: event.target.value })}>
          <option value="activity">Activitat</option>
          <option value="indication">Indicació</option>
          <option value="transition">Pausa o transició</option>
        </select></label>
        <label>Fase<select required value={values.phaseId} onChange={(event) => setValues({ ...values, phaseId: event.target.value })}>
          {phases.map((phase) => <option key={phase.id} value={phase.id}>{phase.title}</option>)}
        </select></label>
      </div>
      <label>Títol<input autoFocus required value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} /></label>
      <label>Descripció<textarea rows="3" value={values.description} onChange={(event) => setValues({ ...values, description: event.target.value })} /></label>
      <div className="planning-timing-fields">
        <label className="planning-check-label"><input checked={values.hasTiming} onChange={(event) => setValues({ ...values, hasTiming: event.target.checked })} type="checkbox" />Té temporització</label>
        {values.hasTiming && <label>Minuts previstos<input min="1" required type="number" value={values.plannedMinutes} onChange={(event) => setValues({ ...values, plannedMinutes: event.target.value })} /></label>}
      </div>
      <div className="planning-form-row">
        <label>Agrupament<input placeholder="Individual, parelles, grups…" value={values.grouping} onChange={(event) => setValues({ ...values, grouping: event.target.value })} /></label>
        <label>Espai<input placeholder="Aula, laboratori…" value={values.space} onChange={(event) => setValues({ ...values, space: event.target.value })} /></label>
      </div>
      {values.type === 'activity' && <label>Seguiment de la tasca<select value={values.evidenceMode} onChange={(event) => setValues({ ...values, evidenceMode: event.target.value })}>
        <option value="none">No cal registrar entrega</option>
        <option value="final">Comprovar al final de l’activitat</option>
        <option value="perSession">Comprovar a cada sessió</option>
      </select></label>}
      {values.type === 'activity' && availableIndicators.length > 0 && (
        <fieldset className="planning-indicator-picker">
          <legend>Indicadors associats</legend>
          <div>{availableIndicators.map((indicator) => (
            <label key={indicator.id}><input checked={indicatorIds.includes(indicator.id)} onChange={(event) => setIndicatorIds((current) => event.target.checked ? [...current, indicator.id] : current.filter((id) => id !== indicator.id))} type="checkbox" />{indicator.label}</label>
          ))}</div>
        </fieldset>
      )}
      {values.type === 'activity' && (
        <PlanningDiversityEditor classes={classes} measures={diversityMeasures} onChange={setDiversityMeasures} students={students} />
      )}
      <section className="planning-material-editor">
        <div><div><strong>Materials</strong><span>Enllaços externs o referències físiques.</span></div><button className="secondary-action compact" onClick={addMaterial} type="button"><Plus size={15} />Afegir</button></div>
        {materials.map((material, index) => (
          <div className="planning-material-row" key={material.id || index}>
            <select aria-label="Destinatari del material" value={material.audience} onChange={(event) => updateMaterial(index, 'audience', event.target.value)}>
              <option value="teacher">Docent</option><option value="students">Alumnat</option>
            </select>
            <select aria-label="Tipus de material" value={material.kind} onChange={(event) => updateMaterial(index, 'kind', event.target.value)}>
              <option value="link">Enllaç</option><option value="physical">Material físic</option>
            </select>
            <input aria-label="Nom del material" placeholder="Nom" required value={material.label} onChange={(event) => updateMaterial(index, 'label', event.target.value)} />
            {material.kind === 'link' && <input aria-label="Enllaç del material" placeholder="https://…" required type="url" value={material.url || ''} onChange={(event) => updateMaterial(index, 'url', event.target.value)} />}
            <button aria-label="Eliminar material" className="icon-action" onClick={() => setMaterials((items) => items.filter((_, itemIndex) => itemIndex !== index))} type="button"><Trash2 size={15} /></button>
          </div>
        ))}
      </section>
    </PlanningDialog>
  )
}
