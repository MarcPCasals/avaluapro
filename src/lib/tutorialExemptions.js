export function getTutorialExemptSubjects(student) {
  return Array.isArray(student?.tutorialExemptSubjects)
    ? student.tutorialExemptSubjects.filter((subject) => typeof subject === 'string' && subject.trim())
    : []
}

export function toggleTutorialExemptSubject(subjects, subject) {
  const currentSubjects = Array.isArray(subjects) ? subjects : []
  if (!subject) return [...currentSubjects]
  return currentSubjects.includes(subject)
    ? currentSubjects.filter((item) => item !== subject)
    : [...currentSubjects, subject]
}

export function normalizeTutorialExemptSubjects(subjects, allowedSubjects) {
  const allowed = Array.isArray(allowedSubjects) ? new Set(allowedSubjects) : null
  return [...new Set(Array.isArray(subjects) ? subjects : [])]
    .filter((subject) => typeof subject === 'string' && subject.trim())
    .filter((subject) => !allowed || allowed.has(subject))
    .sort((a, b) => a.localeCompare(b, 'ca'))
}
