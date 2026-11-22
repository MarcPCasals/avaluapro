import { useEffect, useMemo, useState } from 'react'
import { Bell, CalendarClock, Copy, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { buildPlannedAbsenceEmail, getPlannedAbsenceReminders, getPlannedAbsenceSessions, nextPlannedAbsenceDate } from '../../lib/plannedAbsences.js'
import { buildTimetableSessionCandidates } from '../../domain/planning/scheduler.js'

function formatDate(date) {
  return new Intl.DateTimeFormat('ca-AD', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(`${date}T12:00:00`))
}

export function PlannedAbsencesView({ classItem, students, calendarEvents, loadSessionRange, slotsByTimetableId, timetables, updateStudent, today }) {
  const classStudents = useMemo(() => students.filter((student) => student.classId === classItem?.id)
    .sort((a, b) => a.name.localeCompare(b.name, 'ca')), [classItem?.id, students])
  const [studentId, setStudentId] = useState('')
  const [studentQuery, setStudentQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [startsOn, setStartsOn] = useState(today)
  const [endsOn, setEndsOn] = useState(() => nextPlannedAbsenceDate(today))
  const [selectedId, setSelectedId] = useState('')
  const [bundles, setBundles] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const records = useMemo(() => classStudents.flatMap((student) => (student.plannedAbsences || []).filter((period) => period.endsOn >= today)
    .map((period) => ({ ...period, student })))
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn) || a.student.name.localeCompare(b.student.name, 'ca')),
  [classStudents, today])
  const suggestions = useMemo(() => {
    const query = studentQuery.trim().toLocaleLowerCase('ca')
    return (query ? classStudents.filter((student) => student.name.toLocaleLowerCase('ca').split(/[\s,]+/).some((part) => part.startsWith(query))) : classStudents).slice(0, 8)
  }, [classStudents, studentQuery])
  const reminders = useMemo(() => getPlannedAbsenceReminders(classStudents, today), [classStudents, today])
  const selected = records.find((record) => record.id === selectedId)
  const candidates = useMemo(() => selected ? buildTimetableSessionCandidates({
    calendarEvents, classId: selected.student.classId, from: selected.startsOn, to: selected.endsOn,
    slotsByTimetableId, timetables,
  }).candidates : [], [calendarEvents, selected, slotsByTimetableId, timetables])
  const affected = useMemo(() => selected
    ? getPlannedAbsenceSessions({ bundles, calendarEvents, candidates, period: selected, student: selected.student })
    : [], [bundles, calendarEvents, candidates, selected])

  useEffect(() => {
    if (!selected) return undefined
    let cancelled = false
    queueMicrotask(() => { if (!cancelled) { setLoading(true); setError(''); setBundles([]) } })
    loadSessionRange({ classId: selected.student.classId, from: selected.startsOn,
      to: selected.endsOn, includeDetails: true })
      .then((next) => { if (!cancelled) setBundles(next) })
      .catch((cause) => { if (!cancelled) setError(cause.message || 'No s’han pogut carregar les sessions.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [loadSessionRange, selected])

  useEffect(() => {
    if (selected && !loading && !error) {
      queueMicrotask(() => setDraft(buildPlannedAbsenceEmail({ student: selected.student, period: selected, bundles: affected })))
    }
  }, [affected, error, loading, selected])

  const save = async (event) => {
    event.preventDefault()
    setError('')
    if (!studentId || !startsOn || !endsOn || startsOn > endsOn) {
      setError('Tria un alumne i un interval de dates vàlid.')
      return
    }
    const days = Math.round((Date.parse(`${endsOn}T12:00:00Z`) - Date.parse(`${startsOn}T12:00:00Z`)) / 86400000)
    if (days > 120) { setError('El període pot tenir com a màxim 121 dies.'); return }
    const student = classStudents.find((item) => item.id === studentId)
    if (!student) return
    const id = globalThis.crypto?.randomUUID?.() || `absence-${Date.now()}`
    try {
      await updateStudent(student.id, { plannedAbsences: [...(student.plannedAbsences || []), { id, startsOn, endsOn, sentAt: null }] })
      setStudentId(''); setStudentQuery(''); setShowSuggestions(false)
      setSelectedId(id)
      setNotice('Període desat. Revisa les sessions i el correu abans d’enviar-lo.')
    } catch (cause) { setError(cause.message || 'No s’ha pogut desar el període.') }
  }

  const changePeriod = async (period, patch) => {
    setError('')
    try {
      await updateStudent(period.student.id, { plannedAbsences: (period.student.plannedAbsences || [])
        .map((item) => item.id === period.id ? { ...item, ...patch } : item) })
    } catch (cause) { setError(cause.message || 'No s’ha pogut actualitzar el període.') }
  }

  const remove = async (period) => {
    if (!globalThis.confirm?.(`Vols eliminar l’absència prevista de ${period.student.name}?`)) return
    try {
      await updateStudent(period.student.id, { plannedAbsences: (period.student.plannedAbsences || [])
        .filter((item) => item.id !== period.id) })
      if (selectedId === period.id) { setSelectedId(''); setBundles([]); setDraft('') }
    } catch (cause) { setError(cause.message || 'No s’ha pogut eliminar el període.') }
  }

  const refresh = async () => {
    if (!selected) return
    setLoading(true); setError('')
    try {
      setBundles(await loadSessionRange({ classId: selected.student.classId, from: selected.startsOn,
        to: selected.endsOn, includeDetails: true }))
      setNotice('Previsió actualitzada amb la calendarització disponible.')
    } catch (cause) { setError(cause.message || 'No s’han pogut actualitzar les sessions.') }
    finally { setLoading(false) }
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(draft); setNotice('Correu copiat. Revisa’l al teu gestor de correu abans d’enviar-lo.') }
    catch { setError('No s’ha pogut copiar. Selecciona el text del correu i copia’l manualment.') }
  }

  return <section className="planned-absences-view">
    <header><div><span><CalendarClock size={18} /> Seguiment</span><h2>Absències previstes · {classItem?.name || 'Classe'}</h2>
      <p>Apunta els dies que faltarà un alumne. El període desapareixerà l’endemà de la data final i no modificarà el registre d’assistència.</p></div></header>
    <form className="planned-absence-form" onSubmit={save}>
      <div className="planned-absence-student-picker"><label htmlFor="planned-absence-student">Alumne</label><input aria-autocomplete="list" aria-controls="planned-absence-student-options" aria-expanded={showSuggestions} autoComplete="off" id="planned-absence-student" onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)} onChange={(event) => { setStudentQuery(event.target.value); setStudentId(''); setShowSuggestions(true) }} onFocus={() => setShowSuggestions(true)} onKeyDown={(event) => { if (event.key === 'Escape') setShowSuggestions(false); if (event.key === 'Enter' && !studentId && suggestions[0]) { event.preventDefault(); setStudentId(suggestions[0].id); setStudentQuery(suggestions[0].name); setShowSuggestions(false) } }} placeholder="Escriu el nom o el cognom" role="combobox" value={studentQuery} />
        {showSuggestions && suggestions.length > 0 && <div className="planned-absence-suggestions" id="planned-absence-student-options" role="listbox">{suggestions.map((student) => <button key={student.id} onClick={() => { setStudentId(student.id); setStudentQuery(student.name); setShowSuggestions(false) }} role="option" type="button">{student.name}</button>)}</div>}</div>
      <label>Des de<input required type="date" value={startsOn} onChange={(event) => { const nextStart = event.target.value; setStartsOn(nextStart); setEndsOn(nextPlannedAbsenceDate(nextStart)) }} /></label>
      <label>Fins a<input required min={startsOn} type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} /></label>
      <button className="primary-action compact" disabled={!classStudents.length} type="submit">Apuntar absència</button>
    </form>
    {error && <p role="alert" className="planned-absence-error">{error}</p>}
    {notice && <p role="status" className="planned-absence-notice">{notice}</p>}
    <div className="planned-absence-layout">
      <div className="planned-absence-list"><h3>Períodes apuntats</h3>
        {!records.length && <p>Encara no hi ha cap absència prevista en aquesta classe.</p>}
        {records.map((period) => <article className={period.id === selectedId ? 'selected' : ''} key={period.id}>
          <button onClick={() => { setSelectedId(period.id); setNotice('') }} type="button"><strong>{period.student.name}</strong><span>{formatDate(period.startsOn)} – {formatDate(period.endsOn)}</span><small>{period.sentAt ? 'Feina enviada' : 'Feina pendent d’enviar'}</small>{!period.sentAt && <small><Bell size={12} /> {reminders.filter((item) => item.period.id === period.id && item.student.id === period.student.id).map((item) => `${formatDate(item.reminder.date)} (${item.stage === 'week' ? '7 dies abans' : '1 dia abans'})`).join(' · ')}</small>}</button>
          <button aria-label={`${period.sentAt ? 'Tornar a pendent' : 'Marcar feina enviada'} per a ${period.student.name}`} className="planned-absence-sent-toggle" onClick={() => changePeriod(period, { sentAt: period.sentAt ? null : new Date().toISOString() })} type="button">{period.sentAt ? 'Tornar a pendent' : 'Feina enviada'}</button>
          <button aria-label={`Eliminar absència de ${period.student.name}`} className="planned-absence-delete" onClick={() => remove(period)} type="button"><Trash2 size={16} /></button>
        </article>)}
      </div>
      <div className="planned-absence-detail"><h3>Sessions i correu model</h3>
        {!selected && <p>Selecciona un període per veure les sessions i preparar el correu.</p>}
        {selected && <><div className="planned-absence-detail-actions"><button className="secondary-action compact" disabled={loading} onClick={refresh} type="button">{loading ? <Loader2 className="spin" size={15} /> : <RefreshCw size={15} />} Actualitzar sessions</button>
          <button className="secondary-action compact" onClick={() => changePeriod(selected, { sentAt: selected.sentAt ? null : new Date().toISOString() })} type="button">{selected.sentAt ? 'Tornar a pendent' : 'Marcar com a enviat'}</button></div>
          {loading ? <p>Carregant sessions…</p> : <><p>{affected.length} {affected.length === 1 ? 'sessió prevista' : 'sessions previstes'} en aquests dies.</p>
            <ul>{affected.map((bundle) => <li key={bundle.session.id}><strong>{formatDate(String(bundle.session.startsAt).slice(0, 10))} · {String(bundle.session.startsAt).slice(11, 16)}</strong> · {bundle.items?.length ? bundle.items.map((item) => item.title).join(', ') : 'Activitats pendents de concretar'}</li>)}</ul>
            <label className="planned-absence-draft">Correu editable<textarea aria-label="Correu model editable" rows="18" value={draft} onChange={(event) => setDraft(event.target.value)} /></label>
            <button className="primary-action compact" disabled={!draft} onClick={copy} type="button"><Copy size={15} /> Copiar correu</button>
          </>}</>}
      </div>
    </div>
  </section>
}
