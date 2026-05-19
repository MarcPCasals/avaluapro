import fs from 'node:fs'
import path from 'node:path'

const [, , INPUT, OUTPUT] = process.argv

if (!INPUT) {
  console.error('Ús: node scripts/clean-cfn-backup.mjs <backup-v2.json> [sortida.json]')
  process.exit(1)
}

const outputPath =
  OUTPUT ||
  path.join(path.dirname(INPUT), `${path.basename(INPUT, '.json')}_CFN-net.json`)

const CFN_SUBJECT = 'Ciències Físiques i de la Natura'

const CFN_COMPETENCIES = [
  { key: 'c1', name: 'C1: Modelització', color: 'orange', match: ['c1modelitzacio', 'c1modelizacion'] },
  { key: 'c2', name: 'C2: Indagació', color: 'green', match: ['c2indagacio', 'c2investigacio', 'c2investigacion'] },
  { key: 'c3', name: 'C3: Argumentació', color: 'purple', match: ['c3argumentacio', 'c3argumentacion'] },
]

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .replaceAll(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
}

function getCfnTemplate(competencyName) {
  const normalizedName = normalizeText(competencyName)
  return CFN_COMPETENCIES.find((competency) =>
    competency.match.some((candidate) => normalizedName.includes(candidate)),
  )
}

function isCfnClass(classItem) {
  const subject = normalizeText(classItem.subject)
  const name = normalizeText(classItem.name)

  if (subject === normalizeText(CFN_SUBJECT)) return true
  if (name.startsWith('pi') || name.includes('projecteintegrador')) return false

  return /^(1r|2n|3r|4t)[a-z]?$/.test(name)
}

function isCanonicalUt(utName) {
  return /^ut[1-4]$/.test(normalizeText(utName))
}

const backup = JSON.parse(fs.readFileSync(INPUT, 'utf8'))
const collections = backup.collections || backup.dataset || backup

const cfnClassIds = new Set(
  collections.classes
    .filter((classItem) => isCfnClass(classItem))
    .map((classItem) => classItem.id),
)

const removedUtIds = new Set()
const removedCompetencyIds = new Set()
const renamedCompetencies = []
const removedCompetencies = []

collections.uts = collections.uts.filter((ut) => {
  if (!cfnClassIds.has(ut.classId)) return true
  if (isCanonicalUt(ut.name)) return true

  removedUtIds.add(ut.id)
  return false
})

collections.competencies = collections.competencies.filter((competency) => {
  if (!cfnClassIds.has(competency.classId)) return true

  if (removedUtIds.has(competency.utId)) {
    removedCompetencyIds.add(competency.id)
    removedCompetencies.push({
      id: competency.id,
      name: competency.name,
      classId: competency.classId,
      utId: competency.utId,
      reason: 'UT no canònica',
    })
    return false
  }

  const template = getCfnTemplate(competency.name)
  if (!template) {
    removedCompetencyIds.add(competency.id)
    removedCompetencies.push({
      id: competency.id,
      name: competency.name,
      classId: competency.classId,
      utId: competency.utId,
      reason: 'Competència no CFN',
    })
    return false
  }

  if (competency.name !== template.name || competency.color !== template.color) {
    renamedCompetencies.push({
      id: competency.id,
      from: competency.name,
      to: template.name,
      fromColor: competency.color,
      toColor: template.color,
    })
  }

  competency.name = template.name
  competency.color = template.color
  competency.order = Number(template.key.slice(1))
  competency.source = competency.source || 'V1 normalitzat'
  return true
})

const removedCriterionIds = new Set(
  collections.criteria
    .filter((criterion) => removedCompetencyIds.has(criterion.competencyId))
    .map((criterion) => criterion.id),
)
const removedMarkCount = collections.marks.filter((mark) => removedCriterionIds.has(mark.criterionId)).length
const removedTaskIds = new Set(
  collections.tasks
    .filter((task) => removedUtIds.has(task.utId))
    .map((task) => task.id),
)
const removedTaskRecordCount = collections.taskRecords.filter((record) => removedTaskIds.has(record.taskId)).length

collections.criteria = collections.criteria.filter((criterion) => !removedCompetencyIds.has(criterion.competencyId))
collections.indicators = collections.indicators.filter((indicator) => !removedCriterionIds.has(indicator.criterionId))
collections.marks = collections.marks.filter((mark) => !removedCriterionIds.has(mark.criterionId))
collections.tasks = collections.tasks.filter((task) => !removedTaskIds.has(task.id))
collections.taskRecords = collections.taskRecords.filter((record) => !removedTaskIds.has(record.taskId))

backup.exportedAt = new Date().toISOString()
backup.migration = {
  ...(backup.migration || {}),
  cfnCleanup: {
    cleanedAt: new Date().toISOString(),
    cfnClasses: cfnClassIds.size,
    removedUts: removedUtIds.size,
    removedCompetencies: removedCompetencies.length,
    renamedCompetencies: renamedCompetencies.length,
    removedTasks: removedTaskIds.size,
    removedTaskRecords: removedTaskRecordCount,
    keptCompetencyNames: CFN_COMPETENCIES.map((competency) => competency.name),
  },
}

fs.writeFileSync(outputPath, JSON.stringify(backup, null, 2))

console.log(
  JSON.stringify(
    {
      output: outputPath,
      removedUts: removedUtIds.size,
      removedCompetencies: removedCompetencies.length,
      renamedCompetencies: renamedCompetencies.length,
      removedCriteria: removedCriterionIds.size,
      removedMarks: removedMarkCount,
      removedTasks: removedTaskIds.size,
      removedTaskRecords: removedTaskRecordCount,
      cfnClasses: cfnClassIds.size,
    },
    null,
    2,
  ),
)
