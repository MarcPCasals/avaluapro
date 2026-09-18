import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getCloudStartupAction,
  getCloudWorkspacePreferences,
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
