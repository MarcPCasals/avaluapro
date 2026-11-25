export function nextReminderSession(sessionOptions = [], classId = '', now = new Date()) {
  if (!classId) return null
  return sessionOptions
    .filter((option) => option.classId === classId && option.date && option.time)
    .filter((option) => new Date(`${option.date}T${option.time}:00`).getTime() >= now.getTime())
    .sort((left, right) => `${left.date}T${left.time}`.localeCompare(`${right.date}T${right.time}`))[0] || null
}
