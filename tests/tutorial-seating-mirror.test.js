import assert from 'node:assert/strict'
import test from 'node:test'
import { buildTutorialSeatingMirror, getClassTutorialSeatingPlans } from '../src/features/evaluation/tutorialSeatingMirror.js'

test('els plànols es consulten per classe i data sense modificar els originals', () => {
  const plans = [{ id: 'old', classId: 'a', updatedAt: '2026-10-01' }, { id: 'foreign', classId: 'b', updatedAt: '2026-10-29' }, { id: 'new', classId: 'a', updatedAt: '2026-10-28' }]
  const original = JSON.stringify(plans)
  assert.deepEqual(getClassTutorialSeatingPlans(plans, 'a').map(p => p.id), ['new', 'old'])
  assert.equal(JSON.stringify(plans), original)
})

test('el mirall respecta files, blocs, llocs buits i taula docent centrada', () => {
  const plan = { layout: { rows: 2, blocks: [2, 1], teacherDeskSide: 'center', activeSeatIds: ['seat_0_0', 'seat_2_1'] }, seats: [{ studentId: 's', x: 2, y: 1 }] }
  const board = buildTutorialSeatingMirror(plan, [{ id: 's', name: 'Alumne de prova' }])
  assert.equal(board.rows, 2)
  assert.equal(board.columns, 3)
  assert.equal(board.teacherDeskSide, 'center')
  assert.equal(board.seats.find(s => s.student)?.id, 'seat_2_1')
  assert.equal(board.seats.find(s => s.student)?.blockStart, true)
  assert.equal(board.seats.filter(s => s.active).length, 2)
})

test('filtrar mig grup conserva les posicions i no mostra alumnes aliens', () => {
  const plan = { layout: { rows: 2, blocks: [2] }, seats: [{ studentId: 'a', x: 0, y: 0, halfGroup: 'A' }, { studentId: 'b', x: 1, y: 1, halfGroup: 'B' }, { studentId: 'foreign', x: 1, y: 0 }] }
  const students = [{ id: 'a', name: 'Prova A' }, { id: 'b', name: 'Prova B' }]
  const board = buildTutorialSeatingMirror(plan, students, 'B')
  assert.equal(board.seats.find(s => s.student?.id === 'a').visible, false)
  assert.equal(board.seats.find(s => s.student?.id === 'b').id, 'seat_1_1')
  assert.equal(board.seats.find(s => s.id === 'seat_1_0').student, undefined)
})
