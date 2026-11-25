import assert from 'node:assert/strict'
import test from 'node:test'
import { nextReminderSession } from '../src/lib/reminderScheduling.js'

test('proposes the next future session of the selected class and skips elapsed sessions', () => {
  const options = [
    { classId: 'a', date: '2026-11-25', time: '09:00' },
    { classId: 'b', date: '2026-11-25', time: '18:00' },
    { classId: 'a', date: '2026-11-27', time: '10:00' },
    { classId: 'a', date: '2026-11-26', time: '11:00' },
  ]
  assert.deepEqual(nextReminderSession(options, 'a', new Date('2026-11-25T17:00:00')), options[3])
  assert.deepEqual(nextReminderSession(options, 'b', new Date('2026-11-25T17:00:00')), options[1])
  assert.equal(nextReminderSession(options, 'a', new Date('2026-11-28T12:00:00')), null)
  assert.equal(nextReminderSession(options, '', new Date('2026-11-25T17:00:00')), null)
})
