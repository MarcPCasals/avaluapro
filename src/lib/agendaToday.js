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
