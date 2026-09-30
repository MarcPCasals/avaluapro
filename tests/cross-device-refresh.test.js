import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CROSS_DEVICE_REFRESH_THROTTLE_MS,
  shouldRefreshCrossDevice,
} from '../src/lib/crossDeviceRefresh.js'

test('reprendre una pestanya visible i connectada activa la comprovació entre dispositius', () => {
  assert.equal(shouldRefreshCrossDevice({
    lastRequestedAt: 1_000,
    now: 1_000 + CROSS_DEVICE_REFRESH_THROTTLE_MS,
  }), true)
})

test('no duplica comprovacions immediates ni consulta mentre està offline o amagada', () => {
  assert.equal(shouldRefreshCrossDevice({ lastRequestedAt: 1_000, now: 2_000 }), false)
  assert.equal(shouldRefreshCrossDevice({ isOnline: false, lastRequestedAt: 0, now: 20_000 }), false)
  assert.equal(shouldRefreshCrossDevice({ isVisible: false, lastRequestedAt: 0, now: 20_000 }), false)
})
