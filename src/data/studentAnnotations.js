export const DIAGNOSIS_OPTIONS = [
  {
    id: 'dyslexia',
    label: 'Dislèxia / Discalcúlia',
    color: 'blue',
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
    id: 'qi-tdl',
    label: 'QI límit o TDL',
    color: 'red',
  },
  {
    id: 'progress',
    label: 'Alumne de progrés',
    color: 'purple',
  },
]

export function getDominantDiagnosis(diagnoses = []) {
  return [...DIAGNOSIS_OPTIONS].reverse().find((option) => diagnoses.includes(option.id)) || null
}
