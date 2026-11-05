export const STUDENT_INTERVIEW_ANSWER_LIMIT = 700
export const STUDENT_INTERVIEW_QUESTION_LIMIT = 250

const QUESTIONS = [
  { id: 'school', section: 'Escola', question: 'Què t’està anant millor últimament? I què se t’està fent més difícil? Alguna assignatura o alguna feina en concret?' },
  { id: 'group', section: 'Grup', question: 'Amb qui estàs més a gust a classe? Hi ha algun moment en què et sentis incòmode o fora de lloc?' },
  { id: 'wellbeing', section: 'Com està', question: 'Fora de l’escola, com estàs? Hi ha alguna cosa que et preocupi o que vulguis que jo sàpiga?' },
  { id: 'tutors', section: 'Tutors', question: 'Estàs a gust amb els tutors? Podem fer alguna cosa per ajudar-te?' },
  { id: 'closing', section: 'Tancament', question: 'Hi ha alguna cosa que jo pugui fer perquè estiguis millor a l’escola?' },
]

export function createStudentInterviewDraft() {
  return QUESTIONS.map((item) => ({ ...item, answer: '' }))
}

export function createCustomStudentInterviewQuestion() {
  return { id: `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`, section: 'Pregunta afegida', question: '', answer: '' }
}

export function prepareStudentInterview(questions, additionalNote = '') {
  const answered = questions
    .map((item) => ({
      section: String(item.section || 'Pregunta afegida').trim(),
      question: String(item.question || '').trim(),
      answer: String(item.answer || '').trim(),
    }))
    .filter((item) => item.question && item.answer)
  const cleanAdditionalNote = String(additionalNote || '').trim()
  const note = [
    ...answered.map((item) => `${item.section}\n${item.question}\nResposta: ${item.answer}`),
    cleanAdditionalNote ? `Nota addicional\n${cleanAdditionalNote}` : '',
  ].filter(Boolean).join('\n\n')
  return { note, studentInterview: { questions: answered, additionalNote: cleanAdditionalNote } }
}
