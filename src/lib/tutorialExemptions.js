import { canonicalizeSubjectName } from '../data/subjects.js'

export function getTutorialExemptSubjects(student) {
  return normalizeTutorialExemptSubjects(student?.tutorialExemptSubjects)
}

export function toggleTutorialExemptSubject(subjects, subject) {
  const currentSubjects = normalizeTutorialExemptSubjects(subjects)
  const canonicalSubject = canonicalizeSubjectName(subject)
  if (!canonicalSubject) return currentSubjects
  return currentSubjects.includes(canonicalSubject)
    ? currentSubjects.filter((item) => item !== canonicalSubject)
    : [...currentSubjects, canonicalSubject]
}

export function normalizeTutorialExemptSubjects(subjects, allowedSubjects) {
  const allowed = Array.isArray(allowedSubjects)
    ? new Set(allowedSubjects.map(canonicalizeSubjectName))
    : null
  return [...new Set((Array.isArray(subjects) ? subjects : []).map(canonicalizeSubjectName))]
    .filter(Boolean)
    .filter((subject) => !allowed || allowed.has(subject))
    .sort((a, b) => a.localeCompare(b, 'ca'))
}

export function isStudentExemptFromSubject(student, subject) {
  const canonicalSubject = canonicalizeSubjectName(subject)
  return Boolean(canonicalSubject && getTutorialExemptSubjects(student).includes(canonicalSubject))
}
