export const STUDENT_PROFILE_FORM_VERSION = '2026-09-14-v2'
export const STUDENT_PROFILE_PRIVACY_NOTICE_VERSION = '2026-09-08-v1'

export const PARISH_OPTIONS = [
  'Canillo',
  'Encamp',
  'Ordino',
  'La Massana',
  'Andorra la Vella',
  'Sant Julià de Lòria',
  'Escaldes-Engordany',
  'Altres',
]

export const RELATIONSHIP_OPTIONS = [
  'Mare',
  'Pare',
  'Tutor/a legal',
  'Familiar',
  'Una altra persona responsable',
]

export const HOUSEHOLD_OPTIONS = [
  'Mare',
  'Pare',
  'Germans o germanes',
  'Avis o àvies',
  'Altres familiars',
  'Altres persones',
]

export const FAMILY_LANGUAGE_OPTIONS = [
  'Català',
  'Castellà',
  'Francès',
  'Portuguès',
  'Anglès',
  'Ucraïnès',
  'Rus',
  'Altres',
]

export const CURRENT_SUPPORT_OPTIONS = [
  'Suport psicopedagògic',
  'Psicologia',
  'Logopèdia',
  'Educador/a',
  'Un altre suport',
  'Cap',
  'Prefereixo no respondre',
]

export const SCHOOL_OPTIONS = [
  "Escola Andorrana de primera ensenyança d’Ordino",
  'Escola Andorrana de primera ensenyança de la Massana',
  "Escola Andorrana de primera ensenyança d’Escaldes-Engordany",
  'Una altra escola',
]

export const SCHOOL_SUPPORT_OPTIONS = [
  'Suport dins de l’aula',
  'Reforç de francès',
  'Reforç de matemàtiques',
  'Aula d’estudi',
  'Seguiment psicopedagògic',
  'TEAES',
  'Educador/a',
  'Un altre suport',
]

export const MIDDAY_ACTIVITY_OPTIONS = [
  'Animació artística',
  'ARTEO',
  'Animació esportiva',
  'Va de mús',
  'Una altra activitat',
  'Cap',
]

export const BREAK_PREFERENCE_OPTIONS = [
  'Anar a la biblioteca',
  'Anar al camp de futbol',
  'Sortir al pati',
  'Dibuixar',
  'Llegir un llibre',
  'Jugar a bàsquet',
  'Jugar a tenis de taula',
  'Jugar a vòlei',
  'Parlar amb els amics i amigues',
  'Fer deures',
  'Estudiar',
  'Una altra activitat',
]

export const LEARNING_HELP_OPTIONS = [
  'Veure exemples resolts',
  'Fer esquemes o mirar imatges',
  'Escoltar una explicació',
  'Practicar amb exercicis',
  'Manipular materials o moure’m',
  'Parlar-ne amb altres persones',
  'Tenir els passos escrits i ordenats',
  'Disposar de més temps',
  'Una altra cosa',
]

export const WORK_PREFERENCE_OPTIONS = [
  'Treballar individualment',
  'Treballar en parella',
  'Treballar en un grup petit',
  'Combinar diferents maneres de treballar',
]

export const HELP_SEEKING_OPTIONS = [
  'Ho torno a provar pel meu compte',
  'Pregunto al professor o professora',
  'Pregunto a un company o companya',
  'Busco un exemple o una explicació',
  'De vegades em quedo bloquejat/ada',
]

const DEVICE_ACCESS_OPTIONS = [
  { value: 'none', label: 'Sense cap dispositiu disponible' },
  { value: 'mobile-only', label: 'Només mòbil' },
  { value: 'computer-or-tablet', label: 'Tauleta o ordinador disponible' },
  { value: 'multiple', label: 'Diversos tipus de dispositiu' },
]

const YES_NO_OPTIONS = [
  { value: 'yes', label: 'Sí' },
  { value: 'no', label: 'No' },
]

const WEEKLY_COMMITMENT_OPTIONS = [
  { value: 'none', label: 'Cap hora indicada' },
  { value: 'one-to-three', label: 'Entre 1 i 3 hores' },
  { value: 'four-to-six', label: 'Entre 4 i 6 hores' },
  { value: 'seven-to-nine', label: 'Entre 7 i 9 hores' },
  { value: 'ten-or-more', label: '10 hores o més' },
]

function withPercentages(rows, answeredCount) {
  return rows.map((row) => ({
    ...row,
    percentage: answeredCount > 0 ? Math.round((row.count / answeredCount) * 100) : 0,
  }))
}

function responseKey(response) {
  return String(response?.id || response?.studentId || '').trim()
}

function createResponseIdsByValue(options) {
  return new Map(options.map((option) => [typeof option === 'string' ? option : option.value, []]))
}

function serializeResponseIdsByValue(values) {
  return Object.fromEntries([...values.entries()].map(([key, responseIds]) => [key, responseIds]))
}

function aggregateSingleChoice(responses, field, options) {
  const counts = new Map(options.map((option) => [typeof option === 'string' ? option : option.value, 0]))
  const responseIdsByValue = createResponseIdsByValue(options)
  let answeredCount = 0

  responses.forEach((response) => {
    const value = response?.answers?.[field]
    if (typeof value !== 'string' || !value.trim() || !counts.has(value)) return
    answeredCount += 1
    counts.set(value, counts.get(value) + 1)
    const id = responseKey(response)
    if (id) responseIdsByValue.get(value).push(id)
  })

  return {
    answeredCount,
    responseIdsByValue: serializeResponseIdsByValue(responseIdsByValue),
    rows: withPercentages(options.map((option) => {
      const value = typeof option === 'string' ? option : option.value
      return {
        count: counts.get(value) || 0,
        label: typeof option === 'string' ? option : option.label,
        value,
      }
    }), answeredCount),
  }
}

function aggregateMultipleChoice(responses, field, options) {
  const counts = new Map(options.map((option) => [typeof option === 'string' ? option : option.value, 0]))
  const responseIdsByValue = createResponseIdsByValue(options)
  let answeredCount = 0

  responses.forEach((response) => {
    const selectedValues = response?.answers?.[field]
    if (!Array.isArray(selectedValues) || selectedValues.length === 0) return
    answeredCount += 1
    new Set(selectedValues).forEach((value) => {
      if (!counts.has(value)) return
      counts.set(value, counts.get(value) + 1)
      const id = responseKey(response)
      if (id) responseIdsByValue.get(value).push(id)
    })
  })

  return {
    answeredCount,
    responseIdsByValue: serializeResponseIdsByValue(responseIdsByValue),
    rows: withPercentages(options.map((option) => {
      const value = typeof option === 'string' ? option : option.value
      return {
        count: counts.get(value) || 0,
        label: typeof option === 'string' ? option : option.label,
        value,
      }
    }), answeredCount),
  }
}

function aggregateDeviceAccess(responses) {
  const values = []
  const responseIdsByValue = createResponseIdsByValue(DEVICE_ACCESS_OPTIONS)
  responses.forEach((response) => {
    const answers = response?.answers || {}
    let value = ''
    if (answers.homeDeviceAccess === 'no') value = 'none'
    if (answers.homeDeviceAccess !== 'no' && answers.homeDeviceAccess !== 'yes') return

    if (answers.homeDeviceAccess === 'yes') {
      const availableTypes = [
        Number(answers.homeMobileCount) > 0,
        Number(answers.homeTabletCount) > 0,
        Number(answers.homeComputerCount) > 0,
      ]
      const typeCount = availableTypes.filter(Boolean).length
      if (typeCount === 0) return
      value = typeCount > 1 ? 'multiple' : availableTypes[0] ? 'mobile-only' : 'computer-or-tablet'
    }

    values.push(value)
    const id = responseKey(response)
    if (id) responseIdsByValue.get(value).push(id)
  })

  const counts = new Map(DEVICE_ACCESS_OPTIONS.map((option) => [option.value, 0]))
  values.forEach((value) => counts.set(value, counts.get(value) + 1))

  return {
    answeredCount: values.length,
    responseIdsByValue: serializeResponseIdsByValue(responseIdsByValue),
    rows: withPercentages(DEVICE_ACCESS_OPTIONS.map((option) => ({
      ...option,
      count: counts.get(option.value) || 0,
    })), values.length),
  }
}

function readDeclaredHours(rows) {
  if (!Array.isArray(rows)) return { hasHours: false, total: 0 }
  return rows.reduce((result, row) => {
    if (row?.hours === '' || row?.hours === null || row?.hours === undefined) return result
    const hours = Number(row.hours)
    if (!Number.isFinite(hours) || hours < 0) return result
    return { hasHours: true, total: result.total + hours }
  }, { hasHours: false, total: 0 })
}

function aggregateWeeklyCommitment(responses) {
  const values = []
  const responseIdsByValue = createResponseIdsByValue(WEEKLY_COMMITMENT_OPTIONS)
  responses.forEach((response) => {
    const answers = response?.answers || {}
    const extracurricularAnswer = answers.hasExtracurriculars
    const reinforcementAnswer = answers.hasReinforcement
    if (!['yes', 'no'].includes(extracurricularAnswer) || !['yes', 'no'].includes(reinforcementAnswer)) return

    const extracurricular = readDeclaredHours(answers.extracurricularActivities)
    const reinforcement = readDeclaredHours(answers.reinforcementActivities)
    const needsHours = extracurricularAnswer === 'yes' || reinforcementAnswer === 'yes'
    if (needsHours && !extracurricular.hasHours && !reinforcement.hasHours) return

    const total = extracurricular.total + reinforcement.total
    const value = total <= 0
      ? 'none'
      : total <= 3
        ? 'one-to-three'
        : total <= 6
          ? 'four-to-six'
          : total <= 9
            ? 'seven-to-nine'
            : 'ten-or-more'
    values.push(value)
    const id = responseKey(response)
    if (id) responseIdsByValue.get(value).push(id)
  })

  const counts = new Map(WEEKLY_COMMITMENT_OPTIONS.map((option) => [option.value, 0]))
  values.forEach((value) => counts.set(value, counts.get(value) + 1))
  return {
    answeredCount: values.length,
    responseIdsByValue: serializeResponseIdsByValue(responseIdsByValue),
    rows: withPercentages(WEEKLY_COMMITMENT_OPTIONS.map((option) => ({
      ...option,
      count: counts.get(option.value) || 0,
    })), values.length),
  }
}

export function buildStudentProfileClassPortrait(responses = [], totalStudents = 0) {
  const validResponses = responses.filter((response) => response?.answers && typeof response.answers === 'object')
  const responseCount = validResponses.length

  return {
    coverage: {
      pendingCount: Math.max(0, totalStudents - responseCount),
      percentage: totalStudents > 0 ? Math.min(100, Math.round((responseCount / totalStudents) * 100)) : 0,
      responseCount,
      totalStudents,
    },
    breakPreferences: aggregateMultipleChoice(validResponses, 'breakPreferences', BREAK_PREFERENCE_OPTIONS),
    devices: aggregateDeviceAccess(validResponses),
    extracurriculars: aggregateSingleChoice(validResponses, 'hasExtracurriculars', YES_NO_OPTIONS),
    familyLanguages: aggregateMultipleChoice(validResponses, 'familyLanguages', FAMILY_LANGUAGE_OPTIONS),
    helpSeeking: aggregateSingleChoice(validResponses, 'helpSeeking', HELP_SEEKING_OPTIONS),
    learningHelps: aggregateMultipleChoice(validResponses, 'learningHelps', LEARNING_HELP_OPTIONS),
    previousSchools: aggregateSingleChoice(validResponses, 'previousSchool', SCHOOL_OPTIONS),
    reinforcement: aggregateSingleChoice(validResponses, 'hasReinforcement', YES_NO_OPTIONS),
    weeklyCommitment: aggregateWeeklyCommitment(validResponses),
    workPreferences: aggregateMultipleChoice(validResponses, 'workPreferences', WORK_PREFERENCE_OPTIONS),
  }
}

export const STUDENT_PROFILE_ANSWER_KEYS = [
  'birthDate',
  'birthPlace',
  'address',
  'address2',
  'parish',
  'parishOther',
  'homePhone',
  'guardian1Name',
  'guardian1Relationship',
  'guardian1Phone',
  'guardian1Profession',
  'guardian1Workplace',
  'guardian2Name',
  'guardian2Relationship',
  'guardian2Phone',
  'guardian2Profession',
  'guardian2Workplace',
  'siblingCount',
  'siblingsDetails',
  'householdMembers',
  'householdOther',
  'familyLanguages',
  'familyLanguageOther',
  'familySituation',
  'familySituationDetails',
  'healthSituation',
  'healthDetails',
  'medicalPlan',
  'medicalPlanDetails',
  'currentSupports',
  'currentSupportOther',
  'previousSchool',
  'previousSchoolOther',
  'repeatedCourse',
  'repeatedCourseDetails',
  'previousSchoolSupport',
  'schoolSupportTypes',
  'schoolSupportOther',
  'hasExtracurriculars',
  'extracurricularActivities',
  'hasReinforcement',
  'reinforcementActivities',
  'homeDeviceAccess',
  'homeMobileCount',
  'homeTabletCount',
  'homeComputerCount',
  'middayActivities',
  'middayActivityOther',
  'breakPreferences',
  'breakPreferenceOther',
  'classFriendIds',
  'schoolFriends',
  'learningHelps',
  'learningHelpOther',
  'workPreferences',
  'learningChallenges',
  'helpSeeking',
  'tutorExpectations',
  'studentMessage',
]

export function createEmptyStudentProfileAnswers() {
  return {
    birthDate: '',
    birthPlace: '',
    address: '',
    address2: '',
    parish: '',
    parishOther: '',
    homePhone: '',
    guardian1Name: '',
    guardian1Relationship: '',
    guardian1Phone: '',
    guardian1Profession: '',
    guardian1Workplace: '',
    guardian2Name: '',
    guardian2Relationship: '',
    guardian2Phone: '',
    guardian2Profession: '',
    guardian2Workplace: '',
    siblingCount: '0',
    siblingsDetails: '',
    householdMembers: [],
    householdOther: '',
    familyLanguages: [],
    familyLanguageOther: '',
    familySituation: '',
    familySituationDetails: '',
    healthSituation: '',
    healthDetails: '',
    medicalPlan: '',
    medicalPlanDetails: '',
    currentSupports: [],
    currentSupportOther: '',
    previousSchool: '',
    previousSchoolOther: '',
    repeatedCourse: '',
    repeatedCourseDetails: '',
    previousSchoolSupport: '',
    schoolSupportTypes: [],
    schoolSupportOther: '',
    hasExtracurriculars: '',
    extracurricularActivities: [],
    hasReinforcement: '',
    reinforcementActivities: [],
    homeDeviceAccess: '',
    homeMobileCount: 0,
    homeTabletCount: 0,
    homeComputerCount: 0,
    middayActivities: [],
    middayActivityOther: '',
    breakPreferences: [],
    breakPreferenceOther: '',
    classFriendIds: [],
    schoolFriends: '',
    learningHelps: [],
    learningHelpOther: '',
    workPreferences: [],
    learningChallenges: '',
    helpSeeking: '',
    tutorExpectations: '',
    studentMessage: '',
  }
}

export function normalizeStudentProfileAnswers(answers = {}) {
  const defaults = createEmptyStudentProfileAnswers()
  return Object.fromEntries(
    STUDENT_PROFILE_ANSWER_KEYS.map((key) => {
      const fallback = defaults[key]
      const value = answers?.[key]
      if (Array.isArray(fallback)) return [key, Array.isArray(value) ? value : []]
      if (typeof fallback === 'number') {
        const numericValue = Number(value)
        return [key, Number.isFinite(numericValue) ? Math.min(20, Math.max(0, Math.floor(numericValue))) : fallback]
      }
      return [key, typeof value === 'string' ? value : fallback]
    }),
  )
}

export function getStudentProfilePersonalStepError(answers = {}) {
  const text = (value) => String(value || '').trim()
  if (
    !text(answers.birthDate) ||
    !text(answers.birthPlace) ||
    !text(answers.address) ||
    !text(answers.parish) ||
    !text(answers.guardian1Name) ||
    !text(answers.guardian1Relationship) ||
    !text(answers.guardian1Phone) ||
    !text(answers.guardian1Profession)
  ) {
    return 'Completa les dades personals i les del primer responsable.'
  }

  const hasSecondGuardian = [
    answers.guardian2Name,
    answers.guardian2Relationship,
    answers.guardian2Phone,
    answers.guardian2Profession,
    answers.guardian2Workplace,
  ].some((value) => text(value))
  if (
    hasSecondGuardian &&
    (!text(answers.guardian2Name) ||
      !text(answers.guardian2Relationship) ||
      !text(answers.guardian2Phone) ||
      !text(answers.guardian2Profession))
  ) {
    return 'Si afegeixes un segon responsable, completa’n el nom, el vincle, el telèfon i la professió.'
  }

  return ''
}

export function getStudentProfilePriorityFlags(answers = {}) {
  const supportDetails = [
    ...(Array.isArray(answers.currentSupports) ? answers.currentSupports : []),
    answers.currentSupportOther?.trim(),
  ].filter(Boolean).join(' · ')
  const schoolSupportDetails = [
    ...(Array.isArray(answers.schoolSupportTypes) ? answers.schoolSupportTypes : []),
    answers.schoolSupportOther?.trim(),
  ].filter(Boolean).join(' · ')
  const reinforcementDetails = (Array.isArray(answers.reinforcementActivities) ? answers.reinforcementActivities : [])
    .map((activity) => [activity?.activity?.trim(), activity?.hours ? `${activity.hours} h/setmana` : ''].filter(Boolean).join(' · '))
    .filter(Boolean)
    .join('\n')

  return [
    answers.healthSituation === 'yes' && {
      detail: answers.healthDetails?.trim() || 'Ha indicat que sí, però no ha afegit cap detall.',
      id: 'health',
      label: 'Situació de salut indicada',
      tone: 'danger',
    },
    answers.healthSituation === 'talk' && {
      detail: 'Ha triat «Prefereixo parlar-ne personalment» a la pregunta sobre salut o al·lèrgies.',
      id: 'health-talk',
      label: 'Vol parlar personalment sobre salut',
      tone: 'amber',
    },
    answers.medicalPlan === 'yes' && {
      detail: answers.medicalPlanDetails?.trim() || 'Ha indicat que hi ha una pauta, medicació o informe vigent, però no n’ha afegit cap detall.',
      id: 'medical',
      label: 'Pauta o informe vigent',
      tone: 'danger',
    },
    answers.medicalPlan === 'unknown' && {
      detail: 'Ha respost «No ho sé» a la pregunta sobre pauta mèdica, medicació o informe vigent.',
      id: 'medical-unknown',
      label: 'Cal aclarir la informació mèdica',
      tone: 'amber',
    },
    answers.currentSupports?.includes('Prefereixo no respondre') && {
      detail: 'Ha triat «Prefereixo no respondre» a la pregunta sobre suports o seguiments actuals.',
      id: 'support-private',
      label: 'Prefereix parlar dels suports personalment',
      tone: 'amber',
    },
    answers.currentSupports?.length > 0 &&
      !answers.currentSupports.includes('Cap') &&
      !answers.currentSupports.includes('Prefereixo no respondre') && {
        detail: supportDetails || 'Ha indicat que rep suport o seguiment, però no n’ha concretat el tipus.',
        id: 'support',
        label: 'Rep suport o seguiment',
        tone: 'amber',
      },
    answers.familySituation === 'explain' && {
      detail: answers.familySituationDetails?.trim() || 'Ha indicat que hi ha una situació familiar rellevant, però no n’ha afegit cap explicació.',
      id: 'family',
      label: 'Situació familiar rellevant',
      tone: 'amber',
    },
    answers.familySituation === 'talk' && {
      detail: 'Ha triat «Prefereixo parlar-ne personalment» a la pregunta sobre la situació familiar.',
      id: 'family-talk',
      label: 'Vol parlar personalment de la situació familiar',
      tone: 'amber',
    },
    answers.repeatedCourse === 'yes' && {
      detail: answers.repeatedCourseDetails?.trim() || 'Ha indicat que ha repetit algun curs, però no ha concretat quin.',
      id: 'repeat',
      label: 'Ha repetit curs',
      tone: 'blue',
    },
    answers.previousSchoolSupport === 'yes' && {
      detail: schoolSupportDetails || 'Ha indicat que ha rebut suport escolar, però no n’ha concretat el tipus.',
      id: 'school-support',
      label: 'Ha rebut suport escolar',
      tone: 'blue',
    },
    answers.reinforcementActivities?.length > 0 && {
      detail: reinforcementDetails || 'Ha indicat que fa reforç escolar, però no n’ha concretat l’activitat.',
      id: 'reinforcement',
      label: 'Fa reforç escolar',
      tone: 'blue',
    },
    answers.homeDeviceAccess === 'no' && {
      id: 'no-home-device',
      label: 'No disposa de cap dispositiu per estudiar a casa',
      tone: 'amber',
    },
  ].filter(Boolean)
}
