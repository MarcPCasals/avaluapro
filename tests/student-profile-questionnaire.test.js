import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildStudentProfileClassPortrait,
  createEmptyStudentProfileAnswers,
  getStudentProfilePersonalStepError,
  getStudentProfilePriorityFlags,
  normalizeStudentProfileAnswers,
} from '../src/features/tutoring/studentProfileQuestionnaire.js'

test('construeix el retrat inicial amb denominadors independents per pregunta', () => {
  const responses = [
    {
      id: 'response-1',
      answers: {
        familyLanguages: ['Català', 'Castellà'],
        breakPreferences: ['Llegir un llibre', 'Parlar amb els amics i amigues'],
        extracurricularActivities: [{ activity: 'Música', hours: '2' }],
        hasExtracurriculars: 'yes',
        hasReinforcement: 'yes',
        helpSeeking: 'Pregunto al professor o professora',
        homeComputerCount: 1,
        homeDeviceAccess: 'yes',
        homeMobileCount: 1,
        homeTabletCount: 0,
        learningHelps: ['Veure exemples resolts', 'Practicar amb exercicis'],
        previousSchool: "Escola Andorrana de primera ensenyança d’Ordino",
        reinforcementActivities: [{ activity: 'Matemàtiques', hours: '1.5' }],
        workPreferences: ['Treballar individualment'],
      },
    },
    {
      id: 'response-2',
      answers: {
        familyLanguages: ['Català'],
        breakPreferences: ['Llegir un llibre'],
        extracurricularActivities: [],
        hasExtracurriculars: 'no',
        hasReinforcement: 'no',
        helpSeeking: 'De vegades em quedo bloquejat/ada',
        homeComputerCount: 0,
        homeDeviceAccess: 'no',
        homeMobileCount: 0,
        homeTabletCount: 0,
        learningHelps: ['Veure exemples resolts', 'Veure exemples resolts'],
        previousSchool: 'Una altra escola',
        workPreferences: ['Treballar en parella', 'Treballar en un grup petit'],
      },
    },
    { id: 'response-3', answers: { familyLanguages: [], learningHelps: [] } },
  ]

  const portrait = buildStudentProfileClassPortrait(responses, 4)

  assert.deepEqual(portrait.coverage, {
    pendingCount: 1,
    percentage: 75,
    responseCount: 3,
    totalStudents: 4,
  })
  assert.equal(portrait.learningHelps.answeredCount, 2)
  assert.deepEqual(
    portrait.learningHelps.rows.find((row) => row.value === 'Veure exemples resolts'),
    { count: 2, label: 'Veure exemples resolts', percentage: 100, value: 'Veure exemples resolts' },
  )
  assert.equal(portrait.familyLanguages.answeredCount, 2)
  assert.equal(portrait.familyLanguages.rows.find((row) => row.value === 'Català').count, 2)
  assert.equal(portrait.helpSeeking.answeredCount, 2)
  assert.equal(portrait.devices.rows.find((row) => row.value === 'multiple').count, 1)
  assert.equal(portrait.devices.rows.find((row) => row.value === 'none').count, 1)
  assert.deepEqual(portrait.devices.responseIdsByValue.multiple, ['response-1'])
  assert.deepEqual(portrait.devices.responseIdsByValue.none, ['response-2'])
  assert.equal(portrait.breakPreferences.rows.find((row) => row.value === 'Llegir un llibre').count, 2)
  assert.equal(portrait.extracurriculars.rows.find((row) => row.value === 'yes').count, 1)
  assert.deepEqual(portrait.extracurriculars.responseIdsByValue.yes, ['response-1'])
  assert.deepEqual(portrait.extracurriculars.responseIdsByValue.no, ['response-2'])
  assert.equal(portrait.reinforcement.rows.find((row) => row.value === 'no').count, 1)
  assert.equal(portrait.weeklyCommitment.answeredCount, 2)
  assert.equal(portrait.weeklyCommitment.rows.find((row) => row.value === 'four-to-six').count, 1)
  assert.equal(portrait.weeklyCommitment.rows.find((row) => row.value === 'none').count, 1)
})

test('no inventa una dedicació de zero hores quan l’alumne no ha indicat les hores', () => {
  const portrait = buildStudentProfileClassPortrait([
    {
      answers: {
        extracurricularActivities: [{ activity: 'Futbol', hours: '' }],
        hasExtracurriculars: 'yes',
        hasReinforcement: 'no',
        reinforcementActivities: [],
      },
    },
  ], 1)

  assert.equal(portrait.extracurriculars.answeredCount, 1)
  assert.equal(portrait.weeklyCommitment.answeredCount, 0)
})

test('destaca totes les respostes que demanen seguiment personal del tutor', () => {
  const answers = {
    ...createEmptyStudentProfileAnswers(),
    familySituation: 'talk',
    healthSituation: 'talk',
    medicalPlan: 'unknown',
    currentSupports: ['Prefereixo no respondre'],
    homeDeviceAccess: 'no',
  }

  const flags = getStudentProfilePriorityFlags(answers)
  const flagIds = flags.map((flag) => flag.id)

  assert.deepEqual(flagIds, [
    'health-talk',
    'medical-unknown',
    'support-private',
    'family-talk',
    'no-home-device',
  ])
  assert.match(flags.find((flag) => flag.id === 'health-talk').detail, /personalment/)
  assert.match(flags.find((flag) => flag.id === 'medical-unknown').detail, /No ho sé/)
})

test('mostra el text declarat dins dels avisos de salut i pauta mèdica', () => {
  const flags = getStudentProfilePriorityFlags({
    ...createEmptyStudentProfileAnswers(),
    healthDetails: 'Al·lèrgia als fruits secs',
    healthSituation: 'yes',
    medicalPlan: 'yes',
    medicalPlanDetails: 'Porta autoinjector a la motxilla',
  })

  assert.equal(flags.find((flag) => flag.id === 'health').detail, 'Al·lèrgia als fruits secs')
  assert.equal(flags.find((flag) => flag.id === 'medical').detail, 'Porta autoinjector a la motxilla')
})

test('neteja camps antics o mal formats abans d’enviar una resposta', () => {
  const normalized = normalizeStudentProfileAnswers({
    birthPlace: 'Ordino',
    campAntic: 'valor que Firestore rebutjaria',
    classFriendIds: 'no és una llista',
    familyLanguages: ['Català'],
    homeMobileCount: '3',
    homeTabletCount: 99,
  })

  assert.equal(normalized.birthPlace, 'Ordino')
  assert.deepEqual(normalized.classFriendIds, [])
  assert.deepEqual(normalized.familyLanguages, ['Català'])
  assert.equal(normalized.homeMobileCount, 3)
  assert.equal(normalized.homeTabletCount, 20)
  assert.equal('campAntic' in normalized, false)
  assert.equal(Object.keys(normalized).length, Object.keys(createEmptyStudentProfileAnswers()).length)
})

test('la segona adreça és opcional i la professió del primer responsable és obligatòria', () => {
  const answers = {
    ...createEmptyStudentProfileAnswers(),
    address: 'Carrer Major, 1',
    birthDate: '2013-05-10',
    birthPlace: 'Ordino',
    guardian1Name: 'Maria Exemple',
    guardian1Phone: '123456',
    guardian1Relationship: 'Mare',
    parish: 'Ordino',
  }

  assert.match(getStudentProfilePersonalStepError(answers), /primer responsable/)
  answers.guardian1Profession = 'Infermera'
  assert.equal(getStudentProfilePersonalStepError(answers), '')
  assert.equal(answers.address2, '')
})

test('si s’informa un segon responsable, també cal indicar-ne la professió', () => {
  const answers = {
    ...createEmptyStudentProfileAnswers(),
    address: 'Carrer Major, 1',
    birthDate: '2013-05-10',
    birthPlace: 'Ordino',
    guardian1Name: 'Maria Exemple',
    guardian1Phone: '123456',
    guardian1Profession: 'Infermera',
    guardian1Relationship: 'Mare',
    guardian2Name: 'Joan Exemple',
    guardian2Phone: '654321',
    guardian2Relationship: 'Pare',
    parish: 'Ordino',
  }

  assert.match(getStudentProfilePersonalStepError(answers), /segon responsable/)
  answers.guardian2Profession = 'Fuster'
  assert.equal(getStudentProfilePersonalStepError(answers), '')
})
