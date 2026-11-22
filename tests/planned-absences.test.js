import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPlannedAbsenceEmail, getPlannedAbsenceForDate, getPlannedAbsenceGivenName, getPlannedAbsenceReminders, getPlannedAbsenceSessions, nextPlannedAbsenceDate, pruneExpiredPlannedAbsences } from '../src/lib/plannedAbsences.js'

const student = { id: 'student-1', classId: 'class-1', name: 'Aina Prova', halfGroup: 'Grup A' }
const period = { startsOn: '2026-11-23', endsOn: '2026-11-27' }

test('planned absences appear on classroom dates and create two student reminders until sent', () => {
  const plannedStudent = { ...student, plannedAbsences: [{ id: 'absence-1', startsOn: '2026-12-01', endsOn: '2026-12-04', sentAt: null }] }
  assert.equal(getPlannedAbsenceForDate(plannedStudent, '2026-11-30'), null)
  assert.equal(getPlannedAbsenceForDate(plannedStudent, '2026-12-02')?.id, 'absence-1')
  const reminders = getPlannedAbsenceReminders([plannedStudent], '2026-11-22')
  assert.deepEqual(reminders.map((item) => [item.stage, item.reminder.date]), [['week', '2026-11-24'], ['day', '2026-11-30']])
  assert.ok(reminders.every((item) => item.student.id === student.id))
  assert.equal(getPlannedAbsenceReminders([{ ...plannedStudent, plannedAbsences: [{ ...plannedStudent.plannedAbsences[0], sentAt: '2026-11-22T09:00:00Z' }] }], '2026-11-22').length, 0)
  assert.equal(getPlannedAbsenceReminders([plannedStudent], '2026-12-05').length, 0)
})
const bundle = (id, date, options = {}) => ({
  session: { id, classId: 'class-1', startsAt: `${date}T09:00:00`, status: 'planned', ...options },
  planningUnit: { transversalMaterials: [{ kind: 'link', label: 'Dossier', url: 'https://example.test/dossier' }] },
  items: [{ id: `${id}-item`, title: 'Fer un esquema', sourceActivity: {
    description: 'Llegeix el text i prepara un esquema.',
    studentMaterials: [{ kind: 'link', label: 'Text', url: 'https://example.test/text' }],
    teacherMaterials: [{ kind: 'link', label: 'Solucionari', url: 'https://example.test/teacher' }],
  } }],
})

test('selects only the affected student sessions and excludes canceled classes', () => {
  const bundles = [
    bundle('a', '2026-11-24', { subgroupId: 'Grup A', timetableSlotId: 'slot-a' }),
    bundle('b', '2026-11-24', { subgroupId: 'Grup B', timetableSlotId: 'slot-b' }),
    bundle('c', '2026-11-25', { status: 'cancelled', timetableSlotId: 'slot-c' }),
    bundle('d', '2026-11-26', { timetableSlotId: 'slot-d' }),
  ]
  const candidates = [
    { date: '2026-11-24', startsAt: '2026-11-24T09:00:00', timetableSlotId: 'slot-a' },
    { date: '2026-11-25', startsAt: '2026-11-25T09:00:00', timetableSlotId: 'slot-c' },
    { date: '2026-11-27', startsAt: '2026-11-27T09:00:00', timetableSlotId: 'slot-e' },
  ]
  const selected = getPlannedAbsenceSessions({ bundles, candidates, period, student })
  assert.deepEqual(selected.map((item) => item.session.id), ['a', 'd', 'timetable-2026-11-27-slot-e'])
})

test('email includes descriptions and student materials but no teacher links', () => {
  const email = buildPlannedAbsenceEmail({ student, period, bundles: [bundle('a', '2026-11-24')] })
  assert.match(email, /Fer un esquema/)
  assert.match(email, /Llegeix el text/)
  assert.match(email, /https:\/\/example\.test\/text/)
  assert.match(email, /https:\/\/example\.test\/dossier/)
  assert.doesNotMatch(email, /teacher|Solucionari/)
})

test('the greeting uses the given name after the comma', () => {
  const recipient = { ...student, name: 'Prova Casals, Aina Maria' }
  assert.equal(getPlannedAbsenceGivenName(recipient.name), 'Aina Maria')
  assert.match(buildPlannedAbsenceEmail({ student: recipient, period }), /Hola Aina Maria,/)
  assert.doesNotMatch(buildPlannedAbsenceEmail({ student: recipient, period }), /Hola Prova/)
})

test('the suggested end date is the following calendar day', () => {
  assert.equal(nextPlannedAbsenceDate('2026-11-23'), '2026-11-24')
  assert.equal(nextPlannedAbsenceDate('2026-12-31'), '2027-01-01')
  assert.equal(nextPlannedAbsenceDate(''), '')
})

test('expired periods are removed after their final day, preserving attendance', () => {
  const studentWithPeriods = { ...student, plannedAbsences: [
    { id: 'past', startsOn: '2026-11-19', endsOn: '2026-11-20' },
    { id: 'today', startsOn: '2026-11-20', endsOn: '2026-11-21' },
    { id: 'future', startsOn: '2026-11-23', endsOn: '2026-11-24' },
  ], absenceHours: 3 }
  const result = pruneExpiredPlannedAbsences([studentWithPeriods], '2026-11-21')
  assert.deepEqual(result[0].plannedAbsences.map((period) => period.id), ['today', 'future'])
  assert.equal(result[0].absenceHours, 3)
  assert.strictEqual(pruneExpiredPlannedAbsences(result, '2026-11-21')[0], result[0])
})
