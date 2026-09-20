const DEFAULT_LATE_START_MINUTES = 17 * 60

export function timetableTimeToMinutes(value) {
  const [hours, minutes] = String(value || '00:00').split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0
  return hours * 60 + minutes
}

/**
 * Manté compacta la graella principal: les franges de les 17 h en endavant
 * continuen formant part de l'horari, però es presenten en una banda inferior.
 */
export function splitTimetableSlots(slots = [], lateStartMinutes = DEFAULT_LATE_START_MINUTES) {
  const visibleSlots = slots.filter((slot) => Number(slot.weekday) >= 1 && Number(slot.weekday) <= 5)
  const byDayAndTime = (left, right) =>
    Number(left.weekday) - Number(right.weekday)
    || timetableTimeToMinutes(left.startsAt) - timetableTimeToMinutes(right.startsAt)
    || String(left.id || '').localeCompare(String(right.id || ''))

  return {
    daytime: visibleSlots
      .filter((slot) => timetableTimeToMinutes(slot.startsAt) < lateStartMinutes)
      .sort(byDayAndTime),
    late: visibleSlots
      .filter((slot) => timetableTimeToMinutes(slot.startsAt) >= lateStartMinutes)
      .sort(byDayAndTime),
  }
}

