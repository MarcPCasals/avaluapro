import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildStudentProfiles, getStudentTrackingStats, hasMinimumTrackingActivities } from '../src/lib/analytics.js'

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

describe('subject exemptions', () => {
  it('excludes an exempt student from subject statistics and urgent profiles', () => {
    const state = {
      behaviorEvents: [{ classId: 'class_1', studentId, type: 'incident' }],
      classes: [{ id: 'class_1', subject: 'Ciències Físiques i de la Natura' }],
      marks: [{ studentId, value: 'D' }],
      students: [{
        id: studentId,
        classId: 'class_1',
        name: 'Alumne exempt',
        tutorialExemptSubjects: ['Ciències Físiques i de la Natura'],
      }],
      taskRecords: [{ studentId, taskId: 'task_1', status: 'MISSING' }],
      tasks: [task('task_1')],
    }

    assert.deepEqual(buildStudentProfiles(state, 'class_1', 'ut_1'), [])
  })

  it('keeps the same student available in a different subject', () => {
    const state = {
      behaviorEvents: [],
      classes: [{ id: 'class_1', subject: 'Matemàtiques' }],
      marks: [],
      students: [{
        id: studentId,
        classId: 'class_1',
        name: 'Alumne exempt de ciències',
        tutorialExemptSubjects: ['Ciències Físiques i de la Natura'],
      }],
      taskRecords: [],
      tasks: [],
    }

    assert.equal(buildStudentProfiles(state, 'class_1', 'ut_1').length, 1)
  })
})
