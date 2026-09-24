import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getCloudStartupAction,
  getCloudWorkspacePreferences,
  shouldCreateDailyCloudBackup,
} from '../src/lib/cloudStartup.js'
import {
  CLOUD_WORKSPACE_FAST_PATH_ENABLE_AT,
  buildCloudWorkspaceManifestFields,
  canUseCloudWorkspaceManifest,
  getCloudCollectionsToLoad,
  getCloudWorkspaceRevision,
} from '../src/lib/cloudWorkspaceManifest.js'
import { COLLECTIONS } from '../src/data/seedData.js'

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

test('les còpies locals i remotes diferents passen a conciliació automàtica', () => {
  assert.equal(
    getCloudStartupAction({
      cloudWorkspaceExists: true,
      localWorkspaceExists: true,
      localWorkspaceIsDemo: false,
      workspacesMatch: false,
    }),
    'auto-reconcile',
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

test('la via ràpida només accepta una revisió completa del protocol actual', () => {
  const remoteMeta = {
    ...buildCloudWorkspaceManifestFields({ revision: 'revision-1' }),
  }
  const localManifest = {
    uid: 'teacher-1',
    workspaceRevision: 'revision-1',
    datasetFingerprint: 'fingerprint-1',
  }

  assert.equal(getCloudWorkspaceRevision(remoteMeta), 'revision-1')
  assert.equal(canUseCloudWorkspaceManifest({
    uid: 'teacher-1',
    remoteMeta,
    localManifest,
    localFingerprint: 'fingerprint-1',
    localWorkspaceExists: true,
    now: new Date(CLOUD_WORKSPACE_FAST_PATH_ENABLE_AT).getTime(),
  }), true)
})

test('una versió antiga, una cua pendent o una còpia local diferent obliguen a comprovar-ho tot', () => {
  const validMeta = buildCloudWorkspaceManifestFields({ revision: 'revision-1' })
  const base = {
    uid: 'teacher-1',
    remoteMeta: validMeta,
    localManifest: {
      uid: 'teacher-1',
      workspaceRevision: 'revision-1',
      datasetFingerprint: 'fingerprint-1',
    },
    localFingerprint: 'fingerprint-1',
    localWorkspaceExists: true,
    now: new Date(CLOUD_WORKSPACE_FAST_PATH_ENABLE_AT).getTime(),
  }

  assert.equal(canUseCloudWorkspaceManifest({ ...base, remoteMeta: { ...validMeta, version: 2 } }), false)
  assert.equal(canUseCloudWorkspaceManifest({ ...base, pendingOperationCount: 1 }), false)
  assert.equal(canUseCloudWorkspaceManifest({ ...base, localFingerprint: 'fingerprint-2' }), false)
  assert.equal(canUseCloudWorkspaceManifest({ ...base, localWorkspaceIsDemo: true }), false)
  assert.equal(canUseCloudWorkspaceManifest({
    ...base,
    now: new Date(CLOUD_WORKSPACE_FAST_PATH_ENABLE_AT).getTime() - 1,
  }), false)
})

test('el manifest per col·lecció només demana els àmbits remots que han canviat', () => {
  const remoteRevisions = Object.fromEntries(COLLECTIONS.map((collectionName) => [collectionName, 'revision-1']))
  remoteRevisions.tasks = 'revision-2'
  const localRevisions = Object.fromEntries(COLLECTIONS.map((collectionName) => [collectionName, 'revision-1']))
  const localFingerprints = Object.fromEntries(COLLECTIONS.map((collectionName) => [collectionName, `fp-${collectionName}`]))
  const remoteMeta = buildCloudWorkspaceManifestFields({
    revision: 'workspace-2',
    collectionRevisions: remoteRevisions,
  })

  assert.deepEqual(getCloudCollectionsToLoad({
    uid: 'teacher-1',
    remoteMeta,
    localManifest: {
      uid: 'teacher-1',
      collectionRevisions: localRevisions,
      collectionFingerprints: localFingerprints,
    },
    localFingerprints,
    now: new Date(CLOUD_WORKSPACE_FAST_PATH_ENABLE_AT).getTime(),
  }), ['tasks'])
})

test('una petjada local inesperada rellegeix només la col·lecció afectada', () => {
  const revisions = Object.fromEntries(COLLECTIONS.map((collectionName) => [collectionName, 'revision-1']))
  const storedFingerprints = Object.fromEntries(COLLECTIONS.map((collectionName) => [collectionName, `fp-${collectionName}`]))
  const currentFingerprints = { ...storedFingerprints, students: 'fp-corrupted' }

  assert.deepEqual(getCloudCollectionsToLoad({
    uid: 'teacher-1',
    remoteMeta: buildCloudWorkspaceManifestFields({
      revision: 'workspace-1',
      collectionRevisions: revisions,
    }),
    localManifest: {
      uid: 'teacher-1',
      collectionRevisions: revisions,
      collectionFingerprints: storedFingerprints,
    },
    localFingerprints: currentFingerprints,
    now: new Date(CLOUD_WORKSPACE_FAST_PATH_ENABLE_AT).getTime(),
  }), ['students'])
})
