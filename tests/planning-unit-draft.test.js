import assert from 'node:assert/strict'
import test from 'node:test'
import { acknowledgePlanningUnitDraft, getPlanningUnitDraftValues, updatePlanningUnitDraft } from '../src/domain/planning/unitDraft.js'
import { getPlanningResources } from '../src/domain/planning/resources.js'

const sections = text => ({ specific: { factsAndConcepts: [text] }, transversal: {} })
test('UP and activity list share replacements, empty lists and pending resources through refreshes', () => {
  const unit = { id: 'synthetic-up', title: 'Original', resourceSections: sections('Antic') }
  let draft = updatePlanningUnitDraft(null, 'up:class', 'resourceSections', sections('Nou'))
  const refreshed = { ...unit, title: 'Actualitzat remotament' }
  const values = getPlanningUnitDraftValues(refreshed, draft, 'up:class')
  assert.deepEqual(getPlanningResources(values).map(item => item.text), ['Nou'])
  assert.equal(values.title, 'Actualitzat remotament')
  draft = updatePlanningUnitDraft(draft, 'up:class', 'resourceSections', { specific: {}, transversal: {} })
  assert.deepEqual(getPlanningResources(getPlanningUnitDraftValues(refreshed, draft, 'up:class')), [])
  assert.equal(getPlanningUnitDraftValues(refreshed, draft, 'other:class'), refreshed)
})
test('saving the activity acknowledges only resources; new edits during saving survive', () => {
  const resources = sections('Nou')
  let draft = updatePlanningUnitDraft(null, 'up:class', 'title', 'Títol pendent')
  draft = updatePlanningUnitDraft(draft, 'up:class', 'resourceSections', resources)
  const saved = acknowledgePlanningUnitDraft(draft, 'up:class', { resourceSections: resources })
  assert.deepEqual(saved.changes, { title: 'Títol pendent' })
  draft = updatePlanningUnitDraft(draft, 'up:class', 'resourceSections', sections('Encara més nou'))
  assert.equal(acknowledgePlanningUnitDraft(draft, 'up:class', { resourceSections: resources }).changes.resourceSections, draft.changes.resourceSections)
  assert.equal(acknowledgePlanningUnitDraft(draft, 'other:class', { resourceSections: resources }), draft)
})
