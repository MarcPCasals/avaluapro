import { createSessionItem } from '../domain/planning/model.js'
import { getNoClassCalendarEvent } from './agendaCalendar.js'

function addDays(dateKey, amount) {
  const date = new Date(`${dateKey}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

function weekdayFromDate(dateKey) {
  return new Date(`${dateKey}T12:00:00Z`).getUTCDay() || 7
}

function timeToMinutes(value = '') {
  const [hours, minutes] = String(value).split(':').map(Number)
  return Number.isFinite(hours) && Number.isFinite(minutes) ? (hours * 60) + minutes : 0
}

function normalizedScheduleLabel(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
}

/**
 * Una franja pot pertànyer al grup d'alumnes (1rC) i alhora representar una
 * classe pròpia de la barra superior (Tutoria). El nom de l'assignatura permet
 * oferir la mateixa franja als dos contextos sense duplicar l'horari.
 */
function reminderClassIdsForSlot(slot = {}, classes = []) {
  const canonicalClassId = String(slot.classId || '')
  const subjectLabel = normalizedScheduleLabel(slot.subject)
  const aliases = subjectLabel
    ? classes
      .filter((classItem) => String(classItem?.id || '') !== canonicalClassId)
      .filter((classItem) => normalizedScheduleLabel(classItem?.name) === subjectLabel)
      .map((classItem) => String(classItem.id))
    : []
  return [...new Set([canonicalClassId, ...aliases].filter(Boolean))]
}

/**
 * Reuneix les classes pròpies, compartides i inferides de les sessions en un
 * únic catàleg per a l'Agenda. Les dades configurades de la classe prevalen
 * sobre els valors de suport de les sessions perquè no es perdi el seu color.
 */
export function mergeAgendaClassCatalog({ bundles = [], classes = [], sharedClasses = [] }) {
  const catalog = new Map()
  const mergeClass = (classItem) => {
    if (!classItem?.id) return
    const current = catalog.get(classItem.id) || {}
    catalog.set(classItem.id, {
      ...current,
      ...classItem,
      color: classItem.color || current.color || 'blue',
    })
  }

  bundles.forEach((bundle) => mergeClass({
    id: bundle?.session?.classId,
    name: bundle?.application?.classLabel || 'Grup compartit',
  }))
  sharedClasses.forEach(mergeClass)
  classes.forEach(mergeClass)

  return [...catalog.values()]
}

/**
 * Prepara una edició exclusiva de l'Agenda. El resultat conté una única
 * entitat de sessió i, per construcció, no pot escriure l'activitat mestra de
 * la Programació ni crear cap modificació de grup.
 */
export function buildAgendaSessionItemUpdate(bundle, item, changes, options = {}) {
  const now = options.now || new Date().toISOString()
  return {
    context: {
      applicationId: bundle.application.id,
      planningUnitId: bundle.planningUnit.id,
      sessionId: bundle.session.id,
    },
    entity: createSessionItem({
      ...item,
      plannedMinutes: changes.plannedMinutes,
      title: changes.title,
      updatedAt: now,
    }, { now }),
  }
}

/**
 * Decideix si un fragment es pot retirar només de l'Agenda. Els resultats que
 * apareixen en una sessió futura poden ser registres tècnics del reajustament;
 * no converteixen per si sols la sessió en historial real. En canvi, una
 * sessió feta, tancada o amb assistència confirmada continua protegida.
 */
export function getAgendaSessionItemRemovalState(bundle, item, options = {}) {
  const now = new Date(options.now || new Date().toISOString()).getTime()
  const startsAt = new Date(bundle?.session?.startsAt || '').getTime()
  const isFutureSession = Number.isFinite(startsAt) && startsAt > now
  const linkedResults = item
    ? (bundle?.results || []).filter((result) => result.sessionItemId === item.id)
    : []
  const hasProtectedClassroomData = bundle?.session?.status !== 'planned'
    || Boolean(bundle?.session?.attendanceConfirmedAt)
    || Boolean(bundle?.session?.classroomClosedAt)
    || (Boolean(bundle?.session?.classroomOpenedAt) && !isFutureSession)

  return {
    canRemove: Boolean(item) && !hasProtectedClassroomData,
    hasProtectedClassroomData,
    isFutureSession,
    linkedResults,
  }
}

/**
 * Busca la pròxima classe de l'horari encara que no tingui una UP
 * calendaritzada. Això evita que la portada quedi buida durant el cap de
 * setmana o entre dues programacions.
 */
export function findNextTimetableOccurrence(slots = [], today, nowTime = '00:00') {
  const orderedSlots = [...slots].sort((left, right) =>
    Number(left.weekday) - Number(right.weekday)
      || String(left.startsAt || '').localeCompare(String(right.startsAt || '')))
  for (let offset = 0; offset < 14; offset += 1) {
    const date = addDays(today, offset)
    const weekday = weekdayFromDate(date)
    const candidates = orderedSlots.filter((slot) => Number(slot.weekday) === weekday)
    for (const slot of candidates) {
      if (offset === 0) {
        const endMinutes = timeToMinutes(slot.startsAt) + Number(slot.durationMinutes || 0)
        if (endMinutes <= timeToMinutes(nowTime)) continue
      }
      return {
        date,
        slot,
        startsAt: `${date}T${slot.startsAt}:00`,
      }
    }
  }
  return null
}

/**
 * Crea el context mínim de Mode aula per a una classe que existeix a l'horari
 * però encara no està vinculada a cap UP. L'assistència, el comportament i les
 * tasques continuen utilitzant els registres generals d'AvaluaPro.
 */
export function buildTimetableClassroomBundle(occurrence, classItem = {}, ownerUid = '') {
  const slot = occurrence.slot
  const stableId = `timetable_${occurrence.date}_${slot.id}`
  return {
    standalone: true,
    application: {
      id: `timetable_${slot.classId}`,
      classId: slot.classId,
      classLabel: classItem.name || slot.subject || 'Classe',
    },
    items: [],
    planningUnit: {
      id: '',
      code: 'Horari',
      ownerUid,
      title: slot.subject || classItem.name || 'Classe',
    },
    privateNotes: [],
    results: [],
    session: {
      attendanceConfirmedAt: '',
      classroomOpenedAt: new Date().toISOString(),
      classId: slot.classId,
      durationMinutes: Number(slot.durationMinutes || 60),
      id: stableId,
      ownerUid,
      startsAt: occurrence.startsAt,
      status: 'planned',
      subgroupId: slot.subgroupId || null,
      timetableSlotId: slot.id,
      timetableVersionId: slot.timetableVersionId || null,
    },
  }
}

/**
 * Converteix les franges recurrents de l'horari en entrades visibles de la
 * setmana. Les franges que ja tenen una sessió de Programació es descarten
 * perquè la sessió completa ocuparà el seu lloc i no s'ha de duplicar.
 */
export function getWeekTimetableOccurrences({ bundles = [], slots = [], timetable = null, weekStart }) {
  if (!weekStart) return []

  return slots
    .filter((slot) => Number(slot.weekday) >= 1 && Number(slot.weekday) <= 5)
    .map((slot) => {
      const date = addDays(weekStart, Number(slot.weekday) - 1)
      if (timetable?.effectiveFrom && date < timetable.effectiveFrom) return null
      if (timetable?.effectiveTo && date > timetable.effectiveTo) return null

      const programmed = bundles.some((bundle) => {
        const session = bundle.session || {}
        if (String(session.startsAt || '').slice(0, 10) !== date) return false
        if (session.timetableSlotId && session.timetableSlotId === slot.id) return true
        return session.classId === slot.classId
          && String(session.startsAt || '').slice(11, 16) === slot.startsAt
          && String(session.subgroupId || '') === String(slot.subgroupId || '')
      })
      if (programmed) return null

      return {
        date,
        id: `timetable_${date}_${slot.id}`,
        slot,
        startsAt: `${date}T${slot.startsAt}:00`,
      }
    })
    .filter(Boolean)
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
}

/**
 * Construeix les opcions reals que es poden vincular a un recordatori.
 * Combina les sessions ja calendaritzades amb les franges recurrents de
 * l'horari que encara no tenen UP, sense duplicar-les ni oferir dies no lectius.
 */
export function buildReminderSessionOptions({
  bundles = [],
  calendarEvents = [],
  classes = [],
  slots = [],
  timetable = null,
  today,
  weeks = 6,
}) {
  if (!today) return []

  const options = bundles
    .filter((bundle) => {
      const session = bundle?.session || {}
      const date = String(session.startsAt || '').slice(0, 10)
      return date >= today
        && !['cancelled', 'notHeld'].includes(session.status)
        && !getNoClassCalendarEvent(calendarEvents, date, session.classId)
    })
    .flatMap((bundle) => {
      const session = bundle.session
      const slot = slots.find((candidate) => candidate.id === session.timetableSlotId)
      return reminderClassIdsForSlot(slot || { classId: session.classId }, classes).map((classId) => ({
        classId,
        date: String(session.startsAt).slice(0, 10),
        durationMinutes: Number(session.durationMinutes || 60),
        id: `session:${session.id}${classId === session.classId ? '' : `:class:${classId}`}`,
        planningLabel: [bundle.planningUnit?.code, bundle.planningUnit?.title].filter(Boolean).join(' · '),
        sessionId: session.id,
        startsAt: session.startsAt,
        subgroupId: session.subgroupId || '',
        time: String(session.startsAt).slice(11, 16),
        timetableSlotId: session.timetableSlotId || '',
      }))
    })

  const startDate = new Date(`${today}T12:00:00Z`)
  const weekday = startDate.getUTCDay() || 7
  startDate.setUTCDate(startDate.getUTCDate() - weekday + 1)
  const firstWeek = startDate.toISOString().slice(0, 10)

  for (let offset = 0; offset < weeks; offset += 1) {
    const weekStart = addDays(firstWeek, offset * 7)
    getWeekTimetableOccurrences({ bundles, slots, timetable, weekStart })
      .filter((occurrence) => occurrence.date >= today)
      .filter((occurrence) => !getNoClassCalendarEvent(
        calendarEvents,
        occurrence.date,
        occurrence.slot.classId,
      ))
      .forEach((occurrence) => {
        reminderClassIdsForSlot(occurrence.slot, classes).forEach((classId) => options.push({
          classId,
          date: occurrence.date,
          durationMinutes: Number(occurrence.slot.durationMinutes || 60),
          id: `session:${occurrence.id}${classId === occurrence.slot.classId ? '' : `:class:${classId}`}`,
          planningLabel: occurrence.slot.subject || '',
          sessionId: occurrence.id,
          startsAt: occurrence.startsAt,
          subgroupId: occurrence.slot.subgroupId || '',
          time: occurrence.slot.startsAt,
          timetableSlotId: occurrence.slot.id,
        }))
      })
  }

  return options
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
    .filter((option, index, items) => items.findIndex((item) => item.id === option.id) === index)
}
