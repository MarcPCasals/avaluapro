import { useMemo, useState } from 'react'
import { CalendarPlus, Copy, Loader2 } from 'lucide-react'
import { Modal } from '../../components/Modal'
import { findTimetableSlotConflicts } from '../../domain/planning'

const EVENT_OPTIONS = [
  ['holiday', 'Festiu'],
  ['nonTeaching', 'Dia no lectiu'],
  ['specialDay', 'Jornada especial'],
  ['extraordinarySession', 'Classe extraordinària o substitució'],
  ['cancellation', 'Classe anul·lada'],
]

const WEEKDAYS = [
  [1, 'Dilluns'],
  [2, 'Dimarts'],
  [3, 'Dimecres'],
  [4, 'Dijous'],
  [5, 'Divendres'],
]

function suggestedVersionStart(academicYear, currentTimetable) {
  if (!currentTimetable) return academicYear?.startsOn || ''
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return academicYear?.startsOn <= today && academicYear?.endsOn >= today
    ? today
    : currentTimetable.effectiveFrom
}

function DialogActions({ busy, onClose, submitLabel }) {
  return (
    <div className="modal-actions">
      <button className="secondary-action" disabled={busy} onClick={onClose} type="button">Cancel·lar</button>
      <button className="primary-action" disabled={busy} form="agenda-dialog-form" type="submit">
        {busy && <Loader2 className="spin" size={17} />}
        {submitLabel}
      </button>
    </div>
  )
}

function AgendaDialog({ children, onClose, onSubmit, size = 'md', submitLabel, title }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const handleSubmit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onSubmit()
      onClose()
    } catch (submitError) {
      setError(submitError.message || 'No s’ha pogut desar.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal onClose={onClose} panelClassName="agenda-dialog" size={size} title={title}>
      <form className="agenda-dialog-form" id="agenda-dialog-form" onSubmit={handleSubmit}>
        {children}
        {error && <p className="agenda-inline-error">{error}</p>}
      </form>
      <DialogActions busy={busy} onClose={onClose} submitLabel={submitLabel} />
    </Modal>
  )
}

export function TimetableDialog({ academicYear, currentTimetable, initialValue, onClose, onSave }) {
  const isEditing = Boolean(initialValue)
  const [values, setValues] = useState(() => ({
    closeCurrent: !isEditing && Boolean(currentTimetable),
    copyCurrent: !isEditing && Boolean(currentTimetable),
    effectiveFrom: initialValue?.effectiveFrom || suggestedVersionStart(academicYear, currentTimetable),
    effectiveTo: initialValue?.effectiveTo || '',
    label: initialValue?.label || (currentTimetable ? 'Nou horari' : 'Horari inicial'),
  }))
  return (
    <AgendaDialog
      onClose={onClose}
      onSubmit={() => onSave(values, initialValue)}
      submitLabel={isEditing ? 'Desar vigència' : 'Crear versió'}
      title={isEditing ? 'Editar versió de l’horari' : 'Nova versió de l’horari'}
    >
      <label>Nom de la versió<input autoFocus required value={values.label} onChange={(event) => setValues({ ...values, label: event.target.value })} /></label>
      <div className="agenda-form-row">
        <label>Vigent des de<input min={academicYear?.startsOn} max={academicYear?.endsOn} required type="date" value={values.effectiveFrom} onChange={(event) => setValues({ ...values, effectiveFrom: event.target.value })} /></label>
        <label>Vigent fins a <span>(opcional)</span><input min={values.effectiveFrom} max={academicYear?.endsOn} type="date" value={values.effectiveTo} onChange={(event) => setValues({ ...values, effectiveTo: event.target.value })} /></label>
      </div>
      {!isEditing && currentTimetable && (
        <div className="agenda-copy-options">
          <Copy size={18} />
          <div>
            <label><input checked={values.copyCurrent} onChange={(event) => setValues({ ...values, copyCurrent: event.target.checked })} type="checkbox" />Copiar les franges de «{currentTimetable.label}»</label>
            <label><input checked={values.closeCurrent} onChange={(event) => setValues({ ...values, closeCurrent: event.target.checked })} type="checkbox" />Tancar la versió anterior el dia abans</label>
          </div>
        </div>
      )}
      <p className="agenda-dialog-help">La versió anterior i les classes ja celebrades es conservaran intactes.</p>
    </AgendaDialog>
  )
}

export function TimetableSlotDialog({ classes, initialPosition, initialValue, onClose, onSave, slots }) {
  const firstClass = classes[0] || null
  const [values, setValues] = useState(() => ({
    classId: initialValue?.classId || firstClass?.id || '',
    durationMinutes: initialValue?.durationMinutes || 60,
    space: initialValue?.space || '',
    startsAt: initialValue?.startsAt || initialPosition?.startsAt || '08:00',
    subject: initialValue?.subject || firstClass?.subject || '',
    subgroupId: initialValue?.subgroupId || '',
    weekday: initialValue?.weekday || initialPosition?.weekday || 1,
  }))
  const selectedClass = classes.find((item) => item.id === values.classId) || null
  const save = () => {
    const candidate = { ...initialValue, ...values, durationMinutes: Number(values.durationMinutes) }
    const conflicts = findTimetableSlotConflicts(slots, candidate)
    if (conflicts.length > 0) throw new Error('Aquesta franja se solapa amb una altra classe del mateix horari.')
    return onSave(candidate, initialValue)
  }
  const selectClass = (classId) => {
    const nextClass = classes.find((item) => item.id === classId)
    setValues((current) => ({
      ...current,
      classId,
      subject: nextClass?.subject || current.subject,
      subgroupId: '',
    }))
  }
  return (
    <AgendaDialog onClose={onClose} onSubmit={save} submitLabel={initialValue ? 'Desar franja' : 'Afegir franja'} title={initialValue ? 'Editar franja' : 'Nova franja lectiva'}>
      <div className="agenda-form-row">
        <label>Dia<select value={values.weekday} onChange={(event) => setValues({ ...values, weekday: Number(event.target.value) })}>{WEEKDAYS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Hora d’inici<input required step="900" type="time" value={values.startsAt} onChange={(event) => setValues({ ...values, startsAt: event.target.value })} /></label>
      </div>
      <div className="agenda-form-row">
        <label>Grup<select required value={values.classId} onChange={(event) => selectClass(event.target.value)}><option value="">Selecciona un grup</option>{classes.map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.name}</option>)}</select></label>
        <label>Durada<select value={values.durationMinutes} onChange={(event) => setValues({ ...values, durationMinutes: Number(event.target.value) })}><option value="60">60 min · 55 programables</option><option value="90">90 min · 85 programables</option><option value="120">120 min · 115 programables</option></select></label>
      </div>
      <label>Assignatura<input required value={values.subject} onChange={(event) => setValues({ ...values, subject: event.target.value })} /></label>
      <div className="agenda-form-row">
        <label>Mig grup<select value={values.subgroupId} onChange={(event) => setValues({ ...values, subgroupId: event.target.value })}><option value="">Grup sencer</option>{(selectedClass?.halfGroups || []).map((group) => <option key={group} value={group}>{group}</option>)}</select></label>
        <label>Aula <span>(opcional)</span><input value={values.space} onChange={(event) => setValues({ ...values, space: event.target.value })} /></label>
      </div>
    </AgendaDialog>
  )
}

export function CalendarEventDialog({ academicYear, classes, initialValue, onClose, onSave, today }) {
  const [values, setValues] = useState(() => ({
    classIds: initialValue?.classIds || [],
    consumesPlannedSession: initialValue?.consumesPlannedSession || false,
    durationMinutes: initialValue?.durationMinutes || 60,
    endsOn: initialValue?.endsOn || initialValue?.startsOn || today,
    reason: initialValue?.reason || '',
    startsOn: initialValue?.startsOn || today,
    startsAt: initialValue?.startsAt || '08:00',
    subgroupId: initialValue?.subgroupId || '',
    title: initialValue?.title || '',
    type: initialValue?.type || 'holiday',
  }))
  const eventLabel = useMemo(() => EVENT_OPTIONS.find(([value]) => value === values.type)?.[1] || '', [values.type])
  const selectedClass = classes.find((classItem) => classItem.id === values.classIds[0]) || null
  const setType = (type) => setValues((current) => ({
    ...current,
    type,
    consumesPlannedSession: type === 'extraordinarySession',
  }))
  const toggleClass = (classId, checked) => setValues((current) => ({
    ...current,
    classIds: checked ? [...current.classIds, classId] : current.classIds.filter((id) => id !== classId),
  }))
  const save = () => onSave(values.type === 'extraordinarySession'
    ? values
    : { ...values, durationMinutes: null, startsAt: null, subgroupId: null }, initialValue)
  return (
    <AgendaDialog onClose={onClose} onSubmit={save} size="lg" submitLabel={initialValue ? 'Desar excepció' : 'Afegir al calendari'} title={initialValue ? 'Editar excepció del calendari' : 'Nova excepció del calendari'}>
      <div className="agenda-event-intro"><CalendarPlus size={19} /><p>Aquesta informació ajusta la calendarització de les UP. Abans de crear cap sessió, Agenda sempre en mostra la proposta.</p></div>
      <label>Tipus<select value={values.type} onChange={(event) => setType(event.target.value)}>{EVENT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Títol<input autoFocus placeholder={eventLabel} required value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} /></label>
      <div className="agenda-form-row">
        <label>Comença<input min={academicYear?.startsOn} max={academicYear?.endsOn} required type="date" value={values.startsOn} onChange={(event) => setValues({ ...values, startsOn: event.target.value, endsOn: event.target.value > values.endsOn ? event.target.value : values.endsOn })} /></label>
        <label>Acaba<input min={values.startsOn} max={academicYear?.endsOn} required type="date" value={values.endsOn} onChange={(event) => setValues({ ...values, endsOn: event.target.value })} /></label>
      </div>
      <fieldset className="agenda-class-picker">
        <legend>Grups afectats</legend>
        <small>Si no en marques cap, l’excepció s’aplica a tots els grups.</small>
        <div>{classes.map((classItem) => <label key={classItem.id}><input checked={values.classIds.includes(classItem.id)} onChange={(event) => toggleClass(classItem.id, event.target.checked)} type="checkbox" />{classItem.name}</label>)}</div>
      </fieldset>
      {values.type === 'extraordinarySession' && <>
        <div className="agenda-form-row">
          <label>Hora d’inici<input required step="900" type="time" value={values.startsAt} onChange={(event) => setValues({ ...values, startsAt: event.target.value })} /></label>
          <label>Durada<select value={values.durationMinutes} onChange={(event) => setValues({ ...values, durationMinutes: Number(event.target.value) })}><option value="60">60 min · 55 programables</option><option value="90">90 min · 85 programables</option><option value="120">120 min · 115 programables</option></select></label>
        </div>
        {values.classIds.length === 1 && (selectedClass?.halfGroups || []).length > 0 && <label>Mig grup<select value={values.subgroupId} onChange={(event) => setValues({ ...values, subgroupId: event.target.value })}><option value="">Grup sencer</option>{selectedClass.halfGroups.map((group) => <option key={group} value={group}>{group}</option>)}</select></label>}
        <label className="agenda-check"><input checked={values.consumesPlannedSession} onChange={(event) => setValues({ ...values, consumesPlannedSession: event.target.checked })} type="checkbox" />Compta com una sessió lectiva extra i avança la seqüència del grup.</label>
      </>}
      <label>Motiu o detall <span>(opcional)</span><textarea rows="3" value={values.reason} onChange={(event) => setValues({ ...values, reason: event.target.value })} /></label>
    </AgendaDialog>
  )
}
