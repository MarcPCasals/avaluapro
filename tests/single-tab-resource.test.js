import test from 'node:test'
import assert from 'node:assert/strict'

import {
  hasForeignLiveLease,
  parseSingleTabLease,
  subscribeWithSingleTabLeader,
} from '../src/lib/singleTabResource.js'

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function createEnvironmentPair() {
  const values = new Map()
  const channels = new Map()
  class FakeBroadcastChannel {
    constructor(name) {
      this.name = name
      this.onmessage = null
      const listeners = channels.get(name) || new Set()
      listeners.add(this)
      channels.set(name, listeners)
    }

    postMessage(data) {
      ;(channels.get(this.name) || []).forEach((channel) => {
        if (channel !== this) channel.onmessage?.({ data })
      })
    }

    close() {
      channels.get(this.name)?.delete(this)
    }
  }
  const localStorage = {
    getItem: (key) => values.get(key) || null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  }
  const createEnvironment = () => ({
    BroadcastChannel: FakeBroadcastChannel,
    addEventListener: () => {},
    clearInterval,
    localStorage,
    removeEventListener: () => {},
    setInterval,
  })
  return [createEnvironment(), createEnvironment()]
}

test('ignora concessions malmeses o caducades', () => {
  assert.equal(parseSingleTabLease('malmès', 100), null)
  assert.equal(parseSingleTabLease({ owner: 'a', expiresAt: 99 }, 100), null)
  assert.deepEqual(parseSingleTabLease({ owner: 'a', expiresAt: 101 }, 100), {
    owner: 'a',
    expiresAt: 101,
  })
  assert.equal(hasForeignLiveLease({ owner: 'a', expiresAt: 101 }, 'b', 100), true)
  assert.equal(hasForeignLiveLease({ owner: 'a', expiresAt: 101 }, 'a', 100), false)
})

test('dues pestanyes comparteixen una sola font i la segona pren el relleu', async () => {
  const [firstEnvironment, secondEnvironment] = createEnvironmentPair()
  let firstStarts = 0
  let secondStarts = 0
  const secondPayloads = []
  let firstEmit = null
  const stopFirst = subscribeWithSingleTabLeader({
    environment: firstEnvironment,
    leaseTtlMs: 80,
    retryMs: 10,
    scope: 'messages:user-1',
    start: ({ emit }) => {
      firstStarts += 1
      firstEmit = emit
      return () => {}
    },
  })
  const stopSecond = subscribeWithSingleTabLeader({
    environment: secondEnvironment,
    leaseTtlMs: 80,
    onPayload: (payload) => secondPayloads.push(payload),
    retryMs: 10,
    scope: 'messages:user-1',
    start: () => {
      secondStarts += 1
      return () => {}
    },
  })

  firstEmit({ kind: 'messages', value: [1] })
  await wait(15)
  assert.equal(firstStarts, 1)
  assert.equal(secondStarts, 0)
  assert.deepEqual(secondPayloads, [{ kind: 'messages', value: [1] }])

  stopFirst()
  await wait(20)
  assert.equal(secondStarts, 1)
  stopSecond()
})

test('si el canal compartit no es pot obrir, conserva el listener de la pestanya', () => {
  let starts = 0
  let received = null
  const stop = subscribeWithSingleTabLeader({
    environment: {
      BroadcastChannel: class {
        constructor() {
          throw new Error('canal no disponible')
        }
      },
      localStorage: {},
    },
    onPayload: (payload) => { received = payload },
    scope: 'fallback',
    start: ({ emit }) => {
      starts += 1
      emit('dades')
      return () => {}
    },
  })

  assert.equal(starts, 1)
  assert.equal(received, 'dades')
  stop()
})
