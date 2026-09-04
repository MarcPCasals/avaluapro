function normalizeName(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
}

export function matchAntecedentStudents(rows, students) {
  return rows.map((row) => {
    const name = normalizeName(row.studentName)
    const matches = name ? students.filter((student) => normalizeName(student.name) === name) : []
    return {
      ...row,
      skipped: false,
      studentId: matches.length === 1 ? matches[0].id : '',
      matchReason: matches.length > 1 ? 'Hi ha més d’un alumne amb aquest nom.'
        : matches.length === 0 ? 'No s’ha trobat cap coincidència pel nom.' : '',
    }
  })
}

export function getAntecedentsToImport(rows) {
  return rows.filter((row) => !row.skipped)
}

export function validateAntecedentAssignments(rows, students) {
  const studentIds = new Set(students.map((student) => student.id))
  const used = new Set()
  for (const row of getAntecedentsToImport(rows)) {
    if (!studentIds.has(row.studentId)) return 'Assigna un alumne actual o tria «No importar aquest alumne» per a cada antecedent pendent.'
    if (used.has(row.studentId)) return 'Hi ha diversos antecedents assignats al mateix alumne. Revisa les assignacions.'
    used.add(row.studentId)
  }
  return rows.length ? '' : 'El fitxer no conté antecedents per importar.'
}
