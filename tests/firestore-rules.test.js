import { readFile } from 'node:fs/promises'
import { after, before, beforeEach, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'

const PROJECT_ID = 'avaluapro-rules-test'
const OWNER = { uid: 'owner-uid', email: 'owner@educand.ad' }
const COTUTOR = { uid: 'cotutor-uid', email: 'cotutor@educand.ad' }
const THIRD = { uid: 'third-uid', email: 'third@educand.ad' }
const SPACE_ID = 'space-1'
const SURVEY_ID = 'survey-1'

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
  return {
    avoidLimit: 3,
    classId: 'class-1',
    className: 'Tutoria 1A',
    createdAt: '2026-06-19T08:00:00.000Z',
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

function sociometricResponseData(overrides = {}) {
  return {
    avoidStudentIds: [],
    classId: 'class-1',
    positiveStudentIds: ['student-2'],
    responseId: 'student_student-1',
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
  test('un questionari actiu es pot consultar sense autenticacio', async () => {
    const publicDb = testEnv.unauthenticatedContext().firestore()
    await assertSucceeds(getDoc(doc(publicDb, 'sociometricSurveys', SURVEY_ID)))
  })

  test('una persona pot crear una resposta valida', async () => {
    const publicDb = testEnv.unauthenticatedContext().firestore()
    await assertSucceeds(
      setDoc(
        doc(publicDb, 'sociometricSurveys', SURVEY_ID, 'responses', 'student_student-1'),
        sociometricResponseData(),
      ),
    )
  })

  test('una resposta publica existent no es pot sobreescriure', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'sociometricSurveys', SURVEY_ID, 'responses', 'student_student-1'),
        sociometricResponseData(),
      )
    })

    const publicDb = testEnv.unauthenticatedContext().firestore()
    await assertFails(
      setDoc(
        doc(publicDb, 'sociometricSurveys', SURVEY_ID, 'responses', 'student_student-1'),
        sociometricResponseData({
          avoidStudentIds: ['student-2'],
          positiveStudentIds: [],
          submittedAt: '2026-06-19T08:20:00.000Z',
        }),
      ),
    )
  })
})

test('les assercions de proves estan actives', () => {
  assert.ok(testEnv)
})
