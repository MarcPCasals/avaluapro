export function getTaskSessionKey(session) {
  return [session.startsAt, session.subgroupId || '', session.timetableSlotId || session.calendarEventId || ''].join('|')
}

export function formatTaskSession(session) {
  const day = new Intl.DateTimeFormat('ca-AD', { day: 'numeric', month: 'short', weekday: 'short' })
    .format(new Date(`${session.date}T12:00:00`))
  return `${day} · ${session.startsAt.slice(11, 16)}${session.subgroupId ? ` · ${session.subgroupId}` : ' · Grup complet'}`
}

export function selectTaskSession(sessions, key) {
  return sessions.find((session) => getTaskSessionKey(session) === key) || null
}
