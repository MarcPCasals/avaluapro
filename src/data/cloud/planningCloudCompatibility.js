import { PLANNING_ENTITY_TYPES } from '../../domain/planning/constants.js'

/**
 * Les activitats antigues de la cua no inclouen aquest camp. La seva absència
 * no és una ordre d'esborrar les seleccions curriculars ja desades al servidor.
 * Només afegim el camp absent; un valor explícit, inclòs [], es manté intacte.
 */
export function withPlanningCloudCompatibility(value, remoteValue = null) {
  if (value?.entityType !== PLANNING_ENTITY_TYPES.PLANNING_ACTIVITY
    || value.curriculumSelections !== undefined) return value
  return {
    ...value,
    curriculumSelections: Array.isArray(remoteValue?.curriculumSelections)
      ? remoteValue.curriculumSelections
      : [],
  }
}
