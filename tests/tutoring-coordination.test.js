import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  getDueTutoringReminders,
  getOpenTutoringReminders,
  getUnreadTutoringCoordinationItems,
  groupTutoringCoordinationItemsByStudent,
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

  test('un recordatori vençut es detecta independentment de si ja ha estat llegit', () => {
    const due = getDueTutoringReminders(items, 'tutor-a', new Date('2026-09-15T10:01:00.000Z'))
    assert.deepEqual(due.map((item) => item.id), ['reminder-1'])
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
})
