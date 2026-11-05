export const STUDENT_INTERVIEW_TEMPLATE = [
  'Escola: Què t’està anant millor últimament? I què se t’està fent més difícil? Alguna assignatura o alguna feina en concret?',
  'Grup: Amb qui estàs més a gust a classe? Hi ha algun moment en què et sentis incòmode o fora de lloc?',
  'Com està: Fora de l’escola, com estàs? Hi ha alguna cosa que et preocupi o que vulguis que jo sàpiga?',
  'Tutors: Estàs a gust amb els tutors? Podem fer alguna cosa per ajudar-te?',
  'Tancament: Hi ha alguna cosa que jo pugui fer perquè estiguis millor a l’escola?',
].join('\n\n')

export function addStudentInterviewTemplate(note) {
  const currentNote = note.trim()
  if (currentNote.includes(STUDENT_INTERVIEW_TEMPLATE)) return note
  return currentNote ? `${currentNote}\n\n${STUDENT_INTERVIEW_TEMPLATE}` : STUDENT_INTERVIEW_TEMPLATE
}
