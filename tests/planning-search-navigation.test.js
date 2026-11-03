import assert from 'node:assert/strict'
import test from 'node:test'
import { getPlanningSearchStep } from '../src/features/search/planningSearchNavigation.js'
const unit = { id: 'up' }
const activity = { id: 'activity' }
const workspace = { academicYears: [{ id: 'year' }], activeAcademicYearId: 'year', loadedUnitsYearId: 'year', loading: false, planningUnits: [unit], classPlanningUnits: [unit], activePlanningUnitId: 'up', loadedStructureId: 'up', activities: [activity], canEditActiveUnit: true, temporalUnits: [{ id: 'ut' }] }
const target = { academicYearId: 'year', planningUnitId: 'up', activityId: 'activity' }
test('espera el curs, la UP i la seva estructura abans d’obrir l’activitat', () => {
  assert.equal(getPlanningSearchStep({ ...workspace, activeAcademicYearId: 'old' }, target).kind, 'year')
  assert.equal(getPlanningSearchStep({ ...workspace, loadedUnitsYearId: 'old' }, target).kind, 'wait')
  assert.equal(getPlanningSearchStep({ ...workspace, activePlanningUnitId: 'old' }, target).kind, 'unit')
  assert.equal(getPlanningSearchStep({ ...workspace, loadedStructureId: 'old' }, target).kind, 'wait')
  assert.deepEqual(getPlanningSearchStep(workspace, target), { kind: 'activity', activity })
})
test('respecta permisos de lectura i no connecta automàticament cap classe', () => {
  assert.deepEqual(getPlanningSearchStep({ ...workspace, canEditActiveUnit: false }, target), { kind: 'dialog', dialog: 'preview' })
  assert.equal(getPlanningSearchStep({ ...workspace, classPlanningUnits: [] }, target).kind, 'connect')
})
test('les activitats eliminades produeixen un error explícit', () => {
  assert.equal(getPlanningSearchStep({ ...workspace, activities: [] }, target).kind, 'error')
  assert.equal(getPlanningSearchStep({ ...workspace, planningUnits: [] }, target).kind, 'error')
})
test('nova UP respecta els prerequisits de curs i UT', () => {
  assert.equal(getPlanningSearchStep(workspace, { action: 'new-unit' }).dialog, 'unit')
  assert.equal(getPlanningSearchStep({ ...workspace, temporalUnits: [] }, { action: 'new-unit' }).dialog, 'ut')
  assert.equal(getPlanningSearchStep({ ...workspace, activeAcademicYearId: '' }, { action: 'new-unit' }).dialog, 'year')
})
