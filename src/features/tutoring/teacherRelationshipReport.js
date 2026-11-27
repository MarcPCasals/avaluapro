const TEACHER_SOURCE = 'teacher-observation'
const QUESTIONNAIRE_SOURCES = new Set(['sociometric-public-form', 'sociometric-questionnaire'])
const TYPES = ['positive', 'friendship', 'avoid']

export function buildTeacherRelationshipReport({ students = [], relations = [], includeQuestionnaire = false }) {
  const studentsById = new Map(students.map((student) => [student.id, student]))
  const selected = relations.filter((relation) => {
    if (!TYPES.includes(relation.type)) return false
    if (!studentsById.has(relation.sourceStudentId) || !studentsById.has(relation.targetStudentId)) return false
    if (relation.sourceStudentId === relation.targetStudentId) return false
    return !relation.source || relation.source === TEACHER_SOURCE ||
      (includeQuestionnaire && QUESTIONNAIRE_SOURCES.has(relation.source))
  })
  const order = (a, b) => a.name.localeCompare(b.name, 'ca')
  const rows = [...students].sort(order).map((student) => {
    const outgoing = selected.filter((relation) => relation.sourceStudentId === student.id)
    const group = (type) => outgoing.filter((relation) => relation.type === type).map((relation) => ({
      id: relation.id,
      name: studentsById.get(relation.targetStudentId).name,
      source: QUESTIONNAIRE_SOURCES.has(relation.source) ? 'Qüestionari' : 'Criteri docent',
    })).sort(order)
    return { student, work: group('positive'), social: group('friendship'), avoid: group('avoid') }
  })

  const pairGroups = { work: new Map(), social: new Map(), avoid: new Map() }
  selected.forEach((relation) => {
    const kind = relation.type === 'positive' ? 'work' : relation.type === 'friendship' ? 'social' : 'avoid'
    const ids = [relation.sourceStudentId, relation.targetStudentId].sort()
    const key = ids.join('::')
    const group = pairGroups[kind]
    const pair = group.get(key) || { ids, directions: new Set(), sources: new Set() }
    pair.directions.add(relation.sourceStudentId)
    pair.sources.add(QUESTIONNAIRE_SOURCES.has(relation.source) ? 'Qüestionari' : 'Criteri docent')
    group.set(key, pair)
  })
  const pairs = Object.fromEntries(Object.entries(pairGroups).map(([kind, group]) => [kind,
    [...group.values()].map((pair) => {
      const [first, second] = pair.ids.map((id) => studentsById.get(id).name)
      const mutual = pair.directions.size === 2
      const fromFirst = pair.directions.has(pair.ids[0])
      return {
        key: pair.ids.join('::'),
        label: mutual ? `${first} ↔ ${second}` : fromFirst ? `${first} → ${second}` : `${second} → ${first}`,
        sources: [...pair.sources].join(' + '),
      }
    }).sort((a, b) => a.label.localeCompare(b.label, 'ca')),
  ]))
  return {
    rows,
    pairs,
    relationCount: selected.length,
    teacherCount: selected.filter((relation) => !relation.source || relation.source === TEACHER_SOURCE).length,
    questionnaireCount: selected.filter((relation) => QUESTIONNAIRE_SOURCES.has(relation.source)).length,
  }
}
