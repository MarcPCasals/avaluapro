import assert from 'node:assert/strict'
import test from 'node:test'
import {
  PLANNING_ENTITY_TYPES,
  PLANNING_SCHEMA_VERSION,
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
  getProgrammableMinutes,
  getSessionLoad,
  movePlanningActivityInSequence,
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
