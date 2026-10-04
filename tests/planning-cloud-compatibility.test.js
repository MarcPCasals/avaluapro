import assert from 'node:assert/strict'
import test from 'node:test'
import { withPlanningCloudCompatibility } from '../src/data/cloud/planningCloudCompatibility.js'

const legacy = {
  id: 'fictional-activity', entityType: 'planningActivity', ownerUid: 'fictional-owner',
  createdAt: '2026-09-22T12:00:00.000Z', updatedAt: '2026-10-04T12:00:00.000Z',
  title: 'Activitat fictícia', description: 'Contingut original', plannedMinutes: 55,
  teacherMaterials: [{ kind: 'physical', label: 'Paper' }],
  diversityMeasures: [{ id: 'fictional-measure', label: 'Suport visual', studentIds: [], studentNames: [] }],
}

test('completa només el camp absent d’una activitat antiga sense alterar el contingut ni l’original', () => {
  const adapted = withPlanningCloudCompatibility(legacy)
  assert.deepEqual(adapted, { ...legacy, curriculumSelections: [] })
  assert.equal(Object.hasOwn(legacy, 'curriculumSelections'), false)
  assert.equal(adapted.diversityMeasures, legacy.diversityMeasures)
})

test('una operació antiga preserva les seleccions curriculars que ja existeixen a Firebase', () => {
  const selections = [{ temporalUnitId: 'fictional-ut', competencyId: 'fictional-competency' }]
  const adapted = withPlanningCloudCompatibility(legacy, { curriculumSelections: selections })
  assert.deepEqual(adapted.curriculumSelections, selections)
  assert.deepEqual(withPlanningCloudCompatibility(adapted), adapted)
})

test('una selecció explícita o el buidatge intencionat no es substitueixen per les dades remotes', () => {
  const remote = { curriculumSelections: [{ competencyId: 'remote' }] }
  for (const curriculumSelections of [[], [{ competencyId: 'local' }], null, 'invalid']) {
    const value = { ...legacy, curriculumSelections }
    assert.equal(withPlanningCloudCompatibility(value, remote), value)
  }
})

test('altres entitats i les baixes no es modifiquen', () => {
  const session = { entityType: 'calendarSession', id: 'fictional-session' }
  assert.equal(withPlanningCloudCompatibility(session), session)
  assert.equal(withPlanningCloudCompatibility(undefined), undefined)
})
