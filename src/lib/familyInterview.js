export const FAMILY_INTERVIEW_TOPICS = [
  { id: 'learning', label: 'Aprenentatge' },
  { id: 'habits', label: 'Hàbits i organització' },
  { id: 'attendance', label: 'Assistència' },
  { id: 'wellbeing', label: 'Benestar' },
  { id: 'relationships', label: 'Convivència i relacions' },
  { id: 'support', label: 'Mesures i suports' },
  { id: 'guidance', label: 'Orientació' },
  { id: 'other', label: 'Altres' },
]

export function createFamilyInterviewDraft() {
  return {
    familyCommitments: '',
    familyView: '',
    objective: '',
    other: '',
    schoolCommitments: '',
    schoolView: '',
    strengths: '',
    studentCommitments: '',
    studentVoice: '',
    topics: [],
  }
}

function clean(value) {
  return String(value || '').trim()
}

/**
 * Converteix la plantilla guiada en una sola anotació del registre tutorial.
 * D'aquesta manera, la reunió continua utilitzant `tutorialRecords` i no crea
 * una segona base de dades que pugui divergir de la cronologia de l'alumne.
 */
export function buildFamilyInterviewNote(draft = {}) {
  const topicLabels = (draft.topics || [])
    .map((topicId) => FAMILY_INTERVIEW_TOPICS.find((topic) => topic.id === topicId)?.label)
    .filter(Boolean)
  const sections = [
    ['TEMES TRACTATS', topicLabels.join(' · ')],
    ['MOTIU I OBJECTIU', draft.objective],
    ['FORTALESES I EVOLUCIÓ POSITIVA', draft.strengths],
    ['MIRADA DEL CENTRE', draft.schoolView],
    ['APORTACIONS DE LA FAMÍLIA', draft.familyView],
    ['VEU DE L’ALUMNE', draft.studentVoice],
    ['ACORDS DEL TUTOR O DEL CENTRE', draft.schoolCommitments],
    ['ACORDS DE LA FAMÍLIA', draft.familyCommitments],
    ['ACORDS DE L’ALUMNE', draft.studentCommitments],
    ['ALTRES INFORMACIONS RELLEVANTS', draft.other],
  ]

  return sections
    .map(([heading, value]) => [heading, clean(value)])
    .filter(([, value]) => value)
    .map(([heading, value]) => `${heading}\n${value}`)
    .join('\n\n')
}

