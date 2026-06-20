import { readFile } from 'node:fs/promises'
import { after, before, beforeEach, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc, writeBatch } from 'firebase/firestore'

const PROJECT_ID = 'avaluapro-rules-test'
const OWNER = { uid: 'owner-uid', email: 'owner@educand.ad' }
const COTUTOR = { uid: 'cotutor-uid', email: 'cotutor@educand.ad' }
const THIRD = { uid: 'third-uid', email: 'third@educand.ad' }
const SPACE_ID = 'space-1'
const SURVEY_ID = 'survey-1'
const ACCESS_TOKEN = 'a'.repeat(48)

let testEnv

function authDb(user) {
  return testEnv.authenticatedContext(user.uid, { email: user.email }).firestore()
}

function tutoringSpaceData(overrides = {}) {
  return {
    className: 'Tutoria 1A',
    createdAt: '2026-06-19T08:00:00.000Z',
    id: SPACE_ID,
    lastSharedConflictAt: '',
    memberEmails: [OWNER.email, COTUTOR.email],
    memberUids: [OWNER.uid, COTUTOR.uid],
    members: [
      { emailLower: OWNER.email, role: 'owner', uid: OWNER.uid },
      { emailLower: COTUTOR.email, role: 'tutor', uid: COTUTOR.uid },
    ],
    ownerEmailLower: OWNER.email,
    ownerUid: OWNER.uid,
    sharedConflictSummary: { count: 0, examples: [] },
    sharedSummary: { studentCount: 2 },
    sourceClassId: 'class-1',
    status: 'active',
    updatedAt: '2026-06-19T08:00:00.000Z',
    ...overrides,
  }
}

function sociometricSurveyData(overrides = {}) {
  const expiresAtEpochMs = Date.now() + 24 * 60 * 60 * 1000
  return {
    avoidLimit: 3,
    classId: 'class-1',
    className: 'Tutoria 1A',
    createdAt: '2026-06-19T08:00:00.000Z',
    expiresAt: new Date(expiresAtEpochMs).toISOString(),
    expiresAtEpochMs,
    id: SURVEY_ID,
    importedRelationCount: 0,
    lastSyncedAt: '',
    memberUids: [OWNER.uid, COTUTOR.uid],
    ownerEmailLower: OWNER.email,
    ownerUid: OWNER.uid,
    positiveLimit: 4,
    responseCount: 0,
    status: 'active',
    studentOptionIds: ['student-1', 'student-2'],
    studentOptions: [
      { id: 'student-1', name: 'Alumna Un' },
      { id: 'student-2', name: 'Alumne Dos' },
    ],
    updatedAt: '2026-06-19T08:00:00.000Z',
    ...overrides,
  }
}

function sociometricAccessTokenData(overrides = {}) {
  const survey = sociometricSurveyData()
  return {
    avoidLimit: survey.avoidLimit,
    classId: survey.classId,
    className: survey.className,
    createdAt: survey.createdAt,
    expiresAt: survey.expiresAt,
    expiresAtEpochMs: survey.expiresAtEpochMs,
    positiveLimit: survey.positiveLimit,
    privacyNoticeVersion: '2026-06-20-v1',
    studentId: 'student-1',
    studentName: 'Alumna Un',
    studentOptions: survey.studentOptions,
    surveyId: SURVEY_ID,
    tokenId: ACCESS_TOKEN,
    ...overrides,
  }
}

function sociometricResponseData(overrides = {}) {
  return {
    accessToken: ACCESS_TOKEN,
    avoidStudentIds: [],
    classId: 'class-1',
    positiveStudentIds: ['student-2'],
    privacyNoticeAcknowledged: true,
    privacyNoticeVersion: '2026-06-20-v1',
    responseId: ACCESS_TOKEN,
    studentId: 'student-1',
    studentName: 'Alumna Un',
    submittedAt: '2026-06-19T08:10:00.000Z',
    surveyId: SURVEY_ID,
    ...overrides,
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
    await setDoc(doc(db, 'tutoringSpaces', SPACE_ID), tutoringSpaceData())
    await setDoc(doc(db, 'sociometricSurveys', SURVEY_ID), sociometricSurveyData())
    await setDoc(
      doc(db, 'sociometricSurveys', SURVEY_ID, 'accessTokens', ACCESS_TOKEN),
      sociometricAccessTokenData(),
    )
  })
})

after(async () => {
  await testEnv.cleanup()
})

describe('cotutoria compartida', () => {
  test('propietari i cotutor poden llegir l espai; un tercer no', async () => {
    await assertSucceeds(getDoc(doc(authDb(OWNER), 'tutoringSpaces', SPACE_ID)))
    await assertSucceeds(getDoc(doc(authDb(COTUTOR), 'tutoringSpaces', SPACE_ID)))
    await assertFails(getDoc(doc(authDb(THIRD), 'tutoringSpaces', SPACE_ID)))
  })

  test('un cotutor pot actualitzar el resum de sincronitzacio', async () => {
    await assertSucceeds(
      updateDoc(doc(authDb(COTUTOR), 'tutoringSpaces', SPACE_ID), {
        sharedSummary: { studentCount: 3 },
        updatedAt: '2026-06-19T08:15:00.000Z',
      }),
    )
  })

  test('un cotutor no pot afegir membres', async () => {
    await assertFails(
      updateDoc(doc(authDb(COTUTOR), 'tutoringSpaces', SPACE_ID), {
        memberEmails: [OWNER.email, COTUTOR.email, THIRD.email],
        memberUids: [OWNER.uid, COTUTOR.uid, THIRD.uid],
        members: [
          ...tutoringSpaceData().members,
          { emailLower: THIRD.email, role: 'tutor', uid: THIRD.uid },
        ],
        updatedAt: '2026-06-19T08:15:00.000Z',
      }),
    )
  })

  test('el propietari pot gestionar membres', async () => {
    await assertSucceeds(
      updateDoc(doc(authDb(OWNER), 'tutoringSpaces', SPACE_ID), {
        memberEmails: [OWNER.email],
        memberUids: [OWNER.uid],
        members: [{ emailLower: OWNER.email, role: 'owner', uid: OWNER.uid }],
        updatedAt: '2026-06-19T08:15:00.000Z',
      }),
    )
  })

  test('una invitacio acceptada afegeix nomes el destinatari', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(
        doc(db, 'tutoringSpaces', SPACE_ID),
        tutoringSpaceData({
          memberEmails: [OWNER.email],
          memberUids: [OWNER.uid],
          members: [{ emailLower: OWNER.email, role: 'owner', uid: OWNER.uid }],
        }),
      )
      await setDoc(doc(db, 'tutoringInvitationInbox', COTUTOR.email, 'items', SPACE_ID), {
        status: 'accepted',
      })
    })

    await assertSucceeds(
      updateDoc(doc(authDb(COTUTOR), 'tutoringSpaces', SPACE_ID), {
        memberEmails: [OWNER.email, COTUTOR.email],
        memberUids: [OWNER.uid, COTUTOR.uid],
        members: [
          { emailLower: OWNER.email, role: 'owner', uid: OWNER.uid },
          { emailLower: COTUTOR.email, role: 'tutor', uid: COTUTOR.uid },
        ],
        updatedAt: '2026-06-19T08:15:00.000Z',
      }),
    )
  })

  test('una invitacio acceptada no pot afegir una tercera persona', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(
        doc(db, 'tutoringSpaces', SPACE_ID),
        tutoringSpaceData({
          memberEmails: [OWNER.email],
          memberUids: [OWNER.uid],
          members: [{ emailLower: OWNER.email, role: 'owner', uid: OWNER.uid }],
        }),
      )
      await setDoc(doc(db, 'tutoringInvitationInbox', COTUTOR.email, 'items', SPACE_ID), {
        status: 'accepted',
      })
    })

    await assertFails(
      updateDoc(doc(authDb(COTUTOR), 'tutoringSpaces', SPACE_ID), {
        memberEmails: [OWNER.email, COTUTOR.email, THIRD.email],
        memberUids: [OWNER.uid, COTUTOR.uid, THIRD.uid],
        members: [
          { emailLower: OWNER.email, role: 'owner', uid: OWNER.uid },
          { emailLower: COTUTOR.email, role: 'tutor', uid: COTUTOR.uid },
          { emailLower: THIRD.email, role: 'tutor', uid: THIRD.uid },
        ],
        updatedAt: '2026-06-19T08:15:00.000Z',
      }),
    )
  })

  test('un cotutor pot abandonar l espai retirant-se nomes a si mateix', async () => {
    await assertSucceeds(
      updateDoc(doc(authDb(COTUTOR), 'tutoringSpaces', SPACE_ID), {
        memberEmails: [OWNER.email],
        memberUids: [OWNER.uid],
        members: [{ emailLower: OWNER.email, role: 'owner', uid: OWNER.uid }],
        updatedAt: '2026-06-20T08:15:00.000Z',
      }),
    )
    await assertFails(getDoc(doc(authDb(COTUTOR), 'tutoringSpaces', SPACE_ID)))
  })

  test('un cotutor no pot retirar un altre membre mantenint el seu acces', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'tutoringSpaces', SPACE_ID),
        tutoringSpaceData({
          memberEmails: [OWNER.email, COTUTOR.email, THIRD.email],
          memberUids: [OWNER.uid, COTUTOR.uid, THIRD.uid],
          members: [
            ...tutoringSpaceData().members,
            { emailLower: THIRD.email, role: 'tutor', uid: THIRD.uid },
          ],
        }),
      )
    })

    await assertFails(
      updateDoc(doc(authDb(COTUTOR), 'tutoringSpaces', SPACE_ID), {
        memberEmails: [OWNER.email, COTUTOR.email],
        memberUids: [OWNER.uid, COTUTOR.uid],
        members: tutoringSpaceData().members,
        updatedAt: '2026-06-20T08:15:00.000Z',
      }),
    )
  })

  test('el propietari pot eliminar les dues copies de la invitacio revocada', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const invitation = {
        recipientEmailLower: COTUTOR.email,
        senderUid: OWNER.uid,
        status: 'accepted',
      }
      await setDoc(
        doc(context.firestore(), 'tutoringInvitationInbox', COTUTOR.email, 'items', SPACE_ID),
        invitation,
      )
      await setDoc(
        doc(context.firestore(), 'tutoringInvitationOutbox', OWNER.uid, 'items', 'invite-1'),
        invitation,
      )
    })

    await assertSucceeds(
      deleteDoc(doc(authDb(OWNER), 'tutoringInvitationInbox', COTUTOR.email, 'items', SPACE_ID)),
    )
    await assertSucceeds(
      deleteDoc(doc(authDb(OWNER), 'tutoringInvitationOutbox', OWNER.uid, 'items', 'invite-1')),
    )
  })

  test('un cotutor pot eliminar la seva invitacio quan abandona', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'tutoringInvitationInbox', COTUTOR.email, 'items', SPACE_ID),
        {
          recipientEmailLower: COTUTOR.email,
          senderUid: OWNER.uid,
          status: 'accepted',
        },
      )
    })

    await assertSucceeds(
      deleteDoc(doc(authDb(COTUTOR), 'tutoringInvitationInbox', COTUTOR.email, 'items', SPACE_ID)),
    )
  })

  test('un membre pot treballar en una subcol leccio permesa', async () => {
    await assertSucceeds(
      setDoc(doc(authDb(COTUTOR), 'tutoringSpaces', SPACE_ID, 'tutorialRecords', 'record-1'), {
        id: 'record-1',
        note: 'Observacio pedagogica ficticia',
      }),
    )
  })

  test('un membre pot substituir una fila per un tombstone minim', async () => {
    await assertSucceeds(
      setDoc(doc(authDb(COTUTOR), 'tutoringSpaces', SPACE_ID, 'tutorialRecords', 'record-1'), {
        classId: 'class-1',
        id: 'record-1',
        sharedDeletedAt: '2026-06-20T09:00:00.000Z',
        sharedDeletedByEmail: COTUTOR.email,
        sharedDeletedByUid: COTUTOR.uid,
        sharedUpdatedAt: '2026-06-20T09:00:00.000Z',
        sharedUpdatedByEmail: COTUTOR.email,
        sharedUpdatedByUid: COTUTOR.uid,
      }),
    )
  })

  test('cap membre pot fer una eliminacio fisica directa', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'tutoringSpaces', SPACE_ID, 'tutorialRecords', 'record-1'),
        {
          classId: 'class-1',
          id: 'record-1',
          note: 'Registre fictici',
        },
      )
    })

    await assertFails(
      deleteDoc(doc(authDb(OWNER), 'tutoringSpaces', SPACE_ID, 'tutorialRecords', 'record-1')),
    )
    await assertFails(
      deleteDoc(doc(authDb(COTUTOR), 'tutoringSpaces', SPACE_ID, 'tutorialRecords', 'record-1')),
    )
  })

  test('un tercer no pot escriure tombstones en una cotutoria', async () => {
    await assertFails(
      setDoc(doc(authDb(THIRD), 'tutoringSpaces', SPACE_ID, 'tutorialRecords', 'record-1'), {
        classId: 'class-1',
        id: 'record-1',
        sharedDeletedAt: '2026-06-20T09:00:00.000Z',
        sharedDeletedByEmail: THIRD.email,
        sharedDeletedByUid: THIRD.uid,
        sharedUpdatedAt: '2026-06-20T09:00:00.000Z',
        sharedUpdatedByEmail: THIRD.email,
        sharedUpdatedByUid: THIRD.uid,
      }),
    )
  })

  test('un membre no pot crear una subcol leccio desconeguda', async () => {
    await assertFails(
      setDoc(doc(authDb(COTUTOR), 'tutoringSpaces', SPACE_ID, 'unexpectedData', 'row-1'), {
        value: 'no permes',
      }),
    )
  })
})

describe('questionari sociometric public', () => {
  test('el propietari pot crear atomicament el questionari i els tokens individuals', async () => {
    const db = authDb(OWNER)
    const surveyId = 'survey-new'
    const tokenId = 'b'.repeat(48)
    const survey = sociometricSurveyData({ id: surveyId })
    const batch = writeBatch(db)
    batch.set(doc(db, 'sociometricSurveys', surveyId), survey)
    batch.set(
      doc(db, 'sociometricSurveys', surveyId, 'accessTokens', tokenId),
      sociometricAccessTokenData({
        expiresAt: survey.expiresAt,
        expiresAtEpochMs: survey.expiresAtEpochMs,
        surveyId,
        tokenId,
      }),
    )
    await assertSucceeds(batch.commit())
  })

  test('el document general amb la llista d alumnes no es public', async () => {
    const publicDb = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(publicDb, 'sociometricSurveys', SURVEY_ID)))
  })

  test('un token individual valid es pot consultar pero no enumerar', async () => {
    const publicDb = testEnv.unauthenticatedContext().firestore()
    await assertSucceeds(
      getDoc(doc(publicDb, 'sociometricSurveys', SURVEY_ID, 'accessTokens', ACCESS_TOKEN)),
    )
    await assertFails(getDocs(collection(publicDb, 'sociometricSurveys', SURVEY_ID, 'accessTokens')))
  })

  test('una persona pot crear una resposta valida', async () => {
    const publicDb = testEnv.unauthenticatedContext().firestore()
    await assertSucceeds(
      setDoc(
        doc(publicDb, 'sociometricSurveys', SURVEY_ID, 'responses', ACCESS_TOKEN),
        sociometricResponseData(),
      ),
    )
  })

  test('el token no permet respondre en nom d un altre alumne', async () => {
    const publicDb = testEnv.unauthenticatedContext().firestore()
    await assertFails(
      setDoc(
        doc(publicDb, 'sociometricSurveys', SURVEY_ID, 'responses', ACCESS_TOKEN),
        sociometricResponseData({
          studentId: 'student-2',
          studentName: 'Alumne Dos',
        }),
      ),
    )
  })

  test('no es pot enviar sense acreditar la lectura de l avis informatiu', async () => {
    const publicDb = testEnv.unauthenticatedContext().firestore()
    await assertFails(
      setDoc(
        doc(publicDb, 'sociometricSurveys', SURVEY_ID, 'responses', ACCESS_TOKEN),
        sociometricResponseData({ privacyNoticeAcknowledged: false }),
      ),
    )
  })

  test('un questionari caducat no es pot consultar ni respondre', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const expiredAt = Date.now() - 1000
      await updateDoc(doc(context.firestore(), 'sociometricSurveys', SURVEY_ID), {
        expiresAt: new Date(expiredAt).toISOString(),
        expiresAtEpochMs: expiredAt,
      })
      await updateDoc(
        doc(context.firestore(), 'sociometricSurveys', SURVEY_ID, 'accessTokens', ACCESS_TOKEN),
        {
          expiresAt: new Date(expiredAt).toISOString(),
          expiresAtEpochMs: expiredAt,
        },
      )
    })

    const publicDb = testEnv.unauthenticatedContext().firestore()
    await assertFails(
      getDoc(doc(publicDb, 'sociometricSurveys', SURVEY_ID, 'accessTokens', ACCESS_TOKEN)),
    )
    await assertFails(
      setDoc(
        doc(publicDb, 'sociometricSurveys', SURVEY_ID, 'responses', ACCESS_TOKEN),
        sociometricResponseData(),
      ),
    )
  })

  test('una resposta publica existent no es pot sobreescriure', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'sociometricSurveys', SURVEY_ID, 'responses', ACCESS_TOKEN),
        sociometricResponseData(),
      )
    })

    const publicDb = testEnv.unauthenticatedContext().firestore()
    await assertFails(
      setDoc(
        doc(publicDb, 'sociometricSurveys', SURVEY_ID, 'responses', ACCESS_TOKEN),
        sociometricResponseData({
          avoidStudentIds: ['student-2'],
          positiveStudentIds: [],
          submittedAt: '2026-06-19T08:20:00.000Z',
        }),
      ),
    )
  })

  test('nomes el propietari pot eliminar tokens i respostes', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'sociometricSurveys', SURVEY_ID, 'responses', ACCESS_TOKEN),
        sociometricResponseData(),
      )
    })

    await assertFails(
      deleteDoc(doc(authDb(COTUTOR), 'sociometricSurveys', SURVEY_ID, 'accessTokens', ACCESS_TOKEN)),
    )
    await assertFails(
      deleteDoc(doc(authDb(COTUTOR), 'sociometricSurveys', SURVEY_ID, 'responses', ACCESS_TOKEN)),
    )
    await assertSucceeds(
      deleteDoc(doc(authDb(OWNER), 'sociometricSurveys', SURVEY_ID, 'accessTokens', ACCESS_TOKEN)),
    )
    await assertSucceeds(
      deleteDoc(doc(authDb(OWNER), 'sociometricSurveys', SURVEY_ID, 'responses', ACCESS_TOKEN)),
    )
  })

  test('nomes el propietari pot eliminar el questionari complet', async () => {
    await assertFails(deleteDoc(doc(authDb(COTUTOR), 'sociometricSurveys', SURVEY_ID)))
    await assertSucceeds(deleteDoc(doc(authDb(OWNER), 'sociometricSurveys', SURVEY_ID)))
  })
})

test('les assercions de proves estan actives', () => {
  assert.ok(testEnv)
})
