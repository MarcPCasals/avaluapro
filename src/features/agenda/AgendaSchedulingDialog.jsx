import { useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowLeft, CalendarCheck2, CheckCircle2, Clock3, Layers3,
  Loader2, Sparkles,
} from 'lucide-react'
import { Modal } from '../../components/Modal'
import { buildTimetableSessionCandidates } from '../../domain/planning'

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

function groupPreviewSessions(sessions = []) {
  const groups = []
  const byLogicalSession = new Map()
  for (const bundle of sessions) {
    const key = bundle.logicalSessionIndex == null
      ? `physical:${bundle.session.id}`
      : `logical:${bundle.logicalSessionIndex}`
    let group = byLogicalSession.get(key)
    if (!group) {
      group = []
      byLogicalSession.set(key, group)
      groups.push(group)
    }
    group.push(bundle)
  }
  return groups
}

function getAvailableStartDates(setup, academicYear) {
  if (!setup || !academicYear) return []
  const proposal = buildTimetableSessionCandidates({
    calendarEvents: setup.calendarEvents,
    classId: setup.application.classId,
    subject: setup.application.subject,
    from: academicYear.startsOn,
    slotsByTimetableId: setup.slotsByTimetableId,
    timetables: setup.timetables,
    to: setup.temporalUnit?.endsOn || academicYear.endsOn,
  })
  const timesByDate = new Map()
  for (const candidate of proposal.candidates) {
    const times = timesByDate.get(candidate.date) || []
    timesByDate.set(candidate.date, [...new Set([...times, candidate.startsAt.slice(11, 16)])])
  }
  return [...timesByDate].map(([date, times]) => ({ date, times }))
}

export function AgendaSchedulingDialog({
  academicYear,
  classes,
  initialClassId = '',
  initialMode = 'progressive',
  initialPlanningUnitId = '',
  initialSubject = '',
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
    classId: initialClassId || classes[0]?.id || '',
    subject: initialSubject,
    mode: initialMode === 'smart' ? 'smart' : 'progressive',
    planningUnitId: initialPlanningUnitId || availableUnits[0]?.id || '',
    startDate: initialStartDate(academicYear, today),
  }))
  const [setup, setSetup] = useState(null)
  const [selectedActivityIds, setSelectedActivityIds] = useState([])
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  const unavailableActivityIds = setup?.unavailableSourceActivityIds
    || setup?.scheduledSourceActivityIds
    || []
  const remainingActivities = setup?.activities.filter((activity) =>
    !unavailableActivityIds.includes(activity.id)) || []
  const completedActivityIds = setup?.completedSourceActivityIds || []
  const smartActivities = setup?.activities.filter((activity) =>
    !completedActivityIds.includes(activity.id)) || []
  const selectedClass = classes.find((item) => item.id === values.classId)
  const selectedUnit = availableUnits.find((item) => item.id === values.planningUnitId)
  const availableStartDates = useMemo(
    () => getAvailableStartDates(setup, academicYear),
    [academicYear, setup],
  )
  const previewSessionGroups = groupPreviewSessions(preview?.sessions)
  const firstOverflow = preview?.unscheduled?.[0] || null
  const firstOverflowIsPartial = Boolean(firstOverflow && preview.scheduledActivityIds?.includes(firstOverflow.activityId))
  const canConfirmPartial = Boolean(
    ['complete', 'smart'].includes(preview?.schedulingMode)
    && preview.sessions.length > 0
    && preview.unscheduled.length > 0,
  )

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
      const unavailableIds = nextSetup.unavailableSourceActivityIds
        || nextSetup.scheduledSourceActivityIds
        || []
      const remaining = nextSetup.activities.filter((activity) =>
        !unavailableIds.includes(activity.id))
      const nextStartDates = getAvailableStartDates(nextSetup, academicYear)
      if (nextStartDates.length === 0) {
        throw new Error('Aquest grup no té cap classe disponible a l’horari abans del final de la UT.')
      }
      setSetup(nextSetup)
      setValues((current) => ({
        ...current,
        startDate: nextStartDates.find((item) => item.date >= current.startDate)?.date
          || nextStartDates[0].date,
      }))
      setSelectedActivityIds(values.mode === 'smart'
        ? nextSetup.activities
          .filter((activity) => !(nextSetup.completedSourceActivityIds || []).includes(activity.id))
          .map((activity) => activity.id)
        : remaining.slice(0, 1).map((activity) => activity.id))
    } catch (loadError) {
      setError(loadError.message || 'No s’ha pogut carregar la seqüència.')
    } finally {
      setBusy(false)
    }
  }

  const changeSubject = (subject) => {
    const nextSetup = { ...setup, application: { ...setup.application, subject } }
    const dates = getAvailableStartDates(nextSetup, academicYear)
    setSetup(nextSetup)
    setPreview(null)
    setError('')
    setValues((current) => ({ ...current, subject,
      startDate: dates.find((item) => item.date >= current.startDate)?.date || dates[0]?.date || current.startDate,
    }))
  }

  const changeMode = (mode) => {
    setValues((current) => ({
      ...current,
      mode,
    }))
    setPreview(null)
    if (!setup) return
    setSelectedActivityIds(mode === 'smart'
      ? smartActivities.map((activity) => activity.id)
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
      setPreview(onBuildPreview(setup, {
        mode: values.mode,
        selectedActivityIds,
        startDate: values.startDate,
      }))
    } catch (previewError) {
      setError(previewError.message || 'No s’ha pogut preparar la proposta.')
    }
  }

  const confirm = async () => {
    setBusy(true)
    setConfirming(true)
    setError('')
    try {
      const result = await onConfirm(preview)
      onSaved(result)
      onClose()
    } catch (saveError) {
      setError(saveError.message || 'No s’ha pogut desar la calendarització.')
    } finally {
      setConfirming(false)
      setBusy(false)
    }
  }

  const closeDialog = () => {
    if (!busy) onClose()
  }

  if (availableUnits.length === 0) {
    return (
      <Modal onClose={closeDialog} panelClassName="agenda-dialog agenda-scheduling-dialog" size="lg" title="Calendaritzar una UP">
        <div className="agenda-schedule-empty"><Layers3 size={30} /><strong>Encara no hi ha cap UP disponible</strong><p>Crea la programació i les seves activitats abans de connectar-la amb un grup.</p></div>
        <div className="modal-actions"><button className="primary-action" onClick={onClose} type="button">Entesos</button></div>
      </Modal>
    )
  }

  return (
    <Modal onClose={closeDialog} panelClassName="agenda-dialog agenda-scheduling-dialog" size="xl" title="Calendaritzar una UP">
      <div className="agenda-schedule-body">
        <section className="agenda-schedule-config">
          <div className="agenda-schedule-intro"><Sparkles size={19} /><div><strong>De la seqüència ideal a les dates reals</strong><p>{values.mode === 'smart' ? 'Reorganitzarem només les sessions futures; les sessions impartides o amb dades es conservaran.' : 'Primer revises la proposta. Les sessions només es creen quan la confirmes.'}</p></div></div>
          <div className="agenda-form-row">
            <label>Programació<select disabled={Boolean(setup)} value={values.planningUnitId} onChange={(event) => resetProposal({ planningUnitId: event.target.value })}>{availableUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.code} · {unit.title}</option>)}</select></label>
            <label>Grup<select disabled={Boolean(setup)} value={values.classId} onChange={(event) => resetProposal({ classId: event.target.value })}><option value="">Selecciona un grup</option>{classes.map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.name}</option>)}</select></label>
          </div>
          <fieldset className="agenda-schedule-modes">
            <legend>Com vols avançar?</legend>
            <label className={values.mode === 'progressive' ? 'selected' : ''}><input checked={values.mode === 'progressive'} name="schedule-mode" onChange={() => changeMode('progressive')} type="radio" /><span><strong>Progressivament</strong><small>Afegeix només les pendents que triïs, sense refer les sessions futures.</small></span></label>
            <label className={values.mode === 'smart' ? 'selected' : ''}><input checked={values.mode === 'smart'} name="schedule-mode" onChange={() => changeMode('smart')} type="radio" /><span><strong>Proposta completa intel·ligent</strong><small>Crea o actualitza tota la planificació futura amb la Programació actual.</small></span></label>
          </fieldset>
          {!setup ? (
            <button className="primary-action agenda-schedule-load" disabled={busy || !values.classId || !values.planningUnitId} onClick={loadSequence} type="button">{busy ? <Loader2 className="spin" size={17} /> : <Layers3 size={17} />}Carregar la seqüència</button>
          ) : (
            <div className="agenda-schedule-context"><div><span>UP</span><strong>{selectedUnit?.code} · {selectedUnit?.title}</strong></div><div><span>Grup</span><strong>{selectedClass?.name}</strong></div><button onClick={() => resetProposal({})} type="button"><ArrowLeft size={14} />Canviar</button></div>
          )}
          {setup && <label>Matèria de la calendarització<select required value={setup.application.subject || ''} onChange={(event) => changeSubject(event.target.value)}><option value="">Selecciona una matèria</option>{[...new Set([...setup.subjects, setup.application.subject].filter(Boolean))].map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select><small>Les activitats només s’assignen a les franges d’aquesta matèria.</small></label>}
          {setup && <label>Primera classe de la programació<select value={values.startDate} onChange={(event) => { setValues({ ...values, startDate: event.target.value }); setPreview(null) }}>{availableStartDates.map((item) => <option key={item.date} value={item.date}>{formatDate(item.date)} · {item.times.join(' i ')}</option>)}</select><small>Només es mostren dies en què aquest grup té aquesta matèria; els festius i les anul·lacions queden exclosos.</small></label>}
          {setup && (
            <div className="agenda-activity-picker">
              <header><div><strong>{values.mode === 'smart' ? 'Seqüència futura que es crearà o actualitzarà' : 'Activitats pendents'}</strong><span>{values.mode === 'smart' ? `${smartActivities.length} pendents · ${completedActivityIds.length} fetes queden intactes` : `${remainingActivities.length} per calendaritzar · ${unavailableActivityIds.length} ja programades o fetes`}</span></div>{values.mode === 'progressive' && <small>Marca les que vols afegir ara</small>}</header>
              {(values.mode === 'smart' ? smartActivities : remainingActivities).length === 0 ? <div className="agenda-all-scheduled"><CheckCircle2 size={18} />No queda cap activitat pendent per calendaritzar.</div> : <div>{(values.mode === 'smart' ? smartActivities : remainingActivities).map((activity) => {
                const remainingMinutes = setup.remainingMinutesByActivityId[activity.id]
                const timeLabel = remainingMinutes && remainingMinutes !== activity.plannedMinutes
                  ? `${remainingMinutes} de ${activity.plannedMinutes} min pendents`
                  : activity.plannedMinutes ? `${activity.plannedMinutes} min` : 'Sense temps'
                return <label key={activity.id}><input checked={selectedActivityIds.includes(activity.id)} disabled={values.mode === 'smart'} onChange={(event) => toggleActivity(activity.id, event.target.checked)} type="checkbox" /><span><strong>{activity.title}</strong><small>{values.mode === 'smart' ? (activity.plannedMinutes ? `${activity.plannedMinutes} min` : 'Sense temps') : timeLabel}{activity.type === 'indication' ? ' · indicació' : ''}</small></span></label>
              })}</div>}
            </div>
          )}
        </section>

        <section className="agenda-schedule-preview">
          {!preview ? (
            <div className="agenda-preview-placeholder"><CalendarCheck2 size={32} /><strong>La previsualització apareixerà aquí</strong><p>Veuràs cada data, els fragments d’activitat i els dies que s’han saltat abans de desar res.</p>{setup && (values.mode === 'smart' || remainingActivities.length > 0) && <button className="secondary-action" disabled={selectedActivityIds.length === 0} onClick={buildPreview} type="button"><Sparkles size={16} />{values.mode === 'smart' ? 'Calcular proposta completa' : 'Previsualitzar proposta'}</button>}</div>
          ) : (
            <div className="agenda-preview-result">
              <header><div><span>Proposta</span><h3>{preview.logicalSessionCount ?? preview.sessions.length} {(preview.logicalSessionCount ?? preview.sessions.length) === 1 ? 'sessió de la UP' : 'sessions de la UP'}</h3></div><button onClick={() => setPreview(null)} type="button">Modificar</button></header>
              <div className="agenda-preview-summary"><span><CalendarCheck2 size={15} />{preview.scheduledActivityIds.length} activitats</span><span><Clock3 size={15} />{preview.scheduledMinutes} min</span><span><Layers3 size={15} />{preview.skippedDates.length} dates saltades</span>{preview.physicalSessionCount > preview.logicalSessionCount && <span><Layers3 size={15} />{preview.physicalSessionCount} franges reals amb mitjos grups</span>}</div>
              {preview.availability && <div className="agenda-capacity-summary"><CalendarCheck2 size={18} /><div><strong>Capacitat real fins al final de la UT</strong><p><b>{preview.availability.availableLogicalSessionCount}</b> sessions disponibles per a les activitats de la Programació.</p></div></div>}
              {preview.kind === 'reflow' && <div className="agenda-reflow-summary"><Sparkles size={18} /><div><strong>Planificació futura actualitzada</strong><p>{preview.replacedItemCount} fragments previstos es substituiran · {preview.lockedSessionCount} sessions impartides o amb dades quedaran intactes.</p></div></div>}
              {preview.skippedDates.length > 0 && <div className="agenda-skipped-dates"><strong>Calendari respectat</strong><p>{preview.skippedDates.map((item) => `${formatDate(item.date)} · ${item.titles.join(', ')}`).join(' · ')}</p></div>}
              <div className="agenda-proposed-sessions">{previewSessionGroups.map((group) => {
                const bundle = group[0]
                const isParallel = group.length > 1
                const assignedMinutes = [...bundle.existingItems, ...bundle.items]
                  .reduce((total, item) => total + (Number(item.plannedMinutes) || 0), 0)
                const freeMinutes = Math.max(0, bundle.programmableMinutes - assignedMinutes)
                return <article className={`${isParallel ? 'parallel' : ''} ${freeMinutes > 0 ? 'underfilled' : ''}`} key={group.map((item) => item.session.id).join(':')}><div className="agenda-proposed-date"><span>{formatDate(bundle.candidate.date)}</span><strong>{isParallel ? 'Mitjos grups' : bundle.candidate.startsAt.slice(11, 16)}</strong><small>{bundle.session.durationMinutes} min · {bundle.programmableMinutes} programables{!isParallel && bundle.candidate.subgroupId ? ` · ${bundle.candidate.subgroupId}` : ''}{!isParallel && bundle.candidate.space ? ` · ${bundle.candidate.space}` : ''}{bundle.isExisting ? (preview.kind === 'reflow' ? ' · reorganitzada' : ' · ja creada') : ''}</small>{freeMinutes > 0 && <em><AlertTriangle size={12} />{freeMinutes} min lliures</em>}{isParallel && <div className="agenda-parallel-slots">{group.map((item) => <span key={item.session.id}>{item.candidate.startsAt.slice(11, 16)} · {item.candidate.subgroupId}{item.candidate.space ? ` · ${item.candidate.space}` : ''}</span>)}</div>}</div><ol>{bundle.existingItems.map((item) => <li className="existing" key={item.id}><span>{item.title}</span><small>{item.plannedMinutes ? `${item.plannedMinutes} min` : 'sense temps'} · ja assignada</small></li>)}{bundle.items.map((item) => <li key={item.id}><span>{item.title}</span><small>{item.plannedMinutes ? `${item.plannedMinutes} min` : 'sense temps'}{item.segmentCount > 1 ? ` · part ${item.segmentIndex}/${item.segmentCount}` : ''}{isParallel ? ' · es duplica als dos mitjos grups' : ''}</small></li>)}</ol></article>
              })}</div>
              {preview.unscheduled.length > 0 ? <div className="agenda-preview-warning agenda-overflow-warning"><AlertTriangle size={18} /><div><strong>{firstOverflowIsPartial ? `«${firstOverflow.title}» només hi cap en part` : `A partir de «${firstOverflow.title}» ja no hi ha prou sessions`}</strong><p>{['complete', 'smart'].includes(preview.schedulingMode) ? 'La part que hi cap es pot confirmar. La resta continuarà visible a la Programació, però no es crearà a la calendarització real.' : 'Cal deixar més sessions disponibles o ajustar les activitats abans de confirmar la proposta.'}</p><ol>{preview.unscheduled.map((item, index) => <li key={item.activityId}><span>{item.title}</span><small>{index === 0 && firstOverflowIsPartial ? `${item.remainingMinutes} min queden fora` : item.remainingMinutes ? `${item.remainingMinutes} min · fora de la calendarització` : 'Fora de la calendarització'}</small></li>)}</ol></div></div> : <div className="agenda-preview-ready"><CheckCircle2 size={18} /><div><strong>Proposta completa</strong><p>No s’ha perdut ni duplicat cap activitat seleccionada.</p></div></div>}
            </div>
          )}
        </section>
        {error && <p className="agenda-inline-error agenda-schedule-error">{error}</p>}
      </div>
      {confirming && <div aria-live="polite" className="agenda-schedule-syncing" role="status"><Loader2 className="spin" size={19} /><div><strong>Sincronitzant la programació amb la teva Agenda…</strong><span>Estem creant i actualitzant totes les sessions. Pot trigar uns instants.</span></div></div>}
      <div className="modal-actions">
        <button className="secondary-action" disabled={busy} onClick={onClose} type="button">Cancel·lar</button>
        <button className="primary-action" disabled={busy || !preview || (preview.unscheduled.length > 0 && !canConfirmPartial) || (preview.kind !== 'reflow' && preview.sessions.length === 0)} onClick={confirm} type="button">{busy ? <Loader2 className="spin" size={17} /> : <CalendarCheck2 size={17} />}{confirming ? 'Sincronitzant…' : canConfirmPartial ? 'Confirmar fins on arriba' : preview?.kind === 'reflow' ? 'Confirmar proposta intel·ligent' : 'Confirmar i crear les sessions'}</button>
      </div>
    </Modal>
  )
}
