import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import test from 'node:test'
import { getSavedSeatingAssignments, getUnseatedStudentIds, normalizeSavedSeatingRestrictions } from '../src/features/tutoring/seatingPlanHistoryUtils.js'

// Exercita els controladors del component amb estat sintètic, sense DOM ni connectors remots.
const source = await readFile(new URL('../src/features/tutoring/TutoringView.jsx', import.meta.url), 'utf8')
function handler(name, nextName, scope) {
  const start = source.indexOf(`  const ${name} =`)
  const end = source.indexOf(`  const ${nextName}`, start)
  return vm.runInNewContext(`${source.slice(start, end)}; ${name}`, scope)
}
function fixture() {
  const state = {}
  const scope = {
    normalizeSeatingLayout: layout => ({ ...layout }), normalizeSeatingBlocks: blocks => blocks || [],
    getSavedSeatingAssignments, getUnseatedStudentIds, normalizeSavedSeatingRestrictions,
    getGridSeatId: (x, y) => `seat_${x}_${y}`, DEFAULT_SEATING_BLOCKS: [3],
    classStudents: [{ id: 'fictici-1' }, { id: 'fictici-2' }],
  }
  for (const name of new Set(source.match(/setSeating\w+|setLoadedSeatingPlanId|setSelectedSeating\w+/g))) {
    scope[name] = value => { state[name] = value }
  }
  const load = handler('handleLoadTutorialSeatingPlan', 'handleOpenTutorialSeatingTool', scope)
  return { state, scope, load }
}
const original = {
  id: 'version-1', title: 'Inici', isActive: true, observation: 'Observació fictícia',
  layout: { blocks: [3], rows: 2, lockedStudentIds: [], seatingRestrictions: { blockedSeatIds: ['seat_2_1'] } },
  seats: [{ studentId: 'fictici-1', x: 1, y: 0, isLocked: true }],
}

test('carregar per modificar conserva el nom, l’activació, els llocs i els alumnes fixats', () => {
  const { state, load } = fixture()
  load(original)
  assert.equal(state.setSeatingSaveMode, 'update')
  assert.equal(state.setSeatingPlanName, 'Inici')
  assert.equal(state.setSeatingSaveAsActive, true)
  assert.deepEqual(state.setSeatingManualSeatByStudentId, { 'fictici-1': 'seat_1_0' })
  assert.deepEqual(Array.from(state.setSeatingLockedStudentIds), ['fictici-1'])
  assert.deepEqual(state.setSeatingUnseatedStudentIds, ['fictici-2'])
  assert.deepEqual(state.setSeatingRestrictions.blockedSeatIds, ['seat_2_1'])
  assert.equal(state.setSelectedSeatingPlanId, '')
})

test('crear una nova versió parteix de l’anterior i no substitueix l’activa per defecte', () => {
  const { state, load } = fixture()
  load(original, 'new')
  assert.equal(state.setSeatingSaveMode, 'new')
  assert.equal(state.setSeatingPlanName, 'Inici · nova versió')
  assert.equal(state.setSeatingSaveAsActive, false)
  assert.equal(state.setLoadedSeatingPlanId, original.id)
  assert.equal(state.setSeatingPlanObservation, original.observation)
  assert.deepEqual(original.seats, [{ studentId: 'fictici-1', x: 1, y: 0, isLocked: true }])
})

function saveFixture(overrides = {}) {
  const { scope, state } = fixture()
  const calls = []
  Object.assign(scope, {
    selectedSeatingPlan: null, seatingSaveBusy: false, seatingSaveMode: 'update',
    loadedSeatingPlan: original, activeClassId: 'fictici-class', seatingSaveAsActive: true,
    generatedSeatingPlan: { layout: original.layout, placements: [{ studentId: 'fictici-1', seat: { x: 2, y: 1 } }] },
    generatedSeatingPlanAnalysis: { conflicts: [], quality: { label: 'Correcta' }, score: 80 },
    seatingIterationObjective: 'balanced', seatingRestrictions: {}, seatingLockedStudentIds: [],
    seatingPlanName: 'Inici revisat', seatingPlanObservation: 'Canvis ficticis',
    formatShortDate: value => value, getTodayDateInput: () => '2026-10-12',
    updateTutorialSeatingPlan: async (id, patch) => calls.push({ action: 'update', id, patch }),
    saveTutorialSeatingPlan: async patch => { calls.push({ action: 'new', patch }); return { id: 'version-2' } },
    ...overrides,
  })
  return { state, calls, save: handler('handleSaveTutorialSeatingPlan', 'handleLoadTutorialSeatingPlan', scope) }
}

test('guardar canvis actualitza la versió carregada amb els llocs editats', async () => {
  const { save, state, calls } = saveFixture()
  await save()
  assert.equal(calls.length, 1)
  assert.equal(calls[0].action, 'update')
  assert.equal(calls[0].id, original.id)
  assert.equal(calls[0].patch.seats[0].x, 2)
  assert.equal(state.setLoadedSeatingPlanId, original.id)
  assert.equal(state.setSeatingSaveBusy, false)
})

test('guardar una còpia crea una versió nova i les desades següents actualitzen aquesta còpia', async () => {
  const { save, state, calls } = saveFixture({ seatingSaveMode: 'new', seatingSaveAsActive: false })
  await save()
  assert.equal(calls[0].action, 'new')
  assert.equal(calls[0].patch.isActive, false)
  assert.equal(state.setLoadedSeatingPlanId, 'version-2')
  assert.equal(state.setSeatingSaveMode, 'update')
})

test('una vista de consulta no desa la proposta oculta i els errors mantenen el treball editable', async () => {
  const preview = saveFixture({ selectedSeatingPlan: original })
  await preview.save()
  assert.equal(preview.calls.length, 0)
  const failed = saveFixture({ updateTutorialSeatingPlan: async () => { throw new Error('Error fictici') } })
  await failed.save()
  assert.equal(failed.state.setSeatingSaveMessage, 'Error fictici')
  assert.equal(failed.state.setSeatingSaveBusy, false)
  assert.equal(failed.state.setLoadedSeatingPlanId, undefined)
})


test('obrir l’eina carrega la disposició activa per modificar i duplicar prepara una còpia editable', () => {
  const { scope, state, load } = fixture()
  Object.assign(scope, {
    classTutorialSeatingPlan: original,
    handleLoadTutorialSeatingPlan: load,
    setComparisonSeatingPlanId: value => { state.comparison = value },
    setActiveRelationshipTool: value => { state.tool = value },
  })
  handler('handleOpenTutorialSeatingTool', 'handleDuplicateTutorialSeatingPlan', scope)()
  assert.equal(state.setLoadedSeatingPlanId, original.id)
  assert.equal(state.setSeatingSaveMode, 'update')
  assert.equal(state.tool, 'seating')
  handler('handleDuplicateTutorialSeatingPlan', 'handleSetActiveTutorialSeatingPlan', scope)(original)
  assert.equal(state.setSeatingSaveMode, 'new')
  assert.equal(state.setSeatingWorkspacePanel, 'save')
})
