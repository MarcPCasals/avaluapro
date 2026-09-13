import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getStudentTrackingStats, hasMinimumTrackingActivities } from '../src/lib/analytics.js'

const studentId = 'student_1'

function task(id) {
  return { id, classId: 'class_1', utId: 'ut_1' }
}

describe('minimum sample for urgent consistency alerts', () => {
  it('does not treat the initial activity as enough evidence for an urgent alert', () => {
    const tracking = getStudentTrackingStats(studentId, [], [task('task_1')])

    assert.equal(tracking.consistency, 0)
    assert.equal(tracking.activityCount, 1)
    assert.equal(hasMinimumTrackingActivities(tracking), false)
  })

  it('allows a 0% consistency alert from the second activity onwards', () => {
    const tracking = getStudentTrackingStats(studentId, [], [task('task_1'), task('task_2')])

    assert.equal(tracking.consistency, 0)
    assert.equal(tracking.activityCount, 2)
    assert.equal(hasMinimumTrackingActivities(tracking), true)
  })

  it('still requires at least one evaluable activity', () => {
    const tasks = [task('task_1'), task('task_2')]
    const records = tasks.map((item, index) => ({
      id: `record_${index + 1}`,
      studentId,
      taskId: item.id,
      status: 'EXEMPT',
    }))
    const tracking = getStudentTrackingStats(studentId, records, tasks)

    assert.equal(tracking.activityCount, 2)
    assert.equal(tracking.hasTrackingData, false)
    assert.equal(hasMinimumTrackingActivities(tracking), false)
  })
})
