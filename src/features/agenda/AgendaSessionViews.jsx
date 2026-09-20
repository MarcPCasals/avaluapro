import {
  ArrowLeft, ArrowRight, Bell, CalendarDays, CalendarPlus, CalendarRange, ChevronDown, Clock3, Edit3,
  ExternalLink, Layers3, ListChecks, Loader2, MapPin, Moon, Plus, RotateCcw, Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { getClassroomPromptState } from '../../domain/planning'
import {
  calendarEventCoversSchoolWeek,
  getCalendarEventsForDate,
  getMonthCalendarWeeks,
  getNoClassCalendarEvent,
  isNoClassCalendarEvent,
  startOfCalendarWeek,
} from '../../lib/agendaCalendar'
import { findNextTimetableOccurrence, getWeekTimetableOccurrences } from '../../lib/agendaToday'
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
        {bundle.items.length === 0 ? <p className="agenda-session-muted">Aquesta sessió encara no té cap activitat.</p> : <ol>{bundle.items.map((item) => {
          const description = item.sourceActivity?.description?.trim()
          return <li key={item.id}><span /><div><strong>{item.title}</strong><small>{item.plannedMinutes ? `${item.plannedMinutes} min` : 'Sense temps'}{item.segmentCount > 1 ? ` · part ${item.segmentIndex}/${item.segmentCount}` : ''}</small>{description && <details className="agenda-activity-description"><summary><ChevronDown size={13} />Descripció</summary><p>{description}</p></details>}</div></li>
        })}</ol>}
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
  const nextTimetableOccurrence = findNextTimetableOccurrence(slots, today, nowTime)
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
            <div className="agenda-session-actions">{onOpenTimetable && <button className="secondary-action compact" onClick={onOpenTimetable} type="button"><CalendarRange size={15} />Veure l’horari</button>}</div>
          </div>
        ) : selectedBundle ? <SessionDetail bundle={selectedBundle} classes={classes} onAdjust={onAdjust} onOpenClassroom={onOpenClassroom} /> : <div className="agenda-today-empty"><Clock3 size={30} /><strong>No hi ha cap pròxima sessió calendaritzada</strong><p>Pots preparar una nova seqüència o revisar l’horari i les excepcions abans de continuar.</p>{(onOpenScheduling || onOpenTimetable) && <div className="agenda-today-actions">{onOpenScheduling && <button className="primary-action" onClick={onOpenScheduling} type="button"><Plus size={17} />Calendaritzar una UP</button>}{onOpenTimetable && <button className="secondary-action" onClick={onOpenTimetable} type="button"><CalendarRange size={17} />Veure l’horari</button>}</div>}</div>}
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
                  <span>{item.reminder.date.slice(8, 10)}</span>
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

export function AgendaWeekView({ bundles, calendarEvents, classes, coordinationReminders, loading, onAddEvent, onMoveWeek, onOpenCoordination, onOpenSession, onOpenTimetable, onReload, onShowMonth, slots, timetable, weekStart }) {
  const days = Array.from({ length: 5 }, (_, index) => addDays(weekStart, index))
  const timetableOccurrences = getWeekTimetableOccurrences({ bundles, slots, timetable, weekStart })
  return (
    <section className="agenda-week-view">
      <header className="agenda-view-toolbar">
        <div><span className="agenda-view-kicker">Setmana lectiva</span><h2>{formatDate(days[0])} – {formatDate(days[4])}</h2><p>Classes de l’horari, sessions programades i recordatoris.</p></div>
        <div className="agenda-calendar-toolbar-actions">
          <div aria-label="Vista del calendari" className="agenda-calendar-view-switch" role="group"><button className="active" type="button">Setmana</button><button onClick={onShowMonth} type="button">Mes</button></div>
          {onAddEvent && <button className="secondary-action compact agenda-mark-calendar" onClick={() => onAddEvent({ endsOn: weekStart, startsOn: weekStart, type: 'holiday' })} type="button"><Moon size={14} />Marcar festiu o canvi</button>}
          <div className="agenda-toolbar-actions"><button aria-label="Setmana anterior" className="secondary-action compact" onClick={() => onMoveWeek(-7)} type="button"><ArrowLeft size={15} /></button><button className="secondary-action compact" onClick={() => onMoveWeek(0)} type="button">Avui</button><button aria-label="Setmana següent" className="secondary-action compact" onClick={() => onMoveWeek(7)} type="button"><ArrowRight size={15} /></button><button aria-label="Recarregar setmana" className="secondary-action compact" onClick={onReload} type="button"><RotateCcw className={loading ? 'spin' : ''} size={15} /></button></div>
        </div>
      </header>
      <div className="agenda-week-columns">{days.map((dateKey) => {
        const dayBundles = bundles.filter((bundle) => sessionDate(bundle) === dateKey)
        const dayReminders = coordinationReminders.filter((item) => item.reminder.date === dateKey)
        const dayTimetable = timetableOccurrences.filter((item) => item.date === dateKey)
        const dayEvents = getCalendarEventsForDate(calendarEvents, dateKey)
        const dayItems = [
          ...dayBundles.map((bundle) => ({ bundle, kind: 'session', time: sessionTime(bundle) })),
          ...dayReminders.map((reminder) => ({ kind: 'reminder', reminder, time: reminder.reminder.time })),
          ...dayTimetable.map((occurrence) => ({ kind: 'timetable', occurrence, time: occurrence.slot.startsAt })),
        ].sort((left, right) => left.time.localeCompare(right.time))
        const totalClasses = dayBundles.length + dayTimetable.length
        return (
          <section key={dateKey}>
            <header>
              <span>{formatDate(dateKey, { weekday: true })}</span>
              <strong>{dateKey.slice(8, 10)}</strong>
              <small>{totalClasses} {totalClasses === 1 ? 'classe' : 'classes'}{dayReminders.length ? ` · ${dayReminders.length} ${dayReminders.length === 1 ? 'recordatori' : 'recordatoris'}` : ''}</small>
            </header>
            <div>
              {dayEvents.map((event) => <button className="agenda-week-day-event" disabled={!onAddEvent} key={event.id} onClick={() => onAddEvent?.(event)} type="button">{isNoClassCalendarEvent(event) ? <Moon size={12} /> : <CalendarPlus size={12} />}<span><strong>{event.title}</strong><small>{CALENDAR_EVENT_LABELS[event.type] || 'Canvi de calendari'}</small></span></button>)}
              {dayItems.length === 0 ? <p>Sense classes ni recordatoris</p> : dayItems.map((item) => {
              if (item.kind === 'session') {
                const blockingEvent = getNoClassCalendarEvent(calendarEvents, dateKey, item.bundle.session.classId)
                const stoppedStatus = ['cancelled', 'notHeld'].includes(item.bundle.session.status)
                const stopReason = blockingEvent?.title || (stoppedStatus ? STATUS_LABELS[item.bundle.session.status] : '')
                return <button className={`agenda-week-session ${item.bundle.session.status} ${stopReason ? 'calendar-blocked' : ''}`} key={item.bundle.session.id} onClick={() => onOpenSession(item.bundle)} type="button"><span>{stopReason && <Moon size={12} />}{item.time}</span><strong>{classNameFor(classes, item.bundle.session.classId)}</strong><small>{stopReason ? `${stopReason} · la sessió no es fa` : `${item.bundle.planningUnit.code} · ${item.bundle.items.length} activitats`}</small></button>
              }
              if (item.kind === 'reminder') {
                return <button className="agenda-week-reminder" key={item.reminder.id} onClick={() => onOpenCoordination(item.reminder)} type="button"><span><AgendaDoubleBell size={11} />{item.time}</span><strong>{item.reminder.title}</strong><small>{item.reminder.classLabel} · Cotutoria compartida</small></button>
              }
              const classItem = classes.find((candidate) => candidate.id === item.occurrence.slot.classId)
              const slot = item.occurrence.slot
              const slotDetails = [
                slot.subject && slot.subject !== classItem?.name ? slot.subject : '',
                `${slot.durationMinutes} min`,
                slot.subgroupId,
                slot.space,
              ].filter(Boolean).join(' · ')
              const blockingEvent = getNoClassCalendarEvent(calendarEvents, dateKey, slot.classId)
              return <button className={`agenda-week-timetable ${classItem?.color || 'blue'} ${blockingEvent ? 'calendar-blocked' : ''}`} key={item.occurrence.id} onClick={onOpenTimetable} type="button"><span>{blockingEvent ? <Moon size={12} /> : <CalendarRange size={12} />}{item.time}</span><strong>{classItem?.name || slot.subject || 'Classe'}</strong><small>{blockingEvent ? `${blockingEvent.title} · la classe no es fa` : slotDetails}</small><em>{blockingEvent ? 'No lectiu' : 'Horari · sense programació'}</em></button>
            })}
            </div>
          </section>
        )
      })}</div>
    </section>
  )
}

export function AgendaMonthView({ academicYear, bundles, calendarEvents, coordinationReminders, monthKey, onAddEvent, onDeleteEvent, onEditEvent, onMoveMonth, onSelectWeek, onShowWeek, slots, timetable, today }) {
  const weeks = getMonthCalendarWeeks(monthKey, academicYear || {})
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
        <div><span className="agenda-view-kicker">Calendari mensual</span><h2>{formatMonth(monthKey)}</h2><p>Setmanes lectives, vacances, festius i canvis de jornada.</p></div>
        <div className="agenda-calendar-toolbar-actions">
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
            <div className="agenda-month-days">{week.days.map((dateKey) => {
              const dayEvents = getCalendarEventsForDate(calendarEvents, dateKey)
              const noClassEvent = getNoClassCalendarEvent(calendarEvents, dateKey, '')
              const classCount = weekOccurrences.filter((item) => item.date === dateKey).length
                + weekBundles.filter((bundle) => sessionDate(bundle) === dateKey).length
              const reminderCount = coordinationReminders.filter((item) => item.reminder.date === dateKey).length
              const dateIsEditable = (!academicYear?.startsOn || dateKey >= academicYear.startsOn)
                && (!academicYear?.endsOn || dateKey <= academicYear.endsOn)
              return (
                <div className={`${dateKey.slice(0, 7) === monthPrefix ? '' : 'outside'} ${noClassEvent ? 'non-teaching' : ''}`} key={dateKey}>
                  <button className="agenda-month-day-open" onClick={() => onSelectWeek(week.weekStart)} type="button"><span>{formatDate(dateKey, { weekday: true }).split(',')[0]}</span><strong>{dateKey.slice(8, 10)}</strong></button>
                  {onAddEvent && dateIsEditable && <button aria-label={noClassEvent ? `Editar ${noClassEvent.title}` : `Marcar ${formatDate(dateKey, { weekday: true })} com a no lectiu`} className="agenda-month-day-moon" onClick={() => noClassEvent ? onEditEvent(noClassEvent) : onAddEvent({ endsOn: dateKey, startsOn: dateKey, title: 'Festiu', type: 'holiday' })} title={noClassEvent?.title || 'Marcar tot el dia com a no lectiu'} type="button"><Moon size={12} /></button>}
                  <small>{dayEvents[0]?.title || [classCount ? `${classCount} ${classCount === 1 ? 'classe' : 'classes'}` : '', reminderCount ? `${reminderCount} avís` : ''].filter(Boolean).join(' · ') || '—'}</small>
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

export function AgendaTimelineView({ bundles, classes, loading, onOpenSession, onSchedule, selectedClassId }) {
  const classBundles = bundles.filter((bundle) => bundle.session.classId === selectedClassId)
  const selectedClass = classes.find((item) => item.id === selectedClassId)
  return (
    <section className="agenda-timeline-view">
      <header className="agenda-view-toolbar">
        <div><span className="agenda-view-kicker">Cronologia del grup seleccionat</span><div className="agenda-timeline-selected-class"><h2>{selectedClass?.name || 'Cap grup seleccionat'}</h2>{loading && <Loader2 className="spin" size={16} />}</div><p>Totes les sessions del curs, de la primera a l’última.</p></div>
        {onSchedule && <button className="primary-action compact" onClick={onSchedule} type="button"><Plus size={16} />Calendaritzar UP</button>}
      </header>
      {!selectedClassId ? <div className="agenda-timeline-empty"><Layers3 size={28} /><strong>Selecciona un grup a la barra superior</strong><p>La cronologia seguirà automàticament la classe activa.</p></div> : classBundles.length === 0 ? <div className="agenda-timeline-empty"><CalendarDays size={28} /><strong>Aquest grup encara no té sessions</strong><p>Calendaritza una UP per començar la cronologia.</p></div> : <div className="agenda-timeline-list">{classBundles.map((bundle, index) => <button key={bundle.session.id} onClick={() => onOpenSession(bundle)} type="button"><span className="agenda-timeline-index">{index + 1}</span><span className="agenda-timeline-dot" /><div className="agenda-timeline-date"><strong>{formatDate(sessionDate(bundle), { weekday: true })}</strong><small>{sessionTime(bundle)} · {bundle.session.durationMinutes} min</small></div><div className="agenda-timeline-content"><span>{bundle.planningUnit.code}</span><strong>{bundle.planningUnit.title}</strong><small>{bundle.items.map((item) => item.title).join(' · ') || 'Sessió sense activitats'}</small></div><span className={`agenda-session-status ${bundle.session.status}`}>{STATUS_LABELS[bundle.session.status]}</span><MapPin size={15} /></button>)}</div>}
    </section>
  )
}

export function AgendaSessionDetail({ bundle, classes, onAdjust, onOpenClassroom }) {
  return <SessionDetail bundle={bundle} classes={classes} onAdjust={onAdjust} onOpenClassroom={onOpenClassroom} />
}
