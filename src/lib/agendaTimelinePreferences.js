const KEY = 'avaluapro:timeline-subjects:v1'

export function readTimelineSubjects() {
  try {
    const value = JSON.parse(globalThis.localStorage?.getItem(KEY) || '{}')
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  } catch {
    return {}
  }
}

export function timelineSubjectKey(userId, classId) {
  return JSON.stringify([userId || '', classId || ''])
}

export function saveTimelineSubject(key, subject) {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify({ ...readTimelineSubjects(), [key]: subject }))
  } catch {
    // El filtre continua funcionant encara que el navegador no permeti desar preferències.
  }
}
