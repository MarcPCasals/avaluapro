import { PLANNING_ENTITY_TYPES } from '../../domain/planning/constants.js'

/**
 * Les activitats antigues de la cua no inclouen aquest camp. La seva absència
 * no és una ordre d'esborrar les seleccions curriculars ja desades al servidor.
 * Només afegim el camp absent; un valor explícit, inclòs [], es manté intacte.
 */
export function withPlanningCloudCompatibility(value, remoteValue = null) {
  if (value?.entityType !== PLANNING_ENTITY_TYPES.PLANNING_ACTIVITY) return value
  const missingFields = ['curriculumSelections', 'resourceSelections'].filter(field => value[field] === undefined
    && (field === 'curriculumSelections' || Array.isArray(remoteValue?.[field])))
  if (!missingFields.length) return value
  return {
    ...value,
    ...Object.fromEntries(missingFields.map(field => [field, Array.isArray(remoteValue?.[field]) ? remoteValue[field] : []])),
  }
}
