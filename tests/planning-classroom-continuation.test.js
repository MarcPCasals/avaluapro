import test from 'node:test'
import assert from 'node:assert/strict'
import { applyClassroomContinuationPreview } from '../src/domain/planning/classroomContinuation.js'
import { getPlanningActivityProgress } from '../src/domain/planning/activityProgress.js'

test('la resposta real de continuació actualitza Mode aula i habilita els 10 minuts pendents', () => {
  const item = {id:'atoms-1',sourceActivityId:'atoms',plannedMinutes:40,segmentIndex:1,segmentCount:2}
  const bundle = {session:{startsAt:'2026-10-09T09:00:00',durationMinutes:60,status:'held'}, items:[item],results:[]}
  const result = {id:'result',sessionItemId:item.id,status:'continued'}
  const preview = {item, changedLockedItems:[], changedTargetResults:[result]}
  const updated = applyClassroomContinuationPreview(bundle, preview)
  assert.equal(updated.sourceItem, item)
  assert.equal(updated.bundle.results[0].status, 'continued')
  assert.deepEqual(bundle.results, [])
  const next = {session:{startsAt:'2026-10-11T09:00:00',durationMinutes:60,status:'planned'},items:[{id:'atoms-2',sourceActivityId:'atoms',plannedMinutes:10,segmentIndex:2,segmentCount:2}],results:[]}
  const progress = getPlanningActivityProgress([{id:'atoms',plannedMinutes:40}], [updated.bundle,next],[],{now:'2026-10-10T10:00:00'}).atoms
  assert.equal(progress.hasContinuation,true)
  assert.equal(progress.remainingMinutes,10)
  assert.equal(progress.completed,false)
})
test('substitueix el resultat anterior del mateix fragment i preserva els altres', () => {
  const item={id:'a'}
  const other={id:'other',sessionItemId:'b',status:'completed'}
  const bundle={results:[{id:'old',sessionItemId:'a',status:'completed'},other]}
  const result={id:'new',sessionItemId:'a',status:'continued'}
  assert.deepEqual(applyClassroomContinuationPreview(bundle,{item,changedTargetResults:[result]}).bundle.results,[other,result])
})
test('dividir minuts d’una sessió futura no fabrica un resultat de continuació de classe', () => {
  const item={id:'a',plannedMinutes:40}
  const bundle={results:[]}
  const preview={item,changedLockedItems:[{...item,plannedMinutes:30}],changedTargetResults:[],movedFromTarget:true}
  const updated=applyClassroomContinuationPreview(bundle,preview)
  assert.equal(updated.sourceItem.plannedMinutes,30)
  assert.equal(updated.bundle,bundle)
})
