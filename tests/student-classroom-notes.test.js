import assert from 'node:assert/strict'
import test from 'node:test'
import { getStudentClassroomNotes, formatClassroomNoteDate } from '../src/lib/studentClassroomNotes.js'

test('historial complet per alumne i grup, només de Mode aula, ordenat sense mutar la font', () => {
  const base = { studentId: 's1', classId: 'c1', source: 'classroom', sessionId: 'session1', type: 'positive' }
  const events = [
    { ...base, id: 'old', date: '2026-10-02', text: 'Participa' },
    { ...base, id: 'negative', sessionId: 'session2', type: 'incident', date: '2026-10-08', createdAt: '2026-10-08T08:00:00Z', text: 'Interromp' },
    { ...base, id: 'new', sessionId: 'session2', date: '2026-10-08', createdAt: '2026-10-08T08:05:00Z', text: 'Ajuda' },
    { ...base, id: 'other-student', studentId: 's2' },
    { ...base, id: 'other-class', classId: 'c2' },
    { ...base, id: 'tracking', source: 'tracking' },
    { ...base, id: 'no-session', sessionId: null },
    { ...base, id: 'unknown-kind', type: 'other' },
  ]
  const original = structuredClone(events)
  assert.deepEqual(getStudentClassroomNotes(events, 's1', 'c1').map((note) => note.id), ['new', 'negative', 'old'])
  assert.deepEqual(events, original)
  assert.deepEqual(getStudentClassroomNotes(events, 'missing', 'c1'), [])
})

test('les dates de les entrades conserven el dia desat i accepten registres antics', () => {
  assert.equal(formatClassroomNoteDate({ date: '2026-10-08', createdAt: '2026-10-09T00:00:00Z' }), '08/10/2026')
  assert.equal(formatClassroomNoteDate({ createdAt: '2026-10-02T08:00:00Z' }), '02/10/2026')
  assert.equal(formatClassroomNoteDate({}), 'Sense data')
})
