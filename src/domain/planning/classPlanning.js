/**
 * Retorna les aplicacions actives que connecten una UP amb classes concretes.
 * La connexió reutilitza l'entitat que ja fa servir l'Agenda, de manera que la
 * Programació i les sessions comparteixen una sola font pedagògica.
 */
export function getActivePlanningApplications(applications = [], planningUnitId = '') {
  return applications.filter((application) => (
    application.planningUnitId === planningUnitId
    && application.status !== 'archived'
  ))
}

export function getConnectedClassIds(applications = [], planningUnitId = '') {
  return [...new Set(getActivePlanningApplications(applications, planningUnitId)
    .map((application) => application.classId)
    .filter(Boolean))]
}

/**
 * Una classe només veu les UP que tenen una aplicació seva. Les UP antigues
 * sense grup continuen disponibles per connectar-les manualment, però no es
 * mostren per error a totes les classes.
 */
export function getPlanningUnitsForClass(planningUnits = [], applications = [], classId = '') {
  if (!classId) return []
  const connectedUnitIds = new Set(applications
    .filter((application) => application.classId === classId && application.status !== 'archived')
    .map((application) => application.planningUnitId))
  return planningUnits.filter((unit) => connectedUnitIds.has(unit.id))
}

export function getConnectablePlanningUnits(planningUnits = [], applications = [], classId = '') {
  const connectedIds = new Set(getPlanningUnitsForClass(planningUnits, applications, classId)
    .map((unit) => unit.id))
  return planningUnits.filter((unit) => unit.status !== 'archived' && !connectedIds.has(unit.id))
}

