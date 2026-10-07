import {
  AlertTriangle, ArrowDown, ArrowUp, ArrowLeft, ArrowRight, Bell, CalendarDays, CalendarPlus, CalendarRange, ChevronDown, Clock3, Edit3,
  ExternalLink, Flag, History, Layers3, ListChecks, Loader2, MapPin, Moon, Pin, PinOff, Plus, RotateCcw, StickyNote, Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { ContextualHelp } from '../../components/ContextualHelp'
import { FormattedText } from '../../components/FormattedText'
import { getEffectiveActivityMaterialLinks, getClassroomPromptState, getSessionLoad, canReorderAgendaSession, isBabeliumItem, combineAgendaSessionItems, groupParallelSessionBundles, getClassPlanningSubjects, resolvePlanningSubject, planningSubjectsMatch, sessionMatchesPlanningSubject, buildTimetableSessionCandidates } from '../../domain/planning'
import {
  calendarEventCoversSchoolWeek,
  calendarEventTargetsSession,
  getCalendarEventsForDate,
  getMonthCalendarWeeks,
  getNoClassCalendarEvent,
  isNoClassCalendarEvent,
  startOfCalendarWeek,
} from '../../lib/agendaCalendar'
import { filterAgendaItemsForClass, findNextTimetableOccurrence, getAgendaWeekTemporalState, getAgendaSessionItemRemovalState, getWeekTimetableOccurrences } from '../../lib/agendaToday'
import { getTimetableSessionNoteId } from '../../domain/planning/sessionNotes'
import { AgendaSessionActivityPicker } from './AgendaSessionActivityPicker'
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
  if (isSessions) {
    return <div className="agenda-ut-countdown sessions" title={`${temporalUnit.label}: queden ${remaining} sessions lectives de ${total} totals`}><Flag size={14} /><span><strong>{remaining}</strong> sessions lectives restants</span><small>de {total} totals · {temporalUnit.label}</small></div>
  }
  const unitLabel = remaining === 1 ? 'dia laborable' : 'dies laborables'
  return <div className="agenda-ut-countdown" title={`${temporalUnit.label}: ${remaining} ${unitLabel}`}><Flag size={14} /><span><strong>{remaining}</strong> {unitLabel}</span><small>fins al final de {temporalUnit.label}</small></div>
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
  const materials = bundle.items.flatMap((item) => getEffectiveActivityMaterialLinks(item.sourceActivity, bundle.planningUnit))
  if (bundle.items.length === 0) {
    materials.push(...getEffectiveActivityMaterialLinks({}, bundle.planningUnit))
  }
  return [...new Map(materials.map((item) => [item.url, item])).values()]
}

function SessionDetail({ bundle, calendarEvents = [], classes, onAdjust, onOpenClassroom, onRemoveItem, onSaveItem, onMoveItem, onResolveGap, onLoadActivities, onAddActivity }) {
  const [removalItemId, setRemovalItemId] = useState('')
  const [removing, setRemoving] = useState(false)
  const [removalError, setRemovalError] = useState('')
  const [editItemId, setEditItemId] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editMinutes, setEditMinutes] = useState('')
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [editNotice, setEditNotice] = useState('')
  const [activityChoices, setActivityChoices] = useState(null)
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [activityError, setActivityError] = useState('')
  const [resolvingGap, setResolvingGap] = useState(false)
  const [gapError, setGapError] = useState('')
  const [moving, setMoving] = useState(false)
  const [moveError, setMoveError] = useState('')
  const moveItem = async (item, direction) => {
    setMoving(true)
    setMoveError('')
    try { await onMoveItem(item, direction) }
    catch (error) { setMoveError(error.message || 'No s’ha pogut canviar l’ordre.') }
    finally { setMoving(false) }
  }
  const busy = removing || saving || loadingActivities || resolvingGap || moving
  const resolveGap = async () => {
    if (busy) return
    setResolvingGap(true)
    setGapError('')
    try { await onResolveGap(bundle) }
    catch (error) { setGapError(error.message || 'No s’ha pogut recalcular la cronologia.') }
    finally { setResolvingGap(false) }
  }
  const openActivityPicker = async () => {
    setLoadingActivities(true)
    setActivityError('')
    setRemovalItemId('')
    setEditItemId('')
    try { setActivityChoices(await onLoadActivities()) }
    catch (error) { setActivityError(error.message || 'No s’han pogut carregar les activitats.') }
    finally { setLoadingActivities(false) }
  }
  const addActivity = async (activityId, minutes) => {
    setSaving(true)
    setEditNotice('')
    try {
      await onAddActivity(activityId, minutes)
      setActivityChoices(null)
      setEditNotice('Activitat afegida a aquesta sessió. La programació original es conserva.')
    } finally { setSaving(false) }
  }
  const toggleFixed = async (item) => {
    setSaving(true)
    setEditError('')
    try {
      const fixedToSession = item.fixedToSession === false
      await onSaveItem(item, { fixedToSession })
      setEditNotice(fixedToSession ? 'Activitat fixada al dia i l’hora de la sessió.' : 'Activitat desfixada. Es podrà redistribuir amb els reajustaments.')
    } catch (error) { setEditError(error.message || 'No s’ha pogut canviar la fixació.') }
    finally { setSaving(false) }
  }
  const saveItem = async (event, item) => {
    event.preventDefault()
    setSaving(true)
    setEditError('')
    setEditNotice('')
    try {
      await onSaveItem(item, { title: editTitle.trim(), plannedMinutes: Number(editMinutes) })
      setEditItemId('')
      setEditNotice('Activitat desada i cronologia futura reajustada.')
    } catch (error) {
      setEditError(error.message || 'No s’ha pogut desar el temps de l’activitat.')
    } finally {
      setSaving(false)
    }
  }
  const removeItem = async (item) => {
    setRemoving(true)
    setRemovalError('')
    try {
      await onRemoveItem(item)
      setRemovalItemId('')
      setActivityChoices(null)
      setEditNotice(isBabeliumItem(item) ? 'Babèlium retirat només d’aquesta sessió. Les altres sessions de l’horari es conserven.' : 'Activitat retirada de la sessió i conservada fora del calendari. La pots recuperar amb «Afegir activitat».')
    } catch (error) {
      setRemovalError(error.message || 'No s’ha pogut treure l’activitat de la sessió.')
    } finally {
      setRemoving(false)
    }
  }
  if (!bundle) return null
  const materials = sessionMaterials(bundle)
  const visibleItems = combineAgendaSessionItems([...bundle.items].sort((a, b) => Number(a.order) - Number(b.order)), bundle.planningUnit.id)
  const sessionLoad = getSessionLoad(bundle.items, bundle.session.durationMinutes)
  const freeMinutes = Math.max(0, sessionLoad.programmableMinutes - sessionLoad.plannedMinutes)
  const blockingEvent = getNoClassCalendarEvent(calendarEvents, sessionDate(bundle), bundle.session.classId, { sessionId: bundle.session.id, timetableSlotId: bundle.session.timetableSlotId })
  return (
    <div className="agenda-session-detail">
      <header>
        <div className="agenda-session-time"><span>{formatDate(sessionDate(bundle), { weekday: true })}</span><strong>{sessionTime(bundle)}</strong><small>{bundle.session.durationMinutes} min{bundle.session.subgroupId ? ` · ${bundle.session.subgroupId}` : ''}</small></div>
        <div><span>{bundle.planningUnit.code}</span><h3>{bundle.planningUnit.title}</h3><p>{classNameFor(classes, bundle.session.classId)}</p></div>
        <span className={`agenda-session-status ${blockingEvent ? 'notHeld' : bundle.session.status}`}>{blockingEvent ? 'No es fa' : STATUS_LABELS[bundle.session.status]}</span>
      </header>
      {blockingEvent && <div className="agenda-session-calendar-blocked"><Moon size={18} /><div><strong>{blockingEvent.title}</strong><span>{CALENDAR_EVENT_LABELS[blockingEvent.type] || 'Canvi de calendari'} · aquesta sessió no es fa.</span>{blockingEvent.reason && <p>{blockingEvent.reason}</p>}</div></div>}
      {!blockingEvent && bundle.session.status === 'planned' && freeMinutes > 0 && <div className="agenda-session-gap-warning"><AlertTriangle size={18} /><div><strong>{freeMinutes} min programables sense ocupar</strong><span>Pots avançar la propera activitat i, si cal, dividir-la per completar els {sessionLoad.programmableMinutes} minuts.</span></div>{onResolveGap && <button className="secondary-action compact" disabled={busy} aria-busy={resolvingGap} onClick={resolveGap} type="button">{resolvingGap ? <Loader2 aria-hidden="true" className="spin" size={14} /> : <ArrowLeft size={14} />}{resolvingGap ? 'Recalculant la cronologia…' : 'Avançar la propera activitat'}</button>}</div>}
      {!blockingEvent && bundle.session.status === 'planned' && bundle.session.babeliumEnabled && sessionLoad.plannedMinutes > sessionLoad.programmableMinutes && <div className="agenda-session-gap-warning"><AlertTriangle size={18} /><div><strong>{sessionLoad.plannedMinutes - sessionLoad.programmableMinutes} min per sobre del temps disponible</strong><span>Reorganitza les activitats amb la calendarització intel·ligent per respectar el bloc de Babèlium i el temps real de classe.</span></div></div>}
      {resolvingGap && <p className="agenda-session-edit-notice" role="status">Recalculant la cronologia… Espera un moment.</p>}
      {gapError && <p role="alert">{gapError}</p>}
      {editNotice && <p className="agenda-session-edit-notice" role="status">{editNotice}</p>}
      <div className="agenda-session-activities">
        <div className="agenda-session-subheading"><ListChecks size={16} /><strong>Activitats</strong><span>{visibleItems.length}</span>{onAddActivity && onLoadActivities && !blockingEvent && getAgendaSessionItemRemovalState(bundle, { id: 'new-activity' }).canRemove && <button className="secondary-action compact" disabled={busy} onClick={openActivityPicker} type="button">{loadingActivities ? <Loader2 className="spin" size={14} /> : <Plus size={14} />}Afegir activitat</button>}</div>
        {moveError && <p role="alert">{moveError}</p>}
        {moving && <p role="status"><Loader2 className="spin" size={14} /> Desant l’ordre…</p>}
        {activityError && <p role="alert">{activityError}</p>}
        {activityChoices && <AgendaSessionActivityPicker choices={activityChoices} freeMinutes={freeMinutes} busy={busy} onAdd={addActivity} onClose={() => setActivityChoices(null)} />}
        {visibleItems.length === 0 ? <p className="agenda-session-muted">Aquesta sessió encara no té cap activitat.</p> : <ol>{visibleItems.map((item, itemIndex) => {
          const description = item.sourceActivity?.description?.trim()
          const removalState = getAgendaSessionItemRemovalState(bundle, item)
          const confirmingRemoval = removalItemId === item.id
          const canMove = onMoveItem && canReorderAgendaSession(bundle, calendarEvents) && removalState.canRemove && !isBabeliumItem(item)
          const canMoveUp = canMove && itemIndex > 0 && !isBabeliumItem(visibleItems[itemIndex - 1])
          const canMoveDown = canMove && itemIndex < visibleItems.length - 1
          return <li className={onRemoveItem || onSaveItem || onMoveItem ? 'agenda-session-item-removable' : undefined} key={item.id}>
            <span />
            <div><strong>{item.title}</strong><small>{item.plannedMinutes ? `${item.plannedMinutes} min` : 'Sense temps'}{item.segmentCount > 1 ? ` · part ${item.segmentIndex}/${item.segmentCount}` : ''}</small>{description && <details className="agenda-activity-description"><summary><ChevronDown size={13} />Descripció</summary><FormattedText as="p" text={description} /></details>}
              {editItemId === item.id && <form className="agenda-session-item-editor" onSubmit={(event) => saveItem(event, item)}>
                <label>Títol de l’activitat<input disabled={busy} required value={editTitle} onChange={(event) => setEditTitle(event.target.value)} /></label>
                <label>Minuts previstos<input autoFocus disabled={busy} min="1" required type="number" value={editMinutes} onChange={(event) => setEditMinutes(event.target.value)} /></label>
                <p>Les activitats següents es desplaçaran o s’avançaran per encaixar el nou temps. La programació original es conservarà.</p>
                <div><button className="primary-action compact" disabled={busy || !editTitle.trim() || !Number.isFinite(Number(editMinutes)) || Number(editMinutes) <= 0} type="submit">{saving && <Loader2 className="spin" size={15} />}Desar i reajustar</button><button className="secondary-action compact" disabled={busy} onClick={() => { setEditItemId(''); setEditError('') }} type="button">Cancel·lar</button></div>
                {editError && <p role="alert">{editError}</p>}
              </form>}
              {confirmingRemoval && <div className="agenda-session-item-confirmation">
                <p>{isBabeliumItem(item) ? 'Treure Babèlium només d’aquesta sessió? S’alliberaran els 30 minuts. Les altres sessions de l’horari es conservaran.' : 'Treure aquesta activitat de la calendarització d’aquesta sessió? Es conservarà a la programació i els minuts retirats quedaran disponibles a «Afegir activitat». Les altres sessions es conservaran.'}</p>
                <div><button className="secondary-action compact agenda-session-item-delete" disabled={busy} onClick={() => removeItem(item)} type="button">{removing ? <Loader2 className="spin" size={15} /> : <Trash2 size={15} />}{isBabeliumItem(item) ? 'Treure Babèlium' : 'Treure i conservar'}</button><button className="secondary-action compact" disabled={busy} onClick={() => { setRemovalItemId(''); setRemovalError('') }} type="button">Cancel·lar</button></div>
                {removalError && <p role="alert">{removalError}</p>}
              </div>}
            </div>
            {(onRemoveItem || onSaveItem || onMoveItem) && <div className="agenda-session-item-tools">
              {onSaveItem && item.type === 'activity' && !item.sourceActivityId && !isBabeliumItem(item) && <button className="agenda-session-item-edit" aria-label={`${item.fixedToSession === false ? 'Fixar' : 'Desfixar'} activitat: ${item.title}`} aria-pressed={item.fixedToSession !== false} disabled={busy || !removalState.canRemove} onClick={() => toggleFixed(item)} title={item.fixedToSession === false ? 'Fixar a aquest dia i hora' : 'Desfixar: permetre redistribuir l’activitat'} type="button">{item.fixedToSession === false ? <Pin size={17} /> : <PinOff size={17} />}</button>}
              {canMoveUp && <button aria-label={`Moure amunt: ${item.title}`} title="Moure amunt" className="agenda-session-item-edit" disabled={busy} onClick={() => moveItem(item, 'up')} type="button"><ArrowUp size={17} /></button>}
              {canMoveDown && <button aria-label={`Moure avall: ${item.title}`} title="Moure avall" className="agenda-session-item-edit" disabled={busy} onClick={() => moveItem(item, 'down')} type="button"><ArrowDown size={17} /></button>}
              {onSaveItem && <button aria-label={`Editar activitat: ${item.title}${item.segmentCount > 1 ? ` · part ${item.segmentIndex}/${item.segmentCount}` : ''}`} className="agenda-session-item-edit" disabled={busy || !removalState.canRemove || (item.combinedItems || [item]).some((part) => !part.sourceActivityId)} onClick={() => { setEditItemId(item.id); setEditTitle(item.title); setEditMinutes(item.plannedMinutes || ''); setEditError(''); setEditNotice(''); setRemovalItemId('') }} title={removalState.canRemove && item.sourceActivityId ? 'Editar títol i minuts' : removalState.reason || 'Aquesta activitat es conserva a l’historial.'} type="button"><Edit3 size={17} /></button>}
              {onRemoveItem && <button aria-label={`Treure de la sessió: ${item.title}${item.segmentCount > 1 ? ` · part ${item.segmentIndex}/${item.segmentCount}` : ''}`} className="agenda-session-item-trash" disabled={busy || !removalState.canRemove} onClick={() => { setRemovalItemId(item.id); setRemovalError(''); setEditItemId(''); setEditNotice('') }} title={removalState.canRemove ? (isBabeliumItem(item) ? 'Treure Babèlium només d’aquesta sessió' : 'Treure de la calendarització i conservar') : removalState.reason || 'Aquesta sessió té dades de classe i es conserva a l’historial.'} type="button"><Trash2 size={17} /></button>}
            </div>}
          </li>
        })}</ol>}
      </div>
      <div className="agenda-session-materials">
        <div className="agenda-session-subheading"><ExternalLink size={16} /><strong>Materials</strong><span>{materials.length}</span></div>
        {materials.length === 0 ? <p className="agenda-session-muted">No hi ha cap material enllaçat.</p> : <div>{materials.map((material) => <a className={material.audience === 'teacher' ? 'teacher' : 'students'} href={material.url} key={material.url} rel="noreferrer" target="_blank"><ExternalLink size={13} /><span>{material.label || material.url}</span><em>{material.audience === 'teacher' ? 'Docent' : 'Alumnat'}</em></a>)}</div>}
      </div>
      <div className="agenda-session-actions">
        {onOpenClassroom && !blockingEvent && !['cancelled', 'notHeld'].includes(bundle.session.status) && <button className="primary-action compact" disabled={busy} onClick={() => onOpenClassroom(bundle)} type="button"><Clock3 size={15} />{bundle.session.classroomOpenedAt ? 'Reobrir Mode aula' : 'Obrir Mode aula'}</button>}
        <button className="secondary-action compact agenda-adjust-session" disabled={busy} onClick={() => onAdjust(bundle)} type="button"><Edit3 size={15} />Reajustar la sessió</button>
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
  selectedClassId,
  slots,
  timetable,
  today,
}) {
  const [now, setNow] = useState(() => new Date())
  const classBundles = filterAgendaItemsForClass(bundles, selectedClassId)
  const classSlots = filterAgendaItemsForClass(slots, selectedClassId)
  const todayBundles = classBundles.filter((bundle) => sessionDate(bundle) === today)
  const nowTime = now.toTimeString().slice(0, 5)
  const nowMinutes = Number(nowTime.slice(0, 2)) * 60 + Number(nowTime.slice(3, 5))
  const currentBundle = todayBundles.find((bundle) => {
    if (bundle.session.status !== 'planned') return false
    const startsAtMinutes = Number(sessionTime(bundle).slice(0, 2)) * 60 + Number(sessionTime(bundle).slice(3, 5))
    return startsAtMinutes <= nowMinutes && startsAtMinutes + Number(bundle.session.durationMinutes || 0) > nowMinutes
  })
  const automaticBundle = currentBundle || classBundles.find((bundle) =>
    bundle.session.status === 'planned' && bundle.session.startsAt >= `${today}T${nowTime}`) || null
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const selectedBundle = classBundles.find((bundle) => bundle.session.id === selectedSessionId) || automaticBundle
  const nextTimetableOccurrence = findNextTimetableOccurrence(classSlots, today, nowTime, calendarEvents)
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
        {classroomPrompt && <div className={`agenda-classroom-prompt ${classroomPrompt.kind}`}><Clock3 size={20} /><div><strong>{classroomPrompt.kind === 'upcoming' ? `${classNameFor(classes, automaticBundle.session.classId)} comença d’aquí ${classroomPrompt.minutesUntil} min` : `${classNameFor(classes, automaticBundle.session.classId)} està en curs`}</strong><span>{combineAgendaSessionItems(automaticBundle.items, automaticBundle.planningUnit.id).length} activitats · {sessionMaterials(automaticBundle).length} materials preparats</span></div><button className="primary-action compact" onClick={() => onOpenClassroom(automaticBundle)} type="button">Obrir Mode aula</button></div>}
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
          {todayBundles.length === 0 ? <p>Cap classe planificada per avui.</p> : <div className="agenda-today-session-list">{todayBundles.map((bundle) => <button className={bundle.session.id === selectedBundle?.session.id ? 'active' : ''} key={bundle.session.id} onClick={() => setSelectedSessionId(bundle.session.id)} type="button"><span>{sessionTime(bundle)}</span><div><strong>{classNameFor(classes, bundle.session.classId)}</strong><small>{bundle.planningUnit.code} · {combineAgendaSessionItems(bundle.items, bundle.planningUnit.id).length} activitats</small></div></button>)}</div>}
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
      .filter((bundle) => !getNoClassCalendarEvent(calendarEvents, sessionDate(bundle), bundle.session.classId, { sessionId: bundle.session.id, timetableSlotId: bundle.session.timetableSlotId }))
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
                  : `${combineAgendaSessionItems(item.bundle.items, item.bundle.planningUnit.id).length} activitats`
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
                slot.babeliumEnabled ? 'Babèlium · primers 30 min' : '',
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

function TimelineRows({ calendarEvents, groups, onOpenSession, onOpenNotes, notesLoadingId, onOpenTimetableClassroom, slots = [], classes = [] }) {
  return <div className="agenda-timeline-list">{groups.flatMap((group) => group.bundles.map((bundle) => {
    const notesButton = onOpenNotes && <button aria-label={`Notes de la sessió del ${formatDate(sessionDate(bundle))} a les ${sessionTime(bundle)}`} className={`agenda-timeline-notes ${bundle.privateNotes?.some((note) => String(note.text || '').trim()) ? 'has-note' : ''}`} disabled={Boolean(notesLoadingId)} onClick={() => onOpenNotes(bundle)} title="Notes" type="button">{notesLoadingId === bundle.session.id ? <Loader2 className="spin" size={15} /> : <StickyNote size={15} />}</button>
    if (bundle.timetableOccurrence) {
      const occurrence = bundle.timetableOccurrence
      const blockingEvent = bundle.session.blockingEvent
      if (blockingEvent) return <div className="agenda-timeline-row" key={bundle.session.id}><div className="agenda-timeline-session calendar-blocked"><span className="agenda-timeline-index">{group.sequence}</span><span className="agenda-timeline-dot"><Moon size={9} /></span><div className="agenda-timeline-date"><strong>{formatDate(occurrence.date, { weekday: true })}</strong><small>{occurrence.slot.startsAt} · {occurrence.slot.durationMinutes} min</small></div><div className="agenda-timeline-content"><span>{occurrence.slot.subject}</span><div className="agenda-timeline-activity"><strong>{blockingEvent.title}</strong><small>Aquesta sessió no es fa</small></div></div><span className="agenda-session-status notHeld">No es fa</span><CalendarRange size={15} /></div>{notesButton}</div>
      return <div className={`agenda-timeline-row ${group.isParallel ? 'parallel-session' : ''}`} key={bundle.session.id}><button className="agenda-timeline-session" onClick={() => onOpenTimetableClassroom?.(occurrence)} type="button"><span className="agenda-timeline-index">{group.sequence}</span><span className="agenda-timeline-dot" /><div className="agenda-timeline-date"><strong>{formatDate(occurrence.date, { weekday: true })}</strong><small>{occurrence.slot.startsAt} · {occurrence.slot.durationMinutes} min</small></div><div className="agenda-timeline-content"><span>{occurrence.slot.subject}</span><div className="agenda-timeline-activity"><strong>{occurrence.slot.subject}</strong><small>Sense activitats calendaritzades</small></div></div><CalendarRange size={15} /></button>{notesButton}</div>
    }
    const blockingEvent = getNoClassCalendarEvent(calendarEvents, sessionDate(bundle), bundle.session.classId, { sessionId: bundle.session.id, timetableSlotId: bundle.session.timetableSlotId })
    const load = bundle.detailsLoaded === false ? null : getSessionLoad(bundle.items, bundle.session.durationMinutes)
    const freeMinutes = load && bundle.session.status === 'planned'
      ? Math.max(0, load.programmableMinutes - load.plannedMinutes)
      : 0
    const activities = bundle.detailsLoaded === false
      ? [{ id: 'loading', title: 'Obre per veure les activitats', showTiming: false }]
      : bundle.items.length > 0
        ? combineAgendaSessionItems(bundle.items, bundle.planningUnit.id)
        : [{ id: 'empty', title: 'Sessió sense activitats', showTiming: false }]
    const subject = resolvePlanningSubject({ application: bundle.application, planningUnit: bundle.planningUnit,
      classItem: classes.find((item) => item.id === bundle.session.classId),
      subjects: getClassPlanningSubjects(slots, bundle.session.classId),
    })
    const actualSubject = slots.find((slot) => slot.id === bundle.session.timetableSlotId)?.subject
    const mismatch = !sessionMatchesPlanningSubject({ ...bundle, timetableSubject: actualSubject }, subject)
    return <div className={`agenda-timeline-row ${group.isParallel ? 'parallel-session' : ''}`} key={bundle.session.id}><button className={`agenda-timeline-session ${blockingEvent ? 'calendar-blocked' : ''} ${group.isParallel ? 'parallel-session' : ''} ${freeMinutes > 0 ? 'underfilled' : ''}`} onClick={() => onOpenSession(bundle)} type="button"><span className="agenda-timeline-index">{group.sequence}</span><span className="agenda-timeline-dot">{blockingEvent && <Moon size={9} />}</span><div className="agenda-timeline-date"><strong>{formatDate(sessionDate(bundle), { weekday: true })}</strong><small>{sessionTime(bundle)} · {bundle.session.durationMinutes} min{bundle.session.subgroupId ? ` · ${bundle.session.subgroupId}` : ''}</small></div><div className="agenda-timeline-content">{subject && <span>{subject}</span>}{mismatch && <small className="agenda-inline-error">Aquesta franja és de {actualSubject}. Revisa la proposta intel·ligent per corregir la calendarització.</small>}{group.isParallel && <span>Mateixa sessió de mig grup</span>}{blockingEvent ? <div className="agenda-timeline-activity"><strong>{blockingEvent.title}</strong><small>Aquesta sessió no es fa</small></div> : activities.map((item) => <div className="agenda-timeline-activity" key={item.id}><strong>{item.title}</strong>{item.showTiming !== false && <small>{item.plannedMinutes ? `${item.plannedMinutes} min${item.segmentCount > 1 ? ` · part ${item.segmentIndex}/${item.segmentCount}` : ''}` : 'Sense temps assignat'}</small>}</div>)}</div><span className={`agenda-session-status ${blockingEvent ? 'notHeld' : freeMinutes > 0 ? 'underfilled' : bundle.session.status}`}>{blockingEvent ? 'No es fa' : freeMinutes > 0 ? `${freeMinutes} min lliures` : STATUS_LABELS[bundle.session.status]}</span><MapPin size={15} /></button>{notesButton}</div>
  }))}</div>
}

function TimelineUnscheduledActivities({ activities = [], hasApplications = false, loading = false }) {
  if (!hasApplications && !loading) return null
  const pendingMinutes = activities.reduce((total, activity) => {
    const minutes = Number(activity.remainingMinutes)
    return total + (Number.isFinite(minutes) && minutes > 0 ? minutes : 0)
  }, 0)
  const groups = Array.from(activities.reduce((byUnit, activity) => {
    const key = activity.planningUnitId
    if (!byUnit.has(key)) byUnit.set(key, {
      activities: [],
      code: activity.planningUnitCode,
      id: key,
      title: activity.planningUnitTitle,
    })
    byUnit.get(key).activities.push(activity)
    return byUnit
  }, new Map()).values())
  return (
    <section className="agenda-timeline-unscheduled">
      <header>
        <span><AlertTriangle size={18} /></span>
        <div><strong>Activitats fora de la calendarització</strong><small>Continuen visibles a Programació, però no tenen cap data assignada.</small></div>
        {!loading && <em>{activities.length} {activities.length === 1 ? 'activitat' : 'activitats'} · {pendingMinutes} min pendents</em>}
      </header>
      {loading ? <div className="agenda-timeline-unscheduled-loading"><Loader2 className="spin" size={16} />Comprovant les activitats pendents…</div> : activities.length === 0 ? <p className="agenda-timeline-unscheduled-complete"><ListChecks size={16} />Totes les activitats pendents d’aquesta UT tenen data.</p> : <div className="agenda-timeline-unscheduled-groups">{groups.map((group) => (
        <article key={group.id}>
          <h3><span>{group.code}</span>{group.title}</h3>
          <ol>{group.activities.map((activity) => {
            const remainingMinutes = Number(activity.remainingMinutes)
            const plannedMinutes = Number(activity.plannedMinutes)
            const isPartial = Number.isFinite(remainingMinutes) && Number.isFinite(plannedMinutes) && remainingMinutes < plannedMinutes
            const timing = Number.isFinite(remainingMinutes) && remainingMinutes > 0
              ? `${remainingMinutes} min${isPartial ? ` pendents de ${plannedMinutes}` : ''}`
              : 'Sense temps assignat'
            return <li key={activity.id}><span /><div><strong>{activity.title}</strong><small>{timing}</small></div>{isPartial && <em>Parcialment calendaritzada</em>}</li>
          })}</ol>
        </article>
      ))}</div>}
    </section>
  )
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
  onOpenNotes,
  notesLoadingId,
  onLoadNotes,
  sessionPrivateNotes = {},
  onOpenTimetableClassroom,
  onSchedule,
  selectedClassId,
  slots = [],
  timetable,
  range,
  temporalUnitProgress,
  today = new Date().toISOString().slice(0, 10),
  unscheduledActivities = [],
  unscheduledHasApplications = false,
  unscheduledLoading = false,
}) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = globalThis.setInterval(() => setNow(Date.now()), 60_000)
    return () => globalThis.clearInterval(timer)
  }, [])
  const [subjectFilter, setSubjectFilter] = useState({ classId: '', subject: '' })
  const activeSubject = subjectFilter.classId === selectedClassId ? subjectFilter.subject : ''
  const groupBundles = bundles.filter((bundle) => bundle.session.classId === selectedClassId)
  const timetableSubjects = getClassPlanningSubjects(slots, selectedClassId)
  const subjectForBundle = (bundle) => resolvePlanningSubject({ application: bundle.application,
    planningUnit: bundle.planningUnit, classItem: classes.find((item) => item.id === selectedClassId), subjects: timetableSubjects })
  const subjects = [...new Set([...timetableSubjects, ...groupBundles.map(subjectForBundle)].filter(Boolean))]
  const selectedClassSubject = classes.find((item) => item.id === selectedClassId)?.subject
  const timetableAvailability = buildTimetableSessionCandidates({ calendarEvents, classId: selectedClassId,
    subject: activeSubject, from: range?.from || today, to: range?.to || addDays(today, 56),
    timetables: timetable ? [timetable] : [], slotsByTimetableId: timetable ? { [timetable.id]: slots } : {},
  })
  const timetableCandidates = [...timetableAvailability.candidates, ...timetableAvailability.blockedCandidates]
    .filter((candidate) => candidate.timetableSlotId
    && (candidate.blockingEvent || candidate.date >= today)
    && (candidate.blockingEvent || activeSubject || !planningSubjectsMatch(candidate.subject, selectedClassSubject))
    && !groupBundles.some((bundle) => bundle.session.startsAt === candidate.startsAt
      && planningSubjectsMatch(subjectForBundle(bundle), candidate.subject)))
  const timetableBundles = timetableCandidates.map((candidate) => ({
    application: { subject: candidate.subject },
    session: { ...candidate, id: `timetable_${candidate.date}_${candidate.timetableSlotId}`, classId: selectedClassId, status: candidate.blockingEvent ? 'notHeld' : 'planned' },
    items: [], results: [],
    timetableOccurrence: { ...candidate, id: `timetable_${candidate.date}_${candidate.timetableSlotId}`, slot: slots.find((slot) => slot.id === candidate.timetableSlotId) },
  }))
  const noteSessionIdsKey = [...new Set([...groupBundles, ...timetableBundles].flatMap((bundle) =>
    [bundle.session.id, getTimetableSessionNoteId(bundle.session)].filter(Boolean)))].sort().join('|')
  useEffect(() => {
    if (noteSessionIdsKey && onLoadNotes) onLoadNotes(noteSessionIdsKey.split('|'))
  }, [noteSessionIdsKey, onLoadNotes])
  const classBundles = [...groupBundles, ...timetableBundles].map((bundle) => ({ ...bundle,
    privateNotes: [bundle.session.id, getTimetableSessionNoteId(bundle.session)]
      .flatMap((id) => sessionPrivateNotes[id] || [])
      .concat(bundle.privateNotes || []),
  })).filter((bundle) => !activeSubject || planningSubjectsMatch(subjectForBundle(bundle), activeSubject))
    .sort((left, right) => left.session.startsAt.localeCompare(right.session.startsAt))
  const visibleUnscheduledActivities = unscheduledActivities.filter((activity) => !activeSubject || planningSubjectsMatch(activity.subject, activeSubject))
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
        <div className="agenda-timeline-toolbar-actions">{!activeSubject && <TemporalUnitCountdown progress={temporalUnitProgress} temporalUnit={activeTemporalUnit} type="sessions" />}{onSchedule && <button className="primary-action compact" onClick={() => onSchedule(activeSubject)} type="button"><Plus size={16} />{visibleUnscheduledActivities.length > 0 ? `Calendaritzar ${visibleUnscheduledActivities.length} activitats pendents` : 'Calendaritzar UP'}</button>}</div>
      </header>
      {selectedClassId && subjects.length > 0 && <label className="agenda-timeline-subject">Calendarització<select value={activeSubject} onChange={(event) => setSubjectFilter({ classId: selectedClassId, subject: event.target.value })}><option value="">Totes les matèries</option>{subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select></label>}
      {!selectedClassId ? <div className="agenda-timeline-empty"><Layers3 size={28} /><strong>Selecciona un grup a la barra superior</strong><p>La cronologia seguirà automàticament la classe activa.</p></div> : <div className="agenda-timeline-sections">
        {classBundles.length === 0 ? <div className="agenda-timeline-empty"><CalendarDays size={28} /><strong>No hi ha sessions en aquest tram</strong><p>Pots ampliar la cronologia o calendaritzar una UP nova.</p><div className="agenda-timeline-empty-actions">{hasEarlier && <button disabled={loading} onClick={onLoadEarlier} type="button"><ArrowLeft size={14} />8 setmanes anteriors</button>}{hasLater && <button disabled={loading} onClick={onLoadLater} type="button">8 setmanes següents<ArrowRight size={14} /></button>}</div></div> : <>
          {upcomingGroups.length > 0 ? <TimelineRows onOpenNotes={onOpenNotes} notesLoadingId={notesLoadingId} onOpenTimetableClassroom={onOpenTimetableClassroom} classes={classes} slots={slots} calendarEvents={calendarEvents} groups={upcomingGroups} onOpenSession={onOpenSession} /> : <div className="agenda-timeline-empty compact"><CalendarDays size={24} /><strong>No queden sessions programades</strong><p>Pots consultar les sessions anteriors a l’històric.</p></div>}
          {hasLater && <div className="agenda-timeline-pager future"><button disabled={loading} onClick={onLoadLater} type="button">Veure 8 setmanes següents<ArrowRight size={14} /></button></div>}
          {archivedGroups.length > 0 && <details className="agenda-timeline-archive"><summary><span><History size={16} />Sessions anteriors</span><small>{archivedGroups.length} {archivedGroups.length === 1 ? 'sessió arxivada' : 'sessions arxivades'}</small><ChevronDown size={16} /></summary><TimelineRows onOpenNotes={onOpenNotes} notesLoadingId={notesLoadingId} onOpenTimetableClassroom={onOpenTimetableClassroom} classes={classes} slots={slots} calendarEvents={calendarEvents} groups={archivedGroups} onOpenSession={onOpenSession} /></details>}
          {hasEarlier && <div className="agenda-timeline-pager past"><button disabled={loading} onClick={onLoadEarlier} type="button"><ArrowLeft size={14} />Veure 8 setmanes anteriors</button></div>}
        </>}
        <TimelineUnscheduledActivities activities={visibleUnscheduledActivities} hasApplications={unscheduledHasApplications} loading={unscheduledLoading} />
      </div>}
    </section>
  )
}

export function AgendaSessionDetail({ bundle, calendarEvents, classes, onAdjust, onOpenClassroom, onRemoveItem, onSaveItem, onMoveItem, onResolveGap, onLoadActivities, onAddActivity }) {
  return <SessionDetail bundle={bundle} calendarEvents={calendarEvents} classes={classes} onAdjust={onAdjust} onOpenClassroom={onOpenClassroom} onRemoveItem={onRemoveItem} onSaveItem={onSaveItem} onMoveItem={onMoveItem} onResolveGap={onResolveGap} onLoadActivities={onLoadActivities} onAddActivity={onAddActivity} />
}
