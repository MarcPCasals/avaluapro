import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PRE_UPDATE_RELEASE,
  acknowledgeRelease,
  getPreUpdateReleaseGate,
  hasPreUpdateReleaseBackup,
  isReleaseAcknowledged,
} from '../src/lib/preUpdateRelease.js'

test('la còpia de preactualització es reconeix pel motiu o per l’identificador estable', () => {
  assert.equal(hasPreUpdateReleaseBackup([{ reason: PRE_UPDATE_RELEASE.backupReason }]), true)
  assert.equal(hasPreUpdateReleaseBackup([{ id: PRE_UPDATE_RELEASE.backupId }]), true)
  assert.equal(hasPreUpdateReleaseBackup([{ reason: 'manual' }]), false)
})

test('la còpia només comença quan les dades reals ja han acabat la sincronització inicial', () => {
  const base = {
    appStatus: 'ready',
    cloudStatus: 'synced',
    cloudStartupComplete: true,
    isDemo: false,
    pendingOperationCount: 0,
    recentBackups: [],
    user: { uid: 'teacher-1' },
  }
  assert.equal(getPreUpdateReleaseGate(base), 'backup-required')
  assert.equal(getPreUpdateReleaseGate({ ...base, cloudStartupComplete: false }), 'waiting')
  assert.equal(getPreUpdateReleaseGate({ ...base, pendingOperationCount: 1 }), 'waiting')
  assert.equal(getPreUpdateReleaseGate({ ...base, cloudStatus: 'review' }), 'review')
  assert.equal(getPreUpdateReleaseGate({ ...base, cloudStatus: 'error' }), 'error')
})

test('una còpia confirmada activa la versió sense crear-ne una altra', () => {
  assert.equal(
    getPreUpdateReleaseGate({
      appStatus: 'ready',
      cloudStatus: 'synced',
      cloudStartupComplete: true,
      recentBackups: [{ reason: PRE_UPDATE_RELEASE.backupReason }],
      user: { uid: 'teacher-1' },
    }),
    'ready',
  )
})

test('l’avís queda confirmat per compte i versió', () => {
  const values = new Map()
  const storage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  }
  assert.equal(isReleaseAcknowledged('teacher-1', storage), false)
  assert.equal(acknowledgeRelease('teacher-1', storage), true)
  assert.equal(isReleaseAcknowledged('teacher-1', storage), true)
  assert.equal(isReleaseAcknowledged('teacher-2', storage), false)
})
