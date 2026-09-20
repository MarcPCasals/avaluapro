import { areCloudDocumentsEqual } from './cloudSyncDiff.js'

const UPDATED_AT_FIELDS = [
  'updatedAt',
  'completedAt',
  'capturedAt',
  'importedAt',
  'createdAt',
]

function asMillis(value) {
  if (!value) return 0
  if (typeof value?.toDate === 'function') return value.toDate().getTime()
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function getRowUpdatedAt(row = {}) {
  return UPDATED_AT_FIELDS.reduce((latest, field) => Math.max(latest, asMillis(row[field])), 0)
}

export const CLOUD_COLLECTION_LABELS = {
  classes: 'classes',
  students: 'alumnes',
  semesters: 'semestres',
  uts: 'UTs',
  competencies: 'competències',
  criteria: 'criteris',
  indicators: 'indicadors',
  marks: 'notes',
  tasks: 'tasques',
  taskRecords: 'registres de tasques',
  absenceRecords: 'absències',
  behaviorEvents: 'comportament',
  agendaNotes: 'anotacions i recordatoris',
  tutorialRecords: 'registres de tutoria',
  tutorialMarks: 'notes de tutoria',
  tutorialRelations: 'relacions tutorials',
  tutorialGroupSets: 'versions de grups',
  tutorialSociometricMoments: 'moments sociomètrics',
  tutorialSociogramLayouts: 'mapes de sociograma',
  tutorialStudentRoles: 'rols de l’alumnat',
  tutorialSeatingPlans: 'plànols de classe',
  seatingCharts: 'llocs fixos',
  studentAntecedents: 'antecedents acadèmics',
  sociometricSurveys: 'qüestionaris sociomètrics',
}

/**
 * Compara l'estat local amb Firebase sense modificar cap dels dos costats.
 * Només recomana una versió quan tots els documents modificats amb data
 * apunten en la mateixa direcció i no hi ha altes o baixes ambigües.
 */
export function compareCloudConflictDatasets(localDataset = {}, cloudDataset = {}, collections = []) {
  const rows = collections.map((collection) => {
    const localRows = localDataset[collection] || []
    const cloudRows = cloudDataset[collection] || []
    const localById = new Map(localRows.map((row) => [row.id, row]))
    const cloudById = new Map(cloudRows.map((row) => [row.id, row]))
    let localOnly = 0
    let cloudOnly = 0
    let localNewer = 0
    let cloudNewer = 0
    let uncertain = 0
    const examples = []

    localById.forEach((localRow, id) => {
      const cloudRow = cloudById.get(id)
      if (!cloudRow) {
        localOnly += 1
        if (examples.length < 3) examples.push({ id, label: localRow.name || localRow.title || id, fields: ['només aquí'] })
        return
      }
      if (areCloudDocumentsEqual(localRow, cloudRow)) return
      if (examples.length < 3) {
        const fields = [...new Set([...Object.keys(localRow), ...Object.keys(cloudRow)])]
          .filter((field) => !areCloudDocumentsEqual(localRow[field], cloudRow[field]))
        examples.push({ id, label: localRow.name || localRow.title || cloudRow.name || cloudRow.title || id, fields })
      }
      const localUpdatedAt = getRowUpdatedAt(localRow)
      const cloudUpdatedAt = getRowUpdatedAt(cloudRow)
      if (!localUpdatedAt || !cloudUpdatedAt || localUpdatedAt === cloudUpdatedAt) uncertain += 1
      else if (localUpdatedAt > cloudUpdatedAt) localNewer += 1
      else cloudNewer += 1
    })

    cloudById.forEach((_cloudRow, id) => {
      if (!localById.has(id)) {
        cloudOnly += 1
        if (examples.length < 3) {
          const cloudRow = cloudById.get(id)
          examples.push({ id, label: cloudRow.name || cloudRow.title || id, fields: ['només a Firebase'] })
        }
      }
    })

    return {
      cloudCount: cloudRows.length,
      cloudNewer,
      cloudOnly,
      collection,
      label: CLOUD_COLLECTION_LABELS[collection] || collection,
      localCount: localRows.length,
      localNewer,
      localOnly,
      uncertain,
      differenceCount: localOnly + cloudOnly + localNewer + cloudNewer + uncertain,
      examples,
    }
  }).filter((row) => row.differenceCount > 0)

  const totals = rows.reduce((summary, row) => ({
    cloudNewer: summary.cloudNewer + row.cloudNewer,
    cloudOnly: summary.cloudOnly + row.cloudOnly,
    localNewer: summary.localNewer + row.localNewer,
    localOnly: summary.localOnly + row.localOnly,
    uncertain: summary.uncertain + row.uncertain,
  }), { cloudNewer: 0, cloudOnly: 0, localNewer: 0, localOnly: 0, uncertain: 0 })

  const hasAmbiguousRows = totals.localOnly > 0 || totals.cloudOnly > 0 || totals.uncertain > 0
  const recommendation = rows.length === 0
    ? 'equal'
    : !hasAmbiguousRows && totals.localNewer > 0 && totals.cloudNewer === 0
      ? 'local'
      : !hasAmbiguousRows && totals.cloudNewer > 0 && totals.localNewer === 0
        ? 'cloud'
        : 'review'

  return { recommendation, rows, totals }
}
