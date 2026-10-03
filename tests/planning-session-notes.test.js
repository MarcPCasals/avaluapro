import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSessionNoteChange, createCalendarSession, buildActivitySessionReflow, getTimetableSessionNoteId } from '../src/domain/planning/index.js'
import { getPlanningEntityLocation } from '../src/data/planningEntityLocation.js'

const now = '2026-10-03T15:00:00.000Z'
function bundle() {
  return { application: { id: 'app', classId: 'class', ownerUid: 'teacher' }, planningUnit: { id: 'up' }, privateNotes: [],
    session: createCalendarSession({ id: 'session', ownerUid: 'teacher', applicationId: 'app', classId: 'class', startsAt: '2026-10-05T09:30:00', durationMinutes: 60, timetableSlotId: 'slot' }, { now }), items: [], results: [] }
}
function change(current, text, recordInPlanning) {
  return buildSessionNoteChange({ bundle: current, ownerUid: 'teacher', text, recordInPlanning, now })
}

test('un recordatori privat no escriu a la sessió compartida ni marca cap activitat com a feta', () => {
  const original = bundle()
  const result = change(original, '  Portar les mostres  ', false)
  assert.equal(result.note.text, 'Portar les mostres')
  assert.equal(result.note.recordInPlanning, false)
  assert.equal(result.applicationNotesChanged, false)
  assert.strictEqual(result.session, original.session)
  assert.equal(result.session.status, 'planned')
  assert.deepEqual(result.session.applicationNotes, [])
})

test('registrar i editar una nota manté una única anotació a l’aplicació a l’aula', () => {
  const first = change(bundle(), 'Portar les mostres', true)
  assert.equal(first.session.applicationNotes[0].text, first.note.text)
  const edited = change({ ...bundle(), session: first.session, privateNotes: [first.note] }, 'Portar també el microscopi', true)
  assert.equal(edited.note.id, first.note.id)
  assert.equal(edited.session.applicationNotes.length, 1)
  assert.equal(edited.session.applicationNotes[0].text, 'Portar també el microscopi')
  const closing = change({ ...bundle(), session: edited.session, privateNotes: [edited.note] }, 'Portar també el microscopi', undefined)
  assert.equal(closing.note.recordInPlanning, true)
  assert.equal(closing.session.applicationNotes.length, 1)
})

test('desmarcar el registre retira només aquesta nota de la Programació', () => {
  const first = change(bundle(), 'Nota pròpia', true)
  first.session.applicationNotes.push({ id: 'another', text: 'Nota d’un altre docent', authorUid: 'other' })
  const result = change({ ...bundle(), session: first.session, privateNotes: [first.note] }, 'Ara només personal', false)
  assert.equal(result.note.recordInPlanning, false)
  assert.deepEqual(result.session.applicationNotes.map((note) => note.id), ['another'])
  const cleared = change({ ...bundle(), session: first.session, privateNotes: [first.note] }, '', false)
  assert.equal(cleared.note, null)
  assert.deepEqual(cleared.session.applicationNotes.map((note) => note.id), ['another'])
})

test('les notes de franges sense UP es poden desar i mantenen la identitat en calendaritzar la franja', () => {
  const standalone = { ...bundle(), standalone: true, planningUnit: { id: '' }, session: { ...bundle().session, id: getTimetableSessionNoteId(bundle().session) } }
  const first = change(standalone, 'Tutoria: preparar les preguntes', true)
  assert.equal(first.note.planningUnitId, null)
  assert.equal(first.note.recordInPlanning, false)
  assert.equal(getPlanningEntityLocation(first.note).path, `planningPrivateNotes/${first.note.id}`)
  assert.deepEqual(getPlanningEntityLocation(first.note).scopeKeys, [`session:${standalone.session.id}:privateNotes`])
  const connected = change({ ...bundle(), privateNotes: [first.note] }, first.note.text, true)
  assert.equal(connected.note.id, first.note.id)
  assert.equal(connected.note.sessionId, standalone.session.id)
  assert.equal(connected.note.planningUnitId, 'up')
})

test('una nota registrada no desapareix en una proposta intel·ligent', () => {
  const noted = change(bundle(), 'Aplicació a recordar', true)
  const result = buildActivitySessionReflow({ application: bundle().application, activities: [], candidates: [], existingSessionBundles: [{ ...bundle(), session: noted.session }], fromDate: '2026-10-05', options: { now } })
  assert.equal(result.lockedSessionCount, 1)
  assert.equal(result.removedSessions.length, 0)
})

test('es rebutgen notes massa llargues abans de persistir-les', () => {
  assert.throws(() => change(bundle(), 'x'.repeat(4001), false), /4.000/)
})
