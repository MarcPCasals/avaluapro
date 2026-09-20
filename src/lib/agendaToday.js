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
