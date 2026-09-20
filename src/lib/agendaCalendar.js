const NO_CLASS_EVENT_TYPES = new Set(['holiday', 'nonTeaching', 'specialDay', 'cancellation'])

function addDays(dateKey, amount) {
  const date = new Date(`${dateKey}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
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

export function getNoClassCalendarEvent(events = [], dateKey, classId) {
  return getCalendarEventsForDate(events, dateKey, classId)
    .find((event) => NO_CLASS_EVENT_TYPES.has(event.type)) || null
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
