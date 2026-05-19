import { COLLECTIONS } from '../data/seedData'

const IMPORTANT_COLLECTIONS = [
  ['classes', 'classes'],
  ['students', 'alumnes'],
  ['uts', 'UTs'],
  ['competencies', 'competències'],
  ['criteria', 'criteris'],
  ['marks', 'notes'],
  ['tasks', 'tasques'],
  ['taskRecords', 'registres de tasques'],
  ['behaviorEvents', 'comportament'],
  ['agendaNotes', 'anotacions'],
  ['seatingCharts', 'llocs fixos'],
]

function getCollectionsFromBackup(backup) {
  return backup?.collections || backup?.dataset || backup || {}
}

export function summarizeBackup(backup) {
  const collections = getCollectionsFromBackup(backup)
  const counts = COLLECTIONS.reduce(
    (summary, collection) => ({
      ...summary,
      [collection]: Array.isArray(collections[collection]) ? collections[collection].length : 0,
    }),
    {},
  )

  const subjectSummary = Array.isArray(collections.classes)
    ? collections.classes.reduce((summary, classItem) => {
        const subject = classItem.subject || 'Sense matèria'
        return { ...summary, [subject]: (summary[subject] || 0) + 1 }
      }, {})
    : {}

  const cfnClassIds = new Set(
    (collections.classes || [])
      .filter((classItem) => classItem.subject === 'Ciències Físiques i de la Natura')
      .map((classItem) => classItem.id),
  )
  const cfnUnexpectedCompetencies = (collections.competencies || []).filter(
    (competency) =>
      cfnClassIds.has(competency.classId) &&
      !['C1: Modelització', 'C2: Indagació', 'C3: Argumentació'].includes(competency.name),
  )

  const warnings = [
    counts.classes === 0 ? 'No hi ha cap classe al backup.' : '',
    counts.students === 0 ? 'No hi ha alumnes al backup.' : '',
    cfnUnexpectedCompetencies.length > 0
      ? `Hi ha ${cfnUnexpectedCompetencies.length} competències no CFN dins de classes de Ciències.`
      : '',
    counts.tasks > 0 && counts.taskRecords === 0 ? 'Hi ha tasques però no hi ha registres d’alumnes.' : '',
  ].filter(Boolean)

  return {
    counts,
    subjectSummary,
    warnings,
    rows: IMPORTANT_COLLECTIONS.map(([collection, label]) => ({
      collection,
      label,
      count: counts[collection] || 0,
    })),
  }
}

export function buildBackupStatusMessage(backup, filename = '') {
  const summary = summarizeBackup(backup)
  const main = [
    filename ? `Fitxer: ${filename}` : '',
    `${summary.counts.classes} classes`,
    `${summary.counts.students} alumnes`,
    `${summary.counts.marks} notes`,
    `${summary.counts.tasks} tasques`,
    `${summary.counts.taskRecords} registres de seguiment`,
  ].filter(Boolean)

  if (summary.warnings.length === 0) return `${main.join(' · ')}.`
  return `${main.join(' · ')}. Avisos: ${summary.warnings.join(' ')}`
}
