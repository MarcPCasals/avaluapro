export function buildClassroomTaskActivation({ tasks = [], taskRecords = [] }, input, idFactory) {
  if (!input.classId || !input.utId || !input.evidenceKey || !String(input.title || '').trim()) return null
  const existingTask = tasks.find((task) => task.classId === input.classId && task.evidenceKey === input.evidenceKey)
  const classTasks = tasks.filter((task) => task.classId === input.classId && task.utId === input.utId)
  const task = existingTask || {
    id: idFactory('task'),
    applicationId: input.applicationId,
    classId: input.classId,
    date: input.date,
    evidenceKey: input.evidenceKey,
    evidenceMode: input.evidenceMode,
    order: classTasks.length + 1,
    planningUnitId: input.planningUnitId,
    sessionId: input.sessionId,
    sessionItemId: input.sessionItemId,
    source: 'classroom',
    sourceActivityId: input.sourceActivityId,
    title: String(input.title).trim(),
    utId: input.utId,
  }
  const absentIds = new Set(input.absentStudentIds || [])
  const existingStudentIds = new Set(taskRecords
    .filter((record) => record.taskId === task.id)
    .map((record) => record.studentId))
  const records = (input.studentIds || [])
    .filter((studentId) => !existingStudentIds.has(studentId))
    .map((studentId) => ({
      id: idFactory('rec'),
      classId: input.classId,
      evidenceSource: 'classroom',
      sessionId: input.sessionId,
      studentId,
      taskId: task.id,
      status: absentIds.has(studentId) ? 'EXEMPT' : 'DONE',
      utId: input.utId,
    }))
  return { isNewTask: !existingTask, records, task }
}

/**
 * Reuneix les tasques que cal poder revisar durant una classe. Una tasca entra
 * al panell si neix d'una evidència de la sessió o si la seva data d'entrega
 * coincideix amb el dia de la classe. La clau per id evita duplicats quan es
 * compleixen les dues condicions alhora.
 */
export function getClassroomSessionTasks({ classId, date, evidenceKeys = [], tasks = [] }) {
  const evidenceKeySet = new Set(evidenceKeys)
  const matching = tasks.filter((task) => task.classId === classId && (
    (task.evidenceKey && evidenceKeySet.has(task.evidenceKey))
    || (task.date && task.date === date)
  ))
  return [...new Map(matching.map((task) => [task.id, task])).values()]
    .sort((left, right) => (left.order || 0) - (right.order || 0) || left.title.localeCompare(right.title, 'ca'))
}
