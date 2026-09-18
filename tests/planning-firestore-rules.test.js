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
} from '../src/domain/planning/index.js'

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
    await assertSucceeds(updateDoc(upRef(db), { title: 'Títol revisat', updatedAt: NOW }))
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
