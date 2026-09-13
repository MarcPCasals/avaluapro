import test from 'node:test'
import assert from 'node:assert/strict'
import { serverTimestamp } from 'firebase/firestore'
import {
  areCloudDocumentsEqual,
  buildCloudDocumentDiff,
  isFirestoreQuotaError,
  isFirestoreNetworkError,
  isFirestoreSpecialValue,
} from '../src/lib/cloudSyncDiff.js'

test('compara documents sense dependre de l’ordre de les propietats', () => {
  assert.equal(areCloudDocumentsEqual({ b: 2, a: { d: 4, c: 3 } }, { a: { c: 3, d: 4 }, b: 2 }), true)
})

test('normalitza dates locals i timestamps retornats per Firestore', () => {
  const iso = '2026-09-10T08:00:00.000Z'
  const firestoreTimestamp = { toDate: () => new Date(iso) }
  assert.equal(areCloudDocumentsEqual({ updatedAt: iso }, { updatedAt: firestoreTimestamp }), true)
})

test('una sincronització idèntica no genera cap operació', () => {
  const diff = buildCloudDocumentDiff(
    [{ id: 'student-1', value: { id: 'student-1', name: 'Alumne 1' } }],
    [{ id: 'student-1', value: { name: 'Alumne 1', id: 'student-1' } }],
  )
  assert.deepEqual(diff.stats, { read: 1, written: 0, deleted: 0, skipped: 1 })
})

test('detecta només el registre creat o modificat', () => {
  const diff = buildCloudDocumentDiff(
    [
      { id: '1', value: { id: '1', value: 'canviat' } },
      { id: '2', value: { id: '2', value: 'nou' } },
    ],
    [{ id: '1', value: { id: '1', value: 'abans' } }],
  )
  assert.deepEqual(diff.upserts.map((item) => item.id), ['1', '2'])
  assert.equal(diff.stats.written, 2)
  assert.equal(diff.stats.deleted, 0)
})

test('detecta només el registre eliminat', () => {
  const diff = buildCloudDocumentDiff(
    [{ id: '1', value: { id: '1' } }],
    [{ id: '1', value: { id: '1' } }, { id: '2', value: { id: '2' } }],
  )
  assert.deepEqual(diff.deleteIds, ['2'])
  assert.equal(diff.stats.deleted, 1)
  assert.equal(diff.stats.written, 0)
})

test('identifica explícitament els errors de quota', () => {
  assert.equal(isFirestoreQuotaError({ code: 'firestore/resource-exhausted' }), true)
  assert.equal(isFirestoreQuotaError(new Error('Quota exceeded.')), true)
  assert.equal(isFirestoreQuotaError(new Error('Network unavailable')), false)
})

test('diferencia els errors de xarxa dels errors de quota', () => {
  assert.equal(isFirestoreNetworkError({ code: 'firestore/unavailable' }), true)
  assert.equal(isFirestoreNetworkError({ code: 'auth/network-request-failed' }), true)
  assert.equal(isFirestoreNetworkError({ code: 'firestore/resource-exhausted' }), false)
})

test('preserva el segell horari especial que les regles de Firebase validen', () => {
  assert.equal(isFirestoreSpecialValue(serverTimestamp()), true)
  assert.equal(isFirestoreSpecialValue({ _methodName: 'serverTimestamp' }), true)
})

test('amb 500 documents, modificar-ne un només prepara una escriptura', () => {
  const remote = Array.from({ length: 500 }, (_, index) => ({
    id: `row-${index}`,
    value: { id: `row-${index}`, value: index },
  }))
  const local = remote.map((item) => ({
    id: item.id,
    value: item.id === 'row-231' ? { ...item.value, value: 'modificat' } : item.value,
  }))

  const diff = buildCloudDocumentDiff(local, remote)
  assert.deepEqual(diff.stats, { read: 500, written: 1, deleted: 0, skipped: 499 })
  assert.equal(diff.upserts[0].id, 'row-231')
})
