import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildMaterialPreparationReminder,
  buildRecoveryEmail,
  clearRecoveryTaskLinks,
  completeRecoveryTaskRecords,
  getPreparationReminderDate,
  getRecoveryEmailPreview,
  groupDailyRecoveryReminders,
  getStudentFirstName,
  linkRecoveryToTaskRecords,
  reconcileMaterialPreparationReminders,
} from '../src/lib/classroomRecovery.js'
import { getPendingRecoverySummary, getPendingReminderSummary, getPersonalCalendarReminders, getPlanningReminderSummary } from '../src/lib/reminders.js'

test('el correu usa només el nom de pila i incorpora activitats i enllaços', () => {
  const text = buildRecoveryEmail({
    items: [{
      id: 'item-1', sourceActivityId: 'activity-1', title: 'Fer la pràctica',
      sourceActivity: {
        evidenceMode: 'final',
        studentMaterials: [{ id: 'm-1', label: 'Fitxa', url: 'https://example.test/fitxa' }],
      },
    }],
    kind: 'absence',
    nextSessionStartsAt: '2026-09-24T09:30:00',
    sessionStartsAt: '2026-09-21T09:30:00',
    student: { name: 'PUJOL FONT, Marta' },
    subject: 'Ciències',
  })
  assert.equal(getStudentFirstName({ name: 'PUJOL FONT, Marta' }), 'Marta')
  assert.match(text, /^Hola, Marta,/)
  assert.match(text, /Fer la pràctica/)
  assert.match(text, /https:\/\/example\.test\/fitxa/)
  assert.match(text, /Tasques que cal completar/)
})

test('una tasca de recuperació queda exempta fins que es completa i després passa a feta', () => {
  const linked = linkRecoveryToTaskRecords({
    taskRecords: [],
    tasks: [{
      id: 'task-1', applicationId: 'app-1', classId: 'class-1', evidenceMode: 'final',
      sourceActivityId: 'activity-1', utId: 'ut-1',
    }],
  }, {
    activities: [{ sourceActivityId: 'activity-1' }],
    applicationId: 'app-1', classId: 'class-1', noteId: 'note-1',
    sessionId: 'session-1', studentId: 'student-1',
  }, () => 'record-1')
  assert.equal(linked.linkedCount, 1)
  assert.equal(linked.records[0].status, 'EXEMPT')
  assert.equal(linked.records[0].recoveryPending, true)

  const corrected = clearRecoveryTaskLinks(linked.records, 'note-1')
  assert.equal(corrected[0].status, 'EXEMPT')
  assert.equal(corrected[0].recoveryPending, false)
  assert.equal(corrected[0].recoveryNoteId, '')

  const correctedDeparture = clearRecoveryTaskLinks(linked.records, 'note-1', 'DONE')
  assert.equal(correctedDeparture[0].status, 'DONE')

  const completed = completeRecoveryTaskRecords(linked.records, 'note-1', '2026-09-24T10:00:00.000Z')
  assert.equal(completed[0].status, 'DONE')
  assert.equal(completed[0].recoveryPending, false)
  assert.equal(completed[0].recoveredAt, '2026-09-24T10:00:00.000Z')
})

test('els materials preparables avisen el dia anterior per defecte i conserven l’acció', () => {
  const reminder = buildMaterialPreparationReminder({
    bundle: {
      application: { id: 'app-1' }, planningUnit: { id: 'up-1' },
      session: { id: 'session-1', classId: 'class-1', startsAt: '2026-09-21T09:30:00' },
    },
    item: { id: 'item-1', sourceActivityId: 'activity-1' },
    material: { audience: 'teacher', id: 'material-1', label: '30 còpies', preparationKind: 'print' },
  }, () => 'note-1', '2026-09-19T08:00:00.000Z')
  assert.equal(getPreparationReminderDate('2026-09-21T09:30:00'), '2026-09-20')
  assert.equal(reminder.reminder.date, '2026-09-20')
  assert.equal(reminder.text, 'Imprimir: 30 còpies')
  assert.equal(reminder.preparation.completedAt, '')
})

test('la preparació de materials queda separada dels recordatoris generals', () => {
  const agendaNotes = [
    { id: 'recovery-1', type: 'activityRecovery', studentId: 'student-1', reminder: { date: '2099-01-01', text: 'Recuperar la pràctica' } },
    { id: 'material-1', type: 'materialPreparation', planningUnitId: 'up-1', text: 'Imprimir: fitxa', reminder: { date: '2099-01-02', text: 'Imprimir: fitxa' } },
  ]
  const summary = getPendingReminderSummary({
    agendaNotes,
    students: [{ id: 'student-1', name: 'PUJOL FONT, Marta' }],
  })
  const planningSummary = getPlanningReminderSummary({ agendaNotes, planningUnitId: 'up-1' })
  assert.equal(summary.count, 0)
  assert.deepEqual(summary.items, [])
  assert.equal(getPendingRecoverySummary({ agendaNotes }).count, 1)
  assert.equal(planningSummary.count, 1)
  assert.deepEqual(planningSummary.items.map((item) => item.title), ['Imprimir: fitxa'])
})

test('una absència sense activitats pot tenir el recordatori buit sense bloquejar l’aplicació', () => {
  const summary = getPendingReminderSummary({
    agendaNotes: [{
      id: 'recovery-without-activities',
      type: 'activityRecovery',
      studentId: 'student-1',
      reminder: null,
      recovery: { activities: [], kind: 'absence', status: 'none' },
    }],
    students: [{ id: 'student-1', name: 'Valeria' }],
    taskRecords: [{ id: 'record-without-reminder', reminder: null }],
    tasks: [{ id: 'task-without-reminder', reminder: null }],
  })

  assert.equal(summary.count, 0)
  assert.deepEqual(summary.items, [])
})

test('el calendari rep només els recordatoris generals i de l’agenda', () => {
  const calendarItems = getPersonalCalendarReminders([
    { id: 'general-1', kind: 'general' },
    { id: 'agenda-1', kind: 'agenda' },
    { id: 'recovery-1', kind: 'recovery' },
    { id: 'task-1', kind: 'task' },
    { id: 'record-1', kind: 'record' },
  ])

  assert.deepEqual(calendarItems.map((item) => item.id), ['general-1', 'agenda-1'])
})

test('la mateixa preparació es mostra una sola vegada per sessió', () => {
  const shared = {
    classId: 'class-1',
    planningUnitId: 'up-1',
    reminder: { date: '2099-01-02', text: 'Imprimir: fitxa' },
    sessionId: 'session-1',
    text: 'Imprimir: fitxa',
    type: 'materialPreparation',
  }
  const agendaNotes = [
    { ...shared, id: 'material-1', preparation: { kind: 'print', label: 'fitxa', sessionStartsAt: '2099-01-03T09:00:00', sourceActivityId: 'activity-1' } },
    { ...shared, id: 'material-2', sessionId: 'replanned-session-1', preparation: { kind: 'print', label: 'fitxa', sessionStartsAt: '2099-01-03T09:00:00', sourceActivityId: 'activity-2' } },
  ]
  const planningSummary = getPlanningReminderSummary({ agendaNotes, planningUnitId: 'up-1' })
  assert.equal(planningSummary.count, 1)
  assert.equal(planningSummary.items.length, 1)
  assert.deepEqual(planningSummary.items[0].notes.map((note) => note.id), ['material-1', 'material-2'])
})

test('un material eliminat cancel·la el recordatori i si torna no queda silenciat', () => {
  const material = { id: 'material-1', label: '30 còpies', preparationKind: 'print' }
  const bundle = {
    application: { id: 'app-1' },
    planningUnit: { id: 'up-1' },
    session: { id: 'session-1', classId: 'class-1', startsAt: '2026-09-21T09:30:00' },
    items: [{
      id: 'item-1', sourceActivityId: 'activity-1',
      sourceActivity: { teacherMaterials: [material], studentMaterials: [] },
    }],
  }
  const created = reconcileMaterialPreparationReminders([], [bundle], () => 'note-1', '2026-09-19T08:00:00.000Z')
  assert.equal(created.changed, true)
  assert.equal(created.materialNotes[0].reminder.dismissedAt, '')

  const removedBundle = {
    ...bundle,
    items: [{ ...bundle.items[0], sourceActivity: { teacherMaterials: [], studentMaterials: [] } }],
  }
  const removed = reconcileMaterialPreparationReminders(created.notes, [removedBundle], () => 'unused', '2026-09-19T09:00:00.000Z')
  assert.equal(removed.materialNotes[0].preparation.cancelledAt, '2026-09-19T09:00:00.000Z')
  assert.equal(removed.materialNotes[0].reminder.dismissedAt, '2026-09-19T09:00:00.000Z')

  const restored = reconcileMaterialPreparationReminders(removed.notes, [bundle], () => 'unused', '2026-09-19T10:00:00.000Z')
  assert.equal(restored.materialNotes[0].preparation.cancelledAt, undefined)
  assert.equal(restored.materialNotes[0].reminder.dismissedAt, '')
})


test('la previsualització preserva el correu desat i les edicions del docent', () => {
  const emailText = 'Hola!\nActivitats i instruccions editades pel docent.\n'
  assert.equal(getRecoveryEmailPreview({ recovery: { emailText } }, { name: 'Alumne fictici' }), emailText)
})

test('la previsualització sense correu desat recupera les activitats i les tasques de la nota', () => {
  const text = getRecoveryEmailPreview({
    sessionStartsAt: '2026-10-02T15:00:00',
    recovery: {
      kind: 'earlyDeparture',
      activities: [{ title: 'Experiment fictici', evidenceMode: 'final' }],
      nextSessionStartsAt: '2026-10-05T09:30:00',
    },
  }, { name: 'COGNOM, Laia' })
  assert.match(text, /Hola, Laia/)
  assert.match(text, /has marxat abans/)
  assert.match(text, /Experiment fictici/)
  assert.match(text, /Tasques que cal completar/)
  assert.match(text, /5 d’octubre/)
})


test('els correus nous i desats mostren el dia i el mes sense any', () => {
  const generated = getRecoveryEmailPreview({
    sessionStartsAt: '2026-10-02T15:00:00',
    recovery: { nextSessionStartsAt: '2026-10-05T09:30:00' },
  }, { name: 'Laia' })
  assert.match(generated, /Avui, 2 d’octubre,/)
  assert.match(generated, /el 5 d’octubre\./)
  assert.doesNotMatch(generated, /2026/)
  const saved = getRecoveryEmailPreview({ recovery: {
    emailText: 'Avui, 2 d’octubre del 2026, no has pogut assistir.\nHo revisarem el 5 d’octubre del 2026.\nMaterial: informe del 2026.',
  } })
  assert.equal(saved, 'Avui, 2 d’octubre, no has pogut assistir.\nHo revisarem el 5 d’octubre.\nMaterial: informe del 2026.')
})


test('agrupa les recuperacions del mateix dia amb activitats, tasques i materials i revisió un altre dia', () => {
  const make = (id, time, title, material) => ({
    id: `agenda_${id}`, kind: 'recovery',
    note: {
      id, classId: 'class-1', studentId: 'student-1', sessionStartsAt: `2026-10-02T${time}`,
      recovery: { nextSessionStartsAt: '2026-10-02T15:00:00', emailText: buildRecoveryEmail({
        student: { name: 'Laia' }, sessionStartsAt: '2026-10-02T09:00:00', nextSessionStartsAt: '2026-10-02T15:00:00',
        items: [{ title, sourceActivity: { evidenceMode: 'final', studentMaterials: [{ label: material, url: `https://example.test/${id}` }] } }],
      }) },
    },
  })
  const items = [make('one', '09:00:00', 'Activitat A', 'Fitxa A'), make('two', '15:00:00', 'Activitat B', 'Fitxa B')]
  const grouped = groupDailyRecoveryReminders(items, [
    { classId: 'class-1', startsAt: '2026-10-02T15:00:00' },
    { classId: 'class-1', startsAt: '2026-10-05T09:30:00' },
  ])
  assert.equal(grouped.length, 1)
  assert.equal(grouped[0].recoveryNotes.length, 2)
  const email = grouped[0].note.recovery.emailText
  for (const title of ['Activitat A', 'Activitat B', 'Fitxa A', 'Fitxa B']) assert.ok(email.includes(title))
  assert.match(email, /el 5 d’octubre/)
  assert.doesNotMatch(email, /pròxima sessió, el 2 d’octubre/)
  assert.equal(items[0].note.recovery.nextSessionStartsAt, '2026-10-02T15:00:00')
  const otherStudent = { ...items[1], note: { ...items[1].note, studentId: 'student-2' } }
  assert.equal(groupDailyRecoveryReminders([items[0], otherStudent]).length, 2)
  assert.doesNotMatch(groupDailyRecoveryReminders(items)[0].note.recovery.emailText, /Ho revisarem/)
})
