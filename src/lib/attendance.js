function pad(value) {
  return String(value).padStart(2, '0')
}

export function getAbsenceTimeParts(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  const dateKey = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  const hour = pad(date.getHours())
  const minute = pad(date.getMinutes())

  return {
    date: dateKey,
    time: `${hour}:${minute}`,
    slotKey: `${dateKey}T${hour}`,
  }
}

export function getStudentAbsenceRecords(records = [], studentId, classId = '') {
  return records
    .filter(
      (record) =>
        record.studentId === studentId &&
        (!classId || !record.classId || record.classId === classId),
    )
    .sort((a, b) => (b.recordedAt || `${b.date}T${b.time}`).localeCompare(a.recordedAt || `${a.date}T${a.time}`))
}

export function findAbsenceInSlot(records = [], studentId, classId, slotKey) {
  return records.find(
    (record) =>
      record.studentId === studentId &&
      record.classId === classId &&
      record.slotKey === slotKey,
  )
}

export function findAbsenceForSession(records = [], studentId, classId, session = {}) {
  const exact = session.id && records.find(
    (record) => record.studentId === studentId && record.classId === classId && record.sessionId === session.id,
  )
  if (exact) return exact
  if (!session.startsAt) return undefined
  return findAbsenceInSlot(records, studentId, classId, getAbsenceTimeParts(session.startsAt).slotKey)
}

export function getStudentAbsenceHours(records = [], studentId, classId = '') {
  return getStudentAbsenceRecords(records, studentId, classId).reduce(
    (total, record) => total + (Number(record.hours) || 1),
    0,
  )
}

export function formatAbsenceHours(hours = 0) {
  const numericHours = Number(hours) || 0
  return `${Number.isInteger(numericHours) ? numericHours : numericHours.toLocaleString('ca-ES')} h`
}

export function formatAbsenceDateTime(record = {}) {
  const dateValue = record.date || String(record.recordedAt || '').slice(0, 10)
  const [year, month, day] = dateValue.split('-').map(Number)
  const date = year && month && day ? new Date(year, month - 1, day) : null
  const dateLabel = date
    ? new Intl.DateTimeFormat('ca-ES', {
        day: 'numeric',
        month: 'long',
        weekday: 'long',
        year: 'numeric',
      }).format(date)
    : 'Data desconeguda'
  const time = record.time || (record.recordedAt ? new Date(record.recordedAt).toLocaleTimeString('ca-ES', {
    hour: '2-digit',
    minute: '2-digit',
  }) : '')

  return time ? `${dateLabel} · ${time}` : dateLabel
}
