import test from 'node:test'
import assert from 'node:assert/strict'

import { buildClassroomTaskActivation, getClassroomSessionTasks } from '../src/lib/classroomTracking.js'

function ids() {
  let index = 0
  return (prefix) => `${prefix}-${++index}`
}

const input = {
  applicationId: 'application-1',
  classId: 'class-1',
  date: '2026-09-21',
  evidenceKey: 'application-1:activity-1:final',
  evidenceMode: 'final',
  planningUnitId: 'up-1',
  sessionId: 'session-1',
  sessionItemId: 'item-1',
  sourceActivityId: 'activity-1',
  studentIds: ['student-1', 'student-2'],
  absentStudentIds: ['student-2'],
  title: 'Informe final',
  utId: 'ut-1',
}

test('activar una evidència dona per feta la presència i deixa l’absència exempta', () => {
  const activation = buildClassroomTaskActivation({ tasks: [], taskRecords: [] }, input, ids())
  assert.equal(activation.isNewTask, true)
  assert.equal(activation.task.source, 'classroom')
  assert.deepEqual(activation.records.map((record) => [record.studentId, record.status]), [
    ['student-1', 'DONE'],
    ['student-2', 'EXEMPT'],
  ])
})

test('reactivar la mateixa evidència no duplica ni la tasca ni els registres existents', () => {
  const first = buildClassroomTaskActivation({ tasks: [], taskRecords: [] }, input, ids())
  const second = buildClassroomTaskActivation({
    tasks: [first.task],
    taskRecords: first.records,
  }, input, ids())
  assert.equal(second.isNewTask, false)
  assert.equal(second.task.id, first.task.id)
  assert.deepEqual(second.records, [])
})

test('Mode aula mostra les tasques que vencen el dia de la sessió encara que no vinguin de la UP', () => {
  const tasks = [
    { id: 'due', classId: 'class-1', date: '2026-09-23', order: 2, title: 'Deures' },
    { id: 'other-day', classId: 'class-1', date: '2026-09-24', order: 1, title: 'Més tard' },
    { id: 'other-class', classId: 'class-2', date: '2026-09-23', order: 1, title: 'Altre grup' },
  ]
  const result = getClassroomSessionTasks({
    classId: 'class-1',
    date: '2026-09-23',
    tasks,
  })

  assert.deepEqual(result.map((task) => task.id), ['due'])
})

test('Mode aula no duplica una tasca que també és evidència de la sessió', () => {
  const tasks = [{
    id: 'shared',
    classId: 'class-1',
    date: '2026-09-23',
    evidenceKey: 'evidence-1',
    order: 1,
    title: 'Informe',
  }]
  const result = getClassroomSessionTasks({
    classId: 'class-1',
    date: '2026-09-23',
    evidenceKeys: ['evidence-1'],
    tasks,
  })

  assert.deepEqual(result.map((task) => task.id), ['shared'])
})
