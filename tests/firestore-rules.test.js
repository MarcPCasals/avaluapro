import { readFile } from 'node:fs/promises'
import { after, before, beforeEach, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore'
import { createEmptyStudentProfileAnswers } from '../src/features/tutoring/studentProfileQuestionnaire.js'

const PROJECT_ID = 'avaluapro-rules-test'
const OWNER = { uid: 'owner-uid', email: 'owner@educand.ad' }
const COTUTOR = { uid: 'cotutor-uid', email: 'cotutor@educand.ad' }
const THIRD = { uid: 'third-uid', email: 'third@educand.ad' }
const SPACE_ID = 'space-1'
const SURVEY_ID = 'survey-1'
const ACCESS_TOKEN = 'a'.repeat(48)
const PROFILE_SURVEY_ID = 'profile-survey-1'

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

function tutoringCoordinationItemData(overrides = {}) {
  return {
    assigneeUid: '',
    authorEmail: OWNER.email,
    authorName: 'Tutor propietari',
    authorUid: OWNER.uid,
    completedAt: '',
    completedByEmail: '',
    completedByUid: '',
    createdAt: '2026-09-15T08:00:00.000Z',
    deletedAt: '',
    deletedByUid: '',
    dueAt: '',
    id: 'coord-1',
    kind: 'message',
    status: 'sent',
    studentId: '',
    text: 'Informació tutorial fictícia',
    updatedAt: '2026-09-15T08:00:00.000Z',
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

function studentProfileSurveyData(overrides = {}) {
  const expiresAtEpochMs = Date.now() + 24 * 60 * 60 * 1000
  return {
    academicYear: '2026-2027',
    classId: 'class-1',
    className: 'Tutoria 1A',
    createdAt: '2026-09-08T08:00:00.000Z',
    expiresAt: new Date(expiresAtEpochMs).toISOString(),
    expiresAtEpochMs,
    formVersion: '2026-09-08-v1',
    id: PROFILE_SURVEY_ID,
    memberUidMap: { [OWNER.uid]: true, [COTUTOR.uid]: true },
    memberUids: [OWNER.uid, COTUTOR.uid],
    ownerUid: OWNER.uid,
    privacyNoticeVersion: '2026-09-08-v1',
    responseCount: 0,
    status: 'active',
    studentOptionIds: ['student-1', 'student-2'],
    studentOptions: [
      { id: 'student-1', name: 'Alumna Un' },
      { id: 'student-2', name: 'Alumne Dos' },
    ],
    updatedAt: '2026-09-08T08:00:00.000Z',
    ...overrides,
  }
}

function studentProfilePublicFormData(overrides = {}) {
  const survey = studentProfileSurveyData()
  return {
    classId: survey.classId,
    className: survey.className,
    expiresAt: survey.expiresAt,
    expiresAtEpochMs: survey.expiresAtEpochMs,
    formVersion: survey.formVersion,
    privacyNoticeVersion: survey.privacyNoticeVersion,
    studentNamesById: { 'student-1': 'Alumna Un', 'student-2': 'Alumne Dos' },
    studentOptionIds: survey.studentOptionIds,
    studentOptions: survey.studentOptions,
    surveyId: PROFILE_SURVEY_ID,
    ...overrides,
  }
}

function studentProfileResponseData(overrides = {}) {
  return {
    answers: { ...createEmptyStudentProfileAnswers(), homeDeviceAccess: 'no' },
    classId: 'class-1',
    formVersion: '2026-09-08-v1',
    privacyNoticeAcknowledged: true,
    privacyNoticeVersion: '2026-09-08-v1',
    reviewedAt: '',
    reviewedByUid: '',
    studentId: 'student-1',
    studentName: 'Alumna Un',
    submittedAt: serverTimestamp(),
    surveyId: PROFILE_SURVEY_ID,
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
    await setDoc(doc(db, 'studentProfileSurveys', PROFILE_SURVEY_ID), studentProfileSurveyData())
    await setDoc(
      doc(db, 'studentProfileSurveys', PROFILE_SURVEY_ID, 'public', 'form'),
      studentProfilePublicFormData(),
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
    await assertSucceeds(
      setDoc(doc(authDb(COTUTOR), 'tutoringSpaces', SPACE_ID, 'agendaNotes', 'note-1'), {
        classId: 'class-1',
        id: 'note-1',
        studentId: 'student-1',
        text: 'Comentari tutorial fictici',
        type: 'tutoring',
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

  test('els dos tutors poden compartir la referencia segura d un questionari sociometric', async () => {
    const surveyRef = doc(
      authDb(COTUTOR),
      'tutoringSpaces',
      SPACE_ID,
      'sociometricSurveys',
      SURVEY_ID,
    )
    await assertSucceeds(
      setDoc(surveyRef, {
        classId: 'class-1',
        id: SURVEY_ID,
        ownerUid: OWNER.uid,
        status: 'active',
        updatedAt: '2026-06-19T08:15:00.000Z',
      }),
    )
    await assertSucceeds(getDoc(surveyRef))
    await assertFails(
      getDoc(doc(authDb(THIRD), 'tutoringSpaces', SPACE_ID, 'sociometricSurveys', SURVEY_ID)),
    )
  })

  test('cada tutor pot publicar el seu senyal de canvi i l altre el pot llegir', async () => {
    const signalRef = doc(authDb(OWNER), 'tutoringSpaces', SPACE_ID, 'changeSignals', OWNER.uid)
    await assertSucceeds(
      setDoc(signalRef, {
        changeId: 'change-owner-1',
        changedAt: '2026-09-14T16:00:00.000Z',
        changedByEmail: OWNER.email,
        changedByUid: OWNER.uid,
        changedCollections: ['tutorialRecords', 'students'],
      }),
    )
    await assertSucceeds(
      getDoc(doc(authDb(COTUTOR), 'tutoringSpaces', SPACE_ID, 'changeSignals', OWNER.uid)),
    )
    await assertFails(
      getDoc(doc(authDb(THIRD), 'tutoringSpaces', SPACE_ID, 'changeSignals', OWNER.uid)),
    )
  })

  test('un cotutor no pot publicar un senyal en nom d una altra persona', async () => {
    await assertFails(
      setDoc(doc(authDb(COTUTOR), 'tutoringSpaces', SPACE_ID, 'changeSignals', OWNER.uid), {
        changeId: 'change-forged',
        changedAt: '2026-09-14T16:00:00.000Z',
        changedByEmail: COTUTOR.email,
        changedByUid: COTUTOR.uid,
        changedCollections: ['tutorialRecords'],
      }),
    )
  })

  test('un membre pot enviar un missatge de coordinacio i un tercer no el pot llegir', async () => {
    const itemRef = doc(authDb(OWNER), 'tutoringSpaces', SPACE_ID, 'coordinationItems', 'coord-1')
    await assertSucceeds(setDoc(itemRef, tutoringCoordinationItemData()))
    await assertSucceeds(
      getDoc(doc(authDb(COTUTOR), 'tutoringSpaces', SPACE_ID, 'coordinationItems', 'coord-1')),
    )
    await assertFails(
      getDoc(doc(authDb(THIRD), 'tutoringSpaces', SPACE_ID, 'coordinationItems', 'coord-1')),
    )
  })

  test('ningú pot falsificar l autoria d un missatge de coordinacio', async () => {
    await assertFails(
      setDoc(
        doc(authDb(COTUTOR), 'tutoringSpaces', SPACE_ID, 'coordinationItems', 'coord-forged'),
        tutoringCoordinationItemData({
          authorEmail: OWNER.email,
          authorUid: OWNER.uid,
          id: 'coord-forged',
        }),
      ),
    )
  })

  test('un recordatori no es pot assignar a una persona aliena a la cotutoria', async () => {
    await assertFails(
      setDoc(
        doc(authDb(OWNER), 'tutoringSpaces', SPACE_ID, 'coordinationItems', 'coord-invalid-assignee'),
        tutoringCoordinationItemData({
          assigneeUid: THIRD.uid,
          id: 'coord-invalid-assignee',
          kind: 'reminder',
          status: 'open',
        }),
      ),
    )
  })

  test('qualsevol cotutor pot completar i reobrir un recordatori', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'tutoringSpaces', SPACE_ID, 'coordinationItems', 'reminder-1'),
        tutoringCoordinationItemData({
          assigneeUid: 'all',
          id: 'reminder-1',
          kind: 'reminder',
          status: 'open',
        }),
      )
    })
    const reminderRef = doc(authDb(COTUTOR), 'tutoringSpaces', SPACE_ID, 'coordinationItems', 'reminder-1')
    await assertSucceeds(
      updateDoc(reminderRef, {
        completedAt: '2026-09-15T09:00:00.000Z',
        completedByEmail: COTUTOR.email,
        completedByUid: COTUTOR.uid,
        status: 'completed',
        updatedAt: '2026-09-15T09:00:00.000Z',
      }),
    )
    await assertSucceeds(
      updateDoc(reminderRef, {
        completedAt: '',
        completedByEmail: '',
        completedByUid: '',
        status: 'open',
        updatedAt: '2026-09-15T09:05:00.000Z',
      }),
    )
  })

  test('un cotutor no pot editar el text escrit per l altre', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'tutoringSpaces', SPACE_ID, 'coordinationItems', 'coord-1'),
        tutoringCoordinationItemData(),
      )
    })
    await assertFails(
      updateDoc(doc(authDb(COTUTOR), 'tutoringSpaces', SPACE_ID, 'coordinationItems', 'coord-1'), {
        text: 'Text manipulat',
        updatedAt: '2026-09-15T09:00:00.000Z',
      }),
    )
  })

  test('l autor pot eliminar el contingut del seu missatge i no el pot fer reapareixer', async () => {
    const itemRef = doc(authDb(OWNER), 'tutoringSpaces', SPACE_ID, 'coordinationItems', 'coord-delete')
    await assertSucceeds(setDoc(itemRef, tutoringCoordinationItemData({ id: 'coord-delete', studentId: 'student-1' })))
    await assertSucceeds(
      updateDoc(itemRef, {
        assigneeUid: '',
        deletedAt: '2026-09-15T09:00:00.000Z',
        deletedByUid: OWNER.uid,
        dueAt: '',
        studentId: '',
        text: 'Missatge suprimit',
        updatedAt: '2026-09-15T09:00:00.000Z',
      }),
    )
    await assertFails(
      updateDoc(itemRef, {
        deletedAt: '',
        deletedByUid: '',
        text: 'Informació recuperada',
        updatedAt: '2026-09-15T09:05:00.000Z',
      }),
    )
  })

  test('cada tutor nomes pot escriure el seu propi estat de lectura', async () => {
    const ownState = {
      email: COTUTOR.email,
      lastReadAt: '2026-09-15T08:00:00.000Z',
      spaceId: SPACE_ID,
      uid: COTUTOR.uid,
      updatedAt: '2026-09-15T08:01:00.000Z',
    }
    await assertSucceeds(
      setDoc(
        doc(authDb(COTUTOR), 'tutoringSpaces', SPACE_ID, 'coordinationMemberStates', COTUTOR.uid),
        ownState,
      ),
    )
    await assertFails(
      setDoc(
        doc(authDb(COTUTOR), 'tutoringSpaces', SPACE_ID, 'coordinationMemberStates', OWNER.uid),
        { ...ownState, email: OWNER.email, uid: OWNER.uid },
      ),
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

  test('nomes el propietari pot reconciliar els membres del questionari', async () => {
    await assertFails(
      updateDoc(doc(authDb(COTUTOR), 'sociometricSurveys', SURVEY_ID), {
        memberUids: [OWNER.uid],
        updatedAt: '2026-06-19T08:16:00.000Z',
      }),
    )
    await assertSucceeds(
      updateDoc(doc(authDb(OWNER), 'sociometricSurveys', SURVEY_ID), {
        memberUids: [OWNER.uid],
        updatedAt: '2026-06-19T08:16:00.000Z',
      }),
    )
    await assertFails(getDoc(doc(authDb(COTUTOR), 'sociometricSurveys', SURVEY_ID)))
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

describe('formulari tutorial public', () => {
  test('el propietari pot crear atomicament el formulari privat i la copia publica', async () => {
    const db = authDb(OWNER)
    const surveyId = 'profile-survey-new'
    const survey = studentProfileSurveyData({ id: surveyId })
    const publicForm = {
      ...studentProfilePublicFormData(),
      expiresAt: survey.expiresAt,
      expiresAtEpochMs: survey.expiresAtEpochMs,
      surveyId,
    }
    const batch = writeBatch(db)
    batch.set(doc(db, 'studentProfileSurveys', surveyId), survey)
    batch.set(doc(db, 'studentProfileSurveys', surveyId, 'public', 'form'), publicForm)
    await assertSucceeds(batch.commit())
  })

  test('el formulari public es visible, pero les dades privades no ho son', async () => {
    const publicDb = testEnv.unauthenticatedContext().firestore()
    await assertSucceeds(
      getDoc(doc(publicDb, 'studentProfileSurveys', PROFILE_SURVEY_ID, 'public', 'form')),
    )
    await assertFails(getDoc(doc(publicDb, 'studentProfileSurveys', PROFILE_SURVEY_ID)))
    await assertFails(
      getDocs(collection(publicDb, 'studentProfileSurveys', PROFILE_SURVEY_ID, 'responses')),
    )
  })

  test('un tutor pot enumerar els formularis on consta com a membre', async () => {
    const db = authDb(OWNER)
    await assertSucceeds(
      getDocs(
        query(
          collection(db, 'studentProfileSurveys'),
          where('ownerUid', '==', OWNER.uid),
        ),
      ),
    )
    await assertSucceeds(
      getDocs(
        query(
          collection(authDb(COTUTOR), 'studentProfileSurveys'),
          where(`memberUidMap.${COTUTOR.uid}`, '==', true),
        ),
      ),
    )
  })

  test('nomes el propietari pot reconciliar els membres del formulari tutorial', async () => {
    await assertFails(
      updateDoc(doc(authDb(COTUTOR), 'studentProfileSurveys', PROFILE_SURVEY_ID), {
        memberUidMap: { [OWNER.uid]: true },
        memberUids: [OWNER.uid],
        updatedAt: '2026-09-08T08:16:00.000Z',
      }),
    )
    await assertSucceeds(
      updateDoc(doc(authDb(OWNER), 'studentProfileSurveys', PROFILE_SURVEY_ID), {
        memberUidMap: { [OWNER.uid]: true },
        memberUids: [OWNER.uid],
        updatedAt: '2026-09-08T08:16:00.000Z',
      }),
    )
    await assertFails(getDoc(doc(authDb(COTUTOR), 'studentProfileSurveys', PROFILE_SURVEY_ID)))
  })

  test('un alumne pot enviar una resposta valida una sola vegada', async () => {
    const publicDb = testEnv.unauthenticatedContext().firestore()
    const responseRef = doc(
      publicDb,
      'studentProfileSurveys',
      PROFILE_SURVEY_ID,
      'responses',
      'student-1',
    )
    await assertSucceeds(setDoc(responseRef, studentProfileResponseData()))
    await assertFails(setDoc(responseRef, studentProfileResponseData({ studentMessage: 'canvi' })))
  })

  test('una pestanya oberta amb la versió anterior encara pot enviar la resposta', async () => {
    const publicDb = testEnv.unauthenticatedContext().firestore()
    const legacyAnswers = createEmptyStudentProfileAnswers()
    delete legacyAnswers.address2
    await assertSucceeds(
      setDoc(
        doc(publicDb, 'studentProfileSurveys', PROFILE_SURVEY_ID, 'responses', 'student-1'),
        studentProfileResponseData({ answers: legacyAnswers }),
      ),
    )
  })

  test('no es pot suplantar un nom ni triar un identificador de resposta diferent', async () => {
    const publicDb = testEnv.unauthenticatedContext().firestore()
    await assertFails(
      setDoc(
        doc(publicDb, 'studentProfileSurveys', PROFILE_SURVEY_ID, 'responses', 'student-1'),
        studentProfileResponseData({ studentName: 'Alumne Dos' }),
      ),
    )
    await assertFails(
      setDoc(
        doc(publicDb, 'studentProfileSurveys', PROFILE_SURVEY_ID, 'responses', 'un-altre-id'),
        studentProfileResponseData(),
      ),
    )
  })

  test('es poden enviar les amistats de classe i del centre', async () => {
    const publicDb = testEnv.unauthenticatedContext().firestore()
    await assertSucceeds(
      setDoc(
        doc(publicDb, 'studentProfileSurveys', PROFILE_SURVEY_ID, 'responses', 'student-1'),
        studentProfileResponseData({
          answers: {
            ...createEmptyStudentProfileAnswers(),
            homeDeviceAccess: 'no',
            classFriendIds: ['student-2'],
            schoolFriends: 'Una amistat de 2n B',
          },
        }),
      ),
    )
  })

  test('es pot indicar el tipus i la quantitat de dispositius disponibles a casa', async () => {
    const publicDb = testEnv.unauthenticatedContext().firestore()
    await assertSucceeds(
      setDoc(
        doc(publicDb, 'studentProfileSurveys', PROFILE_SURVEY_ID, 'responses', 'student-1'),
        studentProfileResponseData({
          answers: {
            ...createEmptyStudentProfileAnswers(),
            homeDeviceAccess: 'yes',
            homeMobileCount: 2,
            homeTabletCount: 1,
          },
        }),
      ),
    )
  })

  test('un formulari tancat no es pot consultar ni respondre', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), 'studentProfileSurveys', PROFILE_SURVEY_ID), {
        status: 'closed',
      })
    })
    const publicDb = testEnv.unauthenticatedContext().firestore()
    await assertFails(
      getDoc(doc(publicDb, 'studentProfileSurveys', PROFILE_SURVEY_ID, 'public', 'form')),
    )
    await assertFails(
      setDoc(
        doc(publicDb, 'studentProfileSurveys', PROFILE_SURVEY_ID, 'responses', 'student-1'),
        studentProfileResponseData(),
      ),
    )
  })

  test('nomes els tutors vinculats poden consultar, revisar i eliminar respostes', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'studentProfileSurveys', PROFILE_SURVEY_ID, 'responses', 'student-1'),
        studentProfileResponseData({ submittedAt: new Date('2026-09-08T08:10:00.000Z') }),
      )
    })
    const responsePath = ['studentProfileSurveys', PROFILE_SURVEY_ID, 'responses', 'student-1']
    await assertSucceeds(getDoc(doc(authDb(OWNER), ...responsePath)))
    await assertSucceeds(getDoc(doc(authDb(COTUTOR), ...responsePath)))
    await assertFails(getDoc(doc(authDb(THIRD), ...responsePath)))
    await assertSucceeds(
      updateDoc(doc(authDb(COTUTOR), ...responsePath), {
        reviewedAt: serverTimestamp(),
        reviewedByUid: COTUTOR.uid,
      }),
    )
    await assertFails(updateDoc(doc(authDb(THIRD), ...responsePath), { reviewedAt: '' }))
    await assertSucceeds(deleteDoc(doc(authDb(COTUTOR), ...responsePath)))
  })

  test('es rebutgen camps inesperats i respostes massa llargues', async () => {
    const publicDb = testEnv.unauthenticatedContext().firestore()
    const baseAnswers = createEmptyStudentProfileAnswers()
    for (const answers of [
      { ...baseAnswers, campInventat: 'no permes' },
      { ...baseAnswers, address2: 'a'.repeat(241) },
      { ...baseAnswers, studentMessage: 'a'.repeat(1601) },
      { ...baseAnswers, schoolFriends: 'a'.repeat(1001) },
    ]) {
      await assertFails(
        setDoc(
          doc(publicDb, 'studentProfileSurveys', PROFILE_SURVEY_ID, 'responses', 'student-1'),
          studentProfileResponseData({ answers }),
        ),
      )
    }
  })
})


describe('Internal feedback inbox', () => {
  function feedbackDb(uid = 'teacher', email = 'teacher@educand.ad', verified = true) {
    return testEnv.authenticatedContext(uid, { email, email_verified: verified }).firestore()
  }
  function payload(overrides = {}) {
    return {
      category: 'suggeriment', message: 'Una proposta per millorar', name: '',
      senderUid: 'teacher', senderEmail: 'teacher@educand.ad',
      createdAt: serverTimestamp(), status: 'new', ...overrides,
    }
  }
  test('verified teacher can submit but cannot read or modify the inbox', async () => {
    const db = feedbackDb()
    const ref = doc(db, 'feedbackMessages', 'message-1')
    await assertSucceeds(setDoc(ref, payload()))
    await assertFails(getDoc(ref))
    await assertFails(getDocs(collection(db, 'feedbackMessages')))
    await assertFails(updateDoc(ref, { status: 'read' }))
    await assertFails(deleteDoc(ref))
    await assertFails(getDoc(doc(feedbackDb('other', 'other@educand.ad'), 'feedbackMessages', 'message-1')))
  })
  test('anonymous and unverified accounts cannot submit or read', async () => {
    for (const db of [testEnv.unauthenticatedContext().firestore(), feedbackDb('teacher', 'teacher@educand.ad', false)]) {
      await assertFails(setDoc(doc(db, 'feedbackMessages', 'blocked'), payload()))
      await assertFails(getDocs(collection(db, 'feedbackMessages')))
    }
    await assertFails(getDocs(collection(feedbackDb('marc', 'mperezc@educand.ad', false), 'feedbackMessages')))
  })
  test('rejects forged sender, extra fields, invalid lengths, category, time and status', async () => {
    const db = feedbackDb()
    for (const patch of [
      { senderUid: 'someone-else' }, { senderEmail: 'mperezc@educand.ad' },
      { extra: 'unexpected' }, { message: 'tiny' }, { message: 'a'.repeat(1601) },
      { name: 'a'.repeat(81) }, { category: 'other' }, { status: 'read' },
      { createdAt: '2026-09-04' },
    ]) {
      await assertFails(setDoc(doc(db, 'feedbackMessages', 'invalid'), payload(patch)))
    }
  })
  test('only verified Marc can read and mark read, without changing the message', async () => {
    await assertSucceeds(setDoc(doc(feedbackDb(), 'feedbackMessages', 'message-1'), payload()))
    const db = feedbackDb('marc', 'mperezc@educand.ad')
    const ref = doc(db, 'feedbackMessages', 'message-1')
    await assertSucceeds(getDoc(ref))
    await assertSucceeds(getDocs(collection(db, 'feedbackMessages')))
    await assertSucceeds(updateDoc(ref, { status: 'read' }))
    await assertFails(updateDoc(ref, { message: 'Changed by admin' }))
    await assertFails(deleteDoc(ref))
  })
})
