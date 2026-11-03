// Resol pas a pas una destinació asíncrona; no consumeix la petició abans de carregar la UP.
export function getPlanningSearchStep(workspace, target) {
  if (target.previewOnly) return { kind: 'done' }
  const year = workspace.academicYears.find(item => item.id === target.academicYearId)
  if (year && year.id !== workspace.activeAcademicYearId) return { kind: 'year', id: year.id }
  if (workspace.loading || (workspace.activeAcademicYearId && workspace.loadedUnitsYearId !== workspace.activeAcademicYearId)) return { kind: 'wait' }
  if (!target.planningUnitId) {
    if (target.action === 'new-unit') return { kind: 'dialog', dialog: workspace.activeAcademicYearId ? workspace.temporalUnits.length ? 'unit' : 'ut' : 'year' }
    if (target.action) return workspace.activePlanningUnitId ? { kind: 'dialog', dialog: target.action } : { kind: 'error', message: 'Selecciona una unitat de programació per obrir aquest apartat.' }
    return { kind: 'done' }
  }
  if (!workspace.planningUnits.some(unit => unit.id === target.planningUnitId)) return { kind: 'error', message: 'Aquesta unitat ja no està disponible en aquest context de programació.' }
  if (!workspace.classPlanningUnits.some(unit => unit.id === target.planningUnitId)) return { kind: 'connect' }
  if (workspace.activePlanningUnitId !== target.planningUnitId) return { kind: 'unit', id: target.planningUnitId }
  if (workspace.loadedStructureId !== target.planningUnitId) return { kind: 'wait' }
  if (target.activityId) {
    const activity = workspace.activities.find(item => item.id === target.activityId)
    if (!activity) return { kind: 'error', message: 'Aquesta activitat ja no està disponible a la unitat.' }
    if (workspace.canEditActiveUnit) return { kind: 'activity', activity }
  }
  return { kind: 'dialog', dialog: 'preview' }
}
