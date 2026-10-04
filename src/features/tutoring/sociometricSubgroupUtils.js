export function getPositiveComponentMap(students, relations) {
  const adjacency = new Map(students.map((student) => [student.id, new Set()]))
  relations.forEach((relation) => {
    const source = relation.sourceStudentId
    const target = relation.targetStudentId
    if (!['friendship', 'positive'].includes(relation.type) || source === target || !adjacency.has(source) || !adjacency.has(target)) return
    adjacency.get(source).add(target)
    adjacency.get(target).add(source)
  })
  const components = new Map()
  students.forEach((student) => {
    if (components.has(student.id)) return
    const stack = [student.id]
    const members = new Set([student.id])
    while (stack.length) {
      adjacency.get(stack.pop()).forEach((id) => {
        if (!members.has(id)) { members.add(id); stack.push(id) }
      })
    }
    const key = JSON.stringify([...members].sort())
    members.forEach((id) => components.set(id, key))
  })
  return components
}

export function buildSocialSubgroups(students, relations) {
  const components = getPositiveComponentMap(students, relations.filter((relation) => relation.type === 'friendship'))
  const groups = new Map()
  students.forEach((student) => {
    const key = components.get(student.id)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(student)
  })
  return [...groups].filter(([, members]) => members.length >= 2)
    .map(([id, members]) => ({ id, members: [...members].sort((a, b) => a.name.localeCompare(b.name, 'ca')) }))
    .sort((a, b) => b.members.length - a.members.length || a.id.localeCompare(b.id))
}
