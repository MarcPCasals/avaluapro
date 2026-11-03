import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSearchIndex, searchEntries, normalizeSearch, contentSnippet } from '../src/features/search/globalSearch.js'
import { navigateToSearchTarget, validateSearchTarget } from '../src/features/search/searchNavigation.js'
import { SEARCH_FEATURES } from '../src/features/search/searchCatalog.js'

const data = {
  classes: [{ id: 'a', name: 'Grup A', subject: 'Tutoria' }, { id: 'b', name: 'Grup B', isTutoringGroup: true }, { id: 'c', name: 'CFN C', subject: 'CFN' }],
  students: [{ id: 'm-a', classId: 'a', name: 'Maria Exemple' }, { id: 'm-b', classId: 'b', name: 'Maria Exemple' }, { id: 'alex', classId: 'c', name: 'Àlex Prova' }, { id: 'orphan', classId: 'missing', name: 'Orfe Fictici' }],
  tutorialRecords: [{ id: 'doip-a', classId: 'a', studentId: 'm-a', type: 'doip', date: '2026-10-20', note: 'Preguntes: Com va la fotosíntesi? Respostes: Domina el laboratori.' }, { id: 'interview-b', classId: 'b', studentId: 'm-b', type: 'family-contact', date: '2026-10-21', note: 'Revisarem el dossier cada divendres.' }, { id: 'orphan-r', classId: 'a', studentId: 'missing', type: 'doip', note: 'Contingut exclòs' }],
  tasks: [{ id: 'task', classId: 'c', utId: 'ut-c', title: 'Investigació dels volcans', description: 'Observació del basalt' }],
  competencies: [], criteria: [], uts: [{ id: 'ut-c', classId: 'c', semesterId: 'sem-c' }],
}
const index = buildSearchIndex(data)

test('cerca sense accents, majúscules, apòstrofs i variants dictades de DOIP', () => {
  assert.equal(normalizeSearch('DEUIPS'), 'doip')
  for (const query of ['doip maria', 'deuip Maria', 'DOIBS MARIA']) {
    const result = searchEntries(index, query, 'a')[0]
    assert.equal(result.target.studentId, 'm-a')
    assert.equal(result.target.action, 'doip')
  }
  assert.equal(searchEntries(index, 'alex', 'c')[0].target.studentId, 'alex')
})
test('la classe actual té prioritat i els homònims conserven identitats diferents', () => {
  const results = searchEntries(index, 'doip maria', 'b')
  assert.equal(results[0].target.studentId, 'm-b')
  assert.ok(results.some(item => item.target.studentId === 'm-a'))
  assert.ok(results[0].path.includes('Grup B'))
})
test('un nom sol ofereix la fitxa i dreceres disponibles per aquell alumne', () => {
  const results = searchEntries(index, 'Maria', 'a')
  assert.equal(results[0].target.action, 'profile')
  assert.ok(results.some(item => item.target.action === 'doip'))
  assert.ok(results.some(item => item.target.action === 'registry'))
})
test('no proposa tutoria per a una classe de matèria sense tutoria', () => {
  assert.equal(searchEntries(index, 'doip alex', 'c').length, 0)
  assert.ok(searchEntries(index, 'avaluacio alex', 'c').length > 0)
})
test('troba continguts concrets amb context de classe, data i registre', () => {
  const result = searchEntries(index, 'fotosintesi', 'c')[0]
  assert.equal(result.kind, 'content')
  assert.equal(result.target.recordId, 'doip-a')
  assert.equal(result.target.studentId, 'm-a')
  assert.ok(result.path.includes('2026-10-20'))
  assert.equal(searchEntries(index, 'dossier Maria', 'a')[0].target.recordId, 'interview-b')
})
test('tasques conserven la UT de destí i cerca títol i descripció', () => {
  assert.equal(searchEntries(index, 'basalt', 'a')[0].target.utId, 'ut-c')
  assert.equal(searchEntries(index, 'volcans', 'a')[0].source.id, 'task')
})
test('exclou alumnes i registres orfes i no transforma les dades', () => {
  const original = structuredClone(data)
  assert.equal(searchEntries(index, 'Orfe', 'a').length, 0)
  assert.equal(searchEntries(index, 'Contingut exclòs', 'a').length, 0)
  assert.deepEqual(data, original)
})
test('suggeriments inicials únics i límit de resultats', () => {
  const results = searchEntries(index, '', 'a')
  assert.equal(new Set(results.map(item => item.title)).size, results.length)
  assert.ok(results.every(item => item.kind === 'feature'))
  assert.equal(searchEntries(index, 'Maria', 'a', 2).length, 2)
  assert.equal(searchEntries(index, 'zzzxxyy', 'a').length, 0)
})
test('un compte buit conserva configuració i creació de classes', () => {
  const empty = buildSearchIndex()
  assert.ok(searchEntries(empty, 'configuracio', '')[0])
  assert.ok(searchEntries(empty, 'nova classe', '')[0])
})
test('programació local inclou activitat i context de la UP sense mutacions', () => {
  const planning = [{ entityType: 'planningUnit', id: 'up', title: 'Els ecosistemes', academicYearId: 'year' }, { entityType: 'groupApplication', id: 'app', planningUnitId: 'up', classId: 'c' }, { entityType: 'planningActivity', id: 'activity', planningUnitId: 'up', title: 'Observem ocells', description: 'Anàlisi de les adaptacions dels becs' }]
  const result = searchEntries(buildSearchIndex(data, planning), 'becs', 'c')[0]
  assert.equal(result.target.activityId, 'activity')
  assert.equal(result.target.planningUnitId, 'up')
  assert.equal(result.target.classId, 'c')
  assert.ok(result.path.includes('Els ecosistemes'))
})
test('fragments conserven text original i són acotats', () => {
  const snippet = contentSnippet('Un inici. '.repeat(50) + 'Fotosíntesi al laboratori.', 'fotosintesi')
  assert.ok(snippet.includes('Fotosíntesi'))
  assert.ok(snippet.length <= 162)
})
test('catàleg sense ids repetits i amb destinacions conegudes', () => {
  assert.equal(new Set(SEARCH_FEATURES.map(item => item.id)).size, SEARCH_FEATURES.length)
  for (const feature of SEARCH_FEATURES) {
    assert.ok(feature.target.topAction || ['evaluation', 'tracking', 'students', 'analytics', 'tutoring', 'planning', 'agenda'].includes(feature.target.mode), feature.id)
  }
})
test('rebutja classes, alumnes i UT que ja no existeixen abans de navegar', () => {
  assert.throws(() => validateSearchTarget(data, { classId: 'missing' }))
  assert.throws(() => validateSearchTarget(data, { classId: 'a', studentId: 'm-b' }))
  assert.throws(() => validateSearchTarget(data, { classId: 'c', mode: 'tutoring' }))
  assert.throws(() => validateSearchTarget(data, { classId: 'a', utId: 'ut-c' }))
})
test('canvia classe abans de mode i entrega un id explícit després de la càrrega', async () => {
  const calls = []
  const state = { ...data, ui: { activeClassId: 'a' },
    setActiveClass: async id => { await Promise.resolve(); state.ui.activeClassId = id; calls.push(`class:${id}`) },
    setActiveTutoringPanel: panel => calls.push(`panel:${panel}`),
    setActiveMode: mode => calls.push(`mode:${mode}`),
    requestSearchNavigation: target => calls.push(`student:${target.studentId}`),
  }
  await navigateToSearchTarget({ getState: () => state }, { mode: 'tutoring', panel: 'tracking', classId: 'b', studentId: 'm-b', action: 'doip' })
  assert.deepEqual(calls, ['class:b', 'panel:tracking', 'mode:tutoring', 'student:m-b'])
})
test('restaura semestre i UT en anar a una tasca antiga', async () => {
  const calls = []
  const state = { ...data, ui: { activeClassId: 'c' }, setActiveSemester: id => calls.push(id), setActiveUt: id => calls.push(id), setActiveMode: id => calls.push(id), requestSearchNavigation: () => calls.push('request') }
  await navigateToSearchTarget({ getState: () => state }, { mode: 'tracking', classId: 'c', utId: 'ut-c' })
  assert.deepEqual(calls, ['sem-c', 'ut-c', 'tracking', 'request'])
})

test('els recordatoris generals es poden trobar i obrir filtrats sense classe', () => {
  const records = [{ id: 'reminder', type: 'generalReminder', text: 'Portar lupes al laboratori', reminder: { date: '2026-10-30', text: 'Preparar material' } }]
  const result = searchEntries(buildSearchIndex({ ...data, agendaNotes: records }), 'lupes', 'a')[0]
  assert.equal(result.target.topAction, 'reminders')
  assert.deepEqual(result.target.focusedReminderIds, ['agenda_reminder'])
})

test('els esdeveniments de calendari conserven data i classe', () => {
  const result = searchEntries(buildSearchIndex(data, [{ id: 'event', entityType: 'calendarEvent', title: 'Sortida científica', startsOn: '2026-11-02', classIds: ['a'] }]), 'sortida', 'a')[0]
  assert.equal(result.target.date, '2026-11-02')
  assert.equal(result.target.classId, 'a')
})
