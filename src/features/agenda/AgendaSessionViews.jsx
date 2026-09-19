import {
  ArrowLeft, ArrowRight, Bell, CalendarDays, CalendarRange, Clock3, Edit3,
  ExternalLink, Layers3, ListChecks, Loader2, MapPin, Plus, RotateCcw,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { getClassroomPromptState } from '../../domain/planning'

const STATUS_LABELS = {
  cancelled: 'Anul·lada',
  held: 'Feta',
  notHeld: 'No realitzada',
  planned: 'Prevista',
}

function addDays(dateKey, amount) {
  const date = new Date(`${dateKey}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

function formatDate(dateKey, options = {}) {
  return new Intl.DateTimeFormat('ca-AD', {
    day: 'numeric',
    month: options.long ? 'long' : 'short',
    weekday: options.weekday ? 'long' : undefined,
  }).format(new Date(`${dateKey}T12:00:00`))
}

function sessionDate(bundle) {
  return String(bundle.session.startsAt).slice(0, 10)
}

function sessionTime(bundle) {
  return String(bundle.session.startsAt).slice(11, 16)
}

function classNameFor(classes, classId) {
  return classes.find((item) => item.id === classId)?.name || 'Grup'
}

function sessionMaterials(bundle) {
  const materials = bundle.items.flatMap((item) => [
    ...(item.sourceActivity?.teacherMaterials || []),
    ...(item.sourceActivity?.studentMaterials || []),
  ])
  return [...new Map(materials.filter((item) => item?.url).map((item) => [item.url, item])).values()]
}

function SessionDetail({ bundle, classes, onAdjust, onOpenClassroom }) {
  if (!bundle) return null
  const materials = sessionMaterials(bundle)
  return (
    <div className="agenda-session-detail">
      <header>
        <div className="agenda-session-time"><span>{formatDate(sessionDate(bundle), { weekday: true })}</span><strong>{sessionTime(bundle)}</strong><small>{bundle.session.durationMinutes} min{bundle.session.subgroupId ? ` · ${bundle.session.subgroupId}` : ''}</small></div>
        <div><span>{bundle.planningUnit.code}</span><h3>{bundle.planningUnit.title}</h3><p>{classNameFor(classes, bundle.session.classId)}</p></div>
        <span className={`agenda-session-status ${bundle.session.status}`}>{STATUS_LABELS[bundle.session.status]}</span>
      </header>
      <div className="agenda-session-activities">
        <div className="agenda-session-subheading"><ListChecks size={16} /><strong>Activitats</strong><span>{bundle.items.length}</span></div>
        {bundle.items.length === 0 ? <p className="agenda-session-muted">Aquesta sessió encara no té cap activitat.</p> : <ol>{bundle.items.map((item) => <li key={item.id}><span /><div><strong>{item.title}</strong><small>{item.plannedMinutes ? `${item.plannedMinutes} min` : 'Sense temps'}{item.segmentCount > 1 ? ` · part ${item.segmentIndex}/${item.segmentCount}` : ''}</small></div></li>)}</ol>}
      </div>
      <div className="agenda-session-materials">
        <div className="agenda-session-subheading"><ExternalLink size={16} /><strong>Materials</strong><span>{materials.length}</span></div>
        {materials.length === 0 ? <p className="agenda-session-muted">No hi ha cap material enllaçat.</p> : <div>{materials.map((material) => <a href={material.url} key={material.url} rel="noreferrer" target="_blank"><ExternalLink size={13} /><span>{material.label || material.url}</span></a>)}</div>}
      </div>
      <div className="agenda-session-actions">
        {onOpenClassroom && !['cancelled', 'notHeld'].includes(bundle.session.status) && <button className="primary-action compact" onClick={() => onOpenClassroom(bundle)} type="button"><Clock3 size={15} />{bundle.session.classroomOpenedAt ? 'Reobrir Mode aula' : 'Obrir Mode aula'}</button>}
        <button className="secondary-action compact agenda-adjust-session" onClick={() => onAdjust(bundle)} type="button"><Edit3 size={15} />Reajustar la sessió</button>
      </div>
    </div>
  )
}

export function AgendaTodayView({
  bundles,
  calendarEvents,
  classes,
  loading,
  onAdjust,
  onOpenCalendar,
  onOpenClassroom,
  onOpenScheduling,
  onOpenTimetable,
  reminders,
  timetable,
  today,
}) {
  const [now, setNow] = useState(() => new Date())
  const todayBundles = bundles.filter((bundle) => sessionDate(bundle) === today)
  const nowTime = now.toTimeString().slice(0, 5)
  const nowMinutes = Number(nowTime.slice(0, 2)) * 60 + Number(nowTime.slice(3, 5))
  const currentBundle = todayBundles.find((bundle) => {
    if (bundle.session.status !== 'planned') return false
    const startsAtMinutes = Number(sessionTime(bundle).slice(0, 2)) * 60 + Number(sessionTime(bundle).slice(3, 5))
    return startsAtMinutes <= nowMinutes && startsAtMinutes + Number(bundle.session.durationMinutes || 0) > nowMinutes
  })
  const automaticBundle = currentBundle || bundles.find((bundle) =>
    bundle.session.status === 'planned' && bundle.session.startsAt >= `${today}T${nowTime}`) || null
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const selectedBundle = bundles.find((bundle) => bundle.session.id === selectedSessionId) || automaticBundle
  const classroomPrompt = automaticBundle ? getClassroomPromptState(automaticBundle.session, now) : null
  const upcomingEvents = calendarEvents.filter((event) => event.endsOn >= today && event.startsOn <= addDays(today, 3)).slice(0, 4)
  useEffect(() => {
    const interval = globalThis.setInterval(() => setNow(new Date()), 30000)
    return () => globalThis.clearInterval(interval)
  }, [])
  return (
    <div className="agenda-today-layout agenda-today-live">
      <section className="agenda-today-main">
        <div className="agenda-section-heading"><span className="agenda-section-icon"><CalendarDays size={20} /></span><div><span>Avui</span><h2>{formatDate(today, { long: true, weekday: true })}</h2></div>{loading && <Loader2 className="spin agenda-heading-loader" size={17} />}</div>
        {classroomPrompt && <div className={`agenda-classroom-prompt ${classroomPrompt.kind}`}><Clock3 size={20} /><div><strong>{classroomPrompt.kind === 'upcoming' ? `${classNameFor(classes, automaticBundle.session.classId)} comença d’aquí ${classroomPrompt.minutesUntil} min` : `${classNameFor(classes, automaticBundle.session.classId)} està en curs`}</strong><span>{automaticBundle.items.length} activitats · {sessionMaterials(automaticBundle).length} materials preparats</span></div><button className="primary-action compact" onClick={() => onOpenClassroom(automaticBundle)} type="button">Obrir Mode aula</button></div>}
        {selectedBundle ? <SessionDetail bundle={selectedBundle} classes={classes} onAdjust={onAdjust} onOpenClassroom={onOpenClassroom} /> : <div className="agenda-today-empty"><Clock3 size={30} /><strong>No hi ha cap pròxima sessió calendaritzada</strong><p>Pots preparar una nova seqüència o revisar l’horari i les excepcions abans de continuar.</p><div className="agenda-today-actions"><button className="primary-action" onClick={onOpenScheduling} type="button"><Plus size={17} />Calendaritzar una UP</button><button className="secondary-action" onClick={onOpenTimetable} type="button"><CalendarRange size={17} />Veure l’horari</button></div></div>}
      </section>
      <aside className="agenda-today-side">
        <section>
          <header><Clock3 size={18} /><div><strong>Sessions d’avui</strong><span>{todayBundles.length} programades</span></div></header>
          {todayBundles.length === 0 ? <p>Cap classe planificada per avui.</p> : <div className="agenda-today-session-list">{todayBundles.map((bundle) => <button className={bundle.session.id === selectedBundle?.session.id ? 'active' : ''} key={bundle.session.id} onClick={() => setSelectedSessionId(bundle.session.id)} type="button"><span>{sessionTime(bundle)}</span><div><strong>{classNameFor(classes, bundle.session.classId)}</strong><small>{bundle.planningUnit.code} · {bundle.items.length} activitats</small></div></button>)}</div>}
          {timetable && <small className="agenda-applied-timetable">Horari aplicable: {timetable.label}</small>}
        </section>
        <section>
          <header><Bell size={18} /><div><strong>Recordatoris</strong><span>Avui i tres dies per endavant</span></div></header>
          {reminders.length === 0 ? <p>No hi ha cap recordatori en aquest període.</p> : <ul className="agenda-reminder-list">{reminders.map((item) => <li key={item.id}><span>{item.reminder.date.slice(8, 10)}</span><div><strong>{item.title}</strong><small>{item.classItem?.name || item.detail}</small></div></li>)}</ul>}
        </section>
        <section>
          <header><CalendarRange size={18} /><div><strong>Excepcions properes</strong><span>Fins a tres dies</span></div></header>
          {upcomingEvents.length === 0 ? <p>Cap canvi lectiu proper.</p> : <ul className="agenda-upcoming-list">{upcomingEvents.map((event) => <li key={event.id}><span /><div><strong>{event.title}</strong><small>{formatDate(event.startsOn, { weekday: true })}{event.startsAt ? ` · ${event.startsAt}` : ''}</small></div></li>)}</ul>}
          <button className="secondary-action compact" onClick={onOpenCalendar} type="button">Obrir calendari</button>
        </section>
      </aside>
    </div>
  )
}

export function AgendaWeekView({ bundles, classes, loading, onMoveWeek, onOpenSession, onReload, weekStart }) {
  const days = Array.from({ length: 5 }, (_, index) => addDays(weekStart, index))
  return (
    <section className="agenda-week-view">
      <header className="agenda-view-toolbar">
        <div><span className="agenda-view-kicker">Setmana lectiva</span><h2>{formatDate(days[0])} – {formatDate(days[4])}</h2><p>Sessions reals de totes les UP i grups.</p></div>
        <div className="agenda-toolbar-actions"><button aria-label="Setmana anterior" className="secondary-action compact" onClick={() => onMoveWeek(-7)} type="button"><ArrowLeft size={15} /></button><button className="secondary-action compact" onClick={() => onMoveWeek(0)} type="button">Avui</button><button aria-label="Setmana següent" className="secondary-action compact" onClick={() => onMoveWeek(7)} type="button"><ArrowRight size={15} /></button><button aria-label="Recarregar setmana" className="secondary-action compact" onClick={onReload} type="button"><RotateCcw className={loading ? 'spin' : ''} size={15} /></button></div>
      </header>
      <div className="agenda-week-columns">{days.map((dateKey) => {
        const dayBundles = bundles.filter((bundle) => sessionDate(bundle) === dateKey)
        return <section key={dateKey}><header><span>{formatDate(dateKey, { weekday: true })}</span><strong>{dateKey.slice(8, 10)}</strong><small>{dayBundles.length} sessions</small></header><div>{dayBundles.length === 0 ? <p>Sense sessions</p> : dayBundles.map((bundle) => <button className={`agenda-week-session ${bundle.session.status}`} key={bundle.session.id} onClick={() => onOpenSession(bundle)} type="button"><span>{sessionTime(bundle)}</span><strong>{classNameFor(classes, bundle.session.classId)}</strong><small>{bundle.planningUnit.code} · {bundle.items.length} activitats</small></button>)}</div></section>
      })}</div>
    </section>
  )
}

export function AgendaTimelineView({ bundles, classes, loading, onChangeClass, onOpenSession, onSchedule, selectedClassId }) {
  const classBundles = bundles.filter((bundle) => bundle.session.classId === selectedClassId)
  return (
    <section className="agenda-timeline-view">
      <header className="agenda-view-toolbar">
        <div><span className="agenda-view-kicker">Cronologia del grup</span><div className="agenda-version-line"><select aria-label="Grup de la cronologia" value={selectedClassId} onChange={(event) => onChangeClass(event.target.value)}><option value="">Selecciona un grup</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{loading && <Loader2 className="spin" size={16} />}</div><p>Totes les sessions del curs, de la primera a l’última.</p></div>
        <button className="primary-action compact" onClick={onSchedule} type="button"><Plus size={16} />Calendaritzar UP</button>
      </header>
      {!selectedClassId ? <div className="agenda-timeline-empty"><Layers3 size={28} /><strong>Selecciona un grup</strong><p>La cronologia reunirà totes les seves UP en ordre real.</p></div> : classBundles.length === 0 ? <div className="agenda-timeline-empty"><CalendarDays size={28} /><strong>Aquest grup encara no té sessions</strong><p>Calendaritza una UP per començar la cronologia.</p></div> : <div className="agenda-timeline-list">{classBundles.map((bundle, index) => <button key={bundle.session.id} onClick={() => onOpenSession(bundle)} type="button"><span className="agenda-timeline-index">{index + 1}</span><span className="agenda-timeline-dot" /><div className="agenda-timeline-date"><strong>{formatDate(sessionDate(bundle), { weekday: true })}</strong><small>{sessionTime(bundle)} · {bundle.session.durationMinutes} min</small></div><div className="agenda-timeline-content"><span>{bundle.planningUnit.code}</span><strong>{bundle.planningUnit.title}</strong><small>{bundle.items.map((item) => item.title).join(' · ') || 'Sessió sense activitats'}</small></div><span className={`agenda-session-status ${bundle.session.status}`}>{STATUS_LABELS[bundle.session.status]}</span><MapPin size={15} /></button>)}</div>}
    </section>
  )
}

export function AgendaSessionDetail({ bundle, classes, onAdjust, onOpenClassroom }) {
  return <SessionDetail bundle={bundle} classes={classes} onAdjust={onAdjust} onOpenClassroom={onOpenClassroom} />
}
