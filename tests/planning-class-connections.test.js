import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getConnectablePlanningUnits,
  getConnectedClassIds,
  getPlanningUnitsForClass,
} from '../src/domain/planning/classPlanning.js'

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

