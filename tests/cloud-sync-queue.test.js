import test from 'node:test'
import assert from 'node:assert/strict'
import 'fake-indexeddb/auto'
import {
  acknowledgeCloudSyncQueue,
  clearCloudSyncQueue,
  loadCloudSyncQueue,
  loadDataset,
  recordCloudSyncQueueFailure,
  saveCollections,
  saveCollectionsWithCloudQueue,
  saveReconciledDatasetWithCloudQueue,
} from '../src/db/indexedDb.js'
import { getSafeCloudSyncError } from '../src/lib/cloudSyncQueue.js'

const DB_NAME = 'avaluapro-v2'

function deleteTestDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('La base de dades de prova ha quedat bloquejada.'))
  })
}

test.beforeEach(deleteTestDatabase)
test.after(deleteTestDatabase)

test('la migració crea la cua sense perdre les dades locals existents', async () => {
  await new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 12)
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore('students', { keyPath: 'id' })
      store.put({ id: 'student-existing', name: 'Dada preservada' })
    }
    request.onsuccess = () => {
      request.result.close()
      resolve()
    }
    request.onerror = () => reject(request.error)
  })

  assert.deepEqual(await loadCloudSyncQueue('teacher-1'), [])
  const dataset = await loadDataset()
  assert.equal(dataset.students[0].name, 'Dada preservada')
})

test('desa només el registre local que ha canviat a la cua persistent', async () => {
  await saveCollections({ students: [{ id: 'student-1', name: 'Abans' }] }, ['students'])
  await saveCollectionsWithCloudQueue(
    { students: [{ id: 'student-1', name: 'Després' }, { id: 'student-2', name: 'Nou' }] },
    ['students'],
    'teacher-1',
  )

  const entries = await loadCloudSyncQueue('teacher-1')
  assert.equal(entries.length, 2)
  assert.deepEqual(entries.map((entry) => entry.operation), ['upsert', 'upsert'])
  assert.deepEqual(entries.map((entry) => entry.documentId), ['student-1', 'student-2'])
})

test('una segona edició substitueix l’operació anterior del mateix document', async () => {
  await saveCollections({ students: [{ id: 'student-1', name: 'Inicial' }] }, ['students'])
  await saveCollectionsWithCloudQueue(
    { students: [{ id: 'student-1', name: 'Primer canvi' }] },
    ['students'],
    'teacher-1',
  )
  const firstEntry = (await loadCloudSyncQueue('teacher-1'))[0]

  await saveCollectionsWithCloudQueue(
    { students: [{ id: 'student-1', name: 'Canvi final' }] },
    ['students'],
    'teacher-1',
  )
  const [finalEntry] = await loadCloudSyncQueue('teacher-1')

  assert.equal(finalEntry.value.name, 'Canvi final')
  assert.notEqual(finalEntry.revision, firstEntry.revision)
})

test('confirmar una versió antiga no elimina una edició més nova', async () => {
  await saveCollections({ students: [{ id: 'student-1', name: 'Inicial' }] }, ['students'])
  await saveCollectionsWithCloudQueue(
    { students: [{ id: 'student-1', name: 'Versió enviada' }] },
    ['students'],
    'teacher-1',
  )
  const sentEntries = await loadCloudSyncQueue('teacher-1')

  await saveCollectionsWithCloudQueue(
    { students: [{ id: 'student-1', name: 'Versió nova' }] },
    ['students'],
    'teacher-1',
  )
  await acknowledgeCloudSyncQueue(sentEntries)

  const [pendingEntry] = await loadCloudSyncQueue('teacher-1')
  assert.equal(pendingEntry.value.name, 'Versió nova')
})

test('una eliminació queda registrada com una única operació concreta', async () => {
  await saveCollections({ students: [{ id: 'student-1', name: 'Alumne' }] }, ['students'])
  await saveCollectionsWithCloudQueue({ students: [] }, ['students'], 'teacher-1')

  const [entry] = await loadCloudSyncQueue('teacher-1')
  assert.equal(entry.operation, 'delete')
  assert.equal(entry.documentId, 'student-1')
  assert.equal('value' in entry, false)
})

test('la conciliació conserva la unió local i remota i només puja el que falta a Firebase', async () => {
  const remoteDataset = {
    classes: [
      { id: 'class-cloud', name: 'Tutoria' },
      { id: 'class-shared', name: '1rC' },
    ],
  }
  const reconciledDataset = {
    classes: [
      { id: 'class-local', name: 'Classe local' },
      { id: 'class-shared', name: '1rC' },
      { id: 'class-cloud', name: 'Tutoria' },
    ],
  }

  await saveReconciledDatasetWithCloudQueue(reconciledDataset, remoteDataset, 'teacher-1')

  const dataset = await loadDataset()
  assert.deepEqual(dataset.classes.map((item) => item.id).sort(), [
    'class-cloud',
    'class-local',
    'class-shared',
  ])
  const entries = await loadCloudSyncQueue('teacher-1')
  assert.deepEqual(entries.map((entry) => ({ id: entry.documentId, operation: entry.operation })), [
    { id: 'class-local', operation: 'upsert' },
  ])
})

test('les cues de dos docents es mantenen separades i es poden netejar per compte', async () => {
  await saveCollections({ students: [{ id: 'student-1', name: 'Inicial' }] }, ['students'])
  await saveCollectionsWithCloudQueue(
    { students: [{ id: 'student-1', name: 'Canvi docent 1' }] },
    ['students'],
    'teacher-1',
  )
  await saveCollectionsWithCloudQueue(
    { students: [{ id: 'student-1', name: 'Canvi docent 2' }] },
    ['students'],
    'teacher-2',
  )

  assert.equal((await loadCloudSyncQueue('teacher-1')).length, 1)
  assert.equal((await loadCloudSyncQueue('teacher-2')).length, 1)
  await clearCloudSyncQueue('teacher-1')
  assert.equal((await loadCloudSyncQueue('teacher-1')).length, 0)
  assert.equal((await loadCloudSyncQueue('teacher-2')).length, 1)
})

test('un error conserva l’operació i només desa un codi segur', async () => {
  await saveCollections({ students: [{ id: 'student-1', name: 'Inicial' }] }, ['students'])
  await saveCollectionsWithCloudQueue(
    { students: [{ id: 'student-1', name: 'Canvi pendent' }] },
    ['students'],
    'teacher-1',
  )
  const entries = await loadCloudSyncQueue('teacher-1')
  await recordCloudSyncQueueFailure(entries, {
    code: 'firestore/unavailable',
    message: 'Missatge amb dades personals que no s’ha de conservar',
  })

  const [pendingEntry] = await loadCloudSyncQueue('teacher-1')
  assert.equal(pendingEntry.attempts, 1)
  assert.equal(pendingEntry.lastError, 'firestore/unavailable')
  assert.equal(getSafeCloudSyncError(new Error('Alumne Exemple no s’ha pogut desar')), 'cloud-sync-error')
})
