import assert from 'node:assert/strict'
import test from 'node:test'
import 'fake-indexeddb/auto'
import { loadAgendaContentRefresh, refreshAgendaBundleContent, refreshPlanningUnitMaterials, summarizeAgendaContentRefresh } from '../src/features/agenda/agendaContentRefresh.js'
import { createPlanningRepository } from '../src/data/planningRepository.js'
import { loadPlanningOutbox, loadPlanningScope, savePlanningEntityLocally } from '../src/data/local/planningIndexedDb.js'
import { combineAgendaSessionItems } from '../src/domain/planning/agendaItems.js'

const oldSource = { entityType: 'planningActivity', id: 'a', ownerUid: 'synthetic-teacher', planningUnitId: 'up', phaseId: 'phase', title: 'Títol original', order: 0, plannedMinutes: 90, description: 'Antiga', teacherMaterials: [{ id: 'old', url: 'https://example.org/old' }], studentMaterials: [] }
const newSource = { ...oldSource, title: 'Nou títol', order: 8, plannedMinutes: 240, description: 'Nova descripció', teacherMaterials: [], studentMaterials: [{ id: 'new', kind: 'link', url: 'https://example.org/new' }] }
const unit = { entityType: 'planningUnit', id: 'up', ownerUid: 'synthetic-teacher', title: 'UP nova', transversalMaterials: [{ id: 'common', kind: 'physical', label: 'Nou material comú' }] }
function bundle(id = 's1', extra = {}) {
  return { planningUnit: { ...unit, title: 'UP antiga', transversalMaterials: [] }, application: { id: 'app', status: 'scheduled', classId: 'class' }, session: { id, classId: 'class', startsAt: '2026-10-20T09:00:00', endsAt: '2026-10-20T10:00:00', status: 'planned' }, items: [
    { id: `${id}-b`, type: 'babelium', title: 'Babèlium', order: 0, plannedMinutes: 10 },
    { id: `${id}-a`, sourceActivityId: 'a', sourcePlanningUnitId: 'up', type: 'activity', title: 'Títol ajustat a l’Agenda', order: 5, plannedMinutes: 17, fixedToSession: true, segmentIndex: 2, segmentCount: 3, sourceActivity: oldSource },
    { id: `${id}-own`, type: 'activity', title: 'Activitat pròpia', order: 7, plannedMinutes: 33, fixedToSession: true },
  ], results: [{ id: 'result', actualMinutes: 11, status: 'completed' }], privateNotes: [{ id: 'note', text: 'Nota sintètica' }], ...extra }
}
function refresh(bundles, overrides = []) {
  return { sessionIds: new Set(bundles.map((b) => b.session.id)), structures: new Map([['up', [unit, newSource]]]), overrides: new Map([['up:app', overrides]]) }
}
function withoutContent(value) {
  const copy = structuredClone(value)
  delete copy.planningUnit.transversalMaterials
  for (const item of copy.items) if (item.sourceActivity) {
    delete item.sourceActivity.description
    delete item.sourceActivity.teacherMaterials
    delete item.sourceActivity.studentMaterials
  }
  return copy
}

test('només actualitza descripció i materials; conserva tota la cronologia i les dades de classe', () => {
  const before = bundle()
  const snapshot = structuredClone(before)
  const after = refreshAgendaBundleContent(before, refresh([before]))
  assert.deepEqual(withoutContent(after), withoutContent(before))
  assert.strictEqual(after.session, before.session)
  assert.strictEqual(after.results, before.results)
  assert.strictEqual(after.application, before.application)
  assert.equal(after.items[1].sourceActivity.description, 'Nova descripció')
  assert.deepEqual(after.items[1].sourceActivity.teacherMaterials, [])
  assert.deepEqual(after.items[1].sourceActivity.studentMaterials, newSource.studentMaterials)
  assert.deepEqual(after.planningUnit.transversalMaterials, unit.transversalMaterials)
  assert.deepEqual(before, snapshot, 'no muta les dades anteriors')
})

test('actualitza tots els fragments, sessions anteriors i mitjos grups sense moure ni unir elements', () => {
  const bundles = [bundle('s1'), bundle('s2', { session: { ...bundle().session, id: 's2', status: 'completed', subgroup: 'B' } })]
  const data = refresh(bundles)
  const after = bundles.map((b) => refreshAgendaBundleContent(b, data))
  assert.deepEqual(after.map(withoutContent), bundles.map(withoutContent))
  assert.ok(after.every((b) => b.items[1].sourceActivity.description === 'Nova descripció'))
  assert.deepEqual(summarizeAgendaContentRefresh(bundles, data), { activityCount: 1, missingCount: 0 })
})

test('respecta les adaptacions de contingut del grup i ignora overrides de temps, ordre o ocultació', () => {
  const before = bundle()
  const overrides = [
    { activityId: 'a', updatedAt: '2026-10-12', changes: { description: 'Adaptada', studentMaterials: [{ id: 'group' }], plannedMinutes: 150, order: 100, hidden: true } },
    { activityId: 'a', updatedAt: '2026-10-13', changes: { description: '', teacherMaterials: [] } },
  ]
  const after = refreshAgendaBundleContent(before, refresh([before], overrides))
  assert.equal(after.items[1].sourceActivity.description, '')
  assert.deepEqual(after.items[1].sourceActivity.studentMaterials, [{ id: 'group' }])
  assert.deepEqual(withoutContent(after), withoutContent(before))
})

test('no afecta altres grups o matèries fora de la selecció', () => {
  const selected = bundle()
  const other = bundle('other', { application: { id: 'other-app' }, session: { id: 'other', classId: 'other-class' } })
  assert.strictEqual(refreshAgendaBundleContent(other, refresh([selected])), other)
})

test('una activitat original eliminada conserva contingut, ordre i minuts i s’informa', () => {
  const before = bundle()
  const data = refresh([before])
  data.structures.set('up', [unit])
  const after = refreshAgendaBundleContent(before, data)
  assert.strictEqual(after.items[1], before.items[1])
  assert.deepEqual(summarizeAgendaContentRefresh([before], data), { activityCount: 0, missingCount: 1 })
})

test('la UP font determina el contingut de les activitats recuperades d’una altra UP', () => {
  const before = bundle()
  before.items[1] = { ...before.items[1], sourcePlanningUnitId: 'previous-up' }
  const data = refresh([before])
  data.structures.set('previous-up', [{ ...newSource, planningUnitId: 'previous-up', description: 'UP anterior actualitzada' }])
  assert.equal(refreshAgendaBundleContent(before, data).items[1].sourceActivity.description, 'UP anterior actualitzada')
})

test('els fragments agrupats continuen agrupats amb els mateixos minuts i ordre', () => {
  const before = bundle()
  before.items.push({ ...before.items[1], id: 'fragment-2', order: 6, plannedMinutes: 8, segmentIndex: 3 })
  const after = refreshAgendaBundleContent(before, refresh([before]))
  const combinedBefore = combineAgendaSessionItems(before.items, 'up')
  const combinedAfter = combineAgendaSessionItems(after.items, 'up')
  assert.deepEqual(combinedAfter.map((i) => [i.id, i.title, i.plannedMinutes, i.order]), combinedBefore.map((i) => [i.id, i.title, i.plannedMinutes, i.order]))
  assert.equal(combinedAfter[1].sourceActivity.description, 'Nova descripció')
})

test('força les lectures de contingut, una vegada per UP i aplicació, sense llegir ni escriure sessions', async () => {
  const calls = []
  const bundles = [bundle('s1'), bundle('s2')]
  const data = await loadAgendaContentRefresh({ bundles, repository: { loadScope: async (key, loader, options) => {
    calls.push({ key, options })
    const values = await loader()
    return { source: 'remote', entities: values.map((v) => v.entity || v) }
  } }, loadStructure: async () => ({ planningUnit: unit, phases: [], activities: [newSource] }), loadOverrides: async () => [] })
  assert.deepEqual(calls.map((c) => c.key), ['planningUnit:up:structure', 'application:app:overrides'])
  assert.ok(calls.every((c) => c.options.forceRemote && c.options.completeSnapshot))
  assert.equal(refreshAgendaBundleContent(bundles[0], data).items[1].plannedMinutes, 17)
})

test('un error de xarxa o el mode fora de línia no es presenta com una actualització reeixida', async () => {
  const options = { bundles: [bundle()], loadStructure: async () => {}, loadOverrides: async () => [] }
  await assert.rejects(loadAgendaContentRefresh({ ...options, repository: { loadScope: async () => ({ entities: [], source: 'local' }) } }), /Cal connexió/)
  await assert.rejects(loadAgendaContentRefresh({ ...options, repository: { loadScope: async () => ({ entities: [], source: 'local', error: new Error('Error sintètic') }) } }), /Error sintètic/)
})

test('la lectura local-first conserva contingut pendent i no altera les sessions persistides ni la cua', async () => {
  const uid = `content-refresh-${Date.now()}`
  const before = bundle()
  const localActivity = { ...oldSource, ownerUid: uid, description: 'Descripció local pendent', updatedAt: '2026-10-14T10:00:00Z' }
  await savePlanningEntityLocally(uid, localActivity)
  const item = { ...before.items[1], ownerUid: uid, entityType: 'sessionItem', applicationId: 'app', sessionId: 's1' }
  delete item.sourceActivity
  await savePlanningEntityLocally(uid, item, { planningUnitId: 'up' })
  const sessionsBefore = await loadPlanningScope(uid, 'session:s1:detail')
  const queueBefore = await loadPlanningOutbox(uid)
  const repository = createPlanningRepository({ uid, history: { record() {} }, applyRemoteOperation: async () => { assert.fail('no ha de sincronitzar ni escriure') } })
  const data = await loadAgendaContentRefresh({ bundles: [before], repository,
    loadStructure: async () => ({ planningUnit: { ...unit, ownerUid: uid }, phases: [], activities: [{ ...newSource, ownerUid: uid, updatedAt: '2026-10-13T10:00:00Z' }] }), loadOverrides: async () => [] })
  assert.equal(refreshAgendaBundleContent(before, data).items[1].sourceActivity.description, 'Descripció local pendent')
  assert.deepEqual(await loadPlanningScope(uid, 'session:s1:detail'), sessionsBefore)
  assert.deepEqual(await loadPlanningOutbox(uid), queueBefore)
  const { loadCompleteAgendaContentRefresh } = await import('../src/features/agenda/agendaContentRefresh.js')
  await loadCompleteAgendaContentRefresh({ classId: 'class', visibleBundles: [before],
    applicationRecords: [{ planningUnit: unit, application: { id: 'app', classId: 'class' } }], repository,
    loadReferences: async () => [{ session: before.session, items: before.items }],
    loadStructure: async () => ({ planningUnit: { ...unit, ownerUid: uid }, phases: [], activities: [{ ...newSource, ownerUid: uid, updatedAt: '2026-10-13T10:00:00Z' }] }), loadOverrides: async () => [] })
  assert.deepEqual(await loadPlanningScope(uid, 'session:s1:detail'), sessionsBefore)
  assert.deepEqual(await loadPlanningOutbox(uid), queueBefore)
})


test('els canvis d’ordre i temps fets mentre es llegeix el contingut també es conserven', () => {
  const before = bundle()
  const data = refresh([before])
  const current = { ...before, items: [...before.items].reverse().map((item) => ({ ...item, plannedMinutes: 29, order: 12 })) }
  const after = refreshAgendaBundleContent(current, data)
  assert.deepEqual(withoutContent(after), withoutContent(current))
})

test('els materials comuns actualitzats es recuperen en tornar a obrir la sessió sense canviar la UP', () => {
  const oldUnit = bundle().planningUnit
  assert.deepEqual(refreshPlanningUnitMaterials(oldUnit, [unit]), { ...oldUnit, transversalMaterials: unit.transversalMaterials })
  assert.strictEqual(refreshPlanningUnitMaterials(oldUnit, []), oldUnit)
})

test('l’actualització completa arriba a setmanes no carregades i a altres UP de la mateixa matèria', async () => {
  const { loadCompleteAgendaContentRefresh, selectAgendaContentApplications } = await import('../src/features/agenda/agendaContentRefresh.js')
  const visible = bundle()
  const distant = bundle('future', { planningUnit: { ...unit, id: 'up-future' }, application: { id: 'future-app', classId: 'class', subject: 'Ciències' } })
  distant.items[1] = { ...distant.items[1], sourceActivityId: 'future-a', sourcePlanningUnitId: 'up-future' }
  const records = [
    { planningUnit: unit, application: { id: 'app', classId: 'class', subject: 'Ciències' } },
    { planningUnit: distant.planningUnit, application: distant.application },
    { planningUnit: unit, application: { id: 'math-app', classId: 'class', subject: 'Matemàtiques' } },
    { planningUnit: unit, application: { id: 'other-group', classId: 'other-class', subject: 'Ciències' } },
  ]
  const selected = selectAgendaContentApplications(records, { classId: 'class', subject: ' ciencies ' })
  assert.deepEqual(selected.map((r) => r.application.id), ['app', 'future-app'])
  const calls = []
  const snapshot = structuredClone(visible)
  const { refresh: data, summary } = await loadCompleteAgendaContentRefresh({ applicationRecords: selected,
    classId: 'class', visibleBundles: [visible], repository: { loadScope: async (key, loader) => {
      calls.push(key)
      if (!loader) return { source: 'local', entities: [] }
      return { source: 'remote', entities: (await loader()).map((v) => v.entity || v) }
    } }, loadReferences: async ({ applicationId }) => {
      calls.push(`refs:${applicationId}`)
      return applicationId === 'future-app' ? [distant] : [{ ...visible, items: visible.items.map((i) => ({ id: i.id, sourceActivityId: i.sourceActivityId })) }]
    }, loadStructure: async (id) => ({ planningUnit: { ...unit, id }, phases: [], activities: [{ ...newSource, id: id === 'up' ? 'a' : 'future-a', planningUnitId: id }] }), loadOverrides: async () => [] })
  assert.deepEqual(summary, { activityCount: 2, missingCount: 0, sessionCount: 2 })
  assert.equal(refreshAgendaBundleContent(distant, data).items[1].sourceActivity.description, 'Nova descripció')
  assert.deepEqual(withoutContent(refreshAgendaBundleContent(distant, data)), withoutContent(distant))
  assert.deepEqual(visible, snapshot, 'la descoberta no muta la cronologia carregada')
  assert.ok(!calls.some((key) => /math-app|other-group/.test(key)))
})

test('amb el tram visible buit també es refresquen les activitats d’altres setmanes', async () => {
  const { loadCompleteAgendaContentRefresh } = await import('../src/features/agenda/agendaContentRefresh.js')
  const remote = bundle('distant')
  const { refresh: data, summary } = await loadCompleteAgendaContentRefresh({ classId: 'class', visibleBundles: [],
    applicationRecords: [{ planningUnit: unit, application: { id: 'app', classId: 'class' } }],
    repository: { loadScope: async (_key, loader) => loader ? { source: 'remote', entities: (await loader()).map((v) => v.entity || v) } : { source: 'local', entities: [] } },
    loadReferences: async () => [remote], loadStructure: async () => ({ planningUnit: unit, phases: [], activities: [newSource] }), loadOverrides: async () => [] })
  assert.equal(summary.activityCount, 1)
  assert.ok(data.sessionIds.has('distant'))
})

test('les sessions només locals, incloses les d’altres setmanes, es conserven dins l’abast', async () => {
  const { loadCompleteAgendaContentRefresh } = await import('../src/features/agenda/agendaContentRefresh.js')
  const local = bundle('local-only')
  const { refresh: data } = await loadCompleteAgendaContentRefresh({ classId: 'class', visibleBundles: [],
    applicationRecords: [{ planningUnit: unit, application: { id: 'app', classId: 'class' } }],
    repository: { loadScope: async (key, loader) => {
      if (loader) return { source: 'remote', entities: (await loader()).map((v) => v.entity || v) }
      return { source: 'local', entities: key.endsWith(':sessions') ? [local.session] : local.items.map((i) => ({ ...i, entityType: 'sessionItem' })) }
    } }, loadReferences: async () => [], loadStructure: async () => ({ planningUnit: unit, phases: [], activities: [newSource] }), loadOverrides: async () => [] })
  assert.ok(data.sessionIds.has('local-only'))
  assert.deepEqual(withoutContent(refreshAgendaBundleContent(local, data)), withoutContent(local))
})

test('llegeix més de 500 sessions amb paginació i un màxim de sis lectures d’elements simultànies', async () => {
  const { readAllPlanningContentReferences } = await import('../src/data/cloud/planningContentReferences.js')
  const sessions = Array.from({ length: 751 }, (_, index) => ({ id: `s-${index}`, classId: 'class' }))
  const cursors = []
  let concurrent = 0
  let peak = 0
  const references = await readAllPlanningContentReferences({
    loadSessionPage: async (cursor, pageSize) => {
      cursors.push(cursor)
      const offset = cursor || 0
      return { sessions: sessions.slice(offset, offset + pageSize), cursor: offset + pageSize }
    }, loadItems: async (id) => {
      concurrent += 1
      peak = Math.max(peak, concurrent)
      await Promise.resolve()
      concurrent -= 1
      return [{ id: `${id}-item`, sourceActivityId: 'a', sourcePlanningUnitId: 'up' }]
    },
  })
  assert.deepEqual(cursors, [null, 250, 500, 750])
  assert.equal(references.length, 751)
  assert.equal(references.at(-1).session.id, 's-750')
  assert.equal(peak, 6)
})

test('els vincles originals pendents de la còpia local prevalen sobre referències remotes antigues', async () => {
  const { loadCompleteAgendaContentRefresh } = await import('../src/features/agenda/agendaContentRefresh.js')
  const local = bundle('pending')
  const loadedUnits = []
  const { refresh: data } = await loadCompleteAgendaContentRefresh({ classId: 'class', visibleBundles: [],
    applicationRecords: [{ planningUnit: unit, application: { id: 'app', classId: 'class' } }],
    repository: { loadScope: async (key, loader) => loader
      ? { source: 'remote', entities: (await loader()).map((v) => v.entity || v) }
      : { source: 'local', entities: key.endsWith(':detail') ? local.items.map((i) => ({ ...i, entityType: 'sessionItem' })) : [] } },
    loadReferences: async () => [{ session: local.session, items: [{ ...local.items[1], sourceActivityId: 'obsolete', sourcePlanningUnitId: 'wrong-up' }] }],
    loadStructure: async (id) => { loadedUnits.push(id); return { planningUnit: unit, phases: [], activities: [newSource] } }, loadOverrides: async () => [] })
  assert.deepEqual(loadedUnits, ['up'])
  assert.equal(refreshAgendaBundleContent(local, data).items[1].sourceActivity.description, 'Nova descripció')
})
