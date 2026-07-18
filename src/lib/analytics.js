import { calculateGrade, getNumericFromGrade } from './grades.js'

export function getStudentEvaluationScore(studentId, state) {
  const studentMarks = state.marks.filter((mark) => mark.studentId === studentId)
  const grades = studentMarks.map((mark) => mark.value).filter(Boolean)
  const grade = calculateGrade(grades)
  return { grade, score: getNumericFromGrade(grade) }
}

export function getStudentTrackingStats(studentId, taskRecords, tasks) {
  const records = taskRecords.filter((record) => record.studentId === studentId)
  const evaluableTaskIds = new Set(tasks.map((task) => task.id))
  const scopedRecords = records.filter((record) => evaluableTaskIds.has(record.taskId))
  const done = scopedRecords.filter((record) => record.status === 'DONE').length
  const late = scopedRecords.filter((record) => record.status === 'LATE').length
  const missing = scopedRecords.filter((record) => record.status === 'MISSING').length
  const exempt = scopedRecords.filter((record) => record.status === 'EXEMPT').length
  const total = Math.max(tasks.length - exempt, 0)
  const points = done + late * 0.5
  const consistency = total === 0 ? 0 : Math.round((points / total) * 100)

  return { done, late, missing, exempt, total, consistency, hasTrackingData: total > 0 }
}

export function getStudentRedPointCount(student, trackingStats) {
  return Math.max(trackingStats?.missing || 0, student?.legacyTrackingPenaltyCount || 0)
}

function getTaskTime(task) {
  const time = new Date(task.date).getTime()
  return Number.isNaN(time) ? 0 : time
}

function getScopedRecord(taskRecords, studentId, taskId) {
  return taskRecords.find((record) => record.studentId === studentId && record.taskId === taskId)
}

function getStatusPoints(status) {
  if (status === 'DONE') return 1
  if (status === 'LATE') return 0.5
  return 0
}

function getWindowConsistency(studentId, taskRecords, tasks) {
  const evaluableTasks = tasks.filter((task) => {
    const status = getScopedRecord(taskRecords, studentId, task.id)?.status
    return status && status !== 'EXEMPT'
  })
  if (evaluableTasks.length === 0) return { consistency: 0, missing: 0, late: 0, done: 0, total: 0 }

  const summary = evaluableTasks.reduce(
    (acc, task) => {
      const status = getScopedRecord(taskRecords, studentId, task.id)?.status || ''
      return {
        points: acc.points + getStatusPoints(status),
        missing: acc.missing + (status === 'MISSING' ? 1 : 0),
        late: acc.late + (status === 'LATE' ? 1 : 0),
        done: acc.done + (status === 'DONE' ? 1 : 0),
      }
    },
    { points: 0, missing: 0, late: 0, done: 0 },
  )

  return {
    ...summary,
    total: evaluableTasks.length,
    consistency: Math.round((summary.points / evaluableTasks.length) * 100),
  }
}

function getRecentIncidents(studentId, behaviorEvents, anchorDate) {
  const anchorTime = anchorDate ? new Date(anchorDate).getTime() : Date.now()
  return behaviorEvents.filter((event) => {
    if (event.studentId !== studentId || event.type !== 'incident') return false
    const eventTime = new Date(event.date).getTime()
    if (Number.isNaN(eventTime)) return true
    const days = Math.abs(anchorTime - eventTime) / (1000 * 60 * 60 * 24)
    return days <= 28
  }).length
}

export function getStudentInterventionInsight(student, taskRecords, tasks, behaviorEvents) {
  const orderedTasks = [...tasks].sort((a, b) => getTaskTime(a) - getTaskTime(b))
  const recentTasks = orderedTasks.slice(-4)
  const latestTask = orderedTasks.at(-1)
  const latestStatus = latestTask ? getScopedRecord(taskRecords, student.id, latestTask.id)?.status || '' : ''
  const overall = getStudentTrackingStats(student.id, taskRecords, orderedTasks)
  const redPointCount = getStudentRedPointCount(student, overall)
  const recent = getWindowConsistency(student.id, taskRecords, recentTasks)
  const recentIncidents = getRecentIncidents(student.id, behaviorEvents, latestTask?.date)
  const hasEnoughPattern = recent.total >= 3

  let level = 'stable'
  let label = 'Estable'
  let reason = 'Constància correcta i sense senyals recents importants.'

  if (redPointCount >= 3 && recentIncidents >= 1) {
    level = 'priority'
    label = 'Agenda prioritària'
    reason = 'Acumula punts vermells i incidències: convé revisar agenda i intervenció.'
  } else if (redPointCount >= 3) {
    level = 'priority'
    label = 'Punts vermells acumulats'
    reason = 'Ja acumula prou punts vermells per valorar una nota a l’agenda.'
  } else if (hasEnoughPattern && recent.consistency < 55 && (redPointCount >= 2 || recentIncidents >= 1)) {
    level = 'priority'
    label = 'Intervenció prioritària'
    reason = 'Baixa constància recent amb repetició o incidències.'
  } else if (hasEnoughPattern && (recent.consistency < 70 || redPointCount >= 2 || recentIncidents >= 2)) {
    level = 'monitor'
    label = 'Seguiment'
    reason = 'Hi ha patró recent que convé observar.'
  } else if (latestStatus === 'MISSING' || latestStatus === 'LATE') {
    level = 'punctual'
    label = 'Atenció puntual'
    reason = latestStatus === 'MISSING' ? 'Última tasca no feta, encara sense patró suficient.' : 'Última tasca entregada tard.'
  }

  return {
    student,
    level,
    label,
    reason,
    latestStatus,
    latestTask,
    recent,
    overall,
    redPointCount,
    recentIncidents,
  }
}

export function buildTrackingInterventions(students, taskRecords, tasks, behaviorEvents) {
  const insights = students.map((student) =>
    getStudentInterventionInsight(student, taskRecords, tasks, behaviorEvents),
  )
  const priorityOrder = { priority: 0, monitor: 1, punctual: 2, stable: 3 }

  return insights.sort((a, b) => {
    const levelDiff = priorityOrder[a.level] - priorityOrder[b.level]
    if (levelDiff !== 0) return levelDiff
    if (a.recent.consistency !== b.recent.consistency) return a.recent.consistency - b.recent.consistency
    return b.recentIncidents - a.recentIncidents
  })
}

export function buildStudentProfiles(state, classId, utId) {
  const students = state.students.filter((student) => student.classId === classId)
  const tasks = state.tasks.filter((task) => task.classId === classId && (!utId || task.utId === utId))
  const behaviorEvents = state.behaviorEvents.filter((event) => event.classId === classId)

  return students.map((student) => {
    const evaluation = getStudentEvaluationScore(student.id, state)
    const tracking = getStudentTrackingStats(student.id, state.taskRecords, tasks)
    const redPointCount = getStudentRedPointCount(student, tracking)
    const incidents = behaviorEvents.filter(
      (event) => event.studentId === student.id && event.type === 'incident',
    ).length
    const riskScore =
      (evaluation.score > 0 && evaluation.score <= 2 ? 1 : 0) +
      (tracking.hasTrackingData && tracking.consistency < 60 ? 1 : 0) +
      (incidents >= 2 || redPointCount >= 3 ? 1 : 0)

    return { student, evaluation, tracking, redPointCount, incidents, riskScore }
  })
}
