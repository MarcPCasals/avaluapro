function normalizeLabel(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase()
}

function orderedTemporalUnits(temporalUnits = []) {
  return [...temporalUnits].sort((left, right) =>
    String(left.startsOn || '').localeCompare(String(right.startsOn || ''))
      || Number(left.order || 0) - Number(right.order || 0))
}

export function findCurrentTemporalUnit(temporalUnits = [], today = '') {
  const ordered = orderedTemporalUnits(temporalUnits)
  if (ordered.length === 0) return null
  const direct = ordered.find((unit) => unit.startsOn <= today && unit.endsOn >= today)
  if (direct) return direct
  return ordered.find((unit) => unit.startsOn > today) || ordered.at(-1)
}

export function getClassUtsInCourseOrder({ classId, semesters = [], uts = [] }) {
  const classSemesters = semesters
    .filter((semester) => semester.classId === classId)
    .sort((left, right) => Number(left.order || 0) - Number(right.order || 0))
  const semesterOrder = new Map(classSemesters.map((semester, index) => [semester.id, index]))
  return uts
    .filter((ut) => ut.classId === classId && semesterOrder.has(ut.semesterId))
    .sort((left, right) =>
      (semesterOrder.get(left.semesterId) ?? 999) - (semesterOrder.get(right.semesterId) ?? 999)
        || Number(left.order || 0) - Number(right.order || 0)
        || String(left.name || '').localeCompare(String(right.name || ''), 'ca'))
}

/**
 * Relaciona les UT d'avaluació amb les dates úniques de Programació. El nom
 * és la clau principal ("UT1" i "UT 1" equivalen) i l'ordre només actua com
 * a recurs per a cursos antics que tinguin noms personalitzats.
 */
export function matchClassUtsToTemporalUnits({ classId, semesters = [], temporalUnits = [], uts = [] }) {
  const classUts = getClassUtsInCourseOrder({ classId, semesters, uts })
  const orderedPlanningUnits = orderedTemporalUnits(temporalUnits)
  const planningByLabel = new Map(orderedPlanningUnits.map((unit) => [normalizeLabel(unit.label), unit]))
  return classUts.map((ut, index) => ({
    temporalUnit: planningByLabel.get(normalizeLabel(ut.name)) || orderedPlanningUnits[index] || null,
    ut,
  }))
}

export function findCurrentClassUt(options, today = '') {
  const currentTemporalUnit = findCurrentTemporalUnit(options.temporalUnits, today)
  if (!currentTemporalUnit) return null
  return matchClassUtsToTemporalUnits(options)
    .find((item) => item.temporalUnit?.id === currentTemporalUnit.id) || null
}
