export function getNextGradingTarget(students, competencies, studentId, criterionId) {
  const targets = competencies.flatMap(competency =>
    competency.criteria.map(criterion => ({ competency, criterion })))
  const criterionIndex = targets.findIndex(target => target.criterion.id === criterionId)
  const studentIndex = students.findIndex(student => student.id === studentId)
  if (criterionIndex < 0 || studentIndex < 0) return null

  const nextCriterion = targets[criterionIndex + 1]
  if (nextCriterion) return { student: students[studentIndex], ...nextCriterion, label: 'Criteri següent' }

  const nextStudent = students[studentIndex + 1]
  return nextStudent && targets[0]
    ? { student: nextStudent, ...targets[0], label: 'Alumne següent' }
    : null
}
