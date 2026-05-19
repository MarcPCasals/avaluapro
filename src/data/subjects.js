export const SUBJECT_AREAS = [
  {
    id: 'stem',
    name: 'Cientificotecnològica',
    subjects: ['Ciències Físiques i de la Natura'],
    defaultCompetencyCount: 3,
  },
  {
    id: 'shared',
    name: 'Compartides',
    subjects: ['Projecte Integrador', 'Tutoria'],
    defaultCompetencyCount: 0,
  },
]

export const SUBJECT_OPTIONS = SUBJECT_AREAS.flatMap((area) =>
  area.subjects.map((subject) => ({
    id: subject.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-'),
    name: subject,
    areaId: area.id,
    areaName: area.name,
    defaultCompetencyCount: area.defaultCompetencyCount,
  })),
)

export const SUBJECT_STRUCTURES = {
  'Ciències Físiques i de la Natura': [
    {
      name: 'C1: Modelització',
      color: 'orange',
      criteria: ['CA1: Rigor', 'CA2: Precisió'],
    },
    {
      name: 'C2: Indagació',
      color: 'green',
      criteria: ['CA1: Pertinència', 'CA2: Rigor'],
    },
    {
      name: 'C3: Argumentació',
      color: 'purple',
      criteria: ['CA1: Sentit crític', 'CA2: Coherència'],
    },
  ],
}

export function getSubjectOption(subjectName) {
  return SUBJECT_OPTIONS.find((subject) => subject.name === subjectName)
}

export function getSubjectStructure(subjectName) {
  return SUBJECT_STRUCTURES[subjectName] || null
}
