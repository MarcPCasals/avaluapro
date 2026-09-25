const NO_CLASS_EVENT_TYPES = new Set(['holiday', 'nonTeaching', 'specialDay', 'cancellation'])

function normalizedSubject(subject = '') {
  return String(subject || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('ca')
}

function addDays(dateKey, amount) {
  const date = new Date(`${dateKey}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

function weekdayFromDate(dateKey) {
  const weekday = new Date(`${dateKey}T12:00:00Z`).getUTCDay()
  return weekday === 0 ? 7 : weekday
}

function isWholeDayNoClassEvent(event) {
  return isNoClassCalendarEvent(event)
    && (!Array.isArray(event.classIds) || event.classIds.length === 0)
    && !calendarEventTargetsSession(event)
}

function selectTimetableForDate(timetables = [], dateKey) {
  return timetables
    .filter((item) => item.effectiveFrom <= dateKey && (!item.effectiveTo || item.effectiveTo >= dateKey))
    .sort((left, right) => String(right.effectiveFrom).localeCompare(String(left.effectiveFrom)))[0] || null
}

function sharedProgrammingRootId(slot, slotsById) {
  let current = slot
  const visited = new Set()
  while (current?.sharedProgrammingSlotId && !visited.has(current.id)) {
    visited.add(current.id)
    current = slotsById.get(current.sharedProgrammingSlotId) || current
    if (visited.has(current.id)) break
  }
  return current?.id || slot.id
}

/**
 * Resumeix el temps real disponible dins d'una UT. Els dies lectius només
 * compten de dilluns a divendres i exclouen els dies complets no lectius. Les
 * sessions parteixen de la versió d'horari vigent a cada data i respecten les
 * excepcions globals, de grup i de franja.
 */
export function getTemporalUnitProgress({
  calendarEvents = [],
  classId = '',
  slotsByTimetableId = {},
  subject = '',
  temporalUnit,
  timetables = [],
  today,
}) {
  if (!temporalUnit?.startsOn || !temporalUnit?.endsOn) return null
  const firstRemainingDate = today > temporalUnit.startsOn ? today : temporalUnit.startsOn
  let totalWorkingDays = 0
  let remainingWorkingDays = 0
  let totalSessions = 0
  let remainingSessions = 0

  for (let dateKey = temporalUnit.startsOn; dateKey <= temporalUnit.endsOn; dateKey = addDays(dateKey, 1)) {
    const weekday = weekdayFromDate(dateKey)
    const wholeDayBlocked = calendarEvents.some((event) =>
      calendarEventCoversDate(event, dateKey) && isWholeDayNoClassEvent(event))
    if (weekday <= 5 && !wholeDayBlocked) {
      totalWorkingDays += 1
      if (dateKey >= firstRemainingDate) remainingWorkingDays += 1
    }

    if (!classId) continue
    const timetable = selectTimetableForDate(timetables, dateKey)
    const timetableSlots = slotsByTimetableId[timetable?.id] || []
    const slotsById = new Map(timetableSlots.map((slot) => [slot.id, slot]))
    const subjectKey = normalizedSubject(subject)
    const slots = timetableSlots
      .filter((slot) => slot.classId === classId && Number(slot.weekday) === weekday)
      .filter((slot) => !subjectKey || normalizedSubject(slot.subject) === subjectKey)
      .filter((slot) => !getNoClassCalendarEvent(calendarEvents, dateKey, classId, { timetableSlotId: slot.id }))
    const logicalSessionIds = new Set(slots.map((slot) => sharedProgrammingRootId(slot, slotsById)))
    for (const sessionId of logicalSessionIds) {
      if (!sessionId) continue
      totalSessions += 1
      if (dateKey >= firstRemainingDate) remainingSessions += 1
    }
  }

  return {
    remainingSessions,
    remainingWorkingDays,
    totalSessions,
    totalWorkingDays,
  }
}

export function startOfCalendarWeek(dateKey) {
  const date = new Date(`${dateKey}T12:00:00Z`)
  const weekday = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() - weekday + 1)
  return date.toISOString().slice(0, 10)
}

/**
 * Durant el cap de setmana, l'Agenda ja prepara la setmana entrant. Els dies
 * lectius continua obrint la setmana que conté la data indicada.
 */
export function getAgendaDefaultWeekStart(dateKey) {
  const date = new Date(`${dateKey}T12:00:00Z`)
  const currentWeekStart = startOfCalendarWeek(dateKey)
  return [0, 6].includes(date.getUTCDay()) ? addDays(currentWeekStart, 7) : currentWeekStart
}

/**
 * La cronologia comença pel tram immediat del curs i només amplia el rang quan
 * el docent ho demana. Això evita consultar tot l'any per veure les pròximes
 * sessions.
 */
export function getAgendaTimelineInitialRange({ endsOn, pageDays = 56, startsOn, today }) {
  const safePageDays = Math.max(1, Math.floor(Number(pageDays) || 56))
  const courseStart = startsOn || addDays(today, -180)
  const courseEnd = endsOn || addDays(today, 365)
  const from = today < courseStart
    ? courseStart
    : today > courseEnd ? [courseStart, addDays(courseEnd, -(safePageDays - 1))].sort().at(-1) : today
  const to = [courseEnd, addDays(from, safePageDays - 1)].sort()[0]
  return {
    courseEnd,
    courseStart,
    from,
    hasEarlier: from > courseStart,
    hasLater: to < courseEnd,
    to,
  }
}

export function getAdjacentAgendaTimelineRange(current, direction, options = {}) {
  if (!current?.from || !current?.to) return null
  const safePageDays = Math.max(1, Math.floor(Number(options.pageDays) || 56))
  const courseStart = options.startsOn || current.courseStart || addDays(current.from, -180)
  const courseEnd = options.endsOn || current.courseEnd || addDays(current.to, 365)
  if (direction === 'earlier' && current.from > courseStart) {
    return {
      from: [courseStart, addDays(current.from, -safePageDays)].sort().at(-1),
      to: addDays(current.from, -1),
    }
  }
  if (direction === 'later' && current.to < courseEnd) {
    return {
      from: addDays(current.to, 1),
      to: [courseEnd, addDays(current.to, safePageDays)].sort()[0],
    }
  }
  return null
}

export function getMonthCalendarWeeks(monthKey, range = {}) {
  const monthStart = `${String(monthKey).slice(0, 7)}-01`
  const nextMonth = new Date(`${monthStart}T12:00:00Z`)
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1)
  const monthEnd = addDays(nextMonth.toISOString().slice(0, 10), -1)
  const firstWeek = startOfCalendarWeek(monthStart)
  const weeks = []

  for (let weekStart = firstWeek; weekStart <= monthEnd; weekStart = addDays(weekStart, 7)) {
    const weekEnd = addDays(weekStart, 6)
    if (range.startsOn && weekEnd < range.startsOn) continue
    if (range.endsOn && weekStart > range.endsOn) continue
    weeks.push({
      days: Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
      weekEnd,
      weekStart,
    })
  }
  return weeks
}

export function calendarEventCoversDate(event, dateKey) {
  return Boolean(event?.startsOn && event.startsOn <= dateKey && (event.endsOn || event.startsOn) >= dateKey)
}

export function calendarEventAppliesToClass(event, classId) {
  return !Array.isArray(event?.classIds) || event.classIds.length === 0 || event.classIds.includes(classId)
}

export function getCalendarEventsForDate(events = [], dateKey, classId = '') {
  return events.filter((event) =>
    calendarEventCoversDate(event, dateKey)
    && (!classId || calendarEventAppliesToClass(event, classId)))
}

export function calendarEventTargetsSession(event) {
  return Boolean(event?.sessionId || event?.timetableSlotId)
}

function calendarEventAppliesToSession(event, target = {}) {
  if (event?.sessionId && event.sessionId !== target.sessionId) return false
  if (event?.timetableSlotId && event.timetableSlotId !== target.timetableSlotId) return false
  return true
}

export function getNoClassCalendarEvent(events = [], dateKey, classId, target = {}) {
  return getCalendarEventsForDate(events, dateKey, classId)
    .find((event) => NO_CLASS_EVENT_TYPES.has(event.type) && calendarEventAppliesToSession(event, target)) || null
}

export function isNoClassCalendarEvent(event) {
  return NO_CLASS_EVENT_TYPES.has(event?.type)
}

export function calendarEventCoversSchoolWeek(event, weekStart) {
  return NO_CLASS_EVENT_TYPES.has(event?.type)
    && (!Array.isArray(event.classIds) || event.classIds.length === 0)
    && calendarEventCoversDate(event, weekStart)
    && calendarEventCoversDate(event, addDays(weekStart, 4))
}
