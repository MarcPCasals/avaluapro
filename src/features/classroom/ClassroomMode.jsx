import { useEffect, useId, useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, ClipboardCheck, Clock3,
  Copy, DoorOpen, ExternalLink, Loader2, Mail, MessageSquarePlus, PackageCheck,
  Pause, PencilLine, Play, Save, ShieldCheck, ThumbsUp, TimerReset, UserCheck,
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
import { useDialogAccessibility } from '../../lib/useDialogAccessibility'
import {
  buildRecoveryEmail,
  getMaterialPreparationKey,
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

function itemMaterials(item) {
  return [
    ...(item.sourceActivity?.teacherMaterials || []).map((material) => ({ ...material, audience: 'teacher' })),
    ...(item.sourceActivity?.studentMaterials || []).map((material) => ({ ...material, audience: 'students' })),
  ]
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
    <label>Comentari d’aplicació<textarea rows="2" value={values.applicationComment} onChange={(event) => setValues({ ...values, applicationComment: event.target.value })} /></label>
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
    <div className="classroom-summary-notes"><label>Reflexió pedagògica <span>visible per direcció</span><textarea maxLength="4000" placeholder="Opcional" rows="2" value={summaryReflection} onChange={(event) => setSummaryReflection(event.target.value)} /></label><label>Nota privada <span>només per a tu</span><textarea maxLength="4000" placeholder="Opcional" rows="2" value={summaryPrivateNote} onChange={(event) => setSummaryPrivateNote(event.target.value)} /></label></div>
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

export function ClassroomMode({
  absenceRecords,
  agendaNotes = [],
  behaviorEvents,
  bundle,
  classes,
  onActivateEvidence,
  onAddBehavior,
  onCancelRecovery,
  onCloseSession,
  onCompleteMaterialPreparation,
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
  const [closeReview, setCloseReview] = useState(false)
  const [reviewItem, setReviewItem] = useState(null)
  const [recoveryDraft, setRecoveryDraft] = useState(null)
  const [selectedStudentIds, setSelectedStudentIds] = useState([])
  const [behaviorKind, setBehaviorKind] = useState('incident')
  const [otherBehavior, setOtherBehavior] = useState('')
  const [showOtherBehavior, setShowOtherBehavior] = useState(false)
  const [selectedEvidenceItemId, setSelectedEvidenceItemId] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const classItem = classes.find((item) => item.id === currentBundle.session.classId)
  const visibleStudents = useMemo(
    () => getClassroomStudents(students, currentBundle.session.classId, currentBundle.session.subgroupId),
    [currentBundle.session.classId, currentBundle.session.subgroupId, students],
  )
  const absentStudents = visibleStudents.filter((student) => findAbsenceForSession(
    absenceRecords,
    student.id,
    currentBundle.session.classId,
    currentBundle.session,
  ))
  const evidenceItems = getClassroomEvidenceItems(currentBundle.items)
  const evidenceKeys = new Set(evidenceItems.map((item) => classroomEvidenceKey(currentBundle, item)))
  const sessionTasks = tasks.filter((task) => task.classId === currentBundle.session.classId && evidenceKeys.has(task.evidenceKey))
  const selectedEvidenceItem = evidenceItems.find((item) => item.id === selectedEvidenceItemId) || evidenceItems[0] || null
  const selectedTask = selectedEvidenceItem
    ? sessionTasks.find((task) => task.evidenceKey === classroomEvidenceKey(currentBundle, selectedEvidenceItem)) || null
    : null
  const sessionTaskRecords = taskRecords.filter((record) => sessionTasks.some((task) => task.id === record.taskId))
  const pendingTaskRecords = sessionTaskRecords.filter((record) => record.recoveryPending || ['LATE', 'MISSING'].includes(record.status))
  const sessionRecoveryNotes = agendaNotes.filter((note) => note.type === 'activityRecovery' && note.sessionId === currentBundle.session.id)
  const departedStudents = visibleStudents.filter((student) => sessionRecoveryNotes.some((note) =>
    note.studentId === student.id && note.recovery?.kind === 'earlyDeparture'))
  const attendanceIssueIds = new Set([...absentStudents, ...departedStudents].map((student) => student.id))
  const attendanceIssueDetail = [
    absentStudents.length ? `Absents: ${absentStudents.map((student) => student.name).join(' · ')}` : '',
    departedStudents.length ? `Han marxat: ${departedStudents.map((student) => student.name).join(' · ')}` : '',
  ].filter(Boolean).join(' — ')
  const sessionPreparationNotes = agendaNotes.filter((note) => note.type === 'materialPreparation'
    && note.sessionId === currentBundle.session.id
    && !note.preparation?.cancelledAt)
  const reminderCount = sessionTaskRecords.filter((record) => record.reminder && !record.reminder.dismissedAt).length
    + sessionTasks.filter((task) => task.reminder && !task.reminder.dismissedAt).length
    + sessionRecoveryNotes.filter((note) => note.reminder && !note.reminder.dismissedAt).length
    + sessionPreparationNotes.filter((note) => note.reminder && !note.reminder.dismissedAt).length
  const existingPrivateNote = currentBundle.privateNotes?.[0]?.text || ''
  const reflectionResult = [...currentBundle.results].reverse().find((result) => result.pedagogicalReflection)
  const existingReflection = reflectionResult?.pedagogicalReflection || ''
  const [summaryReflection, setSummaryReflection] = useState(existingReflection)
  const [summaryPrivateNote, setSummaryPrivateNote] = useState(existingPrivateNote)
  const currentItem = currentBundle.items[currentIndex] || null
  const currentResult = currentBundle.results.find((result) => result.sessionItemId === currentItem?.id) || null
  const timer = getClassroomTimerState({
    endedAtMs: timerStoppedAt,
    nowMs,
    plannedMinutes: currentItem?.plannedMinutes,
    startedAtMs: timerStartedAt,
  })
  const materials = currentItem ? itemMaterials(currentItem) : []
  const diversityMeasures = (currentItem?.sourceActivity?.diversityMeasures || [])
    .filter((measure) => !measure.classId || measure.classId === currentBundle.session.classId)

  useEffect(() => {
    if (!timerStartedAt || timerStoppedAt) return undefined
    const interval = globalThis.setInterval(() => setNowMs(Date.now()), 1000)
    return () => globalThis.clearInterval(interval)
  }, [timerStartedAt, timerStoppedAt])

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
      advance()
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

  const completeMaterialPreparation = async (note) => {
    setBusy(`material:${note.id}`)
    setError('')
    try {
      await onCompleteMaterialPreparation(note)
    } catch (operationError) {
      setError(operationError.message || 'No s’ha pogut marcar el material com a preparat.')
    } finally {
      setBusy('')
    }
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

            {materials.length > 0 && <div className="classroom-materials">{materials.map((material) => {
              const preparationNote = sessionPreparationNotes.find((note) => note.materialPreparationKey === getMaterialPreparationKey(currentBundle.session.id, currentItem, material))
              const prepared = Boolean(preparationNote?.preparation?.completedAt)
              return <div className={`${material.preparationKind && material.preparationKind !== 'reference' ? 'preparable' : ''} ${prepared ? 'prepared' : ''}`} key={`${material.audience}:${material.id || material.label}`}>
                {material.url ? <a href={material.url} rel="noreferrer" target="_blank"><ExternalLink size={15} />{material.label}</a> : <span><PackageCheck size={15} />{material.label}</span>}
                {preparationNote && <button disabled={prepared || busy === `material:${preparationNote.id}`} onClick={() => completeMaterialPreparation(preparationNote)} type="button">{busy === `material:${preparationNote.id}` ? <Loader2 className="spin" size={13} /> : prepared ? <Check size={13} /> : <PackageCheck size={13} />}{prepared ? 'Preparat' : 'Marcar preparat'}</button>}
              </div>
            })}</div>}

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
          </article> : <div className="classroom-no-activity"><CheckCircle2 size={36} /><strong>Seqüència completada</strong><p>Pots revisar qualsevol element o tancar la classe.</p></div>}

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
          <header><div><ClipboardCheck size={20} /><span><strong>Seguiment de tasques</strong><small>{evidenceItems.length} evidència{evidenceItems.length === 1 ? '' : 's'} preparada{evidenceItems.length === 1 ? '' : 's'}</small></span></div><button aria-label="Tancar tasques" onClick={() => setSidePanel('')} type="button"><X size={16} /></button></header>
          {evidenceItems.length === 0 ? <div className="classroom-panel-empty"><ClipboardCheck size={25} /><strong>Aquesta sessió no genera seguiment</strong><p>Les activitats es poden configurar des de Programació.</p></div> : <>
            <div className="classroom-task-tabs">{evidenceItems.map((item) => {
              const task = sessionTasks.find((candidate) => candidate.evidenceKey === classroomEvidenceKey(currentBundle, item))
              return <button className={selectedEvidenceItem?.id === item.id ? 'active' : ''} key={item.id} onClick={() => setSelectedEvidenceItemId(item.id)} type="button"><strong>{item.title}</strong><small>{task ? 'Activada' : 'Preparada'}</small></button>
            })}</div>
            {!selectedTask ? <div className="classroom-panel-empty"><Clock3 size={24} /><strong>Encara no està activada</strong><p>La graella apareixerà quan confirmis que l’activitat s’ha treballat.</p></div> : <div className="classroom-task-students">{visibleStudents.map((student) => {
              const record = taskRecords.find((candidate) => candidate.taskId === selectedTask.id && candidate.studentId === student.id)
              return <article key={student.id}><strong>{student.name}{record?.recoveryPending && <small>Recuperació pendent justificada</small>}</strong><div>{TASK_STATUSES.map(([status, label]) => <button className={record?.status === status ? `active ${status.toLocaleLowerCase()}` : ''} disabled={busy === `task:${student.id}` || record?.status === status} key={status} onClick={() => updateTaskStatus(student.id, selectedTask.id, status)} type="button">{label}</button>)}</div></article>
            })}</div>}
          </>}
        </aside>}
      </main>

      {error && <div aria-live="assertive" className="classroom-error" role="alert">{error}<button onClick={() => setError('')} type="button">Tancar</button></div>}

      <footer className="classroom-footer">
        <div>
          <button aria-pressed={sidePanel === 'students'} className={sidePanel === 'students' ? 'active' : ''} onClick={() => setSidePanel((panel) => panel === 'students' ? '' : 'students')} type="button"><Users size={17} />Alumnat{absentStudents.length > 0 && <span>{absentStudents.length}</span>}</button>
          {evidenceItems.length > 0 && <button aria-pressed={sidePanel === 'tasks'} className={sidePanel === 'tasks' ? 'active' : ''} onClick={() => setSidePanel((panel) => panel === 'tasks' ? '' : 'tasks')} type="button"><ClipboardCheck size={17} />Tasques{pendingTaskRecords.length > 0 && <span>{pendingTaskRecords.length}</span>}</button>}
          <button disabled={currentIndex === 0 || Boolean(timerStartedAt && !timerStoppedAt)} onClick={() => selectItem(currentIndex - 1)} type="button"><ArrowLeft size={17} />Anterior</button>
          <button disabled={currentIndex >= currentBundle.items.length - 1 || Boolean(timerStartedAt && !timerStoppedAt)} onClick={() => selectItem(currentIndex + 1)} type="button">Següent<ArrowRight size={17} /></button>
        </div>
        <button className="classroom-close-button" disabled={Boolean(timerStartedAt && !timerStoppedAt)} onClick={() => setCloseReview(true)} type="button"><CheckCircle2 size={17} />Tancar la classe</button>
      </footer>

      {closeReview && <ClassroomCloseReviewDialog attendanceConfirmed={Boolean(currentBundle.session.attendanceConfirmedAt)} attendanceIssueCount={attendanceIssueIds.size} attendanceIssueDetail={attendanceIssueDetail} busy={busy === 'close'} className={classItem?.name} onClose={() => setCloseReview(false)} onConfirm={closeSession} pendingTaskCount={pendingTaskRecords.length} reminderCount={reminderCount} sessionTime={String(currentBundle.session.startsAt).slice(11, 16)} setSummaryPrivateNote={setSummaryPrivateNote} setSummaryReflection={setSummaryReflection} summaryPrivateNote={summaryPrivateNote} summaryReflection={summaryReflection} />}
      {reviewItem && <ActivityReviewDialog item={reviewItem} onClose={() => setReviewItem(null)} onSave={(changes) => saveReview(reviewItem, changes)} result={currentBundle.results.find((result) => result.sessionItemId === reviewItem.id)} />}
      {recoveryDraft && <RecoveryDialog bundle={currentBundle} existing={recoveryDraft.existing} kind={recoveryDraft.kind} nextSession={recoveryDraft.nextSession} onClose={() => setRecoveryDraft(null)} onSave={saveRecovery} student={recoveryDraft.student} />}
    </section>
  )
}
