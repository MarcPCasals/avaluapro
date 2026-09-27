import {
  assertSafeAssistancePackage,
  validateSafeAssistancePackage,
} from './safeAssistancePackage.js'

export const MAX_SAFE_ASSISTANCE_PACKAGE_BYTES = 2 * 1024 * 1024

const SUPPORT_LABELS = Object.freeze({
  NONE: 'Cap suport',
  FICTIONAL_CASE_1: 'Cas fictici 1',
  FICTIONAL_CASE_2: 'Cas fictici 2',
  FICTIONAL_CASE_3: 'Cas fictici 3',
})

export class SafeAssistanceImportError extends Error {
  constructor(code) {
    super('El paquet segur no es pot carregar.')
    this.name = 'SafeAssistanceImportError'
    this.code = code
  }
}

function getTextSize(text) {
  return new TextEncoder().encode(text).byteLength
}

function syntheticDateFromIndex(index, stepDays = 1) {
  const date = new Date(Date.UTC(2032, 0, 1 + ((index - 1) * stepDays)))
  return date.toISOString().slice(0, 10)
}

function syntheticTimeFromSlot(slotIndex) {
  const hour = 7 + ((slotIndex - 1) % 12)
  return `${String(hour).padStart(2, '0')}:00`
}

function ensureImportablePackage(candidate) {
  const validation = validateSafeAssistancePackage(candidate)
  if (!validation.ok) throw new SafeAssistanceImportError('INVALID_PACKAGE')
  if (candidate.classes.length === 0) throw new SafeAssistanceImportError('EMPTY_PACKAGE')
  return validation
}

export function parseSafeAssistancePackageText(text) {
  if (typeof text !== 'string' || getTextSize(text) > MAX_SAFE_ASSISTANCE_PACKAGE_BYTES) {
    throw new SafeAssistanceImportError('FILE_SIZE')
  }

  let candidate
  try {
    candidate = JSON.parse(text)
  } catch {
    throw new SafeAssistanceImportError('INVALID_JSON')
  }

  const validation = ensureImportablePackage(candidate)
  return Object.freeze({
    package: structuredClone(candidate),
    summary: validation.summary,
  })
}

export function buildAssistanceDatasetFromSafePackage(candidate) {
  ensureImportablePackage(candidate)
  const safePackage = assertSafeAssistancePackage(candidate)

  return {
    metadata: {
      kind: 'synthetic',
      label: 'Paquet segur carregat',
      containsRealData: false,
      persistent: false,
      source: 'validated-safe-package',
    },
    classes: safePackage.classes,
    students: safePackage.students.map((student) => ({
      ...student,
      diagnoses: [],
      personalNotes: '',
      support: SUPPORT_LABELS[student.supportCase],
    })),
    evaluationCompetencies: safePackage.evaluationCompetencies,
    evaluationMarks: safePackage.evaluationMarks,
    trackingTasks: safePackage.trackingTasks.map((task) => ({
      ...task,
      date: syntheticDateFromIndex(task.periodIndex, 7),
    })),
    trackingRecords: safePackage.trackingRecords,
    absenceRecords: safePackage.absenceRecords.map((record) => {
      const date = syntheticDateFromIndex(record.dayIndex)
      const time = syntheticTimeFromSlot(record.slotIndex)
      return {
        ...record,
        date,
        time,
        recordedAt: `${date}T${time}:00Z`,
        slotKey: `${date}T${time.slice(0, 2)}`,
      }
    }),
    sociometricRelations: safePackage.sociometricRelations,
  }
}
