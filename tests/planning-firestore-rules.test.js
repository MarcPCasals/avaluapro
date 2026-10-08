import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { after, before, beforeEach, describe, test } from 'node:test'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  arrayUnion,
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
  createCalendarEvent,
  createCalendarSession,
  createGroupApplication,
  createGroupActivityOverride,
  createPlanningActivity,
  createPlanningPhase,
  createPlanningPrivateNote,
  createPlanningUnit,
  createSessionItem,
  createTemporalUnit,
  createTimetableSlot,
  createTimetableVersion,
} from '../src/domain/planning/index.js'
import { applyPlanningCloudOperationToDatabase } from '../src/data/cloud/planningCloudSync.js'
import { getPlanningEntityLocation } from '../src/data/planningEntityLocation.js'
import {
  buildSchedulingPersistenceEntries,
  requireConfirmedSchedulingSync,
} from '../src/features/agenda/agendaSchedulingPersistence.js'

const PROJECT_ID = 'avaluapro-planning-rules-test'
const NOW = '2026-09-18T12:00:00.000Z'
const OWNER = { uid: 'planning-owner', email: 'owner@educand.ad' }
const DIRECTION = { uid: 'planning-direction', email: 'direction@educand.ad' }
const EDITOR = { uid: 'planning-editor', email: 'editor@educand.ad' }
const AGENDA_EDITOR = { uid: 'planning-agenda', email: 'agenda@educand.ad' }
const TUTORING_COLLABORATOR = { uid: 'planning-cotutor', email: 'cotutor@educand.ad' }
const THIRD = { uid: 'planning-third', email: 'third@educand.ad' }
const UP_ID = 'plan-up-rules'
const CLASS_ONE = 'class-1'
const CLASS_TWO = 'class-2'
const APP_ONE = 'plan-application-one'
const APP_TWO = 'plan-application-two'
const APP_TUTORING = 'plan-application-tutoring'
const SESSION_ONE = 'plan-session-one'

let testEnv

function authDb(user) {
  return testEnv.authenticatedContext(user.uid, { email: user.email, email_verified: true, firebase: { sign_in_provider: 'google.com' } }).firestore()
}

function planningUnitData(overrides = {}) {
  return {
    ...createPlanningUnit({
      id: UP_ID,
      ownerUid: OWNER.uid,
      academicYearId: 'plan-year-2026',
      temporalUnitId: 'plan-ut-1',
      tutoringSpaceId: 'shared-tutoring-space-1c',
      code: 'UP1',
      level: '1r ESO',
      title: 'Paisatge sonor',
    }, { now: NOW }),
    accessByEmail: {
      [DIRECTION.email]: { classIds: [CLASS_ONE], role: 'directionReader', status: 'active' },
      [EDITOR.email]: { classIds: [], role: 'planningEditor', status: 'active' },
      [AGENDA_EDITOR.email]: { classIds: [CLASS_ONE], role: 'planningAgendaEditor', status: 'active' },
      [TUTORING_COLLABORATOR.email]: { classIds: [], role: 'tutoringCollaborator', status: 'active' },
    },
    authorizedEmails: [DIRECTION.email, EDITOR.email, AGENDA_EDITOR.email, TUTORING_COLLABORATOR.email],
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
      classIds: role === 'directionReader' ? [CLASS_ONE] : classIds,
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
      calendarEventId: null,
      startsAt: '2026-09-22T09:30:00+02:00',
      durationMinutes: 60,
    }, { now: NOW }),
    ...overrides,
  }
}

function activityOverrideData(overrides = {}) {
  return {
    ...createGroupActivityOverride({
      id: 'plan-override-one',
      ownerUid: OWNER.uid,
      applicationId: APP_ONE,
      activityId: 'plan-activity-one',
      changeScope: 'groupOnly',
      changes: { order: 2, title: 'Escolta adaptada a 1rD' },
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

function queuedOperation(entity, context = {}, baseUpdatedAt = '', actorUid = entity.ownerUid) {
  const location = getPlanningEntityLocation(entity, context)
  return {
    baseUpdatedAt,
    entityType: entity.entityType,
    operation: 'upsert',
    path: location.path,
    uid: actorUid,
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
      setDoc(
        doc(upRef(db), 'accessGrants', TUTORING_COLLABORATOR.email),
        accessGrantData(TUTORING_COLLABORATOR, 'tutoringCollaborator'),
      ),
      setDoc(doc(upRef(db), 'phases', 'plan-phase-one'), phaseData()),
      setDoc(doc(upRef(db), 'activities', 'plan-activity-one'), activityData()),
      setDoc(appRef(db, APP_ONE), applicationData(APP_ONE, CLASS_ONE)),
      setDoc(appRef(db, APP_TWO), applicationData(APP_TWO, CLASS_TWO)),
      setDoc(appRef(db, APP_TUTORING), applicationData(APP_TUTORING, CLASS_TWO, {
        classLabel: 'Tutoria',
        managerUid: TUTORING_COLLABORATOR.uid,
      })),
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
    await assertFails(getDocs(collection(upRef(db), 'applications')))
    await assertSucceeds(getDocs(query(collection(upRef(db), 'applications'), where('classId', '==', CLASS_ONE))))
    await assertSucceeds(getDocs(collection(appRef(db), 'activityOverrides')))
    await assertSucceeds(getDocs(collection(appRef(db), 'sessions')))
    await assertSucceeds(getDocs(collection(sessionRef(db), 'items')))
    await assertSucceeds(getDocs(collection(sessionRef(db), 'results')))
    await assertSucceeds(getDoc(sessionRef(db)))
    await assertSucceeds(getDoc(doc(sessionRef(db), 'results', 'plan-result-one')))
    await assertFails(updateDoc(upRef(db), { title: 'Canvi no autoritzat', updatedAt: NOW }))
    await assertFails(updateDoc(sessionRef(db), { status: 'held', updatedAt: NOW }))
  })

  test('direcció només pot llegir la classe autoritzada, també davant peticions directes', async () => {
    const db = authDb(DIRECTION)
    await assertFails(getDoc(appRef(db, APP_TWO)))
    await assertFails(getDocs(collection(appRef(db, APP_TWO), 'activityOverrides')))
    await assertFails(getDocs(collection(appRef(db, APP_TWO), 'sessions')))
    await assertFails(getDocs(collection(doc(appRef(db, APP_TWO), 'sessions', 'other-session'), 'items')))
    await assertFails(getDocs(collection(doc(appRef(db, APP_TWO), 'sessions', 'other-session'), 'results')))
    await assertFails(getDocs(query(collection(upRef(db), 'applications'), where('classId', '==', CLASS_TWO))))
    await assertFails(getDoc(appRef(authDb(THIRD))))
    await assertFails(getDoc(upRef(testEnv.unauthenticatedContext().firestore())))
  })

  test('el correu exacte també ha de ser verificat, de Google i d’educand', async () => {
    for (const claims of [
      { email: DIRECTION.email, email_verified: false, firebase: { sign_in_provider: 'google.com' } },
      { email: DIRECTION.email, email_verified: true, firebase: { sign_in_provider: 'password' } },
      { email: DIRECTION.email, email_verified: true, firebase: { sign_in_provider: 'custom' } },
      { email: DIRECTION.email },
    ]) {
      const db = testEnv.authenticatedContext(DIRECTION.uid, claims).firestore()
      await assertFails(getDoc(upRef(db)))
      await assertFails(getDoc(appRef(db)))
      await assertFails(getDoc(doc(upRef(db), 'accessGrants', DIRECTION.email)))
      await assertFails(getDoc(sessionRef(db)))
      await assertFails(getDocs(collection(upRef(db), 'activities')))
    }
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await updateDoc(upRef(context.firestore()), new FieldPath('accessByEmail', 'external@gmail.com'), { classIds: [CLASS_ONE], role: 'directionReader', status: 'active' }, 'authorizedEmails', [DIRECTION.email, 'external@gmail.com'])
    })
    const outside = authDb({ uid: 'outside', email: 'external@gmail.com' })
    await assertFails(getDoc(upRef(outside)))
    await assertFails(getDoc(appRef(outside)))
  })

  test('les concessions antigues sense classe o amb més d’una classe queden bloquejades', async () => {
    for (const classIds of [[], [CLASS_ONE, CLASS_TWO]]) {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await updateDoc(upRef(context.firestore()), new FieldPath('accessByEmail', DIRECTION.email), { classIds, role: 'directionReader', status: 'active' })
      })
      await assertFails(getDoc(upRef(authDb(DIRECTION))))
      await assertFails(getDoc(appRef(authDb(DIRECTION))))
    }
  })

  test('el propietari pot revocar una concessió antiga que ja no compleix el nou format', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await updateDoc(doc(upRef(db), 'accessGrants', DIRECTION.email), { classIds: [] })
      await updateDoc(upRef(db), new FieldPath('accessByEmail', DIRECTION.email), { classIds: [], role: 'directionReader', status: 'active' })
    })
    const db = authDb(OWNER)
    const batch = writeBatch(db)
    batch.update(doc(upRef(db), 'accessGrants', DIRECTION.email), { status: 'revoked' })
    batch.update(upRef(db), 'accessByEmail', {
      [EDITOR.email]: { classIds: [], role: 'planningEditor', status: 'active' },
      [AGENDA_EDITOR.email]: { classIds: [CLASS_ONE], role: 'planningAgendaEditor', status: 'active' },
      [TUTORING_COLLABORATOR.email]: { classIds: [], role: 'tutoringCollaborator', status: 'active' },
    }, 'authorizedEmails', [EDITOR.email, AGENDA_EDITOR.email, TUTORING_COLLABORATOR.email])
    await assertSucceeds(batch.commit())
    await assertFails(getDoc(upRef(authDb(DIRECTION))))
  })

  test('crear una concessió exigeix una sola classe i un correu educand', async () => {
    for (const [email, classIds] of [[DIRECTION.email, []], [DIRECTION.email, [CLASS_ONE, CLASS_TWO]], ['external@gmail.com', [CLASS_ONE]]]) {
      const db = authDb(OWNER)
      const batch = writeBatch(db)
      batch.set(doc(upRef(db), 'accessGrants', email), { ...accessGrantData(DIRECTION, 'directionReader'), granteeEmail: email, classIds })
      batch.update(upRef(db), new FieldPath('accessByEmail', email), { classIds, role: 'directionReader', status: 'active' }, 'authorizedEmails', arrayUnion(email))
      await assertFails(batch.commit())
    }
  })

  test('canviar la classe de la concessió retira l’accés anterior; revocar bloqueja tots els descendents', async () => {
    const db = authDb(OWNER)
    const batch = writeBatch(db)
    batch.set(doc(upRef(db), 'accessGrants', DIRECTION.email), { ...accessGrantData(DIRECTION, 'directionReader'), classIds: [CLASS_TWO] })
    batch.update(upRef(db), new FieldPath('accessByEmail', DIRECTION.email), { classIds: [CLASS_TWO], role: 'directionReader', status: 'active' })
    await assertSucceeds(batch.commit())
    await assertFails(getDoc(appRef(authDb(DIRECTION))))
    await assertSucceeds(getDoc(appRef(authDb(DIRECTION), APP_TWO)))
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await updateDoc(upRef(context.firestore()), new FieldPath('accessByEmail', DIRECTION.email), { classIds: [CLASS_TWO], role: 'directionReader', status: 'revoked' })
    })
    await assertFails(getDoc(upRef(authDb(DIRECTION))))
    await assertFails(getDoc(appRef(authDb(DIRECTION), APP_TWO)))
    await assertFails(getDocs(collection(appRef(authDb(DIRECTION), APP_TWO), 'sessions')))
  })

  test('la caducitat bloqueja la UP i tota l’aplicació; el propietari conserva l’accés', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const expiry = Date.now() - 1000
      const grant = { classIds: [CLASS_ONE], role: 'directionReader', status: 'active', expiresAtEpochMs: expiry }
      await updateDoc(upRef(context.firestore()), new FieldPath('accessByEmail', DIRECTION.email), grant)
    })
    const db = authDb(DIRECTION)
    await assertFails(getDoc(upRef(db)))
    await assertFails(getDoc(doc(upRef(db), 'activities', 'plan-activity-one')))
    await assertFails(getDocs(collection(upRef(db), 'applications')))
    await assertFails(getDocs(collection(appRef(db), 'activityOverrides')))
    await assertFails(getDoc(sessionRef(db)))
    await assertFails(getDocs(collection(sessionRef(db), 'results')))
    await assertSucceeds(getDoc(upRef(authDb(OWNER))))
  })

  test('el desament de caducitat és atòmic i no accepta dates passades o diferents', async () => {
    const db = authDb(OWNER)
    const expiry = Date.now() + 3600000
    const grantReference = doc(upRef(db), 'accessGrants', DIRECTION.email)
    const save = async (grantExpiry, mapExpiry) => {
      const batch = writeBatch(db)
      batch.set(grantReference, { ...accessGrantData(DIRECTION, 'directionReader'), expiresAtEpochMs: grantExpiry })
      batch.update(upRef(db), new FieldPath('accessByEmail', DIRECTION.email), { classIds: [CLASS_ONE], role: 'directionReader', status: 'active', expiresAtEpochMs: mapExpiry })
      return batch.commit()
    }
    await assertFails(save(expiry, expiry + 1))
    await assertFails(save(Date.now() - 1000, Date.now() - 1000))
    await assertSucceeds(save(expiry, expiry))
    await assertSucceeds(getDoc(upRef(authDb(DIRECTION))))
    await assertSucceeds(getDoc(appRef(authDb(DIRECTION))))
    const batch = writeBatch(db)
    batch.set(grantReference, accessGrantData(DIRECTION, 'directionReader'))
    batch.update(upRef(db), new FieldPath('accessByEmail', DIRECTION.email), { classIds: [CLASS_ONE], role: 'directionReader', status: 'active' })
    await assertSucceeds(batch.commit())
    await assertSucceeds(getDoc(upRef(authDb(DIRECTION))))
  })

  test('les consultes de llistat han d’estar limitades a les UP autoritzades', async () => {
    const db = authDb(EDITOR)
    const sharedQuery = query(
      collection(db, 'planningUnits'),
      where(new FieldPath('accessByEmail', EDITOR.email, 'role'), 'in', ['planningEditor', 'planningAgendaEditor', 'tutoringCollaborator']),
      limit(20),
    )
    await assertFails(getDocs(query(collection(authDb(DIRECTION), 'planningUnits'), where('authorizedEmails', 'array-contains', DIRECTION.email))))
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
      resourceSections: {
        specific: { attitudesAndValues: [], factsAndConcepts: ['Densitat'], procedures: ['Mesurar'] },
        transversal: { attitudesAndValues: ['Constància'], factsAndConcepts: [], procedures: [] },
      },
      title: 'Títol revisat',
      transversalMaterials: [{
        id: 'transversal-material-1',
        kind: 'link',
        label: 'Aula virtual',
        preparationKind: 'reference',
        reminderDaysBefore: 0,
        teacherUrl: '',
        url: 'https://example.test/aula',
      }],
      updatedAt: NOW,
    }))
    await assertSucceeds(updateDoc(
      doc(upRef(db), 'phases', 'plan-phase-one'),
      { title: 'Preparació revisada', updatedAt: NOW },
    ))
    await assertSucceeds(updateDoc(
      doc(upRef(db), 'activities', 'plan-activity-one'),
      { pedagogicalType: 'acquisition', plannedMinutes: 45, updatedAt: NOW },
    ))
    await assertFails(updateDoc(upRef(db), { authorizedEmails: [EDITOR.email], updatedAt: NOW }))
    await assertFails(getDoc(appRef(db)))
  })

  test('la cua local-first conserva el propietari quan un coeditor modifica una activitat', async () => {
    const db = authDb(EDITOR)
    const editedAt = '2026-09-18T12:05:00.000Z'
    const edited = activityData({ description: 'Descripció revisada en coedició.', updatedAt: editedAt })
    const result = await applyPlanningCloudOperationToDatabase(
      db,
      queuedOperation(edited, {}, NOW, EDITOR.uid),
    )
    assert.equal(result.applied, true)
    const snapshot = await getDoc(doc(upRef(db), 'activities', edited.id))
    assert.equal(snapshot.data().ownerUid, OWNER.uid)
    assert.equal(snapshot.data().description, 'Descripció revisada en coedició.')
  })

  test('la cua recupera elements amb context visual sense relaxar regles ni perdre conflictes', async () => {
    const db = authDb(OWNER)
    const editedAt = '2026-10-06T12:00:00.000Z'
    for (const sourceActivity of [null, { title: 'Activitat fictícia hidratada' }]) {
      const remote = sessionItemData()
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(sessionRef(context.firestore()), 'items', remote.id), remote)
      })
      const edited = { ...remote, title: 'Lectura fictícia revisada', updatedAt: editedAt, sourceActivity }
      const reference = doc(sessionRef(db), 'items', remote.id)
      await assertFails(setDoc(reference, edited))
      const context = { planningUnitId: UP_ID }
      const operation = queuedOperation(edited, context, NOW)
      const result = await assertSucceeds(applyPlanningCloudOperationToDatabase(db, operation))
      assert.equal(result.applied, true)
      const expected = { ...remote, title: edited.title, updatedAt: editedAt }
      assert.deepEqual((await getDoc(reference)).data(), expected)
      assert.equal((await applyPlanningCloudOperationToDatabase(db, operation)).applied, true)
      const conflict = await applyPlanningCloudOperationToDatabase(db, queuedOperation({ ...edited, title: 'Canvi local diferent' }, context, NOW))
      assert.equal(conflict.conflict, true)
      await assertFails(applyPlanningCloudOperationToDatabase(authDb(THIRD), queuedOperation(edited, context, NOW, THIRD.uid)))
    }
  })

  test('la cua adapta una activitat antiga rebutjada per les regles i pot reintentar-la sense duplicar-la', async () => {
    const db = authDb(OWNER)
    const legacy = activityData()
    delete legacy.curriculumSelections
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(upRef(context.firestore()), 'activities', legacy.id), legacy)
    })
    const edited = { ...legacy, description: 'Canvi local pendent.', updatedAt: '2026-10-04T12:00:00.000Z' }
    const reference = doc(upRef(db), 'activities', legacy.id)
    await assertFails(setDoc(reference, edited))
    const operation = queuedOperation(edited, {}, NOW)
    const result = await assertSucceeds(applyPlanningCloudOperationToDatabase(db, operation))
    assert.equal(result.applied, true)
    assert.deepEqual((await getDoc(reference)).data(), { ...edited, curriculumSelections: [] })
    const retry = await assertSucceeds(applyPlanningCloudOperationToDatabase(db, operation))
    assert.equal(retry.applied, true)
    assert.equal((await getDoc(reference)).data().createdAt, NOW)
  })

  test('una edició antiga compartida preserva les seleccions remotes i un buidatge explícit les pot retirar', async () => {
    const db = authDb(EDITOR)
    const selections = [{ temporalUnitId: 'fictional-ut', competencyId: 'fictional-competency' }]
    const remote = activityData({ curriculumSelections: selections })
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(upRef(context.firestore()), 'activities', remote.id), remote)
    })
    const editedAt = '2026-10-04T12:00:00.000Z'
    const edited = activityData({ description: 'Canvi del coeditor.', updatedAt: editedAt })
    delete edited.curriculumSelections
    const reference = doc(upRef(db), 'activities', edited.id)
    await assertSucceeds(applyPlanningCloudOperationToDatabase(db, queuedOperation(edited, {}, NOW, EDITOR.uid)))
    assert.deepEqual((await getDoc(reference)).data(), { ...edited, curriculumSelections: selections })
    const cleared = { ...edited, curriculumSelections: [], updatedAt: '2026-10-04T12:01:00.000Z' }
    await assertSucceeds(applyPlanningCloudOperationToDatabase(db, queuedOperation(cleared, {}, editedAt, EDITOR.uid)))
    assert.deepEqual((await getDoc(reference)).data().curriculumSelections, [])
  })

  test('la compatibilitat antiga no dona permisos d’edició a un col·laborador només d’Agenda', async () => {
    const edited = activityData({ description: 'Canvi no autoritzat.', updatedAt: '2026-10-04T12:00:00.000Z' })
    delete edited.curriculumSelections
    await assertFails(applyPlanningCloudOperationToDatabase(
      authDb(AGENDA_EDITOR), queuedOperation(edited, {}, NOW, AGENDA_EDITOR.uid),
    ))
    assert.equal((await getDoc(doc(upRef(authDb(OWNER)), 'activities', edited.id))).data().updatedAt, NOW)
  })

  test('la compatibilitat antiga conserva els conflictes reals i no corregeix valors explícits invàlids', async () => {
    const db = authDb(OWNER)
    const edited = activityData({ description: 'Versió local.', updatedAt: '2026-10-04T12:00:00.000Z' })
    delete edited.curriculumSelections
    const result = await applyPlanningCloudOperationToDatabase(db, queuedOperation(edited, {}, '2026-09-01T12:00:00.000Z'))
    assert.equal(result.conflict, true)
    assert.equal(result.remoteUpdatedAt, NOW)
    await assertFails(applyPlanningCloudOperationToDatabase(
      db, queuedOperation({ ...edited, curriculumSelections: 'invalid' }, {}, NOW),
    ))
    assert.deepEqual((await getDoc(doc(upRef(db), 'activities', edited.id))).data(), activityData())
  })

  test('el col·laborador d’Agenda només gestiona els grups concedits', async () => {
    const db = authDb(AGENDA_EDITOR)
    await assertSucceeds(getDoc(appRef(db, APP_ONE)))
    await assertFails(getDoc(appRef(db, APP_TWO)))
    await assertSucceeds(updateDoc(sessionRef(db), {
      attendanceConfirmedAt: NOW,
      classroomClosedAt: NOW,
      classroomOpenedAt: NOW,
      status: 'held',
      updatedAt: NOW,
    }))
    await assertSucceeds(updateDoc(sessionRef(db), { babeliumEnabled: true, updatedAt: NOW }))
    await assertSucceeds(updateDoc(sessionRef(db), { babeliumEnabled: false, babeliumSuppressed: true, updatedAt: NOW }))
    await assertFails(updateDoc(sessionRef(db), { babeliumSuppressed: 'yes', updatedAt: NOW }))
    await assertFails(updateDoc(sessionRef(db), { babeliumEnabled: 'yes', updatedAt: NOW }))
    await assertFails(updateDoc(sessionRef(db), { timerStartedAt: NOW, updatedAt: NOW }))
    await assertSucceeds(setDoc(
      doc(sessionRef(db), 'items', 'plan-session-item-two'),
      sessionItemData({ id: 'plan-session-item-two', title: 'Tancament', order: 2 }),
    ))
    await assertSucceeds(setDoc(
      doc(sessionRef(db), 'results', 'plan-result-two'),
      resultData({ id: 'plan-result-two', sessionItemId: 'plan-session-item-two' }),
    ))
    await assertFails(updateDoc(appRef(db, APP_TWO), { status: 'completed', updatedAt: NOW }))
    await assertFails(updateDoc(doc(upRef(db), 'activities', 'plan-activity-one'), {
      plannedMinutes: 55,
      updatedAt: NOW,
    }))
  })

  test('la cotutora coedita la UP però només veu i gestiona la seva pròpia Agenda', async () => {
    const db = authDb(TUTORING_COLLABORATOR)
    await assertSucceeds(getDoc(upRef(db)))
    await assertSucceeds(updateDoc(
      doc(upRef(db), 'activities', 'plan-activity-one'),
      { description: 'Activitat acordada entre les dues tutores.', updatedAt: NOW },
    ))
    await assertFails(getDoc(appRef(db, APP_ONE)))
    await assertSucceeds(getDoc(appRef(db, APP_TUTORING)))

    const ownApplications = await assertSucceeds(getDocs(query(
      collection(upRef(db), 'applications'),
      where('managerUid', '==', TUTORING_COLLABORATOR.uid),
      limit(20),
    )))
    assert.equal(ownApplications.size, 1)
    assert.equal(ownApplications.docs[0].id, APP_TUTORING)

    const ownerDb = authDb(OWNER)
    await assertFails(getDoc(appRef(ownerDb, APP_TUTORING)))
    const ownerApplications = await assertSucceeds(getDocs(query(
      collection(upRef(ownerDb), 'applications'),
      where('managerUid', '==', OWNER.uid),
      limit(20),
    )))
    assert.equal(ownerApplications.size, 2)

    const ownSession = sessionData({
      applicationId: APP_TUTORING,
      classId: CLASS_TWO,
      id: 'plan-session-tutoring',
    })
    await assertSucceeds(setDoc(
      doc(appRef(db, APP_TUTORING), 'sessions', ownSession.id),
      ownSession,
    ))
    await assertFails(setDoc(
      appRef(db, 'plan-application-forged-manager'),
      applicationData('plan-application-forged-manager', CLASS_TWO, { managerUid: THIRD.uid }),
    ))
    await assertFails(updateDoc(appRef(db, APP_TUTORING), {
      managerUid: THIRD.uid,
      updatedAt: NOW,
    }))
  })

  test('les excepcions d’activitat queden dins del grup autoritzat', async () => {
    const ownerDb = authDb(OWNER)
    const overrideRef = doc(
      ownerDb,
      'planningUnits', UP_ID,
      'applications', APP_ONE,
      'activityOverrides', 'plan-override-one',
    )
    await assertSucceeds(setDoc(overrideRef, activityOverrideData()))
    const agendaDb = authDb(AGENDA_EDITOR)
    const agendaOverrides = collection(
      agendaDb,
      'planningUnits', UP_ID,
      'applications', APP_ONE,
      'activityOverrides',
    )
    const snapshot = await assertSucceeds(getDocs(agendaOverrides))
    assert.equal(snapshot.size, 1)
    await assertFails(getDocs(collection(
      authDb(THIRD),
      'planningUnits', UP_ID,
      'applications', APP_ONE,
      'activityOverrides',
    )))
  })

  test('la cua local-first permet al col·laborador desar la sessió del grup concedit', async () => {
    const db = authDb(AGENDA_EDITOR)
    const updated = sessionData({
      attendanceConfirmedAt: NOW,
      classroomClosedAt: NOW,
      classroomOpenedAt: NOW,
      status: 'held',
      updatedAt: '2026-09-18T12:06:00.000Z',
    })
    const result = await applyPlanningCloudOperationToDatabase(
      db,
      queuedOperation(updated, { planningUnitId: UP_ID }, NOW, AGENDA_EDITOR.uid),
    )
    assert.equal(result.applied, true)
    assert.equal((await getDoc(sessionRef(db))).data().status, 'held')
  })

  test('la cua local-first permet crear una sessió futura nova i els seus elements', async () => {
    const db = authDb(AGENDA_EDITOR)
    const futureSession = sessionData({
      id: 'plan-session-future-new',
      startsAt: '2026-10-20T09:30:00+02:00',
    })
    const sessionResult = await applyPlanningCloudOperationToDatabase(
      db,
      queuedOperation(futureSession, { planningUnitId: UP_ID }, '', AGENDA_EDITOR.uid),
    )
    assert.equal(sessionResult.applied, true)

    const futureItem = sessionItemData({
      id: 'plan-item-future-new',
      sessionId: futureSession.id,
      sourceActivityId: 'plan-activity-one',
      title: 'Activitat futura',
    })
    const itemResult = await applyPlanningCloudOperationToDatabase(
      db,
      queuedOperation(
        futureItem,
        { applicationId: APP_ONE, planningUnitId: UP_ID, sessionId: futureSession.id },
        '',
        AGENDA_EDITOR.uid,
      ),
    )
    assert.equal(itemResult.applied, true)
    assert.equal((await getDoc(doc(sessionRef(db, futureSession.id), 'items', futureItem.id))).data().title, 'Activitat futura')
  })

  test('una proposta d’un col·laborador desa les sessions noves amb el propietari de la UP', async () => {
    const db = authDb(AGENDA_EDITOR)
    const localApplication = applicationData(APP_ONE, CLASS_ONE, { ownerUid: AGENDA_EDITOR.uid })
    const localSession = sessionData({
      id: 'plan-session-collaborator-new',
      ownerUid: AGENDA_EDITOR.uid,
      startsAt: '2026-10-22T11:00:00+02:00',
    })
    const localItem = sessionItemData({
      id: 'plan-item-collaborator-new',
      ownerUid: AGENDA_EDITOR.uid,
      sessionId: localSession.id,
      sourceActivityId: 'plan-activity-one',
    })
    const { entries } = buildSchedulingPersistenceEntries({
      sessions: [{ items: [localItem], session: localSession }],
      setup: {
        application: localApplication,
        planningUnit: planningUnitData(),
      },
    }, NOW)
    const sessionEntry = entries.find((entry) => entry.entity.entityType === 'calendarSession')
    const itemEntry = entries.find((entry) => entry.entity.entityType === 'sessionItem')

    assert.equal(sessionEntry.entity.ownerUid, OWNER.uid)
    assert.equal(itemEntry.entity.ownerUid, OWNER.uid)
    await applyPlanningCloudOperationToDatabase(
      db,
      queuedOperation(sessionEntry.entity, sessionEntry.context, '', AGENDA_EDITOR.uid),
    )
    await applyPlanningCloudOperationToDatabase(
      db,
      queuedOperation(itemEntry.entity, itemEntry.context, '', AGENDA_EDITOR.uid),
    )
    assert.equal((await getDoc(sessionRef(db, localSession.id))).data().ownerUid, OWNER.uid)
  })

  test('un reintent antic també repara el propietari abans de tornar-lo a enviar', async () => {
    const db = authDb(AGENDA_EDITOR)
    const staleSession = sessionData({
      id: 'plan-session-stale-retry',
      ownerUid: AGENDA_EDITOR.uid,
      startsAt: '2026-10-27T09:30:00+01:00',
    })

    const result = await applyPlanningCloudOperationToDatabase(
      db,
      queuedOperation(staleSession, { planningUnitId: UP_ID }, '', AGENDA_EDITOR.uid),
    )

    assert.equal(result.applied, true)
    assert.equal((await getDoc(sessionRef(db, staleSession.id))).data().ownerUid, OWNER.uid)
  })

  test('la calendarització no es dona per acabada mentre Firebase manté canvis pendents', () => {
    assert.doesNotThrow(() => requireConfirmedSchedulingSync({ state: 'saved' }))
    assert.throws(
      () => requireConfirmedSchedulingSync({ state: 'error' }),
      /Firebase encara no les ha confirmat totes/,
    )
  })

  test('la cua conserva la identitat remota d’un element tècnic reconstruït localment', async () => {
    const db = authDb(AGENDA_EDITOR)
    const recreatedAt = '2026-09-18T12:08:00.000Z'
    const recreated = sessionItemData({
      createdAt: recreatedAt,
      title: 'Babèlium · Lectura autònoma',
      updatedAt: recreatedAt,
    })
    const result = await applyPlanningCloudOperationToDatabase(
      db,
      queuedOperation(recreated, { planningUnitId: UP_ID }, NOW, AGENDA_EDITOR.uid),
    )

    assert.equal(result.applied, true)
    const saved = (await getDoc(doc(sessionRef(db), 'items', recreated.id))).data()
    assert.equal(saved.createdAt, NOW)
    assert.equal(saved.updatedAt, recreatedAt)
    assert.equal(saved.title, 'Babèlium · Lectura autònoma')
  })

  test('la matèria de la calendarització es desa sense ampliar els permisos', async () => {
    const ownerDb = authDb(OWNER)
    await assertSucceeds(updateDoc(appRef(ownerDb, APP_ONE), { subject: 'Ciències' }))
    const saved = await assertSucceeds(getDoc(appRef(ownerDb, APP_ONE)))
    assert.equal(saved.data().subject, 'Ciències')
    await assertFails(updateDoc(appRef(ownerDb, APP_ONE), { subject: 42 }))
    await assertFails(updateDoc(appRef(authDb(DIRECTION), APP_ONE), { subject: 'Tutoria' }))
    await assertFails(updateDoc(appRef(authDb(AGENDA_EDITOR), APP_TWO), { subject: 'Tutoria' }))
  })

  test('l’aplicació de grup conserva un nom llegible sense ampliar els permisos', async () => {
    const ownerDb = authDb(OWNER)
    await assertSucceeds(setDoc(
      appRef(ownerDb, 'plan-application-labelled'),
      applicationData('plan-application-labelled', CLASS_ONE, { classLabel: '1r C' }),
    ))
    const directionSnapshot = await assertSucceeds(getDoc(
      appRef(authDb(DIRECTION), 'plan-application-labelled'),
    ))
    assert.equal(directionSnapshot.data().classLabel, '1r C')
    await assertFails(getDoc(appRef(authDb(AGENDA_EDITOR), APP_TWO)))
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
      [DIRECTION.email, EDITOR.email, AGENDA_EDITOR.email, TUTORING_COLLABORATOR.email, THIRD.email],
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
        [TUTORING_COLLABORATOR.email]: { classIds: [], role: 'tutoringCollaborator', status: 'active' },
      },
      authorizedEmails: [EDITOR.email, AGENDA_EDITOR.email, TUTORING_COLLABORATOR.email],
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

  test('els recursos d’activitat es desen amb compatibilitat antiga i sense ampliar permisos', async () => {
    const resourceSelections = [{ scope: 'specific', category: 'procedures', text: 'Recurs completament fictici' }]
    const ownerDb = authDb(OWNER)
    const reference = doc(upRef(ownerDb), 'activities', 'plan-activity-one')
    await assertSucceeds(updateDoc(reference, { resourceSelections, updatedAt: NOW }))
    assert.deepEqual((await getDoc(reference)).data().resourceSelections, resourceSelections)
    const legacy = activityData()
    delete legacy.resourceSelections
    await assertSucceeds(setDoc(reference, legacy))
    await assertFails(updateDoc(reference, { resourceSelections: 'text' }))
    await assertFails(updateDoc(reference, { resourceSelections: Array.from({ length: 501 }, () => resourceSelections[0]) }))
    await assertFails(updateDoc(doc(upRef(authDb(DIRECTION)), 'activities', 'plan-activity-one'), { resourceSelections }))
    await assertSucceeds(updateDoc(doc(upRef(authDb(EDITOR)), 'activities', 'plan-activity-one'), { resourceSelections, updatedAt: NOW }))
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
    await assertFails(updateDoc(
      doc(upRef(ownerDb), 'activities', 'plan-activity-one'),
      { pedagogicalType: 'diagnosis', updatedAt: NOW },
    ))
    await assertFails(updateDoc(upRef(ownerDb), {
      resourceSections: { specific: [], transversal: [] },
      updatedAt: NOW,
    }))
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
  test('el primer desament local-first crea la nota i el reintent i una recàrrega la recuperen', async () => {
    const db = authDb(OWNER)
    const note = privateNoteData({ id: `session_note_${OWNER.uid}_${SESSION_ONE}` })
    const reference = doc(db, 'planningPrivateNotes', note.id)
    assert.equal((await assertSucceeds(getDoc(reference))).exists(), false)
    const operation = queuedOperation(note)
    assert.equal((await assertSucceeds(applyPlanningCloudOperationToDatabase(db, operation))).applied, true)
    assert.equal((await assertSucceeds(applyPlanningCloudOperationToDatabase(db, operation))).applied, true)
    assert.deepEqual((await getDoc(doc(authDb(OWNER), 'planningPrivateNotes', note.id))).data(), note)
    for (const user of [DIRECTION, EDITOR, AGENDA_EDITOR, THIRD]) {
      await assertFails(getDoc(doc(authDb(user), 'planningPrivateNotes', note.id)))
    }
    await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), 'planningPrivateNotes', note.id)))
  })

  test('la nota local-first sense UP també es crea i una baixa no enviada s’acusa sense error', async () => {
    const db = authDb(OWNER)
    const note = privateNoteData({
      id: `session_note_${OWNER.uid}_timetable-fictional`, planningUnitId: null,
      applicationId: null, sessionId: 'timetable-fictional', recordInPlanning: false,
    })
    assert.equal((await assertSucceeds(applyPlanningCloudOperationToDatabase(db, queuedOperation(note)))).applied, true)
    assert.deepEqual((await getDoc(doc(db, 'planningPrivateNotes', note.id))).data(), note)
    const neverSent = privateNoteData({ id: 'fictional-never-sent' })
    assert.equal((await assertSucceeds(applyPlanningCloudOperationToDatabase(db, queuedDelete(neverSent)))).applied, true)
    assert.equal((await getDoc(doc(db, 'planningPrivateNotes', neverSent.id))).exists(), false)
  })

  test('les edicions simultànies de la primera nota creen un conflicte en lloc de sobreescriure-la', async () => {
    const db = authDb(OWNER)
    const note = privateNoteData({ id: `session_note_${OWNER.uid}_${SESSION_ONE}` })
    await assertSucceeds(applyPlanningCloudOperationToDatabase(db, queuedOperation(note)))
    const otherDevice = { ...note, text: 'Una altra versió fictícia.', updatedAt: '2026-10-04T18:00:00.000Z' }
    const conflict = await applyPlanningCloudOperationToDatabase(authDb(OWNER), queuedOperation(otherDevice))
    assert.equal(conflict.conflict, true)
    assert.deepEqual(conflict.remoteValue, note)
    assert.deepEqual((await getDoc(doc(db, 'planningPrivateNotes', note.id))).data(), note)
  })

  test('comprovar una nota absent no autoritza consultar llistes ni llegir o modificar notes d’altres', async () => {
    const thirdDb = authDb(THIRD)
    assert.equal((await assertSucceeds(getDoc(doc(thirdDb, 'planningPrivateNotes', 'fictional-absent')))).exists(), false)
    await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), 'planningPrivateNotes', 'fictional-absent')))
    await assertFails(getDocs(collection(thirdDb, 'planningPrivateNotes')))
    const reference = doc(thirdDb, 'planningPrivateNotes', 'plan-private-note-one')
    await assertFails(getDoc(reference))
    await assertFails(setDoc(reference, privateNoteData({ ownerUid: THIRD.uid })))
    await assertFails(updateDoc(reference, { text: 'No autoritzat.' }))
    await assertFails(deleteDoc(reference))
  })

  test('la nota de recordatori continua privada i el registre de sessió és visible a l’aplicació autoritzada', async () => {
    const db = authDb(OWNER)
    const privateNote = privateNoteData({ id: 'plan-timeline-note', recordInPlanning: true })
    await assertSucceeds(setDoc(doc(db, 'planningPrivateNotes', privateNote.id), privateNote))
    await assertSucceeds(updateDoc(sessionRef(db), { applicationNotes: [{ id: privateNote.id, text: 'Recordar les mostres', authorUid: OWNER.uid }] }))
    const registered = await assertSucceeds(getDoc(sessionRef(authDb(DIRECTION))))
    assert.equal(registered.data().applicationNotes[0].text, 'Recordar les mostres')
    await assertFails(getDoc(doc(authDb(DIRECTION), 'planningPrivateNotes', privateNote.id)))
    await assertFails(updateDoc(sessionRef(authDb(DIRECTION)), { applicationNotes: [] }))
    await assertFails(updateDoc(sessionRef(db), { applicationNotes: 'incorrecte' }))
    await assertFails(updateDoc(doc(db, 'planningPrivateNotes', privateNote.id), { recordInPlanning: 'incorrecte' }))
    await assertSucceeds(updateDoc(sessionRef(db), { applicationNotes: [] }))
    await assertSucceeds(getDoc(doc(db, 'planningPrivateNotes', privateNote.id)))
  })

  test('una nota de franja sense UP manté la protecció del compte propietari', async () => {
    const db = authDb(OWNER)
    const value = privateNoteData({ id: 'plan-timetable-note', planningUnitId: null, applicationId: null, sessionId: 'timetable_2026-10-07_slot', recordInPlanning: false })
    await assertSucceeds(setDoc(doc(db, 'planningPrivateNotes', value.id), value))
    await assertFails(getDoc(doc(authDb(AGENDA_EDITOR), 'planningPrivateNotes', value.id)))
  })

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

    const timetable = createTimetableVersion({
      id: 'plan-timetable-private',
      ownerUid: OWNER.uid,
      academicYearId: year.id,
      label: 'Horari inicial',
      effectiveFrom: '2026-09-01',
    }, { now: NOW })
    const slot = createTimetableSlot({
      id: 'plan-slot-private',
      ownerUid: OWNER.uid,
      timetableVersionId: timetable.id,
      classId: CLASS_ONE,
      weekday: 1,
      startsAt: '09:00',
      durationMinutes: 60,
      subject: 'Música',
      subgroupId: 'Grup A',
    }, { now: NOW })
    const calendarEvent = createCalendarEvent({
      id: 'plan-event-private',
      ownerUid: OWNER.uid,
      academicYearId: year.id,
      type: 'extraordinarySession',
      title: 'Substitució',
      startsOn: '2026-09-22',
      classIds: [CLASS_ONE],
      consumesPlannedSession: true,
    }, { now: NOW })
    const timetableRef = doc(ownerDb, 'users', OWNER.uid, 'planningTimetables', timetable.id)
    const slotRef = doc(ownerDb, 'users', OWNER.uid, 'planningTimetableSlots', slot.id)
    const eventRef = doc(ownerDb, 'users', OWNER.uid, 'planningCalendarEvents', calendarEvent.id)
    await assertSucceeds(setDoc(timetableRef, timetable))
    await assertSucceeds(setDoc(slotRef, slot))
    await assertSucceeds(setDoc(eventRef, calendarEvent))
    await assertSucceeds(getDoc(timetableRef))
    await assertSucceeds(getDoc(slotRef))
    await assertSucceeds(getDoc(eventRef))

    const thirdDb = authDb(THIRD)
    await assertFails(getDoc(doc(thirdDb, 'users', OWNER.uid, 'planningAcademicYears', year.id)))
    await assertFails(getDoc(doc(thirdDb, 'users', OWNER.uid, 'planningTimetables', timetable.id)))
    await assertFails(getDoc(doc(thirdDb, 'users', OWNER.uid, 'planningTimetableSlots', slot.id)))
    await assertFails(getDoc(doc(thirdDb, 'users', OWNER.uid, 'planningCalendarEvents', calendarEvent.id)))
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
      curriculumSelections: [{
        competencyKey: 'competency:modelitzacio',
        label: 'C1: Modelització',
        assessmentCriteria: [{ criterionKey: 'criterion:rigor', label: 'CA1: Rigor' }],
      }],
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
    const savedActivity = (await getDoc(doc(db, 'planningUnits', UP_ID, 'activities', first.id))).data()
    assert.equal(savedActivity.teacherMaterials[0].label, 'Àudio')
    assert.equal(savedActivity.curriculumSelections[0].assessmentCriteria[0].label, 'CA1: Rigor')

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


test('la fixació d’una activitat de sessió admet només un booleà', async () => {
  const db = authDb(OWNER)
  const ref = doc(sessionRef(db), 'items', 'plan-session-item-one')
  await assertSucceeds(setDoc(ref, sessionItemData({ fixedToSession: true })))
  await assertSucceeds(updateDoc(ref, { fixedToSession: false }))
  await assertFails(updateDoc(ref, { fixedToSession: 'true' }))
})
