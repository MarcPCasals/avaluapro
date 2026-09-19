import { useMemo, useState } from 'react'
import {
  CalendarDays, CalendarPlus, Check, Clock3, Cloud, CloudOff,
  Copy, Edit3, LayoutGrid, ListChecks, Loader2, Menu, Pencil, Plus, RotateCcw,
  Settings2, Trash2,
} from 'lucide-react'
import { getPendingReminderSummary } from '../../lib/reminders'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'
import { ClassroomMode } from '../classroom/ClassroomMode'
import {
  CalendarEventDialog,
  TimetableDialog,
  TimetableSlotDialog,
} from './AgendaDialogs'
import { useAgendaWorkspace } from './useAgendaWorkspace'
import { AgendaSchedulingDialog } from './AgendaSchedulingDialog'
import {
  AgendaTodayView,
  AgendaTimelineView,
  AgendaWeekView,
} from './AgendaSessionViews'
import {
  AgendaSessionAdjustDialog,
  AgendaSessionDetailDialog,
} from './AgendaSessionDialogs'
import './agenda.css'

const WEEKDAYS = [
  [1, 'Dilluns', 'Dl.'],
  [2, 'Dimarts', 'Dt.'],
  [3, 'Dimecres', 'Dc.'],
  [4, 'Dijous', 'Dj.'],
  [5, 'Divendres', 'Dv.'],
]
const GRID_START = 7 * 60 + 30
const GRID_END = 18 * 60
const GRID_STEP = 15
const GRID_ROWS = Array.from({ length: (GRID_END - GRID_START) / GRID_STEP }, (_, index) => GRID_START + index * GRID_STEP)

const EVENT_DETAILS = {
  holiday: ['Festiu', 'holiday'],
  nonTeaching: ['Dia no lectiu', 'non-teaching'],
  specialDay: ['Jornada especial', 'special'],
  extraordinarySession: ['Classe extraordinària', 'extra'],
  cancellation: ['Classe anul·lada', 'cancelled'],
}

function minutesToTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value || '00:00').split(':').map(Number)
  return hours * 60 + minutes
}

function formatDate(dateKey) {
  if (!dateKey) return '—'
  return new Intl.DateTimeFormat('ca-AD', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(`${dateKey}T12:00:00`))
}

function formatDateRange(item) {
  return item.endsOn && item.endsOn !== item.startsOn
    ? `${formatDate(item.startsOn)} – ${formatDate(item.endsOn)}`
    : formatDate(item.startsOn)
}

function addDateDays(dateKey, amount) {
  const date = new Date(`${dateKey}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

function startOfWeek(dateKey) {
  const date = new Date(`${dateKey}T12:00:00Z`)
  const weekday = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() - weekday + 1)
  return date.toISOString().slice(0, 10)
}

function SyncBadge({ isOnline, sync }) {
  const Icon = !isOnline ? CloudOff : sync.state === 'saving' ? Loader2 : sync.state === 'saved' ? Check : Cloud
  return (
    <span className={`agenda-sync ${sync.state}`} title={`${sync.pendingCount || 0} canvis pendents`}>
      <Icon className={sync.state === 'saving' ? 'spin' : ''} size={15} />
      {sync.label}
    </span>
  )
}

function TimetableGrid({ classes, onAdd, onDelete, onEdit, onError, onMove, slots }) {
  const [dragId, setDragId] = useState('')
  const classById = useMemo(() => new Map(classes.map((item) => [item.id, item])), [classes])
  const drop = async (weekday, startsAt) => {
    const slot = slots.find((item) => item.id === dragId)
    setDragId('')
    if (!slot || (slot.weekday === weekday && slot.startsAt === startsAt)) return
    try {
      await onMove(slot, { weekday, startsAt })
    } catch (error) {
      onError(error)
    }
  }
  const touchDrop = (clientX, clientY) => {
    const target = globalThis.document?.elementFromPoint(clientX, clientY)?.closest?.('[data-grid-weekday]')
    if (!target) return setDragId('')
    return drop(Number(target.dataset.gridWeekday), target.dataset.gridTime)
  }
  return (
    <div className="agenda-grid-scroll">
      <div className="agenda-week-grid" style={{ '--agenda-grid-rows': GRID_ROWS.length }}>
        <div className="agenda-grid-corner" />
        {WEEKDAYS.map(([weekday, label, shortLabel]) => <div className="agenda-day-heading" key={weekday} style={{ gridColumn: weekday + 1 }}><strong>{label}</strong><span>{shortLabel}</span></div>)}
        {GRID_ROWS.map((minutes, rowIndex) => (
          <div className={`agenda-time-label ${minutes % 60 === 0 ? 'hour' : ''}`} key={minutes} style={{ gridRow: rowIndex + 2 }}>{minutes % 60 === 0 ? minutesToTime(minutes) : ''}</div>
        ))}
        {WEEKDAYS.flatMap(([weekday]) => GRID_ROWS.map((minutes, rowIndex) => (
          <div
            className={`agenda-grid-cell ${minutes % 60 === 0 ? 'hour' : ''}`}
            data-grid-time={minutesToTime(minutes)}
            data-grid-weekday={weekday}
            key={`${weekday}-${minutes}`}
            onDoubleClick={() => onAdd({ startsAt: minutesToTime(minutes), weekday })}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); drop(weekday, minutesToTime(minutes)) }}
            style={{ gridColumn: weekday + 1, gridRow: rowIndex + 2 }}
            title="Doble clic per afegir una classe"
          />
        )))}
        {slots.filter((slot) => slot.weekday <= 5).map((slot) => {
          const startRow = Math.max(0, Math.round((timeToMinutes(slot.startsAt) - GRID_START) / GRID_STEP))
          const rowSpan = Math.max(2, Math.ceil(Number(slot.durationMinutes) / GRID_STEP))
          const classItem = classById.get(slot.classId)
          return (
            <article
              className={`agenda-slot-card ${classItem?.color || 'purple'} ${dragId === slot.id ? 'dragging' : ''}`}
              key={slot.id}
              style={{ gridColumn: slot.weekday + 1, gridRow: `${startRow + 2} / span ${rowSpan}` }}
            >
              <button
                aria-label={`Arrossegar ${classItem?.name || slot.subject}`}
                className="agenda-slot-handle"
                draggable
                onDragEnd={() => setDragId('')}
                onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; setDragId(slot.id) }}
                onPointerCancel={() => setDragId('')}
                onPointerDown={(event) => {
                  if (event.pointerType === 'mouse') return
                  event.preventDefault()
                  event.currentTarget.setPointerCapture(event.pointerId)
                  setDragId(slot.id)
                }}
                onPointerUp={(event) => {
                  if (event.pointerType === 'mouse') return
                  event.currentTarget.releasePointerCapture(event.pointerId)
                  touchDrop(event.clientX, event.clientY)
                }}
                title="Arrossega per canviar dia o hora"
                type="button"
              ><Menu size={16} /></button>
              <button className="agenda-slot-content" onClick={() => onEdit(slot)} type="button">
                <strong>{classItem?.name || 'Grup'}</strong>
                <span>{slot.subject}</span>
                <small>{slot.startsAt} · {slot.durationMinutes} min{slot.subgroupId ? ` · ${slot.subgroupId}` : ''}{slot.space ? ` · ${slot.space}` : ''}</small>
              </button>
              <button aria-label={`Eliminar ${classItem?.name || slot.subject}`} className="agenda-slot-delete" onClick={() => onDelete(slot)} type="button"><Trash2 size={14} /></button>
            </article>
          )
        })}
      </div>
    </div>
  )
}

function TimetableView({ classes, onAdd, onCreateVersion, onDelete, onEdit, onEditVersion, onError, onMove, onSelectVersion, slots, timetable, timetables, today }) {
  if (!timetable) {
    return (
      <section className="agenda-large-empty">
        <span><LayoutGrid size={29} /></span>
        <h2>Crea l’horari d’aquest curs</h2>
        <p>Defineix la primera versió i després hi podràs afegir franges de 60, 90 o 120 minuts.</p>
        <button className="primary-action" onClick={onCreateVersion} type="button"><Plus size={17} />Crear el primer horari</button>
      </section>
    )
  }
  const isEffective = timetable.effectiveFrom <= today && (!timetable.effectiveTo || timetable.effectiveTo >= today)
  return (
    <section className="agenda-timetable-view">
      <header className="agenda-view-toolbar">
        <div>
          <span className="agenda-view-kicker">Horari versionat</span>
          <div className="agenda-version-line">
            <select aria-label="Versió de l’horari" value={timetable.id} onChange={(event) => onSelectVersion(event.target.value)}>{timetables.map((item) => <option key={item.id} value={item.id}>{item.label} · {formatDate(item.effectiveFrom)}</option>)}</select>
            <span className={`agenda-effective-badge ${isEffective ? 'active' : ''}`}>{isEffective ? 'Vigent avui' : timetable.effectiveFrom > today ? 'Versió futura' : 'Versió històrica'}</span>
          </div>
          <p>{formatDate(timetable.effectiveFrom)} – {timetable.effectiveTo ? formatDate(timetable.effectiveTo) : 'sense data final'} · {slots.length} {slots.length === 1 ? 'franja' : 'franges'}</p>
        </div>
        <div className="agenda-toolbar-actions">
          <button className="secondary-action compact" onClick={onEditVersion} type="button"><Pencil size={15} />Vigència</button>
          <button className="secondary-action compact" onClick={onCreateVersion} type="button"><Copy size={15} />Nova versió</button>
          <button className="primary-action compact" onClick={() => onAdd(null)} type="button"><Plus size={16} />Afegir classe</button>
        </div>
      </header>
      <div className="agenda-grid-note"><Menu size={15} /><span>Arrossega una classe des de la nansa de tres línies. Fes doble clic en un espai buit per crear-ne una a aquella hora.</span></div>
      <TimetableGrid classes={classes} onAdd={onAdd} onDelete={onDelete} onEdit={onEdit} onError={onError} onMove={onMove} slots={slots} />
    </section>
  )
}

function CalendarView({ classes, events, onAdd, onDelete, onEdit }) {
  const classById = new Map(classes.map((item) => [item.id, item.name]))
  return (
    <section className="agenda-calendar-view">
      <header className="agenda-view-toolbar">
        <div><span className="agenda-view-kicker">Calendari manual</span><h2>Excepcions lectives</h2><p>Festes, dies no lectius, canvis puntuals i classes extraordinàries.</p></div>
        <button className="primary-action compact" onClick={onAdd} type="button"><CalendarPlus size={16} />Nova excepció</button>
      </header>
      {events.length === 0 ? (
        <div className="agenda-calendar-empty"><CalendarDays size={28} /><strong>El calendari no té excepcions</strong><p>Afegir-les ara evitarà haver de moure sessions manualment més endavant.</p></div>
      ) : (
        <div className="agenda-event-list">{events.map((event) => {
          const [typeLabel, colorClass] = EVENT_DETAILS[event.type] || ['Excepció', 'special']
          const groups = event.classIds?.length ? event.classIds.map((id) => classById.get(id)).filter(Boolean).join(' · ') : 'Tots els grups'
          return (
            <article key={event.id}>
              <span className={`agenda-event-mark ${colorClass}`}><CalendarDays size={17} /></span>
              <div className="agenda-event-content"><span>{typeLabel}</span><strong>{event.title}</strong><small>{formatDateRange(event)}{event.startsAt ? ` · ${event.startsAt} · ${event.durationMinutes} min` : ''} · {groups}</small>{event.reason && <p>{event.reason}</p>}</div>
              <span className={`agenda-event-impact ${event.consumesPlannedSession ? 'advances' : ''}`}>{event.consumesPlannedSession ? 'Avança 1 sessió' : 'No consumeix sessió'}</span>
              <div className="agenda-event-actions"><button aria-label={`Editar ${event.title}`} className="icon-action" onClick={() => onEdit(event)} type="button"><Edit3 size={15} /></button><button aria-label={`Eliminar ${event.title}`} className="icon-action danger" onClick={() => onDelete(event)} type="button"><Trash2 size={15} /></button></div>
            </article>
          )
        })}</div>
      )}
    </section>
  )
}

export default function AgendaModule() {
  const user = useAvaluaproStore((state) => state.cloud.user)
  const classes = useAvaluaproStore((state) => state.classes)
  const students = useAvaluaproStore((state) => state.students)
  const tasks = useAvaluaproStore((state) => state.tasks)
  const taskRecords = useAvaluaproStore((state) => state.taskRecords)
  const agendaNotes = useAvaluaproStore((state) => state.agendaNotes)
  const absenceRecords = useAvaluaproStore((state) => state.absenceRecords)
  const toggleStudentAbsence = useAvaluaproStore((state) => state.toggleStudentAbsence)
  const workspace = useAgendaWorkspace(user)
  const reminderSummary = useMemo(
    () => getPendingReminderSummary({ agendaNotes, classes, students, taskRecords, tasks }),
    [agendaNotes, classes, students, taskRecords, tasks],
  )
  const upcomingReminders = useMemo(() => {
    const horizon = addDateDays(workspace.today, 3)
    return reminderSummary.items.filter((item) =>
      item.reminder.date >= workspace.today && item.reminder.date <= horizon)
  }, [reminderSummary.items, workspace.today])
  const [view, setView] = useState('today')
  const [weekStart, setWeekStart] = useState(() => startOfWeek(workspace.today))
  const [timelineClassId, setTimelineClassId] = useState(() => classes[0]?.id || '')
  const [dialog, setDialog] = useState(null)
  const [activeBundle, setActiveBundle] = useState(null)
  const [editingTimetable, setEditingTimetable] = useState(null)
  const [editingSlot, setEditingSlot] = useState(null)
  const [slotPosition, setSlotPosition] = useState(null)
  const [editingEvent, setEditingEvent] = useState(null)
  const [scheduleNotice, setScheduleNotice] = useState('')
  const [adjustInitialAction, setAdjustInitialAction] = useState('session')
  const [adjustItemId, setAdjustItemId] = useState('')
  const [classroomRevision, setClassroomRevision] = useState(0)

  if (!user) {
    return <section className="agenda-auth-required"><CalendarDays size={32} /><h1>Agenda</h1><p>Inicia sessió amb Google des de «Dades i Compte» per protegir l’horari i tenir-lo disponible als teus dispositius.</p></section>
  }

  const openSlot = (slot = null, position = null) => {
    setEditingSlot(slot)
    setSlotPosition(position)
    setDialog('slot')
  }
  const removeSlot = async (slot) => {
    if (!globalThis.confirm?.(`Vols eliminar la franja de ${slot.subject} de les ${slot.startsAt}?`)) return
    try { await workspace.removeSlot(slot) } catch (error) { workspace.setError(error.message) }
  }
  const removeEvent = async (event) => {
    if (!globalThis.confirm?.(`Vols eliminar «${event.title}» del calendari?`)) return
    try { await workspace.removeCalendarEvent(event) } catch (error) { workspace.setError(error.message) }
  }
  const loadWeek = async (nextStart) => {
    setWeekStart(nextStart)
    try {
      await workspace.loadSessionRange({ from: nextStart, to: addDateDays(nextStart, 4) })
    } catch (error) {
      workspace.setError(error.message || 'No s’ha pogut carregar la setmana.')
    }
  }
  const openToday = () => {
    setView('today')
    const currentStart = startOfWeek(workspace.today)
    loadWeek(currentStart)
  }
  const moveWeek = (amount) => {
    const nextStart = amount === 0 ? startOfWeek(workspace.today) : addDateDays(weekStart, amount)
    setView('week')
    loadWeek(nextStart)
  }
  const openTimeline = async (classId = timelineClassId || classes[0]?.id || '') => {
    setTimelineClassId(classId)
    setView('timeline')
    if (!classId || !workspace.activeAcademicYear) return
    try {
      await workspace.loadSessionRange({
        classId,
        from: workspace.activeAcademicYear.startsOn,
        to: workspace.activeAcademicYear.endsOn,
      })
    } catch (error) {
      workspace.setError(error.message || 'No s’ha pogut carregar la cronologia.')
    }
  }
  const openSession = (bundle) => {
    setActiveBundle(bundle)
    setDialog('session-detail')
  }
  const adjustSession = (bundle, initialAction = 'session', item = null) => {
    setActiveBundle(bundle)
    setAdjustInitialAction(initialAction)
    setAdjustItemId(item?.id || '')
    setDialog('session-adjust')
  }
  const reloadCurrentWeek = () => workspace.loadSessionRange({ from: weekStart, to: addDateDays(weekStart, 4) })
  const openClassroom = async (bundle) => {
    try {
      const session = await workspace.saveSessionClassroomState(bundle, {
        classroomOpenedAt: bundle.session.classroomOpenedAt || new Date().toISOString(),
      })
      setActiveBundle({ ...bundle, session })
      setDialog(null)
      setView('classroom')
    } catch (error) {
      workspace.setError(error.message || 'No s’ha pogut obrir Mode aula.')
    }
  }
  const exitClassroom = () => {
    setDialog(null)
    setActiveBundle(null)
    setView('today')
    const currentStart = startOfWeek(workspace.today)
    setWeekStart(currentStart)
    workspace.loadSessionRange({ from: currentStart, to: addDateDays(currentStart, 4) })
      .catch((error) => workspace.setError(error.message || 'No s’ha pogut actualitzar la setmana.'))
  }
  const confirmClassroomContinuation = async (preview) => {
    const confirmed = await workspace.confirmContinuationPreview(preview)
    setActiveBundle((current) => {
      if (!current || !confirmed.sourceResult) return current
      const results = current.results.some((result) => result.id === confirmed.sourceResult.id)
        ? current.results.map((result) => result.id === confirmed.sourceResult.id ? confirmed.sourceResult : result)
        : [...current.results, confirmed.sourceResult]
      return { ...current, results }
    })
    // El canvi de clau reinicia només la pantalla de classe i avança al primer
    // element pendent després d'haver registrat la continuació.
    setClassroomRevision((revision) => revision + 1)
    return confirmed
  }

  if (view === 'classroom' && activeBundle) {
    return <>
      <ClassroomMode
        absenceRecords={absenceRecords}
        bundle={activeBundle}
        classes={classes}
        key={`${activeBundle.session.id}:${classroomRevision}`}
        onCloseSession={workspace.closeClassroomSession}
        onContinue={(bundle, item) => adjustSession(bundle, 'continuation', item)}
        onExit={exitClassroom}
        onSaveResult={workspace.saveActivityResult}
        onToggleAbsence={toggleStudentAbsence}
        onUpdateSession={workspace.saveSessionClassroomState}
        students={students}
      />
      {dialog === 'session-adjust' && <AgendaSessionAdjustDialog bundle={activeBundle} initialAction={adjustInitialAction} initialItemId={adjustItemId} onBuildContinuation={workspace.buildContinuationPreview} onClose={() => setDialog(null)} onConfirmContinuation={confirmClassroomContinuation} onSaveItem={(item, changes, scope) => workspace.saveSessionItemChange(activeBundle, item, changes, scope)} onSaved={setScheduleNotice} onStatus={(status) => workspace.saveSessionStatus(activeBundle, status)} />}
    </>
  }

  return (
    <section className="agenda-screen">
      <header className="agenda-topbar">
        <div className="agenda-brand"><span><CalendarDays size={21} /></span><div><small>Planificació diària</small><h1>Agenda</h1></div></div>
        <div className="agenda-course-controls">
          <label>Curs<select disabled={workspace.academicYears.length === 0} value={workspace.activeAcademicYearId} onChange={(event) => workspace.setActiveAcademicYearId(event.target.value)}>{workspace.academicYears.map((year) => <option key={year.id} value={year.id}>{year.label}</option>)}</select></label>
          <SyncBadge isOnline={workspace.isOnline} sync={workspace.sync} />
          <button aria-label="Sincronitzar Agenda" className="agenda-refresh" onClick={() => workspace.synchronize()} title="Sincronitzar ara" type="button"><RotateCcw size={15} /></button>
        </div>
      </header>

      <nav aria-label="Vistes d’Agenda" className="agenda-view-tabs">
        <button className={view === 'today' ? 'active' : ''} onClick={openToday} type="button"><CalendarDays size={17} />Avui</button>
        <button className={view === 'week' ? 'active' : ''} onClick={() => { setView('week'); loadWeek(weekStart) }} type="button"><Clock3 size={17} />Setmana</button>
        <button className={view === 'timeline' ? 'active' : ''} onClick={() => openTimeline()} type="button"><ListChecks size={17} />Cronologia</button>
        <button className={view === 'timetable' ? 'active' : ''} onClick={() => setView('timetable')} type="button"><LayoutGrid size={17} />Horari</button>
        <button className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')} type="button"><Settings2 size={17} />Calendari</button>
      </nav>

      {workspace.error && <div className="agenda-error"><span>{workspace.error}</span><button onClick={() => workspace.setError('')} type="button">Tancar</button></div>}
      {scheduleNotice && <div className="agenda-success"><span>{scheduleNotice}</span><button onClick={() => setScheduleNotice('')} type="button">Tancar</button></div>}

      {workspace.loading && workspace.academicYears.length === 0 ? (
        <div className="agenda-loading"><Loader2 className="spin" size={21} />Carregant l’Agenda…</div>
      ) : workspace.academicYears.length === 0 ? (
        <section className="agenda-large-empty"><span><CalendarDays size={29} /></span><h2>Primer crea el curs a Programació</h2><p>L’Agenda utilitza les mateixes dates del curs acadèmic per evitar informació duplicada.</p></section>
      ) : (
        <main className="agenda-main">
          {view === 'today' && <AgendaTodayView bundles={workspace.sessionBundles} calendarEvents={workspace.calendarEvents} classes={classes} loading={workspace.sessionsLoading} onAdjust={adjustSession} onOpenCalendar={() => setView('calendar')} onOpenClassroom={openClassroom} onOpenScheduling={() => setDialog('scheduling')} onOpenTimetable={() => setView('timetable')} reminders={upcomingReminders} timetable={workspace.activeTimetable} today={workspace.today} />}
          {view === 'week' && <AgendaWeekView bundles={workspace.sessionBundles} classes={classes} loading={workspace.sessionsLoading} onMoveWeek={moveWeek} onOpenSession={openSession} onReload={reloadCurrentWeek} weekStart={weekStart} />}
          {view === 'timeline' && <AgendaTimelineView bundles={workspace.sessionBundles} classes={classes} loading={workspace.sessionsLoading} onChangeClass={openTimeline} onOpenSession={openSession} onSchedule={() => setDialog('scheduling')} selectedClassId={timelineClassId} />}
          {view === 'timetable' && <TimetableView classes={classes} onAdd={(position) => openSlot(null, position)} onCreateVersion={() => { setEditingTimetable(null); setDialog('timetable') }} onDelete={removeSlot} onEdit={(slot) => openSlot(slot)} onEditVersion={() => { setEditingTimetable(workspace.activeTimetable); setDialog('timetable') }} onError={(error) => workspace.setError(error.message || 'No s’ha pogut moure la classe.')} onMove={workspace.moveSlot} onSelectVersion={workspace.setActiveTimetableId} slots={workspace.slots} timetable={workspace.activeTimetable} timetables={workspace.timetables} today={workspace.today} />}
          {view === 'calendar' && <CalendarView classes={classes} events={workspace.calendarEvents} onAdd={() => { setEditingEvent(null); setDialog('event') }} onDelete={removeEvent} onEdit={(event) => { setEditingEvent(event); setDialog('event') }} />}
        </main>
      )}

      {dialog === 'timetable' && <TimetableDialog academicYear={workspace.activeAcademicYear} currentTimetable={workspace.activeTimetable} initialValue={editingTimetable} onClose={() => setDialog(null)} onSave={(values, current) => current ? workspace.saveTimetable(current, values) : workspace.createTimetable(values)} />}
      {dialog === 'slot' && <TimetableSlotDialog classes={classes} initialPosition={slotPosition} initialValue={editingSlot} onClose={() => setDialog(null)} onSave={workspace.saveSlot} slots={workspace.slots} />}
      {dialog === 'event' && <CalendarEventDialog academicYear={workspace.activeAcademicYear} classes={classes} initialValue={editingEvent} onClose={() => setDialog(null)} onSave={workspace.saveCalendarEvent} today={workspace.today} />}
      {dialog === 'scheduling' && <AgendaSchedulingDialog academicYear={workspace.activeAcademicYear} classes={classes} onBuildPreview={workspace.buildSchedulingPreview} onClose={() => setDialog(null)} onConfirm={workspace.confirmSchedulingPreview} onLoadSetup={workspace.loadSchedulingSetup} onSaved={(result) => { setScheduleNotice(`${result.sessionCount} ${result.sessionCount === 1 ? 'sessió afectada' : 'sessions afectades'} i vinculades amb la UP.`); reloadCurrentWeek() }} planningUnits={workspace.planningUnits} today={workspace.today} />}
      {dialog === 'session-detail' && activeBundle && <AgendaSessionDetailDialog bundle={activeBundle} classes={classes} onAdjust={adjustSession} onClose={() => setDialog(null)} onOpenClassroom={openClassroom} />}
      {dialog === 'session-adjust' && activeBundle && <AgendaSessionAdjustDialog bundle={activeBundle} initialAction={adjustInitialAction} initialItemId={adjustItemId} onBuildContinuation={workspace.buildContinuationPreview} onClose={() => setDialog(null)} onConfirmContinuation={workspace.confirmContinuationPreview} onSaveItem={(item, changes, scope) => workspace.saveSessionItemChange(activeBundle, item, changes, scope)} onSaved={setScheduleNotice} onStatus={(status) => workspace.saveSessionStatus(activeBundle, status)} />}
    </section>
  )
}
