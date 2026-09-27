import { generateSafeAssistancePackage } from '../../data/adapters/generateSafeAssistancePackage.js'

export function buildSafeAssistanceExportSource(state = {}) {
  const classes = Array.isArray(state.classes) ? state.classes : []
  const students = Array.isArray(state.students) ? state.students : []
  const competencies = Array.isArray(state.competencies) ? state.competencies : []
  const criteria = Array.isArray(state.criteria) ? state.criteria : []
  const tasks = Array.isArray(state.tasks) ? state.tasks : []

  const criteriaByCompetency = new Map()
  criteria.forEach((criterion) => {
    const competencyCriteria = criteriaByCompetency.get(criterion.competencyId) || []
    competencyCriteria.push({ id: criterion.id })
    criteriaByCompetency.set(criterion.competencyId, competencyCriteria)
  })

  return {
    classes: classes.map((classItem) => ({
      id: classItem.id,
      isTutoringGroup: classItem.isTutoringGroup === true,
    })),
    students: students.map((student) => ({
      id: student.id,
      classId: student.classId,
    })),
    evaluationCompetencies: competencies.map((competency) => ({
      id: competency.id,
      criteria: criteriaByCompetency.get(competency.id) || [],
    })),
    trackingTasks: tasks.map((task) => ({
      id: task.id,
      classId: task.classId,
    })),
  }
}

export function prepareSafeAssistanceExport(state, randomOverrides) {
  return generateSafeAssistancePackage(buildSafeAssistanceExportSource(state), randomOverrides)
}
