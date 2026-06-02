export const COLLECTIONS = [
  'classes',
  'students',
  'semesters',
  'uts',
  'competencies',
  'criteria',
  'indicators',
  'marks',
  'tasks',
  'taskRecords',
  'behaviorEvents',
  'agendaNotes',
  'tutorialRecords',
  'tutorialMarks',
  'tutorialRelations',
  'tutorialGroupSets',
  'tutorialSociogramLayouts',
  'tutorialStudentRoles',
  'tutorialSeatingPlans',
  'seatingCharts',
  'studentAntecedents',
]

export const EMPTY_DATASET = COLLECTIONS.reduce(
  (dataset, collection) => ({ ...dataset, [collection]: [] }),
  {},
)

const DEMO_CLASS_ID = 'class_2b'
const DEMO_SUBJECT = 'Ciències Físiques i de la Natura'

const demoStudents = [
  {
    id: 'student_1',
    classId: DEMO_CLASS_ID,
    name: 'PUJOL FONT, Marta',
    halfGroup: 'Grup A',
    diagnoses: ['progress'],
    personalNotes: 'Perfil molt autònom. Pot fer de referent quan el grup treballa per rols.',
  },
  {
    id: 'student_2',
    classId: DEMO_CLASS_ID,
    name: 'RIBA SALA, Marc',
    halfGroup: 'Grup B',
    diagnoses: ['tdah'],
    personalNotes: 'Li ajuda tenir passos curts i comprovacions visibles abans de tancar la tasca.',
  },
  {
    id: 'student_3',
    classId: DEMO_CLASS_ID,
    name: 'VIDAL TORRES, Laia',
    halfGroup: 'Grup A',
    diagnoses: ['dyslexia'],
    personalNotes: 'Treballa amb constància, però necessita suport per transformar idees en explicacions precises.',
  },
  {
    id: 'student_4',
    classId: DEMO_CLASS_ID,
    name: 'FERRER COSTA, Nil',
    halfGroup: 'Grup B',
    diagnoses: ['qi-tdl'],
    legacyTrackingPenaltyCount: 1,
  },
  { id: 'student_5', classId: DEMO_CLASS_ID, name: 'ROCA SERRA, Júlia', halfGroup: 'Grup A' },
  { id: 'student_6', classId: DEMO_CLASS_ID, name: 'MARTÍ VILA, Arnau', halfGroup: 'Grup B' },
  { id: 'student_7', classId: DEMO_CLASS_ID, name: 'SOLA PRAT, Ona', halfGroup: 'Grup A', diagnoses: ['tea'] },
  { id: 'student_8', classId: DEMO_CLASS_ID, name: 'COSTA BATLLE, Biel', halfGroup: 'Grup B' },
  { id: 'student_9', classId: DEMO_CLASS_ID, name: 'MIRALLES PONS, Clara', halfGroup: 'Grup A' },
  { id: 'student_10', classId: DEMO_CLASS_ID, name: 'FARRÉ NOGUÉ, Pol', halfGroup: 'Grup B' },
  { id: 'student_11', classId: DEMO_CLASS_ID, name: 'TORRES LLUCH, Aina', halfGroup: 'Grup A' },
  { id: 'student_12', classId: DEMO_CLASS_ID, name: 'CASALS ORRI, Joel', halfGroup: 'Grup B', diagnoses: ['tdah', 'progress'] },
  { id: 'student_13', classId: DEMO_CLASS_ID, name: 'BONELL RIERA, Emma', halfGroup: 'Grup A' },
  { id: 'student_14', classId: DEMO_CLASS_ID, name: 'FONT GRAU, Iker', halfGroup: 'Grup B' },
  { id: 'student_15', classId: DEMO_CLASS_ID, name: 'VILA CLAVEROL, Noa', halfGroup: 'Grup A' },
  { id: 'student_16', classId: DEMO_CLASS_ID, name: 'PONS MATEU, Leo', halfGroup: 'Grup B' },
  {
    id: 'student_17',
    classId: DEMO_CLASS_ID,
    name: 'BOSCH RIERA, Nora',
    halfGroup: 'Grup A',
    personalNotes: 'Molt bon raonament oral, però tendeix a deixar evidències escrites incompletes.',
  },
  {
    id: 'student_18',
    classId: DEMO_CLASS_ID,
    name: 'GRAU MONTANÉ, Unai',
    halfGroup: 'Grup B',
    diagnoses: ['dyslexia'],
    personalNotes: 'Compleix molt els hàbits de treball, però necessita suport conceptual sostingut.',
  },
  {
    id: 'student_19',
    classId: DEMO_CLASS_ID,
    name: 'LLADÓ ESTEVE, Carla',
    halfGroup: 'Grup A',
    personalNotes: 'Ha millorat quan rep retorn breu i concret després de cada activitat.',
  },
  {
    id: 'student_20',
    classId: DEMO_CLASS_ID,
    name: 'SANS PUIG, Èric',
    halfGroup: 'Grup B',
    diagnoses: ['tdah'],
    personalNotes: 'Bon potencial, però els hàbits fluctuen molt segons la setmana.',
  },
  { id: 'student_21', classId: 'class_3d', name: 'MORER SERRA, Arlet', halfGroup: 'Grup A' },
  { id: 'student_22', classId: 'class_3d', name: 'REIG COLL, Pau', halfGroup: 'Grup B' },
  { id: 'student_23', classId: 'class_4e', name: 'DURAN PI, Jana', halfGroup: 'Grup A' },
  { id: 'student_24', classId: 'class_4e', name: 'ESTEVE SOLÉ, Jan', halfGroup: 'Grup B' },
]

const semesters = [
  { id: 'sem_1', classId: DEMO_CLASS_ID, name: '1r Semestre', order: 1 },
  { id: 'sem_2', classId: DEMO_CLASS_ID, name: '2n Semestre', order: 2 },
  { id: 'sem_3', classId: 'class_3d', name: '1r Semestre', order: 1 },
  { id: 'sem_4', classId: 'class_3d', name: '2n Semestre', order: 2 },
  { id: 'sem_5', classId: 'class_4e', name: '1r Semestre', order: 1 },
  { id: 'sem_6', classId: 'class_4e', name: '2n Semestre', order: 2 },
]

const uts = [
  { id: 'ut_1', classId: DEMO_CLASS_ID, semesterId: 'sem_1', name: 'UT1', order: 1 },
  { id: 'ut_2', classId: DEMO_CLASS_ID, semesterId: 'sem_1', name: 'UT2', order: 2 },
  { id: 'ut_3', classId: DEMO_CLASS_ID, semesterId: 'sem_2', name: 'UT3', order: 1 },
  { id: 'ut_4', classId: DEMO_CLASS_ID, semesterId: 'sem_2', name: 'UT4', order: 2 },
  { id: 'ut_3d_1', classId: 'class_3d', semesterId: 'sem_3', name: 'UT1', order: 1 },
  { id: 'ut_3d_2', classId: 'class_3d', semesterId: 'sem_3', name: 'UT2', order: 2 },
  { id: 'ut_3d_3', classId: 'class_3d', semesterId: 'sem_4', name: 'UT3', order: 1 },
  { id: 'ut_3d_4', classId: 'class_3d', semesterId: 'sem_4', name: 'UT4', order: 2 },
  { id: 'ut_4e_1', classId: 'class_4e', semesterId: 'sem_5', name: 'UT1', order: 1 },
  { id: 'ut_4e_2', classId: 'class_4e', semesterId: 'sem_5', name: 'UT2', order: 2 },
  { id: 'ut_4e_3', classId: 'class_4e', semesterId: 'sem_6', name: 'UT3', order: 1 },
  { id: 'ut_4e_4', classId: 'class_4e', semesterId: 'sem_6', name: 'UT4', order: 2 },
]

const cfnCompetencies = [
  {
    code: 'c1',
    name: 'C1: Modelització',
    color: 'orange',
    criteria: ['CA1: Rigor', 'CA2: Precisió'],
  },
  {
    code: 'c2',
    name: 'C2: Indagació',
    color: 'green',
    criteria: ['CA1: Pertinència', 'CA2: Rigor'],
  },
  {
    code: 'c3',
    name: 'C3: Argumentació',
    color: 'purple',
    criteria: ['CA1: Sentit crític', 'CA2: Coherència'],
  },
]

function competencyId(utId, code) {
  return `${utId}_${code}`
}

function criterionId(utId, code, index) {
  return `${utId}_${code}_ca${index + 1}`
}

function buildCompetencies() {
  return uts.flatMap((ut) => {
    if (ut.classId !== DEMO_CLASS_ID) return []

    return cfnCompetencies.map((competency, index) => ({
      id: competencyId(ut.id, competency.code),
      classId: ut.classId,
      utId: ut.id,
      name: competency.name,
      color: competency.color,
      order: index + 1,
      source: 'demo-cfn',
    }))
  })
}

function buildCriteria() {
  return uts.flatMap((ut) => {
    if (ut.classId !== DEMO_CLASS_ID) return []

    return cfnCompetencies.flatMap((competency) =>
      competency.criteria.map((criterionName, index) => ({
        id: criterionId(ut.id, competency.code, index),
        competencyId: competencyId(ut.id, competency.code),
        name: criterionName,
        order: index + 1,
        rubric: {
          A: 'Descripció demo del nivell A: domini autònom i transferible.',
          B: 'Descripció demo del nivell B: assoliment correcte amb algun ajust.',
          C: 'Descripció demo del nivell C: assoliment fràgil que necessita reforç.',
          D: 'Descripció demo del nivell D: no assolit encara.',
        },
      })),
    )
  })
}

const gradeProfiles = {
  student_1: { ut_1: ['A', 'A', 'A'], ut_2: ['A', 'A', 'A'], ut_3: ['A', 'A', 'B'], ut_4: ['A', 'A', 'A'] },
  student_2: { ut_1: ['A', 'B', 'B'], ut_2: ['B', 'B', 'B'], ut_3: ['A', 'B', 'B'], ut_4: ['B', 'B', 'B'] },
  student_3: { ut_1: ['C', 'C', 'B'], ut_2: ['C', 'B', 'C'], ut_3: ['B', 'C', 'B'], ut_4: ['B', 'C', 'B'] },
  student_4: { ut_1: ['D', 'D', 'C'], ut_2: ['D', 'C', 'D'], ut_3: ['C', 'D', 'D'], ut_4: ['D', 'D', 'C'] },
  student_5: { ut_1: ['B', 'B', 'C'], ut_2: ['B', 'B', 'B'], ut_3: ['B', 'A', 'B'], ut_4: ['A', 'B', 'B'] },
  student_6: { ut_1: ['C', 'B', 'C'], ut_2: ['C', 'C', 'B'], ut_3: ['C', 'B', 'C'], ut_4: ['B', 'C', 'C'] },
  student_7: { ut_1: ['B', 'C', 'B'], ut_2: ['C', 'C', 'C'], ut_3: ['B', 'B', 'C'], ut_4: ['B', 'C', 'B'] },
  student_8: { ut_1: ['D', 'C', 'D'], ut_2: ['C', 'D', 'C'], ut_3: ['D', 'C', 'D'], ut_4: ['C', 'C', 'D'] },
  student_9: { ut_1: ['A', 'B', 'A'], ut_2: ['A', 'B', 'A'], ut_3: ['B', 'B', 'A'], ut_4: ['A', 'A', 'B'] },
  student_10: { ut_1: ['C', 'D', 'C'], ut_2: ['B', 'C', 'C'], ut_3: ['B', 'B', 'C'], ut_4: ['B', 'B', 'B'] },
  student_11: { ut_1: ['B', 'B', 'B'], ut_2: ['B', 'A', 'B'], ut_3: ['A', 'B', 'A'], ut_4: ['A', 'B', 'A'] },
  student_12: { ut_1: ['A', 'A', 'B'], ut_2: ['B', 'A', 'B'], ut_3: ['B', 'B', 'B'], ut_4: ['C', 'B', 'B'] },
  student_13: { ut_1: ['C', 'C', 'D'], ut_2: ['C', 'C', 'C'], ut_3: ['C', 'B', 'C'], ut_4: ['B', 'B', 'C'] },
  student_14: { ut_1: ['D', 'D', 'D'], ut_2: ['D', 'C', 'D'], ut_3: ['D', 'D', 'C'], ut_4: ['D', 'C', 'C'] },
  student_15: { ut_1: ['B', 'C', 'B'], ut_2: ['B', 'B', 'B'], ut_3: ['A', 'B', 'B'], ut_4: ['A', 'A', 'B'] },
  student_16: { ut_1: ['C', 'D', 'C'], ut_2: ['C', 'C', 'D'], ut_3: ['B', 'C', 'C'], ut_4: ['B', 'C', 'B'] },
  student_17: { ut_1: ['A', 'A', 'A'], ut_2: ['A', 'B', 'A'], ut_3: ['A', 'A', 'A'], ut_4: ['A', 'A', 'B'] },
  student_18: { ut_1: ['C', 'C', 'C'], ut_2: ['C', 'B', 'C'], ut_3: ['B', 'C', 'C'], ut_4: ['B', 'B', 'C'] },
  student_19: { ut_1: ['D', 'C', 'D'], ut_2: ['C', 'C', 'C'], ut_3: ['B', 'C', 'B'], ut_4: ['B', 'B', 'B'] },
  student_20: { ut_1: ['B', 'B', 'A'], ut_2: ['B', 'C', 'B'], ut_3: ['C', 'C', 'B'], ut_4: ['C', 'D', 'C'] },
}

const criterionPairsByGrade = {
  A: ['A', 'A'],
  B: ['B', 'B'],
  C: ['C', 'C'],
  D: ['D', 'D'],
}

function buildMarks() {
  return Object.entries(gradeProfiles).flatMap(([studentId, utGrades]) =>
    Object.entries(utGrades).flatMap(([utId, grades]) =>
      cfnCompetencies.flatMap((competency, competencyIndex) =>
        criterionPairsByGrade[grades[competencyIndex]].map((value, criterionIndex) => ({
          id: `mark_${studentId}_${utId}_${competency.code}_${criterionIndex + 1}`,
          studentId,
          criterionId: criterionId(utId, competency.code, criterionIndex),
          value,
        })),
      ),
    ),
  )
}

const tasks = [
  { id: 'task_1', classId: DEMO_CLASS_ID, utId: 'ut_1', title: 'Recerca inicial', date: '2026-09-18', order: 1 },
  { id: 'task_2', classId: DEMO_CLASS_ID, utId: 'ut_1', title: 'Fonts i evidències', date: '2026-09-25', order: 2 },
  { id: 'task_3', classId: DEMO_CLASS_ID, utId: 'ut_1', title: 'Hipòtesi i variables', date: '2026-10-02', order: 3 },
  { id: 'task_4', classId: DEMO_CLASS_ID, utId: 'ut_1', title: 'Síntesi oral', date: '2026-10-09', order: 4 },
  { id: 'task_5', classId: DEMO_CLASS_ID, utId: 'ut_2', title: 'Model de partícules', date: '2026-11-06', order: 1 },
  { id: 'task_6', classId: DEMO_CLASS_ID, utId: 'ut_2', title: 'Problemes guiats', date: '2026-11-13', order: 2 },
  { id: 'task_7', classId: DEMO_CLASS_ID, utId: 'ut_3', title: 'Disseny experimental', date: '2027-02-05', order: 1 },
  { id: 'task_8', classId: DEMO_CLASS_ID, utId: 'ut_4', title: 'Informe final', date: '2027-04-16', order: 1 },
]

const taskStatusProfiles = {
  student_1: ['DONE', 'DONE', 'DONE', 'DONE', 'DONE', 'DONE', 'DONE', 'DONE'],
  student_2: ['DONE', 'LATE', 'MISSING', 'DONE', 'LATE', 'DONE', 'MISSING', 'DONE'],
  student_3: ['DONE', 'DONE', 'DONE', 'DONE', 'DONE', 'LATE', 'DONE', 'DONE'],
  student_4: ['MISSING', 'MISSING', 'LATE', 'MISSING', 'MISSING', 'LATE', 'MISSING', 'MISSING'],
  student_5: ['DONE', 'LATE', 'DONE', 'DONE', 'DONE', 'DONE', 'LATE', 'DONE'],
  student_6: ['DONE', 'MISSING', 'DONE', 'LATE', 'DONE', 'MISSING', 'DONE', 'LATE'],
  student_7: ['DONE', 'DONE', 'EXEMPT', 'DONE', 'DONE', 'DONE', 'EXEMPT', 'DONE'],
  student_8: ['MISSING', 'DONE', 'MISSING', 'LATE', 'MISSING', 'DONE', 'MISSING', 'LATE'],
  student_9: ['DONE', 'DONE', 'DONE', 'DONE', 'DONE', 'DONE', 'DONE', 'DONE'],
  student_10: ['LATE', 'DONE', 'DONE', 'DONE', 'DONE', 'DONE', 'DONE', 'DONE'],
  student_11: ['DONE', 'DONE', 'DONE', 'LATE', 'DONE', 'DONE', 'DONE', 'DONE'],
  student_12: ['MISSING', 'LATE', 'MISSING', 'DONE', 'MISSING', 'LATE', 'DONE', 'MISSING'],
  student_13: ['DONE', 'MISSING', 'LATE', 'DONE', 'DONE', 'MISSING', 'DONE', 'LATE'],
  student_14: ['MISSING', 'MISSING', 'MISSING', 'LATE', 'MISSING', 'MISSING', 'LATE', 'MISSING'],
  student_15: ['DONE', 'DONE', 'DONE', 'DONE', 'DONE', 'DONE', 'DONE', 'DONE'],
  student_16: ['LATE', 'MISSING', 'DONE', 'EXEMPT', 'LATE', 'DONE', 'MISSING', 'DONE'],
  student_17: ['MISSING', 'DONE', 'LATE', 'DONE', 'MISSING', 'DONE', 'LATE', 'DONE'],
  student_18: ['DONE', 'DONE', 'DONE', 'DONE', 'DONE', 'DONE', 'LATE', 'DONE'],
  student_19: ['MISSING', 'LATE', 'DONE', 'DONE', 'DONE', 'DONE', 'DONE', 'DONE'],
  student_20: ['DONE', 'MISSING', 'DONE', 'LATE', 'MISSING', 'LATE', 'MISSING', 'DONE'],
}

function buildTaskRecords() {
  return Object.entries(taskStatusProfiles).flatMap(([studentId, statuses]) =>
    statuses.map((status, index) => ({
      id: `rec_${studentId}_${index + 1}`,
      classId: DEMO_CLASS_ID,
      utId: tasks[index].utId,
      studentId,
      taskId: tasks[index].id,
      status,
      note:
        status === 'LATE'
          ? 'Demo: tasca començada però incompleta el dia de revisió.'
          : status === 'MISSING'
            ? 'Demo: no constava entrega en el moment de classe.'
            : '',
    })),
  )
}

export const seedDataset = {
  classes: [
    {
      id: DEMO_CLASS_ID,
      name: '2n Demo',
      subject: DEMO_SUBJECT,
      color: 'green',
      halfGroups: ['Grup A', 'Grup B'],
      order: 1,
      utModelReady: true,
      isTutoringGroup: false,
      tutorialLinkedClassId: DEMO_CLASS_ID,
    },
    {
      id: 'class_3d',
      name: '3r Demo',
      subject: DEMO_SUBJECT,
      color: 'blue',
      halfGroups: ['Grup A', 'Grup B'],
      order: 2,
      utModelReady: true,
    },
    {
      id: 'class_4e',
      name: '4t Demo',
      subject: DEMO_SUBJECT,
      color: 'red',
      halfGroups: ['Grup A', 'Grup B'],
      order: 3,
      utModelReady: true,
    },
  ],
  students: demoStudents,
  semesters,
  uts,
  competencies: buildCompetencies(),
  criteria: buildCriteria(),
  indicators: [],
  marks: buildMarks(),
  tasks,
  taskRecords: buildTaskRecords(),
  behaviorEvents: [
    {
      id: 'beh_1',
      classId: DEMO_CLASS_ID,
      studentId: 'student_2',
      type: 'incident',
      text: 'Demo: necessita recordatori per mantenir material i ritme de treball.',
      date: '2026-09-19',
    },
    {
      id: 'beh_2',
      classId: DEMO_CLASS_ID,
      studentId: 'student_4',
      type: 'incident',
      text: 'Demo: interromp la sessió quan el grup treballa de manera autònoma.',
      date: '2026-09-22',
    },
    {
      id: 'beh_3',
      classId: DEMO_CLASS_ID,
      studentId: 'student_4',
      type: 'incident',
      text: 'Demo: cal reconduir-lo diverses vegades durant la posada en comú.',
      date: '2026-09-29',
    },
    {
      id: 'beh_4',
      classId: DEMO_CLASS_ID,
      studentId: 'student_8',
      type: 'incident',
      text: 'Demo: evita començar la tasca fins que rep una indicació individual.',
      date: '2026-10-01',
    },
    {
      id: 'beh_5',
      classId: DEMO_CLASS_ID,
      studentId: 'student_1',
      type: 'positive',
      text: 'Demo: ajuda el grup a repartir rols i comprovar evidències.',
      date: '2026-09-21',
    },
    {
      id: 'beh_6',
      classId: DEMO_CLASS_ID,
      studentId: 'student_11',
      type: 'positive',
      text: 'Demo: millora la qualitat de les justificacions respecte la UT anterior.',
      date: '2026-10-03',
    },
    {
      id: 'beh_7',
      classId: DEMO_CLASS_ID,
      studentId: 'student_17',
      type: 'incident',
      text: 'Demo: lliura tard tot i tenir bona comprensió dels conceptes.',
      date: '2026-11-10',
    },
    {
      id: 'beh_8',
      classId: DEMO_CLASS_ID,
      studentId: 'student_18',
      type: 'positive',
      text: 'Demo: revisa la feina amb molta constància i demana ajuda quan no entén el criteri.',
      date: '2026-11-17',
    },
    {
      id: 'beh_9',
      classId: DEMO_CLASS_ID,
      studentId: 'student_20',
      type: 'incident',
      text: 'Demo: baixa el ritme quan la tasca demana autonomia sostinguda.',
      date: '2027-02-07',
    },
    {
      id: 'beh_10',
      classId: DEMO_CLASS_ID,
      studentId: 'student_19',
      type: 'positive',
      text: 'Demo: progressa molt quan corregeix amb el company abans d’entregar.',
      date: '2027-02-12',
    },
  ],
  agendaNotes: [
    {
      id: 'note_1',
      classId: DEMO_CLASS_ID,
      studentId: 'student_3',
      type: 'team',
      text: 'Demo: a l’equip educatiu es recomana reforçar vocabulari científic abans de les exposicions.',
      date: '2026-09-28',
    },
    {
      id: 'note_2',
      classId: DEMO_CLASS_ID,
      studentId: 'student_12',
      type: 'tutoring',
      text: 'Demo: la família comenta que treballa millor si sap exactament què s’espera de cada criteri.',
      date: '2026-10-04',
    },
    {
      id: 'note_3',
      classId: DEMO_CLASS_ID,
      studentId: 'student_4',
      type: 'tracking',
      text: 'Demo: cal avisar agenda si acumula una altra tasca no feta.',
      date: '2026-10-06',
    },
    {
      id: 'note_4',
      classId: DEMO_CLASS_ID,
      studentId: 'student_18',
      type: 'team',
      text: 'Demo: fa les tasques, però necessita una explicació més guiada del pas de dades a conclusions.',
      date: '2026-11-18',
    },
    {
      id: 'note_5',
      classId: DEMO_CLASS_ID,
      studentId: 'student_17',
      type: 'tracking',
      text: 'Demo: bon rendiment, però convé revisar terminis i completar evidències abans de tancar la UT.',
      date: '2026-11-21',
    },
    {
      id: 'note_6',
      classId: DEMO_CLASS_ID,
      studentId: 'student_20',
      type: 'tutoring',
      text: 'Demo: pactar una rutina curta de revisió setmanal perquè no acumuli tasques incompletes.',
      date: '2027-02-09',
    },
    {
      id: 'note_7',
      classId: DEMO_CLASS_ID,
      studentId: 'student_19',
      type: 'team',
      text: 'Demo: alumna en millora clara; reforçar positivament la constància i la qualitat de les justificacions.',
      date: '2027-02-14',
    },
  ],
  tutorialRecords: [],
  tutorialMarks: [],
  tutorialRelations: [],
  tutorialGroupSets: [],
  tutorialSociogramLayouts: [],
  tutorialStudentRoles: [],
  tutorialSeatingPlans: [],
  seatingCharts: [],
  studentAntecedents: [],
}
