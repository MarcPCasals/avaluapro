export function getNextGradingTarget(students, competencies, studentId, criterionId) {
  const competency = competencies.find(item => item.criteria.some(criterion => criterion.id === criterionId))
  const criterionIndex = competency?.criteria.findIndex(criterion => criterion.id === criterionId) ?? -1
  const studentIndex = students.findIndex(student => student.id === studentId)
  if (criterionIndex < 0 || studentIndex < 0) return null

  const nextCriterion = competency.criteria[criterionIndex + 1]
  if (nextCriterion) return { student: students[studentIndex], competency, criterion: nextCriterion, label: 'Criteri següent' }

  const nextStudent = students[studentIndex + 1]
  return nextStudent && competency.criteria[0]
    ? { student: nextStudent, competency, criterion: competency.criteria[0], label: 'Alumne següent' }
    : null
}
