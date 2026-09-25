import test from 'node:test'
import assert from 'node:assert/strict'

import {
  FIRESTORE_QUERY_LIMITS,
  getActiveTutoringListenerSpaceIds,
  getBoundedFirestoreLimit,
  getTutoringCollectionsToSync,
  shouldOpenInternalMessagingListeners,
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

test('la cotutoria només obre listeners per l’espai actiu i autoritzat', () => {
  const allowedSpaceIds = ['space-a', 'space-b', 'space-c']

  assert.deepEqual(getActiveTutoringListenerSpaceIds(allowedSpaceIds, ''), [])
  assert.deepEqual(getActiveTutoringListenerSpaceIds(allowedSpaceIds, 'space-b'), ['space-b'])
  assert.deepEqual(getActiveTutoringListenerSpaceIds(allowedSpaceIds, 'space-unknown'), [])
})

test('la missatgeria només manté temps real mentre la pantalla és oberta', () => {
  assert.equal(shouldOpenInternalMessagingListeners({ isOpen: false, userEmail: 'docent@educand.ad', userUid: 'u1' }), false)
  assert.equal(shouldOpenInternalMessagingListeners({ isOpen: true, userEmail: '', userUid: 'u1' }), false)
  assert.equal(shouldOpenInternalMessagingListeners({ isOpen: true, userEmail: 'docent@educand.ad', userUid: 'u1' }), true)
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
