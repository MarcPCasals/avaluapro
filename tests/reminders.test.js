import test from 'node:test'
import assert from 'node:assert/strict'
import { getLocalToday, getPendingRecoverySummary, getPendingReminderSummary, getSessionPersonalReminders, reminderMatchesFocus } from '../src/lib/reminders.js'
import { getTaskDeliveryAlerts } from '../src/lib/taskDeliveryAlerts.js'

test('un acces contextual mostra nomes els recordatoris seleccionats', () => {
  assert.equal(reminderMatchesFocus('agenda_1', []), true)
  assert.equal(reminderMatchesFocus('agenda_1', ['agenda_1']), true)
  assert.equal(reminderMatchesFocus('agenda_2', ['agenda_1']), false)
  assert.equal(reminderMatchesFocus('coordination_3', ['coordination_3']), true)
})

const baseReminder = {
  classId: '1d',
  id: 'reminder-1',
  reminder: {
    date: '2026-09-23',
    dismissedAt: '',
    text: 'Portar gots de plàstic',
    time: '11:00',
  },
  text: 'Portar gots de plàstic',
  type: 'generalReminder',
}

test('Mode aula mostra un recordatori vinculat directament a la sessio', () => {
  const result = getSessionPersonalReminders([
    { ...baseReminder, sessionId: 'session-1' },
  ], {
    classId: '1d',
    id: 'session-1',
    startsAt: '2026-09-23T11:00:00',
  })

  assert.equal(result.length, 1)
  assert.equal(result[0].text, 'Portar gots de plàstic')
})

test('Mode aula no mostra un recordatori vinculat a una altra sessio', () => {
  const result = getSessionPersonalReminders([
    { ...baseReminder, sessionId: 'session-2' },
  ], {
    classId: '1d',
    id: 'session-1',
    startsAt: '2026-09-23T11:00:00',
  })

  assert.equal(result.length, 0)
})

test('el vincle sobreviu quan una franja de l horari rep una sessio programada', () => {
  const result = getSessionPersonalReminders([
    { ...baseReminder, sessionId: 'timetable_2026-09-23_wednesday', timetableSlotId: 'wednesday' },
  ], {
    classId: '1d',
    id: 'new-programmed-session',
    startsAt: '2026-09-23T11:00:00',
    timetableSlotId: 'wednesday',
  })

  assert.equal(result.length, 1)
})

test('un recordatori de Tutoria apareix al Mode aula del grup que comparteix la franja', () => {
  const result = getSessionPersonalReminders([
    {
      ...baseReminder,
      classId: 'tutoria',
      reminder: { date: '2026-09-23', dismissedAt: '', text: 'Portar autorització', time: '13:00' },
      sessionId: 'timetable_2026-09-23_wednesday-tutoring',
      timetableSlotId: 'wednesday-tutoring',
    },
  ], {
    classId: '1c',
    id: 'timetable_2026-09-23_wednesday-tutoring',
    startsAt: '2026-09-23T13:00:00',
    timetableSlotId: 'wednesday-tutoring',
  })

  assert.equal(result.length, 1)
  assert.equal(result[0].reminder.text, 'Portar autorització')
})

test('els recordatoris completats deixen de sortir al Mode aula', () => {
  const result = getSessionPersonalReminders([
    {
      ...baseReminder,
      reminder: { ...baseReminder.reminder, dismissedAt: '2026-09-23T12:00:00.000Z' },
      sessionId: 'session-1',
    },
  ], {
    classId: '1d',
    id: 'session-1',
    startsAt: '2026-09-23T11:00:00',
  })

  assert.equal(result.length, 0)
})


test('les recuperacions no sumen a la bombolla ni als avisos personals, però conserven una safata pròpia', () => {
  const data = {
    agendaNotes: [
      { ...baseReminder, id: 'personal' },
      { id: 'recovery', type: 'activityRecovery', studentId: 'synthetic-student', recovery: { status: 'pending' }, reminder: { date: '2000-01-01' } },
    ],
    tasks: [{ id: 'task', title: 'Tasca' }],
    taskRecords: [{ id: 'linked', taskId: 'task', recoveryPending: true, recoveryNoteId: 'recovery', reminder: { date: '2000-01-01' } }],
  }
  const summary = getPendingReminderSummary(data)
  assert.equal(summary.count, 1)
  assert.equal(summary.dueCount, 1)
  assert.deepEqual(summary.items.map(item => item.id), ['agenda_personal'])
  assert.equal(getPendingRecoverySummary(data).count, 1)
})

test('completar el correu no amaga una recuperació pendent; completar la recuperació sí', () => {
  const note = { id: 'recovery', type: 'activityRecovery', recovery: { status: 'pending' }, reminder: { date: '2000-01-01', dismissedAt: '2026-10-10T09:00:00Z' } }
  assert.equal(getPendingRecoverySummary({ agendaNotes: [note] }).count, 1)
  assert.equal(getPendingReminderSummary({ agendaNotes: [note] }).count, 0)
  assert.equal(getPendingRecoverySummary({ agendaNotes: [{ ...note, recovery: { status: 'completed' } }] }).count, 0)
  assert.equal(getPendingRecoverySummary({ agendaNotes: [{ ...note, recovery: { status: 'none' } }] }).count, 0)
})

test('els avisos d absència prevista queden assignats a l alumne i desapareixen en enviar la feina', () => {
  const student = { id: 'synthetic-1', classId: 'class-1', name: 'Prova, Alumna', plannedAbsences: [{
    id: 'period-1', startsOn: '2099-12-10', endsOn: '2099-12-12', sentAt: null,
    reminderStates: { week: { dismissedAt: '2099-12-02T09:00:00Z' } },
  }] }
  const summary = getPendingReminderSummary({ students: [student], classes: [{ id: 'class-1', name: 'Grup 1' }] })
  assert.deepEqual(summary.items.map((item) => item.id), ['planned_absence_synthetic-1_period-1_day'])
  assert.equal(summary.items[0].student.name, 'Prova, Alumna')
  assert.equal(summary.items[0].classItem.name, 'Grup 1')
  assert.equal(getPendingReminderSummary({ students: [{ ...student, plannedAbsences: [{ ...student.plannedAbsences[0], sentAt: '2099-12-03T09:00:00Z' }] }] }).count, 0)
})

test('la tasca lliure genera un avís de lliurament només el dia assignat', () => {
  const date = '2026-11-25'
  const freeTask = { id: 'free', classId: 'class-1', title: 'Dossier de prova', date }
  const tasks = [
    freeTask,
    { ...freeTask, id: 'classroom', source: 'classroom' },
    { ...freeTask, id: 'explicit', reminder: { date, text: 'Avisar' } },
    { ...freeTask, id: 'dismissed', deliveryAlert: { date, dismissedAt: '2026-11-25T09:00:00Z' } },
  ]
  assert.deepEqual(getTaskDeliveryAlerts(tasks, date).map((item) => item.id), ['delivery_free'])
  assert.equal(getTaskDeliveryAlerts(tasks, '2026-11-26').length, 0)
  const summary = getPendingReminderSummary({ tasks: [{ ...freeTask, date: getLocalToday() }] })
  assert.equal(summary.items[0]?.kind, 'delivery')
  assert.equal(summary.dueCount, 1)
})

test('canviar la data de la tasca reactiva el seu avís de lliurament', () => {
  const task = { id: 'free', title: 'Dossier', date: '2026-11-26', deliveryAlert: {
    date: '2026-11-25', dismissedAt: '2026-11-25T09:00:00Z', snoozeUntil: '',
  } }
  assert.equal(getTaskDeliveryAlerts([task], '2026-11-26').length, 1)
})
