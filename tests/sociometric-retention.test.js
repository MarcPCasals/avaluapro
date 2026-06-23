import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getSociometricPurgeCutoff,
  removeExpiredSociometricSurveys,
  shouldPurgeSociometricSurvey,
} from '../src/lib/sociometricRetention.js'

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.UTC(2026, 5, 23, 12)

test('calcula el tall de purga amb el marge configurat', () => {
  assert.equal(getSociometricPurgeCutoff(NOW, 7), NOW - 7 * DAY)
  assert.equal(getSociometricPurgeCutoff(NOW, 30), NOW - 30 * DAY)
})

test('purga només qüestionaris que han superat el marge', () => {
  assert.equal(shouldPurgeSociometricSurvey({ expiresAtEpochMs: NOW - 8 * DAY }, NOW, 7), true)
  assert.equal(shouldPurgeSociometricSurvey({ expiresAtEpochMs: NOW - 6 * DAY }, NOW, 7), false)
  assert.equal(shouldPurgeSociometricSurvey({ expiresAtEpochMs: 0 }, NOW, 7), false)
})

test('filtra metadades locals antigues sense afectar qüestionaris recents o legacy', () => {
  const surveys = [
    { id: 'old', expiresAtEpochMs: NOW - 8 * DAY },
    { id: 'recent', expiresAtEpochMs: NOW - 2 * DAY },
    { id: 'legacy', expiresAtEpochMs: 0 },
  ]

  assert.deepEqual(
    removeExpiredSociometricSurveys(surveys, NOW, 7).map((survey) => survey.id),
    ['recent', 'legacy'],
  )
})
