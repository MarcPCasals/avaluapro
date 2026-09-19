import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, ExternalLink, Loader2,
  Pause, Play, TimerReset, UserCheck, Users, UserX, X,
} from 'lucide-react'
import {
  getClassroomStudents,
  getClassroomTimerState,
  getCorrectedActualMinutes,
} from '../../domain/planning'
import { findAbsenceForSession } from '../../lib/attendance'
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
    ...(item.sourceActivity?.teacherMaterials || []),
    ...(item.sourceActivity?.studentMaterials || []),
  ].filter((material) => material?.url)
}

function replaceResult(results, nextResult) {
  return results.some((result) => result.id === nextResult.id)
    ? results.map((result) => result.id === nextResult.id ? nextResult : result)
    : [...results, nextResult]
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
  bundle,
  classes,
  onCloseSession,
  onContinue,
  onExit,
  onSaveResult,
  onToggleAbsence,
  onUpdateSession,
  students,
}) {
  const [currentBundle, setCurrentBundle] = useState(bundle)
  const completedItemIds = useMemo(
    () => new Set(currentBundle.results.filter((result) => ['completed', 'continued', 'skipped'].includes(result.status)).map((result) => result.sessionItemId)),
    [currentBundle.results],
  )
  const pendingIndex = currentBundle.items.findIndex((item) => !completedItemIds.has(item.id))
  const firstPendingIndex = pendingIndex === -1 ? currentBundle.items.length : pendingIndex
  const [currentIndex, setCurrentIndex] = useState(firstPendingIndex)
  const [attendanceOpen, setAttendanceOpen] = useState(!bundle.session.attendanceConfirmedAt)
  const [timerStartedAt, setTimerStartedAt] = useState(null)
  const [timerStoppedAt, setTimerStoppedAt] = useState(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [otherMinutes, setOtherMinutes] = useState('')
  const [closeReview, setCloseReview] = useState(false)
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
  const currentItem = currentBundle.items[currentIndex] || null
  const currentResult = currentBundle.results.find((result) => result.sessionItemId === currentItem?.id) || null
  const timer = getClassroomTimerState({
    endedAtMs: timerStoppedAt,
    nowMs,
    plannedMinutes: currentItem?.plannedMinutes,
    startedAtMs: timerStartedAt,
  })
  const materials = currentItem ? itemMaterials(currentItem) : []

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
      setCurrentBundle((current) => ({ ...current, results: replaceResult(current.results, result) }))
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
      setAttendanceOpen(false)
    } catch (operationError) {
      setError(operationError.message || 'No s’ha pogut confirmar l’assistència.')
    } finally {
      setBusy('')
    }
  }

  const toggleAbsence = async (studentId) => {
    setBusy(`absence:${studentId}`)
    setError('')
    try {
      await onToggleAbsence(studentId, new Date(), {
        hours: Number(currentBundle.session.durationMinutes) / 60,
        sessionId: currentBundle.session.id,
        sessionStartsAt: currentBundle.session.startsAt,
        source: 'classroom',
      })
    } catch (operationError) {
      setError(operationError.message || 'No s’ha pogut actualitzar l’assistència.')
    } finally {
      setBusy('')
    }
  }

  const closeSession = async () => {
    setBusy('close')
    setError('')
    try {
      const closed = await onCloseSession(currentBundle)
      setCurrentBundle((current) => ({ ...current, ...closed }))
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

      <main className={`classroom-workspace ${attendanceOpen ? 'attendance-visible' : ''}`}>
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

            {materials.length > 0 && <div className="classroom-materials">{materials.map((material) => <a href={material.url} key={material.id || material.url} rel="noreferrer" target="_blank"><ExternalLink size={15} />{material.label}</a>)}</div>}

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
              <button className="secondary-action" disabled={busy === 'result' || Boolean(timerStartedAt && !timerStoppedAt)} onClick={() => onContinue(currentBundle, currentItem)} type="button"><ArrowRight size={16} />Continuarà</button>
              <button className="primary-action" disabled={busy === 'result' || Boolean(timerStartedAt && !timerStoppedAt)} onClick={() => saveResult({ actualMinutes: currentResult?.actualMinutes || null, status: 'completed' })} type="button">{busy === 'result' ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />}Fet i següent</button>
            </div>
          </article> : <div className="classroom-no-activity"><CheckCircle2 size={36} /><strong>Seqüència completada</strong><p>Pots revisar qualsevol element o tancar la classe.</p></div>}

          <div className="classroom-sequence-after">
            {currentBundle.items.slice(currentIndex + 1).map((item, offset) => {
              const index = currentIndex + offset + 1
              return <ClassroomTimelineItem active={false} item={item} key={item.id} onSelect={() => selectItem(index)} position={`Després · ${index + 1}`} result={currentBundle.results.find((result) => result.sessionItemId === item.id)} />
            })}
          </div>
        </section>

        {attendanceOpen && <aside className="classroom-attendance">
          <header><div><Users size={20} /><span><strong>Assistència</strong><small>{currentBundle.session.subgroupId || 'Grup sencer'} · {visibleStudents.length} alumnes</small></span></div><button aria-label="Tancar assistència" onClick={() => setAttendanceOpen(false)} type="button"><X size={16} /></button></header>
          <p>Marca només les absències completes. En confirmar, la llista passarà a segon pla.</p>
          <div className="classroom-student-list">{visibleStudents.map((student) => {
            const absence = findAbsenceForSession(absenceRecords, student.id, currentBundle.session.classId, currentBundle.session)
            const loading = busy === `absence:${student.id}`
            return <button aria-pressed={Boolean(absence)} className={absence ? 'absent' : ''} disabled={loading} key={student.id} onClick={() => toggleAbsence(student.id)} type="button"><span>{absence ? <UserX size={16} /> : <UserCheck size={16} />}</span><strong>{student.name}</strong><small>{absence ? 'Absent' : 'Present'}</small>{loading && <Loader2 className="spin" size={14} />}</button>
          })}</div>
          <button className="primary-action classroom-confirm-attendance" disabled={busy === 'attendance'} onClick={confirmAttendance} type="button">{busy === 'attendance' ? <Loader2 className="spin" size={16} /> : <Check size={16} />}Confirmar la llista</button>
        </aside>}
      </main>

      {error && <div className="classroom-error">{error}<button onClick={() => setError('')} type="button">Tancar</button></div>}

      <footer className="classroom-footer">
        <div>
          <button onClick={() => setAttendanceOpen(true)} type="button"><Users size={17} />Alumnat{absentStudents.length > 0 && <span>{absentStudents.length}</span>}</button>
          <button disabled={currentIndex === 0 || Boolean(timerStartedAt && !timerStoppedAt)} onClick={() => selectItem(currentIndex - 1)} type="button"><ArrowLeft size={17} />Anterior</button>
          <button disabled={currentIndex >= currentBundle.items.length - 1 || Boolean(timerStartedAt && !timerStoppedAt)} onClick={() => selectItem(currentIndex + 1)} type="button">Següent<ArrowRight size={17} /></button>
        </div>
        <button className="classroom-close-button" disabled={Boolean(timerStartedAt && !timerStoppedAt)} onClick={() => setCloseReview(true)} type="button"><CheckCircle2 size={17} />Tancar la classe</button>
      </footer>

      {closeReview && <div className="classroom-close-backdrop" role="presentation"><section aria-modal="true" className="classroom-close-review" role="dialog"><header><span><CheckCircle2 size={21} /></span><div><small>Resum abans de tancar</small><h2>{classItem?.name || 'Classe'} · {String(currentBundle.session.startsAt).slice(11, 16)}</h2></div></header><div className="classroom-close-summary"><article><strong>{absentStudents.length}</strong><span>{absentStudents.length === 1 ? 'alumne absent' : 'alumnes absents'}</span><small>{absentStudents.map((student) => student.name).join(' · ') || 'Cap absència registrada'}</small></article><article><strong>{currentBundle.results.length}/{currentBundle.items.length}</strong><span>elements revisats</span><small>La resta es donarà per feta, tal com està acordat.</small></article></div>{!currentBundle.session.attendanceConfirmedAt && <p className="classroom-close-warning">Encara no has confirmat la llista d’assistència.</p>}<div className="classroom-close-actions"><button className="secondary-action" disabled={busy === 'close'} onClick={() => setCloseReview(false)} type="button">Continuar la classe</button><button className="primary-action" disabled={busy === 'close'} onClick={closeSession} type="button">{busy === 'close' ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />}Confirmar i tancar</button></div></section></div>}
    </section>
  )
}
