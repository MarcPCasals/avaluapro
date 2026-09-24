import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays, CalendarPlus, Check, Clock3, Cloud, CloudOff,
  Copy, LayoutGrid, ListChecks, Loader2, Menu, Pencil, Plus, RotateCcw,
  Palette, Trash2,
} from 'lucide-react'
import {
  getClassroomStudents,
  getClassroomTrackingUtId,
  getNextTimetableDuration,
  isClassroomEvidenceDue,
} from '../../domain/planning'
import { CLASS_COLORS } from '../../data/classColors'
import { findAbsenceForSession } from '../../lib/attendance'
import { getAgendaDefaultWeekStart } from '../../lib/agendaCalendar'
import { buildReminderSessionOptions, buildTimetableClassroomBundle, findNextTimetableOccurrence, mergeAgendaClassCatalog } from '../../lib/agendaToday'
import { splitTimetableSlots, timetableTimeToMinutes } from '../../lib/agendaTimetable'
import { getPendingReminderSummary, getPersonalCalendarReminders } from '../../lib/reminders'
import { getTutoringCalendarReminders } from '../../lib/tutoringCoordination'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'
import { ClassroomMode } from '../classroom/ClassroomMode'
import { RemindersModal } from '../data/RemindersModal'
import { AcademicYearDialog } from '../planning/PlanningDialogs'
import {
  CalendarEventDialog,
  TimetableDialog,
  TimetableSlotDialog,
} from './AgendaDialogs'
import { useAgendaWorkspace } from './useAgendaWorkspace'
import { AgendaSchedulingDialog } from './AgendaSchedulingDialog'
import {
  AgendaMonthView,
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

function consumeAgendaSchedulingRequest() {
  const planningUnitId = globalThis.sessionStorage?.getItem('avaluapro:open-agenda-scheduling') || ''
  if (planningUnitId) globalThis.sessionStorage?.removeItem('avaluapro:open-agenda-scheduling')
  return planningUnitId
}
const GRID_START = 7 * 60 + 30
const GRID_END = 17 * 60
const GRID_STEP = 15
const GRID_ROWS = Array.from({ length: (GRID_END - GRID_START) / GRID_STEP }, (_, index) => GRID_START + index * GRID_STEP)

function minutesToTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function compactDurationLabel(durationMinutes) {
  if (Number(durationMinutes) === 90) return '1:30 h'
  if (Number(durationMinutes) === 120) return '2 h'
  return '1 h'
}

function formatDate(dateKey) {
  if (!dateKey) return '—'
  return new Intl.DateTimeFormat('ca-AD', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(`${dateKey}T12:00:00`))
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

function firstDayOfMonth(dateKey) {
  return `${String(dateKey).slice(0, 7)}-01`
}

function moveMonthKey(dateKey, amount) {
  const date = new Date(`${firstDayOfMonth(dateKey)}T12:00:00Z`)
  date.setUTCMonth(date.getUTCMonth() + amount)
  return date.toISOString().slice(0, 10)
}

function monthSessionRange(monthKey) {
  const nextMonth = moveMonthKey(monthKey, 1)
  const lastDay = addDateDays(nextMonth, -1)
  return {
    from: startOfWeek(monthKey),
    to: addDateDays(startOfWeek(lastDay), 6),
  }
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

function TimetableClassRow({ classItem, onError, onSelect, onUpdate, selected }) {
  const [saving, setSaving] = useState(false)

  const savePatch = async (patch) => {
    setSaving(true)
    try {
      await onUpdate(classItem.id, patch)
    } catch (error) {
      onError(error)
    } finally {
      setSaving(false)
    }
  }
  const commitName = (event) => {
    const nextName = event.currentTarget.value.trim()
    if (!nextName) {
      event.currentTarget.value = classItem.name
      return
    }
    if (nextName !== classItem.name) savePatch({ name: nextName })
  }

  return (
    <div className={`agenda-timetable-class-row ${selected ? 'selected' : ''}`}>
      <button
        aria-label={`Seleccionar ${classItem.name} per col·locar-la a l’horari`}
        aria-pressed={selected}
        className={`agenda-timetable-class-select ${classItem.color || 'blue'}`}
        onClick={() => onSelect(classItem.id)}
        title="Selecciona aquesta classe i després clica una hora de l’horari"
        type="button"
      >{selected ? <Check size={16} /> : <Palette size={15} />}</button>
      <input
        aria-label={`Nom de la classe ${classItem.name}`}
        className={classItem.color || 'blue'}
        defaultValue={classItem.name}
        disabled={saving}
        onBlur={commitName}
        onFocus={() => onSelect(classItem.id)}
        onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }}
      />
      <select
        aria-label={`Color de la classe ${classItem.name}`}
        disabled={saving}
        onChange={(event) => { onSelect(classItem.id); savePatch({ color: event.target.value }) }}
        value={classItem.color || 'blue'}
      >{CLASS_COLORS.map((color) => <option key={color.id} value={color.id}>{color.label}</option>)}</select>
      {saving && <Loader2 className="spin" size={15} />}
    </div>
  )
}

function TimetableClassPalette({ classes, onAddClass, onError, onSelectClass, onUpdateClass, selectedClassId }) {
  const [newClass, setNewClass] = useState({ color: CLASS_COLORS[classes.length % CLASS_COLORS.length]?.id || 'blue', name: '' })
  const [saving, setSaving] = useState(false)
  const add = async (event) => {
    event.preventDefault()
    const name = newClass.name.trim()
    if (!name) return
    setSaving(true)
    try {
      await onAddClass({ color: newClass.color, name, subject: name })
      setNewClass((current) => ({ ...current, color: CLASS_COLORS[(classes.length + 1) % CLASS_COLORS.length]?.id || 'blue', name: '' }))
    } catch (error) {
      onError(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="agenda-timetable-classes">
      <header><div><span>Classes de l’horari</span><strong>Tria una classe i clica l’hora on la vols posar</strong></div><small>El nom i el color són els mateixos a tot AvaluaPro.</small></header>
      <div className="agenda-timetable-class-list">{classes.map((classItem) => <TimetableClassRow classItem={classItem} key={classItem.id} onError={onError} onSelect={onSelectClass} onUpdate={onUpdateClass} selected={classItem.id === selectedClassId} />)}</div>
      <form className="agenda-timetable-class-add" onSubmit={add}>
        <input aria-label="Nom de la nova classe" onChange={(event) => setNewClass({ ...newClass, name: event.target.value })} placeholder="Nom de la nova classe" value={newClass.name} />
        <select aria-label="Color de la nova classe" onChange={(event) => setNewClass({ ...newClass, color: event.target.value })} value={newClass.color}>{CLASS_COLORS.map((color) => <option key={color.id} value={color.id}>{color.label}</option>)}</select>
        <button className="primary-action compact" disabled={saving || !newClass.name.trim()} type="submit">{saving ? <Loader2 className="spin" size={15} /> : <Plus size={15} />}Afegir</button>
      </form>
    </section>
  )
}

function TimetableGrid({ classes, onDelete, onEdit, onError, onMove, onQuickAdd, onResize, selectedClassId, slots }) {
  const [dragId, setDragId] = useState('')
  const [busyKey, setBusyKey] = useState('')
  const classById = useMemo(() => new Map(classes.map((item) => [item.id, item])), [classes])
  const visibleSlots = useMemo(() => splitTimetableSlots(slots), [slots])
  const selectedClass = classById.get(selectedClassId) || null
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
  const quickAdd = async (weekday, startsAt) => {
    if (!selectedClass) return onError(new Error('Selecciona primer una classe de la llista.'))
    const key = `${weekday}-${startsAt}`
    setBusyKey(key)
    try {
      await onQuickAdd({
        classId: selectedClass.id,
        durationMinutes: 60,
        space: '',
        startsAt,
        subject: selectedClass.subject || selectedClass.name,
        subgroupId: '',
        weekday,
      })
    } catch (error) {
      onError(error)
    } finally {
      setBusyKey('')
    }
  }
  const resize = async (slot) => {
    setBusyKey(`duration-${slot.id}`)
    try {
      await onResize(slot, getNextTimetableDuration(slot.durationMinutes))
    } catch (error) {
      onError(error)
    } finally {
      setBusyKey('')
    }
  }
  const slotCard = (slot, late = false) => {
    const classItem = classById.get(slot.classId)
    return (
      <article
        className={`${late ? 'agenda-late-slot-card' : 'agenda-slot-card'} ${classItem?.color || 'purple'} ${dragId === slot.id ? 'dragging' : ''}`}
        key={slot.id}
        {...(!late ? {
          style: {
            gridColumn: slot.weekday + 1,
            gridRow: `${Math.max(0, Math.round((timetableTimeToMinutes(slot.startsAt) - GRID_START) / GRID_STEP)) + 2} / span ${Math.max(1, Math.min(
              Math.ceil(Number(slot.durationMinutes) / GRID_STEP),
              Math.ceil((GRID_END - timetableTimeToMinutes(slot.startsAt)) / GRID_STEP),
            ))}`,
          },
        } : {})}
      >
        {!late && <button
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
        ><Menu size={16} /></button>}
        <button className="agenda-slot-content" onClick={() => onEdit(slot)} title="Obrir els detalls de la franja" type="button">
          {late && <small>{WEEKDAYS.find(([weekday]) => weekday === Number(slot.weekday))?.[1]} · {slot.startsAt}</small>}
          <strong>{classItem?.name || 'Grup'}</strong>
          <span>{slot.subject}</span>
          {!late && <small>{slot.startsAt}{slot.subgroupId ? ` · ${slot.subgroupId}` : ''}{slot.space ? ` · ${slot.space}` : ''}</small>}
          {late && (slot.subgroupId || slot.space) && <small>{[slot.subgroupId, slot.space].filter(Boolean).join(' · ')}</small>}
        </button>
        <button aria-label={`Canviar la durada de ${classItem?.name || slot.subject}`} className="agenda-slot-duration" disabled={busyKey === `duration-${slot.id}`} onClick={() => resize(slot)} title="Clica per canviar entre 1 h, 1:30 h i 2 h" type="button">{busyKey === `duration-${slot.id}` ? <Loader2 className="spin" size={13} /> : compactDurationLabel(slot.durationMinutes)}</button>
        <button aria-label={`Eliminar ${classItem?.name || slot.subject}`} className="agenda-slot-delete" onClick={() => onDelete(slot)} type="button"><Trash2 size={14} /></button>
      </article>
    )
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
            className={`agenda-grid-cell ${minutes % 60 === 0 ? 'hour' : ''} ${selectedClass ? 'ready' : ''} ${busyKey === `${weekday}-${minutesToTime(minutes)}` ? 'saving' : ''}`}
            data-grid-time={minutesToTime(minutes)}
            data-grid-weekday={weekday}
            key={`${weekday}-${minutes}`}
            onClick={() => quickAdd(weekday, minutesToTime(minutes))}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); drop(weekday, minutesToTime(minutes)) }}
            style={{ gridColumn: weekday + 1, gridRow: rowIndex + 2 }}
            title={selectedClass ? `Afegir ${selectedClass.name} a les ${minutesToTime(minutes)}` : 'Selecciona primer una classe'}
          />
        )))}
        {visibleSlots.daytime.map((slot) => slotCard(slot))}
      </div>
      {visibleSlots.late.length > 0 && <section className="agenda-late-slots">
        <header><Clock3 size={17} /><div><strong>Després de les 17 h</strong><span>Aquestes franges no allarguen la graella.</span></div></header>
        <div>{visibleSlots.late.map((slot) => slotCard(slot, true))}</div>
      </section>}
    </div>
  )
}

function TimetableView({ classes, onAdd, onAddClass, onCreateVersion, onDelete, onEdit, onEditVersion, onError, onMove, onQuickAdd, onResize, onSelectVersion, onUpdateClass, slots, timetable, timetables, today }) {
  const [requestedClassId, setRequestedClassId] = useState(() => classes[0]?.id || '')
  const selectedClassId = classes.some((item) => item.id === requestedClassId) ? requestedClassId : classes[0]?.id || ''

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
      <TimetableClassPalette classes={classes} onAddClass={onAddClass} onError={onError} onSelectClass={setRequestedClassId} onUpdateClass={onUpdateClass} selectedClassId={selectedClassId} />
      <div className="agenda-grid-note"><Menu size={15} /><span>Selecciona una classe i clica un espai buit. Arrossega la nansa per moure-la i clica la durada per passar d’1 h a 1:30 h o 2 h.</span></div>
      <TimetableGrid classes={classes} onDelete={onDelete} onEdit={onEdit} onError={onError} onMove={onMove} onQuickAdd={onQuickAdd} onResize={onResize} selectedClassId={selectedClassId} slots={slots} />
    </section>
  )
}

export default function AgendaModule() {
  const [initialSchedulingUnitId] = useState(consumeAgendaSchedulingRequest)
  const user = useAvaluaproStore((state) => state.cloud.user)
  const classes = useAvaluaproStore((state) => state.classes)
  const students = useAvaluaproStore((state) => state.students)
  const semesters = useAvaluaproStore((state) => state.semesters)
  const uts = useAvaluaproStore((state) => state.uts)
  const activeClassId = useAvaluaproStore((state) => state.ui.activeClassId)
  const activeUtId = useAvaluaproStore((state) => state.ui.activeUtId)
  const tasks = useAvaluaproStore((state) => state.tasks)
  const taskRecords = useAvaluaproStore((state) => state.taskRecords)
  const behaviorEvents = useAvaluaproStore((state) => state.behaviorEvents)
  const agendaNotes = useAvaluaproStore((state) => state.agendaNotes)
  const absenceRecords = useAvaluaproStore((state) => state.absenceRecords)
  const tutoringCoordinationItems = useAvaluaproStore((state) => state.cloud.tutoringCoordinationItems || [])
  const sharedTutoringSpaces = useAvaluaproStore((state) => state.cloud.sharedTutoringSpaces || [])
  const toggleStudentAbsence = useAvaluaproStore((state) => state.toggleStudentAbsence)
  const activateClassroomTask = useAvaluaproStore((state) => state.activateClassroomTask)
  const updateTaskRecord = useAvaluaproStore((state) => state.updateTaskRecord)
  const addBehaviorEvent = useAvaluaproStore((state) => state.addBehaviorEvent)
  const saveClassroomRecovery = useAvaluaproStore((state) => state.saveClassroomRecovery)
  const cancelClassroomRecovery = useAvaluaproStore((state) => state.cancelClassroomRecovery)
  const syncPlanningMaterialReminders = useAvaluaproStore((state) => state.syncPlanningMaterialReminders)
  const addClass = useAvaluaproStore((state) => state.addClass)
  const updateClass = useAvaluaproStore((state) => state.updateClass)
  const setActiveClass = useAvaluaproStore((state) => state.setActiveClass)
  const setActiveMode = useAvaluaproStore((state) => state.setActiveMode)
  const setActiveTutoringPanel = useAvaluaproStore((state) => state.setActiveTutoringPanel)
  const markTutoringCoordinationRead = useAvaluaproStore((state) => state.markTutoringCoordinationRead)
  const workspace = useAgendaWorkspace(user, classes)
  const agendaClasses = useMemo(() => mergeAgendaClassCatalog({
    bundles: workspace.sessionBundles,
    classes,
    sharedClasses: workspace.sharedClasses,
  }), [classes, workspace.sessionBundles, workspace.sharedClasses])
  const hasOwnCalendar = Boolean(workspace.activeAcademicYear)
  const hasAgendaWorkspace = hasOwnCalendar || workspace.sharedPlanningUnits.length > 0 || sharedTutoringSpaces.length > 0
  const materialReminderBundles = workspace.sessionBundles
  const setWorkspaceError = workspace.setError
  const loadSessionRange = workspace.loadSessionRange
  const academicYearStartsOn = workspace.activeAcademicYear?.startsOn
  const academicYearEndsOn = workspace.activeAcademicYear?.endsOn
  const agendaToday = workspace.today
  const reminderSummary = useMemo(
    () => getPendingReminderSummary({ agendaNotes, classes, students, taskRecords, tasks }),
    [agendaNotes, classes, students, taskRecords, tasks],
  )
  const tutoringCalendarReminders = useMemo(
    () => getTutoringCalendarReminders(
      tutoringCoordinationItems,
      classes,
      sharedTutoringSpaces,
    ),
    [classes, sharedTutoringSpaces, tutoringCoordinationItems],
  )
  const personalCalendarReminders = useMemo(
    () => getPersonalCalendarReminders(reminderSummary.items),
    [reminderSummary.items],
  )
  const reminderSessionOptions = useMemo(
    () => buildReminderSessionOptions({
      bundles: workspace.sessionBundles,
      calendarEvents: workspace.calendarEvents,
      classes: agendaClasses,
      slots: workspace.slots,
      timetable: workspace.activeTimetable,
      today: workspace.today,
    }),
    [agendaClasses, workspace.activeTimetable, workspace.calendarEvents, workspace.sessionBundles, workspace.slots, workspace.today],
  )
  const upcomingReminders = useMemo(() => {
    const horizon = addDateDays(workspace.today, 3)
    // Els pendents vençuts no desapareixen d'Avui: es mantenen al radar fins
    // que el docent els marca com a fets, juntament amb els pròxims tres dies.
    return [
      ...reminderSummary.items,
      ...tutoringCalendarReminders,
    ]
      .filter((item) => item?.reminder?.date && item.reminder.date <= horizon)
      .sort((left, right) =>
        `${left.reminder?.date || ''}T${left.reminder?.time || '00:00'}`.localeCompare(
          `${right.reminder?.date || ''}T${right.reminder?.time || '00:00'}`,
        ),
      )
  }, [reminderSummary.items, tutoringCalendarReminders, workspace.today])
  const [view, setView] = useState('today')
  const [weekStart, setWeekStart] = useState(() => getAgendaDefaultWeekStart(workspace.today))
  const [calendarMode, setCalendarMode] = useState('week')
  const [monthKey, setMonthKey] = useState(() => firstDayOfMonth(workspace.today))
  const [dialog, setDialog] = useState(() => initialSchedulingUnitId ? 'scheduling' : null)
  const [focusedReminderIds, setFocusedReminderIds] = useState([])
  const [activeBundle, setActiveBundle] = useState(null)
  const [editingTimetable, setEditingTimetable] = useState(null)
  const [editingSlot, setEditingSlot] = useState(null)
  const [slotPosition, setSlotPosition] = useState(null)
  const [editingEvent, setEditingEvent] = useState(null)
  const [eventPreset, setEventPreset] = useState(null)
  const [scheduleNotice, setScheduleNotice] = useState('')
  const [schedulingUnitId, setSchedulingUnitId] = useState(initialSchedulingUnitId)
  const [adjustInitialAction, setAdjustInitialAction] = useState('session')
  const [adjustItemId, setAdjustItemId] = useState('')
  const [classroomRevision, setClassroomRevision] = useState(0)

  useEffect(() => {
    if (!materialReminderBundles.length) return
    syncPlanningMaterialReminders(materialReminderBundles)
      .catch((error) => setWorkspaceError(error.message || 'No s’han pogut preparar els recordatoris de material.'))
  }, [materialReminderBundles, setWorkspaceError, syncPlanningMaterialReminders])

  useEffect(() => {
    if (view !== 'timeline' || !activeClassId) return undefined
    let cancelled = false
    loadSessionRange({
      classId: activeClassId,
      from: academicYearStartsOn || addDateDays(agendaToday, -180),
      to: academicYearEndsOn || addDateDays(agendaToday, 365),
    }).catch((error) => {
      if (!cancelled) setWorkspaceError(error.message || 'No s’ha pogut carregar la cronologia.')
    })
    return () => { cancelled = true }
  }, [activeClassId, academicYearEndsOn, academicYearStartsOn, agendaToday, loadSessionRange, setWorkspaceError, view])

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
  const openCalendarEvent = (event = null) => {
    if (event?.id) {
      setEditingEvent(event)
      setEventPreset(null)
    } else {
      setEditingEvent(null)
      setEventPreset(event ? { ...event, isPreset: true } : null)
    }
    setDialog('event')
  }
  const openCoordinationReminder = async (reminder) => {
    const item = reminder.coordinationItem || reminder
    const classItem = classes.find((candidate) => candidate.sharedTutoringSpaceId === item.spaceId)
    try {
      if (classItem) await setActiveClass(classItem.id)
      setActiveMode('tutoring')
      setActiveTutoringPanel('coordination')
      await markTutoringCoordinationRead(item.spaceId)
    } catch (error) {
      workspace.setError(error.message || 'No s’ha pogut obrir la coordinació de cotutoria.')
    }
  }
  const openReminders = (items = []) => {
    setFocusedReminderIds(items.map((item) => item.kind === 'tutoring'
      ? `coordination_${item.coordinationItem?.id || ''}`
      : item.id).filter(Boolean))
    setDialog('reminders')
    const requestedEnd = addDateDays(workspace.today, 42)
    const to = workspace.activeAcademicYear?.endsOn && workspace.activeAcademicYear.endsOn < requestedEnd
      ? workspace.activeAcademicYear.endsOn
      : requestedEnd
    workspace.loadSessionRange({ from: workspace.today, to })
      .catch((error) => workspace.setError(error.message || 'No s’han pogut carregar les sessions dels recordatoris.'))
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
    const currentStart = getAgendaDefaultWeekStart(workspace.today)
    setWeekStart(currentStart)
    workspace.loadTodaySessions()
      .catch((error) => workspace.setError(error.message || 'No s’ha pogut carregar la pròxima sessió.'))
  }
  const moveWeek = (amount) => {
    const nextStart = amount === 0 ? getAgendaDefaultWeekStart(workspace.today) : addDateDays(weekStart, amount)
    setView('week')
    setCalendarMode('week')
    loadWeek(nextStart)
  }
  const openCalendar = () => {
    setCalendarMode('week')
    setView('week')
    loadWeek(weekStart)
  }
  const openMonth = () => {
    const nextMonth = firstDayOfMonth(weekStart)
    const range = monthSessionRange(nextMonth)
    setMonthKey(nextMonth)
    setCalendarMode('month')
    setView('week')
    workspace.loadSessionRange(range)
      .catch((error) => workspace.setError(error.message || 'No s’ha pogut carregar el mes.'))
  }
  const moveMonth = (amount) => {
    const requestedMonth = amount === 0 ? firstDayOfMonth(workspace.today) : moveMonthKey(monthKey, amount)
    const firstCourseMonth = workspace.activeAcademicYear?.startsOn ? firstDayOfMonth(workspace.activeAcademicYear.startsOn) : requestedMonth
    const lastCourseMonth = workspace.activeAcademicYear?.endsOn ? firstDayOfMonth(workspace.activeAcademicYear.endsOn) : requestedMonth
    const nextMonth = requestedMonth < firstCourseMonth
      ? firstCourseMonth
      : requestedMonth > lastCourseMonth ? lastCourseMonth : requestedMonth
    const range = monthSessionRange(nextMonth)
    setMonthKey(nextMonth)
    workspace.loadSessionRange(range)
      .catch((error) => workspace.setError(error.message || 'No s’ha pogut carregar el mes.'))
  }
  const selectCalendarWeek = (nextStart) => {
    setCalendarMode('week')
    setView('week')
    loadWeek(nextStart)
  }
  const openTimeline = () => {
    setView('timeline')
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
  const reloadActiveView = () => {
    if (view === 'timeline') return workspace.loadSessionRange({
      classId: activeClassId,
      from: workspace.activeAcademicYear?.startsOn || addDateDays(workspace.today, -180),
      to: workspace.activeAcademicYear?.endsOn || addDateDays(workspace.today, 365),
    })
    if (view === 'week' && calendarMode === 'month') return workspace.loadSessionRange(monthSessionRange(monthKey))
    if (view === 'week') return reloadCurrentWeek()
    return workspace.loadTodaySessions()
  }
  const openClassroom = async (bundle) => {
    try {
      const bundleWithPrivateNotes = await workspace.loadClassroomPrivateNotes(bundle)
      const session = await workspace.saveSessionClassroomState(bundleWithPrivateNotes, {
        classroomOpenedAt: bundleWithPrivateNotes.session.classroomOpenedAt || new Date().toISOString(),
      })
      setActiveBundle({ ...bundleWithPrivateNotes, session })
      setDialog(null)
      setView('classroom')
    } catch (error) {
      workspace.setError(error.message || 'No s’ha pogut obrir Mode aula.')
    }
  }
  const openTimetableClassroom = (occurrence) => {
    const classItem = agendaClasses.find((item) => item.id === occurrence.slot.classId)
    const bundle = buildTimetableClassroomBundle(occurrence, classItem, user.uid)
    setActiveBundle(bundle)
    setDialog(null)
    setView('classroom')
  }
  const updateClassroomSession = async (bundle, changes) => {
    if (!bundle.standalone) return workspace.saveSessionClassroomState(bundle, changes)
    const session = { ...bundle.session, ...changes, updatedAt: new Date().toISOString() }
    setActiveBundle((current) => current?.session.id === session.id ? { ...current, session } : current)
    return session
  }
  const closeClassroom = async (bundle) => {
    if (!bundle.standalone) return workspace.closeClassroomSession(bundle)
    const now = new Date().toISOString()
    return {
      results: bundle.results,
      session: {
        ...bundle.session,
        classroomClosedAt: now,
        status: 'held',
        updatedAt: now,
      },
    }
  }
  const findNextClassroomSession = async (bundle) => {
    if (!bundle.standalone) return workspace.findNextClassroomSession(bundle)
    const sessionDate = String(bundle.session.startsAt).slice(0, 10)
    const startMinutes = Number(String(bundle.session.startsAt).slice(11, 13)) * 60
      + Number(String(bundle.session.startsAt).slice(14, 16))
      + Number(bundle.session.durationMinutes || 0)
    const afterTime = `${String(Math.floor(startMinutes / 60)).padStart(2, '0')}:${String(startMinutes % 60).padStart(2, '0')}`
    const occurrence = findNextTimetableOccurrence(
      workspace.slots.filter((slot) => slot.classId === bundle.session.classId),
      sessionDate,
      afterTime,
    )
    return occurrence ? buildTimetableClassroomBundle(occurrence, classes.find((item) => item.id === bundle.session.classId), user.uid).session : null
  }
  const exitClassroom = () => {
    setDialog(null)
    setActiveBundle(null)
    setView('today')
    const currentStart = getAgendaDefaultWeekStart(workspace.today)
    setWeekStart(currentStart)
    workspace.loadTodaySessions()
      .catch((error) => workspace.setError(error.message || 'No s’ha pogut actualitzar la setmana.'))
  }
  const activateClassroomEvidence = async (bundle, item) => {
    if (!isClassroomEvidenceDue(item)) return null
    const utId = getClassroomTrackingUtId({
      activeClassId,
      activeUtId,
      classId: bundle.session.classId,
      planningUnit: bundle.planningUnit,
      semesters,
      temporalUnits: workspace.temporalUnits,
      uts,
    })
    if (!utId && bundle.planningUnit.ownerUid !== user.uid) return null
    if (!utId) throw new Error('Aquest grup necessita una UT d’AvaluaPro per activar la tasca de seguiment.')
    const visibleStudents = getClassroomStudents(students, bundle.session.classId, bundle.session.subgroupId)
    const absentStudentIds = visibleStudents
      .filter((student) => findAbsenceForSession(absenceRecords, student.id, bundle.session.classId, bundle.session))
      .map((student) => student.id)
    const evidenceMode = item.sourceActivity?.evidenceMode || 'none'
    const evidenceKey = evidenceMode === 'perSession'
      ? `${bundle.application.id}:${item.sourceActivityId}:${bundle.session.id}`
      : `${bundle.application.id}:${item.sourceActivityId}:final`
    return activateClassroomTask({
      applicationId: bundle.application.id,
      classId: bundle.session.classId,
      date: String(bundle.session.startsAt).slice(0, 10),
      evidenceKey,
      evidenceMode,
      planningUnitId: bundle.planningUnit.id,
      sessionId: bundle.session.id,
      sessionItemId: item.id,
      sourceActivityId: item.sourceActivityId,
      studentIds: visibleStudents.map((student) => student.id),
      absentStudentIds,
      title: item.title,
      utId,
    })
  }
  const registerClassroomRecovery = (bundle, student, recovery) => saveClassroomRecovery({
    activities: recovery.items.map((item) => ({
      evidenceMode: item.sourceActivity?.evidenceMode || 'none',
      itemId: item.id,
      sourceActivityId: item.sourceActivityId,
      title: item.title,
    })),
    applicationId: bundle.application.id,
    classId: bundle.session.classId,
    emailText: recovery.emailText,
    kind: recovery.kind,
    nextSession: recovery.nextSession,
    planningUnitId: bundle.planningUnit.id,
    sessionId: bundle.session.id,
    sessionStartsAt: bundle.session.startsAt,
    studentId: student.id,
  })
  const confirmClassroomContinuation = async (preview) => {
    const confirmed = await workspace.confirmContinuationPreview(preview)
    const sourceItem = confirmed.changedExistingItems.find((item) => item.id === confirmed.item.id) || confirmed.item
    await activateClassroomEvidence(confirmed.bundle, { ...sourceItem, sourceActivity: confirmed.item.sourceActivity })
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
        agendaNotes={agendaNotes}
        behaviorEvents={behaviorEvents}
        bundle={activeBundle}
        classes={agendaClasses}
        key={`${activeBundle.session.id}:${classroomRevision}`}
        onCloseSession={closeClassroom}
        onCancelRecovery={(bundle, studentId, kind) => cancelClassroomRecovery({
          kind,
          sessionId: bundle.session.id,
          studentId,
        })}
        onContinue={(bundle, item) => adjustSession(bundle, 'continuation', item)}
        onActivateEvidence={activateClassroomEvidence}
        onAddBehavior={addBehaviorEvent}
        onExit={exitClassroom}
        onFindNextSession={findNextClassroomSession}
        onSaveRecovery={registerClassroomRecovery}
        onSaveResult={workspace.saveActivityResult}
        onSavePrivateNote={activeBundle.standalone ? async () => null : workspace.saveClassroomPrivateNote}
        onToggleAbsence={toggleStudentAbsence}
        onUpdateSession={updateClassroomSession}
        students={students}
        taskRecords={taskRecords}
        tasks={tasks}
        onUpdateTaskRecord={updateTaskRecord}
      />
      {dialog === 'session-adjust' && <AgendaSessionAdjustDialog bundle={activeBundle} initialAction={adjustInitialAction} initialItemId={adjustItemId} onBuildContinuation={workspace.buildContinuationPreview} onBuildRecovery={workspace.buildAgendaRecoveryPreview} onClose={() => setDialog(null)} onConfirmContinuation={confirmClassroomContinuation} onConfirmRecovery={workspace.confirmAgendaRecoveryPreview} onLoadRecoveryOptions={workspace.loadAgendaRecoveryOptions} onRemoveItem={(item) => workspace.removeSessionItem(activeBundle, item)} onSaveItem={(item, changes) => workspace.saveSessionItemChange(activeBundle, item, changes)} onSaved={setScheduleNotice} onStatus={(status) => workspace.saveSessionStatus(activeBundle, status)} />}
    </>
  }

  return (
    <section className="agenda-screen">
      <header className="agenda-topbar">
        <div className="agenda-brand"><span><CalendarDays size={21} /></span><div><small>Planificació diària</small><h1>Agenda</h1></div></div>
        <div className="agenda-course-controls">
          {workspace.academicYears.length > 0 ? <label>Curs<select value={workspace.activeAcademicYearId} onChange={(event) => workspace.setActiveAcademicYearId(event.target.value)}>{workspace.academicYears.map((year) => <option key={year.id} value={year.id}>{year.label}</option>)}</select></label> : <button className="secondary-action compact" onClick={() => setDialog('academic-year')} type="button"><CalendarPlus size={15} />Configurar curs</button>}
          <SyncBadge isOnline={workspace.isOnline} sync={workspace.sync} />
          {hasOwnCalendar && <button className="secondary-action compact" onClick={() => { setSchedulingUnitId(''); setDialog('scheduling') }} type="button"><CalendarPlus size={15} />Organitzar sessions</button>}
          <button aria-label="Sincronitzar Agenda" className="agenda-refresh" onClick={() => workspace.synchronize()} title="Sincronitzar ara" type="button"><RotateCcw size={15} /></button>
        </div>
      </header>

      <nav aria-label="Vistes d’Agenda" className="agenda-view-tabs">
        <button className={view === 'today' ? 'active' : ''} onClick={openToday} type="button"><CalendarDays size={17} />Avui</button>
        <button className={view === 'week' ? 'active' : ''} onClick={openCalendar} type="button"><Clock3 size={17} />Calendari</button>
        <button className={view === 'timeline' ? 'active' : ''} onClick={openTimeline} type="button"><ListChecks size={17} />Cronologia</button>
        <button className={view === 'timetable' ? 'active' : ''} onClick={() => { setView('timetable'); if (!hasOwnCalendar) setDialog('academic-year') }} type="button"><LayoutGrid size={17} />Horari</button>
      </nav>

      {workspace.error && <div className="agenda-error"><span>{workspace.error}</span><button onClick={() => workspace.setError('')} type="button">Tancar</button></div>}
      {scheduleNotice && <div className="agenda-success"><span>{scheduleNotice}</span><button onClick={() => setScheduleNotice('')} type="button">Tancar</button></div>}

      {workspace.loading && !hasAgendaWorkspace ? (
        <div className="agenda-loading"><Loader2 className="spin" size={21} />Carregant l’Agenda…</div>
      ) : !hasAgendaWorkspace ? (
        <section className="agenda-large-empty"><span><CalendarDays size={29} /></span><h2>Configura el curs per començar</h2><p>Defineix aquí les dates del curs i després podràs crear l’horari de les teves classes.</p><button className="primary-action" onClick={() => { setView('timetable'); setDialog('academic-year') }} type="button"><CalendarPlus size={17} />Configurar curs i horari</button></section>
      ) : (
        <main className="agenda-main">
          {view === 'today' && <AgendaTodayView bundles={workspace.sessionBundles} calendarEvents={workspace.calendarEvents} classes={agendaClasses} loading={workspace.sessionsLoading} onAdjust={adjustSession} onOpenCalendar={openCalendar} onOpenClassroom={openClassroom} onOpenCoordination={openCoordinationReminder} onOpenScheduling={hasOwnCalendar ? () => setDialog('scheduling') : null} onOpenTimetable={hasOwnCalendar ? () => setView('timetable') : null} onOpenTimetableClassroom={openTimetableClassroom} reminders={upcomingReminders} slots={workspace.slots} timetable={workspace.activeTimetable} today={workspace.today} />}
          {view === 'week' && calendarMode === 'week' && <AgendaWeekView bundles={workspace.sessionBundles} calendarEvents={workspace.calendarEvents} classes={agendaClasses} coordinationReminders={tutoringCalendarReminders} loading={workspace.sessionsLoading} onAddEvent={hasOwnCalendar ? openCalendarEvent : null} onMoveWeek={moveWeek} onOpenCoordination={openCoordinationReminder} onOpenReminders={openReminders} onOpenSession={openSession} onOpenTimetableClassroom={openTimetableClassroom} onReload={reloadCurrentWeek} onShowMonth={openMonth} personalReminders={personalCalendarReminders} slots={workspace.slots} timetable={workspace.activeTimetable} weekStart={weekStart} />}
          {view === 'week' && calendarMode === 'month' && <AgendaMonthView academicYear={workspace.activeAcademicYear} bundles={workspace.sessionBundles} calendarEvents={workspace.calendarEvents} coordinationReminders={tutoringCalendarReminders} monthKey={monthKey} onAddEvent={hasOwnCalendar ? openCalendarEvent : null} onDeleteEvent={removeEvent} onEditEvent={openCalendarEvent} onMoveMonth={moveMonth} onOpenReminders={openReminders} onSelectWeek={selectCalendarWeek} onShowWeek={() => selectCalendarWeek(startOfWeek(monthKey))} personalReminders={personalCalendarReminders} slots={workspace.slots} timetable={workspace.activeTimetable} today={workspace.today} />}
          {view === 'timeline' && <AgendaTimelineView bundles={workspace.sessionBundles} calendarEvents={workspace.calendarEvents} classes={agendaClasses} loading={workspace.sessionsLoading} onOpenSession={openSession} onSchedule={hasOwnCalendar ? () => setDialog('scheduling') : null} selectedClassId={activeClassId} today={workspace.today} />}
          {view === 'timetable' && !hasOwnCalendar && <section className="agenda-large-empty"><span><LayoutGrid size={29} /></span><h2>Configura el curs abans de crear l’horari</h2><p>Només cal indicar les dates del curs actual. En acabar, crearàs la primera versió de l’horari aquí mateix.</p><button className="primary-action" onClick={() => setDialog('academic-year')} type="button"><CalendarPlus size={17} />Configurar curs</button></section>}
          {view === 'timetable' && hasOwnCalendar && <TimetableView classes={classes} onAdd={(position) => openSlot(null, position)} onAddClass={addClass} onCreateVersion={() => { setEditingTimetable(null); setDialog('timetable') }} onDelete={removeSlot} onEdit={(slot) => openSlot(slot)} onEditVersion={() => { setEditingTimetable(workspace.activeTimetable); setDialog('timetable') }} onError={(error) => workspace.setError(error.message || 'No s’ha pogut actualitzar l’horari.')} onMove={workspace.moveSlot} onQuickAdd={(values) => workspace.saveSlot(values)} onResize={(slot, durationMinutes) => workspace.saveSlot({ durationMinutes }, slot)} onSelectVersion={workspace.setActiveTimetableId} onUpdateClass={updateClass} slots={workspace.slots} timetable={workspace.activeTimetable} timetables={workspace.timetables} today={workspace.today} />}
        </main>
      )}

      {dialog === 'academic-year' && <AcademicYearDialog onClose={() => setDialog(null)} onSave={workspace.createYear} />}
      {dialog === 'timetable' && <TimetableDialog academicYear={workspace.activeAcademicYear} currentTimetable={workspace.activeTimetable} initialValue={editingTimetable} onClose={() => setDialog(null)} onSave={(values, current) => current ? workspace.saveTimetable(current, values) : workspace.createTimetable(values)} />}
      {dialog === 'slot' && <TimetableSlotDialog classes={classes} initialPosition={slotPosition} initialValue={editingSlot} onClose={() => setDialog(null)} onSave={workspace.saveSlot} slots={workspace.slots} />}
      {dialog === 'event' && <CalendarEventDialog academicYear={workspace.activeAcademicYear} classes={classes} initialValue={editingEvent || eventPreset} onClose={() => { setDialog(null); setEditingEvent(null); setEventPreset(null) }} onSave={workspace.saveCalendarEvent} today={workspace.today} />}
      {dialog === 'reminders' && <RemindersModal focusedReminderIds={focusedReminderIds} onClose={() => { setDialog(null); setFocusedReminderIds([]) }} sessionOptions={reminderSessionOptions} sessionOptionsLoading={workspace.sessionsLoading} />}
      {dialog === 'scheduling' && <AgendaSchedulingDialog academicYear={workspace.activeAcademicYear} classes={classes} initialClassId={activeClassId} initialPlanningUnitId={schedulingUnitId} onBuildPreview={workspace.buildSchedulingPreview} onClose={() => { setDialog(null); setSchedulingUnitId('') }} onConfirm={workspace.confirmSchedulingPreview} onLoadSetup={workspace.loadSchedulingSetup} onSaved={(result) => { const sessionCount = result.logicalSessionCount ?? result.sessionCount; setScheduleNotice(result.reflowed ? `${sessionCount} ${sessionCount === 1 ? 'sessió futura reorganitzada' : 'sessions futures reorganitzades'} amb l’efecte dominó.` : `${sessionCount} ${sessionCount === 1 ? 'sessió de la UP afectada' : 'sessions de la UP afectades'} i vinculades amb l’Agenda.`); reloadActiveView() }} planningUnits={workspace.ownedPlanningUnits} today={workspace.today} />}
      {dialog === 'session-detail' && activeBundle && <AgendaSessionDetailDialog bundle={activeBundle} calendarEvents={workspace.calendarEvents} classes={agendaClasses} onAdjust={adjustSession} onClose={() => setDialog(null)} onOpenClassroom={openClassroom} />}
      {dialog === 'session-adjust' && activeBundle && <AgendaSessionAdjustDialog bundle={activeBundle} initialAction={adjustInitialAction} initialItemId={adjustItemId} onBuildContinuation={workspace.buildContinuationPreview} onBuildRecovery={workspace.buildAgendaRecoveryPreview} onClose={() => setDialog(null)} onConfirmContinuation={workspace.confirmContinuationPreview} onConfirmRecovery={workspace.confirmAgendaRecoveryPreview} onLoadRecoveryOptions={workspace.loadAgendaRecoveryOptions} onRemoveItem={(item) => workspace.removeSessionItem(activeBundle, item)} onSaveItem={(item, changes) => workspace.saveSessionItemChange(activeBundle, item, changes)} onSaved={setScheduleNotice} onStatus={(status) => workspace.saveSessionStatus(activeBundle, status)} />}
    </section>
  )
}
