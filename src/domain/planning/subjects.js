/** La matèria i el grup defineixen conjuntament les franges disponibles. */
export function normalizePlanningSubject(value) {
  return String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('ca').replace(/\s+/g, ' ')
}

export function planningSubjectsMatch(left, right) {
  return normalizePlanningSubject(left) === normalizePlanningSubject(right)
}

export function getClassPlanningSubjects(slots = [], classId = '') {
  const subjects = new Map()
  for (const slot of slots) {
    if (slot.classId !== classId || !slot.subject?.trim()) continue
    subjects.set(normalizePlanningSubject(slot.subject), slot.subject.trim())
  }
  return [...subjects.values()].sort((a, b) => a.localeCompare(b, 'ca'))
}

export function resolvePlanningSubject({ application, planningUnit, classItem, subjects = [] }) {
  if (application?.subject) return application.subject
  if (planningUnit?.tutoringSpaceId) return subjects.find((subject) => planningSubjectsMatch(subject, 'Tutoria')) || 'Tutoria'
  if (classItem?.subject) {
    const match = subjects.find((subject) => planningSubjectsMatch(subject, classItem.subject))
    if (match || subjects.length === 0) return match || classItem.subject
  }
  return subjects.length === 1 ? subjects[0] : ''
}

export function sessionMatchesPlanningSubject(bundle, subject) {
  // Les classes manuals sense franja continuen disponibles. Les franges de
  // l'horari conserven la seva matèria encara que l'aplicació antiga no la tingui.
  const actualSubject = bundle.timetableSubject || bundle.session?.subject
  return !subject || !actualSubject || planningSubjectsMatch(actualSubject, subject)
}

export function getSchedulingSubject(setup) {
  if (!setup.application.subject && setup.subjects?.length > 1) {
    throw new Error('Selecciona la matèria de la calendarització abans de reorganitzar les sessions.')
  }
  return setup.application.subject || ''
}
