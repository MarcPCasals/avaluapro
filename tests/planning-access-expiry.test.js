import assert from 'node:assert/strict'
import test from 'node:test'
import { planningExpiryFromDate, planningExpiryDate, isPlanningAccessExpired } from '../src/domain/planning/accessExpiry.js'
import { createAccessGrant } from '../src/domain/planning/model.js'

test('expires at the end of the chosen day in Andorra, in summer and winter', () => {
  for (const [date, expected] of [['2026-10-08', '2026-10-08T22:00:00.000Z'], ['2026-12-08', '2026-12-08T23:00:00.000Z'], ['2026-03-29', '2026-03-29T22:00:00.000Z'], ['2026-10-25', '2026-10-25T23:00:00.000Z']]) {
    const value = planningExpiryFromDate(date)
    assert.equal(new Date(value).toISOString(), expected)
    assert.equal(planningExpiryDate(value), date)
    assert.equal(isPlanningAccessExpired({ expiresAtEpochMs: value }, value - 1), false)
    assert.equal(isPlanningAccessExpired({ expiresAtEpochMs: value }, value), true)
  }
})
test('no date preserves non-expiring access and invalid dates are rejected', () => {
  assert.equal(planningExpiryFromDate(''), null)
  assert.equal(planningExpiryDate(null), '')
  assert.equal(isPlanningAccessExpired({}), false)
  for (const date of ['2026-02-30', '08/10/2026', 'invalid']) assert.throws(() => planningExpiryFromDate(date))
})
test('grant normalizes expiry and clearing the date removes a previous expiry', () => {
  const base = { ownerUid: 'teacher', planningUnitId: 'up', granteeEmail: 'direction@educand.ad', role: 'directionReader', classIds: ['class-1'], expiresAtEpochMs: planningExpiryFromDate('2026-10-08') }
  const grant = createAccessGrant(base)
  assert.equal(grant.expiresAtEpochMs, base.expiresAtEpochMs)
  assert.equal('expiresAtEpochMs' in createAccessGrant({ ...grant, expiresAtEpochMs: null }), false)
  assert.throws(() => createAccessGrant({ ...base, expiresAtEpochMs: 'tomorrow' }))
})
