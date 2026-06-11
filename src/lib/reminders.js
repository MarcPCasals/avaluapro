export function reminderDateTime(reminder = {}) {
  if (!reminder.date) return null
  return new Date(`${reminder.date}T${reminder.time || '00:00'}`)
}

export function getLocalToday() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function isPendingReminder(reminder = {}) {
  return Boolean(reminder.date && !reminder.dismissedAt)
}

function getReminderItems({ agendaNotes, classes, students, taskRecords, tasks }) {
  const classById = new Map(classes.map((classItem) => [classItem.id, classItem]))
  const studentById = new Map(students.map((student) => [student.id, student]))
  const taskById = new Map(tasks.map((task) => [task.id, task]))

  return [
    ...agendaNotes
      .filter((note) => ['agendaReminder', 'generalReminder'].includes(note.type) && isPendingReminder(note.reminder))
      .map((note) => {
        const student = studentById.get(note.studentId)
        const classItem = classById.get(note.classId)
        return {
          classItem,
          detail: student ? `Alumne: ${student.name}` : classItem ? `Grup: ${classItem.name}` : 'Recordatori general',
          id: `agenda_${note.id}`,
          kind: note.type === 'agendaReminder' ? 'agenda' : 'general',
          note,
          reminder: note.reminder,
          title: note.type === 'agendaReminder' ? 'Nota a l’agenda pendent' : note.text,
        }
      }),
    ...tasks
      .filter((task) => isPendingReminder(task.reminder))
      .map((task) => ({
        classItem: classById.get(task.classId),
        detail: `Tasca de grup: ${task.title}`,
        id: `task_${task.id}`,
        kind: 'task',
        reminder: task.reminder,
        task,
        title: task.reminder?.text || task.title,
      })),
    ...taskRecords
      .filter((record) => isPendingReminder(record.reminder))
      .map((record) => {
        const task = taskById.get(record.taskId)
        const student = studentById.get(record.studentId)
        return {
          classItem: classById.get(record.classId),
          detail: [student?.name, task?.title].filter(Boolean).join(' · '),
          id: `record_${record.id}`,
          kind: 'record',
          record,
          reminder: record.reminder,
          student,
          task,
          title: record.reminder?.text || 'Recordatori individual',
        }
      })
      .filter((item) => item.task),
  ].sort((a, b) => {
    const left = reminderDateTime(a.reminder)?.getTime() || 0
    const right = reminderDateTime(b.reminder)?.getTime() || 0
    return left - right
  })
}

export function getPendingReminderSummary({ agendaNotes = [], classes = [], students = [], taskRecords = [], tasks = [] }) {
  const items = getReminderItems({ agendaNotes, classes, students, taskRecords, tasks })
  const now = new Date()
  const today = getLocalToday()
  return {
    count: items.length,
    dueCount: items.filter((item) => {
      const dueAt = reminderDateTime(item.reminder)
      return dueAt && dueAt <= now
    }).length,
    hasTodayUpcoming: items.some((item) => {
      const dueAt = reminderDateTime(item.reminder)
      return item.reminder?.date === today && dueAt && dueAt > now
    }),
    items,
  }
}
