import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildMaterialPreparationReminder,
  buildRecoveryEmail,
  clearRecoveryTaskLinks,
  completeRecoveryTaskRecords,
  getPreparationReminderDate,
  getStudentFirstName,
  linkRecoveryToTaskRecords,
  reconcileMaterialPreparationReminders,
} from '../src/lib/classroomRecovery.js'
import { getPendingReminderSummary } from '../src/lib/reminders.js'

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

test('les recuperacions i la preparació de materials entren a la capa global de recordatoris', () => {
  const summary = getPendingReminderSummary({
    agendaNotes: [
      { id: 'recovery-1', type: 'activityRecovery', studentId: 'student-1', reminder: { date: '2099-01-01', text: 'Recuperar la pràctica' } },
      { id: 'material-1', type: 'materialPreparation', text: 'Imprimir: fitxa', reminder: { date: '2099-01-02', text: 'Imprimir: fitxa' } },
    ],
    students: [{ id: 'student-1', name: 'PUJOL FONT, Marta' }],
  })
  assert.equal(summary.count, 2)
  assert.deepEqual(summary.items.map((item) => item.kind), ['recovery', 'material'])
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
