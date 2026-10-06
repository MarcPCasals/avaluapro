import { HALF_GROUP_NAMES } from './halfGroupUtils.js'

export function hasCurrentHalfGroupRoster(students, assignments) {
  const ids = Object.keys(assignments || {})
  return ids.length === students.length && students.every((student) => ids.includes(student.id))
}

export function createHalfGroupProposal({ students, assignments, lockedIds = [], name, id, createdAt }) {
  if (!students.length || !hasCurrentHalfGroupRoster(students, assignments) || students.some((student) => !HALF_GROUP_NAMES.includes(assignments[student.id]))) {
    throw new Error('Cal assignar tots els alumnes actuals a A o B abans de desar la proposta.')
  }
  const sizeA = students.filter((student) => assignments[student.id] === HALF_GROUP_NAMES[0]).length
  if (Math.abs(sizeA - (students.length - sizeA)) > 1) throw new Error('Equilibra el nombre d’alumnes abans de desar la proposta.')
  const cleanName = String(name || '').trim()
  if (!cleanName) throw new Error('Posa un nom a la proposta.')
  return { id, name: cleanName.slice(0, 100), createdAt,
    assignments: Object.fromEntries(students.map((student) => [student.id, assignments[student.id]])),
    lockedIds: [...new Set(lockedIds)].filter((studentId) => students.some((student) => student.id === studentId)),
  }
}
