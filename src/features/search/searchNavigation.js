import { isTutoringClass } from './searchCatalog.js'

/** Valida la identitat i la classe abans de canviar de pantalla. Mai resol alumnes pel nom. */
export function validateSearchTarget(state, target) {
  const group = target.classId && state.classes.find(item => item.id === target.classId)
  if (target.classId && !group) throw new Error('Aquesta classe ja no està disponible. Torna a cercar.')
  if (target.studentId && !state.students.some(item => item.id === target.studentId && item.classId === target.classId)) {
    throw new Error('Aquest alumne ja no està disponible en aquesta classe. Torna a cercar.')
  }
  if (target.mode === 'tutoring' && !isTutoringClass(group)) throw new Error('Selecciona un grup de tutoria per obrir aquest apartat.')
  if (target.utId && !state.uts.some(item => item.id === target.utId && item.classId === target.classId)) {
    throw new Error('La unitat temporal d’aquest resultat ja no està disponible.')
  }
}

export async function navigateToSearchTarget(store, target) {
  validateSearchTarget(store.getState(), target)
  if (target.classId && store.getState().ui.activeClassId !== target.classId) await store.getState().setActiveClass(target.classId)
  const state = store.getState()
  validateSearchTarget(state, target)
  if (target.utId) {
    const ut = state.uts.find(item => item.id === target.utId)
    if (ut.semesterId) state.setActiveSemester(ut.semesterId)
    state.setActiveUt(target.utId)
  }
  if (target.panel) state.setActiveTutoringPanel(target.panel)
  if (target.mode) state.setActiveMode(target.mode)
  if (target.mode === 'analytics') state.setActiveInsight('dashboard')
  state.requestSearchNavigation(target)
}
