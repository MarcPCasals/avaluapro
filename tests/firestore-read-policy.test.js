import test from 'node:test'
import assert from 'node:assert/strict'

import {
  FIRESTORE_QUERY_LIMITS,
  getBoundedFirestoreLimit,
  getTutoringCollectionsToSync,
} from '../src/lib/firestoreReadPolicy.js'
import {
  getFirestoreReadDiagnostics,
  recordFirestoreLookup,
  recordFirestoreListenerSnapshot,
  recordFirestoreQuerySnapshot,
  resetFirestoreReadDiagnostics,
} from '../src/lib/firestoreReadDiagnostics.js'

test('els historials globals tenen un límit remot finit', () => {
  Object.values(FIRESTORE_QUERY_LIMITS).forEach((value) => {
    assert.equal(Number.isInteger(value), true)
    assert.equal(value > 0, true)
    assert.equal(value <= 200, true)
  })
})

test('el diagnòstic compta la resposta inicial d’un listener buit', () => {
  resetFirestoreReadDiagnostics()
  recordFirestoreListenerSnapshot('shell.messages', { docChanges: () => [] })

  assert.deepEqual(getFirestoreReadDiagnostics(), {
    estimatedReads: 1,
    operations: 1,
    scopes: {
      'shell.messages': { estimatedReads: 1, operations: 1 },
    },
  })
})

test('un consumidor no pot ampliar silenciosament el límit acordat', () => {
  assert.equal(getBoundedFirestoreLimit(500, 20), 20)
  assert.equal(getBoundedFirestoreLimit(8, 20), 8)
  assert.equal(getBoundedFirestoreLimit(0, 20), 20)
})

test('una edició compartida només sincronitza les col·leccions modificades', () => {
  const allowed = ['students', 'tutorialRecords', 'tutorialMarks']
  assert.deepEqual(
    getTutoringCollectionsToSync(['tutorialMarks', 'tutorialMarks', 'unknown'], allowed),
    ['tutorialMarks'],
  )
})

test('la creació o reparació sense filtre conserva la sincronització completa', () => {
  const allowed = ['students', 'tutorialRecords', 'tutorialMarks']
  assert.deepEqual(getTutoringCollectionsToSync([], allowed), allowed)
})

test('el diagnòstic compta una lectura mínima per consulta buida sense dades personals', () => {
  resetFirestoreReadDiagnostics()
  recordFirestoreQuerySnapshot('agenda.week', { size: 0 })
  recordFirestoreQuerySnapshot('agenda.week', { size: 7 })
  recordFirestoreLookup('agenda.session')

  assert.deepEqual(getFirestoreReadDiagnostics(), {
    estimatedReads: 9,
    operations: 3,
    scopes: {
      'agenda.session': { estimatedReads: 1, operations: 1 },
      'agenda.week': { estimatedReads: 8, operations: 2 },
    },
  })
})
