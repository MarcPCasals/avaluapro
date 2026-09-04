import { calculateGrade, getNumericFromGrade } from './grades.js'

export function getClassUts(state, classId) {
  return state.uts
    .filter((ut) => ut.classId === classId)
    .sort((a, b) => {
      const semesterA = state.semesters.find((semester) => semester.id === a.semesterId)?.order || 0
      const semesterB = state.semesters.find((semester) => semester.id === b.semesterId)?.order || 0
      if (semesterA !== semesterB) return semesterA - semesterB
      return a.order - b.order
    })
}

export function getUtCompetencies(state, utId) {
  return state.competencies
    .filter((competency) => competency.utId === utId && !competency.inactive)
    .sort((a, b) => a.order - b.order)
    .map((competency) => ({
      ...competency,
      criteria: state.criteria
        .filter((criterion) => criterion.competencyId === competency.id)
        .sort((a, b) => a.order - b.order),
    }))
}

export function getStudentUtGrade(state, studentId, utId) {
  const grades = getUtCompetencies(state, utId)
    .map((competency) => getStudentCompetencyGrade(state, studentId, competency))
    .filter(Boolean)
  const scores = grades.map(getNumericFromGrade).filter((score) => score > 0)
  const averageScore =
    scores.length === 0 ? 0 : Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2))

  return { grade: getGradeFromAverage(averageScore), score: averageScore }
}

export function getStudentCompetencyGrade(state, studentId, competency) {
  const marks = competency.criteria
    .map((criterion) =>
      state.marks.find((mark) => mark.studentId === studentId && mark.criterionId === criterion.id)?.value,
    )
    .filter(Boolean)

  return calculateGrade(marks)
}

export function getLatestStudentLook(state, studentId, uts) {
  const validScores = uts
    .map((ut) => ({ ut, ...getStudentUtGrade(state, studentId, ut.id) }))
    .filter((item) => item.score > 0)

  return validScores.at(-1) || { grade: '', score: 0, ut: null }
}

export function getGradeFromAverage(score) {
  if (!score) return ''
  if (score >= 3.5) return 'A'
  if (score >= 2.5) return 'B'
  if (score >= 1.5) return 'C'
  return 'D'
}

