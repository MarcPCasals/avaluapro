import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { deleteApp, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { runSociometricPurge } from '../src/sociometricPurge.js'

const PROJECT_ID = 'demo-avaluapro-purge'
const DAY = 24 * 60 * 60 * 1000
const NOW = Date.UTC(2026, 5, 23, 12)
let app
let db

async function clearFirestore() {
  const response = await fetch(
    `http://${globalThis.process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: 'DELETE' },
  )
  assert.equal(response.ok, true)
}

async function seedSurvey({ ageDays, declaredResponses = 0, id, responses = 1 }) {
  const expiresAtEpochMs = NOW - ageDays * DAY
  const surveyRef = db.collection('sociometricSurveys').doc(id)
  await surveyRef.set({
    expiresAtEpochMs,
    id,
    ownerUid: 'teacher-fictici',
    responseCount: declaredResponses,
  })
  await surveyRef.collection('accessTokens').doc('token-a').set({ tokenId: 'token-a' })
  for (let index = 0; index < responses; index += 1) {
    await surveyRef.collection('responses').doc(`response-${index}`).set({ responseId: `response-${index}` })
  }
  await db.collection('users').doc('teacher-fictici').collection('sociometricSurveys').doc(id).set({ id })
  await db
    .collection('users')
    .doc('teacher-fictici')
    .collection('cloudBackups')
    .doc('backup-fictici')
    .collection('sociometricSurveys')
    .doc(id)
    .set({ id })
}

before(() => {
  app = initializeApp({ projectId: PROJECT_ID }, 'sociometric-purge-tests')
  db = getFirestore(app)
})

beforeEach(clearFirestore)

after(async () => {
  await deleteApp(app)
})

test('el mode sec inventaria però no elimina', async () => {
  await seedSurvey({ ageDays: 8, id: 'old-dry-run' })

  const summary = await runSociometricPurge({
    db,
    dryRun: true,
    nowMs: NOW,
    retentionDays: 7,
  })

  assert.equal(summary.candidateCount, 1)
  assert.equal(summary.deletedSurveyCount, 0)
  assert.equal(summary.copyCount, 2)
  assert.equal((await db.collection('sociometricSurveys').doc('old-dry-run').get()).exists, true)
})

test('elimina qüestionari antic, fills i totes les còpies privades', async () => {
  await seedSurvey({ ageDays: 8, declaredResponses: 1, id: 'old-live', responses: 2 })
  await seedSurvey({ ageDays: 2, declaredResponses: 1, id: 'recent', responses: 1 })

  const summary = await runSociometricPurge({
    db,
    nowMs: NOW,
    retentionDays: 7,
  })

  assert.equal(summary.candidateCount, 1)
  assert.equal(summary.deletedSurveyCount, 1)
  assert.equal(summary.copyCount, 2)
  assert.equal(summary.tokenCount, 1)
  assert.equal(summary.responseCount, 2)
  assert.equal(summary.unsyncedResponseCount, 1)
  assert.equal((await db.collection('sociometricSurveys').doc('old-live').get()).exists, false)
  assert.equal(
    (
      await db
        .collection('users')
        .doc('teacher-fictici')
        .collection('sociometricSurveys')
        .doc('old-live')
        .get()
    ).exists,
    false,
  )
  assert.equal(
    (
      await db
        .collection('users')
        .doc('teacher-fictici')
        .collection('cloudBackups')
        .doc('backup-fictici')
        .collection('sociometricSurveys')
        .doc('old-live')
        .get()
    ).exists,
    false,
  )
  assert.equal((await db.collection('sociometricSurveys').doc('recent').get()).exists, true)
  assert.equal((await db.collection('systemPurgeRuns').get()).size, 1)
})

test('una execució desactivada no consulta ni modifica dades', async () => {
  await seedSurvey({ ageDays: 8, id: 'disabled' })

  const summary = await runSociometricPurge({
    db,
    enabled: false,
    nowMs: NOW,
    retentionDays: 7,
  })

  assert.equal(summary.candidateCount, 0)
  assert.equal((await db.collection('sociometricSurveys').doc('disabled').get()).exists, true)
  assert.equal((await db.collection('systemPurgeRuns').get()).size, 0)
})
