import fs from 'node:fs'
import path from 'node:path'

const [, , V2_INPUT, TRACKING_INPUT, OUTPUT] = process.argv

function usage() {
  console.error(
    'Ús: node scripts/merge-v1-tracking-backup.mjs <avaluapro-v2.json> <seguidor-v1.json> [sortida-integrada.json]',
  )
  process.exit(1)
}

if (!V2_INPUT || !TRACKING_INPUT) usage()

const outputPath =
  OUTPUT ||
  path.join(
    path.dirname(V2_INPUT),
    `AvaluaproV2_integrat_${new Date().toISOString().slice(0, 10)}.json`,
  )

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .replaceAll(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
}

function makeId(...parts) {
  return parts
    .filter(Boolean)
    .join('_')
    .replaceAll(/[^a-zA-Z0-9_-]/g, '_')
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function getCollections(backup) {
  return backup.collections || backup.dataset || backup
}

function findClass(collections, trackingClass) {
  const target = normalizeText(trackingClass.name)
  return collections.classes.find((classItem) => normalizeText(classItem.name) === target)
}

function buildStudentMap(collections, classId, trackingStudents) {
  const v2Students = collections.students.filter((student) => student.classId === classId)
  const byName = new Map(v2Students.map((student) => [normalizeText(student.name), student]))
  return new Map(
    trackingStudents
      .map((student) => [student.id, byName.get(normalizeText(student.name))])
      .filter(([, student]) => Boolean(student)),
  )
}

function findUt(collections, classId, trackingUtId, trackingTaskDate) {
  const classUts = collections.uts.filter((ut) => ut.classId === classId)
  const normalizedTrackingUt = normalizeText(trackingUtId)
  const numericUt = normalizedTrackingUt.match(/^ut([1-4])$/)?.[1]
  if (numericUt) {
    const match = classUts.find((ut) => normalizeText(ut.name) === `ut${numericUt}`)
    if (match) return match
  }

  const sameName = classUts.find((ut) => normalizeText(ut.name) === normalizedTrackingUt)
  if (sameName) return sameName

  const transversals = classUts.filter((ut) => normalizeText(ut.name) === 'transversals')
  if (transversals.length) {
    const taskYear = Number(String(trackingTaskDate || '').slice(5, 7))
    return transversals[taskYear >= 2 ? transversals.length - 1 : 0] || transversals[0]
  }

  return classUts[0]
}

function mergeTracking(v2Backup, trackingBackup) {
  const merged = clone(v2Backup)
  const collections = getCollections(merged)
  const report = {
    classesMatched: 0,
    studentsMatched: 0,
    studentsUnmatched: [],
    tasksImported: 0,
    taskRecordsImported: 0,
    behaviorEventsImported: 0,
    agendaNotesImported: 0,
    preservedLegacyFields: {
      penalties: 0,
      studentLinks: 0,
      cellNotes: 0,
      reminders: 0,
    },
  }

  const existingTaskIds = new Set(collections.tasks.map((task) => task.id))
  const existingRecordIds = new Set(collections.taskRecords.map((record) => record.id))
  const existingBehaviorIds = new Set(collections.behaviorEvents.map((event) => event.id))
  const existingNoteIds = new Set(collections.agendaNotes.map((note) => note.id))

  trackingBackup.classes.forEach((trackingClass) => {
    const classData = trackingBackup.data?.[trackingClass.id]
    if (!classData) return

    const v2Class = findClass(collections, trackingClass)
    if (!v2Class) {
      report.studentsUnmatched.push({ className: trackingClass.name, reason: 'classe no trobada' })
      return
    }

    report.classesMatched += 1
    const studentMap = buildStudentMap(collections, v2Class.id, classData.students || [])
    report.studentsMatched += studentMap.size
    classData.students
      ?.filter((student) => !studentMap.has(student.id))
      .forEach((student) => report.studentsUnmatched.push({ className: trackingClass.name, studentName: student.name }))

    const taskIdMap = new Map()
    ;(classData.tasks || []).forEach((task, taskIndex) => {
      const v2Ut = findUt(collections, v2Class.id, task.utId, task.date)
      if (!v2Ut) return
      const taskId = makeId('v1trackingtask', trackingClass.id, task.id)
      taskIdMap.set(task.id, taskId)
      if (!existingTaskIds.has(taskId)) {
        collections.tasks.push({
          id: taskId,
          classId: v2Class.id,
          utId: v2Ut.id,
          title: task.title || `Tasca ${taskIndex + 1}`,
          date: task.date || '',
          order: taskIndex + 1,
          source: 'Seguidor V1',
          legacyTrackingUtId: task.utId || '',
        })
        existingTaskIds.add(taskId)
        report.tasksImported += 1
      }
    })

    Object.entries(classData.records || {}).forEach(([recordKey, status]) => {
      const separator = recordKey.lastIndexOf('_')
      if (separator === -1) return
      const trackingStudentId = recordKey.slice(0, separator)
      const trackingTaskId = recordKey.slice(separator + 1)
      const student = studentMap.get(trackingStudentId)
      const taskId = taskIdMap.get(trackingTaskId)
      if (!student || !taskId) return

      const task = collections.tasks.find((item) => item.id === taskId)
      if (!task) return

      const recordId = makeId('v1trackingrec', trackingClass.id, recordKey)
      if (existingRecordIds.has(recordId)) return
      collections.taskRecords.push({
        id: recordId,
        classId: v2Class.id,
        utId: task.utId,
        studentId: student.id,
        taskId,
        status,
        source: 'Seguidor V1',
      })
      existingRecordIds.add(recordId)
      report.taskRecordsImported += 1
    })

    Object.entries(classData.penalties || {}).forEach(([trackingStudentId, penaltyCount]) => {
      const student = studentMap.get(trackingStudentId)
      if (!student || !penaltyCount) return
      student.legacyTrackingPenaltyCount = penaltyCount
      report.preservedLegacyFields.penalties += 1
    })

    Object.entries(classData.studentLinks || {}).forEach(([trackingStudentId, link]) => {
      const student = studentMap.get(trackingStudentId)
      if (!student || !link) return
      student.personalNotes = [student.personalNotes, `Enllaç del Seguidor V1: ${link}`].filter(Boolean).join('\n\n')
      report.preservedLegacyFields.studentLinks += 1
    })

    Object.entries(classData.cellNotes || {}).forEach(([recordKey, text]) => {
      const separator = recordKey.lastIndexOf('_')
      if (separator === -1 || !text) return
      const trackingStudentId = recordKey.slice(0, separator)
      const trackingTaskId = recordKey.slice(separator + 1)
      const student = studentMap.get(trackingStudentId)
      const taskId = taskIdMap.get(trackingTaskId)
      const record = collections.taskRecords.find((item) => item.studentId === student?.id && item.taskId === taskId)
      if (!record) return
      record.note = [record.note, text].filter(Boolean).join('\n')
      report.preservedLegacyFields.cellNotes += 1
    })

    ;(classData.reminders || []).forEach((reminder, reminderIndex) => {
      const taskId = taskIdMap.get(reminder.taskId)
      const task = collections.tasks.find((item) => item.id === taskId)
      const student = reminder.studentId ? studentMap.get(reminder.studentId) : null
      if (!task) return
      if (student) {
        const record =
          collections.taskRecords.find((item) => item.studentId === student.id && item.taskId === task.id) ||
          {
            id: makeId('v1trackingreminderrec', trackingClass.id, reminder.taskId, reminder.studentId, reminderIndex),
            classId: v2Class.id,
            utId: task.utId,
            studentId: student.id,
            taskId: task.id,
            status: '',
            source: 'Seguidor V1',
          }
        record.reminder = { date: reminder.date || '', text: reminder.text || '' }
        if (!collections.taskRecords.includes(record)) collections.taskRecords.push(record)
      } else {
        task.reminder = { date: reminder.date || '', text: reminder.text || '' }
      }
      report.preservedLegacyFields.reminders += 1
    })

    Object.entries(classData.behaviorLogs || {}).forEach(([trackingStudentId, logs]) => {
      const student = studentMap.get(trackingStudentId)
      if (!student || !Array.isArray(logs)) return
      logs.forEach((log, index) => {
        const eventId = makeId('v1trackingbeh', trackingClass.id, trackingStudentId, index, log.date)
        if (existingBehaviorIds.has(eventId)) return
        collections.behaviorEvents.push({
          id: eventId,
          classId: v2Class.id,
          studentId: student.id,
          type: log.type === 'incident' ? 'incident' : 'positive',
          text: log.text || log.note || 'Entrada importada del Seguidor V1',
          date: log.date || new Date().toISOString().slice(0, 10),
          source: 'Seguidor V1',
        })
        existingBehaviorIds.add(eventId)
        report.behaviorEventsImported += 1
      })
    })

    Object.entries(classData.agendaNotes || {}).forEach(([trackingStudentId, text]) => {
      const student = studentMap.get(trackingStudentId)
      if (!student || !text) return
      const noteId = makeId('v1trackingagenda', trackingClass.id, trackingStudentId)
      if (existingNoteIds.has(noteId)) return
      collections.agendaNotes.push({
        id: noteId,
        classId: v2Class.id,
        studentId: student.id,
        type: 'tracking',
        text,
        date: new Date().toISOString().slice(0, 10),
        source: 'Seguidor V1',
      })
      existingNoteIds.add(noteId)
      report.agendaNotesImported += 1
    })
  })

  merged.exportedAt = new Date().toISOString()
  merged.migration = {
    ...(merged.migration || {}),
    trackingV1: {
      sourceFile: path.basename(TRACKING_INPUT),
      mergedAt: new Date().toISOString(),
      report,
    },
  }

  return { merged, report }
}

const v2Backup = JSON.parse(fs.readFileSync(V2_INPUT, 'utf8'))
const trackingBackup = JSON.parse(fs.readFileSync(TRACKING_INPUT, 'utf8'))
const { merged, report } = mergeTracking(v2Backup, trackingBackup)

fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2))

const collections = getCollections(merged)
const summary = Object.fromEntries(
  Object.entries(collections).map(([collection, rows]) => [collection, Array.isArray(rows) ? rows.length : 0]),
)

console.log(JSON.stringify({ output: outputPath, summary, report }, null, 2))
