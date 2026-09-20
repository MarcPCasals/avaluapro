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
      .filter((note) => ['activityRecovery', 'agendaReminder', 'generalReminder'].includes(note.type)
        && isPendingReminder(note.reminder))
      .map((note) => {
        const student = studentById.get(note.studentId)
        const classItem = classById.get(note.classId)
        const kind = note.type === 'activityRecovery'
          ? 'recovery'
          : note.type === 'agendaReminder' ? 'agenda' : 'general'
        return {
          classItem,
          detail: student ? `Alumne: ${student.name}` : classItem ? `Grup: ${classItem.name}` : 'Recordatori general',
          id: `agenda_${note.id}`,
          kind,
          note,
          reminder: note.reminder,
          title: note.type === 'activityRecovery'
            ? 'Recuperació pendent'
            : note.type === 'agendaReminder' ? 'Nota a l’agenda pendent' : note.text,
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

/**
 * Els avisos que neixen dels materials d'una UP tenen el seu propi espai a
 * Programació. Així no fan créixer el comptador de recordatoris personals,
 * però continuen sent accionables i conserven l'historial de preparació.
 */
export function getPlanningReminderSummary({ agendaNotes = [], classes = [], planningUnitId = '' }) {
  const classById = new Map(classes.map((classItem) => [classItem.id, classItem]))
  const rawItems = agendaNotes
    .filter((note) => note.type === 'materialPreparation'
      && (!planningUnitId || note.planningUnitId === planningUnitId))
    .map((note) => {
      const completed = Boolean(note.preparation?.completedAt)
      const cancelled = Boolean(note.preparation?.cancelledAt)
      return {
        classItem: classById.get(note.classId),
        id: `planning_${note.id}`,
        note,
        reminder: note.reminder,
        status: cancelled ? 'cancelled' : completed ? 'completed' : 'pending',
        title: note.text || note.reminder?.text || 'Preparació pendent',
      }
    })

  // Una mateixa preparació pot provenir de més d'una activitat dins de la
  // mateixa sessió. A la interfície es presenta com una sola acció i es manté
  // la relació amb totes les notes originals per poder-les completar juntes.
  const groupedItems = new Map()
  rawItems.forEach((item) => {
    const visibleAction = String(item.title || '').trim().toLocaleLowerCase('ca')
    const groupKey = [
      item.note.classId,
      item.note.sessionId,
      visibleAction,
      item.reminder?.date,
    ].join(':')
    const current = groupedItems.get(groupKey)
    if (!current) {
      groupedItems.set(groupKey, { ...item, id: `planning_group_${groupKey}`, notes: [item.note] })
      return
    }
    current.notes.push(item.note)
    const activeNotes = current.notes.filter((note) => !note.preparation?.cancelledAt)
    current.status = activeNotes.length === 0
      ? 'cancelled'
      : activeNotes.every((note) => note.preparation?.completedAt) ? 'completed' : 'pending'
  })

  const items = [...groupedItems.values()]
    .sort((left, right) => {
      const statusOrder = { pending: 0, completed: 1, cancelled: 2 }
      return (statusOrder[left.status] ?? 9) - (statusOrder[right.status] ?? 9)
        || String(left.reminder?.date || '').localeCompare(String(right.reminder?.date || ''))
        || left.title.localeCompare(right.title, 'ca')
    })

  return {
    count: items.filter((item) => item.status === 'pending').length,
    items,
  }
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
