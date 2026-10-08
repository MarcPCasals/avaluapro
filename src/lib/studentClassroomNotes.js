/** Historial de la font original; no inclou registres d'altres pantalles o grups. */
export function getStudentClassroomNotes(events = [], studentId, classId) {
  return events
    .filter((event) => event.studentId === studentId && event.classId === classId
      && event.source === 'classroom' && event.sessionId
      && (event.type === 'positive' || event.type === 'incident'))
    .sort((a, b) => String(b.createdAt || b.date || '').localeCompare(String(a.createdAt || a.date || '')))
}

export function formatClassroomNoteDate(event) {
  const [year, month, day] = String(event.date || event.createdAt || '').slice(0, 10).split('-')
  return year && month && day ? `${day}/${month}/${year}` : 'Sense data'
}
