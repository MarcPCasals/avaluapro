export const LITERACY_DIAGNOSIS_IDS = ['dyslexia', 'dyscalculia', 'dysorthography']
export const ATTENTION_DIAGNOSIS_IDS = ['tda', 'tdah']

export const PROGRESS_REASON_OPTIONS = [
  { id: 'down-syndrome', label: 'Síndrome de Down', libraryId: 'down-syndrome' },
  { id: 'intellectual-disability', label: 'Discapacitat intel·lectual' },
  { id: 'tea', label: 'Trastorn de l’espectre autista (TEA)', libraryId: 'tea' },
  { id: 'neurological-genetic', label: 'Trastorn neurològic o genètic' },
  { id: 'motor-disability', label: 'Discapacitat motriu' },
  { id: 'other', label: 'Altres necessitats de suport' },
]

export const DIAGNOSIS_OPTIONS = [
  {
    id: 'dyslexia',
    label: 'Dislèxia',
    color: 'blue',
  },
  {
    id: 'dyscalculia',
    label: 'Discalcúlia',
    color: 'blue',
  },
  {
    id: 'dysorthography',
    label: 'Disortografia',
    color: 'blue',
  },
  {
    id: 'tda',
    label: 'TDA',
    color: 'green',
  },
  {
    id: 'tdah',
    label: 'TDAH',
    color: 'green',
  },
  {
    id: 'tea',
    label: 'TEA',
    color: 'yellow',
  },
  {
    id: 'qi-limit',
    label: 'QI límit',
    color: 'red',
  },
  {
    id: 'tdl',
    label: 'TDL',
    color: 'red',
  },
  {
    id: 'qi-tdl',
    label: 'QI límit / TDL · pendent de concretar',
    color: 'red',
    legacy: true,
  },
  {
    id: 'progress',
    label: 'Alumne de progrés',
    color: 'purple',
  },
  {
    id: 'high-capacity',
    label: 'AACC',
    color: 'orange',
  },
]

export function cycleAttentionDiagnosis(diagnoses = []) {
  const withoutAttention = diagnoses.filter((id) => !ATTENTION_DIAGNOSIS_IDS.includes(id))
  if (diagnoses.includes('tda')) return [...withoutAttention, 'tdah']
  if (diagnoses.includes('tdah')) return withoutAttention
  return [...withoutAttention, 'tda']
}

export function replaceDiagnosisGroup(diagnoses = [], groupIds = [], selectedIds = []) {
  const nextDiagnoses = diagnoses.filter((id) => !groupIds.includes(id))
  return [...new Set([...nextDiagnoses, ...selectedIds.filter((id) => groupIds.includes(id))])]
}

export function resolveProgressReason(reasonId = '') {
  return PROGRESS_REASON_OPTIONS.find((option) => option.id === reasonId) || null
}

export function getDiagnosisLabels(diagnoses = [], progressReasonId = '') {
  const progressReason = resolveProgressReason(progressReasonId)
  return DIAGNOSIS_OPTIONS.filter((option) => diagnoses.includes(option.id)).map((option) =>
    option.id === 'progress' && progressReason ? `${option.label} · ${progressReason.label}` : option.label,
  )
}

export function getDominantDiagnosis(diagnoses = []) {
  return [...DIAGNOSIS_OPTIONS].reverse().find((option) => diagnoses.includes(option.id)) || null
}
