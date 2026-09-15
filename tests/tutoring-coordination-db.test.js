import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import {
  acknowledgeTutoringCoordinationOperation,
  loadTutoringCoordinationCache,
  loadTutoringCoordinationOutbox,
  queueTutoringCoordinationOperation,
  replaceTutoringCoordinationCache,
} from '../src/db/indexedDb.js'

function deleteTestDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('avaluapro-v2')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('La base de prova ha quedat bloquejada.'))
  })
}

before(deleteTestDatabase)
after(deleteTestDatabase)

describe('cua local de coordinacio', () => {
  test('desa el missatge i nomes retira l operacio si coincideix la revisio confirmada', async () => {
    const item = {
      createdAt: '2026-09-15T08:00:00.000Z',
      id: 'message-1',
      kind: 'message',
      spaceId: 'space-1',
      text: 'Missatge local',
    }
    const operation = {
      createdAt: item.createdAt,
      id: 'operation-1',
      item,
      revision: 'revision-1',
      spaceId: 'space-1',
      type: 'item',
    }
    await queueTutoringCoordinationOperation('user-1', operation)
    assert.equal((await loadTutoringCoordinationCache('user-1'))[0].text, 'Missatge local')
    assert.equal((await loadTutoringCoordinationOutbox('user-1')).length, 1)

    await acknowledgeTutoringCoordinationOperation(operation.id, 'revision-antiga')
    assert.equal((await loadTutoringCoordinationOutbox('user-1')).length, 1)

    await acknowledgeTutoringCoordinationOperation(operation.id, operation.revision)
    assert.equal((await loadTutoringCoordinationOutbox('user-1')).length, 0)
  })

  test('separa la memoria local de cada compte', async () => {
    await replaceTutoringCoordinationCache('user-1', 'space-1', [
      { id: 'shared-id', spaceId: 'space-1', text: 'Compte 1' },
    ])
    await replaceTutoringCoordinationCache('user-2', 'space-1', [
      { id: 'shared-id', spaceId: 'space-1', text: 'Compte 2' },
    ])
    assert.equal((await loadTutoringCoordinationCache('user-1'))[0].text, 'Compte 1')
    assert.equal((await loadTutoringCoordinationCache('user-2'))[0].text, 'Compte 2')
  })
})
