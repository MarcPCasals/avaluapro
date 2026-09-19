/**
 * Manté els càlculs de Mode aula fora de React perquè el temporitzador no
 * depengui de la freqüència amb què la pantalla es torna a dibuixar.
 */
export function getClassroomTimerState({ endedAtMs = null, nowMs = Date.now(), plannedMinutes, startedAtMs }) {
  // Number(null) és 0; sense aquest control un temporitzador encara no iniciat
  // semblaria actiu des de 1970 i entraria directament en temps excedit.
  const start = startedAtMs === null || startedAtMs === undefined ? Number.NaN : Number(startedAtMs)
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

export const CLASSROOM_BEHAVIOR_CATEGORIES = Object.freeze({
  incident: Object.freeze([
    ['interrupts', 'Interromp'],
    ['talks', 'Parla fora de torn'],
    ['instructions', 'No segueix indicacions'],
    ['disturbs', 'Molesta el grup'],
    ['materials', 'No porta material'],
    ['conflict', 'Conflicte'],
  ]),
  positive: Object.freeze([
    ['participates', 'Participa'],
    ['helps', 'Ajuda el grup'],
    ['consistent', 'Treballa amb constància'],
    ['attitude', 'Bona actitud'],
    ['improves', 'Mostra millora'],
    ['autonomous', 'Treballa amb autonomia'],
  ]),
})

/** Decideix si aquest fragment ha de generar seguiment en aquesta sessió. */
export function isClassroomEvidenceDue(item = {}) {
  const mode = item.sourceActivity?.evidenceMode || 'none'
  if (mode === 'perSession') return true
  if (mode !== 'final') return false
  const segmentCount = Math.max(1, Number(item.segmentCount) || 1)
  const segmentIndex = Math.max(1, Number(item.segmentIndex) || 1)
  return segmentIndex >= segmentCount
}

export function getClassroomEvidenceItems(items = []) {
  return items.filter(isClassroomEvidenceDue)
}

/**
 * Relaciona la UT temporal de Programació amb la UT de seguiment del grup.
 * Primer respecta un nom coincident i, si no existeix, conserva el mateix ordre.
 */
export function getClassroomTrackingUtId({
  activeClassId,
  activeUtId,
  classId,
  planningUnit,
  semesters = [],
  temporalUnits = [],
  uts = [],
}) {
  const classSemesters = semesters
    .filter((semester) => semester.classId === classId)
    .sort((left, right) => Number(left.order) - Number(right.order))
  const semesterOrder = new Map(classSemesters.map((semester, index) => [semester.id, index]))
  const classUts = uts
    .filter((ut) => ut.classId === classId)
    .sort((left, right) => (semesterOrder.get(left.semesterId) ?? 999) - (semesterOrder.get(right.semesterId) ?? 999)
      || Number(left.order) - Number(right.order))
  if (classUts.length === 0) return ''

  const planningTemporalUnit = temporalUnits.find((unit) => unit.id === planningUnit?.temporalUnitId)
  const normalizedLabel = String(planningTemporalUnit?.label || '').trim().toLocaleLowerCase('ca')
  const exact = normalizedLabel && classUts.find((ut) => String(ut.name || '').trim().toLocaleLowerCase('ca') === normalizedLabel)
  if (exact) return exact.id

  const orderedTemporalUnits = [...temporalUnits].sort((left, right) =>
    String(left.startsOn || '').localeCompare(String(right.startsOn || '')) || Number(left.order) - Number(right.order))
  const temporalIndex = orderedTemporalUnits.findIndex((unit) => unit.id === planningUnit?.temporalUnitId)
  if (temporalIndex >= 0 && classUts[temporalIndex]) return classUts[temporalIndex].id
  if (activeClassId === classId && classUts.some((ut) => ut.id === activeUtId)) return activeUtId
  return classUts[0].id
}
