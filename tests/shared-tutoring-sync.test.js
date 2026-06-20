import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { getSharedRowVersion, mergeSharedRows } from '../src/lib/sharedTutoringRows.js'

describe('fusio de files de cotutoria', () => {
  test('un tombstone mes nou elimina la copia local', () => {
    const localRows = [
      {
        id: 'record-1',
        note: 'Observacio antiga',
        sharedUpdatedAt: '2026-06-20T08:00:00.000Z',
      },
    ]
    const incomingRows = [
      {
        id: 'record-1',
        sharedDeletedAt: '2026-06-20T09:00:00.000Z',
        sharedUpdatedAt: '2026-06-20T09:00:00.000Z',
      },
    ]

    assert.deepEqual(mergeSharedRows(localRows, incomingRows), [])
  })

  test('un tombstone antic no elimina una edicio local posterior', () => {
    const localRows = [
      {
        id: 'record-1',
        note: 'Observacio recuperada',
        sharedUpdatedAt: '2026-06-20T10:00:00.000Z',
      },
    ]
    const incomingRows = [
      {
        id: 'record-1',
        sharedDeletedAt: '2026-06-20T09:00:00.000Z',
        sharedUpdatedAt: '2026-06-20T09:00:00.000Z',
      },
    ]

    assert.equal(mergeSharedRows(localRows, incomingRows)[0].note, 'Observacio recuperada')
  })

  test('els tombstones sense copia local no entren a les dades actives', () => {
    const incomingRows = [
      {
        id: 'record-1',
        sharedDeletedAt: '2026-06-20T09:00:00.000Z',
      },
    ]

    assert.deepEqual(mergeSharedRows([], incomingRows), [])
  })

  test('una edicio remota mes nova substitueix la versio local', () => {
    const localRows = [
      {
        id: 'record-1',
        note: 'Local',
        sharedUpdatedAt: '2026-06-20T08:00:00.000Z',
      },
    ]
    const incomingRows = [
      {
        id: 'record-1',
        note: 'Remota',
        sharedUpdatedAt: '2026-06-20T09:00:00.000Z',
      },
    ]

    assert.equal(mergeSharedRows(localRows, incomingRows)[0].note, 'Remota')
  })

  test('la data de baixa participa en la versio de la fila', () => {
    assert.equal(
      getSharedRowVersion({
        createdAt: '2026-06-20T07:00:00.000Z',
        sharedDeletedAt: '2026-06-20T09:00:00.000Z',
        sharedUpdatedAt: '2026-06-20T08:00:00.000Z',
      }),
      '2026-06-20T09:00:00.000Z',
    )
  })
})
