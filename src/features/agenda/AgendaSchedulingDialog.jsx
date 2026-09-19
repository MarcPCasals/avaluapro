import { useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowLeft, CalendarCheck2, CheckCircle2, Clock3, Layers3,
  Loader2, Sparkles,
} from 'lucide-react'
import { Modal } from '../../components/Modal'

function formatDate(dateKey) {
  return new Intl.DateTimeFormat('ca-AD', { day: 'numeric', month: 'short', weekday: 'short' })
    .format(new Date(`${dateKey}T12:00:00`))
}

function initialStartDate(academicYear, today) {
  if (!academicYear) return today
  if (today < academicYear.startsOn) return academicYear.startsOn
  if (today > academicYear.endsOn) return academicYear.startsOn
  return today
}

export function AgendaSchedulingDialog({
  academicYear,
  classes,
  onBuildPreview,
  onClose,
  onConfirm,
  onLoadSetup,
  onSaved,
  planningUnits,
  today,
}) {
  const availableUnits = useMemo(() => planningUnits.filter((item) => item.status !== 'archived'), [planningUnits])
  const [values, setValues] = useState(() => ({
    classId: classes[0]?.id || '',
    mode: 'progressive',
    planningUnitId: availableUnits[0]?.id || '',
    startDate: initialStartDate(academicYear, today),
  }))
  const [setup, setSetup] = useState(null)
  const [selectedActivityIds, setSelectedActivityIds] = useState([])
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const remainingActivities = setup?.activities.filter((activity) =>
    !setup.scheduledSourceActivityIds.includes(activity.id)) || []
  const selectedClass = classes.find((item) => item.id === values.classId)
  const selectedUnit = availableUnits.find((item) => item.id === values.planningUnitId)

  const resetProposal = (changes) => {
    setValues((current) => ({ ...current, ...changes }))
    setSetup(null)
    setPreview(null)
    setSelectedActivityIds([])
    setError('')
  }

  const loadSequence = async () => {
    setBusy(true)
    setError('')
    try {
      const nextSetup = await onLoadSetup(values)
      const remaining = nextSetup.activities.filter((activity) =>
        !nextSetup.scheduledSourceActivityIds.includes(activity.id))
      setSetup(nextSetup)
      setSelectedActivityIds(values.mode === 'complete'
        ? remaining.map((activity) => activity.id)
        : remaining.slice(0, 1).map((activity) => activity.id))
    } catch (loadError) {
      setError(loadError.message || 'No s’ha pogut carregar la seqüència.')
    } finally {
      setBusy(false)
    }
  }

  const changeMode = (mode) => {
    setValues((current) => ({ ...current, mode }))
    setPreview(null)
    if (!setup) return
    setSelectedActivityIds(mode === 'complete'
      ? remainingActivities.map((activity) => activity.id)
      : remainingActivities.slice(0, 1).map((activity) => activity.id))
  }

  const toggleActivity = (activityId, checked) => {
    setPreview(null)
    setSelectedActivityIds((current) => checked
      ? [...new Set([...current, activityId])]
      : current.filter((id) => id !== activityId))
  }

  const buildPreview = () => {
    setError('')
    try {
      setPreview(onBuildPreview(setup, { selectedActivityIds, startDate: values.startDate }))
    } catch (previewError) {
      setError(previewError.message || 'No s’ha pogut preparar la proposta.')
    }
  }

  const confirm = async () => {
    setBusy(true)
    setError('')
    try {
      const result = await onConfirm(preview)
      onSaved(result)
      onClose()
    } catch (saveError) {
      setError(saveError.message || 'No s’ha pogut desar la calendarització.')
    } finally {
      setBusy(false)
    }
  }

  if (availableUnits.length === 0) {
    return (
      <Modal onClose={onClose} panelClassName="agenda-dialog agenda-scheduling-dialog" size="lg" title="Calendaritzar una UP">
        <div className="agenda-schedule-empty"><Layers3 size={30} /><strong>Encara no hi ha cap UP disponible</strong><p>Crea la programació i les seves activitats abans de connectar-la amb un grup.</p></div>
        <div className="modal-actions"><button className="primary-action" onClick={onClose} type="button">Entesos</button></div>
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose} panelClassName="agenda-dialog agenda-scheduling-dialog" size="xl" title="Calendaritzar una UP">
      <div className="agenda-schedule-body">
        <section className="agenda-schedule-config">
          <div className="agenda-schedule-intro"><Sparkles size={19} /><div><strong>De la seqüència ideal a les dates reals</strong><p>Primer revises la proposta. Les sessions només es creen quan la confirmes.</p></div></div>
          <div className="agenda-form-row">
            <label>Programació<select disabled={Boolean(setup)} value={values.planningUnitId} onChange={(event) => resetProposal({ planningUnitId: event.target.value })}>{availableUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.code} · {unit.title}</option>)}</select></label>
            <label>Grup<select disabled={Boolean(setup)} value={values.classId} onChange={(event) => resetProposal({ classId: event.target.value })}><option value="">Selecciona un grup</option>{classes.map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.name}</option>)}</select></label>
          </div>
          <label>Començar a partir de<input min={academicYear?.startsOn} max={academicYear?.endsOn} type="date" value={values.startDate} onChange={(event) => { setValues({ ...values, startDate: event.target.value }); setPreview(null) }} /></label>
          <fieldset className="agenda-schedule-modes">
            <legend>Com vols avançar?</legend>
            <label className={values.mode === 'progressive' ? 'selected' : ''}><input checked={values.mode === 'progressive'} name="schedule-mode" onChange={() => changeMode('progressive')} type="radio" /><span><strong>Progressivament</strong><small>Tria ara només les pròximes activitats.</small></span></label>
            <label className={values.mode === 'complete' ? 'selected' : ''}><input checked={values.mode === 'complete'} name="schedule-mode" onChange={() => changeMode('complete')} type="radio" /><span><strong>Proposta completa</strong><small>Distribueix tota la UP pendent fins al final de curs.</small></span></label>
          </fieldset>
          {!setup ? (
            <button className="primary-action agenda-schedule-load" disabled={busy || !values.classId || !values.planningUnitId} onClick={loadSequence} type="button">{busy ? <Loader2 className="spin" size={17} /> : <Layers3 size={17} />}Carregar la seqüència</button>
          ) : (
            <div className="agenda-schedule-context"><div><span>UP</span><strong>{selectedUnit?.code} · {selectedUnit?.title}</strong></div><div><span>Grup</span><strong>{selectedClass?.name}</strong></div><button onClick={() => resetProposal({})} type="button"><ArrowLeft size={14} />Canviar</button></div>
          )}
          {setup && (
            <div className="agenda-activity-picker">
              <header><div><strong>Activitats pendents</strong><span>{remainingActivities.length} per calendaritzar · {setup.scheduledSourceActivityIds.length} ja assignades</span></div>{values.mode === 'progressive' && <small>Marca les que vols afegir ara</small>}</header>
              {remainingActivities.length === 0 ? <div className="agenda-all-scheduled"><CheckCircle2 size={18} />Tota la UP ja està assignada a aquest grup.</div> : <div>{remainingActivities.map((activity) => <label key={activity.id}><input checked={selectedActivityIds.includes(activity.id)} disabled={values.mode === 'complete'} onChange={(event) => toggleActivity(activity.id, event.target.checked)} type="checkbox" /><span><strong>{activity.title}</strong><small>{activity.plannedMinutes ? `${activity.plannedMinutes} min` : 'Sense temps'}{activity.type === 'indication' ? ' · indicació' : ''}</small></span></label>)}</div>}
            </div>
          )}
        </section>

        <section className="agenda-schedule-preview">
          {!preview ? (
            <div className="agenda-preview-placeholder"><CalendarCheck2 size={32} /><strong>La previsualització apareixerà aquí</strong><p>Veuràs cada data, els fragments d’activitat i els dies que s’han saltat abans de desar res.</p>{setup && remainingActivities.length > 0 && <button className="secondary-action" disabled={selectedActivityIds.length === 0} onClick={buildPreview} type="button"><Sparkles size={16} />Previsualitzar proposta</button>}</div>
          ) : (
            <div className="agenda-preview-result">
              <header><div><span>Proposta</span><h3>{preview.sessions.length} {preview.sessions.length === 1 ? 'sessió afectada' : 'sessions afectades'}</h3></div><button onClick={() => setPreview(null)} type="button">Modificar</button></header>
              <div className="agenda-preview-summary"><span><CalendarCheck2 size={15} />{preview.scheduledActivityIds.length} activitats</span><span><Clock3 size={15} />{preview.sessions.reduce((total, bundle) => total + bundle.items.reduce((sum, item) => sum + (item.plannedMinutes || 0), 0), 0)} min</span><span><Layers3 size={15} />{preview.skippedDates.length} dates saltades</span></div>
              {preview.skippedDates.length > 0 && <div className="agenda-skipped-dates"><strong>Calendari respectat</strong><p>{preview.skippedDates.map((item) => `${formatDate(item.date)} · ${item.titles.join(', ')}`).join(' · ')}</p></div>}
              <div className="agenda-proposed-sessions">{preview.sessions.map((bundle) => <article key={bundle.session.id}><div className="agenda-proposed-date"><span>{formatDate(bundle.candidate.date)}</span><strong>{bundle.candidate.startsAt.slice(11, 16)}</strong><small>{bundle.session.durationMinutes} min · {bundle.programmableMinutes} programables{bundle.isExisting ? ' · ja creada' : ''}</small></div><ol>{bundle.existingItems.map((item) => <li className="existing" key={item.id}><span>{item.title}</span><small>{item.plannedMinutes ? `${item.plannedMinutes} min` : 'sense temps'} · ja assignada</small></li>)}{bundle.items.map((item) => <li key={item.id}><span>{item.title}</span><small>{item.plannedMinutes ? `${item.plannedMinutes} min` : 'sense temps'}{item.segmentCount > 1 ? ` · part ${item.segmentIndex}/${item.segmentCount}` : ''}</small></li>)}</ol></article>)}</div>
              {preview.unscheduled.length > 0 ? <div className="agenda-preview-warning"><AlertTriangle size={18} /><div><strong>Falten sessions a l’horari</strong><p>{preview.unscheduled.map((item) => `${item.title}${item.remainingMinutes ? ` (${item.remainingMinutes} min pendents)` : ''}`).join(' · ')}</p></div></div> : <div className="agenda-preview-ready"><CheckCircle2 size={18} /><div><strong>Proposta completa</strong><p>No s’ha perdut ni duplicat cap activitat seleccionada.</p></div></div>}
            </div>
          )}
        </section>
        {error && <p className="agenda-inline-error agenda-schedule-error">{error}</p>}
      </div>
      <div className="modal-actions">
        <button className="secondary-action" disabled={busy} onClick={onClose} type="button">Cancel·lar</button>
        <button className="primary-action" disabled={busy || !preview || preview.unscheduled.length > 0 || preview.sessions.length === 0} onClick={confirm} type="button">{busy ? <Loader2 className="spin" size={17} /> : <CalendarCheck2 size={17} />}Confirmar i crear les sessions</button>
      </div>
    </Modal>
  )
}
