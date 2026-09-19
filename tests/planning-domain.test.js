import assert from 'node:assert/strict'
import test from 'node:test'
import {
  PLANNING_ENTITY_TYPES,
  PLANNING_SCHEMA_VERSION,
  applyImprovementProposals,
  buildActivityImprovementProposals,
  buildActivitySessionDistribution,
  buildTimetableSessionCandidates,
  copyPlanningActivityToPhase,
  copyTimetableVersionStructure,
  copyPlanningUnitStructureToAcademicYear,
  copyPlanningUnitToAcademicYear,
  createAcademicYear,
  createAccessGrant,
  createActivityResult,
  createCalendarEvent,
  createCalendarSession,
  createGroupActivityOverride,
  createGroupApplication,
  createPlanningActivity,
  createPlanningPhase,
  createPlanningPrivateNote,
  createPlanningUnit,
  createSessionItem,
  createTemporalUnit,
  createTimetableSlot,
  createTimetableVersion,
  getPlanningPermissions,
  getPlanningTotals,
  getActivityActualComparisons,
  findTimetableSlotConflicts,
  getProgrammableMinutes,
  getSessionLoad,
  movePlanningActivityInSequence,
  moveTimetableSlot,
  orderActivitiesForScheduling,
  planActivityChange,
  selectEffectiveTimetable,
  updatePlanningActivity,
} from '../src/domain/planning/index.js'

const NOW = '2026-09-18T12:00:00.000Z'

function sequenceIdFactory() {
  let sequence = 0
  return (prefix) => `${prefix}-test-${++sequence}`
}

function options(idFactory = sequenceIdFactory()) {
  return { now: NOW, idFactory }
}

function basePlanningUnit(idFactory = sequenceIdFactory()) {
  return createPlanningUnit(
    {
      ownerUid: 'teacher-1',
      academicYearId: 'year-2026',
      temporalUnitId: 'ut-1',
      code: 'UP1',
      level: '1r ESO',
      title: 'El paisatge sonor',
      competencyIds: ['competency-1'],
    },
    options(idFactory),
  )
}

function baseActivity(idFactory = sequenceIdFactory()) {
  return createPlanningActivity(
    {
      ownerUid: 'teacher-1',
      planningUnitId: 'up-1',
      phaseId: 'phase-1',
      title: 'Escolta guiada',
      order: 1,
      plannedMinutes: 40,
      evidenceMode: 'final',
      teacherMaterials: [{ kind: 'link', label: 'Àudio', url: 'https://example.test/audio' }],
    },
    options(idFactory),
  )
}

test('els identificadors es mantenen quan una activitat es revisa o es reordena', () => {
  const activity = baseActivity()
  const revised = updatePlanningActivity(activity, { order: 3, title: 'Escolta en parelles' }, { now: NOW })

  assert.match(activity.id, /^plan-activity-/)
  assert.equal(revised.id, activity.id)
  assert.equal(revised.createdAt, activity.createdAt)
  assert.equal(revised.order, 3)
  assert.equal(revised.title, 'Escolta en parelles')
})

test('una indicació queda dins la seqüència sense exigir temporització', () => {
  const indication = createPlanningActivity({
    ownerUid: 'teacher-1',
    planningUnitId: 'up-1',
    phaseId: 'phase-1',
    type: 'indication',
    title: 'Agafar la bata',
    order: 0,
  }, options())

  assert.equal(indication.type, 'indication')
  assert.equal(indication.plannedMinutes, null)
})

test('la UP conserva una fotografia llegible del currículum i el vincle opcional amb AvaluaPro', () => {
  const unit = createPlanningUnit({
    ownerUid: 'teacher-1',
    academicYearId: 'year-2026',
    temporalUnitId: 'ut-1',
    code: 'UP2',
    level: '2n ESO',
    title: 'Transformacions',
    curriculum: {
      competencies: [{ id: 'plan-curriculum-1', label: 'Competència científica', sourceId: 'comp-1' }],
      expectedLearnings: [{ id: 'plan-curriculum-2', label: 'Explica els canvis observats' }],
      assessmentCriteria: [{ id: 'plan-curriculum-3', label: 'Argumenta amb evidències' }],
      indicators: [{ id: 'plan-curriculum-4', label: 'Relaciona causa i efecte', sourceId: 'indicator-1' }],
    },
  }, options())

  assert.equal(unit.curriculum.competencies[0].label, 'Competència científica')
  assert.equal(unit.curriculum.competencies[0].sourceId, 'comp-1')
  assert.equal(unit.curriculum.expectedLearnings[0].sourceId, null)
  assert.equal(unit.curriculum.indicators[0].id, 'plan-curriculum-4')
  assert.deepEqual(unit.competencyIds, ['comp-1'])
  assert.deepEqual(unit.indicatorIds, ['indicator-1'])
})

test('una mesura comparteix l’actuació i l’alumnat però descarta diagnòstics i notes personals', () => {
  const activity = createPlanningActivity({
    ownerUid: 'teacher-1',
    planningUnitId: 'up-1',
    phaseId: 'phase-1',
    title: 'Lectura guiada',
    order: 0,
    diversityMeasures: [{
      id: 'plan-measure-1',
      label: 'Donar instruccions curtes i seqüenciades.',
      classId: 'class-1',
      className: '1r A',
      studentIds: ['student-1'],
      studentNames: ['ALBA SERRA, Joana'],
      diagnosis: 'tdah',
      personalNotes: 'No s’ha de copiar.',
    }],
  }, options())

  assert.deepEqual(Object.keys(activity.diversityMeasures[0]).sort(), [
    'classId', 'className', 'id', 'label', 'studentIds', 'studentNames',
  ])
  assert.equal(JSON.stringify(activity).includes('tdah'), false)
  assert.equal(JSON.stringify(activity).includes('No s’ha de copiar'), false)
  assert.deepEqual(activity.diversityMeasureIds, ['plan-measure-1'])
})

test('la nansa pot reordenar un element i moure’l a una altra fase sense canviar-ne la identitat', () => {
  const idFactory = sequenceIdFactory()
  const first = createPlanningActivity({
    ownerUid: 'teacher-1', planningUnitId: 'up-1', phaseId: 'phase-1', title: 'A', order: 0,
  }, options(idFactory))
  const moved = createPlanningActivity({
    ownerUid: 'teacher-1', planningUnitId: 'up-1', phaseId: 'phase-1', title: 'B', order: 1,
  }, options(idFactory))
  const target = createPlanningActivity({
    ownerUid: 'teacher-1', planningUnitId: 'up-1', phaseId: 'phase-2', title: 'C', order: 0,
  }, options(idFactory))

  const result = movePlanningActivityInSequence(
    [first, moved, target],
    { activityId: moved.id, targetActivityId: target.id, targetPhaseId: 'phase-2' },
    { now: '2026-09-18T13:00:00.000Z' },
  )
  const revised = result.activities.find((activity) => activity.id === moved.id)

  assert.equal(revised.id, moved.id)
  assert.equal(revised.phaseId, 'phase-2')
  assert.equal(revised.order, 0)
  assert.equal(result.activities.find((activity) => activity.id === target.id).order, 1)
  assert.deepEqual(result.changedActivities.map((activity) => activity.id).sort(), [moved.id, target.id].sort())
})

test('una còpia anual crea una UP nova i conserva la procedència sense tocar l’original', () => {
  const idFactory = sequenceIdFactory()
  const original = basePlanningUnit(idFactory)
  const copy = copyPlanningUnitToAcademicYear(
    original,
    { academicYearId: 'year-2027', temporalUnitId: 'ut-2027-1' },
    options(idFactory),
  )

  assert.notEqual(copy.id, original.id)
  assert.equal(copy.academicYearId, 'year-2027')
  assert.equal(copy.status, 'draft')
  assert.equal(copy.versionNumber, 2)
  assert.deepEqual(copy.copiedFrom, {
    planningUnitId: original.id,
    academicYearId: original.academicYearId,
    copiedAt: NOW,
  })
  assert.equal(original.copiedFrom, null)
  assert.equal(original.academicYearId, 'year-2026')
})

test('la còpia anual duplica fases, subfases i activitats sense conservar permisos ni identitats', () => {
  const idFactory = sequenceIdFactory()
  const unit = {
    ...basePlanningUnit(idFactory),
    accessByEmail: { 'direccio@example.test': { role: 'directionReader' } },
    authorizedEmails: ['direccio@example.test'],
    ownerEmailLower: 'teacher@example.test',
  }
  const root = createPlanningPhase({
    id: 'phase-root', ownerUid: 'teacher-1', planningUnitId: unit.id, title: 'Preparació', kind: 'preparation', order: 0,
  }, options(idFactory))
  const child = createPlanningPhase({
    id: 'phase-child', ownerUid: 'teacher-1', planningUnitId: unit.id, parentPhaseId: root.id, title: 'Exploració', order: 0,
  }, options(idFactory))
  const activity = createPlanningActivity({
    id: 'activity-source', ownerUid: 'teacher-1', planningUnitId: unit.id, phaseId: child.id,
    title: 'Escolta guiada', description: 'Identificar contrastos.', order: 0, plannedMinutes: 35,
    indicatorIds: ['indicator-1'],
    teacherMaterials: [{ id: 'material-1', kind: 'link', label: 'Àudio', url: 'https://example.test/audio' }],
    diversityMeasures: [{ id: 'measure-1', label: 'Fragmentar les instruccions', studentIds: ['student-1'], studentNames: ['Joana'] }],
  }, options(idFactory))
  const copied = copyPlanningUnitStructureToAcademicYear(
    { planningUnit: unit, phases: [root, child], activities: [activity] },
    { academicYearId: 'year-2027', temporalUnitId: 'ut-2027', ownerEmailLower: 'teacher@example.test' },
    options(idFactory),
  )

  assert.notEqual(copied.planningUnit.id, unit.id)
  assert.deepEqual(copied.planningUnit.accessByEmail, {})
  assert.deepEqual(copied.planningUnit.authorizedEmails, [])
  assert.notEqual(copied.phases[0].id, root.id)
  assert.equal(copied.phases[1].parentPhaseId, copied.phases[0].id)
  assert.notEqual(copied.activities[0].id, activity.id)
  assert.equal(copied.activities[0].phaseId, copied.phases[1].id)
  assert.equal(copied.activities[0].teacherMaterials[0].label, 'Àudio')
  assert.deepEqual(copied.activities[0].indicatorIds, ['indicator-1'])
  assert.equal(copied.activities[0].diversityMeasures[0].label, 'Fragmentar les instruccions')
  assert.equal(copied.activities[0].copiedFrom.activityId, activity.id)
  assert.equal(activity.copiedFrom, null)
  assert.equal(child.parentPhaseId, root.id)
})

test('recuperar una activitat antiga conserva el contingut i deixa visible la procedència', () => {
  const idFactory = sequenceIdFactory()
  const original = baseActivity(idFactory)
  const copy = copyPlanningActivityToPhase(original, {
    planningUnitId: 'up-current', phaseId: 'phase-current', order: 4,
    sourceAcademicYearId: 'year-2024', sourcePlanningUnitId: 'up-old',
  }, options(idFactory))

  assert.notEqual(copy.id, original.id)
  assert.equal(copy.planningUnitId, 'up-current')
  assert.equal(copy.phaseId, 'phase-current')
  assert.equal(copy.plannedMinutes, original.plannedMinutes)
  assert.deepEqual(copy.teacherMaterials, original.teacherMaterials)
  assert.deepEqual(copy.copiedFrom, {
    planningUnitId: 'up-old', activityId: original.id, academicYearId: 'year-2024', copiedAt: NOW,
  })
})

test('la comparació prevista-real detecta excessos per activitat i per grup', () => {
  const activity = baseActivity()
  const results = [
    createActivityResult({
      ownerUid: 'teacher-1', applicationId: 'app-a', sessionId: 'session-a', sessionItemId: 'item-a',
      sourceActivityId: activity.id, status: 'completed', actualMinutes: 50,
    }, options()),
    createActivityResult({
      ownerUid: 'teacher-1', applicationId: 'app-b', sessionId: 'session-b', sessionItemId: 'item-b',
      sourceActivityId: activity.id, status: 'continued', actualMinutes: 46,
    }, options()),
  ]
  const [comparison] = getActivityActualComparisons([activity], results, {
    groupNamesByApplicationId: { 'app-a': '1r A', 'app-b': '1r B' },
  })

  assert.equal(comparison.actualMinutesAverage, 48)
  assert.equal(comparison.plannedMinutes, 40)
  assert.equal(comparison.status, 'overrun')
  assert.deepEqual(comparison.sourceGroupNames, ['1r A', '1r B'])
})

test('les revisions generen propostes i només s’apliquen les que el docent accepta', () => {
  const idFactory = sequenceIdFactory()
  const unit = basePlanningUnit(idFactory)
  const activity = baseActivity(idFactory)
  const result = createActivityResult({
    ownerUid: 'teacher-1', applicationId: 'app-a', sessionId: 'session-a', sessionItemId: 'item-a',
    sourceActivityId: activity.id, status: 'completed', actualMinutes: 55,
    missingMaterials: ['Auriculars'], improvementRecommendation: 'modify',
    pedagogicalReflection: 'Cal preparar un exemple més curt.',
  }, options(idFactory))
  const proposals = buildActivityImprovementProposals([activity], [result], { idFactory })
  const unitWithProposals = createPlanningUnit({ ...unit, improvementProposals: proposals }, options(idFactory))

  assert.equal(proposals.length, 1)
  assert.equal(proposals[0].suggestedChanges.plannedMinutes, 55)
  const untouched = applyImprovementProposals(unitWithProposals, [activity], [], { now: NOW })
  assert.equal(untouched.activities[0].plannedMinutes, 40)
  assert.equal(untouched.planningUnit.improvementProposals[0].status, 'pending')

  const accepted = applyImprovementProposals(unitWithProposals, [activity], [proposals[0].id], { now: NOW })
  assert.equal(accepted.activities[0].plannedMinutes, 55)
  assert.equal(accepted.planningUnit.improvementProposals[0].status, 'accepted')
  assert.equal(activity.plannedMinutes, 40)
})

test('les dates impossibles de curs, UT i horari es rebutgen abans de persistir', () => {
  assert.throws(
    () => createAcademicYear({
      ownerUid: 'teacher-1',
      label: '2026-2027',
      startsOn: '2027-06-30',
      endsOn: '2026-09-01',
    }),
    /data inicial/,
  )
  assert.throws(
    () => createTemporalUnit({
      ownerUid: 'teacher-1',
      academicYearId: 'year-1',
      label: 'UT1',
      order: 1,
      startsOn: '18-09-2026',
      endsOn: '2026-12-20',
    }),
    /AAAA-MM-DD/,
  )
  assert.throws(
    () => createTimetableSlot({
      ownerUid: 'teacher-1',
      timetableVersionId: 'timetable-1',
      classId: 'class-1',
      weekday: 1,
      startsAt: '25:15',
      durationMinutes: 60,
      subject: 'Música',
    }),
    /HH:mm/,
  )
  assert.throws(
    () => createCalendarSession({
      ownerUid: 'teacher-1',
      applicationId: 'application-1',
      classId: 'class-1',
      startsAt: 'demà al matí',
      durationMinutes: 60,
    }),
    /data i hora vàlida/,
  )
})

test('els canvis només de grup no modifiquen la UP base', () => {
  const activity = baseActivity()
  const application = { id: 'application-1', ownerUid: 'teacher-1' }
  const result = planActivityChange({
    activity,
    application,
    changes: { plannedMinutes: 55, title: 'Escolta ampliada' },
    scope: 'groupOnly',
    now: NOW,
    idFactory: sequenceIdFactory(),
  })

  assert.equal(result.baseActivity, activity)
  assert.equal(result.baseActivity.plannedMinutes, 40)
  assert.equal(result.groupOverride.activityId, activity.id)
  assert.equal(result.groupOverride.changes.plannedMinutes, 55)
  assert.equal(result.groupOverride.proposalStatus, null)
})

test('un canvi de base conserva la identitat i no crea una excepció de grup', () => {
  const activity = baseActivity()
  const result = planActivityChange({
    activity,
    application: { id: 'application-1', ownerUid: 'teacher-1' },
    changes: { plannedMinutes: 50 },
    scope: 'baseAndGroup',
    now: '2026-09-18T13:00:00.000Z',
  })

  assert.equal(result.baseActivity.id, activity.id)
  assert.equal(result.baseActivity.plannedMinutes, 50)
  assert.equal(result.baseActivity.updatedAt, '2026-09-18T13:00:00.000Z')
  assert.equal(result.groupOverride, null)
})

test('proposar un canvi a altres grups deixa una proposta pendent i preserva la base', () => {
  const activity = baseActivity()
  const result = planActivityChange({
    activity,
    application: { id: 'application-1', ownerUid: 'teacher-1' },
    changes: { description: 'Fer dos exemples abans de començar' },
    scope: 'groupAndProposal',
    now: NOW,
    idFactory: sequenceIdFactory(),
  })

  assert.equal(result.baseActivity.description, null)
  assert.equal(result.groupOverride.proposalStatus, 'pending')
})

test('el pressupost reserva cinc minuts i aplica els tres colors acordats', () => {
  assert.equal(getProgrammableMinutes(60), 55)
  assert.equal(getProgrammableMinutes(90), 85)
  assert.equal(getProgrammableMinutes(120), 115)

  assert.equal(getSessionLoad([{ plannedMinutes: 46 }], 60).status, 'green')
  assert.equal(getSessionLoad([{ plannedMinutes: 47 }], 60).status, 'orange')
  assert.equal(getSessionLoad([{ plannedMinutes: 56 }], 60).status, 'red')
})

test('una versió nova de l’horari copia les franges amb identitats noves', () => {
  const idFactory = sequenceIdFactory()
  const sourceVersion = createTimetableVersion({
    ownerUid: 'teacher-1',
    academicYearId: 'year-1',
    label: 'Horari de setembre',
    effectiveFrom: '2026-09-01',
  }, options(idFactory))
  const sourceSlot = createTimetableSlot({
    ownerUid: 'teacher-1',
    timetableVersionId: sourceVersion.id,
    classId: 'class-1',
    weekday: 2,
    startsAt: '09:30',
    durationMinutes: 90,
    subject: 'Música',
    subgroupId: 'Grup A',
  }, options(idFactory))

  const copied = copyTimetableVersionStructure(
    { timetableVersion: sourceVersion, slots: [sourceSlot] },
    { label: 'Horari d’octubre', effectiveFrom: '2026-10-05' },
    options(idFactory),
  )

  assert.notEqual(copied.timetableVersion.id, sourceVersion.id)
  assert.equal(copied.timetableVersion.effectiveFrom, '2026-10-05')
  assert.notEqual(copied.slots[0].id, sourceSlot.id)
  assert.equal(copied.slots[0].timetableVersionId, copied.timetableVersion.id)
  assert.equal(copied.slots[0].durationMinutes, 90)
  assert.equal(sourceSlot.timetableVersionId, sourceVersion.id)
})

test('moure una franja conserva la identitat i no modifica una sessió ja creada', () => {
  const slot = createTimetableSlot({
    id: 'plan-slot-stable',
    ownerUid: 'teacher-1',
    timetableVersionId: 'plan-timetable-one',
    classId: 'class-1',
    weekday: 1,
    startsAt: '08:30',
    durationMinutes: 60,
    subject: 'Física',
  }, { now: NOW })
  const historicalSession = createCalendarSession({
    id: 'plan-session-historical',
    ownerUid: 'teacher-1',
    applicationId: 'application-1',
    classId: 'class-1',
    timetableSlotId: slot.id,
    startsAt: '2026-09-21T08:30:00+02:00',
    durationMinutes: 60,
  }, { now: NOW })

  const moved = moveTimetableSlot(slot, { weekday: 3, startsAt: '10:00' }, {
    now: '2026-09-20T12:00:00.000Z',
  })

  assert.equal(moved.id, slot.id)
  assert.equal(moved.weekday, 3)
  assert.equal(moved.startsAt, '10:00')
  assert.equal(historicalSession.startsAt, '2026-09-21T08:30:00+02:00')
  assert.equal(historicalSession.timetableSlotId, slot.id)
})

test('cada data selecciona la versió horària que estava vigent', () => {
  const versions = [
    { id: 'setembre', effectiveFrom: '2026-09-01', effectiveTo: '2026-10-04' },
    { id: 'octubre', effectiveFrom: '2026-10-05', effectiveTo: null },
  ]
  assert.equal(selectEffectiveTimetable(versions, '2026-09-30').id, 'setembre')
  assert.equal(selectEffectiveTimetable(versions, '2026-10-05').id, 'octubre')
})

test('l’horari rebutja solapaments però permet franges consecutives', () => {
  const existing = [{ id: 'one', weekday: 1, startsAt: '09:00', durationMinutes: 60 }]
  assert.equal(findTimetableSlotConflicts(existing, {
    id: 'two', weekday: 1, startsAt: '09:30', durationMinutes: 60,
  }).length, 1)
  assert.equal(findTimetableSlotConflicts(existing, {
    id: 'three', weekday: 1, startsAt: '10:00', durationMinutes: 90,
  }).length, 0)
  assert.equal(findTimetableSlotConflicts(existing, {
    id: 'four', weekday: 2, startsAt: '09:00', durationMinutes: 60,
  }).length, 0)
})

test('les indicacions sense temps apareixen a la seqüència però no carreguen la sessió', () => {
  const load = getSessionLoad(
    [
      { type: 'indication', title: 'Agafar la bata', plannedMinutes: null },
      { type: 'activity', title: 'Pràctica', plannedMinutes: 45 },
    ],
    60,
  )

  assert.equal(load.plannedMinutes, 45)
  assert.equal(load.programmableMinutes, 55)
  assert.equal(load.status, 'green')
})

test('els totals de la UP ignoren activitats sense temporització', () => {
  const totals = getPlanningTotals(
    [{ id: 'phase-1' }, { id: 'phase-2' }],
    [
      { phaseId: 'phase-1', plannedMinutes: 25 },
      { phaseId: 'phase-1', plannedMinutes: null },
      { phaseId: 'phase-2', plannedMinutes: 40 },
    ],
  )

  assert.deepEqual(totals, {
    totalMinutes: 65,
    totalsByPhase: { 'phase-1': 25, 'phase-2': 40 },
  })
})

test('una activitat dividida conserva el mateix vincle pedagògic a totes les sessions', () => {
  const idFactory = sequenceIdFactory()
  const shared = {
    ownerUid: 'teacher-1',
    applicationId: 'application-1',
    sourceActivityId: 'activity-120',
    type: 'activity',
    title: 'Projecte de dues hores',
    segmentCount: 2,
  }
  const first = createSessionItem(
    { ...shared, sessionId: 'session-1', order: 1, plannedMinutes: 55, segmentIndex: 1 },
    options(idFactory),
  )
  const second = createSessionItem(
    { ...shared, sessionId: 'session-2', order: 1, plannedMinutes: 65, segmentIndex: 2 },
    options(idFactory),
  )

  assert.notEqual(first.id, second.id)
  assert.equal(first.sourceActivityId, second.sourceActivityId)
  assert.equal(first.segmentIndex, 1)
  assert.equal(second.segmentIndex, 2)
})

test('la seqüència de calendarització respecta fases, subfases i activitats sense temps', () => {
  const phases = [
    { id: 'closing', order: 2, parentPhaseId: null },
    { id: 'resolution-child', order: 0, parentPhaseId: 'resolution' },
    { id: 'preparation', order: 0, parentPhaseId: null },
    { id: 'resolution', order: 1, parentPhaseId: null },
  ]
  const activities = [
    { id: 'closing-activity', order: 0, phaseId: 'closing' },
    { id: 'child-activity', order: 0, phaseId: 'resolution-child' },
    { id: 'resolution-activity', order: 0, phaseId: 'resolution' },
    { id: 'second-preparation', order: 1, phaseId: 'preparation' },
    { id: 'first-preparation', order: 0, phaseId: 'preparation' },
  ]

  assert.deepEqual(
    orderActivitiesForScheduling(phases, activities).map((activity) => activity.id),
    ['first-preparation', 'second-preparation', 'resolution-activity', 'child-activity', 'closing-activity'],
  )
})

test('la proposta usa la versió d’horari vigent i salta festius i anul·lacions del grup', () => {
  const result = buildTimetableSessionCandidates({
    calendarEvents: [
      { id: 'holiday', type: 'holiday', title: 'Festa', startsOn: '2026-09-21', endsOn: '2026-09-21', classIds: [] },
      { id: 'other-class', type: 'cancellation', title: 'Sortida 2B', startsOn: '2026-09-28', endsOn: '2026-09-28', classIds: ['class-2'] },
      { id: 'our-class', type: 'cancellation', title: 'Sortida 1A', startsOn: '2026-10-05', endsOn: '2026-10-05', classIds: ['class-1'] },
    ],
    classId: 'class-1',
    from: '2026-09-21',
    slotsByTimetableId: {
      first: [{ id: 'slot-first', classId: 'class-1', weekday: 1, startsAt: '09:30', durationMinutes: 60 }],
      second: [{ id: 'slot-second', classId: 'class-1', weekday: 1, startsAt: '10:30', durationMinutes: 90 }],
    },
    timetables: [
      { id: 'first', effectiveFrom: '2026-09-01', effectiveTo: '2026-09-30' },
      { id: 'second', effectiveFrom: '2026-10-01', effectiveTo: null },
    ],
    to: '2026-10-12',
  })

  assert.deepEqual(result.candidates.map((candidate) => [candidate.date, candidate.startsAt, candidate.durationMinutes]), [
    ['2026-09-28', '2026-09-28T09:30:00', 60],
    ['2026-10-12', '2026-10-12T10:30:00', 90],
  ])
  assert.deepEqual(result.skippedDates.map((item) => item.date), ['2026-09-21', '2026-10-05'])
})

test('una proposta divide una activitat llarga, manté indicacions i no duplica les ja assignades', () => {
  const idFactory = sequenceIdFactory()
  const application = createGroupApplication({
    ownerUid: 'teacher-1',
    academicYearId: 'year-2026',
    planningUnitId: 'up-1',
    planningUnitVersion: 1,
    classId: 'class-1',
  }, options(idFactory))
  const result = buildActivitySessionDistribution({
    activities: [
      { id: 'already', title: 'Ja assignada', type: 'activity', plannedMinutes: 20 },
      { id: 'coat', title: 'Agafar la bata', type: 'indication', plannedMinutes: null },
      { id: 'long', title: 'Projecte llarg', type: 'activity', plannedMinutes: 120 },
    ],
    application,
    candidates: [
      { date: '2026-09-21', startsAt: '2026-09-21T09:30:00', durationMinutes: 60, timetableSlotId: 'slot-1' },
      { date: '2026-09-28', startsAt: '2026-09-28T09:30:00', durationMinutes: 60, timetableSlotId: 'slot-1' },
      { date: '2026-10-05', startsAt: '2026-10-05T09:30:00', durationMinutes: 60, timetableSlotId: 'slot-1' },
    ],
    options: options(idFactory),
    scheduledSourceActivityIds: ['already'],
  })

  assert.equal(result.sessions.length, 3)
  assert.deepEqual(result.sessions.map((bundle) => bundle.items.map((item) => item.plannedMinutes)), [
    [null, 55],
    [55],
    [10],
  ])
  const longSegments = result.sessions.flatMap((bundle) => bundle.items).filter((item) => item.sourceActivityId === 'long')
  assert.deepEqual(longSegments.map((item) => item.segmentIndex), [1, 2, 3])
  assert.ok(longSegments.every((item) => item.segmentCount === 3))
  assert.equal(longSegments.reduce((total, item) => total + item.plannedMinutes, 0), 120)
  assert.deepEqual(result.skippedAlreadyScheduled, ['already'])
  assert.deepEqual(result.unscheduled, [])
})

test('la previsualització avisa si el calendari no té prou sessions i no perd la resta', () => {
  const application = createGroupApplication({
    ownerUid: 'teacher-1',
    academicYearId: 'year-2026',
    planningUnitId: 'up-1',
    classId: 'class-1',
  }, options())
  const result = buildActivitySessionDistribution({
    activities: [{ id: 'long', title: 'Projecte', type: 'activity', plannedMinutes: 80 }],
    application,
    candidates: [{ date: '2026-09-21', startsAt: '2026-09-21T09:30:00', durationMinutes: 60, timetableSlotId: 'slot-1' }],
    options: options(),
  })

  assert.equal(result.sessions[0].items[0].plannedMinutes, 55)
  assert.deepEqual(result.unscheduled, [{ activityId: 'long', remainingMinutes: 25, title: 'Projecte' }])
})

test('la incorporació progressiva omple primer una sessió ja creada amb minuts lliures', () => {
  const application = createGroupApplication({
    ownerUid: 'teacher-1', academicYearId: 'year-2026', planningUnitId: 'up-1', classId: 'class-1',
  }, options())
  const existingSession = createCalendarSession({
    ownerUid: 'teacher-1', applicationId: application.id, classId: 'class-1',
    startsAt: '2026-09-21T09:30:00', durationMinutes: 60, timetableSlotId: 'slot-1',
  }, options())
  const existingIndication = createSessionItem({
    ownerUid: 'teacher-1', applicationId: application.id, sessionId: existingSession.id,
    type: 'indication', title: 'Agafar la bata', order: 0, sourceActivityId: 'coat',
  }, options())
  const result = buildActivitySessionDistribution({
    activities: [{ id: 'practice', title: 'Pràctica', type: 'activity', plannedMinutes: 35 }],
    application,
    candidates: [{ date: '2026-09-28', startsAt: '2026-09-28T09:30:00', durationMinutes: 60, timetableSlotId: 'slot-1' }],
    existingSessionBundles: [{ session: existingSession, items: [existingIndication] }],
    options: options(),
  })

  assert.equal(result.sessions.length, 1)
  assert.equal(result.sessions[0].isExisting, true)
  assert.equal(result.sessions[0].session.id, existingSession.id)
  assert.equal(result.sessions[0].items[0].order, 1)
  assert.equal(result.sessions[0].items[0].plannedMinutes, 35)
})

test('l’horari vigent es resol per data sense reescriure les sessions passades', () => {
  const versions = [
    { id: 'old', effectiveFrom: '2026-09-01', effectiveTo: '2026-10-31' },
    { id: 'new', effectiveFrom: '2026-11-01', effectiveTo: null },
  ]

  assert.equal(selectEffectiveTimetable(versions, '2026-10-15').id, 'old')
  assert.equal(selectEffectiveTimetable(versions, '2026-11-15').id, 'new')
  assert.equal(selectEffectiveTimetable(versions, '2026-08-15'), null)
})

test('direcció llegeix la programació real però no notes privades, incidències ni diagnòstics', () => {
  const permissions = getPlanningPermissions({
    actorUid: 'direction-1',
    ownerUid: 'teacher-1',
    grantRole: 'directionReader',
  })

  assert.equal(permissions.canReadPlanningUnit, true)
  assert.equal(permissions.canReadGroupApplication, true)
  assert.equal(permissions.canReadPedagogicalReflections, true)
  assert.equal(permissions.canEditPlanningUnit, false)
  assert.equal(permissions.canReadPrivateNotes, false)
  assert.equal(permissions.canReadIndividualIncidents, false)
  assert.equal(permissions.canReadFullDiagnoses, false)
})

test('editar la UP no dona accés automàtic a l’Agenda ni a l’alumnat', () => {
  const editor = getPlanningPermissions({
    actorUid: 'teacher-2',
    ownerUid: 'teacher-1',
    grantRole: 'planningEditor',
    hasLinkedGroupAccess: false,
  })
  const collaborator = getPlanningPermissions({
    actorUid: 'teacher-3',
    ownerUid: 'teacher-1',
    grantRole: 'planningAgendaEditor',
    hasLinkedGroupAccess: true,
  })

  assert.equal(editor.canEditPlanningUnit, true)
  assert.equal(editor.canReadGroupApplication, false)
  assert.equal(editor.canManageGroupAgenda, false)
  assert.equal(collaborator.canManageGroupAgenda, true)
  assert.equal(collaborator.canReadPrivateNotes, false)
})

test('una invitació necessita un correu exacte vàlid', () => {
  assert.throws(
    () => createAccessGrant({
      ownerUid: 'teacher-1',
      planningUnitId: 'up-1',
      granteeEmail: 'direccio',
      role: 'directionReader',
    }),
    /correu vàlid/,
  )
})

test('totes les entitats principals declaren tipus i versió d’esquema', () => {
  const idFactory = sequenceIdFactory()
  const sharedOptions = options(idFactory)
  const entities = [
    createAcademicYear({ ownerUid: 'teacher-1', label: '2026-2027', startsOn: '2026-09-01', endsOn: '2027-06-30' }, sharedOptions),
    createTemporalUnit({ ownerUid: 'teacher-1', academicYearId: 'year-1', label: 'UT1', order: 1, startsOn: '2026-09-01', endsOn: '2026-12-20' }, sharedOptions),
    basePlanningUnit(idFactory),
    createPlanningPhase({ ownerUid: 'teacher-1', planningUnitId: 'up-1', kind: 'preparation', title: 'Preparació', order: 1 }, sharedOptions),
    baseActivity(idFactory),
    createGroupApplication({ ownerUid: 'teacher-1', academicYearId: 'year-1', planningUnitId: 'up-1', classId: 'class-1' }, sharedOptions),
    createGroupActivityOverride({ ownerUid: 'teacher-1', applicationId: 'application-1', activityId: 'activity-1', changes: { order: 2 } }, sharedOptions),
    createTimetableVersion({ ownerUid: 'teacher-1', academicYearId: 'year-1', label: 'Horari inicial', effectiveFrom: '2026-09-01' }, sharedOptions),
    createTimetableSlot({ ownerUid: 'teacher-1', timetableVersionId: 'timetable-1', classId: 'class-1', weekday: 2, startsAt: '09:30', durationMinutes: 60, subject: 'Música' }, sharedOptions),
    createCalendarEvent({ ownerUid: 'teacher-1', academicYearId: 'year-1', type: 'holiday', title: 'Festa nacional', startsOn: '2026-09-08' }, sharedOptions),
    createCalendarSession({ ownerUid: 'teacher-1', applicationId: 'application-1', classId: 'class-1', startsAt: '2026-09-22T09:30:00+02:00', durationMinutes: 60 }, sharedOptions),
    createSessionItem({ ownerUid: 'teacher-1', applicationId: 'application-1', sessionId: 'session-1', type: 'indication', title: 'Preparar la bata', order: 1 }, sharedOptions),
    createActivityResult({ ownerUid: 'teacher-1', applicationId: 'application-1', sessionId: 'session-1', sessionItemId: 'item-1', status: 'continued', actualMinutes: 50 }, sharedOptions),
    createAccessGrant({ ownerUid: 'teacher-1', planningUnitId: 'up-1', granteeEmail: 'DIRECCIO@EXAMPLE.TEST', role: 'directionReader' }, sharedOptions),
    createPlanningPrivateNote({ ownerUid: 'teacher-1', planningUnitId: 'up-1', sessionId: 'session-1', text: 'Recordatori només per al docent.' }, sharedOptions),
  ]

  assert.deepEqual(
    entities.map((entity) => entity.entityType),
    Object.values(PLANNING_ENTITY_TYPES),
  )
  assert.ok(entities.every((entity) => entity.schemaVersion === PLANNING_SCHEMA_VERSION))
  assert.ok(entities.every((entity) => entity.id.startsWith('plan-')))
  assert.equal(entities.at(-2).granteeEmail, 'direccio@example.test')
  assert.equal('privateNote' in entities.at(-3), false)
  assert.equal(entities.at(-1).entityType, 'planningPrivateNote')
})
