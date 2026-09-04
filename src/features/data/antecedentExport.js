import { getStudentTrackingStats, getStudentRedPointCount } from '../../lib/analytics.js'
import { getClassUts, getUtCompetencies, getStudentCompetencyGrade, getStudentUtGrade } from '../../lib/studentEvaluation.js'
import { calculateGrade, getNumericFromGrade } from '../../lib/grades.js'

// Prepare the next course's baseline from this class's current data, never from its incoming antecedents.
export function prepareClassAntecedents(state, classItem, courseLabel = '') {
  if (!classItem) return []
  const uts = getClassUts(state, classItem.id)
  const tasks = state.tasks.filter((task) => task.classId === classItem.id)
  return state.students.filter((student) => student.classId === classItem.id).map((student) => {
    const competencyGrades = {}
    const evolution = uts.map((ut) => {
      for (const competency of getUtCompetencies(state, ut.id)) {
        const grade = getStudentCompetencyGrade(state, student.id, competency)
        const code = competency.name.match(/\bC\d+\b/i)?.[0].toUpperCase() || competency.name
        if (grade) competencyGrades[code] = grade
      }
      return { name: ut.name, grade: getStudentUtGrade(state, student.id, ut.id).grade }
    }).filter((ut) => ut.grade)
    const tracking = getStudentTrackingStats(student.id, state.taskRecords, tasks)
    const recordedTaskIds = new Set(state.taskRecords.filter((record) => record.studentId === student.id &&
      ['DONE', 'LATE', 'MISSING', 'EXEMPT'].includes(record.status)).map((record) => record.taskId))
    const hasTracking = tasks.some((task) => recordedTaskIds.has(task.id))
    const pending = Math.max(0, tracking.total - tracking.done - tracking.late - tracking.missing)
    const incidents = state.behaviorEvents.filter((event) => event.classId === classItem.id &&
      event.studentId === student.id && event.type === 'incident').length
    const redPoints = getStudentRedPointCount(student, tracking)
    const lastLookGrade = calculateGrade(Object.values(competencyGrades))
    const score = getNumericFromGrade(lastLookGrade)
    const hasData = Boolean(lastLookGrade || hasTracking || incidents || redPoints)
    const risk = (score > 0 && score <= 2 ? 1 : 0) +
      (hasTracking && tracking.hasTrackingData && tracking.consistency < 60 ? 1 : 0) + (incidents >= 2 || redPoints >= 3 ? 1 : 0)
    const profile = !hasData ? '' : score > 0 && score <= 2 && hasTracking && tracking.consistency >= 60
      ? 'invisible' : risk >= 2 ? 'priority' : hasTracking && tracking.consistency >= 75 ? 'stable' : 'ordinary'
    const notes = [
      `Resum de ${classItem.name}${classItem.subject ? ` · ${classItem.subject}` : ''}.`,
      evolution.length ? `Evolució per UT: ${evolution.map((ut) => `${ut.name}: ${ut.grade}`).join('; ')}.` : 'Sense notes registrades.',
      hasTracking ? `Constància: ${tracking.consistency}%. Tasques: ${tracking.done} fetes, ${tracking.late} tard, ${tracking.missing} no fetes, ${tracking.exempt} exemptes, ${pending} sense registre. Base: ${tracking.total} tasques no exemptes (tot el grup).`
        : 'Sense seguiment de tasques registrat.',
      `Incidències registrades: ${incidents}. Punts vermells estimats: ${redPoints}.`,
    ].join('\n')
    return {
      studentId: student.id, courseLabel: courseLabel.trim() || classItem.name,
      lastLookGrade, competencyGrades, profile, qualitativeNotes: notes,
      diagnosisSnapshot: [], hasData,
    }
  })
}

export const ANTECEDENTS_EXPORT_APP_ID = 'avaluapro-student-antecedents'
const ANTECEDENTS_EXPORT_VERSION = 1

export function buildAntecedentsExport({ classItem, students, antecedents }) {
  const antecedentsByStudentId = new Map(antecedents.map((antecedent) => [antecedent.studentId, antecedent]))
  const rows = students
    .map((student) => {
      const antecedent = antecedentsByStudentId.get(student.id)
      if (!antecedent) return null
      return {
        studentName: student.name,
        antecedent: {
          courseLabel: antecedent.courseLabel || '',
          lastLookGrade: antecedent.lastLookGrade || '',
          competencyGrades: antecedent.competencyGrades || {},
          profile: antecedent.profile || '',
          qualitativeNotes: antecedent.qualitativeNotes || '',
          diagnosisSnapshot: antecedent.diagnosisSnapshot || [],
        },
      }
    })
    .filter(Boolean)

  return {
    app: ANTECEDENTS_EXPORT_APP_ID,
    version: ANTECEDENTS_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    className: classItem?.name || '',
    students: rows,
  }
}

