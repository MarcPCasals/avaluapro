/**
 * Manté els càlculs de Mode aula fora de React perquè el temporitzador no
 * depengui de la freqüència amb què la pantalla es torna a dibuixar.
 */
export function getClassroomTimerState({ endedAtMs = null, nowMs = Date.now(), plannedMinutes, startedAtMs }) {
  const start = Number(startedAtMs)
  const end = endedAtMs === null ? Number(nowMs) : Number(endedAtMs)
  const plannedSeconds = Math.max(0, Math.round((Number(plannedMinutes) || 0) * 60))
  const elapsedSeconds = Number.isFinite(start) && Number.isFinite(end)
    ? Math.max(0, Math.floor((end - start) / 1000))
    : 0
  const remainingSeconds = Math.max(0, plannedSeconds - elapsedSeconds)
  const overtimeSeconds = Math.max(0, elapsedSeconds - plannedSeconds)
  return {
    elapsedSeconds,
    isOvertime: plannedSeconds > 0 && overtimeSeconds > 0,
    overtimeSeconds,
    plannedSeconds,
    remainingSeconds,
  }
}

export function getCorrectedActualMinutes({ endedAtMs = Date.now(), endedMinutesAgo = 0, startedAtMs }) {
  const correctedEnd = Number(endedAtMs) - Math.max(0, Number(endedMinutesAgo) || 0) * 60 * 1000
  const seconds = getClassroomTimerState({ endedAtMs: correctedEnd, startedAtMs }).elapsedSeconds
  return seconds > 0 ? Math.round((seconds / 60) * 10) / 10 : null
}

export function getClassroomStudents(students = [], classId, subgroupId = '') {
  return students
    .filter((student) => student.classId === classId)
    .filter((student) => !subgroupId || student.halfGroup === subgroupId)
    .sort((left, right) => String(left.name).localeCompare(String(right.name), 'ca'))
}

export function getClassroomPromptState(session, now = new Date()) {
  if (!session?.startsAt || session.status !== 'planned') return null
  const startsAtMs = Date.parse(session.startsAt)
  const nowMs = now instanceof Date ? now.getTime() : Number(now)
  if (!Number.isFinite(startsAtMs) || !Number.isFinite(nowMs)) return null
  const durationMs = Math.max(1, Number(session.durationMinutes) || 60) * 60 * 1000
  const differenceMs = startsAtMs - nowMs
  if (differenceMs > 5 * 60 * 1000 || differenceMs <= -durationMs) return null
  return {
    kind: differenceMs > 0 ? 'upcoming' : 'active',
    minutesUntil: differenceMs > 0 ? Math.max(1, Math.ceil(differenceMs / 60000)) : 0,
  }
}
