import {
  AlertTriangle, ArrowLeft, ArrowRight, Bell, CalendarDays, CalendarPlus, CalendarRange, ChevronDown, Clock3, Edit3,
  ExternalLink, Flag, History, Layers3, ListChecks, Loader2, MapPin, Moon, Plus, RotateCcw, Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { ContextualHelp } from '../../components/ContextualHelp'
import { FormattedText } from '../../components/FormattedText'
import { getClassroomPromptState, getSessionLoad, groupParallelSessionBundles } from '../../domain/planning'
import {
  calendarEventCoversSchoolWeek,
  calendarEventTargetsSession,
  getCalendarEventsForDate,
  getMonthCalendarWeeks,
  getNoClassCalendarEvent,
  isNoClassCalendarEvent,
  startOfCalendarWeek,
} from '../../lib/agendaCalendar'
import { findNextTimetableOccurrence, getAgendaWeekTemporalState, getWeekTimetableOccurrences } from '../../lib/agendaToday'
import { AgendaDoubleBell } from './AgendaDoubleBell'

const STATUS_LABELS = {
  cancelled: 'Anul·lada',
  held: 'Feta',
  notHeld: 'No realitzada',
  planned: 'Prevista',
}

const CALENDAR_EVENT_LABELS = {
  cancellation: 'Classe anul·lada',
  extraordinarySession: 'Classe extraordinària',
  holiday: 'Festiu',
  nonTeaching: 'Dia no lectiu o vacances',
  specialDay: 'Jornada especial',
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

function formatMonth(dateKey) {
  const date = new Date(`${dateKey}T12:00:00`)
  const month = new Intl.DateTimeFormat('ca-AD', { month: 'long' }).format(date)
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${date.getFullYear()}`
}

function formatDateRange(event) {
  return event.endsOn && event.endsOn !== event.startsOn
    ? `${formatDate(event.startsOn)} – ${formatDate(event.endsOn)}`
    : formatDate(event.startsOn)
}

function sessionDate(bundle) {
  return String(bundle.session.startsAt).slice(0, 10)
}

function sessionTime(bundle) {
  return String(bundle.session.startsAt).slice(11, 16)
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function sessionHasPassed(bundle, now, today) {
  const startsAt = new Date(bundle.session.startsAt).getTime()
  const endsAt = startsAt + (Number(bundle.session.durationMinutes) || 0) * 60_000
  return Number.isFinite(endsAt) ? endsAt < now : sessionDate(bundle) < today
}

function classNameFor(classes, classId) {
  return classes.find((item) => item.id === classId)?.name || 'Grup'
}

function TemporalUnitCountdown({ temporalUnit, progress, type = 'days' }) {
  if (!temporalUnit || !progress) return null
  const isSessions = type === 'sessions'
  const remaining = isSessions ? progress.remainingSessions : progress.remainingWorkingDays
  const total = isSessions ? progress.totalSessions : progress.totalWorkingDays
  const unitLabel = isSessions ? (total === 1 ? 'sessió real' : 'sessions reals') : (remaining === 1 ? 'dia laborable' : 'dies laborables')
  return <div className={`agenda-ut-countdown ${isSessions ? 'sessions' : ''}`} title={`${temporalUnit.label}: ${remaining} de ${total} ${isSessions ? 'sessions reals' : 'dies laborables'}`}><Flag size={14} /><span><strong>{remaining}{isSessions ? ` de ${total}` : ''}</strong> {unitLabel}</span><small>fins al final de {temporalUnit.label}</small></div>
}

function TemporalUnitEndMarker({ temporalUnits = [] }) {
  if (temporalUnits.length === 0) return null
  return <div className="agenda-ut-end-marker"><Flag size={11} /><span>Final {temporalUnits.map((unit) => unit.label).join(' · ')}</span></div>
}

function getTargetedCalendarEvent(events, dateKey, classId, target) {
  return getCalendarEventsForDate(events, dateKey, classId).find((event) =>
    isNoClassCalendarEvent(event)
    && ((target.sessionId && event.sessionId === target.sessionId)
      || (target.timetableSlotId && event.timetableSlotId === target.timetableSlotId))) || null
}

function sessionMaterials(bundle) {
  const materials = bundle.items.flatMap((item) => [
    ...(item.sourceActivity?.teacherMaterials || []),
    ...(item.sourceActivity?.studentMaterials || []),
  ])
  return [...new Map(materials.filter((item) => item?.url).map((item) => [item.url, item])).values()]
}

function SessionDetail({ bundle, calendarEvents = [], classes, onAdjust, onOpenClassroom, onResolveGap }) {
  if (!bundle) return null
  const materials = sessionMaterials(bundle)
  const sessionLoad = getSessionLoad(bundle.items, bundle.session.durationMinutes)
  const freeMinutes = Math.max(0, sessionLoad.programmableMinutes - sessionLoad.plannedMinutes)
  const blockingEvent = getNoClassCalendarEvent(calendarEvents, sessionDate(bundle), bundle.session.classId, { sessionId: bundle.session.id })
  return (
    <div className="agenda-session-detail">
      <header>
        <div className="agenda-session-time"><span>{formatDate(sessionDate(bundle), { weekday: true })}</span><strong>{sessionTime(bundle)}</strong><small>{bundle.session.durationMinutes} min{bundle.session.subgroupId ? ` · ${bundle.session.subgroupId}` : ''}</small></div>
        <div><span>{bundle.planningUnit.code}</span><h3>{bundle.planningUnit.title}</h3><p>{classNameFor(classes, bundle.session.classId)}</p></div>
        <span className={`agenda-session-status ${blockingEvent ? 'notHeld' : bundle.session.status}`}>{blockingEvent ? 'No es fa' : STATUS_LABELS[bundle.session.status]}</span>
      </header>
      {blockingEvent && <div className="agenda-session-calendar-blocked"><Moon size={18} /><div><strong>{blockingEvent.title}</strong><span>{CALENDAR_EVENT_LABELS[blockingEvent.type] || 'Canvi de calendari'} · aquesta sessió no es fa.</span>{blockingEvent.reason && <p>{blockingEvent.reason}</p>}</div></div>}
      {!blockingEvent && bundle.session.status === 'planned' && freeMinutes > 0 && <div className="agenda-session-gap-warning"><AlertTriangle size={18} /><div><strong>{freeMinutes} min programables sense ocupar</strong><span>Pots avançar la propera activitat i, si cal, dividir-la per completar els {sessionLoad.programmableMinutes} minuts.</span></div>{onResolveGap && <button className="secondary-action compact" onClick={() => onResolveGap(bundle)} type="button"><ArrowLeft size={14} />Avançar la propera activitat</button>}</div>}
      <div className="agenda-session-activities">
        <div className="agenda-session-subheading"><ListChecks size={16} /><strong>Activitats</strong><span>{bundle.items.length}</span></div>
        {bundle.items.length === 0 ? <p className="agenda-session-muted">Aquesta sessió encara no té cap activitat.</p> : <ol>{bundle.items.map((item) => {
          const description = item.sourceActivity?.description?.trim()
          return <li key={item.id}><span /><div><strong>{item.title}</strong><small>{item.plannedMinutes ? `${item.plannedMinutes} min` : 'Sense temps'}{item.segmentCount > 1 ? ` · part ${item.segmentIndex}/${item.segmentCount}` : ''}</small>{description && <details className="agenda-activity-description"><summary><ChevronDown size={13} />Descripció</summary><FormattedText as="p" text={description} /></details>}</div></li>
        })}</ol>}
      </div>
      <div className="agenda-session-materials">
        <div className="agenda-session-subheading"><ExternalLink size={16} /><strong>Materials</strong><span>{materials.length}</span></div>
        {materials.length === 0 ? <p className="agenda-session-muted">No hi ha cap material enllaçat.</p> : <div>{materials.map((material) => <a href={material.url} key={material.url} rel="noreferrer" target="_blank"><ExternalLink size={13} /><span>{material.label || material.url}</span></a>)}</div>}
      </div>
      <div className="agenda-session-actions">
        {onOpenClassroom && !blockingEvent && !['cancelled', 'notHeld'].includes(bundle.session.status) && <button className="primary-action compact" onClick={() => onOpenClassroom(bundle)} type="button"><Clock3 size={15} />{bundle.session.classroomOpenedAt ? 'Reobrir Mode aula' : 'Obrir Mode aula'}</button>}
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
  onOpenTimetableClassroom,
  onOpenCoordination,
  onOpenScheduling,
  onOpenTimetable,
  reminders,
  slots,
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
  const nextTimetableOccurrence = findNextTimetableOccurrence(slots, today, nowTime, calendarEvents)
  const showTimetableFallback = !selectedSessionId
    && !currentBundle
    && nextTimetableOccurrence
    && (!automaticBundle || nextTimetableOccurrence.startsAt < automaticBundle.session.startsAt)
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
        {showTimetableFallback ? (
          <div className="agenda-next-timetable-slot">
            <header>
              <div className="agenda-session-time"><span>{formatDate(nextTimetableOccurrence.date, { weekday: true })}</span><strong>{nextTimetableOccurrence.slot.startsAt}</strong><small>{nextTimetableOccurrence.slot.durationMinutes} min{nextTimetableOccurrence.slot.subgroupId ? ` · ${nextTimetableOccurrence.slot.subgroupId}` : ''}</small></div>
              <div><span>Pròxima classe de l’horari</span><h3>{nextTimetableOccurrence.slot.subject || classNameFor(classes, nextTimetableOccurrence.slot.classId)}</h3><p>{classNameFor(classes, nextTimetableOccurrence.slot.classId)}{nextTimetableOccurrence.slot.space ? ` · ${nextTimetableOccurrence.slot.space}` : ''}</p></div>
              <span className="agenda-session-status timetable">Horari</span>
            </header>
            <div className="agenda-timetable-placeholder"><CalendarRange size={19} /><div><strong>Encara no té activitats calendaritzades</strong><p>Pots preparar la UP o consultar l’horari, però la pròxima classe sempre queda visible.</p></div></div>
            <div className="agenda-session-actions">
              {onOpenTimetableClassroom && <button className="primary-action compact" onClick={() => onOpenTimetableClassroom(nextTimetableOccurrence)} type="button"><Clock3 size={15} />Obrir Mode aula</button>}
              {onOpenTimetable && <button className="secondary-action compact" onClick={onOpenTimetable} type="button"><CalendarRange size={15} />Veure l’horari</button>}
            </div>
          </div>
        ) : selectedBundle ? <SessionDetail bundle={selectedBundle} calendarEvents={calendarEvents} classes={classes} onAdjust={onAdjust} onOpenClassroom={onOpenClassroom} /> : <div className="agenda-today-empty"><Clock3 size={30} /><strong>No hi ha cap pròxima sessió calendaritzada</strong><p>Pots preparar una nova seqüència o revisar l’horari i les excepcions abans de continuar.</p>{(onOpenScheduling || onOpenTimetable) && <div className="agenda-today-actions">{onOpenScheduling && <button className="primary-action" onClick={onOpenScheduling} type="button"><Plus size={17} />Calendaritzar una UP</button>}{onOpenTimetable && <button className="secondary-action" onClick={onOpenTimetable} type="button"><CalendarRange size={17} />Veure l’horari</button>}</div>}</div>}
      </section>
      <aside className="agenda-today-side">
        <section>
          <header><Clock3 size={18} /><div><strong>Sessions d’avui</strong><span>{todayBundles.length} programades</span></div></header>
          {todayBundles.length === 0 ? <p>Cap classe planificada per avui.</p> : <div className="agenda-today-session-list">{todayBundles.map((bundle) => <button className={bundle.session.id === selectedBundle?.session.id ? 'active' : ''} key={bundle.session.id} onClick={() => setSelectedSessionId(bundle.session.id)} type="button"><span>{sessionTime(bundle)}</span><div><strong>{classNameFor(classes, bundle.session.classId)}</strong><small>{bundle.planningUnit.code} · {bundle.items.length} activitats</small></div></button>)}</div>}
          {timetable && <small className="agenda-applied-timetable">Horari aplicable: {timetable.label}</small>}
        </section>
        <section>
          <header><Bell size={18} /><div><strong>Recordatoris</strong><span>Avui i tres dies per endavant</span></div></header>
          {reminders.length === 0 ? <p>No hi ha cap recordatori en aquest període.</p> : (
            <ul className="agenda-reminder-list">
              {reminders.map((item) => (
                <li className={item.kind === 'tutoring' ? 'shared-tutoring' : ''} key={item.id}>
                  <span>{item.reminder?.date?.slice(8, 10) || '—'}</span>
                  {item.kind === 'tutoring' ? (
                    <button onClick={() => onOpenCoordination(item)} type="button">
                      <strong>{item.title}</strong>
                      <small>{item.reminder.time} · {item.classLabel}</small>
                    </button>
                  ) : (
                    <div><strong>{item.title}</strong><small>{item.classItem?.name || item.detail}</small></div>
                  )}
                </li>
              ))}
            </ul>
          )}
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

export function AgendaWeekView({ activeTemporalUnit, bundles, calendarEvents, classes, coordinationReminders, loading, onAddEvent, onMoveWeek, onOpenCoordination, onOpenReminders, onOpenSession, onOpenTimetableClassroom, onReload, onShowMonth, personalReminders, slots, temporalUnitProgress, temporalUnits = [], timetable, weekStart }) {
  const [now, setNow] = useState(() => new Date())
  const days = Array.from({ length: 5 }, (_, index) => addDays(weekStart, index))
  const timetableOccurrences = getWeekTimetableOccurrences({ bundles, slots, timetable, weekStart })
  const today = localDateKey(now)
  const weekContainsToday = days.includes(today)
  const temporalEntries = [
    ...bundles
      .filter((bundle) => days.includes(sessionDate(bundle)))
      .filter((bundle) => !['cancelled', 'notHeld'].includes(bundle.session.status))
      .filter((bundle) => !getNoClassCalendarEvent(calendarEvents, sessionDate(bundle), bundle.session.classId, { sessionId: bundle.session.id }))
      .map((bundle) => ({
        durationMinutes: bundle.session.durationMinutes,
        id: `session:${bundle.session.id}`,
        startsAt: bundle.session.startsAt,
      })),
    ...timetableOccurrences
      .filter((occurrence) => !getNoClassCalendarEvent(calendarEvents, occurrence.date, occurrence.slot.classId, { timetableSlotId: occurrence.slot.id }))
      .map((occurrence) => ({
        durationMinutes: occurrence.slot.durationMinutes,
        id: `timetable:${occurrence.id}`,
        startsAt: occurrence.startsAt,
      })),
  ]
  const temporalState = getAgendaWeekTemporalState(temporalEntries, now, weekContainsToday)
  useEffect(() => {
    const interval = globalThis.setInterval(() => setNow(new Date()), 30000)
    return () => globalThis.clearInterval(interval)
  }, [])
  return (
    <section className="agenda-week-view">
      <header className="agenda-view-toolbar">
        <div><span className="agenda-view-kicker">Setmana lectiva</span><div className="contextual-section-title"><h2>{formatDate(days[0])} – {formatDate(days[4])}</h2><ContextualHelp title="Calendari setmanal">Mostra conjuntament les classes de l’horari, les sessions programades, els recordatoris i els canvis lectius de la setmana.</ContextualHelp></div></div>
        <div className="agenda-calendar-toolbar-actions">
          <TemporalUnitCountdown progress={temporalUnitProgress} temporalUnit={activeTemporalUnit} />
          <div aria-label="Vista del calendari" className="agenda-calendar-view-switch" role="group"><button className="active" type="button">Setmana</button><button onClick={onShowMonth} type="button">Mes</button></div>
          <div className="agenda-toolbar-actions"><button aria-label="Setmana anterior" className="secondary-action compact" onClick={() => onMoveWeek(-7)} type="button"><ArrowLeft size={15} /></button><button className="secondary-action compact" onClick={() => onMoveWeek(0)} type="button">Avui</button><button aria-label="Setmana següent" className="secondary-action compact" onClick={() => onMoveWeek(7)} type="button"><ArrowRight size={15} /></button><button aria-label="Recarregar setmana" className="secondary-action compact" onClick={onReload} type="button"><RotateCcw className={loading ? 'spin' : ''} size={15} /></button></div>
        </div>
      </header>
      <div className="agenda-week-columns">{days.map((dateKey) => {
        const dayBundles = bundles.filter((bundle) => sessionDate(bundle) === dateKey)
        const dayCoordinationReminders = coordinationReminders.filter((item) => item.reminder?.date === dateKey)
        const dayPersonalReminders = personalReminders.filter((item) => item.reminder?.date === dateKey)
        const dayTimetable = timetableOccurrences.filter((item) => item.date === dateKey)
        const dayEvents = getCalendarEventsForDate(calendarEvents, dateKey)
        const visibleDayEvents = dayEvents.filter((event) => !calendarEventTargetsSession(event))
        const wholeDayEvent = getNoClassCalendarEvent(calendarEvents, dateKey, '')
        const endingTemporalUnits = temporalUnits.filter((unit) => unit.endsOn === dateKey)
        const dayItems = [
          ...dayBundles.map((bundle) => ({ bundle, kind: 'session', time: sessionTime(bundle) })),
          ...dayCoordinationReminders.map((reminder) => ({ kind: 'coordination-reminder', reminder, time: reminder.reminder.time || '00:00' })),
          ...dayPersonalReminders.map((reminder) => ({ kind: 'personal-reminder', reminder, time: reminder.reminder.time || '00:00' })),
          ...dayTimetable.map((occurrence) => ({ kind: 'timetable', occurrence, time: occurrence.slot.startsAt })),
        ].sort((left, right) => left.time.localeCompare(right.time))
        const totalClasses = dayBundles.length + dayTimetable.length
        return (
          <section className={dateKey === today ? 'is-today' : ''} key={dateKey}>
            <header>
              <span>{formatDate(dateKey, { weekday: true })}</span>
              <strong>{dateKey.slice(8, 10)}</strong>
              <small>{totalClasses} {totalClasses === 1 ? 'classe' : 'classes'}{dayCoordinationReminders.length + dayPersonalReminders.length ? ` · ${dayCoordinationReminders.length + dayPersonalReminders.length} ${dayCoordinationReminders.length + dayPersonalReminders.length === 1 ? 'recordatori' : 'recordatoris'}` : ''}</small>
              {onAddEvent && <button aria-label={wholeDayEvent ? `Editar ${wholeDayEvent.title}` : `Inhabilitar totes les sessions de ${formatDate(dateKey, { weekday: true })}`} className={`agenda-week-day-moon ${wholeDayEvent ? 'active' : ''}`} onClick={() => onAddEvent(wholeDayEvent || { endsOn: dateKey, scope: 'day', startsOn: dateKey, title: 'Festiu', type: 'holiday' })} title={wholeDayEvent?.title || 'Inhabilitar totes les sessions del dia'} type="button"><Moon size={14} /></button>}
            </header>
            <div>
              <TemporalUnitEndMarker temporalUnits={endingTemporalUnits} />
              {visibleDayEvents.map((event) => <button className="agenda-week-day-event" disabled={!onAddEvent} key={event.id} onClick={() => onAddEvent?.(event)} type="button">{isNoClassCalendarEvent(event) ? <Moon size={12} /> : <CalendarPlus size={12} />}<span><strong>{event.title}</strong><small>{CALENDAR_EVENT_LABELS[event.type] || 'Canvi de calendari'}</small></span></button>)}
              {dayItems.length === 0 ? <p>Sense classes ni recordatoris</p> : dayItems.map((item) => {
              if (item.kind === 'session') {
                const classItem = classes.find((candidate) => candidate.id === item.bundle.session.classId)
                const target = { sessionId: item.bundle.session.id }
                const blockingEvent = getNoClassCalendarEvent(calendarEvents, dateKey, item.bundle.session.classId, target)
                const targetedEvent = getTargetedCalendarEvent(calendarEvents, dateKey, item.bundle.session.classId, target)
                const stoppedStatus = ['cancelled', 'notHeld'].includes(item.bundle.session.status)
                const stopReason = blockingEvent?.title || (stoppedStatus ? STATUS_LABELS[item.bundle.session.status] : '')
                const timeState = temporalState[`session:${item.bundle.session.id}`] || {}
                const activityLabel = item.bundle.detailsLoaded === false && item.bundle.items.length === 0
                  ? 'detall en obrir'
                  : `${item.bundle.items.length} activitats`
                return <article className="agenda-week-session-shell" key={item.bundle.session.id}><button aria-current={timeState.isCurrent ? 'time' : undefined} className={`agenda-week-session ${classItem?.color || 'blue'} ${item.bundle.session.status} ${stopReason ? 'calendar-blocked' : ''} ${timeState.isPast ? 'is-past' : ''} ${timeState.isFocused ? 'is-focused' : ''}`} onClick={() => onOpenSession(item.bundle)} type="button"><span>{stopReason && <Moon size={12} />}{item.time}</span><strong>{classNameFor(classes, item.bundle.session.classId)}</strong><small>{stopReason ? `${stopReason} · la sessió no es fa` : `${item.bundle.planningUnit.code} · ${activityLabel}`}</small>{timeState.isFocused && <i className="agenda-week-focus-label">{timeState.isCurrent ? 'Ara' : 'Següent'}</i>}</button>{onAddEvent && <button aria-label={targetedEvent ? `Editar ${targetedEvent.title}` : `Inhabilitar la sessió de les ${item.time}`} className={`agenda-week-session-moon ${targetedEvent ? 'active' : ''}`} onClick={() => onAddEvent(targetedEvent || { classIds: [item.bundle.session.classId], endsOn: dateKey, scope: 'session', sessionId: item.bundle.session.id, startsOn: dateKey, title: 'Classe anul·lada', type: 'cancellation' })} title={targetedEvent?.title || 'Inhabilitar només aquesta sessió'} type="button"><Moon size={13} /></button>}</article>
              }
              if (item.kind === 'coordination-reminder') {
                return <button className="agenda-week-reminder" key={item.reminder.id} onClick={() => onOpenCoordination(item.reminder)} type="button"><span><AgendaDoubleBell size={11} />{item.time}</span><strong>{item.reminder.title}</strong><small>{item.reminder.classLabel} · Cotutoria compartida</small></button>
              }
              if (item.kind === 'personal-reminder') {
                return <button className="agenda-week-reminder" key={item.reminder.id} onClick={() => onOpenReminders([item.reminder])} type="button"><span><Bell size={11} />{item.reminder.reminder.time || 'Tot el dia'}</span><strong>{item.reminder.title}</strong><small>{item.reminder.classItem?.name || 'Recordatori general'}</small></button>
              }
              const classItem = classes.find((candidate) => candidate.id === item.occurrence.slot.classId)
              const slot = item.occurrence.slot
              const slotDetails = [
                slot.subject && slot.subject !== classItem?.name ? slot.subject : '',
                `${slot.durationMinutes} min`,
                slot.subgroupId,
                slot.space,
              ].filter(Boolean).join(' · ')
              const target = { timetableSlotId: slot.id }
              const blockingEvent = getNoClassCalendarEvent(calendarEvents, dateKey, slot.classId, target)
              const targetedEvent = getTargetedCalendarEvent(calendarEvents, dateKey, slot.classId, target)
              const timeState = temporalState[`timetable:${item.occurrence.id}`] || {}
              return <article className="agenda-week-session-shell" key={item.occurrence.id}><button aria-current={timeState.isCurrent ? 'time' : undefined} className={`agenda-week-timetable ${classItem?.color || 'blue'} ${blockingEvent ? 'calendar-blocked' : ''} ${timeState.isPast ? 'is-past' : ''} ${timeState.isFocused ? 'is-focused' : ''}`} disabled={Boolean(blockingEvent)} onClick={() => onOpenTimetableClassroom(item.occurrence)} type="button"><span>{blockingEvent ? <Moon size={12} /> : <CalendarRange size={12} />}{item.time}</span><strong>{classItem?.name || slot.subject || 'Classe'}</strong><small>{blockingEvent ? `${blockingEvent.title} · la classe no es fa` : slotDetails}</small><em>{blockingEvent ? 'No lectiu' : 'Obrir Mode aula'}</em>{timeState.isFocused && <i className="agenda-week-focus-label">{timeState.isCurrent ? 'Ara' : 'Següent'}</i>}</button>{onAddEvent && <button aria-label={targetedEvent ? `Editar ${targetedEvent.title}` : `Inhabilitar la sessió de les ${item.time}`} className={`agenda-week-session-moon ${targetedEvent ? 'active' : ''}`} onClick={() => onAddEvent(targetedEvent || { classIds: [slot.classId], endsOn: dateKey, scope: 'session', startsOn: dateKey, timetableSlotId: slot.id, title: 'Classe anul·lada', type: 'cancellation' })} title={targetedEvent?.title || 'Inhabilitar només aquesta sessió'} type="button"><Moon size={13} /></button>}</article>
            })}
            </div>
          </section>
        )
      })}</div>
    </section>
  )
}

export function AgendaMonthView({ academicYear, activeTemporalUnit, bundles, calendarEvents, coordinationReminders, monthKey, onAddEvent, onDeleteEvent, onEditEvent, onMoveMonth, onOpenReminders, onSelectWeek, onShowWeek, personalReminders, slots, temporalUnitProgress, temporalUnits = [], timetable, today }) {
  const calendarStartsOn = [academicYear?.startsOn, timetable?.effectiveFrom].filter(Boolean).sort().at(-1)
  const weeks = getMonthCalendarWeeks(monthKey, { ...academicYear, startsOn: calendarStartsOn })
  const monthPrefix = monthKey.slice(0, 7)
  const nextMonthDate = new Date(`${monthKey}T12:00:00Z`)
  nextMonthDate.setUTCMonth(nextMonthDate.getUTCMonth() + 1)
  const nextMonthKey = nextMonthDate.toISOString().slice(0, 10)
  const monthEnd = addDays(nextMonthKey, -1)
  const monthEvents = calendarEvents.filter((event) => event.startsOn <= monthEnd && (event.endsOn || event.startsOn) >= monthKey)
  const nextWeekStart = addDays(startOfCalendarWeek(today), 7)
  const proposedEditableDate = academicYear?.startsOn && monthKey < academicYear.startsOn ? academicYear.startsOn : monthKey
  const firstEditableDate = academicYear?.endsOn && proposedEditableDate > academicYear.endsOn ? academicYear.endsOn : proposedEditableDate
  const firstCourseMonth = String(academicYear?.startsOn || '').slice(0, 7)
  const lastCourseMonth = String(academicYear?.endsOn || '').slice(0, 7)

  return (
    <section className="agenda-month-view">
      <header className="agenda-view-toolbar">
        <div><span className="agenda-view-kicker">Calendari mensual</span><div className="contextual-section-title"><h2>{formatMonth(monthKey)}</h2><ContextualHelp title="Calendari mensual">Resumeix les setmanes lectives, les vacances, els festius i els canvis de jornada del mes.</ContextualHelp></div></div>
        <div className="agenda-calendar-toolbar-actions">
          <TemporalUnitCountdown progress={temporalUnitProgress} temporalUnit={activeTemporalUnit} />
          <div aria-label="Vista del calendari" className="agenda-calendar-view-switch" role="group"><button onClick={onShowWeek} type="button">Setmana</button><button className="active" type="button">Mes</button></div>
          {onAddEvent && <button className="primary-action compact" onClick={() => onAddEvent({ endsOn: firstEditableDate, startsOn: firstEditableDate, type: 'holiday' })} type="button"><CalendarPlus size={15} />Marcar dia o període</button>}
          <div className="agenda-toolbar-actions"><button aria-label="Mes anterior" className="secondary-action compact" disabled={Boolean(firstCourseMonth && monthPrefix <= firstCourseMonth)} onClick={() => onMoveMonth(-1)} type="button"><ArrowLeft size={15} /></button><button className="secondary-action compact" onClick={() => onMoveMonth(0)} type="button">Avui</button><button aria-label="Mes següent" className="secondary-action compact" disabled={Boolean(lastCourseMonth && monthPrefix >= lastCourseMonth)} onClick={() => onMoveMonth(1)} type="button"><ArrowRight size={15} /></button></div>
        </div>
      </header>
      <div className="agenda-month-weeks">{weeks.map((week) => {
        const vacationEvent = calendarEvents.find((event) => calendarEventCoversSchoolWeek(event, week.weekStart))
        const weekOccurrences = getWeekTimetableOccurrences({ bundles, slots, timetable, weekStart: week.weekStart })
        const weekBundles = bundles.filter((bundle) => sessionDate(bundle) >= week.weekStart && sessionDate(bundle) <= week.weekEnd)
        const isNextWeek = week.weekStart === nextWeekStart
        const editableWeekStart = academicYear?.startsOn && week.weekStart < academicYear.startsOn ? academicYear.startsOn : week.weekStart
        const editableWeekEnd = academicYear?.endsOn && week.weekEnd > academicYear.endsOn ? academicYear.endsOn : week.weekEnd
        return (
          <article className={`${vacationEvent ? 'vacation' : ''} ${isNextWeek ? 'next' : ''}`} key={week.weekStart}>
            <header>
              <button onClick={() => onSelectWeek(week.weekStart)} type="button"><span>Setmana {formatDate(week.weekStart, { long: true })}</span><small>{formatDate(week.weekStart)} – {formatDate(week.weekEnd)}</small>{isNextWeek && <em>Següent setmana</em>}</button>
              {onAddEvent && <button aria-label={vacationEvent ? `Editar ${vacationEvent.title}` : `Marcar la setmana del ${formatDate(week.weekStart)} com a vacances`} className={`agenda-week-vacation ${vacationEvent ? 'active' : ''}`} onClick={() => vacationEvent ? onEditEvent(vacationEvent) : onAddEvent({ endsOn: editableWeekEnd, startsOn: editableWeekStart, title: 'Vacances', type: 'nonTeaching' })} title={vacationEvent ? vacationEvent.title : 'Marcar tota la setmana com a no lectiva'} type="button"><Moon size={17} /></button>}
            </header>
            <div className="agenda-month-days">{week.days.slice(0, 5).map((dateKey) => {
              const dayEvents = getCalendarEventsForDate(calendarEvents, dateKey)
              const noClassEvent = getNoClassCalendarEvent(calendarEvents, dateKey, '')
              const classCount = weekOccurrences.filter((item) => item.date === dateKey).length
                + weekBundles.filter((bundle) => sessionDate(bundle) === dateKey).length
              const dayCoordinationReminders = coordinationReminders.filter((item) => item.reminder?.date === dateKey)
              const dayPersonalReminders = personalReminders.filter((item) => item.reminder?.date === dateKey)
              const reminderCount = dayCoordinationReminders.length + dayPersonalReminders.length
              const dateIsEditable = (!academicYear?.startsOn || dateKey >= academicYear.startsOn)
                && (!academicYear?.endsOn || dateKey <= academicYear.endsOn)
              const endingTemporalUnits = temporalUnits.filter((unit) => unit.endsOn === dateKey)
              return (
                <div className={`${dateKey.slice(0, 7) === monthPrefix ? '' : 'outside'} ${noClassEvent ? 'non-teaching' : ''} ${endingTemporalUnits.length ? 'ut-end' : ''}`} key={dateKey}>
                  <button className="agenda-month-day-open" onClick={() => onSelectWeek(week.weekStart)} type="button"><span>{formatDate(dateKey, { weekday: true }).split(',')[0]}</span><strong>{dateKey.slice(8, 10)}</strong></button>
                  {onAddEvent && dateIsEditable && <button aria-label={noClassEvent ? `Editar ${noClassEvent.title}` : `Marcar ${formatDate(dateKey, { weekday: true })} com a no lectiu`} className="agenda-month-day-moon" onClick={() => noClassEvent ? onEditEvent(noClassEvent) : onAddEvent({ endsOn: dateKey, startsOn: dateKey, title: 'Festiu', type: 'holiday' })} title={noClassEvent?.title || 'Marcar tot el dia com a no lectiu'} type="button"><Moon size={12} /></button>}
                  <TemporalUnitEndMarker temporalUnits={endingTemporalUnits} />
                  <small>{dayEvents[0]?.title || [classCount ? `${classCount} ${classCount === 1 ? 'classe' : 'classes'}` : '', reminderCount ? `${reminderCount} avís` : ''].filter(Boolean).join(' · ') || '—'}</small>
                  {reminderCount > 0 && <div className="agenda-month-reminders">
                    {dayPersonalReminders.length > 0 && <button aria-label={`${dayPersonalReminders.length} ${dayPersonalReminders.length === 1 ? 'recordatori' : 'recordatoris'} del ${formatDate(dateKey, { weekday: true })}`} onClick={() => onOpenReminders(dayPersonalReminders)} title="Obrir aquests recordatoris" type="button"><Bell size={10} /><span>{dayPersonalReminders.length}</span></button>}
                    {dayCoordinationReminders.length > 0 && <button aria-label={`${dayCoordinationReminders.length} ${dayCoordinationReminders.length === 1 ? 'recordatori compartit' : 'recordatoris compartits'} del ${formatDate(dateKey, { weekday: true })}`} onClick={() => onOpenReminders(dayCoordinationReminders)} title="Obrir aquests recordatoris de cotutoria" type="button"><AgendaDoubleBell size={10} /><span>{dayCoordinationReminders.length}</span></button>}
                  </div>}
                </div>
              )
            })}</div>
          </article>
        )
      })}</div>
      <section className="agenda-month-events">
        <header><Moon size={18} /><div><strong>Festius i canvis del mes</strong><span>{monthEvents.length} configurats</span></div></header>
        {monthEvents.length === 0 ? <p>Encara no hi ha cap festiu, vacances o canvi de jornada aquest mes.</p> : <div>{monthEvents.map((event) => <article key={event.id}><span>{isNoClassCalendarEvent(event) ? <Moon size={15} /> : <CalendarPlus size={15} />}</span><div><strong>{event.title}</strong><small>{CALENDAR_EVENT_LABELS[event.type] || 'Canvi de calendari'} · {formatDateRange(event)}</small>{event.reason && <p>{event.reason}</p>}</div>{onAddEvent && <><button aria-label={`Editar ${event.title}`} className="icon-action" onClick={() => onEditEvent(event)} type="button"><Edit3 size={14} /></button><button aria-label={`Eliminar ${event.title}`} className="icon-action danger" onClick={() => onDeleteEvent(event)} type="button"><Trash2 size={14} /></button></>}</article>)}</div>}
      </section>
    </section>
  )
}

function TimelineRows({ calendarEvents, groups, onOpenSession }) {
  return <div className="agenda-timeline-list">{groups.flatMap((group) => group.bundles.map((bundle) => {
    const blockingEvent = getNoClassCalendarEvent(calendarEvents, sessionDate(bundle), bundle.session.classId, { sessionId: bundle.session.id })
    const load = bundle.detailsLoaded === false ? null : getSessionLoad(bundle.items, bundle.session.durationMinutes)
    const freeMinutes = load && bundle.session.status === 'planned'
      ? Math.max(0, load.programmableMinutes - load.plannedMinutes)
      : 0
    const activities = bundle.detailsLoaded === false
      ? [{ id: 'loading', title: 'Obre per veure les activitats', showTiming: false }]
      : bundle.items.length > 0
        ? bundle.items
        : [{ id: 'empty', title: 'Sessió sense activitats', showTiming: false }]
    return <button className={`${blockingEvent ? 'calendar-blocked' : ''} ${group.isParallel ? 'parallel-session' : ''} ${freeMinutes > 0 ? 'underfilled' : ''}`} key={bundle.session.id} onClick={() => onOpenSession(bundle)} type="button"><span className="agenda-timeline-index">{group.sequence}</span><span className="agenda-timeline-dot">{blockingEvent && <Moon size={9} />}</span><div className="agenda-timeline-date"><strong>{formatDate(sessionDate(bundle), { weekday: true })}</strong><small>{sessionTime(bundle)} · {bundle.session.durationMinutes} min{bundle.session.subgroupId ? ` · ${bundle.session.subgroupId}` : ''}</small></div><div className="agenda-timeline-content">{group.isParallel && <span>Mateixa sessió de mig grup</span>}{blockingEvent ? <div className="agenda-timeline-activity"><strong>{blockingEvent.title}</strong><small>Aquesta sessió no es fa</small></div> : activities.map((item) => <div className="agenda-timeline-activity" key={item.id}><strong>{item.title}</strong>{item.showTiming !== false && <small>{item.plannedMinutes ? `${item.plannedMinutes} min${item.segmentCount > 1 ? ` · part ${item.segmentIndex}/${item.segmentCount}` : ''}` : 'Sense temps assignat'}</small>}</div>)}</div><span className={`agenda-session-status ${blockingEvent ? 'notHeld' : freeMinutes > 0 ? 'underfilled' : bundle.session.status}`}>{blockingEvent ? 'No es fa' : freeMinutes > 0 ? `${freeMinutes} min lliures` : STATUS_LABELS[bundle.session.status]}</span><MapPin size={15} /></button>
  }))}</div>
}

export function AgendaTimelineView({
  activeTemporalUnit,
  bundles,
  calendarEvents = [],
  classes,
  hasEarlier = false,
  hasLater = false,
  loading,
  onLoadEarlier,
  onLoadLater,
  onOpenSession,
  onSchedule,
  selectedClassId,
  temporalUnitProgress,
  today = new Date().toISOString().slice(0, 10),
}) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = globalThis.setInterval(() => setNow(Date.now()), 60_000)
    return () => globalThis.clearInterval(timer)
  }, [])
  const classBundles = bundles.filter((bundle) => bundle.session.classId === selectedClassId)
  const logicalGroups = groupParallelSessionBundles(classBundles)
    .map((group, index) => ({ ...group, sequence: index + 1 }))
  const archivedGroups = logicalGroups
    .map((group) => ({ ...group, bundles: group.bundles.filter((bundle) => sessionHasPassed(bundle, now, today)) }))
    .filter((group) => group.bundles.length > 0)
  const upcomingGroups = logicalGroups
    .map((group) => ({ ...group, bundles: group.bundles.filter((bundle) => !sessionHasPassed(bundle, now, today)) }))
    .filter((group) => group.bundles.length > 0)
  const selectedClass = classes.find((item) => item.id === selectedClassId)
  return (
    <section className="agenda-timeline-view">
      <header className="agenda-view-toolbar">
        <div><span className="agenda-view-kicker">Cronologia del grup seleccionat</span><div className="agenda-timeline-selected-class"><h2>{selectedClass?.name || 'Cap grup seleccionat'}</h2>{selectedClass && <ContextualHelp title="Cronologia del grup">Primer es mostren les sessions pendents; les sessions anteriors es conserven plegades dins l’històric.</ContextualHelp>}{loading && <Loader2 className="spin" size={16} />}</div></div>
        <div className="agenda-timeline-toolbar-actions"><TemporalUnitCountdown progress={temporalUnitProgress} temporalUnit={activeTemporalUnit} type="sessions" />{onSchedule && <button className="primary-action compact" onClick={onSchedule} type="button"><Plus size={16} />Calendaritzar UP</button>}</div>
      </header>
      {!selectedClassId ? <div className="agenda-timeline-empty"><Layers3 size={28} /><strong>Selecciona un grup a la barra superior</strong><p>La cronologia seguirà automàticament la classe activa.</p></div> : classBundles.length === 0 ? <div className="agenda-timeline-empty"><CalendarDays size={28} /><strong>No hi ha sessions en aquest tram</strong><p>Pots ampliar la cronologia o calendaritzar una UP nova.</p><div className="agenda-timeline-empty-actions">{hasEarlier && <button disabled={loading} onClick={onLoadEarlier} type="button"><ArrowLeft size={14} />8 setmanes anteriors</button>}{hasLater && <button disabled={loading} onClick={onLoadLater} type="button">8 setmanes següents<ArrowRight size={14} /></button>}</div></div> : <div className="agenda-timeline-sections">
        {upcomingGroups.length > 0 ? <TimelineRows calendarEvents={calendarEvents} groups={upcomingGroups} onOpenSession={onOpenSession} /> : <div className="agenda-timeline-empty compact"><CalendarDays size={24} /><strong>No queden sessions programades</strong><p>Pots consultar les sessions anteriors a l’històric.</p></div>}
        {hasLater && <div className="agenda-timeline-pager future"><button disabled={loading} onClick={onLoadLater} type="button">Veure 8 setmanes següents<ArrowRight size={14} /></button></div>}
        {archivedGroups.length > 0 && <details className="agenda-timeline-archive"><summary><span><History size={16} />Sessions anteriors</span><small>{archivedGroups.length} {archivedGroups.length === 1 ? 'sessió arxivada' : 'sessions arxivades'}</small><ChevronDown size={16} /></summary><TimelineRows calendarEvents={calendarEvents} groups={archivedGroups} onOpenSession={onOpenSession} /></details>}
        {hasEarlier && <div className="agenda-timeline-pager past"><button disabled={loading} onClick={onLoadEarlier} type="button"><ArrowLeft size={14} />Veure 8 setmanes anteriors</button></div>}
      </div>}
    </section>
  )
}

export function AgendaSessionDetail({ bundle, calendarEvents, classes, onAdjust, onOpenClassroom, onResolveGap }) {
  return <SessionDetail bundle={bundle} calendarEvents={calendarEvents} classes={classes} onAdjust={onAdjust} onOpenClassroom={onOpenClassroom} onResolveGap={onResolveGap} />
}
