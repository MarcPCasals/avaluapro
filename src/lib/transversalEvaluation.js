import { transversalStructure } from '../data/subjects.js'

export function getTransversalNames(classItem) {
  return (classItem?.transversalCompetencyNames || []).filter(name =>
    transversalStructure.some(template => template.name === name),
  )
}

// Reuse PI/SG records where they already exist. New records belong to the
// transversal view so they cannot change the subject's overall grade.
export function buildTransversalStructure(state, classId, names, createId) {
  const classItem = state.classes.find(item => item.id === classId)
  if (!classItem) return null
  const selected = transversalStructure.filter(template => names.includes(template.name))
  const selectedNames = selected.map(template => template.name)
  const competencies = [...state.competencies]
  const criteria = [...state.criteria]
  let changed = JSON.stringify(classItem.transversalCompetencyNames) !== JSON.stringify(selectedNames)
  for (const ut of state.uts.filter(item => item.classId === classId)) {
    for (const template of selected) {
      const existing = competencies.find(item => item.utId === ut.id && item.name === template.name)
      if (existing) continue
      const id = createId('comp')
      competencies.push({ id, classId, utId: ut.id, kind: 'transversal', source: 'Transversals',
        name: template.name, color: template.color, order: transversalStructure.indexOf(template) + 1 })
      template.criteria.forEach((name, index) => criteria.push({
        id: createId('crit'), competencyId: id, name, order: index + 1,
        rubric: { A: '', B: '', C: '', D: '' },
      }))
      changed = true
    }
  }
  if (!changed) return null
  return { classes: state.classes.map(item => item.id === classId
    ? { ...item, transversalCompetencyNames: selectedNames } : item), competencies, criteria }
}

export function selectEvaluationCompetencies(state, classItem, utId, scope) {
  const names = getTransversalNames(classItem)
  const disabledNames = new Set(state.uts?.find(ut => ut.id === utId)?.disabledCompetencyNames || [])
  return state.competencies.filter(item => item.utId === utId && !item.inactive &&
    (scope === 'transversal' ? names.includes(item.name) : item.kind !== 'transversal' && !disabledNames.has(item.name)))
    .sort((a, b) => a.order - b.order)
    .map(item => ({ ...item, criteria: state.criteria.filter(criterion => criterion.competencyId === item.id)
      .sort((a, b) => a.order - b.order) }))
}
