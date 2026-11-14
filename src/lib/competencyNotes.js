export function shouldShowCompetencyNote(grade, hasSavedNote) {
  return grade === 'D' || (!grade && hasSavedNote)
}
