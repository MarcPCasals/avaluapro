import test from 'node:test'
import assert from 'node:assert/strict'
import { getSessionPersonalReminders, reminderMatchesFocus } from '../src/lib/reminders.js'

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
