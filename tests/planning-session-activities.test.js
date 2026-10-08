import test from 'node:test'
import assert from 'node:assert/strict'
import { getSessionActivityChoices, isFixedAgendaItem, buildSessionActivityPinChanges, buildSessionActivityAddition, buildOwnSessionActivityChange, buildActivitySessionReflow, buildAgendaRecoveryReflow, buildAgendaOwnActivityInsertion, buildAgendaSessionCompaction, buildAgendaItemChangeReflow, buildAgendaSessionReplacement, buildAgendaContinuationReflow, createCalendarSession, createSessionItem, createBabeliumItem, moveAgendaSessionItem, combineAgendaSessionItems } from '../src/domain/planning/index.js'
const application = { id: 'app', planningUnitId: 'up', classId: 'fictional', ownerUid: 'teacher' }
const options = { now: '2026-10-04T10:00:00Z' }
const activities = [{ id: 'exam', title: 'Prova fictícia', type: 'activity', plannedMinutes: 30 },
  { id: 'lab', title: 'Laboratori fictici', type: 'activity', plannedMinutes: 50 }]
function bundle(id, subgroupId = '', items = [], extra = {}) {
  return { session: createCalendarSession({ id, applicationId: 'app', classId: 'fictional', ownerUid: 'teacher',
    startsAt: '2026-10-09T08:30:00', durationMinutes: 60, status: 'planned', subgroupId, ...extra }, options),
  items: items.map(([activityId, minutes], order) => createSessionItem({ id: `${id}-${activityId}`, applicationId: 'app',
    sessionId: id, ownerUid: 'teacher', sourceActivityId: activityId, title: activityId, type: 'activity', plannedMinutes: minutes, order }, options)), results: [] }
}
function input(bundles) { return { application, activities, existingSessionBundles: bundles, targetSessionId: bundles[0].session.id } }
test('retirar la prova allibera els minuts i permet recuperar-la sense tocar el laboratori ni la UP', () => {
  const original = bundle('session', '', [['exam', 30], ['lab', 25]])
  const removed = { ...original, items: original.items.filter((item) => item.sourceActivityId !== 'exam') }
  const data = input([removed])
  assert.equal(getSessionActivityChoices(data)[0].remainingMinutes, 30)
  const addition = buildSessionActivityAddition(data, 'exam', 30, options)
  assert.equal(addition.item.sourcePlanningUnitId, 'up')
  assert.equal(addition.item.plannedMinutes, 30)
  assert.equal(original.items.length, 2)
  assert.equal(activities[0].plannedMinutes, 30)
  const restored = { ...removed, items: [...removed.items, addition.item] }
  assert.equal(getSessionActivityChoices(input([restored]))[0].available, false)
  assert.throws(() => buildSessionActivityAddition(input([restored]), 'exam', 30, options), /calendaritzada/)
})
test('una retirada al mig grup B continua disponible encara que A ja tingui la prova', () => {
  const data = input([bundle('B', 'B', [['lab', 25]]), bundle('A', 'A', [['exam', 30], ['lab', 25]])])
  assert.equal(getSessionActivityChoices(data)[0].remainingMinutes, 30)
  const addition = buildSessionActivityAddition(data, 'exam', 30, options)
  assert.equal(addition.item.sessionId, 'B')
  assert.deepEqual(addition.changedItems, [])
})
test('afegir una part limita la durada als minuts pendents i renumera els fragments', () => {
  const data = input([bundle('target'), bundle('later', '', [['exam', 20]], { startsAt: '2026-10-12T08:30:00' })])
  assert.equal(getSessionActivityChoices(data)[0].remainingMinutes, 10)
  assert.equal(getSessionActivityChoices(data)[0].availableMinutes, 30)
  assert.throws(() => buildSessionActivityAddition(data, 'exam', 31, options), /màxim 30/)
  const added = buildSessionActivityAddition(data, 'exam', 10, options)
  assert.equal(added.item.segmentIndex, 1)
  assert.equal(added.item.segmentCount, 2)
  assert.equal(added.changedItems[0].segmentIndex, 2)
})
test('respecta Babèlium, el marge de sessió i l’historial', () => {
  const target = bundle('target')
  target.items.push(createBabeliumItem(target.session, options))
  assert.throws(() => buildSessionActivityAddition(input([target]), 'exam', 30, options), /màxim 25/)
  assert.equal(buildSessionActivityAddition(input([target]), 'exam', 25, options).item.plannedMinutes, 25)
  for (const extra of [{ status: 'held' }, { attendanceConfirmedAt: options.now }, { classroomClosedAt: options.now }]) {
    assert.throws(() => buildSessionActivityAddition(input([bundle('target', '', [], extra)]), 'exam', 30, options), /dades de classe/)
  }
})
test('els elements sense temps es poden afegir a una sessió plena però no duplicar', () => {
  const data = { ...input([bundle('full', '', [['lab', 55]])]), activities: [{ id: 'note', type: 'indication', title: 'Portar bata', plannedMinutes: null }] }
  const added = buildSessionActivityAddition(data, 'note', null, options)
  assert.equal(added.item.plannedMinutes, null)
  data.existingSessionBundles[0].items.push(added.item)
  assert.equal(getSessionActivityChoices(data)[0].available, false)
})

for (const scope of ['day', 'slot', 'session']) {
  test(`afegir recupera A12 i A13 d’una classe anul·lada per ${scope} i retira només la còpia seleccionada`, () => {
    const target = bundle('target', '', [['lab', 40]])
    const blocked = bundle('blocked', '', [['atoms', 40], ['notebook', 15]],
      { startsAt: '2026-10-07T08:30:00', timetableSlotId: 'slot-blocked' })
    const event = { id: 'cancel-fictional', type: 'cancellation', startsOn: '2026-10-07', classIds: ['fictional'],
      ...(scope === 'slot' ? { timetableSlotId: 'slot-blocked' } : {}),
      ...(scope === 'session' ? { sessionId: 'blocked' } : {}) }
    const data = { ...input([target, blocked]), calendarEvents: [event], activities: [
      { id: 'atoms', type: 'activity', title: 'Àtoms', plannedMinutes: 40 },
      { id: 'notebook', type: 'activity', title: 'Presentació', plannedMinutes: 15 },
    ] }
    const original = structuredClone(data)
    assert.deepEqual(getSessionActivityChoices(data).map((a) => [a.available, a.assignedMinutes, a.calendarLabel]),
      [[true, 0, 'Fora del calendari'], [true, 0, 'Fora del calendari']])
    const addition = buildSessionActivityAddition(data, 'notebook', 15, options)
    assert.equal(addition.item.sourceActivityId, 'notebook')
    assert.equal(addition.item.segmentCount, 1)
    assert.deepEqual(addition.removedItems.map((i) => i.id), ['blocked-notebook'])
    assert.deepEqual(addition.changedItems, [])
    const persisted = { ...data, existingSessionBundles: [
      { ...target, items: [...target.items, addition.item] },
      { ...blocked, items: blocked.items.filter((i) => !addition.removedItems.some((removed) => removed.id === i.id)) },
    ] }
    assert.equal(getSessionActivityChoices(persisted)[1].available, false)
    assert.equal(getSessionActivityChoices(persisted)[0].available, true)
    assert.throws(() => buildSessionActivityAddition(persisted, 'notebook', 15, options), /calendaritzada/)
    assert.deepEqual(data, original)
  })
}

test('recuperar una part no compta el fragment anul·lat ni altera els fragments vàlids', () => {
  const target = bundle('target')
  const blocked = bundle('blocked', '', [['exam', 30]], { status: 'cancelled' })
  const later = bundle('later', '', [['exam', 20]], { startsAt: '2026-10-12T08:30:00' })
  const data = input([target, blocked, later])
  assert.equal(getSessionActivityChoices(data)[0].remainingMinutes, 10)
  const added = buildSessionActivityAddition(data, 'exam', 10, options)
  assert.deepEqual(added.removedItems.map((i) => i.id), ['blocked-exam'])
  assert.equal(added.item.segmentCount, 2)
  assert.equal(added.changedItems[0].id, 'later-exam')
  assert.equal(added.changedItems[0].segmentIndex, 2)
})

test('un altre grup o franja no allibera minuts, i les activitats realment fetes continuen protegides', () => {
  for (const extra of [{ classIds: ['other'] }, { timetableSlotId: 'other-slot' }]) {
    const data = { ...input([bundle('target'), bundle('planned', '', [['exam', 30]])]),
      calendarEvents: [{ type: 'cancellation', startsOn: '2026-10-09', ...extra }] }
    assert.equal(getSessionActivityChoices(data)[0].available, true)
    assert.equal(getSessionActivityChoices(data)[0].remainingMinutes, 0)
  }
  const held = bundle('held', '', [['exam', 30]], { status: 'held', startsAt: '2026-10-07T08:30:00' })
  held.results.push({ sessionItemId: held.items[0].id, status: 'completed' })
  const data = { ...input([bundle('target'), held]),
    calendarEvents: [{ type: 'cancellation', startsOn: '2026-10-07' }] }
  assert.equal(getSessionActivityChoices(data)[0].calendarLabel, 'Ja feta')
  assert.throws(() => buildSessionActivityAddition(data, 'exam', 30, options), /feta/)
})

test('recuperar només A no retira contingut de B i no permet afegir a la sessió anul·lada', () => {
  const target = bundle('target-A', 'A')
  const blockedA = bundle('blocked-A', 'A', [['exam', 30]], { startsAt: '2026-10-07T08:30:00' })
  const blockedB = bundle('blocked-B', 'B', [['exam', 30]], { startsAt: '2026-10-07T11:30:00' })
  const data = { ...input([target, blockedA, blockedB]), calendarEvents: [{ type: 'cancellation', startsOn: '2026-10-07' }] }
  const added = buildSessionActivityAddition(data, 'exam', 30, options)
  assert.deepEqual(added.removedItems.map((i) => i.id), ['blocked-A-exam'])
  assert.throws(() => buildSessionActivityAddition({ ...data, targetSessionId: 'blocked-A' }, 'exam', 30, options), /no es fa/)
})

test('moure una activitat amunt i avall desa l’ordre i conserva identitats, minuts i fragments', () => {
  const data = bundle('target', '', [['atoms', 40], ['theory', 10]])
  data.items[1].segmentIndex = 3
  data.items[1].segmentCount = 3
  const original = structuredClone(data)
  const result = moveAgendaSessionItem(data, 'target-theory', 'up', options)
  assert.deepEqual(result.items.map((i) => [i.id, i.order]), [['target-theory', 0], ['target-atoms', 1]])
  assert.equal(result.items[0].segmentIndex, 3)
  assert.equal(result.items[0].segmentCount, 3)
  assert.equal(result.items.reduce((n, i) => n + i.plannedMinutes, 0), 50)
  const savedById = new Map(result.changedItems.map((i) => [i.id, i]))
  const reloaded = { ...data, items: data.items.map((i) => savedById.get(i.id) || i).sort((a, b) => a.order - b.order) }
  assert.deepEqual(reloaded.items.map((i) => i.id), ['target-theory', 'target-atoms'])
  assert.deepEqual(moveAgendaSessionItem(reloaded, 'target-theory', 'down', options).items.map((i) => i.id), original.items.map((i) => i.id))
  assert.deepEqual(data, original)
})

test('els fragments combinats es mouen junts i Babèlium conserva el primer lloc', () => {
  const data = bundle('target', '', [['atoms', 20], ['theory', 10]])
  const tail = createSessionItem({ ...data.items[0], id: 'atoms-tail', plannedMinutes: 20, order: 2 }, options)
  data.items.push(tail)
  data.items.unshift(createBabeliumItem(data.session, options))
  data.items.forEach((i, index) => { i.order = index })
  const result = moveAgendaSessionItem(data, 'target-atoms', 'down', options)
  assert.deepEqual(result.items.map((i) => i.id), ['babelium_target', 'target-theory', 'target-atoms', 'atoms-tail'])
  assert.equal(combineAgendaSessionItems(result.items)[2].plannedMinutes, 40)
  assert.deepEqual(moveAgendaSessionItem({ ...data, items: result.items }, 'target-theory', 'up', options).changedItems, [])
  assert.throws(() => moveAgendaSessionItem(data, 'babelium_target', 'down', options), /trobat/)
})

test('no reordena sessions anul·lades ni amb dades de classe i no sobrepassa els extrems', () => {
  const data = bundle('target', '', [['atoms', 40], ['theory', 10]])
  for (const extras of [{ status: 'held' }, { classroomOpenedAt: options.now }, { attendanceConfirmedAt: options.now }]) {
    assert.throws(() => moveAgendaSessionItem({ ...data, session: { ...data.session, ...extras } }, 'target-theory', 'up', options), /no es pot/)
  }
  assert.throws(() => moveAgendaSessionItem(data, 'target-theory', 'up', { ...options,
    calendarEvents: [{ type: 'cancellation', startsOn: '2026-10-09', classIds: ['fictional'] }] }), /no es pot/)
  assert.deepEqual(moveAgendaSessionItem(data, 'target-atoms', 'up', options).changedItems, [])
  assert.deepEqual(moveAgendaSessionItem(data, 'target-theory', 'down', options).changedItems, [])
})


test('les activitats futures ja calendaritzades es poden traslladar sense duplicar minuts', () => {
  const data = input([bundle('target'), bundle('future', '', [['exam', 30], ['lab', 20]], { startsAt: '2026-10-12T08:30:00' })])
  const choice = getSessionActivityChoices(data)[0]
  assert.equal(choice.available, true)
  assert.equal(choice.remainingMinutes, 0)
  assert.equal(choice.availableMinutes, 30)
  const before = structuredClone(data)
  const moved = buildSessionActivityAddition(data, 'exam', 30, options)
  assert.equal(moved.item.plannedMinutes, 30)
  assert.deepEqual(moved.removedItems.map(item => item.id), ['future-exam'])
  assert.equal(moved.changedItems.some(item => item.sourceActivityId === 'lab'), false)
  assert.equal(moved.item.segmentCount, 1)
  assert.deepEqual(data, before)
})

test('traslladar una part només redueix els minuts necessaris de la sessió futura', () => {
  const data = input([bundle('target'), bundle('future', '', [['exam', 30]], { startsAt: '2026-10-12T08:30:00' })])
  const moved = buildSessionActivityAddition(data, 'exam', 10, options)
  assert.equal(moved.item.plannedMinutes, 10)
  assert.equal(moved.changedItems[0].plannedMinutes, 20)
  assert.equal(moved.changedItems[0].segmentIndex, 2)
  assert.deepEqual(moved.removedItems, [])
})

test('els minuts ja impartits continuen protegits quan hi ha fragments futurs', () => {
  const data = input([bundle('target'), bundle('past', '', [['exam', 10]], { status: 'held', startsAt: '2026-10-01T08:30:00' }),
    bundle('future', '', [['exam', 20]], { startsAt: '2026-10-12T08:30:00' })])
  assert.equal(getSessionActivityChoices(data)[0].availableMinutes, 20)
  const moved = buildSessionActivityAddition(data, 'exam', 20, options)
  assert.ok(moved.removedItems.every(item => item.sessionId === 'future'))
  assert.ok(moved.changedItems.every(item => item.sessionId !== 'past' || item.plannedMinutes === 10))
})

test('traslladar al mig grup A conserva la programació de B', () => {
  const data = input([bundle('target-A', 'A'), bundle('future-A', 'A', [['exam', 30]], { startsAt: '2026-10-12T08:30:00' }),
    bundle('future-B', 'B', [['exam', 30]], { startsAt: '2026-10-12T11:30:00' })])
  const moved = buildSessionActivityAddition(data, 'exam', 30, options)
  assert.deepEqual(moved.removedItems.map(item => item.id), ['future-A-exam'])
  assert.ok(moved.changedItems.every(item => item.sessionId !== 'future-B'))
})

test('traslladar d’un parell de mitjos grups a una sessió sencera compta els minuts una sola vegada', () => {
  const data = input([bundle('target'), bundle('future-A', 'A', [['exam', 30]], { startsAt: '2026-10-12T08:30:00' }),
    bundle('future-B', 'B', [['exam', 30]], { startsAt: '2026-10-12T11:30:00' })])
  const moved = buildSessionActivityAddition(data, 'exam', 30, options)
  assert.deepEqual(moved.removedItems.map(item => item.id), ['future-A-exam', 'future-B-exam'])
  assert.equal(moved.item.plannedMinutes, 30)
})

test('un element sense temps també es trasllada des d’una altra sessió futura', () => {
  const data = { ...input([bundle('target'), bundle('future', '', [['note', null]], { startsAt: '2026-10-12T08:30:00' })]),
    activities: [{ id: 'note', title: 'Indicació', type: 'indication', plannedMinutes: null }] }
  const moved = buildSessionActivityAddition(data, 'note', null, options)
  assert.equal(moved.item.plannedMinutes, null)
  assert.deepEqual(moved.removedItems.map(item => item.id), ['future-note'])
})


test('una activitat passada sencera queda marcada com acabada sense perdre els codis originals de la UP', () => {
  const data = input([bundle('target'), bundle('past', '', [['exam', 30]], { status: 'held', startsAt: '2026-10-01T08:30:00' })])
  const choices = getSessionActivityChoices(data)
  assert.equal(choices[0].completed, true)
  assert.equal(choices[0].available, false)
  assert.equal(choices[1].code, 'A2')
  assert.deepEqual(choices.filter(choice => !choice.completed).map(choice => choice.id), ['lab'])
})

test('afegir una activitat pròpia només crea un element de sessió i conserva la Programació', () => {
  const data = input([bundle('target', '', [['exam', 30]]), bundle('later')])
  const original = structuredClone(data)
  const addition = buildSessionActivityAddition(data, { title: '  Debat sobre una notícia  ' }, 25, options)
  assert.equal(addition.item.title, 'Debat sobre una notícia')
  assert.equal(addition.item.plannedMinutes, 25)
  assert.equal(addition.item.sourceActivityId, null)
  assert.equal(addition.item.sourcePlanningUnitId, null)
  assert.equal(addition.item.sessionId, 'target')
  assert.equal(addition.item.order, 1)
  assert.equal(addition.activity, null)
  assert.deepEqual(addition.changedItems, [])
  assert.deepEqual(addition.removedItems, [])
  assert.deepEqual(data, original)
  assert.throws(() => buildSessionActivityAddition(data, { title: 'Debat' }, 26, options), /25 minuts/)
  assert.throws(() => buildSessionActivityAddition(data, { title: '  ' }, 10, options), /Escriu/)
  assert.throws(() => buildSessionActivityAddition(data, { title: 'Debat' }, 0, options), /durada/)
})

test('les activitats pròpies respecten Babèlium, les anul·lacions i les sessions amb historial', () => {
  const target = bundle('target')
  target.items.push(createBabeliumItem(target.session, options))
  assert.throws(() => buildSessionActivityAddition(input([target]), { title: 'Debat' }, 30, options), /25 minuts/)
  assert.throws(() => buildSessionActivityAddition(input([{ ...target, session: { ...target.session, status: 'held' } }]), { title: 'Debat' }, 10, options), /dades de classe/)
  const data = { ...input([target]), calendarEvents: [{ id: 'cancel', type: 'cancellation', startsOn: '2026-10-09', classIds: ['fictional'] }] }
  assert.throws(() => buildSessionActivityAddition(data, { title: 'Debat' }, 10, options), /no es fa/)
})


test('recalcular la Programació conserva una sessió amb una activitat pròpia', () => {
  const target = bundle('target', '', [['exam', 30]])
  const addition = buildSessionActivityAddition(input([target]), { title: 'Debat', fixedToSession: true }, 25, options)
  const customBundle = { ...target, items: [...target.items, addition.item] }
  const original = structuredClone(customBundle)
  const result = buildActivitySessionReflow({ application, activities, existingSessionBundles: [customBundle],
    fromDate: '2026-10-04', options, candidates: [{ date: '2026-10-12', startsAt: '2026-10-12T08:30:00', durationMinutes: 60 }] })
  assert.equal(result.lockedSessionCount, 1)
  assert(!result.removedSessions.some(session => session.id === target.session.id))
  assert(!result.removedItems.some(item => item.id === addition.item.id))
  assert.deepEqual(customBundle, original)
})


test('compactar i editar activitats al voltant d’una xerrada manté la cita i reserva els seus minuts', () => {
  const first = bundle('first', '', [['exam', 20]], { startsAt: '2026-10-05T08:30:00' })
  const fixed = createSessionItem({ id: 'talk', ownerUid: 'teacher', applicationId: 'app', sessionId: 'later', title: 'Xerrada', type: 'activity', plannedMinutes: 30, order: 0 }, options)
  const later = bundle('later', '', [['lab', 40]], { startsAt: '2026-10-09T08:30:00' })
  later.items.unshift(fixed)
  const base = { application, targetSessionId: 'first', existingSessionBundles: [first, later], options,
    candidates: [{ date: '2026-10-12', startsAt: '2026-10-12T08:30:00', durationMinutes: 60 }] }
  for (const preview of [buildAgendaRecoveryReflow({ ...base, recoveryItem: first.items[0], recoveryMinutes: 10 }), buildAgendaSessionCompaction(base), buildAgendaItemChangeReflow({ ...base, targetItemId: first.items[0].id, changes: { plannedMinutes: 40 } }), buildAgendaSessionReplacement({ ...base, title: 'Activitat pròpia nova', plannedMinutes: 55, disposition: 'postpone' })]) {
    const talk = preview.sessions.find(bundle => bundle.items.some(item => item.id === fixed.id))
    assert.equal(talk.session.startsAt, later.session.startsAt)
    assert.deepEqual(talk.items.find(item => item.id === fixed.id), fixed)
    assert.equal(preview.sessions.flatMap(bundle => bundle.items).filter(item => item.id === fixed.id).length, 1)
    assert(!preview.removedItems.some(item => item.id === fixed.id))
    assert(talk.items.reduce((total, item) => total + Number(item.plannedMinutes || 0), 0) <= 55)
  }
  for (const disposition of ['remove', 'postpone']) {
    const replacement = buildAgendaSessionReplacement({ ...base, targetSessionId: 'later', title: 'Prova', plannedMinutes: 20, disposition })
    const unchanged = replacement.sessions.find(bundle => bundle.session.id === 'later').items.find(item => item.id === fixed.id)
    assert.deepEqual(unchanged, fixed)
    assert(!replacement.removedItems.some(item => item.id === fixed.id))
  }
  assert.throws(() => buildAgendaSessionReplacement({ ...base, targetSessionId: 'later', title: 'Prova', plannedMinutes: 30 }), /25 minuts/)
  const sameDay = buildAgendaSessionCompaction({ ...base, targetSessionId: 'later' })
  assert.deepEqual(sameDay.sessions.find(bundle => bundle.session.id === 'later').items.find(item => item.id === fixed.id), fixed)
  assert.throws(() => buildAgendaContinuationReflow({ ...base, targetSessionId: 'later', targetItemId: fixed.id, continuationMinutes: 10, moveFromTarget: true }), /fixada/)
})


test('desfixar una activitat permet redistribuir-la sense tornar-la a fixar en desar els fragments', () => {
  const first = bundle('first', '', [['exam', 20]], { startsAt: '2026-10-05T08:30:00' })
  const later = bundle('later', '', [], { startsAt: '2026-10-09T08:30:00' })
  const custom = createSessionItem({ id: 'custom', ownerUid: 'teacher', applicationId: 'app', sessionId: 'later',
    title: 'Debat flexible', type: 'activity', plannedMinutes: 30, fixedToSession: false, order: 0 }, options)
  later.items.push(custom)
  const base = { application, targetSessionId: 'first', existingSessionBundles: [first, later], options }
  const preview = buildAgendaSessionCompaction(base)
  const moved = preview.sessions.flatMap(bundle => bundle.items).filter(item => item.title === custom.title)
  assert.equal(moved[0].sessionId, 'first')
  assert.equal(moved[0].fixedToSession, false)
  assert.equal(moved[0].sourceActivityId, null)
  const reloaded = buildAgendaSessionCompaction({ ...base, existingSessionBundles: preview.sessions })
  assert.equal(reloaded.sessions.flatMap(bundle => bundle.items).find(item => item.title === custom.title).fixedToSession, false)
  const smart = buildActivitySessionReflow({ ...base, activities: [], fromDate: '2026-10-04' })
  const smartMoved = smart.sessions.flatMap(bundle => bundle.items).find(item => item.title === custom.title)
  assert.equal(smartMoved.sessionId, 'first')
  assert.equal(smartMoved.fixedToSession, false)
  assert.equal(smartMoved.sourceActivityId, null)
  assert.throws(() => buildActivitySessionReflow({ application, activities: [], existingSessionBundles: [{ ...later, session: { ...later.session, durationMinutes: 20 } }], fromDate: '2026-10-04', options }), /No hi ha prou temps/)
  const pinned = { ...later, items: [{ ...custom, fixedToSession: true }] }
  const fixedPreview = buildAgendaSessionCompaction({ ...base, existingSessionBundles: [first, pinned] })
  assert.equal(fixedPreview.sessions.find(bundle => bundle.items.some(item => item.id === custom.id)).session.id, 'later')
  assert.equal(buildSessionActivityAddition(input([bundle('target')]), { title: 'Nova' }, 15, options).item.fixedToSession, false)
  assert.equal(buildSessionActivityAddition(input([bundle('target')]), { title: 'Nova', fixedToSession: true }, 15, options).item.fixedToSession, true)
})


test('editar el text i els minuts d’una activitat pròpia conserva la sessió i la fixació', () => {
  for (const fixedToSession of [true, false]) {
    const target = bundle('target', '', [['exam', 20]])
    const added = buildSessionActivityAddition(input([target]), { title: 'Sortida', fixedToSession }, 30, options).item
    target.items.push(added)
    const before = structuredClone(target)
    const edited = buildOwnSessionActivityChange(target, added.id, { title: '  Xerrada  ', plannedMinutes: 35 }, options)
    assert.equal(edited.title, 'Xerrada')
    assert.equal(edited.plannedMinutes, 35)
    assert.equal(edited.sessionId, added.sessionId)
    assert.equal(edited.id, added.id)
    assert.equal(edited.fixedToSession, fixedToSession)
    assert.equal(edited.sourceActivityId, null)
    assert.deepEqual(target, before)
    assert.throws(() => buildOwnSessionActivityChange(target, added.id, { plannedMinutes: 36 }, options), /35 minuts/)
    assert.throws(() => buildOwnSessionActivityChange(target, added.id, { title: ' ' }, options), /títol/)
    assert.throws(() => buildOwnSessionActivityChange({ ...target, session: { ...target.session, status: 'held' } }, added.id, { title: 'Canvi' }, options), /no es pot modificar/)
  }
})


test('continuar des de Mode aula posa 15 minuts al principi i conserva la classe actual', () => {
  const current = bundle('current', '', [['exam', 30]], { startsAt: '2026-10-04T08:30:00', status: 'held', classroomOpenedAt: options.now })
  const next = bundle('next', '', [['lab', 50]], { startsAt: '2026-10-09T08:30:00' })
  const before = structuredClone(current)
  const preview = buildAgendaContinuationReflow({ application, existingSessionBundles: [current, next],
    targetSessionId: current.session.id, targetItemId: current.items[0].id, moveFromTarget: false,
    activityMinutesById: { exam: 30, lab: 50 }, options,
    additionalActivities: [{ sourceActivityId: 'exam', title: 'Prova fictícia', type: 'activity', plannedMinutes: 15 }],
    candidates: [{ date: '2026-10-12', startsAt: '2026-10-12T08:30:00', durationMinutes: 60 }] })
  assert.deepEqual(preview.sessions[0].items.map(item => [item.sourceActivityId, item.plannedMinutes]), [['exam', 15], ['lab', 40]])
  assert.deepEqual(preview.sessions[1].items.map(item => [item.sourceActivityId, item.plannedMinutes]), [['lab', 10]])
  assert.equal(preview.activityMinutesChanges.exam, 45)
  assert(!preview.removedItems.some(item => item.sessionId === current.session.id))
  assert.deepEqual(current, before)
  assert.deepEqual(preview.unscheduled, [])
})


test('inserir 15 minuts propis en una sessió plena desplaça tot el contingut i respecta les cites fixades', () => {
  const first = bundle('first', '', [['exam', 55]], { startsAt: '2026-10-09T08:30:00' })
  const next = bundle('next', '', [['lab', 50]], { startsAt: '2026-10-12T08:30:00' })
  const fixed = createSessionItem({ id: 'talk', ownerUid: 'teacher', applicationId: 'app', sessionId: 'next',
    title: 'Xerrada fixa', type: 'activity', plannedMinutes: 25, fixedToSession: true, order: 0 }, options)
  next.items.push(fixed)
  const base = { application, targetSessionId: 'first', existingSessionBundles: [first, next], options,
    activityMinutesById: { exam: 55, lab: 50 }, title: 'Acabar presentació', plannedMinutes: 15,
    candidates: [{ date: '2026-10-16', startsAt: '2026-10-16T08:30:00', durationMinutes: 60 }] }
  const original = structuredClone(base)
  for (const fixedToSession of [false, true]) {
    const preview = buildAgendaOwnActivityInsertion({ ...base, fixedToSession })
    const current = preview.sessions.find(bundle => bundle.session.id === 'first')
    const own = current.items.find(item => item.title === base.title)
    assert.equal(own.plannedMinutes, 15)
    assert.equal(own.fixedToSession, fixedToSession)
    assert.equal(own.sourceActivityId, null)
    assert.equal([...current.items].sort((a,b) => a.order-b.order)[0].id, own.id)
    for (const sourceId of ['exam', 'lab']) assert.equal(preview.sessions.flatMap(bundle => bundle.items)
      .filter(item => item.sourceActivityId === sourceId).reduce((sum,item) => sum+item.plannedMinutes,0), base.activityMinutesById[sourceId])
    assert.deepEqual(preview.sessions.find(bundle => bundle.session.id === 'next').items.find(item => item.id === fixed.id), fixed)
    assert(preview.sessions.every(bundle => bundle.items.reduce((sum,item) => sum+Number(item.plannedMinutes || 0),0) <= 55))
    assert.deepEqual(base, original)
  }
  assert.throws(() => buildAgendaOwnActivityInsertion({ ...base, candidates: [] }), /No hi ha prou classes/)
  assert.throws(() => buildAgendaOwnActivityInsertion({ ...base, targetSessionId: 'next', plannedMinutes: 31 }), /30 minuts/)
  assert.throws(() => buildAgendaOwnActivityInsertion({ ...base, existingSessionBundles: [{ ...first, session: { ...first.session, status: 'held' } }, next] }), /no es pot modificar/)
})


test('una pràctica programada fixada conserva la data i l’activitat anterior continua després', () => {
  const first = bundle('first', '', [['exam', 55]])
  const lab = bundle('lab-day', '', [['lab', 55]], { startsAt: '2026-10-12T08:30:00' })
  lab.items[0].fixedToSession = true
  const original = structuredClone(lab.items[0])
  const base = { application, targetSessionId: 'first', existingSessionBundles: [first, lab], options,
    activityMinutesById: { exam: 55, lab: 55 },
    candidates: [{ date: '2026-10-16', startsAt: '2026-10-16T08:30:00', durationMinutes: 60 }] }
  const preview = buildAgendaItemChangeReflow({ ...base, targetItemId: first.items[0].id, changes: { plannedMinutes: 70 } })
  const pinned = preview.sessions.find(b => b.session.id === 'lab-day')
  assert.deepEqual(pinned.items.find(i => i.id === original.id), original)
  assert(!preview.removedItems.some(i => i.id === original.id))
  assert.equal(preview.sessions.flatMap(b => b.items).filter(i => i.sourceActivityId === 'lab').reduce((n,i) => n+i.plannedMinutes,0), 55)
  const overflow = preview.sessions.find(b => b.session.startsAt.startsWith('2026-10-16'))
  assert.equal(overflow.items.find(i => i.sourceActivityId === 'exam').plannedMinutes, 15)
  assert.equal(preview.activityMinutesChanges.exam, 70)
  assert.deepEqual(preview.unscheduled, [])
  assert.throws(() => buildAgendaContinuationReflow({ ...base, targetSessionId: 'lab-day', targetItemId: original.id, continuationMinutes: 15, moveFromTarget: true }), /fixada/)
})

test('els minuts fixats d’una font parcial no es dupliquen en redistribuir', () => {
  const first = bundle('first', '', [['lab', 40]])
  const later = bundle('later', '', [['lab', 15]], { startsAt: '2026-10-12T08:30:00' })
  later.items[0].fixedToSession = true
  const preview = buildAgendaSessionCompaction({ application, targetSessionId: 'first', existingSessionBundles: [first,later], options, activityMinutesById: { lab: 55 } })
  assert.equal(preview.sessions.flatMap(b => b.items).reduce((n,i) => n+i.plannedMinutes,0),55)
  assert.equal(preview.sessions.find(b => b.session.id === 'later').items.find(i => i.id === later.items[0].id).plannedMinutes,15)
})

test('fixar i desfixar conserva la font, agrupa fragments i impedeix traslladar una pràctica fixada', () => {
  const target = bundle('target')
  const later = bundle('later', '', [['lab',50]], { startsAt: '2026-10-12T08:30:00' })
  const copy = structuredClone(later)
  const pinned = buildSessionActivityPinChanges(later,later.items[0],true,options)
  assert.equal(isFixedAgendaItem(pinned[0]),true)
  assert.equal(pinned[0].sourceActivityId,'lab')
  assert.equal(pinned[0].id,later.items[0].id)
  later.items=pinned
  const choice = getSessionActivityChoices({ ...input([target,later]),options }).find(i => i.id==='lab')
  assert.equal(choice.available,false)
  assert.equal(choice.completed,false)
  assert.throws(() => buildSessionActivityAddition({ ...input([target,later]),options },'lab',15,options), /calendaritzada/)
  later.items=buildSessionActivityPinChanges(later,later.items[0],false,options)
  assert.equal(getSessionActivityChoices({ ...input([target,later]),options }).find(i=>i.id==='lab').available,true)
  const extra=createSessionItem({ ...later.items[0],id:'second',plannedMinutes:10 },options)
  later.items.push(extra)
  const combined=combineAgendaSessionItems(later.items)[0]
  assert.equal(buildSessionActivityPinChanges(later,combined,true,options).length,2)
  for(const type of ['indication','transition']) {
    const entry=createSessionItem({ ...copy.items[0],type },options)
    assert.equal(isFixedAgendaItem(buildSessionActivityPinChanges({ ...copy,items:[entry] },entry,true,options)[0]),true)
  }
  assert.throws(() => buildSessionActivityPinChanges({ ...copy,session:{ ...copy.session,status:'held' } },copy.items[0],true,options), /dades de classe/)
})


test('recuperar, substituir i inserir contingut respecta un laboratori programat fixat', () => {
  const first = bundle('first', '', [['exam',55]])
  const lab = bundle('lab-day', '', [['lab',55]], { startsAt:'2026-10-12T08:30:00' })
  lab.items[0].fixedToSession=true
  const base={ application, targetSessionId:'first',existingSessionBundles:[first,lab],options,
    activityMinutesById:{exam:55,lab:55},candidates:[{date:'2026-10-16',startsAt:'2026-10-16T08:30:00',durationMinutes:60}, {date:'2026-10-19',startsAt:'2026-10-19T08:30:00',durationMinutes:60}] }
  const previews=[buildAgendaRecoveryReflow({...base,recoveryItem:first.items[0],recoveryMinutes:15}),
    buildAgendaSessionReplacement({...base,title:'Xerrada',plannedMinutes:15,disposition:'postpone'}),
    buildAgendaOwnActivityInsertion({...base,title:'Xerrada',plannedMinutes:15})]
  for(const preview of previews) {
    assert.deepEqual(preview.sessions.find(b=>b.session.id==='lab-day').items.find(i=>i.id===lab.items[0].id),lab.items[0])
    assert.equal(preview.sessions.flatMap(b=>b.items).filter(i=>i.sourceActivityId==='lab').reduce((n,i)=>n+i.plannedMinutes,0),55)
    assert(!preview.removedItems.some(i=>i.id===lab.items[0].id))
  }
})
