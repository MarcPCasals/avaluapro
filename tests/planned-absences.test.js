import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPlannedAbsenceEmail, getPlannedAbsenceSessions } from '../src/lib/plannedAbsences.js'

const student = { id: 'student-1', classId: 'class-1', name: 'Aina Prova', halfGroup: 'Grup A' }
const period = { startsOn: '2026-11-23', endsOn: '2026-11-27' }
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
