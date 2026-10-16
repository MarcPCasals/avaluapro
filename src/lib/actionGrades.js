// NA is the lowest explicit level. Empty actions are pending, never a failing grade.
export const ACTION_GRADE_LEVELS = ['A', 'B', 'C', 'D', 'NA']

export function isActionGradedMark(mark) {
  return Boolean(mark && (mark.gradingMode === 'actions' || !mark.gradingMode && mark.actionGrades != null))
}

export function getActionGrade(mark, actionId) {
  const grade = mark?.actionGrades?.[actionId]
  return ACTION_GRADE_LEVELS.includes(grade) ? grade : ''
}

export function getLowestActionGrade(values) {
  const grades = values.filter(grade => ACTION_GRADE_LEVELS.includes(grade))
  return grades.length ? ACTION_GRADE_LEVELS[Math.max(...grades.map(grade => ACTION_GRADE_LEVELS.indexOf(grade)))] : ''
}

export function getActionGradeSummary(criterion, mark) {
  const ids = [...new Set(criterion?.selectedActionIds || [])]
  const grades = ids.map(id => getActionGrade(mark, id)).filter(Boolean)
  return { value: getLowestActionGrade(grades), evaluated: grades.length, total: ids.length,
    pending: ids.length - grades.length, provisional: grades.length > 0 && grades.length < ids.length }
}

export function buildActionGradeMark({ existing, criterion, studentId, grades, createId }) {
  const selected = new Set(criterion?.selectedActionIds || [])
  if (!selected.size) throw new Error('Selecciona primer les accions que s’avaluen en aquest criteri.')
  for (const [id, grade] of Object.entries(grades)) {
    if (!selected.has(id)) throw new Error('Aquesta acció no està seleccionada en aquesta UT. Torna a obrir el criteri.')
    if (grade !== '' && !ACTION_GRADE_LEVELS.includes(grade)) throw new Error('La nota de l’acció no és vàlida.')
  }
  const mark = { ...existing, id: existing?.id || createId('mark'), studentId, criterionId: criterion.id,
    gradingMode: 'actions', actionGrades: { ...existing?.actionGrades, ...grades } }
  return { ...mark, value: getActionGradeSummary(criterion, mark).value }
}

export function recalculateActionCriteria(marks, criteria) {
  const byId = new Map(criteria.map(criterion => [criterion.id, criterion]))
  let changed = false
  const next = marks.map(mark => {
    const criterion = byId.get(mark.criterionId)
    if (!criterion) return mark
    if (!isActionGradedMark(mark) && !(criterion.selectedActionIds?.length && mark.actionGrades)) return mark
    const value = getActionGradeSummary(criterion, mark).value
    if (mark.value === value && mark.gradingMode === 'actions') return mark
    changed = true
    return { ...mark, value, gradingMode: 'actions' }
  })
  return changed ? next : marks
}
