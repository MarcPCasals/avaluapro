import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  buildTutorialRecordFromCoordinationItem,
  getDueTutoringReminders,
  getOpenTutoringReminders,
  getPendingTutoringReminderAlerts,
  getUrgentTutoringMessages,
  getUnreadTutoringCoordinationItems,
  groupTutoringCoordinationItemsByStudent,
  hasTutoringReminderAcknowledgement,
  isCoordinationItemInTutorialRecords,
  mergeTutoringCoordinationItems,
} from '../src/lib/tutoringCoordination.js'

const items = [
  {
    authorUid: 'tutor-a',
    createdAt: '2026-09-15T08:00:00.000Z',
    id: 'message-1',
    kind: 'message',
    spaceId: 'space-1',
    status: 'sent',
  },
  {
    assigneeUid: 'all',
    authorUid: 'tutor-b',
    createdAt: '2026-09-15T09:00:00.000Z',
    dueAt: '2026-09-15T10:00:00.000Z',
    id: 'reminder-1',
    kind: 'reminder',
    spaceId: 'space-1',
    status: 'open',
  },
]

describe('coordinacio de cotutoria', () => {
  test('nomes compta com a no llegit el que ha creat l altre tutor despres de la lectura', () => {
    const unread = getUnreadTutoringCoordinationItems(
      items,
      [{ lastReadAt: '2026-09-15T08:30:00.000Z', spaceId: 'space-1', uid: 'tutor-a' }],
      'tutor-a',
    )
    assert.deepEqual(unread.map((item) => item.id), ['reminder-1'])
  })

  test('obrir la conversa no completa els recordatoris', () => {
    const open = getOpenTutoringReminders(items, 'tutor-a')
    assert.deepEqual(open.map((item) => item.id), ['reminder-1'])
  })

  test('un recordatori avisa dues hores abans independentment de si ja ha estat llegit', () => {
    const due = getDueTutoringReminders(items, 'tutor-a', new Date('2026-09-15T08:01:00.000Z'))
    assert.deepEqual(due.map((item) => item.id), ['reminder-1'])
  })

  test('el preavis acceptat reapareix com a recordatori definitiu dues hores abans', () => {
    const reminder = items[1]
    const preAlert = getPendingTutoringReminderAlerts(
      items,
      [],
      'tutor-a',
      new Date('2026-09-14T11:00:00.000Z'),
    )
    assert.deepEqual(preAlert.map((item) => [item.id, item.reminderStage]), [['reminder-1', 'pre']])

    const memberStates = [{
      lastReadAt: '',
      reminderAcknowledgements: {
        [`${reminder.id}:pre:${reminder.dueAt}`]: '2026-09-14T11:01:00.000Z',
      },
      spaceId: 'space-1',
      uid: 'tutor-a',
    }]
    assert.equal(
      getPendingTutoringReminderAlerts(items, memberStates, 'tutor-a', new Date('2026-09-14T12:00:00.000Z')).length,
      0,
    )
    assert.equal(hasTutoringReminderAcknowledgement(reminder, memberStates, 'tutor-a'), true)
    assert.equal(hasTutoringReminderAcknowledgement(reminder, memberStates, 'tutor-b'), false)
    const dueAlert = getPendingTutoringReminderAlerts(
      items,
      memberStates,
      'tutor-a',
      new Date('2026-09-15T08:01:00.000Z'),
    )
    assert.deepEqual(dueAlert.map((item) => [item.id, item.reminderStage]), [['reminder-1', 'due']])
    assert.equal(
      getPendingTutoringReminderAlerts(items, memberStates, 'tutor-b', new Date('2026-09-14T12:00:00.000Z')).length,
      1,
    )

    memberStates[0].reminderAcknowledgements[`${reminder.id}:due:${reminder.dueAt}`] =
      '2026-09-15T08:02:00.000Z'
    assert.equal(
      getPendingTutoringReminderAlerts(items, memberStates, 'tutor-a', new Date('2026-09-15T08:03:00.000Z')).length,
      0,
    )
  })

  test('els missatges urgents es recuperen del mes recent al mes antic', () => {
    const urgent = getUrgentTutoringMessages([
      { ...items[0], id: 'urgent-old', kind: 'urgent' },
      { ...items[0], createdAt: '2026-09-15T11:00:00.000Z', id: 'urgent-new', kind: 'urgent' },
      items[1],
    ])
    assert.deepEqual(urgent.map((item) => item.id), ['urgent-new', 'urgent-old'])
  })

  test('la versio local pendent preval fins que el nuvol confirma la mateixa operacio', () => {
    const merged = mergeTutoringCoordinationItems(
      [{ ...items[0], text: 'remot' }],
      [{ ...items[0], text: 'pendent' }],
    )
    assert.equal(merged[0].text, 'pendent')
    assert.equal(merged[0].syncStatus, 'pending')
  })

  test('agrupa cronologicament la historia de cada alumne i separa els missatges generals', () => {
    const grouped = groupTutoringCoordinationItemsByStudent(
      [
        { ...items[1], studentId: 'student-1' },
        { ...items[0], studentId: 'student-1' },
        { ...items[0], createdAt: '2026-09-15T10:00:00.000Z', id: 'general', studentId: '' },
        { ...items[0], deletedAt: '2026-09-15T11:00:00.000Z', id: 'deleted', studentId: 'student-2' },
      ],
      [
        { id: 'student-2', name: 'Alumne Dos' },
        { id: 'student-1', name: 'Alumna Un' },
      ],
    )

    assert.deepEqual(grouped.map((group) => group.label), ['Alumna Un', 'Missatges generals'])
    assert.deepEqual(grouped[0].items.map((item) => item.id), ['message-1', 'reminder-1'])
  })

  test('crea un registre tutorial unic preservant autoria i alumne del missatge', () => {
    const item = {
      ...items[0],
      authorEmail: 'tutor@educand.ad',
      authorName: 'Tutor original',
      studentId: 'student-1',
      text: 'Observació compartida',
    }
    const record = buildTutorialRecordFromCoordinationItem({
      classId: 'class-1',
      importedByEmail: 'cotutor@educand.ad',
      importedByUid: 'tutor-b',
      item,
      now: '2026-09-15T11:00:00.000Z',
    })

    assert.equal(record.id, 'trecord_coord_message-1')
    assert.equal(record.type, 'tutorial-observation')
    assert.equal(record.studentId, 'student-1')
    assert.equal(record.note, 'Observació compartida')
    assert.equal(record.authorName, 'Tutor original')
    assert.equal(record.importedByUid, 'tutor-b')
    assert.equal(isCoordinationItemInTutorialRecords(item.id, [record]), true)
  })
})
