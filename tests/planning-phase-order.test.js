import assert from 'node:assert/strict'
import test from 'node:test'
import { movePlanningPhaseInSequence } from '../src/domain/planning/rules.js'
import { orderActivitiesForScheduling } from '../src/domain/planning/scheduler.js'
import { orderPlanningPhases } from '../src/domain/planning/phaseSequence.js'

test('editor i direcció recorren la fase mare abans de subfases encara que arribin ordenades globalment', () => {
  const incoming = [
    { id: 'motivation', parentPhaseId: 'preparation', order: 0 },
    { id: 'detail', parentPhaseId: 'resolution', order: 0 },
    { id: 'preparation', order: 0 },
    { id: 'knowledge', parentPhaseId: 'preparation', order: 1 },
    { id: 'resolution', order: 1 },
  ]
  assert.deepEqual(orderPlanningPhases(incoming).map(({ id, depth }) => [id, depth]), [
    ['preparation', 0], ['motivation', 1], ['knowledge', 1], ['resolution', 0], ['detail', 1],
  ])
  assert.deepEqual(orderActivitiesForScheduling(incoming, [
    { id: 'a2', phaseId: 'motivation', order: 0 }, { id: 'a1', phaseId: 'preparation', order: 1 },
  ]).map((activity) => activity.id), ['a1', 'a2'])
  assert.equal(incoming[0].depth, undefined)
})

test('conserva fases orfes i evita cicles sense duplicar fases', () => {
  const incoming = [{ id: 'orphan', parentPhaseId: 'gone', order: 0 }, { id: 'a', parentPhaseId: 'b' }, { id: 'b', parentPhaseId: 'a' }]
  assert.deepEqual(orderPlanningPhases(incoming).map((phase) => phase.id), ['orphan', 'a', 'b'])
})

const phases = [
  { id: 'root', planningUnitId: 'up', parentPhaseId: null, order: 0, title: 'Resolució' },
  { id: 'r1', planningUnitId: 'up', parentPhaseId: 'root', order: 4, title: 'R1 Propostes' },
  { id: 'r2', planningUnitId: 'up', parentPhaseId: 'root', order: 8, title: 'R2 Adquisició' },
  { id: 'r3', planningUnitId: 'up', parentPhaseId: 'root', order: 12, title: 'R3 Pla de treball' },
  { id: 'child', planningUnitId: 'up', parentPhaseId: 'r3', order: 0, title: 'Detall' },
  { id: 'closing', planningUnitId: 'up', parentPhaseId: null, order: 1, title: 'Tancament' },
  { id: 'other', planningUnitId: 'other-up', parentPhaseId: null, order: 0 },
]
const activities = [
  { id: 'a1', phaseId: 'r1', order: 0 },
  { id: 'a2', phaseId: 'r2', order: 0 },
  { id: 'a3', phaseId: 'r3', order: 0 },
  { id: 'a4', phaseId: 'child', order: 0 },
]
const siblingIds = (items) => items.filter((item) => item.parentPhaseId === 'root')
  .sort((a, b) => a.order - b.order).map((item) => item.id)

test('moure R3 davant de R2 conserva tot el bloc i canvia la seqüència per a Agenda', () => {
  const snapshot = structuredClone(phases)
  const result = movePlanningPhaseInSequence(phases, { phaseId: 'r3', targetPhaseId: 'r2' }, { now: '2026-10-06T08:00:00Z' })
  assert.deepEqual(siblingIds(result.phases), ['r1', 'r3', 'r2'])
  assert.deepEqual(orderActivitiesForScheduling(result.phases, activities).map((item) => item.id), ['a1', 'a3', 'a4', 'a2'])
  assert.equal(result.phases.find((item) => item.id === 'r3').title, 'R3 Pla de treball')
  assert.equal(result.phases.find((item) => item.id === 'child'), phases[4])
  assert.equal(result.phases.find((item) => item.id === 'closing'), phases[5])
  assert.deepEqual(phases, snapshot)
  assert.ok(result.changedPhases.every((item) => item.parentPhaseId === 'root'))
})

test('es poden moure subfases buides al principi i al final, i repetir el moviment és innocu', () => {
  const empty = [...phases, { id: 'empty', planningUnitId: 'up', parentPhaseId: 'root', order: 20 }]
  const first = movePlanningPhaseInSequence(empty, { phaseId: 'empty', targetPhaseId: 'r1' })
  assert.deepEqual(siblingIds(first.phases), ['empty', 'r1', 'r2', 'r3'])
  const last = movePlanningPhaseInSequence(first.phases, { phaseId: 'empty' })
  assert.deepEqual(siblingIds(last.phases), ['r1', 'r2', 'r3', 'empty'])
  assert.equal(movePlanningPhaseInSequence(last.phases, { phaseId: 'empty' }).changedPhases.length, 0)
  assert.equal(movePlanningPhaseInSequence(last.phases, { phaseId: 'r2', targetPhaseId: 'r2' }).changedPhases.length, 0)
})

test('moure fases principals conserva tots els descendents i exclou altres UP', () => {
  const result = movePlanningPhaseInSequence(phases, { phaseId: 'root' })
  assert.equal(result.phases.find((item) => item.id === 'root').order, 1)
  assert.equal(result.phases.find((item) => item.id === 'closing').order, 0)
  for (const id of ['r1', 'r2', 'r3', 'child', 'other']) {
    assert.equal(result.phases.find((item) => item.id === id), phases.find((item) => item.id === id))
  }
})

test('rebutja destinacions inexistents, d’una altra fase mare o d’una altra UP', () => {
  for (const targetPhaseId of ['missing', 'child', 'root', 'other']) {
    assert.throws(() => movePlanningPhaseInSequence(phases, { phaseId: 'r3', targetPhaseId }))
  }
  assert.throws(() => movePlanningPhaseInSequence(phases, { phaseId: 'missing' }))
})
