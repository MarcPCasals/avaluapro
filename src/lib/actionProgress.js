import { getActionGrade } from './actionGrades.js'
import { getSubjectStructure, transversalStructure } from '../data/subjects.js'
import { getCriterionActionKey, getEvaluationActionCatalog } from './evaluationActions.js'
import { getNumericFromGrade } from './grades.js'
import { getClassUts } from './studentEvaluation.js'
import { selectEvaluationCompetencies } from './transversalEvaluation.js'
import { isStudentExemptFromSubject } from './tutorialExemptions.js'

const levels = ['A', 'B', 'C', 'D', 'NA']
const average = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null

function buildTrend(cells) {
  const observed = cells.filter(cell => cell.evaluated > 0)
  if (observed.length < 2) return { kind: 'insufficient', count: 0, delta: null }
  const first = observed[0]
  const last = observed.at(-1)
  const initial = new Map(first.grades.map(item => [item.studentId, item.grade]))
  const paired = last.grades.filter(item => initial.has(item.studentId))
  // Compare the same students, so a changing number of graded students cannot create false progress.
  const delta = average(paired.map(item => getNumericFromGrade(item.grade) - getNumericFromGrade(initial.get(item.studentId))))
  return {
    kind: delta === null ? 'incomparable' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable',
    count: paired.length, delta, firstUt: first.ut, lastUt: last.ut,
  }
}

export function buildActionProgress(state, classId, { studentId, scope = 'specific' } = {}) {
  const classItem = state.classes.find(item => item.id === classId)
  if (!classItem) return { rows: [], uts: [], students: [], individual: Boolean(studentId) }
  const students = state.students.filter(student => student.classId === classId
    && (!studentId || student.id === studentId) && !isStudentExemptFromSubject(student, classItem.subject))
  const uts = getClassUts(state, classId)
  const catalog = getEvaluationActionCatalog(classItem, scope)
  const utCompetencies = new Map(uts.map(ut => [ut.id, selectEvaluationCompetencies(state, classItem, ut.id, scope)]))
  const metadata = new Map()
  const register = (competency, criterion) => {
    const key = getCriterionActionKey(competency, criterion)
    if (!metadata.has(key)) metadata.set(key, { key, competencyName: competency.name, criterionName: criterion.name })
  }
  const templates = scope === 'transversal' ? transversalStructure : getSubjectStructure(classItem.subject) || []
  templates.forEach(comp => comp.criteria.forEach(name => register(comp, { name })))
  uts.forEach(ut => utCompetencies.get(ut.id).forEach(comp => comp.criteria.forEach(criterion => register(comp, criterion))))
  const marks = new Map(state.marks.map(mark => [`${mark.studentId}\u0000${mark.criterionId}`, mark]))
  const rows = [...metadata.values()].flatMap(meta => (catalog[meta.key] || []).map(action => {
    const cells = uts.map(ut => {
      const criterion = utCompetencies.get(ut.id).flatMap(comp => comp.criteria.map(item => ({ comp, item })))
        .find(({ comp, item }) => getCriterionActionKey(comp, item) === meta.key)?.item
      const selected = Boolean(criterion?.selectedActionIds?.includes(action.id))
      const grades = selected ? students.flatMap(student => {
        const grade = getActionGrade(marks.get(`${student.id}\u0000${criterion.id}`), action.id)
        return grade ? [{ studentId: student.id, name: student.name, grade }] : []
      }) : []
      const distribution = Object.fromEntries(levels.map(level => [level, grades.filter(item => item.grade === level).length]))
      return {
        ut, selected, grades, distribution, evaluated: grades.length,
        pending: selected ? students.length - grades.length : 0,
        score: average(grades.map(item => getNumericFromGrade(item.grade))),
        achievedPercent: grades.length ? Math.round(100 * (distribution.A + distribution.B) / grades.length) : null,
      }
    })
    return {
      ...meta, action, id: `${meta.key}\u0000${action.id}`, cells,
      latest: cells.filter(cell => cell.evaluated > 0).at(-1) || null,
      selectedUtCount: cells.filter(cell => cell.selected).length,
      trend: buildTrend(cells),
    }
  }))
  return { rows, uts, students, individual: Boolean(studentId) }
}
