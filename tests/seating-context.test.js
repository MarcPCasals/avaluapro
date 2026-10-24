import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { getSeatingContextKey, getSeatingRooms, getSeatingStudents, normalizeSeatingContext, isSameSeatingContext } from '../src/features/tutoring/seatingContext.js'
import { getSeatingObjectiveWeights } from '../src/features/tutoring/seatingIterationUtils.js'
import { createCooperativeSociometricHelpers } from '../src/features/tutoring/cooperativeGroupSociometricUtils.js'

const students = [
  { id: 'a1', name: 'Fictici A1', halfGroup: 'Grup A' },
  { id: 'a2', name: 'Fictici A2', halfGroup: 'A' },
  { id: 'b1', name: 'Fictici B1', halfGroup: 'Grup B' },
  { id: 'unassigned', name: 'Sense mig grup', halfGroup: '' },
]
const labA = { roomId: 'lab', roomName: 'Laboratori', halfGroup: 'A' }
const labB = { ...labA, halfGroup: 'B' }
const plan = context => ({ layout: { seatingContext: context } })

test('els plans anteriors continuen a l’aula principal i al grup complet', () => {
  assert.equal(getSeatingContextKey(), getSeatingContextKey(normalizeSeatingContext()))
  assert.ok(isSameSeatingContext({ layout: {} }, plan(normalizeSeatingContext())))
  assert.ok(!isSameSeatingContext(plan(labA), plan(labB)))
  assert.ok(!isSameSeatingContext(plan(labA), plan({ ...labA, roomId: 'other' })))
})

test('les llistes venen de les assignacions A/B i no inclouen alumnes sense assignació', () => {
  assert.deepEqual(getSeatingStudents(students, labA).map(s => s.id), ['a1', 'a2'])
  assert.deepEqual(getSeatingStudents(students, labB).map(s => s.id), ['b1'])
  assert.equal(getSeatingStudents(students, {}), students)
  assert.deepEqual(getSeatingStudents([], labA), [])
  assert.deepEqual(getSeatingStudents([{ ...students[0], halfGroup: 'Grup B' }], labA), [])
  assert.deepEqual(getSeatingRooms([plan(labA), plan(labB)]).map(r => r.roomId), ['main', 'lab'])
})

// Execute the actual production engine with synthetic profiles and its real relationship helpers.
const source = await readFile(new URL('../src/features/tutoring/TutoringView.jsx', import.meta.url), 'utf8')
const names = ['getGridSeatId', 'getDefaultSeatingActiveSeatIds', 'normalizeSeatingBlocks', 'getSeatingBlockPosition', 'getSeatZone', 'getStableStudentNumber', 'normalizeSeatingLayout', 'getSeatDistance', 'getSeatingZoneLabel', 'getSeatingZoneId', 'hasSeatingPair', 'getSeatingHalfGroupKey', 'normalizeSeatingHalfGroupSeatIds', 'getSeatingShortName', 'buildTutorialSeatingPlan']
const declarations = names.map(name => {
  const match = source.match(new RegExp(`^function ${name}\\([\\s\\S]*?^}$`, 'm'))
  assert.ok(match, name)
  return match[0]
}).join('\n')
const helpers = createCooperativeSociometricHelpers({ getRelationInfluence: relation => relation.strength || 1, getRelationTypeMeta: type => ({ label: type }) })
const build = vm.runInNewContext(`${declarations}; buildTutorialSeatingPlan`, {
  ...helpers, normalizeSeatingContext, getSeatingObjectiveWeights,
  SEATING_GRID_ROWS: 5, SEATING_GRID_COLUMNS: 9, DEFAULT_SEATING_ACTIVE_SEATS: [[0, 1], [0, 1], [0, 1]],
})
const profilesByStudentId = new Map(students.map(student => [student.id, { student, halfGroup: student.halfGroup, priorityScore: 0, sociometricCategory: 'Acceptat' }]))
function generate(context, overrides = {}) {
  return build({ layout: { blocks: [3, 3], rows: 5, seatingContext: context }, students: getSeatingStudents(students, context), profilesByStudentId, relations: [], ...overrides })
}

test('el mateix motor proposa només el mig grup i rebutja assignacions manuals d’altres grups', () => {
  for (const context of [labA, labB]) {
    const result = generate(context, { manualSeatByStudentId: { unassigned: 'seat_0_0' } })
    assert.deepEqual(Array.from(result.placements, p => p.studentId).sort(), getSeatingStudents(students, context).map(s => s.id).sort())
    assert.equal(new Set(result.placements.map(p => p.seat.id)).size, result.placements.length)
    assert.equal(result.layout.seatingContext.roomId, 'lab')
  }
})

test('la proposta de mig grup manté bloquejos, llocs fixats i restriccions de proximitat', () => {
  const result = generate(labA, {
    manualSeatByStudentId: { a1: 'seat_0_0' }, lockedStudentIds: ['a1'], blockedSeatIds: ['seat_1_0'],
    restrictions: { neverNearPairs: [{ studentId: 'a1', targetStudentId: 'a2' }] },
  })
  const first = result.placements.find(p => p.studentId === 'a1')
  const second = result.placements.find(p => p.studentId === 'a2')
  assert.equal(first.seat.id, 'seat_0_0')
  assert.equal(first.isLocked, true)
  assert.notEqual(second.seat.id, 'seat_1_0')
  assert.ok(second.seat.x + second.seat.y > 2)
})

test('la proposta del mig grup segueix utilitzant les relacions socials i de treball', () => {
  const relations = [{ sourceStudentId: 'a1', targetStudentId: 'a2', type: 'avoid', strength: 5 }]
  const result = generate(labA, { manualSeatByStudentId: { a1: 'seat_0_0' }, relations })
  const second = result.placements.find(p => p.studentId === 'a2')
  assert.ok(second.seat.x + second.seat.y > 2)
})

test('Mode aula tria l’activa del mig grup de la sessió i del grup vinculat a tutoria', async () => {
  const { getSessionSeatingPlans } = await import('../src/features/tutoring/seatingContext.js')
  const classes = [{ id: 'science' }, { id: 'tutoring', tutorialLinkedClassId: 'science' }, { id: 'other' }]
  const plans = [
    { ...plan({}), id: 'main', classId: 'tutoring', isActive: true },
    { ...plan(labA), id: 'a', classId: 'tutoring', isActive: true },
    { ...plan(labB), id: 'b', classId: 'tutoring', isActive: true },
    { ...plan(labA), id: 'inactive', classId: 'tutoring', isActive: false },
    { ...plan(labA), id: 'wrong-class', classId: 'other', isActive: true },
  ]
  const find = subgroupId => getSessionSeatingPlans({ plans, classes, session: { classId: 'science', subgroupId } }).map(p => p.id)
  assert.deepEqual(find('Grup A'), ['a'])
  assert.deepEqual(find('B'), ['b'])
  assert.deepEqual(find(''), ['main'])
  assert.deepEqual(getSessionSeatingPlans({ plans: plans.filter(p => p.id !== 'a'), classes, session: { classId: 'science', subgroupId: 'A' } }), [])
  const twoRooms = [...plans, { ...plan({ roomId: 'main', halfGroup: 'A' }), id: 'main-a', classId: 'science', isActive: true }]
  assert.equal(getSessionSeatingPlans({ plans: twoRooms, classes, session: { classId: 'science', subgroupId: 'A' } })[0].id, 'main-a')
  assert.equal(getSessionSeatingPlans({ plans: twoRooms, classes, session: { classId: 'science', subgroupId: 'A', roomId: 'lab' } })[0].id, 'a')
})

test('el motor permet dues files i manté la taula docent al centre quan es normalitza un plànol desat', () => {
  const result = generate(labA, { layout: { blocks: [3], rows: 2, teacherDeskSide: 'center', seatingContext: labA } })
  assert.equal(result.rows, 2)
  assert.equal(result.layout.rows, 2)
  assert.equal(result.seats.length, 6)
  assert.equal(result.layout.teacherDeskSide, 'center')
  const reloaded = generate(labA, { layout: result.layout })
  assert.equal(reloaded.rows, 2)
  assert.equal(reloaded.layout.teacherDeskSide, 'center')
})

test('la manca de llocs en una proposta automàtica apareix com a incidència i explica la qualitat zero', () => {
  const analyze = helpers.analyzeTutorialSeatingPlan
  const result = analyze({ plan: { rows: 2, placements: [], unplacedProfiles: Array.from({ length: 9 }, (_, i) => ({ student: { id: `synthetic-${i}` } })) }, relations: [], getSeatDistance: () => 0 })
  assert.equal(result.score, 0)
  assert.equal(result.quality.label, 'Incompleta')
  assert.equal(result.unplacedCount, 9)
  assert.equal(result.conflicts[0].severity, 'danger')
  assert.match(result.conflicts[0].text, /9 alumne/)
  assert.match(result.summary, /incompleta/)
  assert.doesNotMatch(result.summary, /no presenta conflictes/)
  assert.match(result.recommendations[0], /amplia les files/)
})

test('una proposta amb menys llocs que alumnes conserva els pendents al diagnòstic', () => {
  const result = generate({}, { layout: { blocks: [1], rows: 2 } })
  assert.equal(result.placements.length, 2)
  assert.equal(result.unplacedProfiles.length, 2)
  const analysis = helpers.analyzeTutorialSeatingPlan({ plan: result, relations: [], getSeatDistance: (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) })
  assert.equal(analysis.unplacedCount, 2)
  assert.equal(analysis.quality.label, 'Incompleta')
  assert.match(analysis.conflicts[0].title, /sense lloc/)
})

test('un mig grup complet no és incomplet per pendents de l’altre mig grup o una llista antiga', () => {
  const roster = getSeatingStudents(students, labA)
  const result = generate(labA)
  result.unplacedProfiles = [...profilesByStudentId.values()]
  const analysis = helpers.analyzeTutorialSeatingPlan({ plan: result, students: roster, relations: [], getSeatDistance: (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) })
  assert.equal(analysis.expectedCount, 2)
  assert.equal(analysis.placedCount, 2)
  assert.equal(analysis.unplacedCount, 0)
  assert.notEqual(analysis.quality.label, 'Incompleta')
  assert.equal(analysis.score, 100)
  assert.equal(analysis.conflicts.length, 0)
})

test('el diagnòstic detecta alumnes del mig grup absents d’un pla desat encara que la llista antiga de pendents sigui buida', () => {
  const result = generate(labA)
  result.placements = result.placements.slice(0, 1)
  result.unplacedProfiles = []
  const analysis = helpers.analyzeTutorialSeatingPlan({ plan: result, students: getSeatingStudents(students, labA), relations: [], getSeatDistance: () => 0 })
  assert.equal(analysis.expectedCount, 2)
  assert.equal(analysis.placedCount, 1)
  assert.equal(analysis.unplacedCount, 1)
  assert.equal(analysis.quality.label, 'Incompleta')
})
