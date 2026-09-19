import { useMemo, useState } from 'react'
import {
  Bell, CalendarDays, CalendarPlus, Check, ChevronRight, Clock3, Cloud, CloudOff,
  Copy, Edit3, History, LayoutGrid, ListChecks, Loader2, Menu, Pencil, Plus,
  RotateCcw, Settings2, Sparkles, Trash2,
} from 'lucide-react'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'
import {
  CalendarEventDialog,
  TimetableDialog,
  TimetableSlotDialog,
} from './AgendaDialogs'
import { useAgendaWorkspace } from './useAgendaWorkspace'
import { AgendaSchedulingDialog } from './AgendaSchedulingDialog'
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

function SyncBadge({ isOnline, sync }) {
  const Icon = !isOnline ? CloudOff : sync.state === 'saving' ? Loader2 : sync.state === 'saved' ? Check : Cloud
  return (
    <span className={`agenda-sync ${sync.state}`} title={`${sync.pendingCount || 0} canvis pendents`}>
      <Icon className={sync.state === 'saving' ? 'spin' : ''} size={15} />
      {sync.label}
    </span>
  )
}

function TodayView({ calendarEvents, onOpenCalendar, onOpenScheduling, onOpenTimetable, timetable, today }) {
  const upcoming = calendarEvents.filter((event) => event.endsOn >= today).slice(0, 3)
  return (
    <div className="agenda-today-layout">
      <section className="agenda-today-main">
        <div className="agenda-section-heading">
          <span className="agenda-section-icon"><CalendarDays size={20} /></span>
          <div><span>Avui</span><h2>{new Intl.DateTimeFormat('ca-AD', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${today}T12:00:00`))}</h2></div>
        </div>
        <div className="agenda-today-empty">
          <Clock3 size={30} />
          <strong>Connecta una UP amb un grup i revisa les dates abans de crear-les</strong>
          <p>Agenda pot repartir la seqüència progressivament o preparar tota la proposta, dividir activitats llargues i saltar festius.</p>
          <div className="agenda-today-actions"><button className="primary-action" onClick={onOpenScheduling} type="button"><Sparkles size={17} />Calendaritzar una UP</button><button className="secondary-action" onClick={onOpenTimetable} type="button"><LayoutGrid size={17} />Configurar l’horari</button></div>
        </div>
      </section>
      <aside className="agenda-today-side">
        <section>
          <header><History size={18} /><div><strong>Horari aplicable</strong><span>Segons la data d’avui</span></div></header>
          {timetable ? <div className="agenda-current-version"><span /><div><strong>{timetable.label}</strong><small>Des de {formatDate(timetable.effectiveFrom)}</small></div><ChevronRight size={17} /></div> : <p>Encara no hi ha cap versió d’horari.</p>}
          <button className="secondary-action compact" onClick={onOpenTimetable} type="button">Veure horari</button>
        </section>
        <section>
          <header><Bell size={18} /><div><strong>Properes excepcions</strong><span>Festes, canvis i classes extra</span></div></header>
          {upcoming.length === 0 ? <p>Cap excepció pendent al calendari.</p> : <ul className="agenda-upcoming-list">{upcoming.map((event) => <li key={event.id}><span className={EVENT_DETAILS[event.type]?.[1]} /><div><strong>{event.title}</strong><small>{formatDateRange(event)}</small></div></li>)}</ul>}
          <button className="secondary-action compact" onClick={onOpenCalendar} type="button"><CalendarPlus size={15} />Obrir calendari</button>
        </section>
        <section className="agenda-future-card">
          <ListChecks size={19} />
          <div><strong>Recordatoris i tasques</strong><p>Apareixeran aquí fins a tres dies per endavant quan les sessions estiguin connectades.</p></div>
        </section>
      </aside>
    </div>
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
              <div className="agenda-event-content"><span>{typeLabel}</span><strong>{event.title}</strong><small>{formatDateRange(event)} · {groups}</small>{event.reason && <p>{event.reason}</p>}</div>
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
  const workspace = useAgendaWorkspace(user)
  const [view, setView] = useState('today')
  const [dialog, setDialog] = useState(null)
  const [editingTimetable, setEditingTimetable] = useState(null)
  const [editingSlot, setEditingSlot] = useState(null)
  const [slotPosition, setSlotPosition] = useState(null)
  const [editingEvent, setEditingEvent] = useState(null)
  const [scheduleNotice, setScheduleNotice] = useState('')

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
        <button className={view === 'today' ? 'active' : ''} onClick={() => setView('today')} type="button"><CalendarDays size={17} />Avui</button>
        <button aria-disabled="true" disabled title="S’activarà quan les UP estiguin assignades" type="button"><Clock3 size={17} />Setmana</button>
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
          {view === 'today' && <TodayView calendarEvents={workspace.calendarEvents} onOpenCalendar={() => setView('calendar')} onOpenScheduling={() => setDialog('scheduling')} onOpenTimetable={() => setView('timetable')} timetable={workspace.activeTimetable} today={workspace.today} />}
          {view === 'timetable' && <TimetableView classes={classes} onAdd={(position) => openSlot(null, position)} onCreateVersion={() => { setEditingTimetable(null); setDialog('timetable') }} onDelete={removeSlot} onEdit={(slot) => openSlot(slot)} onEditVersion={() => { setEditingTimetable(workspace.activeTimetable); setDialog('timetable') }} onError={(error) => workspace.setError(error.message || 'No s’ha pogut moure la classe.')} onMove={workspace.moveSlot} onSelectVersion={workspace.setActiveTimetableId} slots={workspace.slots} timetable={workspace.activeTimetable} timetables={workspace.timetables} today={workspace.today} />}
          {view === 'calendar' && <CalendarView classes={classes} events={workspace.calendarEvents} onAdd={() => { setEditingEvent(null); setDialog('event') }} onDelete={removeEvent} onEdit={(event) => { setEditingEvent(event); setDialog('event') }} />}
        </main>
      )}

      {dialog === 'timetable' && <TimetableDialog academicYear={workspace.activeAcademicYear} currentTimetable={workspace.activeTimetable} initialValue={editingTimetable} onClose={() => setDialog(null)} onSave={(values, current) => current ? workspace.saveTimetable(current, values) : workspace.createTimetable(values)} />}
      {dialog === 'slot' && <TimetableSlotDialog classes={classes} initialPosition={slotPosition} initialValue={editingSlot} onClose={() => setDialog(null)} onSave={workspace.saveSlot} slots={workspace.slots} />}
      {dialog === 'event' && <CalendarEventDialog academicYear={workspace.activeAcademicYear} classes={classes} initialValue={editingEvent} onClose={() => setDialog(null)} onSave={workspace.saveCalendarEvent} today={workspace.today} />}
      {dialog === 'scheduling' && <AgendaSchedulingDialog academicYear={workspace.activeAcademicYear} classes={classes} onBuildPreview={workspace.buildSchedulingPreview} onClose={() => setDialog(null)} onConfirm={workspace.confirmSchedulingPreview} onLoadSetup={workspace.loadSchedulingSetup} onSaved={(result) => setScheduleNotice(`${result.sessionCount} ${result.sessionCount === 1 ? 'sessió creada' : 'sessions creades'} i vinculades amb la UP.`)} planningUnits={workspace.planningUnits} today={workspace.today} />}
    </section>
  )
}
