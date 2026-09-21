import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyPlanningActivityOverrides,
  getConnectablePlanningUnits,
  getConnectedClassIds,
  getPlanningActivityOverrideSnapshot,
  getPlanningUnitsForClass,
} from '../src/domain/planning/classPlanning.js'
import { movePlanningActivityInSequence } from '../src/domain/planning/rules.js'

const units = [
  { id: 'up-cfn', status: 'draft', title: 'CFN 1.1' },
  { id: 'up-sg', status: 'draft', title: 'SG 1.1' },
  { id: 'up-old', status: 'archived', title: 'Arxivada' },
]

const applications = [
  { classId: '1d', planningUnitId: 'up-cfn', status: 'active' },
  { classId: '1c', planningUnitId: 'up-cfn', status: 'draft' },
  { classId: 'sg', planningUnitId: 'up-sg', status: 'active' },
  { classId: 'sg', planningUnitId: 'up-old', status: 'archived' },
]

test('cada classe veu només les UP que té connectades', () => {
  assert.deepEqual(getPlanningUnitsForClass(units, applications, '1d').map((unit) => unit.id), ['up-cfn'])
  assert.deepEqual(getPlanningUnitsForClass(units, applications, '1c').map((unit) => unit.id), ['up-cfn'])
  assert.deepEqual(getPlanningUnitsForClass(units, applications, 'sg').map((unit) => unit.id), ['up-sg'])
  assert.deepEqual(getPlanningUnitsForClass(units, applications, 'pi').map((unit) => unit.id), [])
})

test('una UP connectada conserva la llista de classes sense duplicats', () => {
  assert.deepEqual(getConnectedClassIds([
    ...applications,
    { classId: '1c', planningUnitId: 'up-cfn', status: 'active' },
  ], 'up-cfn'), ['1d', '1c'])
})

test('el selector de connexió exclou les UP ja connectades i les arxivades', () => {
  assert.deepEqual(getConnectablePlanningUnits(units, applications, '1c').map((unit) => unit.id), ['up-sg'])
  assert.deepEqual(getConnectablePlanningUnits(units, applications, 'pi').map((unit) => unit.id), ['up-cfn', 'up-sg'])
})

test('una excepció de 1rD canvia l’ordre sense modificar la UP que veu 1rC', () => {
  const baseActivities = [
    { id: 'a', order: 0, ownerUid: 'teacher-1', phaseId: 'phase-1', planningUnitId: 'up-1', title: 'Primera' },
    { id: 'b', order: 1, ownerUid: 'teacher-1', phaseId: 'phase-1', planningUnitId: 'up-1', title: 'Segona' },
    { id: 'c', order: 2, ownerUid: 'teacher-1', phaseId: 'phase-1', planningUnitId: 'up-1', title: 'Tercera' },
  ]
  const moved = movePlanningActivityInSequence(baseActivities, {
    activityId: 'c',
    targetActivityId: 'a',
    targetPhaseId: 'phase-1',
  }, { now: '2026-09-21T09:00:00.000Z' })
  const overrides = moved.changedActivities.map((activity, index) => ({
    id: `override-${index}`,
    activityId: activity.id,
    changes: getPlanningActivityOverrideSnapshot(activity),
    createdAt: '2026-09-21T09:00:00.000Z',
    updatedAt: '2026-09-21T09:00:00.000Z',
  }))
  const effectiveFor1d = applyPlanningActivityOverrides(baseActivities, overrides)
  const orderByPhase = (items) => items
    .filter((activity) => activity.phaseId === 'phase-1')
    .sort((left, right) => Number(left.order) - Number(right.order))
    .map((activity) => activity.id)

  assert.deepEqual(orderByPhase(effectiveFor1d), ['c', 'a', 'b'])
  assert.deepEqual(orderByPhase(baseActivities), ['a', 'b', 'c'])
  assert.deepEqual(orderByPhase(applyPlanningActivityOverrides(baseActivities, [])), ['a', 'b', 'c'])
  assert.ok(effectiveFor1d.every((activity) => activity.groupOverride))
})

test('l’última excepció pot restaurar un camp i amagar una activitat només al grup', () => {
  const base = [{ id: 'a', order: 0, phaseId: 'phase-1', title: 'Títol base' }]
  const visible = applyPlanningActivityOverrides(base, [
    { activityId: 'a', changes: { title: 'Títol 1rD' }, updatedAt: '2026-09-21T09:00:00.000Z' },
    { activityId: 'a', changes: { title: 'Títol base' }, updatedAt: '2026-09-21T10:00:00.000Z' },
  ])
  const hidden = applyPlanningActivityOverrides(base, [
    { activityId: 'a', changes: { hidden: true }, updatedAt: '2026-09-21T11:00:00.000Z' },
  ])

  assert.equal(visible[0].title, 'Títol base')
  assert.deepEqual(hidden, [])
})
