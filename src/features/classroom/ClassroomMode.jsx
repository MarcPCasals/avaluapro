import { useEffect, useId, useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowLeft, ArrowRight, Bell, Check, CheckCircle2, ClipboardCheck, Clock3,
  Copy, DoorOpen, Loader2, Mail, MessageSquarePlus,
  Pause, PencilLine, Play, Projector, Save, ShieldCheck, ThumbsUp, TimerReset, UserCheck,
  Users, UserX, X,
} from 'lucide-react'
import {
  CLASSROOM_BEHAVIOR_CATEGORIES,
  getClassroomEvidenceItems,
  getClassroomStudents,
  getClassroomTimerState,
  getCorrectedActualMinutes,
} from '../../domain/planning'
import { findAbsenceForSession } from '../../lib/attendance'
import { getClassroomSessionTasks } from '../../lib/classroomTracking'
import { getSessionPersonalReminders } from '../../lib/reminders'
import { isStudentExemptFromSubject } from '../../lib/tutorialExemptions'
import { useDialogAccessibility } from '../../lib/useDialogAccessibility'
import {
  buildRecoveryEmail,
  getRecoverableClassroomItems,
} from '../../lib/classroomRecovery'
import './classroom.css'

function formatClock(seconds) {
  const value = Math.max(0, Number(seconds) || 0)
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}

function formatSessionDate(startsAt) {
  return new Intl.DateTimeFormat('ca-AD', { day: 'numeric', month: 'long', weekday: 'long' })
    .format(new Date(`${String(startsAt).slice(0, 10)}T12:00:00`))
}

function replaceResult(results, nextResult) {
  return results.some((result) => result.id === nextResult.id)
    ? results.map((result) => result.id === nextResult.id ? nextResult : result)
    : [...results, nextResult]
}

const TASK_STATUSES = [
  ['DONE', 'Fet'],
  ['LATE', 'Incompleta'],
  ['MISSING', 'No feta'],
  ['EXEMPT', 'Exempt'],
]

function classroomEvidenceKey(bundle, item) {
  return item.sourceActivity?.evidenceMode === 'perSession'
    ? `${bundle.application.id}:${item.sourceActivityId}:${bundle.session.id}`
    : `${bundle.application.id}:${item.sourceActivityId}:final`
}

function ActivityReviewDialog({ item, onClose, onSave, result }) {
  const titleId = useId()
  const dialogRef = useDialogAccessibility(onClose)
  const [values, setValues] = useState({
    actualMinutes: result?.actualMinutes || '',
    applicationComment: result?.applicationComment || '',
    pedagogicalReflection: result?.pedagogicalReflection || '',
    missingMaterials: (result?.missingMaterials || []).join('\n'),
    usefulAdaptationIds: result?.usefulAdaptationIds || [],
    improvementRecommendation: result?.improvementRecommendation || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const measures = item.sourceActivity?.diversityMeasures || []
  const save = async () => {
    setSaving(true)
    setError('')
    try {
      await onSave({
        actualMinutes: values.actualMinutes === '' ? null : Number(values.actualMinutes),
        applicationComment: values.applicationComment,
        pedagogicalReflection: values.pedagogicalReflection,
        missingMaterials: values.missingMaterials.split('\n').map((value) => value.trim()).filter(Boolean),
        usefulAdaptationIds: values.usefulAdaptationIds,
        improvementRecommendation: values.improvementRecommendation || null,
        status: result?.status || 'completed',
        reviewedAt: new Date().toISOString(),
      })
      onClose()
    } catch (operationError) {
      setError(operationError.message || 'No s’ha pogut desar la revisió.')
    } finally {
      setSaving(false)
    }
  }
  return <div className="classroom-close-backdrop"><section aria-labelledby={titleId} aria-modal="true" className="classroom-review-dialog" ref={dialogRef} role="dialog" tabIndex="-1">
    <header><span><PencilLine size={20} /></span><div><small>Revisió posterior</small><h2 id={titleId}>{item.title}</h2></div></header>
    <div className="classroom-review-grid">
      <label>Temps real (min)<input min="0.1" step="0.1" type="number" value={values.actualMinutes} onChange={(event) => setValues({ ...values, actualMinutes: event.target.value })} /></label>
      <label>Recomanació<select value={values.improvementRecommendation} onChange={(event) => setValues({ ...values, improvementRecommendation: event.target.value })}><option value="">Sense recomanació</option><option value="keep">Conservar</option><option value="modify">Modificar</option><option value="remove">Retirar</option></select></label>
    </div>
    <label>Comentari d’aplicació <span>s’afegirà també a l’activitat de la UP</span><textarea rows="2" value={values.applicationComment} onChange={(event) => setValues({ ...values, applicationComment: event.target.value })} /></label>
    <label>Reflexió pedagògica <span>visible per direcció</span><textarea rows="2" value={values.pedagogicalReflection} onChange={(event) => setValues({ ...values, pedagogicalReflection: event.target.value })} /></label>
    <label>Materials que han faltat <span>un per línia</span><textarea rows="2" value={values.missingMaterials} onChange={(event) => setValues({ ...values, missingMaterials: event.target.value })} /></label>
    {measures.length > 0 && <fieldset><legend>Adaptacions que han funcionat</legend>{measures.map((measure) => <label key={measure.id}><input checked={values.usefulAdaptationIds.includes(measure.id)} onChange={(event) => setValues((current) => ({ ...current, usefulAdaptationIds: event.target.checked ? [...current.usefulAdaptationIds, measure.id] : current.usefulAdaptationIds.filter((id) => id !== measure.id) }))} type="checkbox" />{measure.label}</label>)}</fieldset>}
    {error && <p className="classroom-review-error" role="alert">{error}</p>}
    <div className="classroom-close-actions"><button className="secondary-action" disabled={saving} onClick={onClose} type="button">Cancel·lar</button><button className="primary-action" disabled={saving} onClick={save} type="button">{saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}Desar revisió</button></div>
  </section></div>
}

function RecoveryDialog({ bundle, existing, kind, nextSession, onClose, onSave, student }) {
  const titleId = useId()
  const dialogRef = useDialogAccessibility(onClose)
  const recoverableItems = getRecoverableClassroomItems(bundle.items)
  const existingIds = new Set((existing?.recovery?.activities || []).map((activity) => activity.itemId))
  const [selectedIds, setSelectedIds] = useState(() => existing
    ? recoverableItems.filter((item) => existingIds.has(item.id)).map((item) => item.id)
    : kind === 'absence' ? recoverableItems.map((item) => item.id) : [])
  const selectedItems = recoverableItems.filter((item) => selectedIds.includes(item.id))
  const generatedEmail = buildRecoveryEmail({
    items: selectedItems,
    kind,
    nextSessionStartsAt: nextSession?.startsAt || existing?.recovery?.nextSessionStartsAt || '',
    sessionStartsAt: bundle.session.startsAt,
    student,
    subject: bundle.planningUnit.title,
  })
  const [emailText, setEmailText] = useState(existing?.recovery?.emailText || generatedEmail)
  const [emailTouched, setEmailTouched] = useState(Boolean(existing?.recovery?.emailText))
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const changeSelection = (itemId, checked) => {
    const nextIds = checked ? [...selectedIds, itemId] : selectedIds.filter((id) => id !== itemId)
    setSelectedIds(nextIds)
    if (!emailTouched) {
      setEmailText(buildRecoveryEmail({
        items: recoverableItems.filter((item) => nextIds.includes(item.id)),
        kind,
        nextSessionStartsAt: nextSession?.startsAt || existing?.recovery?.nextSessionStartsAt || '',
        sessionStartsAt: bundle.session.startsAt,
        student,
        subject: bundle.planningUnit.title,
      }))
    }
  }

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      await onSave({ emailText, items: selectedItems, kind, nextSession })
      onClose()
    } catch (operationError) {
      setError(operationError.message || 'No s’ha pogut desar la recuperació.')
    } finally {
      setSaving(false)
    }
  }
  const copy = async () => {
    try {
      if (!globalThis.navigator?.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await globalThis.navigator.clipboard.writeText(emailText)
      setCopied(true)
    } catch {
      setError('No s’ha pogut copiar automàticament. Pots seleccionar el text manualment.')
    }
  }
  return <div className="classroom-close-backdrop"><section aria-labelledby={titleId} aria-modal="true" className="classroom-recovery-dialog" ref={dialogRef} role="dialog" tabIndex="-1">
    <header><span>{kind === 'absence' ? <UserX size={20} /> : <DoorOpen size={20} />}</span><div><small>{kind === 'absence' ? 'Absència completa' : 'Sortida a mitja sessió'}</small><h2 id={titleId}>{student.name}</h2></div></header>
    <p>{kind === 'absence' ? 'Totes les activitats apareixen seleccionades. Desmarca les que no cal recuperar.' : 'Selecciona només les activitats que s’ha perdut des que ha marxat.'}</p>
    <div className="classroom-recovery-activities">{recoverableItems.map((item) => <label key={item.id}><input checked={selectedIds.includes(item.id)} onChange={(event) => changeSelection(item.id, event.target.checked)} type="checkbox" /><span><strong>{item.title}</strong><small>{item.sourceActivity?.evidenceMode !== 'none' ? 'Genera una tasca pendent justificada' : 'Activitat per recuperar'}</small></span></label>)}</div>
    <div className="classroom-recovery-next"><Clock3 size={16} /><span>{nextSession?.startsAt ? `Recordatori programat per a la pròxima sessió: ${String(nextSession.startsAt).slice(0, 10)} · ${String(nextSession.startsAt).slice(11, 16)}` : 'No s’ha trobat una sessió posterior. El pendent quedarà visible des d’avui.'}</span></div>
    <label className="classroom-recovery-email"><span><Mail size={15} />Text de correu per copiar</span><textarea rows="11" value={emailText} onChange={(event) => { setEmailTouched(true); setEmailText(event.target.value) }} /></label>
    {error && <p className="classroom-review-error" role="alert">{error}</p>}
    <div className="classroom-close-actions"><button className="secondary-action" disabled={saving} onClick={onClose} type="button">Cancel·lar</button><button className="secondary-action" disabled={!emailText.trim()} onClick={copy} type="button"><Copy size={15} />{copied ? 'Copiat' : 'Copiar text'}</button><button className="primary-action" disabled={saving} onClick={save} type="button">{saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}Desar registre</button></div>
  </section></div>
}

function ClassroomCloseReviewDialog({
  attendanceConfirmed,
  attendanceIssueDetail,
  attendanceIssueCount,
  busy,
  className,
  onClose,
  onConfirm,
  pendingTaskCount,
  reminderCount,
  sessionTime,
  setSummaryPrivateNote,
  setSummaryReflection,
  summaryPrivateNote,
  summaryReflection,
  showNotes = true,
}) {
  const titleId = useId()
  const dialogRef = useDialogAccessibility(onClose)
  return <div className="classroom-close-backdrop" role="presentation"><section aria-labelledby={titleId} aria-modal="true" className="classroom-close-review" ref={dialogRef} role="dialog" tabIndex="-1">
    <header><span><CheckCircle2 size={21} /></span><div><small>Resum abans de tancar</small><h2 id={titleId}>{className || 'Classe'} · {sessionTime}</h2></div></header>
    <div className="classroom-close-summary">
      <article><strong>{attendanceIssueCount}</strong><span>{attendanceIssueCount === 1 ? 'alumne absent o que ha marxat' : 'alumnes absents o que han marxat'}</span><small>{attendanceIssueDetail || 'Cap absència ni sortida registrada'}</small></article>
      <article><strong>{pendingTaskCount}</strong><span>tasques pendents</span><small>{pendingTaskCount ? 'Inclou les recuperacions justificades de la sessió.' : 'Cap tasca pendent registrada.'}</small></article>
      <article><strong>{reminderCount}</strong><span>recordatoris creats</span><small>{reminderCount ? 'Es conservaran a la capa global de recordatoris.' : 'Cap recordatori nou.'}</small></article>
    </div>
    {showNotes && <div className="classroom-summary-notes"><label>Reflexió pedagògica <span>visible per direcció</span><textarea maxLength="4000" placeholder="Opcional" rows="2" value={summaryReflection} onChange={(event) => setSummaryReflection(event.target.value)} /></label><label>Nota privada <span>només per a tu</span><textarea maxLength="4000" placeholder="Opcional" rows="2" value={summaryPrivateNote} onChange={(event) => setSummaryPrivateNote(event.target.value)} /></label></div>}
    {!attendanceConfirmed && <p className="classroom-close-warning">Encara no has confirmat la llista d’assistència.</p>}
    <div className="classroom-close-actions"><button className="secondary-action" disabled={busy} onClick={onClose} type="button">Continuar la classe</button><button className="primary-action" disabled={busy} onClick={onConfirm} type="button">{busy ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />}Confirmar i tancar</button></div>
  </section></div>
}

function ClassroomTimelineItem({ active, item, position, result, onSelect }) {
  return (
    <button
      className={`classroom-timeline-item ${active ? 'active' : ''} ${result ? 'completed' : ''}`}
      onClick={onSelect}
      type="button"
    >
      <span className="classroom-timeline-dot" />
      <div>
        <small>{position}</small>
        <strong>{item.title}</strong>
        <span>{item.plannedMinutes ? `${item.plannedMinutes} min` : item.type === 'transition' ? 'Transició' : 'Sense temps'}</span>
      </div>
      {result && <Check size={15} />}
    </button>
  )
}

function ClassroomTimingProposalDialog({ actualMinutes, activity, onApply, onKeep }) {
  const titleId = useId()
  const dialogRef = useDialogAccessibility(onKeep)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const apply = async () => {
    setSaving(true)
    setError('')
    try {
      await onApply()
    } catch (operationError) {
      setError(operationError.message || 'No s’ha pogut actualitzar la UP.')
      setSaving(false)
    }
  }
  return <div className="classroom-close-backdrop"><section aria-labelledby={titleId} aria-modal="true" className="classroom-review-dialog" ref={dialogRef} role="dialog" tabIndex="-1">
    <header><span><Clock3 size={20} /></span><div><small>Temps real de Mode aula</small><h2 id={titleId}>Vols ajustar la programació?</h2></div></header>
    <div className="classroom-timing-comparison"><span><small>Previst a la UP</small><strong>{activity.plannedMinutes} min</strong></span><ArrowRight size={20} /><span><small>Temps real</small><strong>{actualMinutes} min</strong></span></div>
    <p>«{activity.title}» ha tingut una durada diferent. Pots actualitzar ara la UP perquè la pròxima calendarització parteixi del teu ritme real.</p>
    {error && <p className="classroom-review-error" role="alert">{error}</p>}
    <div className="classroom-close-actions"><button className="secondary-action" disabled={saving} onClick={onKeep} type="button">Mantenir {activity.plannedMinutes} min</button><button className="primary-action" disabled={saving} onClick={apply} type="button">{saving ? <Loader2 className="spin" size={16} /> : <Clock3 size={16} />}Actualitzar la UP a {actualMinutes} min</button></div>
  </section></div>
}

export function ClassroomMode({
  absenceRecords,
  agendaNotes = [],
  behaviorEvents,
  bundle,
  classes,
  onActivateEvidence,
  onAddBehavior,
  onApplyTimingToPlanning,
  onCancelRecovery,
  onCloseSession,
  onContinue,
  onExit,
  onFindNextSession,
  onSaveRecovery,
  onSaveResult,
  onSavePrivateNote,
  onToggleAbsence,
  onUpdateSession,
  onUpdateTaskRecord,
  students,
  taskRecords,
  tasks,
}) {
  const [currentBundle, setCurrentBundle] = useState(bundle)
  const completedItemIds = useMemo(
    () => new Set(currentBundle.results.filter((result) => ['completed', 'continued', 'skipped'].includes(result.status)).map((result) => result.sessionItemId)),
    [currentBundle.results],
  )
  const pendingIndex = currentBundle.items.findIndex((item) => !completedItemIds.has(item.id))
  const firstPendingIndex = pendingIndex === -1 ? currentBundle.items.length : pendingIndex
  const [currentIndex, setCurrentIndex] = useState(firstPendingIndex)
  const [sidePanel, setSidePanel] = useState(bundle.session.attendanceConfirmedAt ? '' : 'students')
  const [timerStartedAt, setTimerStartedAt] = useState(null)
  const [timerStoppedAt, setTimerStoppedAt] = useState(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [otherMinutes, setOtherMinutes] = useState('')
  const [projectionMode, setProjectionMode] = useState(false)
  const [closeReview, setCloseReview] = useState(false)
  const [reviewItem, setReviewItem] = useState(null)
  const [timingProposal, setTimingProposal] = useState(null)
  const [recoveryDraft, setRecoveryDraft] = useState(null)
  const [selectedStudentIds, setSelectedStudentIds] = useState([])
  const [behaviorKind, setBehaviorKind] = useState('incident')
  const [otherBehavior, setOtherBehavior] = useState('')
  const [showOtherBehavior, setShowOtherBehavior] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const classItem = classes.find((item) => item.id === currentBundle.session.classId)
  const visibleStudents = useMemo(
    () => getClassroomStudents(students, currentBundle.session.classId, currentBundle.session.subgroupId)
      .filter((student) => !isStudentExemptFromSubject(student, classItem?.subject)),
    [classItem?.subject, currentBundle.session.classId, currentBundle.session.subgroupId, students],
  )
  const absentStudents = visibleStudents.filter((student) => findAbsenceForSession(
    absenceRecords,
    student.id,
    currentBundle.session.classId,
    currentBundle.session,
  ))
  const evidenceItems = getClassroomEvidenceItems(currentBundle.items)
  const evidenceKeys = new Set(evidenceItems.map((item) => classroomEvidenceKey(currentBundle, item)))
  const sessionTasks = getClassroomSessionTasks({
    classId: currentBundle.session.classId,
    date: String(currentBundle.session.startsAt).slice(0, 10),
    evidenceKeys,
    tasks,
  })
  const selectedTask = sessionTasks.find((task) => task.id === selectedTaskId) || sessionTasks[0] || null
  const sessionTaskRecords = taskRecords.filter((record) => sessionTasks.some((task) => task.id === record.taskId))
  const pendingTaskRecords = sessionTaskRecords.filter((record) => record.recoveryPending || ['LATE', 'MISSING'].includes(record.status))
  const sessionRecoveryNotes = agendaNotes.filter((note) => note.type === 'activityRecovery' && note.sessionId === currentBundle.session.id)
  const sessionPersonalReminders = getSessionPersonalReminders(agendaNotes, currentBundle.session)
  const departedStudents = visibleStudents.filter((student) => sessionRecoveryNotes.some((note) =>
    note.studentId === student.id && note.recovery?.kind === 'earlyDeparture'))
  const attendanceIssueIds = new Set([...absentStudents, ...departedStudents].map((student) => student.id))
  const attendanceIssueDetail = [
    absentStudents.length ? `Absents: ${absentStudents.map((student) => student.name).join(' · ')}` : '',
    departedStudents.length ? `Han marxat: ${departedStudents.map((student) => student.name).join(' · ')}` : '',
  ].filter(Boolean).join(' — ')
  const reminderCount = sessionTaskRecords.filter((record) => record.reminder && !record.reminder.dismissedAt).length
    + sessionTasks.filter((task) => task.reminder && !task.reminder.dismissedAt).length
    + sessionRecoveryNotes.filter((note) => note.reminder && !note.reminder.dismissedAt).length
    + sessionPersonalReminders.length
  const existingPrivateNote = currentBundle.privateNotes?.[0]?.text || ''
  const reflectionResult = [...currentBundle.results].reverse().find((result) => result.pedagogicalReflection)
  const existingReflection = reflectionResult?.pedagogicalReflection || ''
  const [summaryReflection, setSummaryReflection] = useState(existingReflection)
  const [summaryPrivateNote, setSummaryPrivateNote] = useState(existingPrivateNote)
  const currentItem = currentBundle.items[currentIndex] || null
  const currentResult = currentBundle.results.find((result) => result.sessionItemId === currentItem?.id) || null
  const currentDescription = currentItem?.sourceActivity?.description?.trim() || ''
  const timer = getClassroomTimerState({
    endedAtMs: timerStoppedAt,
    nowMs,
    plannedMinutes: currentItem?.plannedMinutes,
    startedAtMs: timerStartedAt,
  })
  const diversityMeasures = (currentItem?.sourceActivity?.diversityMeasures || [])
    .filter((measure) => !measure.classId || measure.classId === currentBundle.session.classId)

  useEffect(() => {
    if (!timerStartedAt || timerStoppedAt) return undefined
    const interval = globalThis.setInterval(() => setNowMs(Date.now()), 1000)
    return () => globalThis.clearInterval(interval)
  }, [timerStartedAt, timerStoppedAt])

  useEffect(() => {
    if (!projectionMode) return undefined
    const handleProjectionKeys = (event) => {
      if (event.key === 'Escape') {
        setProjectionMode(false)
        return
      }
      if (event.code !== 'Space' || event.repeat) return
      event.preventDefault()
      if (!timerStartedAt) {
        const now = Date.now()
        setTimerStartedAt(now)
        setNowMs(now)
      } else if (!timerStoppedAt) {
        const now = Date.now()
        setTimerStoppedAt(now)
        setNowMs(now)
      }
    }
    globalThis.addEventListener('keydown', handleProjectionKeys)
    return () => globalThis.removeEventListener('keydown', handleProjectionKeys)
  }, [projectionMode, timerStartedAt, timerStoppedAt])

  const selectItem = (index) => {
    if (timerStartedAt && !timerStoppedAt) return
    setCurrentIndex(Math.max(0, Math.min(currentBundle.items.length - 1, index)))
    setTimerStartedAt(null)
    setTimerStoppedAt(null)
    setOtherMinutes('')
  }

  const advance = () => {
    setCurrentIndex((index) => Math.min(currentBundle.items.length, index + 1))
    setTimerStartedAt(null)
    setTimerStoppedAt(null)
    setOtherMinutes('')
  }

  const saveResult = async (changes) => {
    if (!currentItem) return
    setBusy('result')
    setError('')
    try {
      const result = await onSaveResult(currentBundle, currentItem, changes)
      const nextBundle = { ...currentBundle, results: replaceResult(currentBundle.results, result) }
      setCurrentBundle(nextBundle)
      await onActivateEvidence(nextBundle, currentItem)
      const actualMinutes = Number(changes.actualMinutes)
      const programmedMinutes = Number(currentItem.sourceActivity?.plannedMinutes)
      if (Number.isFinite(actualMinutes) && actualMinutes > 0
        && Number.isFinite(programmedMinutes) && programmedMinutes > 0
        && Math.abs(actualMinutes - programmedMinutes) >= 0.5
        && onApplyTimingToPlanning) {
        setTimingProposal({ actualMinutes, advanceAfter: true, item: currentItem })
      } else {
        advance()
      }
    } catch (operationError) {
      setError(operationError.message || 'No s’ha pogut desar el resultat de l’activitat.')
    } finally {
      setBusy('')
    }
  }

  const finishTimer = async (endedMinutesAgo = 0) => {
    const actualMinutes = getCorrectedActualMinutes({
      endedAtMs: timerStoppedAt || Date.now(),
      endedMinutesAgo,
      startedAtMs: timerStartedAt,
    })
    await saveResult({ actualMinutes, status: 'completed' })
  }

  const keepProgrammedTiming = () => {
    const shouldAdvance = timingProposal.advanceAfter
    setTimingProposal(null)
    if (shouldAdvance) advance()
  }

  const applyRealTimingToPlanning = async () => {
    const activity = await onApplyTimingToPlanning(
      currentBundle,
      timingProposal.item,
      timingProposal.actualMinutes,
    )
    setCurrentBundle((current) => ({
      ...current,
      items: current.items.map((item) => item.sourceActivityId === activity.id
        ? { ...item, sourceActivity: activity }
        : item),
    }))
    const shouldAdvance = timingProposal.advanceAfter
    setTimingProposal(null)
    if (shouldAdvance) advance()
  }

  const confirmAttendance = async () => {
    setBusy('attendance')
    setError('')
    try {
      const session = await onUpdateSession(currentBundle, { attendanceConfirmedAt: new Date().toISOString() })
      setCurrentBundle((current) => ({ ...current, session }))
      setSidePanel('')
    } catch (operationError) {
      setError(operationError.message || 'No s’ha pogut confirmar l’assistència.')
    } finally {
      setBusy('')
    }
  }

  const toggleStudentSelection = (studentId) => {
    setSelectedStudentIds((current) => current.includes(studentId)
      ? current.filter((id) => id !== studentId)
      : [...current, studentId])
  }

  const saveBehavior = async (categoryId, label) => {
    if (selectedStudentIds.length === 0 || !label.trim()) return
    setBusy('behavior')
    setError('')
    try {
      for (const studentId of selectedStudentIds) {
        await onAddBehavior(studentId, behaviorKind, label, {
          applicationId: currentBundle.application.id,
          categoryId,
          classId: currentBundle.session.classId,
          planningUnitId: currentBundle.planningUnit.id,
          sessionId: currentBundle.session.id,
          source: 'classroom',
        })
      }
      setSelectedStudentIds([])
      setOtherBehavior('')
      setShowOtherBehavior(false)
    } catch (operationError) {
      setError(operationError.message || 'No s’ha pogut registrar el comportament.')
    } finally {
      setBusy('')
    }
  }

  const saveReview = async (item, changes) => {
    const result = await onSaveResult(currentBundle, item, changes)
    setCurrentBundle((current) => ({ ...current, results: replaceResult(current.results, result) }))
    const actualMinutes = Number(changes.actualMinutes)
    const programmedMinutes = Number(item.sourceActivity?.plannedMinutes)
    if (Number.isFinite(actualMinutes) && actualMinutes > 0
      && Number.isFinite(programmedMinutes) && programmedMinutes > 0
      && Math.abs(actualMinutes - programmedMinutes) >= 0.5
      && onApplyTimingToPlanning) {
      setTimingProposal({ actualMinutes, advanceAfter: false, item })
    }
    // El resum final ha de reflectir immediatament l'última reflexió escrita a
    // Revisar; així no la substitueix per un camp antic quan es tanca la classe.
    if (Object.prototype.hasOwnProperty.call(changes, 'pedagogicalReflection')) {
      setSummaryReflection(changes.pedagogicalReflection || '')
    }
    return result
  }

  const updateTaskStatus = async (studentId, taskId, status) => {
    setBusy(`task:${studentId}`)
    setError('')
    try {
      await onUpdateTaskRecord(studentId, taskId, status)
    } catch (operationError) {
      setError(operationError.message || 'No s’ha pogut actualitzar la tasca.')
    } finally {
      setBusy('')
    }
  }

  const toggleAbsence = async (studentId) => {
    setBusy(`absence:${studentId}`)
    setError('')
    try {
      const wasAbsent = Boolean(findAbsenceForSession(
        absenceRecords,
        studentId,
        currentBundle.session.classId,
        currentBundle.session,
      ))
      await onToggleAbsence(studentId, new Date(), {
        hours: Number(currentBundle.session.durationMinutes) / 60,
        sessionId: currentBundle.session.id,
        sessionStartsAt: currentBundle.session.startsAt,
        source: 'classroom',
      })
      if (wasAbsent) await onCancelRecovery(currentBundle, studentId, 'absence')
    } catch (operationError) {
      setError(operationError.message || 'No s’ha pogut actualitzar l’assistència.')
    } finally {
      setBusy('')
    }
  }

  const openRecovery = async (student, kind) => {
    setBusy(`recovery:${student.id}`)
    setError('')
    try {
      const nextSession = await onFindNextSession(currentBundle)
      const existing = sessionRecoveryNotes.find((note) => note.studentId === student.id && note.recovery?.kind === kind) || null
      if (getRecoverableClassroomItems(currentBundle.items).length === 0) {
        if (kind === 'absence' && !findAbsenceForSession(
          absenceRecords,
          student.id,
          currentBundle.session.classId,
          currentBundle.session,
        )) await toggleAbsence(student.id)
        await onSaveRecovery(currentBundle, student, { emailText: '', items: [], kind, nextSession })
        return
      }
      setRecoveryDraft({ existing, kind, nextSession, student })
    } catch (operationError) {
      setError(operationError.message || 'No s’ha pogut preparar el registre de recuperació.')
    } finally {
      setBusy('')
    }
  }

  const saveRecovery = async (recovery) => {
    const absence = findAbsenceForSession(
      absenceRecords,
      recoveryDraft.student.id,
      currentBundle.session.classId,
      currentBundle.session,
    )
    if (recovery.kind === 'absence' && !absence) await toggleAbsence(recoveryDraft.student.id)
    return onSaveRecovery(currentBundle, recoveryDraft.student, recovery)
  }

  const closeSession = async () => {
    setBusy('close')
    setError('')
    try {
      let nextBundle = currentBundle
      // Si ja hi havia una reflexió, conservar el mateix resultat permet també
      // buidar-la expressament sense crear una anotació duplicada.
      const reflectionItem = nextBundle.items.find((item) => item.id === reflectionResult?.sessionItemId)
        || [...nextBundle.items].reverse().find((item) => item.sourceActivityId)
        || nextBundle.items.at(-1)
      if (reflectionItem && (summaryReflection.trim() || reflectionResult)) {
        const existingResult = nextBundle.results.find((result) => result.sessionItemId === reflectionItem.id)
        const result = await onSaveResult(nextBundle, reflectionItem, {
          actualMinutes: existingResult?.actualMinutes || null,
          pedagogicalReflection: summaryReflection.trim(),
          status: existingResult?.status || 'completed',
        })
        nextBundle = { ...nextBundle, results: replaceResult(nextBundle.results, result) }
      }
      if (summaryPrivateNote.trim() || nextBundle.privateNotes?.length) {
        const privateNote = await onSavePrivateNote(nextBundle, summaryPrivateNote)
        nextBundle = { ...nextBundle, privateNotes: privateNote ? [privateNote] : [] }
      }
      const closed = await onCloseSession(nextBundle)
      nextBundle = { ...nextBundle, ...closed }
      for (const item of evidenceItems) await onActivateEvidence(nextBundle, item)
      setCurrentBundle(nextBundle)
      onExit()
    } catch (operationError) {
      setError(operationError.message || 'No s’ha pogut tancar la classe.')
    } finally {
      setBusy('')
    }
  }

  if (projectionMode && currentItem?.plannedMinutes) {
    return (
      <section className={`classroom-mode classroom-projection-mode ${classItem?.color || 'orange'}`}>
        <button className="classroom-projection-exit" onClick={() => setProjectionMode(false)} type="button"><X size={19} />Tornar al Mode aula</button>
        <main className="classroom-projection-stage" aria-label="Vista segura de projecció">
          <div className="classroom-projection-content">
            <span className="classroom-projection-label"><Projector size={19} />Activitat actual</span>
            <h1>{currentItem.title}</h1>
            <div aria-live="off" className={`classroom-projection-timer ${timer.isOvertime ? 'overtime' : ''}`}>
              <span>{timerStartedAt ? timer.isOvertime ? 'Temps excedit' : timerStoppedAt ? 'Temps aturat' : 'Temps restant' : 'Temps previst'}</span>
              <strong>{timerStartedAt ? `${timer.isOvertime ? '+' : ''}${formatClock(timer.isOvertime ? timer.overtimeSeconds : timer.remainingSeconds)}` : formatClock(Number(currentItem.plannedMinutes) * 60)}</strong>
            </div>
            <div className="classroom-projection-controls">
              {!timerStartedAt ? <button className="classroom-start" onClick={() => { const now = Date.now(); setTimerStartedAt(now); setNowMs(now) }} type="button"><Play size={20} />Comença</button> : !timerStoppedAt ? <button className="classroom-stop" onClick={() => { const now = Date.now(); setTimerStoppedAt(now); setNowMs(now) }} type="button"><Pause size={20} />Atura</button> : <span>Torna al Mode aula per registrar el temps i continuar.</span>}
              {!timerStoppedAt && <small>També pots prémer la barra espaiadora.</small>}
            </div>
          </div>
        </main>
      </section>
    )
  }

  return (
    <section className={`classroom-mode ${classItem?.color || 'orange'}`}>
      <header className="classroom-header">
        <button className="classroom-exit" onClick={onExit} type="button"><X size={18} />Sortir</button>
        <div>
          <span>{classItem?.name || 'Grup'}{currentBundle.session.subgroupId ? ` · ${currentBundle.session.subgroupId}` : ''}</span>
          <strong>{currentBundle.planningUnit.code} · {currentBundle.planningUnit.title}</strong>
        </div>
        <div className="classroom-session-meta"><span>{formatSessionDate(currentBundle.session.startsAt)}</span><strong>{String(currentBundle.session.startsAt).slice(11, 16)}</strong></div>
      </header>

      <main className={`classroom-workspace ${sidePanel ? 'attendance-visible' : ''}`}>
        <section className="classroom-chronology" aria-label="Cronologia de la classe">
          {sessionPersonalReminders.length > 0 && <section className="classroom-session-reminders" aria-label="Recordatoris d’aquesta sessió">
            <Bell size={19} />
            <div>
              <strong>{sessionPersonalReminders.length === 1 ? 'Recordatori d’aquesta sessió' : 'Recordatoris d’aquesta sessió'}</strong>
              {sessionPersonalReminders.map((note) => <p key={note.id}>{note.reminder?.text || note.text}</p>)}
            </div>
          </section>}
          <div className="classroom-sequence-before">
            {currentBundle.items.slice(0, currentIndex).map((item, index) => <ClassroomTimelineItem active={false} item={item} key={item.id} onSelect={() => selectItem(index)} position={`Feta · ${index + 1}`} result={currentBundle.results.find((result) => result.sessionItemId === item.id)} />)}
          </div>

          {currentItem ? <article className="classroom-current-activity">
            <div className="classroom-current-label"><span className="classroom-timeline-dot" /><strong>{currentItem.type === 'indication' ? 'Indicació actual' : currentItem.type === 'transition' ? 'Transició actual' : 'Activitat actual'}</strong><small>{currentIndex + 1} de {currentBundle.items.length}</small></div>
            <h1>{currentItem.title}</h1>
            <div className="classroom-current-details">
              <span>{currentItem.plannedMinutes ? `${currentItem.plannedMinutes} minuts previstos` : 'Sense temporització'}</span>
              {currentItem.segmentCount > 1 && <span>Part {currentItem.segmentIndex} de {currentItem.segmentCount}</span>}
              {currentResult?.actualMinutes && <span>{currentResult.actualMinutes} minuts reals registrats</span>}
            </div>

            {currentDescription && <section className="classroom-activity-description"><strong>Descripció de l’activitat</strong><p>{currentDescription}</p></section>}

            {diversityMeasures.length > 0 && <section className="classroom-adaptation-reminder"><ShieldCheck size={19} /><div><strong>Mesures previstes per a aquesta activitat</strong>{diversityMeasures.map((measure) => <p key={measure.id}><span>{measure.label}</span>{measure.studentNames?.length > 0 && <small>{measure.studentNames.join(' · ')}</small>}</p>)}</div></section>}

            {currentItem.plannedMinutes ? <div className={`classroom-timer ${timer.isOvertime ? 'overtime' : ''}`}>
              <span>{timerStartedAt ? timer.isOvertime ? 'Temps excedit' : timerStoppedAt ? 'Temps aturat' : 'Temps restant' : 'Temporitzador opcional'}</span>
              <strong>{timerStartedAt ? `${timer.isOvertime ? '+' : ''}${formatClock(timer.isOvertime ? timer.overtimeSeconds : timer.remainingSeconds)}` : formatClock(Number(currentItem.plannedMinutes) * 60)}</strong>
              {!timerStartedAt ? <button className="classroom-start" onClick={() => { const now = Date.now(); setTimerStartedAt(now); setNowMs(now) }} type="button"><Play size={18} />Comença</button> : !timerStoppedAt ? <button className="classroom-stop" onClick={() => { const now = Date.now(); setTimerStoppedAt(now); setNowMs(now) }} type="button"><Pause size={18} />Atura</button> : <div className="classroom-finish-options">
                <span>Quan ha acabat realment?</span>
                <div><button onClick={() => finishTimer(0)} type="button">Ara</button>{[1, 2, 5, 10].map((minutes) => <button key={minutes} onClick={() => finishTimer(minutes)} type="button">Fa {minutes}</button>)}</div>
                <label>Altre<input min="0" placeholder="min" type="number" value={otherMinutes} onChange={(event) => setOtherMinutes(event.target.value)} /><button disabled={otherMinutes === ''} onClick={() => finishTimer(Number(otherMinutes))} type="button"><Check size={14} /></button></label>
              </div>}
            </div> : <div className="classroom-untimed"><TimerReset size={19} /><span>Aquest element apareix a la cronologia, però no resta temps a la sessió.</span></div>}

            <div className="classroom-activity-actions">
              {currentResult && <button className="secondary-action" disabled={Boolean(timerStartedAt && !timerStoppedAt)} onClick={() => setReviewItem(currentItem)} type="button"><PencilLine size={16} />Revisar</button>}
              <button className="secondary-action" disabled={busy === 'result' || Boolean(timerStartedAt && !timerStoppedAt)} onClick={() => onContinue(currentBundle, currentItem)} type="button"><ArrowRight size={16} />Continuarà</button>
              <button className="primary-action" disabled={busy === 'result' || Boolean(timerStartedAt && !timerStoppedAt)} onClick={() => saveResult({ actualMinutes: currentResult?.actualMinutes || null, status: 'completed' })} type="button">{busy === 'result' ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />}{currentResult ? 'Següent' : 'Fet i següent'}</button>
            </div>
          </article> : <div className="classroom-no-activity"><CheckCircle2 size={36} /><strong>{currentBundle.standalone ? 'Classe sense activitats programades' : 'Seqüència completada'}</strong><p>{currentBundle.standalone ? 'Pots passar llista i revisar les tasques amb data d’entrega d’avui.' : 'Pots revisar qualsevol element o tancar la classe.'}</p></div>}

          <div className="classroom-sequence-after">
            {currentBundle.items.slice(currentIndex + 1).map((item, offset) => {
              const index = currentIndex + offset + 1
              return <ClassroomTimelineItem active={false} item={item} key={item.id} onSelect={() => selectItem(index)} position={`Després · ${index + 1}`} result={currentBundle.results.find((result) => result.sessionItemId === item.id)} />
            })}
          </div>
        </section>

        {sidePanel === 'students' && <aside className="classroom-attendance classroom-student-actions">
          <header><div><Users size={20} /><span><strong>Alumnat</strong><small>{currentBundle.session.subgroupId || 'Grup sencer'} · {visibleStudents.length} alumnes</small></span></div><button aria-label="Tancar alumnat" onClick={() => setSidePanel('')} type="button"><X size={16} /></button></header>
          <p>{currentBundle.session.attendanceConfirmedAt ? 'Selecciona un o més alumnes per registrar el mateix comportament.' : 'Marca només les absències completes i confirma la llista.'}</p>
          <div className="classroom-student-list">{visibleStudents.map((student) => {
            const absence = findAbsenceForSession(absenceRecords, student.id, currentBundle.session.classId, currentBundle.session)
            const loading = busy === `absence:${student.id}`
            const selected = selectedStudentIds.includes(student.id)
            const departed = departedStudents.some((item) => item.id === student.id)
            const behaviorCount = behaviorEvents.filter((event) => event.studentId === student.id && event.sessionId === currentBundle.session.id).length
            return <div className={`${absence ? 'absent' : ''} ${selected ? 'selected' : ''}`} key={student.id}>
              <button aria-pressed={selected} className="classroom-student-select" onClick={() => toggleStudentSelection(student.id)} type="button"><span>{selected ? <Check size={15} /> : <Users size={15} />}</span><strong>{student.name}</strong>{behaviorCount > 0 && <small>{behaviorCount} registre{behaviorCount === 1 ? '' : 's'}</small>}</button>
              <div className="classroom-presence-actions"><button aria-label={`${absence ? 'Marcar present' : 'Marcar absent'} ${student.name}`} aria-pressed={Boolean(absence)} className="classroom-absence-toggle" disabled={loading || busy === `recovery:${student.id}`} onClick={() => absence ? toggleAbsence(student.id) : openRecovery(student, 'absence')} type="button">{loading || busy === `recovery:${student.id}` ? <Loader2 className="spin" size={14} /> : absence ? <UserX size={16} /> : <UserCheck size={16} />}<small>{absence ? 'Absent' : 'Present'}</small></button><button aria-label={`Registrar sortida de ${student.name}`} aria-pressed={departed} className={`classroom-departure-toggle ${departed ? 'active' : ''}`} disabled={busy === `recovery:${student.id}`} onClick={() => openRecovery(student, 'earlyDeparture')} type="button"><DoorOpen size={15} /><small>Surt</small></button></div>
            </div>
          })}</div>
          {selectedStudentIds.length > 0 && <section className="classroom-behavior-controls"><header><MessageSquarePlus size={16} /><strong>{selectedStudentIds.length} seleccionat{selectedStudentIds.length === 1 ? '' : 's'}</strong></header><div className="classroom-behavior-kind"><button className={behaviorKind === 'incident' ? 'active incident' : ''} onClick={() => setBehaviorKind('incident')} type="button"><AlertTriangle size={14} />Incidència</button><button className={behaviorKind === 'positive' ? 'active positive' : ''} onClick={() => setBehaviorKind('positive')} type="button"><ThumbsUp size={14} />Positiu</button></div><div className="classroom-behavior-categories">{CLASSROOM_BEHAVIOR_CATEGORIES[behaviorKind].map(([id, label]) => <button disabled={busy === 'behavior'} key={id} onClick={() => saveBehavior(id, label)} type="button">{label}</button>)}<button className={showOtherBehavior ? 'active' : ''} onClick={() => setShowOtherBehavior((value) => !value)} type="button">Altres…</button></div>{showOtherBehavior && <div className="classroom-behavior-other"><input maxLength="500" placeholder="Escriu el registre" value={otherBehavior} onChange={(event) => setOtherBehavior(event.target.value)} /><button disabled={!otherBehavior.trim() || busy === 'behavior'} onClick={() => saveBehavior('other', otherBehavior)} type="button"><Save size={14} /></button></div>}</section>}
          {!currentBundle.session.attendanceConfirmedAt && <button className="primary-action classroom-confirm-attendance" disabled={busy === 'attendance'} onClick={confirmAttendance} type="button">{busy === 'attendance' ? <Loader2 className="spin" size={16} /> : <Check size={16} />}Confirmar la llista</button>}
        </aside>}

        {sidePanel === 'tasks' && <aside className="classroom-attendance classroom-task-panel">
          <header><div><ClipboardCheck size={20} /><span><strong>Seguiment de tasques</strong><small>{sessionTasks.length} tasca{sessionTasks.length === 1 ? '' : 's'} per revisar</small></span></div><button aria-label="Tancar tasques" onClick={() => setSidePanel('')} type="button"><X size={16} /></button></header>
          {sessionTasks.length === 0 ? <div className="classroom-panel-empty"><ClipboardCheck size={25} /><strong>No hi ha cap tasca per revisar avui</strong><p>Les tasques apareixen aquí el dia de la seva entrega.</p></div> : <>
            <div className="classroom-task-tabs">{sessionTasks.map((task) => (
              <button className={selectedTask?.id === task.id ? 'active' : ''} key={task.id} onClick={() => setSelectedTaskId(task.id)} type="button"><strong>{task.title}</strong><small>{task.date === String(currentBundle.session.startsAt).slice(0, 10) ? 'Entrega d’avui' : 'Activada'}</small></button>
            ))}</div>
            <div className="classroom-task-students">{visibleStudents.map((student) => {
              const record = taskRecords.find((candidate) => candidate.taskId === selectedTask.id && candidate.studentId === student.id)
              return <article key={student.id}><strong>{student.name}{record?.recoveryPending && <small>Recuperació pendent justificada</small>}</strong><div>{TASK_STATUSES.map(([status, label]) => <button className={record?.status === status ? `active ${status.toLocaleLowerCase()}` : ''} disabled={busy === `task:${student.id}` || record?.status === status} key={status} onClick={() => updateTaskStatus(student.id, selectedTask.id, status)} type="button">{label}</button>)}</div></article>
            })}</div>
          </>}
        </aside>}
      </main>

      {error && <div aria-live="assertive" className="classroom-error" role="alert">{error}<button onClick={() => setError('')} type="button">Tancar</button></div>}

      <footer className="classroom-footer">
        <div>
          <button aria-pressed={sidePanel === 'students'} className={sidePanel === 'students' ? 'active' : ''} onClick={() => setSidePanel((panel) => panel === 'students' ? '' : 'students')} type="button"><Users size={17} />Alumnat{absentStudents.length > 0 && <span>{absentStudents.length}</span>}</button>
          {sessionTasks.length > 0 && <button aria-pressed={sidePanel === 'tasks'} className={sidePanel === 'tasks' ? 'active' : ''} onClick={() => setSidePanel((panel) => panel === 'tasks' ? '' : 'tasks')} type="button"><ClipboardCheck size={17} />Tasques{pendingTaskRecords.length > 0 && <span>{pendingTaskRecords.length}</span>}</button>}
          <button disabled={!currentItem?.plannedMinutes} onClick={() => { setSidePanel(''); setProjectionMode(true) }} type="button"><Projector size={17} />Projectar</button>
          <button disabled={currentIndex === 0 || Boolean(timerStartedAt && !timerStoppedAt)} onClick={() => selectItem(currentIndex - 1)} type="button"><ArrowLeft size={17} />Anterior</button>
          <button disabled={currentIndex >= currentBundle.items.length - 1 || Boolean(timerStartedAt && !timerStoppedAt)} onClick={() => selectItem(currentIndex + 1)} type="button">Següent<ArrowRight size={17} /></button>
        </div>
        <button className="classroom-close-button" disabled={Boolean(timerStartedAt && !timerStoppedAt)} onClick={() => setCloseReview(true)} type="button"><CheckCircle2 size={17} />Tancar la classe</button>
      </footer>

      {closeReview && <ClassroomCloseReviewDialog attendanceConfirmed={Boolean(currentBundle.session.attendanceConfirmedAt)} attendanceIssueCount={attendanceIssueIds.size} attendanceIssueDetail={attendanceIssueDetail} busy={busy === 'close'} className={classItem?.name} onClose={() => setCloseReview(false)} onConfirm={closeSession} pendingTaskCount={pendingTaskRecords.length} reminderCount={reminderCount} sessionTime={String(currentBundle.session.startsAt).slice(11, 16)} setSummaryPrivateNote={setSummaryPrivateNote} setSummaryReflection={setSummaryReflection} showNotes={!currentBundle.standalone} summaryPrivateNote={summaryPrivateNote} summaryReflection={summaryReflection} />}
      {reviewItem && <ActivityReviewDialog item={reviewItem} onClose={() => setReviewItem(null)} onSave={(changes) => saveReview(reviewItem, changes)} result={currentBundle.results.find((result) => result.sessionItemId === reviewItem.id)} />}
      {timingProposal && <ClassroomTimingProposalDialog actualMinutes={timingProposal.actualMinutes} activity={timingProposal.item.sourceActivity} onApply={applyRealTimingToPlanning} onKeep={keepProgrammedTiming} />}
      {recoveryDraft && <RecoveryDialog bundle={currentBundle} existing={recoveryDraft.existing} kind={recoveryDraft.kind} nextSession={recoveryDraft.nextSession} onClose={() => setRecoveryDraft(null)} onSave={saveRecovery} student={recoveryDraft.student} />}
    </section>
  )
}
