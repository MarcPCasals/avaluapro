import test from 'node:test'
import assert from 'node:assert/strict'

import {
  findAbsenceInSlot,
  findAbsenceForSession,
  formatAbsenceDateTime,
  formatAbsenceHours,
  getAbsenceTimeParts,
  getStudentAbsenceHours,
  getStudentAbsenceRecords,
} from '../src/lib/attendance.js'

const records = [
  {
    id: 'absence_1',
    classId: 'class_1',
    studentId: 'student_1',
    date: '2026-09-18',
    time: '10:07',
    slotKey: '2026-09-18T10',
    recordedAt: '2026-09-18T08:07:00.000Z',
    hours: 1,
  },
  {
    id: 'absence_2',
    classId: 'class_1',
    studentId: 'student_1',
    date: '2026-09-16',
    time: '15:02',
    slotKey: '2026-09-16T15',
    recordedAt: '2026-09-16T13:02:00.000Z',
    hours: 1,
  },
  {
    id: 'absence_other',
    classId: 'class_1',
    studentId: 'student_2',
    date: '2026-09-18',
    time: '10:08',
    slotKey: '2026-09-18T10',
    recordedAt: '2026-09-18T08:08:00.000Z',
    hours: 1,
  },
]

test('creates a stable local date, exact time and hourly slot', () => {
  const result = getAbsenceTimeParts(new Date(2026, 8, 18, 10, 7, 42))
  assert.deepEqual(result, {
    date: '2026-09-18',
    time: '10:07',
    slotKey: '2026-09-18T10',
  })
})

test('finds the current hour without duplicating another student', () => {
  assert.equal(findAbsenceInSlot(records, 'student_1', 'class_1', '2026-09-18T10')?.id, 'absence_1')
  assert.equal(findAbsenceInSlot(records, 'student_1', 'class_1', '2026-09-18T11'), undefined)
})

test('prioritza la sessió exacta i conserva compatibilitat amb absències horàries antigues', () => {
  const sessionRecords = [
    ...records,
    { ...records[0], id: 'absence_session', sessionId: 'session-1' },
  ]
  assert.equal(findAbsenceForSession(sessionRecords, 'student_1', 'class_1', {
    id: 'session-1', startsAt: '2026-09-18T10:30:00',
  })?.id, 'absence_session')
  assert.equal(findAbsenceForSession(records, 'student_1', 'class_1', {
    id: 'session-old', startsAt: '2026-09-18T10:30:00',
  })?.id, 'absence_1')
})

test('calculates one hour per absence and sorts the exact history newest first', () => {
  assert.equal(getStudentAbsenceHours(records, 'student_1', 'class_1'), 2)
  assert.deepEqual(
    getStudentAbsenceRecords(records, 'student_1', 'class_1').map((record) => record.id),
    ['absence_1', 'absence_2'],
  )
  assert.equal(formatAbsenceHours(2), '2 h')
  assert.match(formatAbsenceDateTime(records[0]), /18 de setembre .*2026 · 10:07/)
})
