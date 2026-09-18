import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getCloudStartupAction,
  getCloudWorkspacePreferences,
  shouldCreateDailyCloudBackup,
} from '../src/lib/cloudStartup.js'

test('un navegador nou baixa les dades quan Firebase ja té un espai de treball', () => {
  assert.equal(
    getCloudStartupAction({
      cloudWorkspaceExists: true,
      localWorkspaceExists: false,
      pendingOperationCount: 0,
    }),
    'pull-cloud',
  )
})

test('la demo inicial es pot substituir per les dades reals de Firebase', () => {
  assert.equal(
    getCloudStartupAction({
      cloudWorkspaceExists: true,
      localWorkspaceExists: true,
      localWorkspaceIsDemo: true,
    }),
    'pull-cloud',
  )
})

test('els canvis locals pendents es pugen abans de baixar Firebase', () => {
  assert.equal(
    getCloudStartupAction({ cloudWorkspaceExists: true, pendingOperationCount: 3 }),
    'flush-local',
  )
})

test('un compte sense cap còpia remota conserva les dades locals', () => {
  assert.equal(
    getCloudStartupAction({ cloudWorkspaceExists: false, pendingOperationCount: 0 }),
    'keep-local',
  )
})

test('mai se substitueixen automàticament dades locals reals diferents de Firebase', () => {
  assert.equal(
    getCloudStartupAction({
      cloudWorkspaceExists: true,
      localWorkspaceExists: true,
      localWorkspaceIsDemo: false,
      workspacesMatch: false,
    }),
    'review-conflict',
  )
})

test('si local i Firebase coincideixen només es confirma la sincronització', () => {
  assert.equal(
    getCloudStartupAction({
      cloudWorkspaceExists: true,
      localWorkspaceExists: true,
      workspacesMatch: true,
    }),
    'already-synced',
  )
})

test('les dades reals del núvol desactiven la demo i la guia inicial', () => {
  assert.deepEqual(
    getCloudWorkspacePreferences(
      { activeMode: 'tracking', demoMode: true, guideOpen: true },
      { defaultSubject: 'Matemàtiques', demoMode: true, guideOpen: true },
    ),
    {
      activeMode: 'tracking',
      defaultSubject: 'Matemàtiques',
      demoMode: false,
      guideOpen: false,
      guideMode: 'own',
    },
  )
})

test('la còpia diària només es crea amb dades reals plenament sincronitzades', () => {
  const base = {
    appStatus: 'ready',
    cloudStatus: 'synced',
    triggeredByConfirmedChange: true,
    isDemo: false,
    pendingOperationCount: 0,
    recentBackups: [],
    now: '2026-09-18T10:00:00+02:00',
  }
  assert.equal(shouldCreateDailyCloudBackup(base), true)
  assert.equal(shouldCreateDailyCloudBackup({ ...base, cloudStatus: 'review' }), false)
  assert.equal(shouldCreateDailyCloudBackup({ ...base, pendingOperationCount: 1 }), false)
  assert.equal(shouldCreateDailyCloudBackup({ ...base, isDemo: true }), false)
  assert.equal(shouldCreateDailyCloudBackup({ ...base, triggeredByConfirmedChange: false }), false)
})

test('una còpia automàtica feta avui evita una segona còpia completa', () => {
  assert.equal(
    shouldCreateDailyCloudBackup({
      appStatus: 'ready',
      cloudStatus: 'synced',
      triggeredByConfirmedChange: true,
      recentBackups: [{ createdAt: '2026-09-18T08:15:00.000Z', reason: 'auto-daily' }],
      now: '2026-09-18T12:00:00+02:00',
    }),
    false,
  )
})

test('una còpia manual anterior al primer canvi no anul·la la còpia automàtica del dia', () => {
  assert.equal(
    shouldCreateDailyCloudBackup({
      appStatus: 'ready',
      cloudStatus: 'synced',
      triggeredByConfirmedChange: true,
      recentBackups: [{ createdAt: '2026-09-18T08:15:00.000Z', reason: 'manual' }],
      now: '2026-09-18T12:00:00+02:00',
    }),
    true,
  )
})
