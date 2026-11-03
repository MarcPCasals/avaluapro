import { SEARCH_FEATURES, isTutoringClass } from './searchCatalog.js'

const ALIASES = { doips: 'doip', deuip: 'doip', deuips: 'doip', doib: 'doip', doibs: 'doip', alumnos: 'alumnes', alumno: 'alumne', notas: 'notes', horario: 'horari', configuracion: 'configuracio' }
const STOP_WORDS = new Set(['de', 'del', 'dels', 'la', 'les', 'el', 'els', 'un', 'una', 'a', 'al', 'amb', 'i', 'en', 'per', 'veure', 'buscar', 'cercar'])
export function normalizeSearch(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('ca')
    .replace(/[’']/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
    .split(/\s+/).map(word => ALIASES[word] || word).join(' ')
}
const words = (value) => normalizeSearch(value).split(' ').filter(word => word && !STOP_WORDS.has(word))
const plain = (value) => typeof value === 'string' ? value.replace(/<[^>]*>/g, ' ').trim() : ''
const textFields = (item, keys) => keys.map(key => plain(item?.[key])).filter(Boolean).join('\n\n')
const RECORD_LABELS = { doip: 'DOIP', 'family-contact': 'Entrevista / contacte familiar', 'student-interview': 'Entrevista amb l’alumne', 'team-information': 'Informació de l’equip educatiu', guidance: 'Orientació rebuda', agreement: 'Acord o mesura', 'other-tutorial': 'Informació tutorial', 'tutorial-observation': 'Observació tutorial', agenda: 'Nota a l’agenda', incident: 'Incidència', 'center-expulsion': 'Expulsió', 'classroom-expulsion': 'Expulsió d’aula' }

function indexEntry(entry) {
  return { ...entry, titleKey: normalizeSearch(entry.title), searchKey: normalizeSearch([entry.title, entry.path, entry.aliases, entry.text].filter(Boolean).join(' ')) }
}

/** Índex en memòria, exclusivament a partir de les dades proporcionades pel compte actiu. */
export function buildSearchIndex(data = {}, planningEntities = []) {
  const classes = data.classes || []
  const classesById = new Map(classes.map(item => [item.id, item]))
  const students = (data.students || []).filter(item => classesById.has(item.classId))
  const studentsById = new Map(students.map(item => [item.id, item]))
  const entries = []
  const add = (entry) => entries.push(indexEntry(entry))
  const classPath = (classId) => {
    const item = classesById.get(classId)
    return item ? [item.name, item.subject].filter(Boolean).join(' · ') : ''
  }
  for (const item of SEARCH_FEATURES) {
    const applicable = item.global ? [null] : classes.filter(group => !item.tutoring || isTutoringClass(group))
    // La configuració continua accessible en un compte sense cap classe.
    if (!classes.length && item.id === 'settings') applicable.push(null)
    for (const group of applicable) {
      add({ id: `feature:${item.id}:${group?.id || ''}`, kind: 'feature', title: item.label, path: [classPath(group?.id), item.path].filter(Boolean).join(' → '), aliases: item.aliases, classId: group?.id || '', target: { ...item.target, classId: group?.id || '' } })
    }
  }
  for (const student of students) {
    const group = classesById.get(student.classId)
    for (const item of SEARCH_FEATURES.filter(item => item.student && (!item.tutoring || isTutoringClass(group)))) {
      add({ id: `student:${item.id}:${student.id}`, kind: 'student', primaryStudent: item.id === 'students', title: `${student.name} · ${item.label}`, studentName: student.name, path: `${classPath(student.classId)} → ${item.path}`, aliases: item.aliases, classId: student.classId, target: { ...item.target, classId: student.classId, studentId: student.id } })
    }
    if (student.personalNotes) add({ id: `personal:${student.id}`, kind: 'content', title: `Notes personals · ${student.name}`, path: `${classPath(student.classId)} → Fitxa de l’alumne`, text: plain(student.personalNotes), classId: student.classId, target: { mode: 'students', action: 'profile', classId: student.classId, studentId: student.id }, source: { collection: 'students', id: student.id } })
  }
  const content = (collection, item, title, text, target, aliases = '') => {
    const student = studentsById.get(item.studentId)
    const classId = item.classId || student?.classId
    if (!classesById.has(classId) || (item.studentId && (!student || student.classId !== classId))) return
    add({ id: `${collection}:${item.id}`, kind: 'content', title: [title, student?.name].filter(Boolean).join(' · '), path: [classPath(classId), item.date, target.mode === 'tutoring' ? 'Seguiment tutorial' : target.mode === 'tracking' ? 'Seguiment' : 'Alumnes'].filter(Boolean).join(' → '), text, aliases, classId, target: { ...target, classId, studentId: student?.id, recordId: item.id, utId: ['tracking', 'evaluation'].includes(target.mode) ? item.utId : undefined }, source: { collection, id: item.id } })
  }
  for (const record of data.tutorialRecords || []) {
    const group = classesById.get(record.classId)
    const target = isTutoringClass(group)
      ? { mode: 'tutoring', panel: 'tracking', action: record.type === 'doip' ? 'doip' : 'registry', anchor: record.type === 'doip' ? 'tutoring-doip-card' : 'tutorial-registry' }
      : { mode: 'students', action: 'registry' }
    content('tutorialRecords', record, RECORD_LABELS[record.type] || 'Registre tutorial', textFields(record, ['note', 'contactPerson']), target, `${record.type} anotacio entrevista registre`)
  }
  for (const key of ['agendaNotes', 'behaviorEvents', 'taskRecords']) {
    for (const record of data[key] || []) {
      const text = [textFields(record, ['note', 'text', 'comment', 'description']), plain(record.reminder?.text)].filter(Boolean).join('\n\n')
      if (!text) continue
      if (record.type === 'generalReminder' || record.type === 'agendaReminder') {
        if (record.classId && !classesById.has(record.classId)) continue
        const student = studentsById.get(record.studentId)
        add({ id: `${key}:${record.id}`, kind: 'content', title: ['Recordatori', student?.name, record.text].filter(Boolean).join(' · '), path: [classPath(record.classId), record.reminder?.date, 'Recordatoris'].filter(Boolean).join(' → '), text, aliases: 'recordatori pendent', classId: record.classId || '', target: { topAction: 'reminders', classId: record.classId || '', focusedReminderIds: [`agenda_${record.id}`] }, source: { collection: key, id: record.id } })
        continue
      }
      const task = key === 'taskRecords' && (data.tasks || []).find(item => item.id === record.taskId)
      content(key, record, task?.name || task?.title || (key === 'agendaNotes' ? 'Nota a l’agenda' : key === 'behaviorEvents' ? 'Observació de classe' : 'Comentari de tasca'), text, { mode: 'tracking' }, 'anotacio comentari observacio')
    }
  }
  for (const task of data.tasks || []) content('tasks', task, task.name || task.title || 'Tasca', textFields(task, ['description', 'note', 'instructions']), { mode: 'tracking' }, 'tasca deures activitat')
  const competencies = new Map((data.competencies || []).map(item => [item.id, item]))
  for (const competency of competencies.values()) content('competencies', competency, competency.name || 'Competència', textFields(competency, ['description']), { mode: 'evaluation', action: 'structure' }, 'competencia criteri')
  for (const criterion of data.criteria || []) {
    const parent = competencies.get(criterion.competencyId)
    if (!parent) continue
    content('criteria', { ...criterion, classId: parent.classId, utId: parent.utId }, criterion.name || 'Criteri', textFields(criterion, ['description']), { mode: 'evaluation', action: 'structure' }, `${parent.name} criteri indicador`)
  }
  // Només entitats de planificació de la memòria local de l'usuari actual.
  const units = new Map(planningEntities.filter(item => item.entityType === 'planningUnit').map(item => [item.id, item]))
  const applications = planningEntities.filter(item => item.entityType === 'groupApplication' && item.status !== 'archived' && classesById.has(item.classId))
  const planningTypes = { planningUnit: 'Unitat de programació', planningActivity: 'Activitat', planningPhase: 'Fase', planningPrivateNote: 'Nota de programació', calendarEvent: 'Esdeveniment', calendarSession: 'Sessió' }
  for (const item of planningEntities) {
    const label = planningTypes[item.entityType]
    if (!label) continue
    const unit = item.entityType === 'planningUnit' ? item : units.get(item.planningUnitId)
    const linked = applications.filter(application => application.planningUnitId === unit?.id).map(application => application.classId)
    const tutorialClasses = unit?.tutoringSpaceId ? classes.filter(group => group.sharedTutoringSpaceId === unit.tutoringSpaceId).map(group => group.id) : []
    const classIds = item.classId ? [item.classId] : item.classIds?.length ? item.classIds : tutorialClasses.length ? tutorialClasses : linked.length ? [...new Set(linked)] : ['']
    for (const classId of classIds) {
      if (classId && !classesById.has(classId)) continue
      const isAgenda = item.entityType === 'calendarEvent' || item.entityType === 'calendarSession'
      add({ id: `planning:${item.id}:${classId}`, kind: 'content', title: `${label} · ${item.title || item.name || unit?.title || unit?.name || 'Sense títol'}`, path: [classPath(classId), isAgenda ? 'Agenda' : 'Programació', unit?.title || unit?.name, item.date || item.startsOn].filter(Boolean).join(' → '), text: textFields(item, ['description', 'instructions', 'note', 'text', 'content', 'objectives', 'complexSituation', 'expectedProduct', 'reason', 'applicationComment']), aliases: label, classId, target: { mode: isAgenda ? 'agenda' : 'planning', view: 'week', classId, date: item.date || item.startsOn, tutoringSpaceId: unit?.tutoringSpaceId, planningUnitId: unit?.id, academicYearId: unit?.academicYearId || item.academicYearId, activityId: item.entityType === 'planningActivity' ? item.id : undefined }, source: { collection: 'planning', id: item.id } })
    }
  }
  return entries
}

export function searchEntries(index, query, activeClassId, limit = 36) {
  const queryWords = words(query)
  if (!queryWords.length) {
    const suggested = ['doip', 'tutorial-records', 'evaluation', 'students', 'planning', 'agenda', 'settings', 'new-class']
    return index.filter(entry => entry.kind === 'feature' && suggested.some(id => entry.id.startsWith(`feature:${id}:`)))
      .sort((a, b) => Number(b.classId === activeClassId) - Number(a.classId === activeClassId))
      .filter((entry, i, list) => list.findIndex(other => other.title === entry.title) === i).slice(0, 8)
  }
  return index.map(entry => {
    if (!queryWords.every(word => entry.searchKey.includes(word))) return null
    const titleMatches = queryWords.filter(word => entry.titleKey.includes(word)).length
    const score = titleMatches * 12 + (entry.classId === activeClassId ? 16 : 0) + (entry.kind === 'feature' ? 5 : entry.kind === 'student' ? 3 : 0) + (entry.primaryStudent ? 7 : 0) + (entry.titleKey === normalizeSearch(query) ? 35 : 0)
    return { ...entry, score }
  }).filter(Boolean).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'ca') || a.id.localeCompare(b.id)).slice(0, limit)
}

export function contentSnippet(text, query, maxLength = 160) {
  const value = String(text || '').replace(/\s+/g, ' ').trim()
  const tokens = words(query)
  // La posició normalitzada pot diferir lleument; el fragment continua sent text original.
  const at = tokens.map(word => normalizeSearch(value).indexOf(word)).filter(pos => pos >= 0).sort((a, b) => a - b)[0] || 0
  const start = Math.max(0, at - 45)
  return `${start ? '…' : ''}${value.slice(start, start + maxLength)}${value.length > start + maxLength ? '…' : ''}`
}
