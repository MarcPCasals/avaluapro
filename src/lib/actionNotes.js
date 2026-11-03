import { getCriterionActionKey } from './evaluationActions.js'
import { getClassUts } from './studentEvaluation.js'

export function buildActionNoteMark({ existing, studentId, criterionId, action, text, orientation, updatedAt, createId }) {
  if (typeof text !== 'string' || text.length > 4000) throw new Error('El comentari ha de tenir com a màxim 4.000 caràcters.')
  const actionNotes = { ...existing?.actionNotes }
  const content = text.trim()
  if (content) {
    actionNotes[action.id] = { text: content, orientation: Boolean(orientation), description: action.description, updatedAt }
  } else {
    delete actionNotes[action.id]
  }
  if (!existing && !content) return null
  return { id: existing?.id || createId('mark'), studentId, criterionId, value: '', ...existing, actionNotes }
}

export function listStudentActionNotes({ marks, criteria, competencies, uts, classes = [] }, studentId) {
  const byId = items => new Map(items.map(item => [item.id, item]))
  const criterionMap = byId(criteria)
  const competencyMap = byId(competencies)
  const utMap = byId(uts)
  const classMap = byId(classes)
  return marks.flatMap(mark => {
    if (mark.studentId !== studentId || !mark.actionNotes) return []
    const criterion = criterionMap.get(mark.criterionId)
    const competency = competencyMap.get(criterion?.competencyId)
    const ut = utMap.get(competency?.utId)
    if (!criterion || !competency || !ut) return []
    return Object.entries(mark.actionNotes).filter(([, note]) => note?.text?.trim()).map(([actionId, note]) => ({
      ...note, actionId, criterionId: criterion.id, criterionName: criterion.name,
      criterionKey: getCriterionActionKey(competency, criterion), competencyName: competency.name,
      transversal: competency.kind === 'transversal', utId: ut.id, utName: ut.name, classId: ut.classId,
      className: classMap.get(ut.classId)?.name || '',
    }))
  }).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
}

export function getPreviousActionOrientations(context, studentId, competency, criterion, utId) {
  if (!context) return []
  const ut = context.uts.find(item => item.id === utId)
  if (!ut) return []
  const ordered = getClassUts(context, ut.classId)
  const index = ordered.findIndex(item => item.id === utId)
  if (index <= 0) return []
  const earlier = new Set(ordered.slice(0, index).map(item => item.id))
  const key = getCriterionActionKey(competency, criterion)
  return listStudentActionNotes(context, studentId).filter(note => note.orientation && earlier.has(note.utId)
    && note.criterionKey === key && note.transversal === (competency.kind === 'transversal'))
}
