export const BALANCED_GENDERS = ['boy', 'girl']
export function countStudentGenders(students) {
  return students.reduce((counts, student) => {
    const key = BALANCED_GENDERS.includes(student.gender) ? student.gender : student.gender === 'other' ? 'other' : 'unknown'
    counts[key] += 1
    return counts
  }, { boy: 0, girl: 0, other: 0, unknown: 0 })
}
export function halfGroupGenderGap(students, assignments) {
  const a = countStudentGenders(students.filter((student) => assignments[student.id] === 'Grup A'))
  const b = countStudentGenders(students.filter((student) => assignments[student.id] === 'Grup B'))
  return BALANCED_GENDERS.reduce((gap, gender) => gap + Math.abs(a[gender] - b[gender]), 0)
}
export function studentRelationWarning(studentId, students, relations, assignments) {
  const ids = new Set(students.map((student) => student.id))
  const negative = relations.filter((relation) => relation.type === 'avoid' &&
    relation.sourceStudentId !== relation.targetStudentId && ids.has(relation.sourceStudentId) && ids.has(relation.targetStudentId) &&
    (relation.sourceStudentId === studentId || relation.targetStudentId === studentId))
  const internal = negative.filter((relation) => assignments[studentId] && assignments[relation.sourceStudentId] === assignments[relation.targetStudentId])
  return { tone: internal.length ? 'danger' : negative.length ? 'warning' : '', internal, negative }
}
