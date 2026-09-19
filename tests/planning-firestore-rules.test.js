import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { after, before, beforeEach, describe, test } from 'node:test'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  deleteDoc,
  doc,
  FieldPath,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import {
  copyPlanningUnitStructureToAcademicYear,
  createAccessGrant,
  createAcademicYear,
  createActivityResult,
  createCalendarSession,
  createGroupApplication,
  createPlanningActivity,
  createPlanningPhase,
  createPlanningPrivateNote,
  createPlanningUnit,
  createSessionItem,
  createTemporalUnit,
} from '../src/domain/planning/index.js'
import { applyPlanningCloudOperationToDatabase } from '../src/data/cloud/planningCloudSync.js'
import { getPlanningEntityLocation } from '../src/data/planningEntityLocation.js'

const PROJECT_ID = 'avaluapro-planning-rules-test'
const NOW = '2026-09-18T12:00:00.000Z'
const OWNER = { uid: 'planning-owner', email: 'owner@educand.ad' }
const DIRECTION = { uid: 'planning-direction', email: 'direction@educand.ad' }
const EDITOR = { uid: 'planning-editor', email: 'editor@educand.ad' }
const AGENDA_EDITOR = { uid: 'planning-agenda', email: 'agenda@educand.ad' }
const THIRD = { uid: 'planning-third', email: 'third@educand.ad' }
const UP_ID = 'plan-up-rules'
const CLASS_ONE = 'class-1'
const CLASS_TWO = 'class-2'
const APP_ONE = 'plan-application-one'
const APP_TWO = 'plan-application-two'
const SESSION_ONE = 'plan-session-one'

let testEnv

function authDb(user) {
  return testEnv.authenticatedContext(user.uid, { email: user.email }).firestore()
}

function planningUnitData(overrides = {}) {
  return {
    ...createPlanningUnit({
      id: UP_ID,
      ownerUid: OWNER.uid,
      academicYearId: 'plan-year-2026',
      temporalUnitId: 'plan-ut-1',
      code: 'UP1',
      level: '1r ESO',
      title: 'Paisatge sonor',
    }, { now: NOW }),
    accessByEmail: {
      [DIRECTION.email]: { classIds: [], role: 'directionReader', status: 'active' },
      [EDITOR.email]: { classIds: [], role: 'planningEditor', status: 'active' },
      [AGENDA_EDITOR.email]: { classIds: [CLASS_ONE], role: 'planningAgendaEditor', status: 'active' },
    },
    authorizedEmails: [DIRECTION.email, EDITOR.email, AGENDA_EDITOR.email],
    ownerEmailLower: OWNER.email,
    ...overrides,
  }
}

function accessGrantData(user, role, classIds = [], overrides = {}) {
  return {
    ...createAccessGrant({
      id: `plan-grant-${user.uid}`,
      ownerUid: OWNER.uid,
      planningUnitId: UP_ID,
      granteeEmail: user.email,
      granteeUid: user.uid,
      role,
      classIds,
    }, { now: NOW }),
    ...overrides,
  }
}

function phaseData(overrides = {}) {
  return {
    ...createPlanningPhase({
      id: 'plan-phase-one',
      ownerUid: OWNER.uid,
      planningUnitId: UP_ID,
      kind: 'preparation',
      title: 'Preparació',
      order: 1,
    }, { now: NOW }),
    ...overrides,
  }
}

function activityData(overrides = {}) {
  return {
    ...createPlanningActivity({
      id: 'plan-activity-one',
      ownerUid: OWNER.uid,
      planningUnitId: UP_ID,
      phaseId: 'plan-phase-one',
      title: 'Escolta guiada',
      order: 1,
      plannedMinutes: 40,
    }, { now: NOW }),
    ...overrides,
  }
}

function applicationData(id, classId, overrides = {}) {
  return {
    ...createGroupApplication({
      id,
      ownerUid: OWNER.uid,
      academicYearId: 'plan-year-2026',
      planningUnitId: UP_ID,
      planningUnitVersion: 1,
      classId,
      status: 'active',
    }, { now: NOW }),
    ...overrides,
  }
}

function sessionData(overrides = {}) {
  return {
    ...createCalendarSession({
      id: SESSION_ONE,
      ownerUid: OWNER.uid,
      applicationId: APP_ONE,
      classId: CLASS_ONE,
      startsAt: '2026-09-22T09:30:00+02:00',
      durationMinutes: 60,
    }, { now: NOW }),
    ...overrides,
  }
}

function sessionItemData(overrides = {}) {
  return {
    ...createSessionItem({
      id: 'plan-session-item-one',
      ownerUid: OWNER.uid,
      applicationId: APP_ONE,
      sessionId: SESSION_ONE,
      sourceActivityId: 'plan-activity-one',
      type: 'activity',
      title: 'Escolta guiada',
      order: 1,
      plannedMinutes: 40,
    }, { now: NOW }),
    ...overrides,
  }
}

function resultData(overrides = {}) {
  return {
    ...createActivityResult({
      id: 'plan-result-one',
      ownerUid: OWNER.uid,
      applicationId: APP_ONE,
      sessionId: SESSION_ONE,
      sessionItemId: 'plan-session-item-one',
      sourceActivityId: 'plan-activity-one',
      status: 'completed',
      actualMinutes: 45,
      pedagogicalReflection: 'Ha calgut un exemple addicional.',
      missingMaterials: ['Auriculars'],
      usefulAdaptationIds: ['plan-measure-one'],
      improvementRecommendation: 'modify',
    }, { now: NOW }),
    ...overrides,
  }
}

function privateNoteData(overrides = {}) {
  return {
    ...createPlanningPrivateNote({
      id: 'plan-private-note-one',
      ownerUid: OWNER.uid,
      planningUnitId: UP_ID,
      applicationId: APP_ONE,
      sessionId: SESSION_ONE,
      text: 'Nota que no es comparteix amb direcció.',
    }, { now: NOW }),
    ...overrides,
  }
}

function upRef(db, upId = UP_ID) {
  return doc(db, 'planningUnits', upId)
}

function appRef(db, applicationId = APP_ONE) {
  return doc(db, 'planningUnits', UP_ID, 'applications', applicationId)
}

function sessionRef(db, sessionId = SESSION_ONE) {
  return doc(db, 'planningUnits', UP_ID, 'applications', APP_ONE, 'sessions', sessionId)
}

function queuedOperation(entity, context = {}, baseUpdatedAt = '') {
  const location = getPlanningEntityLocation(entity, context)
  return {
    baseUpdatedAt,
    entityType: entity.entityType,
    operation: 'upsert',
    path: location.path,
    uid: entity.ownerUid,
    value: entity,
  }
}

function queuedDelete(entity, context = {}, baseUpdatedAt = '') {
  const location = getPlanningEntityLocation(entity, context)
  return {
    baseUpdatedAt,
    entityType: entity.entityType,
    operation: 'delete',
    path: location.path,
    uid: entity.ownerUid,
  }
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8'),
    },
  })
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(upRef(db), planningUnitData())
    await Promise.all([
      setDoc(doc(upRef(db), 'accessGrants', DIRECTION.email), accessGrantData(DIRECTION, 'directionReader')),
      setDoc(doc(upRef(db), 'accessGrants', EDITOR.email), accessGrantData(EDITOR, 'planningEditor')),
      setDoc(
        doc(upRef(db), 'accessGrants', AGENDA_EDITOR.email),
        accessGrantData(AGENDA_EDITOR, 'planningAgendaEditor', [CLASS_ONE]),
      ),
      setDoc(doc(upRef(db), 'phases', 'plan-phase-one'), phaseData()),
      setDoc(doc(upRef(db), 'activities', 'plan-activity-one'), activityData()),
      setDoc(appRef(db, APP_ONE), applicationData(APP_ONE, CLASS_ONE)),
      setDoc(appRef(db, APP_TWO), applicationData(APP_TWO, CLASS_TWO)),
      setDoc(sessionRef(db), sessionData()),
      setDoc(doc(sessionRef(db), 'items', 'plan-session-item-one'), sessionItemData()),
      setDoc(doc(sessionRef(db), 'results', 'plan-result-one'), resultData()),
      setDoc(doc(db, 'planningPrivateNotes', 'plan-private-note-one'), privateNoteData()),
    ])
  })
})

after(async () => {
  await testEnv.cleanup()
})

describe('Planificació compartida', () => {
  test('el propietari pot crear una UP vàlida però no pot atribuir-la a un altre compte', async () => {
    const db = authDb(OWNER)
    await assertSucceeds(setDoc(
      upRef(db, 'plan-up-new'),
      planningUnitData({ id: 'plan-up-new', accessByEmail: {}, authorizedEmails: [], title: 'UP nova' }),
    ))
    await assertFails(setDoc(
      upRef(db, 'plan-up-forged'),
      planningUnitData({ id: 'plan-up-forged', ownerUid: THIRD.uid }),
    ))
  })

  test('un correu no inclòs a la concessió de la UP no hi pot accedir', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        upRef(context.firestore(), 'plan-up-stale'),
        planningUnitData({ id: 'plan-up-stale', accessByEmail: {}, authorizedEmails: [] }),
      )
    })

    await assertFails(getDoc(upRef(authDb(DIRECTION), 'plan-up-stale')))
  })

  test('direcció pot consultar la UP i la seva aplicació real sense editar', async () => {
    const db = authDb(DIRECTION)
    await assertSucceeds(getDoc(upRef(db)))
    await assertSucceeds(getDoc(doc(upRef(db), 'phases', 'plan-phase-one')))
    await assertSucceeds(getDoc(appRef(db)))
    await assertSucceeds(getDoc(sessionRef(db)))
    await assertSucceeds(getDoc(doc(sessionRef(db), 'results', 'plan-result-one')))
    await assertFails(updateDoc(upRef(db), { title: 'Canvi no autoritzat', updatedAt: NOW }))
    await assertFails(updateDoc(sessionRef(db), { status: 'held', updatedAt: NOW }))
  })

  test('les consultes de llistat han d’estar limitades a les UP autoritzades', async () => {
    const db = authDb(DIRECTION)
    const sharedQuery = query(
      collection(db, 'planningUnits'),
      where('authorizedEmails', 'array-contains', DIRECTION.email),
      orderBy('updatedAt', 'desc'),
      limit(20),
    )
    const snapshot = await assertSucceeds(getDocs(sharedQuery))
    assert.equal(snapshot.size, 1)
    await assertFails(getDocs(collection(db, 'planningUnits')))

    const ownedSnapshot = await assertSucceeds(getDocs(query(
      collection(authDb(OWNER), 'planningUnits'),
      where('ownerUid', '==', OWNER.uid),
      orderBy('updatedAt', 'desc'),
      limit(20),
    )))
    assert.equal(ownedSnapshot.size, 1)
  })

  test('l’editor modifica la UP, fases i activitats sense obtenir accés implícit al grup', async () => {
    const db = authDb(EDITOR)
    await assertSucceeds(updateDoc(upRef(db), {
      curriculum: {
        competencies: [{ id: 'plan-curriculum-1', label: 'Competència científica', sourceId: null }],
        expectedLearnings: [],
        assessmentCriteria: [],
        indicators: [],
      },
      title: 'Títol revisat',
      updatedAt: NOW,
    }))
    await assertSucceeds(updateDoc(
      doc(upRef(db), 'phases', 'plan-phase-one'),
      { title: 'Preparació revisada', updatedAt: NOW },
    ))
    await assertSucceeds(updateDoc(
      doc(upRef(db), 'activities', 'plan-activity-one'),
      { plannedMinutes: 45, updatedAt: NOW },
    ))
    await assertFails(updateDoc(upRef(db), { authorizedEmails: [EDITOR.email], updatedAt: NOW }))
    await assertFails(getDoc(appRef(db)))
  })

  test('el col·laborador d’Agenda només gestiona els grups concedits', async () => {
    const db = authDb(AGENDA_EDITOR)
    await assertSucceeds(getDoc(appRef(db, APP_ONE)))
    await assertFails(getDoc(appRef(db, APP_TWO)))
    await assertSucceeds(updateDoc(sessionRef(db), { status: 'held', updatedAt: NOW }))
    await assertSucceeds(setDoc(
      doc(sessionRef(db), 'items', 'plan-session-item-two'),
      sessionItemData({ id: 'plan-session-item-two', title: 'Tancament', order: 2 }),
    ))
    await assertSucceeds(setDoc(
      doc(sessionRef(db), 'results', 'plan-result-two'),
      resultData({ id: 'plan-result-two', sessionItemId: 'plan-session-item-two' }),
    ))
    await assertFails(updateDoc(appRef(db, APP_TWO), { status: 'completed', updatedAt: NOW }))
  })

  test('només el propietari gestiona accessos i cada convidat només llegeix el seu', async () => {
    const ownerDb = authDb(OWNER)
    const thirdGrant = accessGrantData(THIRD, 'planningEditor')
    const batch = writeBatch(ownerDb)
    batch.set(doc(upRef(ownerDb), 'accessGrants', THIRD.email), thirdGrant)
    batch.update(
      upRef(ownerDb),
      new FieldPath('accessByEmail', THIRD.email),
      {
        classIds: [],
        role: 'planningEditor',
        status: 'active',
      },
      'authorizedEmails',
      [DIRECTION.email, EDITOR.email, AGENDA_EDITOR.email, THIRD.email],
      'updatedAt',
      NOW,
    )
    await assertSucceeds(batch.commit())
    await assertSucceeds(getDoc(doc(upRef(authDb(THIRD)), 'accessGrants', THIRD.email)))
    await assertFails(getDoc(doc(upRef(authDb(THIRD)), 'accessGrants', DIRECTION.email)))
    await assertFails(getDocs(collection(upRef(authDb(THIRD)), 'accessGrants')))
    await assertFails(updateDoc(
      doc(upRef(authDb(DIRECTION)), 'accessGrants', DIRECTION.email),
      { role: 'planningAgendaEditor', updatedAt: NOW },
    ))
  })

  test('revocar la concessió exigeix retirar també el correu i talla l’accés', async () => {
    const ownerDb = authDb(OWNER)
    await assertFails(updateDoc(
      doc(upRef(ownerDb), 'accessGrants', DIRECTION.email),
      { status: 'revoked', updatedAt: NOW },
    ))
    const batch = writeBatch(ownerDb)
    batch.update(doc(upRef(ownerDb), 'accessGrants', DIRECTION.email), { status: 'revoked', updatedAt: NOW })
    batch.update(upRef(ownerDb), {
      accessByEmail: {
        [EDITOR.email]: { classIds: [], role: 'planningEditor', status: 'active' },
        [AGENDA_EDITOR.email]: { classIds: [CLASS_ONE], role: 'planningAgendaEditor', status: 'active' },
      },
      authorizedEmails: [EDITOR.email, AGENDA_EDITOR.email],
      updatedAt: NOW,
    })
    await assertSucceeds(batch.commit())
    await assertFails(getDoc(upRef(authDb(DIRECTION))))
  })

  test('un tercer no pot llegir ni escriure cap part de la programació', async () => {
    const db = authDb(THIRD)
    await assertFails(getDoc(upRef(db)))
    await assertFails(getDoc(doc(upRef(db), 'activities', 'plan-activity-one')))
    await assertFails(getDoc(appRef(db)))
    await assertFails(setDoc(doc(upRef(db), 'phases', 'forged'), phaseData({ id: 'forged' })))
  })

  test('els camps inesperats i els canvis d’identitat es rebutgen', async () => {
    const ownerDb = authDb(OWNER)
    await assertFails(setDoc(
      doc(upRef(ownerDb), 'activities', 'invalid-extra'),
      activityData({ id: 'invalid-extra', privateNote: 'No hi pot ser' }),
    ))
    await assertFails(updateDoc(
      doc(upRef(ownerDb), 'activities', 'plan-activity-one'),
      { id: 'another-id', updatedAt: NOW },
    ))
  })

  test('només s’accepten els tres tipus d’element previstos a la cronologia', async () => {
    const db = authDb(OWNER)
    await assertSucceeds(setDoc(
      doc(upRef(db), 'activities', 'plan-indication-one'),
      activityData({
        id: 'plan-indication-one',
        plannedMinutes: null,
        title: 'Agafar la bata',
        type: 'indication',
      }),
    ))
    await assertFails(setDoc(
      doc(upRef(db), 'activities', 'plan-invalid-kind'),
      activityData({ id: 'plan-invalid-kind', type: 'unknown' }),
    ))
  })

  test('les mesures compartibles admeten alumnat però no camps privats al document de l’activitat', async () => {
    const db = authDb(OWNER)
    const measure = {
      classId: CLASS_ONE,
      className: '1r A',
      id: 'plan-measure-one',
      label: 'Dividir la tasca en passos curts.',
      studentIds: ['student-one'],
      studentNames: ['ALBA SERRA, Joana'],
    }
    await assertSucceeds(setDoc(
      doc(upRef(db), 'activities', 'plan-activity-diversity'),
      activityData({ id: 'plan-activity-diversity', diversityMeasureIds: [measure.id], diversityMeasures: [measure] }),
    ))
    await assertFails(setDoc(
      doc(upRef(db), 'activities', 'plan-activity-private-profile'),
      activityData({ id: 'plan-activity-private-profile', diagnoses: ['tdah'] }),
    ))

    const directionSnapshot = await assertSucceeds(getDoc(
      doc(upRef(authDb(DIRECTION)), 'activities', 'plan-activity-diversity'),
    ))
    assert.equal(directionSnapshot.data().diversityMeasures[0].label, measure.label)
    assert.equal('diagnoses' in directionSnapshot.data(), false)
  })
})

describe('Notes privades de planificació', () => {
  test('només el propietari pot crear, consultar, llistar i eliminar una nota privada', async () => {
    const ownerDb = authDb(OWNER)
    const noteRef = doc(ownerDb, 'planningPrivateNotes', 'plan-private-note-two')
    await assertSucceeds(setDoc(noteRef, privateNoteData({ id: 'plan-private-note-two' })))
    await assertSucceeds(getDoc(noteRef))
    const snapshot = await assertSucceeds(getDocs(query(
      collection(ownerDb, 'planningPrivateNotes'),
      where('ownerUid', '==', OWNER.uid),
      where('planningUnitId', '==', UP_ID),
      orderBy('updatedAt', 'desc'),
    )))
    assert.equal(snapshot.size, 2)
    await assertSucceeds(deleteDoc(noteRef))

    for (const user of [DIRECTION, EDITOR, AGENDA_EDITOR, THIRD]) {
      await assertFails(getDoc(doc(authDb(user), 'planningPrivateNotes', 'plan-private-note-one')))
    }
  })

  test('una nota privada no es pot disfressar amb un altre propietari ni excedir el límit', async () => {
    const db = authDb(OWNER)
    await assertFails(setDoc(
      doc(db, 'planningPrivateNotes', 'forged-owner'),
      privateNoteData({ id: 'forged-owner', ownerUid: THIRD.uid }),
    ))
    await assertFails(setDoc(
      doc(db, 'planningPrivateNotes', 'too-long'),
      privateNoteData({ id: 'too-long', text: 'a'.repeat(5001) }),
    ))
  })

  test('direcció pot llegir la reflexió pedagògica però no hi ha notes privades al resultat', async () => {
    const snapshot = await assertSucceeds(getDoc(
      doc(sessionRef(authDb(DIRECTION)), 'results', 'plan-result-one'),
    ))
    assert.equal(snapshot.data().pedagogicalReflection, 'Ha calgut un exemple addicional.')
    assert.deepEqual(snapshot.data().missingMaterials, ['Auriculars'])
    assert.equal(snapshot.data().improvementRecommendation, 'modify')
    assert.equal('privateNote' in snapshot.data(), false)
  })
})

describe('Configuració privada del calendari', () => {
  test('curs, UT i horaris dins users només són accessibles pel propietari', async () => {
    const ownerDb = authDb(OWNER)
    const year = createAcademicYear({
      id: 'plan-year-private',
      ownerUid: OWNER.uid,
      label: '2026-2027',
      startsOn: '2026-09-01',
      endsOn: '2027-06-30',
    }, { now: NOW })
    const yearRef = doc(ownerDb, 'users', OWNER.uid, 'planningAcademicYears', year.id)
    await assertSucceeds(setDoc(yearRef, year))
    await assertSucceeds(getDoc(yearRef))
    await assertSucceeds(getDocs(collection(ownerDb, 'users', OWNER.uid, 'planningAcademicYears')))

    const thirdDb = authDb(THIRD)
    await assertFails(getDoc(doc(thirdDb, 'users', OWNER.uid, 'planningAcademicYears', year.id)))
    await assertFails(setDoc(
      doc(thirdDb, 'users', OWNER.uid, 'planningAcademicYears', 'forged'),
      { ...year, id: 'forged' },
    ))
  })
})

describe('Recorregut local-first de la UP', () => {
  test('crea curs i UT, recarrega una UP buida i l’arxiva sense acceptar una edició antiga', async () => {
    const db = authDb(OWNER)
    const year = createAcademicYear({
      endsOn: '2027-06-30',
      id: 'plan-year-flow',
      label: '2026-2027',
      ownerUid: OWNER.uid,
      startsOn: '2026-09-01',
    }, { now: NOW })
    const temporalUnit = createTemporalUnit({
      academicYearId: year.id,
      endsOn: '2026-12-04',
      id: 'plan-ut-flow',
      label: 'UT1',
      order: 0,
      ownerUid: OWNER.uid,
      startsOn: '2026-09-01',
    }, { now: NOW })
    const unit = {
      ...createPlanningUnit({
        academicYearId: year.id,
        code: 'UP-PROVA',
        id: 'plan-up-flow',
        level: '1r ESO',
        ownerUid: OWNER.uid,
        temporalUnitId: temporalUnit.id,
        title: 'UP buida de prova',
      }, { now: NOW }),
      accessByEmail: {},
      authorizedEmails: [],
      ownerEmailLower: OWNER.email,
    }
    const phases = ['preparation', 'resolution', 'closing'].map((kind, order) => createPlanningPhase({
      id: `plan-phase-flow-${order}`,
      kind,
      order,
      ownerUid: OWNER.uid,
      planningUnitId: unit.id,
      title: ['Preparació', 'Resolució', 'Tancament'][order],
    }, { now: NOW }))

    for (const entity of [year, temporalUnit, unit]) {
      const result = await applyPlanningCloudOperationToDatabase(db, queuedOperation(entity))
      assert.equal(result.applied, true)
    }
    for (const phase of phases) {
      const result = await applyPlanningCloudOperationToDatabase(db, queuedOperation(phase))
      assert.equal(result.applied, true)
    }

    const reloaded = await getDoc(doc(db, 'planningUnits', unit.id))
    const reloadedPhases = await getDocs(collection(db, 'planningUnits', unit.id, 'phases'))
    assert.equal(reloaded.data().title, 'UP buida de prova')
    assert.equal(reloadedPhases.size, 3)
    assert.equal((await getDocs(collection(db, 'planningUnits', unit.id, 'activities'))).size, 0)

    const archivedAt = '2026-09-18T13:00:00.000Z'
    const archived = { ...unit, status: 'archived', updatedAt: archivedAt }
    const archiveResult = await applyPlanningCloudOperationToDatabase(
      db,
      queuedOperation(archived, {}, NOW),
    )
    assert.equal(archiveResult.applied, true)
    assert.equal((await getDoc(doc(db, 'planningUnits', unit.id))).data().status, 'archived')

    const staleResult = await applyPlanningCloudOperationToDatabase(
      db,
      queuedOperation({ ...unit, title: 'Edició antiga', updatedAt: '2026-09-18T12:30:00.000Z' }, {}, NOW),
    )
    assert.equal(staleResult.conflict, true)
    assert.equal(staleResult.remoteUpdatedAt, archivedAt)
    assert.equal((await getDoc(doc(db, 'planningUnits', unit.id))).data().title, 'UP buida de prova')
  })

  test('crea, reordena i elimina elements de la seqüència amb els materials intactes', async () => {
    const db = authDb(OWNER)
    const first = createPlanningActivity({
      id: 'plan-activity-flow-first',
      ownerUid: OWNER.uid,
      planningUnitId: UP_ID,
      phaseId: 'plan-phase-one',
      type: 'activity',
      title: 'Escolta guiada',
      order: 0,
      plannedMinutes: 20,
      grouping: 'Parelles',
      teacherMaterials: [{ id: 'material-1', kind: 'link', label: 'Àudio', url: 'https://example.test/audio' }],
    }, { now: NOW })
    const indication = createPlanningActivity({
      id: 'plan-activity-flow-indication',
      ownerUid: OWNER.uid,
      planningUnitId: UP_ID,
      phaseId: 'plan-phase-one',
      type: 'indication',
      title: 'Agafar la bata',
      order: 1,
      plannedMinutes: null,
    }, { now: NOW })

    assert.equal((await applyPlanningCloudOperationToDatabase(db, queuedOperation(first))).applied, true)
    assert.equal((await applyPlanningCloudOperationToDatabase(db, queuedOperation(indication))).applied, true)

    const reorderedAt = '2026-09-18T14:00:00.000Z'
    const reordered = { ...first, order: 1, updatedAt: reorderedAt }
    assert.equal((await applyPlanningCloudOperationToDatabase(db, queuedOperation(reordered, {}, NOW))).applied, true)
    assert.equal((await getDoc(doc(db, 'planningUnits', UP_ID, 'activities', first.id))).data().teacherMaterials[0].label, 'Àudio')

    assert.equal((await applyPlanningCloudOperationToDatabase(db, queuedDelete(indication, {}, NOW))).applied, true)
    assert.equal((await getDoc(doc(db, 'planningUnits', UP_ID, 'activities', indication.id))).exists(), false)
  })

  test('duplica tota la UP en documents nous i manté intacta la versió anterior', async () => {
    const db = authDb(OWNER)
    const sourceUnit = planningUnitData({
      improvementProposals: [{
        id: 'plan-improvement-one',
        activityId: 'plan-activity-one',
        kind: 'time',
        title: 'Ajustar el temps',
        detail: 'Ha durat més del previst.',
        status: 'pending',
        suggestedChanges: { plannedMinutes: 50 },
        sourceGroupNames: ['1r A'],
        plannedMinutes: 40,
        actualMinutesAverage: 50,
        sampleCount: 1,
      }],
    })
    const copied = copyPlanningUnitStructureToAcademicYear({
      planningUnit: sourceUnit,
      phases: [phaseData()],
      activities: [activityData({
        indicatorIds: ['indicator-1'],
        teacherMaterials: [{ id: 'material-one', kind: 'link', label: 'Àudio', url: 'https://example.test/audio' }],
      })],
    }, {
      academicYearId: 'plan-year-2027',
      temporalUnitId: 'plan-ut-2027',
      ownerEmailLower: OWNER.email,
    }, { now: '2026-09-19T06:00:00.000Z' })

    for (const entity of [copied.planningUnit, ...copied.phases, ...copied.activities]) {
      assert.equal((await applyPlanningCloudOperationToDatabase(db, queuedOperation(entity))).applied, true)
    }

    const oldUnit = await getDoc(upRef(db))
    const oldActivity = await getDoc(doc(upRef(db), 'activities', 'plan-activity-one'))
    const newUnit = await getDoc(doc(db, 'planningUnits', copied.planningUnit.id))
    const newActivities = await getDocs(collection(db, 'planningUnits', copied.planningUnit.id, 'activities'))
    assert.equal(oldUnit.data().academicYearId, 'plan-year-2026')
    assert.equal(oldActivity.data().plannedMinutes, 40)
    assert.equal(newUnit.data().academicYearId, 'plan-year-2027')
    assert.deepEqual(newUnit.data().authorizedEmails, [])
    assert.equal(newUnit.data().improvementProposals[0].activityId, copied.activities[0].id)
    assert.equal(newActivities.docs[0].data().copiedFrom.activityId, 'plan-activity-one')
    assert.equal(newActivities.docs[0].data().teacherMaterials[0].label, 'Àudio')
  })
})
