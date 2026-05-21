const languageStructure = [
  {
    name: 'C1: Comprendre discursos orals multimodals',
    color: 'blue',
    criteria: ['CA1: Pertinència', 'CA2: Sentit crític'],
  },
  {
    name: 'C2: Produir discursos orals multimodals',
    color: 'green',
    criteria: ['CA1: Adequació', 'CA2: Coherència', 'CA3: Cohesió', 'CA4: Correcció'],
  },
  {
    name: 'C3: Comprendre discursos escrits multimodals',
    color: 'purple',
    criteria: ['CA1: Pertinència', 'CA2: Sentit crític'],
  },
  {
    name: 'C4: Produir discursos escrits multimodals',
    color: 'orange',
    criteria: ['CA1: Adequació', 'CA2: Coherència', 'CA3: Cohesió', 'CA4: Correcció'],
  },
]

const transversalStructure = [
  {
    name: 'TRANS C1: Emprendre projectes per millorar l’entorn',
    color: 'orange',
    criteria: ['CA1: Proactivitat', 'CA2: Creativitat', 'CA3: Sentit crític'],
  },
  {
    name: "TRANS C2: Gestionar el propi aprenentatge considerant l'entorn i els recursos disponibles",
    color: 'blue',
    criteria: ['CA1: Sentit crític', 'CA2: Adequació'],
  },
  {
    name: 'TRANS C3: Establir relacions positives amb un mateix i amb els altres',
    color: 'purple',
    criteria: ['CA1: Adequació', 'CA2: Proactivitat'],
  },
  {
    name: 'TRANS C4: Comunicar-se a través de diversos llenguatges atenent al context i la intenció comunicativa',
    color: 'green',
    criteria: ['CA1: Adequació', 'CA2: Coherència', 'CA3: Sentit crític'],
  },
]

export const SUBJECT_AREAS = [
  {
    id: 'languages',
    name: 'Llengües',
    subjects: ['Català', 'Castellà', 'Anglès', 'Francès'],
    defaultCompetencyCount: 4,
  },
  {
    id: 'stem',
    name: 'Cientificotecnològica',
    subjects: ['Ciències Físiques i de la Natura', 'Matemàtiques', 'Tecnologia'],
    defaultCompetencyCount: 3,
  },
  {
    id: 'social',
    name: 'Ciències humanes i socials',
    subjects: ['Ciències Humanes i Socials'],
    defaultCompetencyCount: 3,
  },
  {
    id: 'arts',
    name: 'Artística',
    subjects: ['Visual i Plàstica', 'Educació musical', 'Música'],
    defaultCompetencyCount: 2,
  },
  {
    id: 'physical',
    name: 'Educació física',
    subjects: ['Educació Física'],
    defaultCompetencyCount: 2,
  },
  {
    id: 'interdisciplinary',
    name: 'Interdisciplinàries',
    subjects: ['Projecte Integrador', 'Situació Global'],
    defaultCompetencyCount: 4,
  },
  {
    id: 'tutorial',
    name: 'Tutoria',
    subjects: ['Tutoria'],
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
  Català: languageStructure,
  Castellà: languageStructure,
  Anglès: languageStructure,
  Francès: languageStructure,
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
  'Ciències Humanes i Socials': [
    {
      name: "C1: Valorar l'ús del territori",
      color: 'orange',
      criteria: ['CA1: Rigor', 'CA2: Sentit crític'],
    },
    {
      name: 'C2: Construir relats històrics fonamentats',
      color: 'green',
      criteria: ['CA1: Precisió', 'CA2: Rigor', 'CA3: Sentit crític'],
    },
    {
      name: 'C3: Valorar qüestions socials',
      color: 'purple',
      criteria: ['CA1: Rigor', 'CA2: Sentit crític'],
    },
  ],
  'Educació Física': [
    {
      name: 'C1: Actuar en situacions psicomotrius',
      color: 'orange',
      criteria: ['CA1: Efectivitat', 'CA2: Rigor', 'CA3: Pertinència'],
    },
    {
      name: 'C2: Interactuar en situacions sociomotrius',
      color: 'green',
      criteria: ['CA1: Efectivitat', 'CA2: Rigor', 'CA3: Pertinència'],
    },
  ],
  Matemàtiques: [
    {
      name: 'C1: Resoldre problemes de matemàtiques',
      color: 'orange',
      criteria: ['CA1: Coherència', 'CA2: Pertinència', 'CA3: Sentit crític'],
    },
    {
      name: 'C2: Modelitzar matemàticament situacions reals',
      color: 'green',
      criteria: ['CA1: Adequació', 'CA2: Precisió', 'CA3: Sentit crític'],
    },
    {
      name: 'C3: Aplicar el raonament matemàtic per conjecturar i per demostrar',
      color: 'purple',
      criteria: ['CA1: Coherència', 'CA2: Efectivitat', 'CA3: Sentit crític'],
    },
    {
      name: 'C4: Comunicar recursos, processos i resultats matemàtics',
      color: 'blue',
      criteria: ['CA1: Pertinència', 'CA2: Claredat'],
    },
  ],
  'Educació musical': [
    {
      name: 'C1: Crear peces musicals d’estructura simple que combinin diversos elements',
      color: 'orange',
      criteria: ['CA1: Coherència', 'CA2: Efectivitat', 'CA3: Adequació'],
    },
    {
      name: 'C2: Interpretar composicions musicals senzilles amb els instruments, la veu o el cos',
      color: 'green',
      criteria: ['CA1: Fidelitat', 'CA2: Efectivitat', 'CA3: Singularitat'],
    },
    {
      name: 'C3: Analitzar peces musicals i l’entorn sonor en relació amb les seves característiques, repercussions i usos socials',
      color: 'purple',
      criteria: ['CA1: Precisió', 'CA2: Pertinència', 'CA3: Sentit crític'],
    },
  ],
  Música: [
    {
      name: 'C1: Crear peces musicals d’estructura simple que combinin diversos elements',
      color: 'orange',
      criteria: ['CA1: Coherència', 'CA2: Efectivitat', 'CA3: Adequació'],
    },
    {
      name: 'C2: Interpretar composicions musicals senzilles amb els instruments, la veu o el cos',
      color: 'green',
      criteria: ['CA1: Fidelitat', 'CA2: Efectivitat', 'CA3: Singularitat'],
    },
    {
      name: 'C3: Analitzar peces musicals i l’entorn sonor en relació amb les seves característiques, repercussions i usos socials',
      color: 'purple',
      criteria: ['CA1: Precisió', 'CA2: Pertinència', 'CA3: Sentit crític'],
    },
  ],
  Tecnologia: [
    {
      name: 'C1: Dissenyar solucions creatives i tecnològiques',
      color: 'orange',
      criteria: ['CA1: Pertinència', 'CA2: Rigor'],
    },
    {
      name: 'C2: Construir solucions tecnològiques',
      color: 'green',
      criteria: ['CA1: Pertinència', 'CA2: Meticulositat'],
    },
  ],
  'Visual i Plàstica': [
    {
      name: 'C1: Interpretar manifestacions visuals i plàstiques de manera crítica',
      color: 'purple',
      criteria: ['CA1: Precisió', 'CA2: Pertinència', 'CA3: Sentit crític'],
    },
    {
      name: 'C2: Expressar-se a través de manifestacions',
      color: 'orange',
      criteria: ['CA1: Creativitat', 'CA2: Adequació', 'CA3: Coherència'],
    },
  ],
  'Projecte Integrador': transversalStructure,
  'Situació Global': transversalStructure,
}

export function getSubjectOption(subjectName) {
  return SUBJECT_OPTIONS.find((subject) => subject.name === subjectName)
}

export function getSubjectStructure(subjectName) {
  return SUBJECT_STRUCTURES[subjectName] || null
}
