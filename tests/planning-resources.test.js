import assert from 'node:assert/strict'
import test from 'node:test'
import { getPlanningResources, matchPastedResources, getResourceCoverage } from '../src/domain/planning/resources.js'
import { createPlanningActivity, copyPlanningActivityToPhase } from '../src/domain/planning/model.js'
import { getPlanningActivityOverrideSnapshot, applyPlanningActivityOverrides } from '../src/domain/planning/classPlanning.js'
import { buildPlanningDocumentExport, parsePlanningDocumentExport } from '../src/domain/planning/documents.js'
import { withPlanningCloudCompatibility } from '../src/data/cloud/planningCloudCompatibility.js'
const unit = { title: 'Unitat fictícia', resourceSections: {
  specific: { procedures: ['CHSB1 Valoració de la fiabilitat de les fonts', 'CHSB1 Ús de diverses maneres d’organitzar la informació'], attitudesAndValues: ['CHSB3 Valoració del territori'] },
  transversal: { factsAndConcepts: ['TC1 El Pla d’acció (Què faré i com ho faré?)'], procedures: ['TC3 Relació respectuosa amb els altres'], attitudesAndValues: ['TC3 Respecte per les opinions dels altres'] },
} }
const resources = getPlanningResources(unit)
const create = selections => createPlanningActivity({ ownerUid:'synthetic',planningUnitId:'up',phaseId:'phase',order:0,title:'Activitat fictícia', resourceSelections: selections }, {now:'2026-10-06T08:00:00Z'})

test('cada línia és un recurs, els codis repetits no es confonen i s’accepten encapçalaments i TC1El', () => {
  const result = matchPastedResources(`CHSB1 Valoració de la fiabilitat de les fonts\nCHSB1 Ús de diverses maneres d’organitzar la informació\nFets i conceptes:\nTC1El Pla d’acció (Què faré i com ho faré?)\nProcediments:\nTC3 Relació respectuosa amb els altres\nActituds i valors:\nTC3 Respecte per les opinions dels altres`, resources)
  assert.equal(result.matches.length,5)
  assert.deepEqual(result.unmatched,[])
  assert.equal(matchPastedResources('CHSB1',resources).matches.length,0)
})
test('les coincidències desconegudes i ambigües queden pendents de revisió', () => {
  const duplicated = [...resources,{...resources[0],scope:'transversal'}]
  const result=matchPastedResources(`${resources[0].text}\nText desconegut`,duplicated)
  assert.equal(result.matches.length,0)
  assert.equal(result.unmatched.length,2)
})
test('la cobertura no duplica recursos i es desfà quan es retiren tots els vincles', () => {
  const a=create([resources[0],resources[0]])
  const b={...create([resources[0]]),id:'second'}
  assert.equal(a.resourceSelections.length,1)
  let coverage=getResourceCoverage(resources,[a,b],new Set([a.id]))
  assert.equal(coverage[0].activities.length,2)
  assert.equal(coverage[0].completed,true)
  coverage=getResourceCoverage(resources,[b])
  assert.equal(coverage[0].activities.length,1)
  assert.equal(coverage[0].completed,false)
  assert.equal(getResourceCoverage(resources,[])[0].activities.length,0)
})
test('desament, còpies, adaptacions de grup i exportació conserven els recursos', () => {
  const activity=create([resources[1]])
  assert.deepEqual(copyPlanningActivityToPhase(activity,{planningUnitId:'copy',phaseId:'copy-phase',order:0,sourceAcademicYearId:'year'}).resourceSelections,activity.resourceSelections)
  const override=getPlanningActivityOverrideSnapshot({...activity,resourceSelections:[resources[0]]})
  const applied=applyPlanningActivityOverrides([activity],[{activityId:activity.id,changes:override}])
  assert.deepEqual(applied[0].resourceSelections,[resources[0]])
  const exported=parsePlanningDocumentExport(buildPlanningDocumentExport({unit,phases:[{id:'phase',title:'Fase',kind:'custom'}],activities:[activity]}))
  assert.deepEqual(exported.activities[0].resourceSelections,activity.resourceSelections)
  assert.deepEqual(create().resourceSelections,[])
})
test('una operació antiga no esborra els recursos remots i [] explícit sí que els retira', () => {
  const legacy={...create()};delete legacy.resourceSelections
  assert.deepEqual(withPlanningCloudCompatibility(legacy,{resourceSelections:[resources[0]]}).resourceSelections,[resources[0]])
  assert.deepEqual(withPlanningCloudCompatibility(create(),{resourceSelections:[resources[0]]}).resourceSelections,[])
})
