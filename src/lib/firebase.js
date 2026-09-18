import { initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth'
import {
  addDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  getFirestore,
  limit,
  orderBy,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { COLLECTIONS } from '../data/seedData'
import { getSharedRowVersion } from './sharedTutoringRows'
import { removeExpiredSociometricSurveys } from './sociometricRetention'
import {
  areCloudDocumentsEqual,
  buildCloudDocumentDiff,
  isFirestoreQuotaError,
  isFirestoreSpecialValue,
} from './cloudSyncDiff'

export const SHARED_TUTORING_COLLECTIONS = [
  'students',
  'agendaNotes',
  'tutorialRecords',
  'tutorialMarks',
  'tutorialRelations',
  'sociometricSurveys',
  'tutorialGroupSets',
  'tutorialSociometricMoments',
  'tutorialSociogramLayouts',
  'tutorialStudentRoles',
  'tutorialSeatingPlans',
  'studentAntecedents',
]
export const TUTORING_COORDINATION_ITEMS_COLLECTION = 'coordinationItems'
export const TUTORING_COORDINATION_MEMBER_STATES_COLLECTION = 'coordinationMemberStates'

const firebaseConfig = {
  apiKey: 'AIzaSyDCwA7vxVpHQ3CST49xnNblj4JqNPs8sd4',
  authDomain: 'avaluapro.firebaseapp.com',
  projectId: 'avaluapro',
  storageBucket: 'avaluapro.firebasestorage.app',
  messagingSenderId: '471098465513',
  appId: '1:471098465513:web:720de523e74c792e766478',
  measurementId: 'G-03LGC2KD51',
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const googleProvider = new GoogleAuthProvider()
const authReady = setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn('No s’ha pogut fixar la persistència local de Firebase Auth.', error)
})
const FIRESTORE_DOCUMENT_SOFT_LIMIT = 900_000
export const SOCIOMETRIC_SURVEYS_COLLECTION = 'sociometricSurveys'
export const SOCIOMETRIC_PRIVACY_NOTICE_VERSION = '2026-06-20-v1'
export const STUDENT_PROFILE_SURVEYS_COLLECTION = 'studentProfileSurveys'

function getFirebaseAuthErrorMessage(error) {
  const message = String(error?.message || '')
  const code = String(error?.code || '')

  if (
    code.includes('unauthorized-domain') ||
    message.includes('API_KEY_HTTP_REFERRER_BLOCKED') ||
    message.includes('Requests from referer') ||
    message.includes('app domain is authorized')
  ) {
    return [
      'Google ha bloquejat l’inici de sessió perquè falta autoritzar un domini del projecte Firebase.',
      'A Google Cloud cal afegir també https://avaluapro.firebaseapp.com/* a les restriccions HTTP de la clau API.',
    ].join(' ')
  }

  return message || 'No s’ha pogut completar l’inici de sessió amb Google.'
}

function cleanForFirestore(value) {
  if (Array.isArray(value)) return value.map(cleanForFirestore)
  if (!value || typeof value !== 'object') return value ?? null
  if (isFirestoreSpecialValue(value)) return value

  return Object.entries(value).reduce((nextValue, [key, entry]) => {
    if (entry === undefined) return nextValue
    return { ...nextValue, [key]: cleanForFirestore(entry) }
  }, {})
}

function getCollectionRef(uid, collectionName) {
  return collection(db, 'users', uid, collectionName)
}

function getUserDocRef(uid) {
  return doc(db, 'users', uid)
}

function getMetaDocRef(uid) {
  return doc(db, 'users', uid, 'meta', 'app')
}

function getCloudBackupCollectionRef(uid) {
  return collection(db, 'users', uid, 'cloudBackups')
}

function getCloudBackupDocRef(uid, backupId) {
  return doc(db, 'users', uid, 'cloudBackups', backupId)
}

function getTeacherGradePackageCollectionRef() {
  return collection(db, 'teacherGradePackages')
}

function getTeacherGradePackageDocRef(packageId) {
  return doc(db, 'teacherGradePackages', packageId)
}

function getTutoringSpaceCollectionRef() {
  return collection(db, 'tutoringSpaces')
}

function getTutoringSpaceDocRef(spaceId) {
  return doc(db, 'tutoringSpaces', spaceId)
}

function getTutoringInvitationDocRef(recipientEmail, spaceId) {
  return doc(db, 'tutoringInvitationInbox', normalizeEmail(recipientEmail), 'items', spaceId)
}

function getInternalMessageStateDocRef(uid) {
  return doc(db, 'users', uid, 'messageState', 'inbox')
}

function getTutoringInvitationCollectionRef(recipientEmail) {
  return collection(db, 'tutoringInvitationInbox', normalizeEmail(recipientEmail), 'items')
}

function getTutoringInvitationOutboxId(recipientEmail, spaceId) {
  const cleanEmail = normalizeEmail(recipientEmail).replace(/[^a-z0-9_-]/g, '_')
  return `${String(spaceId || '').replaceAll('/', '_')}__${cleanEmail}`
}

function getTutoringInvitationOutboxDocRef(senderUid, recipientEmail, spaceId) {
  return doc(
    db,
    'tutoringInvitationOutbox',
    senderUid,
    'items',
    getTutoringInvitationOutboxId(recipientEmail, spaceId),
  )
}

function getTutoringInvitationOutboxCollectionRef(senderUid) {
  return collection(db, 'tutoringInvitationOutbox', senderUid, 'items')
}

export function getSociometricSurveyDocRef(surveyId) {
  return doc(db, SOCIOMETRIC_SURVEYS_COLLECTION, String(surveyId || '').replaceAll('/', '_'))
}

function getSociometricSurveyAccessTokensCollectionRef(surveyId) {
  return collection(getSociometricSurveyDocRef(surveyId), 'accessTokens')
}

function getSociometricSurveyPublicDocRef(surveyId) {
  return doc(getSociometricSurveyDocRef(surveyId), 'public', 'form')
}

export function getSociometricSurveyResponsesCollectionRef(surveyId) {
  return collection(getSociometricSurveyDocRef(surveyId), 'responses')
}

function getStudentProfileSurveyDocRef(surveyId) {
  return doc(db, STUDENT_PROFILE_SURVEYS_COLLECTION, normalizeFirestoreId(surveyId))
}

function getStudentProfileSurveyPublicDocRef(surveyId) {
  return doc(getStudentProfileSurveyDocRef(surveyId), 'public', 'form')
}

function getStudentProfileSurveyResponsesCollectionRef(surveyId) {
  return collection(getStudentProfileSurveyDocRef(surveyId), 'responses')
}

function getSafeDocId(row, fallbackPrefix, index) {
  return String(row?.id || `${fallbackPrefix}_${index}`).replaceAll('/', '_')
}

function assertFirestoreDocumentSize(collectionName, docId, value) {
  const bytes = new Blob([JSON.stringify(value)]).size
  if (bytes > FIRESTORE_DOCUMENT_SOFT_LIMIT) {
    throw new Error(
      `El document "${collectionName}/${docId}" és massa gran per guardar-lo a Firestore. Fes una còpia local i redueix imatges grans; les fotos definitives les passarem a Firebase Storage.`,
    )
  }
}

async function replaceCloudCollection(uid, collectionName, rows = []) {
  const collectionRef = getCollectionRef(uid, collectionName)
  const existingSnapshot = await getDocs(collectionRef)
  const localDocuments = rows.map((row, index) => {
    const docId = getSafeDocId(row, collectionName, index)
    const value = cleanForFirestore({ ...row, id: docId })
    assertFirestoreDocumentSize(collectionName, docId, value)
    return { id: docId, value }
  })
  const remoteDocuments = existingSnapshot.docs.map((snapshotDoc) => ({
    id: snapshotDoc.id,
    value: snapshotDoc.data(),
  }))
  const diff = buildCloudDocumentDiff(localDocuments, remoteDocuments)
  const operations = [
    ...diff.deleteIds.map((docId) => ({ type: 'delete', ref: doc(collectionRef, docId) })),
    ...diff.upserts.map(({ id, value }) => ({ type: 'set', ref: doc(collectionRef, id), value })),
  ]

  for (let index = 0; index < operations.length; index += 450) {
    const batch = writeBatch(db)
    operations.slice(index, index + 450).forEach((operation) => {
      if (operation.type === 'delete') {
        batch.delete(operation.ref)
      } else {
        batch.set(operation.ref, operation.value)
      }
    })
    await batch.commit()
  }

  return { collection: collectionName, ...diff.stats }
}

async function setDocumentIfChanged(reference, value) {
  const snapshot = await getDoc(reference)
  const currentValue = snapshot.exists() ? snapshot.data() : null
  const comparableCurrentValue = currentValue
    ? Object.keys(value).reduce((result, key) => ({ ...result, [key]: currentValue[key] }), {})
    : null
  if (snapshot.exists() && areCloudDocumentsEqual(comparableCurrentValue, value)) return false
  await setDoc(reference, value, { merge: true })
  return true
}

async function saveBackupRows(uid, backupId, collectionName, rows = []) {
  const collectionRef = collection(db, 'users', uid, 'cloudBackups', backupId, collectionName)
  const operations = rows.map((row, index) => {
    const docId = getSafeDocId(row, collectionName, index)
    const value = cleanForFirestore({ ...row, id: docId })
    assertFirestoreDocumentSize(`cloudBackups/${backupId}/${collectionName}`, docId, value)
    return { ref: doc(collectionRef, docId), value }
  })

  for (let index = 0; index < operations.length; index += 450) {
    const batch = writeBatch(db)
    operations.slice(index, index + 450).forEach((operation) => {
      batch.set(operation.ref, operation.value)
    })
    await batch.commit()
  }
}

function getTutoringRowVersion(row = {}) {
  return getSharedRowVersion(row)
}

function buildSharedEditMeta(row = {}, user, now) {
  const rowVersion = getTutoringRowVersion(row)
  return {
    sharedUpdatedAt: rowVersion || now,
    sharedUpdatedByEmail: normalizeEmail(user?.email),
    sharedUpdatedByUid: user?.uid || '',
  }
}

async function publishTutoringChangeSignal({ changeCollections = [], spaceId, user, changedAt }) {
  const announcedCollections = Array.from(
    new Set(changeCollections.filter((collectionName) => SHARED_TUTORING_COLLECTIONS.includes(collectionName))),
  )
  if (announcedCollections.length === 0) return null

  const changeSignal = cleanForFirestore({
    changeId: crypto.randomUUID(),
    changedAt: changedAt || new Date().toISOString(),
    changedByEmail: normalizeEmail(user.email),
    changedByUid: user.uid,
    changedCollections: announcedCollections,
  })
  await setDoc(doc(db, 'tutoringSpaces', spaceId, 'changeSignals', user.uid), changeSignal)
  return changeSignal
}

async function mergeTutoringSpaceCollection(spaceId, collectionName, rows = [], { user, now } = {}) {
  const collectionRef = collection(db, 'tutoringSpaces', spaceId, collectionName)
  const existingSnapshot = await getDocs(collectionRef)
  const existingById = new Map(existingSnapshot.docs.map((snapshotDoc) => [snapshotDoc.id, snapshotDoc]))
  const operations = []
  const conflicts = []

  rows.forEach((row, index) => {
    const docId = getSafeDocId(row, collectionName, index)
    const snapshotDoc = existingById.get(docId)
    const existingValue = snapshotDoc?.data() || null
    const sharedMeta = buildSharedEditMeta(row, user, now)
    const value = cleanForFirestore({ ...row, id: docId, ...sharedMeta })
    const localVersion = getTutoringRowVersion(value)
    const remoteVersion = getTutoringRowVersion(existingValue || {})
    const remoteEditedByOther =
      existingValue?.sharedUpdatedByUid &&
      user?.uid &&
      existingValue.sharedUpdatedByUid !== user.uid

    if (existingValue?.sharedDeletedAt && remoteVersion && (!localVersion || remoteVersion >= localVersion)) {
      conflicts.push({
        collectionName,
        documentId: docId,
        remoteDeletedAt: existingValue.sharedDeletedAt,
        remoteUpdatedAt: remoteVersion,
        remoteUpdatedByEmail: existingValue.sharedDeletedByEmail || '',
      })
      return
    }

    if (existingValue && remoteEditedByOther && remoteVersion && (!localVersion || remoteVersion > localVersion)) {
      conflicts.push({
        collectionName,
        documentId: docId,
        remoteUpdatedAt: remoteVersion,
        remoteUpdatedByEmail: existingValue.sharedUpdatedByEmail || '',
      })
      return
    }

    const comparableExistingValue = existingValue
      ? Object.keys(value).reduce((result, key) => ({ ...result, [key]: existingValue[key] }), {})
      : null
    if (existingValue && areCloudDocumentsEqual(comparableExistingValue, value)) return

    assertFirestoreDocumentSize(`tutoringSpaces/${spaceId}/${collectionName}`, docId, value)
    operations.push({
      type: 'set',
      ref: doc(collectionRef, docId),
      value,
    })
  })

  for (let index = 0; index < operations.length; index += 450) {
    const batch = writeBatch(db)
    operations.slice(index, index + 450).forEach((operation) => {
      batch.set(operation.ref, operation.value, { merge: true })
    })
    await batch.commit()
  }

  return {
    collectionName,
    conflictCount: conflicts.length,
    conflicts,
    writtenCount: operations.length,
  }
}

function normalizeEmail(value = '') {
  return String(value).trim().toLowerCase()
}

function normalizeFirestoreId(value = '') {
  return String(value || '').trim().replaceAll('/', '_')
}

function normalizeStudentOption(option = {}) {
  return {
    id: String(option.id || option.studentId || '').trim(),
    name: String(option.name || option.studentName || '').trim(),
  }
}

function normalizeSociometricSurveyPayload(survey = {}, user = {}) {
  const now = new Date().toISOString()
  const studentOptions = (Array.isArray(survey.studentOptions) ? survey.studentOptions : [])
    .map(normalizeStudentOption)
    .filter((option) => option.id && option.name)
  const studentOptionIds = Array.isArray(survey.studentOptionIds)
    ? survey.studentOptionIds.map((studentId) => String(studentId || '').trim()).filter(Boolean)
    : studentOptions.map((option) => option.id)
  const ownerUid = String(survey.ownerUid || user.uid || '').trim()
  const memberUids = Array.from(
    new Set([
      ownerUid,
      ...(Array.isArray(survey.memberUids) ? survey.memberUids : []),
    ]),
  ).filter(Boolean)

  return cleanForFirestore({
    id: normalizeFirestoreId(survey.id),
    avoidLimit: Math.max(0, Number(survey.avoidLimit) || 3),
    classId: String(survey.classId || '').trim(),
    className: String(survey.className || '').trim(),
    createdAt: survey.createdAt || now,
    expiresAt: String(survey.expiresAt || '').trim(),
    expiresAtEpochMs: Number(survey.expiresAtEpochMs) || 0,
    importedRelationCount: Math.max(0, Number(survey.importedRelationCount) || 0),
    lastSyncedAt: survey.lastSyncedAt || '',
    memberUids,
    ownerEmailLower: normalizeEmail(survey.ownerEmailLower || user.email || ''),
    ownerUid,
    positiveLimit: Math.max(0, Number(survey.positiveLimit) || 4),
    responseCount: Math.max(0, Number(survey.responseCount) || 0),
    status: survey.status === 'closed' ? 'closed' : 'active',
    studentOptionIds,
    studentOptions,
    updatedAt: survey.updatedAt || survey.createdAt || now,
  })
}

export async function syncOwnedTutorialSurveyMembers({
  classId,
  memberUids = [],
  sociometricSurveyIds = [],
  user,
}) {
  if (!classId || !user?.uid) return { sociometricCount: 0, studentProfileCount: 0 }

  const nextMemberUids = Array.from(
    new Set([user.uid, ...memberUids].map((uid) => String(uid || '').trim()).filter(Boolean)),
  )
  const nextMemberUidMap = Object.fromEntries(nextMemberUids.map((uid) => [uid, true]))
  const hasSameMembers = (current = []) =>
    [...current].map(String).sort().join('\n') === [...nextMemberUids].sort().join('\n')
  const now = new Date().toISOString()
  const ownedProfileSnapshot = await getDocs(
    query(collection(db, STUDENT_PROFILE_SURVEYS_COLLECTION), where('ownerUid', '==', user.uid)),
  )
  const profileDocs = ownedProfileSnapshot.docs.filter(
    (snapshotDoc) => snapshotDoc.data().classId === classId,
  )
  const sociometricDocs = (
    await Promise.all(
      Array.from(new Set(sociometricSurveyIds.filter(Boolean))).map(async (surveyId) => {
        const snapshot = await getDoc(getSociometricSurveyDocRef(surveyId))
        return snapshot.exists() && snapshot.data().ownerUid === user.uid && snapshot.data().classId === classId
          ? snapshot
          : null
      }),
    )
  ).filter(Boolean)

  const updates = [
    ...sociometricDocs
      .filter((snapshotDoc) => !hasSameMembers(snapshotDoc.data().memberUids || []))
      .map((snapshotDoc) => ({
        ref: snapshotDoc.ref,
        value: { memberUids: nextMemberUids, updatedAt: now },
      })),
    ...profileDocs
      .filter((snapshotDoc) => !hasSameMembers(snapshotDoc.data().memberUids || []))
      .map((snapshotDoc) => ({
        ref: snapshotDoc.ref,
        value: { memberUidMap: nextMemberUidMap, memberUids: nextMemberUids, updatedAt: now },
      })),
  ]

  for (let index = 0; index < updates.length; index += 450) {
    const batch = writeBatch(db)
    updates.slice(index, index + 450).forEach(({ ref, value }) => batch.update(ref, value))
    await batch.commit()
  }

  return {
    sociometricCount: sociometricDocs.length,
    studentProfileCount: profileDocs.length,
  }
}

function getSociometricResponseDocId(response = {}) {
  const responseId = normalizeFirestoreId(response.responseId)
  const accessToken = normalizeFirestoreId(response.accessToken)
  return responseId || accessToken
}

function normalizeSociometricResponsePayload({ response = {}, responseId, surveyId }) {
  const cleanResponseId = normalizeFirestoreId(responseId || response.responseId)
  return cleanForFirestore({
    accessToken: normalizeFirestoreId(response.accessToken),
    responseId: cleanResponseId,
    surveyId: normalizeFirestoreId(response.surveyId || surveyId),
    classId: String(response.classId || '').trim(),
    studentId: String(response.studentId || '').trim(),
    studentName: String(response.studentName || '').trim(),
    positiveStudentIds: Array.isArray(response.positiveStudentIds)
      ? response.positiveStudentIds.map((studentId) => String(studentId || '').trim()).filter(Boolean)
      : [],
    avoidStudentIds: Array.isArray(response.avoidStudentIds)
      ? response.avoidStudentIds.map((studentId) => String(studentId || '').trim()).filter(Boolean)
      : [],
    privacyNoticeAcknowledged: response.privacyNoticeAcknowledged === true,
    privacyNoticeVersion: String(response.privacyNoticeVersion || '').trim(),
    submittedAt: response.submittedAt || new Date().toISOString(),
  })
}

function mergeMemberEmails(...emailGroups) {
  return Array.from(
    new Set(emailGroups.flat().map(normalizeEmail).filter((email) => email && email.includes('@'))),
  )
}

function buildTutoringSpaceSummary(dataset = {}) {
  const students = Array.isArray(dataset.students) ? dataset.students : []
  const tutorialRecords = Array.isArray(dataset.tutorialRecords) ? dataset.tutorialRecords : []
  const tutorialMarks = Array.isArray(dataset.tutorialMarks) ? dataset.tutorialMarks : []
  const tutorialRelations = Array.isArray(dataset.tutorialRelations) ? dataset.tutorialRelations : []
  const tutorialGroupSets = Array.isArray(dataset.tutorialGroupSets) ? dataset.tutorialGroupSets : []
  const tutorialSociogramLayouts = Array.isArray(dataset.tutorialSociogramLayouts)
    ? dataset.tutorialSociogramLayouts
    : []
  const tutorialStudentRoles = Array.isArray(dataset.tutorialStudentRoles) ? dataset.tutorialStudentRoles : []
  const tutorialSeatingPlans = Array.isArray(dataset.tutorialSeatingPlans) ? dataset.tutorialSeatingPlans : []
  const studentAntecedents = Array.isArray(dataset.studentAntecedents) ? dataset.studentAntecedents : []
  const studentsWithProfile = students.filter(
    (student) =>
      student.photoUrl ||
      student.personalNotes ||
      student.isSkiStudyStudent ||
      student.diagnoses?.length > 0 ||
      student.tutorialIntelligences?.length > 0 ||
      student.tutorialModifiedCompetencies?.length > 0 ||
      student.tutorialExemptSubjects?.length > 0,
  )

  return {
    doipCount: tutorialRecords.filter((record) => record.type === 'doip').length,
    relationCount: tutorialRelations.length,
    seatingPlanCount: tutorialSeatingPlans.length,
    studentAntecedentCount: studentAntecedents.length,
    studentRoleCount: tutorialStudentRoles.length,
    studentCount: students.length,
    studentsWithProfileCount: studentsWithProfile.length,
    sociogramLayoutCount: tutorialSociogramLayouts.length,
    tutorialLinkedMarkCount: tutorialMarks.filter((mark) => mark.source?.type === 'linked-evaluation').length,
    tutorialGroupSetCount: tutorialGroupSets.length,
    tutorialMarkCount: tutorialMarks.length,
    tutorialRecordCount: tutorialRecords.length,
  }
}

export function toCloudUser(user) {
  if (!user) return null

  return {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
  }
}

export function observeFirebaseUser(callback, onError) {
  let unsubscribe = () => {}

  authReady
    .then(async () => {
      try {
        const redirectResult = await getRedirectResult(auth)
        if (redirectResult?.user) {
          callback(toCloudUser(redirectResult.user))
        }
      } catch (error) {
        console.warn('No s’ha pogut completar el retorn del login de Google.', error)
        onError?.(new Error(getFirebaseAuthErrorMessage(error), { cause: error }))
      }

      unsubscribe = onAuthStateChanged(auth, (user) => callback(toCloudUser(user)))
    })
    .catch((error) => {
      onError?.(new Error(getFirebaseAuthErrorMessage(error), { cause: error }))
    })

  return () => unsubscribe()
}

export async function signInWithGoogle() {
  try {
    await authReady
    const credential = await signInWithPopup(auth, googleProvider)
    return toCloudUser(credential.user)
  } catch (error) {
    const code = String(error?.code || '')
    const shouldTryRedirect = [
      'auth/popup-blocked',
      'auth/cancelled-popup-request',
      'auth/operation-not-supported-in-this-environment',
    ].some((expectedCode) => code.includes(expectedCode))

    if (shouldTryRedirect) {
      try {
        await signInWithRedirect(auth, googleProvider)
        return null
      } catch (redirectError) {
        throw new Error(getFirebaseAuthErrorMessage(redirectError), { cause: redirectError })
      }
    }

    throw new Error(getFirebaseAuthErrorMessage(error), { cause: error })
  }
}

export async function signOutFromGoogle() {
  await signOut(auth)
}

export async function createSociometricSurveyDocument({ survey, user }) {
  if (!user?.uid || !user?.email) {
    throw new Error('Cal iniciar sessió amb Google abans de crear un qüestionari sociomètric.')
  }

  const value = normalizeSociometricSurveyPayload(survey, user)
  if (!value.id || !value.classId || value.studentOptions.length === 0) {
    throw new Error('El qüestionari sociomètric necessita classe i alumnes abans de publicar-se.')
  }
  if (value.ownerUid !== user.uid || value.ownerEmailLower !== normalizeEmail(user.email)) {
    throw new Error('El qüestionari sociomètric ha de pertànyer al docent connectat.')
  }

  const publicValue = buildSociometricSurveyPublicForm(value)
  assertFirestoreDocumentSize(SOCIOMETRIC_SURVEYS_COLLECTION, value.id, value)
  assertFirestoreDocumentSize(`${SOCIOMETRIC_SURVEYS_COLLECTION}/${value.id}/public`, 'form', publicValue)
  const batch = writeBatch(db)
  batch.set(getSociometricSurveyDocRef(value.id), value)
  batch.set(getSociometricSurveyPublicDocRef(value.id), publicValue)
  ;(survey.accessTokens || []).forEach((access) => {
    const tokenId = normalizeFirestoreId(access.token)
    if (!tokenId || !access.studentId) return
    batch.set(
      doc(getSociometricSurveyAccessTokensCollectionRef(value.id), tokenId),
      cleanForFirestore({
        avoidLimit: value.avoidLimit,
        classId: value.classId,
        className: value.className,
        createdAt: value.createdAt,
        expiresAt: value.expiresAt,
        expiresAtEpochMs: value.expiresAtEpochMs,
        positiveLimit: value.positiveLimit,
        privacyNoticeVersion: SOCIOMETRIC_PRIVACY_NOTICE_VERSION,
        studentId: String(access.studentId).trim(),
        studentName: String(access.studentName || '').trim(),
        studentOptions: value.studentOptions,
        surveyId: value.id,
        tokenId,
      }),
    )
  })
  await batch.commit()
  return value
}

function buildSociometricSurveyPublicForm(survey = {}) {
  const studentOptions = (Array.isArray(survey.studentOptions) ? survey.studentOptions : [])
    .map(normalizeStudentOption)
    .filter((student) => student.id && student.name)
  return cleanForFirestore({
    avoidLimit: Math.max(0, Number(survey.avoidLimit) || 0),
    classId: String(survey.classId || '').trim(),
    className: String(survey.className || '').trim(),
    createdAt: survey.createdAt || '',
    expiresAt: String(survey.expiresAt || '').trim(),
    expiresAtEpochMs: Number(survey.expiresAtEpochMs) || 0,
    positiveLimit: Math.max(0, Number(survey.positiveLimit) || 0),
    privacyNoticeVersion: SOCIOMETRIC_PRIVACY_NOTICE_VERSION,
    studentNamesById: Object.fromEntries(studentOptions.map((student) => [student.id, student.name])),
    studentOptionIds: studentOptions.map((student) => student.id),
    studentOptions,
    surveyId: normalizeFirestoreId(survey.id),
  })
}

export async function ensureSociometricSurveyPublicForm(survey) {
  if (!survey?.id) throw new Error('No s’ha indicat cap qüestionari sociomètric.')
  const value = buildSociometricSurveyPublicForm(survey)
  await setDoc(getSociometricSurveyPublicDocRef(survey.id), value)
  return value
}

export async function loadPublicSociometricSurvey(surveyId, accessToken) {
  if (!surveyId) throw new Error('No s’ha indicat cap qüestionari sociomètric.')

  if (!accessToken) {
    const publicSnapshot = await getDoc(getSociometricSurveyPublicDocRef(surveyId))
    if (!publicSnapshot.exists()) throw new Error('Aquest qüestionari no està disponible o ja s’ha tancat.')
    const publicSurvey = publicSnapshot.data()
    if (Date.now() >= Number(publicSurvey.expiresAtEpochMs || 0)) {
      throw new Error('Aquest qüestionari sociomètric ja no accepta respostes.')
    }
    return { ...publicSurvey, accessToken: '', id: normalizeFirestoreId(surveyId), respondent: null }
  }

  const cleanToken = normalizeFirestoreId(accessToken)
  const tokenSnapshot = await getDoc(doc(getSociometricSurveyAccessTokensCollectionRef(surveyId), cleanToken))
  if (!tokenSnapshot.exists()) throw new Error('Aquest enllaç individual no és vàlid o ja ha caducat.')

  const access = tokenSnapshot.data()
  if (Date.now() >= Number(access.expiresAtEpochMs || 0)) {
    throw new Error('Aquest qüestionari sociomètric ja no accepta respostes.')
  }

  return {
    ...access,
    accessToken: cleanToken,
    id: surveyId,
    respondent: {
      studentId: access.studentId,
      studentName: access.studentName,
    },
  }
}

export async function submitSociometricSurveyResponse({ accessToken, response, surveyId }) {
  if (!surveyId) throw new Error('No s’ha indicat cap qüestionari sociomètric.')

  const survey = await loadPublicSociometricSurvey(surveyId, accessToken)
  const selectedStudent = survey.studentOptions?.find((student) => student.id === response?.studentId)
  const responseDocId = accessToken
    ? getSociometricResponseDocId({ ...response, accessToken })
    : normalizeFirestoreId(response?.studentId)
  const value = normalizeSociometricResponsePayload({
    response: {
      ...response,
      accessToken: accessToken || '',
      classId: response?.classId || survey.classId,
      studentId: survey.respondent?.studentId || selectedStudent?.id || '',
      studentName: survey.respondent?.studentName || selectedStudent?.name || '',
      surveyId: survey.id,
    },
    responseId: responseDocId,
    surveyId: survey.id,
  })

  if (!value.studentId || !value.studentName) {
    throw new Error('Cal triar el teu nom abans d’enviar el qüestionari.')
  }

  await setDoc(doc(getSociometricSurveyResponsesCollectionRef(survey.id), responseDocId), value)
  return value
}

export async function listSociometricSurveyResponses(surveyId) {
  if (!surveyId) return []

  const responsesQuery = query(
    getSociometricSurveyResponsesCollectionRef(surveyId),
    orderBy('submittedAt', 'asc'),
  )
  const snapshot = await getDocs(responsesQuery)
  return snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() }))
}

function normalizeStudentProfileSurveyPayload(survey = {}, user = {}) {
  const now = new Date().toISOString()
  const ownerUid = String(survey.ownerUid || user.uid || '').trim()
  const studentOptions = (Array.isArray(survey.studentOptions) ? survey.studentOptions : [])
    .map(normalizeStudentOption)
    .filter((option) => option.id && option.name)
  const memberUids = Array.from(
    new Set([ownerUid, ...(Array.isArray(survey.memberUids) ? survey.memberUids : [])]),
  ).filter(Boolean)

  return cleanForFirestore({
    academicYear: String(survey.academicYear || '').trim(),
    classId: String(survey.classId || '').trim(),
    className: String(survey.className || '').trim(),
    createdAt: survey.createdAt || now,
    expiresAt: String(survey.expiresAt || '').trim(),
    expiresAtEpochMs: Number(survey.expiresAtEpochMs) || 0,
    formVersion: String(survey.formVersion || '').trim(),
    id: normalizeFirestoreId(survey.id),
    memberUidMap: Object.fromEntries(memberUids.map((uid) => [uid, true])),
    memberUids,
    ownerUid,
    privacyNoticeVersion: String(survey.privacyNoticeVersion || '').trim(),
    responseCount: Math.max(0, Number(survey.responseCount) || 0),
    status: survey.status === 'closed' ? 'closed' : 'active',
    studentOptionIds: studentOptions.map((student) => student.id),
    studentOptions,
    updatedAt: survey.updatedAt || survey.createdAt || now,
  })
}

function normalizeStudentProfileResponsePayload({ response = {}, survey }) {
  const studentId = String(response.studentId || '').trim()
  const student = survey.studentOptions.find((option) => option.id === studentId)
  return {
    ...cleanForFirestore({
      answers: response.answers && typeof response.answers === 'object' ? response.answers : {},
      classId: survey.classId,
      formVersion: survey.formVersion,
      privacyNoticeAcknowledged: response.privacyNoticeAcknowledged === true,
      privacyNoticeVersion: survey.privacyNoticeVersion,
      reviewedAt: '',
      reviewedByUid: '',
      studentId,
      studentName: student?.name || '',
      surveyId: survey.id,
    }),
    submittedAt: serverTimestamp(),
  }
}

export async function createStudentProfileSurveyDocument({ survey, user }) {
  if (!user?.uid) throw new Error('Cal iniciar sessió amb Google abans de crear el formulari tutorial.')

  const value = normalizeStudentProfileSurveyPayload(survey, user)
  if (!value.id || !value.classId || value.studentOptions.length === 0) {
    throw new Error('El formulari tutorial necessita una classe amb alumnes.')
  }
  if (value.ownerUid !== user.uid) {
    throw new Error('El formulari tutorial ha de pertànyer al tutor connectat.')
  }

  const publicValue = cleanForFirestore({
    classId: value.classId,
    className: value.className,
    expiresAt: value.expiresAt,
    expiresAtEpochMs: value.expiresAtEpochMs,
    formVersion: value.formVersion,
    privacyNoticeVersion: value.privacyNoticeVersion,
    studentNamesById: Object.fromEntries(value.studentOptions.map((student) => [student.id, student.name])),
    studentOptionIds: value.studentOptionIds,
    studentOptions: value.studentOptions,
    surveyId: value.id,
  })
  assertFirestoreDocumentSize(STUDENT_PROFILE_SURVEYS_COLLECTION, value.id, value)
  assertFirestoreDocumentSize(`${STUDENT_PROFILE_SURVEYS_COLLECTION}/${value.id}/public`, 'form', publicValue)

  const batch = writeBatch(db)
  batch.set(getStudentProfileSurveyDocRef(value.id), value)
  batch.set(getStudentProfileSurveyPublicDocRef(value.id), publicValue)
  await batch.commit()
  return value
}

export async function listStudentProfileSurveysForUser(userUid) {
  if (!userUid) return []
  const surveysCollection = collection(db, STUDENT_PROFILE_SURVEYS_COLLECTION)
  const [ownedSnapshot, memberSnapshot] = await Promise.all([
    getDocsFromServer(query(surveysCollection, where('ownerUid', '==', userUid))),
    getDocsFromServer(query(surveysCollection, where(`memberUidMap.${userUid}`, '==', true))),
  ])
  return Array.from(new Map(
    [...ownedSnapshot.docs, ...memberSnapshot.docs].map((snapshotDoc) => [
      snapshotDoc.id,
      { id: snapshotDoc.id, ...snapshotDoc.data() },
    ]),
  ).values())
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))
}

export async function loadPublicStudentProfileSurvey(surveyId) {
  if (!surveyId) throw new Error('No s’ha indicat cap formulari tutorial.')
  const snapshot = await getDoc(getStudentProfileSurveyPublicDocRef(surveyId))
  if (!snapshot.exists()) throw new Error('Aquest formulari no està disponible o ja s’ha tancat.')
  const survey = snapshot.data()
  if (Date.now() >= Number(survey.expiresAtEpochMs || 0)) {
    throw new Error('Aquest formulari tutorial ha caducat.')
  }
  return { ...survey, id: normalizeFirestoreId(surveyId) }
}

export async function submitStudentProfileSurveyResponse({ answers, privacyNoticeAcknowledged, studentId, surveyId }) {
  const survey = await loadPublicStudentProfileSurvey(surveyId)
  const value = normalizeStudentProfileResponsePayload({
    response: { answers, privacyNoticeAcknowledged, studentId },
    survey,
  })
  if (!value.studentId || !value.studentName) {
    throw new Error('Selecciona el teu nom abans d’enviar el formulari.')
  }
  await setDoc(doc(getStudentProfileSurveyResponsesCollectionRef(survey.id), normalizeFirestoreId(value.studentId)), value)
  return { ...value, submittedAt: new Date().toISOString() }
}

export async function listStudentProfileSurveyResponses(surveyId) {
  if (!surveyId) return []
  const snapshot = await getDocsFromServer(query(getStudentProfileSurveyResponsesCollectionRef(surveyId), orderBy('submittedAt', 'asc')))
  return snapshot.docs.map((snapshotDoc) => {
    const value = snapshotDoc.data()
    return {
      id: snapshotDoc.id,
      ...value,
      reviewedAt: value.reviewedAt?.toDate?.().toISOString?.() || value.reviewedAt || '',
      submittedAt: value.submittedAt?.toDate?.().toISOString?.() || value.submittedAt || '',
    }
  })
}

export function subscribeToStudentProfileSurveyResponses(surveyId, onChange, onError) {
  if (!surveyId) {
    onChange?.([])
    return () => {}
  }
  const responsesQuery = query(
    getStudentProfileSurveyResponsesCollectionRef(surveyId),
    orderBy('submittedAt', 'asc'),
  )
  return onSnapshot(
    responsesQuery,
    (snapshot) => {
      onChange?.(snapshot.docs.map((snapshotDoc) => {
        const value = snapshotDoc.data()
        return {
          id: snapshotDoc.id,
          ...value,
          reviewedAt: value.reviewedAt?.toDate?.().toISOString?.() || value.reviewedAt || '',
          submittedAt: value.submittedAt?.toDate?.().toISOString?.() || value.submittedAt || '',
        }
      }))
    },
    onError,
  )
}

export async function updateStudentProfileSurveyStatus({ expiresAt, expiresAtEpochMs, status, surveyId }) {
  const now = new Date().toISOString()
  const batch = writeBatch(db)
  batch.update(getStudentProfileSurveyDocRef(surveyId), {
    expiresAt,
    expiresAtEpochMs,
    status,
    updatedAt: now,
  })
  batch.update(getStudentProfileSurveyPublicDocRef(surveyId), { expiresAt, expiresAtEpochMs })
  await batch.commit()
}

export async function markStudentProfileResponseReviewed({ reviewed, studentId, surveyId, user }) {
  if (!user?.uid) throw new Error('Cal iniciar sessió per revisar aquesta resposta.')
  await updateDoc(
    doc(getStudentProfileSurveyResponsesCollectionRef(surveyId), normalizeFirestoreId(studentId)),
    reviewed
      ? { reviewedAt: serverTimestamp(), reviewedByUid: user.uid }
      : { reviewedAt: '', reviewedByUid: '' },
  )
}

export async function updateStudentProfileSurveyResponse({ answers, studentId, surveyId, user }) {
  if (!user?.uid) throw new Error('Cal iniciar sessió per editar aquesta resposta.')
  await updateDoc(
    doc(getStudentProfileSurveyResponsesCollectionRef(surveyId), normalizeFirestoreId(studentId)),
    {
      answers,
      editedAt: serverTimestamp(),
      editedByUid: user.uid,
      reviewedAt: '',
      reviewedByUid: '',
    },
  )
}

export async function deleteStudentProfileSurveyResponse({ studentId, surveyId }) {
  await deleteDoc(doc(getStudentProfileSurveyResponsesCollectionRef(surveyId), normalizeFirestoreId(studentId)))
}

export async function deleteStudentProfileSurveyDocument({ surveyId }) {
  const responses = await getDocs(getStudentProfileSurveyResponsesCollectionRef(surveyId))
  const operations = [
    ...responses.docs.map((responseDoc) => responseDoc.ref),
    getStudentProfileSurveyPublicDocRef(surveyId),
    getStudentProfileSurveyDocRef(surveyId),
  ]
  for (let index = 0; index < operations.length; index += 450) {
    const batch = writeBatch(db)
    operations.slice(index, index + 450).forEach((ref) => batch.delete(ref))
    await batch.commit()
  }
}

export async function deleteSociometricSurveyDocument({ surveyId, user }) {
  if (!surveyId) throw new Error('No s’ha indicat cap qüestionari sociomètric.')
  if (!user?.uid) throw new Error('Cal iniciar sessió per eliminar el qüestionari.')

  const surveyRef = getSociometricSurveyDocRef(surveyId)
  const surveySnapshot = await getDoc(surveyRef)
  if (!surveySnapshot.exists()) return
  if (surveySnapshot.data().ownerUid !== user.uid) {
    throw new Error('Només el docent propietari pot eliminar les dades brutes del qüestionari.')
  }

  const [tokensSnapshot, responsesSnapshot] = await Promise.all([
    getDocs(getSociometricSurveyAccessTokensCollectionRef(surveyId)),
    getDocs(getSociometricSurveyResponsesCollectionRef(surveyId)),
  ])
  const childRefs = [
    ...tokensSnapshot.docs.map((snapshotDoc) => snapshotDoc.ref),
    ...responsesSnapshot.docs.map((snapshotDoc) => snapshotDoc.ref),
    getSociometricSurveyPublicDocRef(surveyId),
  ]

  for (let index = 0; index < childRefs.length; index += 450) {
    const batch = writeBatch(db)
    childRefs.slice(index, index + 450).forEach((childRef) => batch.delete(childRef))
    await batch.commit()
  }

  await deleteDoc(surveyRef)
}

export async function updateSociometricSurveySyncMeta({
  importedRelationCount = 0,
  lastSyncedAt = new Date().toISOString(),
  responseCount = 0,
  surveyId,
} = {}) {
  if (!surveyId) throw new Error('No s’ha indicat cap qüestionari sociomètric.')

  const now = new Date().toISOString()
  const value = cleanForFirestore({
    importedRelationCount: Math.max(0, Number(importedRelationCount) || 0),
    lastSyncedAt,
    responseCount: Math.max(0, Number(responseCount) || 0),
    updatedAt: now,
  })
  await setDoc(getSociometricSurveyDocRef(surveyId), value, { merge: true })
  return value
}

export async function updateSociometricSurveyDocumentStatus({
  accessTokens = [],
  expiresAt = '',
  expiresAtEpochMs = 0,
  status,
  surveyId,
}) {
  if (!surveyId || !['active', 'closed'].includes(status)) return null

  const value = cleanForFirestore({
    ...(status === 'active' ? { expiresAt, expiresAtEpochMs } : {}),
    status,
    updatedAt: new Date().toISOString(),
  })
  const batch = writeBatch(db)
  batch.set(getSociometricSurveyDocRef(surveyId), value, { merge: true })
  if (status === 'active') {
    batch.set(
      getSociometricSurveyPublicDocRef(surveyId),
      cleanForFirestore({ expiresAt, expiresAtEpochMs }),
      { merge: true },
    )
    accessTokens.forEach((access) => {
      const tokenId = normalizeFirestoreId(access.token)
      if (!tokenId) return
      batch.set(
        doc(getSociometricSurveyAccessTokensCollectionRef(surveyId), tokenId),
        cleanForFirestore({ expiresAt, expiresAtEpochMs }),
        { merge: true },
      )
    })
  }
  await batch.commit()
  return value
}

export async function saveCloudCollections(uid, dataset, collectionsToSave = COLLECTIONS, meta = {}) {
  if (!uid) throw new Error('Cal iniciar sessió amb Google abans de guardar al núvol.')

  const userValue = cleanForFirestore({
    email: meta.user?.email || '',
    displayName: meta.user?.displayName || '',
  })
  const userWritten = await setDocumentIfChanged(getUserDocRef(uid), userValue)
  const collectionStats = []

  for (const collectionName of collectionsToSave) {
    const rows =
      collectionName === SOCIOMETRIC_SURVEYS_COLLECTION
        ? removeExpiredSociometricSurveys(dataset[collectionName])
        : dataset[collectionName] || []
    collectionStats.push(await replaceCloudCollection(uid, collectionName, rows))
  }

  const totals = collectionStats.reduce(
    (result, stats) => ({
      read: result.read + stats.read,
      written: result.written + stats.written,
      deleted: result.deleted + stats.deleted,
      skipped: result.skipped + stats.skipped,
    }),
    { read: 0, written: 0, deleted: 0, skipped: 0 },
  )
  const hasRowChanges = totals.written + totals.deleted > 0
  const metaValue = cleanForFirestore({
    app: 'avaluapro-v2',
    version: 2,
    profile: meta.profile || {},
    preferences: meta.preferences || {},
    collections: COLLECTIONS,
  })
  const metaWritten = hasRowChanges ? await setDocumentIfChanged(getMetaDocRef(uid), metaValue) : false

  return {
    collections: collectionStats,
    totals,
    metadataWrites: Number(userWritten) + Number(metaWritten),
  }
}

export async function saveCloudOperations(uid, operations = [], meta = {}) {
  if (!uid) throw new Error('Cal iniciar sessió amb Google abans de guardar al núvol.')
  const validOperations = operations.filter(
    (operation) =>
      operation?.uid === uid &&
      COLLECTIONS.includes(operation.collectionName) &&
      operation.documentId &&
      ['upsert', 'delete'].includes(operation.operation),
  )
  if (validOperations.length === 0) {
    return {
      collections: [],
      totals: { read: 0, written: 0, deleted: 0, skipped: 0 },
      metadataWrites: 0,
    }
  }

  const userValue = cleanForFirestore({
    email: meta.user?.email || '',
    displayName: meta.user?.displayName || '',
  })
  const userWritten = await setDocumentIfChanged(getUserDocRef(uid), userValue)
  const statsByCollection = new Map()
  const firestoreOperations = validOperations.map((operation) => {
    const stats = statsByCollection.get(operation.collectionName) || {
      collection: operation.collectionName,
      read: 0,
      written: 0,
      deleted: 0,
      skipped: 0,
    }
    if (operation.operation === 'delete') stats.deleted += 1
    else stats.written += 1
    statsByCollection.set(operation.collectionName, stats)

    const reference = doc(getCollectionRef(uid, operation.collectionName), operation.documentId)
    if (operation.operation === 'delete') return { id: operation.id, type: 'delete', reference }
    const value = cleanForFirestore({ ...operation.value, id: operation.documentId })
    assertFirestoreDocumentSize(operation.collectionName, operation.documentId, value)
    return { id: operation.id, type: 'set', reference, value }
  })

  const successfulOperationIds = []
  const buildOperationError = (error, failedOperationIds) => {
    const operationError = new Error(error?.message || 'No s’han pogut sincronitzar algunes dades.', { cause: error })
    operationError.code = error?.code || ''
    operationError.successfulOperationIds = [...successfulOperationIds]
    operationError.failedOperationIds = failedOperationIds
    return operationError
  }
  for (let index = 0; index < firestoreOperations.length; index += 450) {
    const operationBatch = firestoreOperations.slice(index, index + 450)
    const batch = writeBatch(db)
    operationBatch.forEach((operation) => {
      if (operation.type === 'delete') batch.delete(operation.reference)
      else batch.set(operation.reference, operation.value)
    })
    try {
      await batch.commit()
      successfulOperationIds.push(...operationBatch.map((operation) => operation.id))
    } catch (error) {
      const code = String(error?.code || '').toLowerCase()
      const transientError =
        isFirestoreQuotaError(error) ||
        ['aborted', 'cancelled', 'deadline-exceeded', 'internal', 'resource-exhausted', 'unauthenticated', 'unavailable']
          .some((value) => code.includes(value))
      if (transientError) {
        throw buildOperationError(error, operationBatch.map((operation) => operation.id))
      }

      const failedOperationIds = []
      for (const operation of operationBatch) {
        try {
          if (operation.type === 'delete') await deleteDoc(operation.reference)
          else await setDoc(operation.reference, operation.value)
          successfulOperationIds.push(operation.id)
        } catch {
          failedOperationIds.push(operation.id)
        }
      }
      if (failedOperationIds.length > 0) {
        throw buildOperationError(error, failedOperationIds)
      }
    }
  }

  const metaValue = cleanForFirestore({
    app: 'avaluapro-v2',
    version: 2,
    profile: meta.profile || {},
    preferences: meta.preferences || {},
    collections: COLLECTIONS,
  })
  let metaWritten = false
  let metadataError = ''
  try {
    metaWritten = await setDocumentIfChanged(getMetaDocRef(uid), metaValue)
  } catch (error) {
    metadataError = String(error?.code || error?.name || 'metadata-sync-error')
  }
  const collections = Array.from(statsByCollection.values())
  const totals = collections.reduce(
    (result, stats) => ({
      read: 0,
      written: result.written + stats.written,
      deleted: result.deleted + stats.deleted,
      skipped: 0,
    }),
    { read: 0, written: 0, deleted: 0, skipped: 0 },
  )

  return {
    collections,
    totals,
    metadataWrites: Number(userWritten) + Number(metaWritten),
    metadataError,
  }
}

export async function loadCloudWorkspace(uid) {
  if (!uid) throw new Error('Cal iniciar sessió amb Google abans de carregar dades del núvol.')

  const [metaSnapshot, entries] = await Promise.all([
    getDocFromServer(getMetaDocRef(uid)),
    Promise.all(
      COLLECTIONS.map(async (collectionName) => {
        const snapshot = await getDocsFromServer(getCollectionRef(uid, collectionName))
        return [
          collectionName,
          snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() })),
        ]
      }),
    ),
  ])

  const dataset = entries.reduce(
    (nextDataset, [collectionName, rows]) => ({ ...nextDataset, [collectionName]: rows }),
    {},
  )

  return {
    dataset,
    exists: metaSnapshot.exists() || entries.some(([, rows]) => rows.length > 0),
    meta: metaSnapshot.exists() ? metaSnapshot.data() : null,
  }
}

export async function loadCloudDataset(uid) {
  const workspace = await loadCloudWorkspace(uid)
  return workspace.dataset
}

export async function saveCloudBackup(uid, backup, meta = {}) {
  if (!uid) throw new Error('Cal iniciar sessió amb Google abans de crear una còpia al núvol.')

  const backupId = `backup_${Date.now()}`
  const collections = backup?.collections || {}
  const createdAt = new Date().toISOString()
  const counts = COLLECTIONS.reduce(
    (summary, collectionName) => ({
      ...summary,
      [collectionName]: collections[collectionName]?.length || 0,
    }),
    {},
  )

  await setDoc(
    getCloudBackupDocRef(uid, backupId),
    cleanForFirestore({
      id: backupId,
      app: backup?.app || 'avaluapro-v2',
      version: backup?.version || 2,
      exportedAt: backup?.exportedAt || createdAt,
      createdAt,
      label: meta.label || 'Còpia de seguretat al núvol',
      reason: meta.reason || 'manual',
      fingerprint: meta.fingerprint || '',
      profile: backup?.profile || {},
      preferences: backup?.preferences || {},
      counts,
    }),
  )

  for (const collectionName of COLLECTIONS) {
    await saveBackupRows(uid, backupId, collectionName, collections[collectionName] || [])
  }

  return {
    id: backupId,
    createdAt,
    label: meta.label || 'Còpia de seguretat al núvol',
    reason: meta.reason || 'manual',
    fingerprint: meta.fingerprint || '',
    counts,
  }
}

export async function listCloudBackups(uid, maxItems = 5) {
  if (!uid) return []
  const backupsQuery = query(getCloudBackupCollectionRef(uid), orderBy('createdAt', 'desc'), limit(maxItems))
  const snapshot = await getDocs(backupsQuery)
  return snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() }))
}

export async function loadCloudBackup(uid, backupId) {
  if (!uid) throw new Error('Cal iniciar sessió amb Google abans de restaurar una còpia al núvol.')
  if (!backupId) throw new Error('No s’ha indicat quina còpia al núvol cal restaurar.')

  const backupDoc = await getDoc(getCloudBackupDocRef(uid, backupId))
  if (!backupDoc.exists()) throw new Error('No s’ha trobat aquesta còpia al núvol.')

  const meta = backupDoc.data()
  const entries = await Promise.all(
    COLLECTIONS.map(async (collectionName) => {
      const snapshot = await getDocs(collection(db, 'users', uid, 'cloudBackups', backupId, collectionName))
      return [
        collectionName,
        snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() })),
      ]
    }),
  )

  return {
    app: meta.app || 'avaluapro-v2',
    version: meta.version || 2,
    exportedAt: meta.exportedAt || meta.createdAt,
    profile: meta.profile || {},
    preferences: meta.preferences || {},
    collections: entries.reduce((dataset, [collectionName, rows]) => ({ ...dataset, [collectionName]: rows }), {}),
  }
}

export async function sendTeacherGradePackage({ packageData, recipientEmail, user }) {
  if (!user?.uid) throw new Error('Cal iniciar sessió amb Google abans d’enviar notes al tutor.')

  const cleanRecipientEmail = String(recipientEmail || '').trim().toLowerCase()
  if (!cleanRecipientEmail || !cleanRecipientEmail.includes('@')) {
    throw new Error('Cal indicar el correu complet del tutor destinatari.')
  }

  const cleanPackageData = cleanForFirestore(packageData)
  const packageId = String(packageData?.id || `teacher_package_${Date.now()}`).replaceAll('/', '_')
  const createdAt = new Date().toISOString()
  const value = cleanForFirestore({
    id: packageId,
    createdAt,
    importedAt: '',
    packageData: cleanPackageData,
    recipientEmailLower: cleanRecipientEmail,
    senderEmail: user.email || '',
    senderName: user.displayName || '',
    senderUid: user.uid,
    status: 'sent',
    updatedAt: createdAt,
  })

  assertFirestoreDocumentSize('teacherGradePackages', packageId, value)
  await setDoc(getTeacherGradePackageDocRef(packageId), value)

  return {
    createdAt,
    id: packageId,
    recipientEmailLower: cleanRecipientEmail,
    status: 'sent',
  }
}

export async function listReceivedTeacherGradePackages(userEmail, maxItems = 20) {
  const cleanEmail = String(userEmail || '').trim().toLowerCase()
  if (!cleanEmail) return []

  const packagesQuery = query(getTeacherGradePackageCollectionRef(), where('recipientEmailLower', '==', cleanEmail))
  const snapshot = await getDocs(packagesQuery)

  return snapshot.docs
    .map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() }))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .slice(0, maxItems)
}

export async function listSentTeacherGradePackages(uid, maxItems = 20) {
  if (!uid) return []

  const packagesQuery = query(getTeacherGradePackageCollectionRef(), where('senderUid', '==', uid))
  const snapshot = await getDocs(packagesQuery)

  return snapshot.docs
    .map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() }))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .slice(0, maxItems)
}

export async function markTeacherGradePackageImported({ packageId, userEmail }) {
  const cleanEmail = String(userEmail || '').trim().toLowerCase()
  if (!packageId || !cleanEmail) return

  const packageRef = getTeacherGradePackageDocRef(packageId)
  const packageSnapshot = await getDoc(packageRef)
  if (!packageSnapshot.exists()) throw new Error('No s’ha trobat aquest paquet de notes.')
  const packageMeta = packageSnapshot.data()
  if (packageMeta.recipientEmailLower !== cleanEmail) {
    throw new Error('Aquest paquet de notes no està adreçat al teu compte.')
  }

  const now = new Date().toISOString()
  await setDoc(
    packageRef,
    cleanForFirestore({
      importedByEmail: auth.currentUser?.email || cleanEmail,
      importedByUid: auth.currentUser?.uid || '',
      importedAt: now,
      status: 'imported',
      updatedAt: now,
    }),
    { merge: true },
  )
}

export async function listTutoringSpacesForUser(userEmail, maxItems = 20) {
  const cleanEmail = normalizeEmail(userEmail)
  if (!cleanEmail) return []

  const spacesQuery = query(getTutoringSpaceCollectionRef(), where('memberEmails', 'array-contains', cleanEmail))
  const snapshot = await getDocs(spacesQuery)

  return snapshot.docs
    .map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() }))
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))
    .slice(0, maxItems)
}

export async function sendTutoringInvitation({ classItem, recipientEmail, spaceId, user }) {
  if (!user?.uid || !user?.email) {
    throw new Error('Cal iniciar sessió amb Google abans d’enviar una invitació de cotutoria.')
  }
  const cleanRecipientEmail = normalizeEmail(recipientEmail)
  if (!cleanRecipientEmail || !cleanRecipientEmail.includes('@')) {
    throw new Error('Cal indicar un correu complet del cotutor.')
  }
  if (!spaceId) throw new Error('No s’ha indicat cap espai de tutoria compartida.')

  const now = new Date().toISOString()
  const value = cleanForFirestore({
    className: classItem?.name || 'Tutoria compartida',
    createdAt: now,
    id: spaceId,
    outboxId: getTutoringInvitationOutboxId(cleanRecipientEmail, spaceId),
    recipientEmailLower: cleanRecipientEmail,
    respondedAt: '',
    responseByEmail: '',
    responseByUid: '',
    senderEmail: user.email,
    senderEmailLower: normalizeEmail(user.email),
    senderName: user.displayName || user.email,
    senderSeenAt: '',
    senderUid: user.uid,
    sourceClassId: classItem?.id || '',
    spaceId,
    status: 'pending',
    updatedAt: now,
  })

  assertFirestoreDocumentSize(`tutoringInvitationInbox/${cleanRecipientEmail}/items`, spaceId, value)
  await setDoc(getTutoringInvitationDocRef(cleanRecipientEmail, spaceId), value, { merge: true })
  await setDoc(getTutoringInvitationOutboxDocRef(user.uid, cleanRecipientEmail, spaceId), value, { merge: true })
  return value
}

export async function listReceivedTutoringInvitations(userEmail, maxItems = 20) {
  const cleanEmail = normalizeEmail(userEmail)
  if (!cleanEmail) return []

  const snapshot = await getDocs(getTutoringInvitationCollectionRef(cleanEmail))
  return snapshot.docs
    .map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() }))
    .filter((invitation) => invitation.status === 'pending')
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))
    .slice(0, maxItems)
}

export async function listSentTutoringInvitationUpdates(userUid, maxItems = 20) {
  if (!userUid) return []

  try {
    const snapshot = await getDocs(getTutoringInvitationOutboxCollectionRef(userUid))
    return snapshot.docs
      .map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() }))
      .filter((invitation) => ['accepted', 'rejected'].includes(invitation.status) && !invitation.senderSeenAt)
      .sort((a, b) =>
        String(b.respondedAt || b.updatedAt || b.createdAt || '').localeCompare(
          String(a.respondedAt || a.updatedAt || a.createdAt || ''),
        ),
      )
      .slice(0, maxItems)
  } catch (error) {
    console.warn('No s’han pogut carregar els avisos de resposta de cotutoria.', error)
    return []
  }
}

export async function respondTutoringInvitation({ recipientEmail, spaceId, status, user }) {
  if (!user?.uid || !user?.email) {
    throw new Error('Cal iniciar sessió amb Google abans de respondre una invitació de cotutoria.')
  }
  const cleanRecipientEmail = normalizeEmail(recipientEmail || user.email)
  if (!spaceId || !cleanRecipientEmail) throw new Error('No s’ha trobat aquesta invitació de cotutoria.')
  if (!['accepted', 'rejected'].includes(status)) throw new Error('Resposta de cotutoria no vàlida.')

  const invitationRef = getTutoringInvitationDocRef(cleanRecipientEmail, spaceId)
  const invitationSnapshot = await getDoc(invitationRef)
  if (!invitationSnapshot.exists()) throw new Error('No s’ha trobat aquesta invitació de cotutoria.')
  const invitation = { id: invitationSnapshot.id, ...invitationSnapshot.data() }
  if (invitation.recipientEmailLower !== cleanRecipientEmail) {
    throw new Error('Aquesta invitació no està adreçada al teu compte.')
  }

  const now = new Date().toISOString()
  await setDoc(
    invitationRef,
    cleanForFirestore({
      respondedAt: now,
      responseByEmail: user.email,
      responseByUid: user.uid,
      status,
      updatedAt: now,
    }),
    { merge: true },
  )

  await setDoc(
    getTutoringInvitationOutboxDocRef(invitation.senderUid, cleanRecipientEmail, spaceId),
    cleanForFirestore({
      respondedAt: now,
      responseByEmail: user.email,
      responseByUid: user.uid,
      status,
      updatedAt: now,
    }),
    { merge: true },
  )

  if (status === 'rejected') {
    return { ...invitation, respondedAt: now, responseByEmail: user.email, responseByUid: user.uid, status }
  }

  await setDoc(
    getTutoringSpaceDocRef(spaceId),
    {
      memberEmails: arrayUnion(cleanRecipientEmail),
      memberUids: arrayUnion(user.uid),
      members: arrayUnion({
        emailLower: cleanRecipientEmail,
        role: 'tutor',
        uid: user.uid,
      }),
      updatedAt: now,
    },
    { merge: true },
  )

  return loadTutoringSpace(spaceId)
}

export async function acknowledgeTutoringInvitationUpdate({ recipientEmail, spaceId, user }) {
  if (!user?.uid) return
  const cleanRecipientEmail = normalizeEmail(recipientEmail)
  if (!spaceId || !cleanRecipientEmail) return

  await setDoc(
    getTutoringInvitationOutboxDocRef(user.uid, cleanRecipientEmail, spaceId),
    cleanForFirestore({
      senderSeenAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    { merge: true },
  )
}

export async function removeTutoringSpaceMember({ memberEmail, spaceId, user }) {
  if (!user?.uid || !user?.email) {
    throw new Error('Cal iniciar sessió amb Google abans de retirar un cotutor.')
  }
  const cleanMemberEmail = normalizeEmail(memberEmail)
  if (!spaceId || !cleanMemberEmail) throw new Error('No s’ha indicat quin cotutor cal retirar.')

  const spaceRef = getTutoringSpaceDocRef(spaceId)
  const snapshot = await getDoc(spaceRef)
  if (!snapshot.exists()) throw new Error('No s’ha trobat aquesta tutoria compartida.')
  const space = { id: snapshot.id, ...snapshot.data() }
  if (space.ownerUid !== user.uid && normalizeEmail(space.ownerEmailLower) !== normalizeEmail(user.email)) {
    throw new Error('Només el propietari de la tutoria pot retirar cotutors.')
  }
  if (cleanMemberEmail === normalizeEmail(space.ownerEmailLower)) {
    throw new Error('El propietari no es pot retirar de la seva pròpia tutoria.')
  }

  const targetMembers = (space.members || []).filter(
    (member) => normalizeEmail(member.emailLower || member.email) === cleanMemberEmail,
  )
  const targetUids = new Set(targetMembers.map((member) => String(member.uid || '').trim()).filter(Boolean))
  const nextMemberEmails = (space.memberEmails || []).filter((email) => normalizeEmail(email) !== cleanMemberEmail)
  const nextMemberUids = (space.memberUids || []).filter((uid) => !targetUids.has(String(uid || '').trim()))
  const nextMembers = (space.members || []).filter(
    (member) => normalizeEmail(member.emailLower || member.email) !== cleanMemberEmail,
  )
  const now = new Date().toISOString()

  await Promise.all([
    deleteDoc(getTutoringInvitationDocRef(cleanMemberEmail, spaceId)),
    deleteDoc(getTutoringInvitationOutboxDocRef(user.uid, cleanMemberEmail, spaceId)),
  ])

  await setDoc(
    spaceRef,
    cleanForFirestore({
      memberEmails: nextMemberEmails,
      memberUids: nextMemberUids,
      members: nextMembers,
      updatedAt: now,
    }),
    { merge: true },
  )

  return {
    ...space,
    memberEmails: nextMemberEmails,
    memberUids: nextMemberUids,
    members: nextMembers,
    updatedAt: now,
  }
}

export async function leaveTutoringSpace({ spaceId, user }) {
  if (!user?.uid || !user?.email) {
    throw new Error('Cal iniciar sessió amb Google abans d’abandonar una cotutoria.')
  }
  if (!spaceId) throw new Error('No s’ha indicat quina cotutoria vols abandonar.')

  const spaceRef = getTutoringSpaceDocRef(spaceId)
  const snapshot = await getDoc(spaceRef)
  if (!snapshot.exists()) throw new Error('No s’ha trobat aquesta tutoria compartida.')
  const space = { id: snapshot.id, ...snapshot.data() }
  const cleanUserEmail = normalizeEmail(user.email)
  if (space.ownerUid === user.uid || normalizeEmail(space.ownerEmailLower) === cleanUserEmail) {
    throw new Error('El propietari no pot abandonar la tutoria sense transferir-la o eliminar-la.')
  }

  const nextMemberEmails = (space.memberEmails || []).filter((email) => normalizeEmail(email) !== cleanUserEmail)
  const nextMemberUids = (space.memberUids || []).filter((uid) => String(uid || '').trim() !== user.uid)
  const nextMembers = (space.members || []).filter((member) => {
    const memberEmail = normalizeEmail(member.emailLower || member.email)
    return memberEmail !== cleanUserEmail && String(member.uid || '').trim() !== user.uid
  })
  const now = new Date().toISOString()

  await deleteDoc(getTutoringInvitationDocRef(cleanUserEmail, spaceId))
  await setDoc(
    spaceRef,
    cleanForFirestore({
      memberEmails: nextMemberEmails,
      memberUids: nextMemberUids,
      members: nextMembers,
      updatedAt: now,
    }),
    { merge: true },
  )

  return {
    ...space,
    memberEmails: nextMemberEmails,
    memberUids: nextMemberUids,
    members: nextMembers,
    updatedAt: now,
  }
}

export async function tombstoneTutoringSpaceRow({
  classId,
  collectionName,
  documentId,
  spaceId,
  user,
}) {
  if (!user?.uid || !user?.email) {
    throw new Error('Cal iniciar sessió amb Google abans d’eliminar dades d’una cotutoria compartida.')
  }
  if (!SHARED_TUTORING_COLLECTIONS.includes(collectionName)) {
    throw new Error('Aquesta col·lecció no forma part de la cotutoria compartida.')
  }
  if (!spaceId || !documentId) throw new Error('No s’ha pogut identificar la dada compartida que cal eliminar.')

  const deletedAt = new Date().toISOString()
  const safeDocumentId = String(documentId).replaceAll('/', '_')
  const value = cleanForFirestore({
    classId: classId || '',
    id: safeDocumentId,
    sharedDeletedAt: deletedAt,
    sharedDeletedByEmail: normalizeEmail(user.email),
    sharedDeletedByUid: user.uid,
    sharedUpdatedAt: deletedAt,
    sharedUpdatedByEmail: normalizeEmail(user.email),
    sharedUpdatedByUid: user.uid,
  })

  await setDoc(doc(db, 'tutoringSpaces', spaceId, collectionName, safeDocumentId), value)
  await publishTutoringChangeSignal({
    changeCollections: [collectionName],
    changedAt: deletedAt,
    spaceId,
    user,
  })
  return value
}

export async function saveTutoringSpace({
  changeCollections = [],
  classItem,
  dataset,
  memberEmails = [],
  spaceId,
  skipExistingRead = false,
  user,
}) {
  if (!user?.uid || !user?.email) {
    throw new Error('Cal iniciar sessió amb Google abans de compartir una tutoria.')
  }
  if (!spaceId) throw new Error('No s’ha indicat cap espai de tutoria compartida.')

  const spaceRef = getTutoringSpaceDocRef(spaceId)
  let existing = null
  if (!skipExistingRead) {
    try {
      const existingSnapshot = await getDoc(spaceRef)
      existing = existingSnapshot.exists() ? existingSnapshot.data() : null
    } catch (error) {
      throw new Error(
        'No s’ha pogut llegir la tutoria compartida. Comprova que aquest compte encara hi tingui accés.',
        { cause: error },
      )
    }
  }
  const now = new Date().toISOString()
  const cleanOwnerEmail = normalizeEmail(existing?.ownerEmailLower || user.email)
  const cleanMembers = mergeMemberEmails(existing?.memberEmails || [], memberEmails, [user.email])
  const membersByEmail = new Map()
  ;(existing?.members || []).forEach((member) => {
    const email = normalizeEmail(member.emailLower || member.email)
    if (email) membersByEmail.set(email, { ...member, emailLower: email })
  })
  cleanMembers.forEach((email) => {
    const existingMember = membersByEmail.get(email)
    membersByEmail.set(email, {
      emailLower: email,
      invitedAt: existingMember?.invitedAt || now,
      role: existingMember?.role || 'tutor',
      uid: email === normalizeEmail(user.email) ? user.uid : existingMember?.uid || '',
    })
  })
  const memberUids = Array.from(
    new Set([
      ...(Array.isArray(existing?.memberUids) ? existing.memberUids : []),
      user.uid,
      ...Array.from(membersByEmail.values()).map((member) => member.uid || ''),
    ]),
  ).filter(Boolean)

  const value = cleanForFirestore({
    className: classItem?.name || existing?.className || 'Tutoria compartida',
    createdAt: existing?.createdAt || now,
    id: spaceId,
    lastSharedConflictAt: existing?.lastSharedConflictAt || '',
    memberEmails: cleanMembers,
    memberUids,
    members: Array.from(membersByEmail.values()),
    ownerEmailLower: cleanOwnerEmail,
    ownerUid: existing?.ownerUid || user.uid,
    sharedConflictSummary: existing?.sharedConflictSummary || { count: 0, examples: [] },
    sharedSummary: buildTutoringSpaceSummary(dataset),
    sourceClassId: existing?.sourceClassId || classItem?.id || '',
    status: 'active',
    updatedAt: now,
  })

  assertFirestoreDocumentSize('tutoringSpaces', spaceId, value)
  try {
    await setDoc(spaceRef, value, { merge: true })
  } catch (error) {
    throw new Error(
      skipExistingRead
        ? 'No s’ha pogut crear la tutoria compartida. Revisa que hagis iniciat sessió i que el correu del cotutor sigui correcte.'
        : 'No s’ha pogut actualitzar la tutoria compartida. Revisa que aquest compte encara hi tingui accés.',
      { cause: error },
    )
  }

  const syncResults = []
  try {
    for (const collectionName of SHARED_TUTORING_COLLECTIONS) {
      syncResults.push(
        await mergeTutoringSpaceCollection(spaceId, collectionName, dataset?.[collectionName] || [], {
          now,
          user,
        }),
      )
    }
  } catch (error) {
    throw new Error(
      'La tutoria compartida s’ha creat, però no s’han pogut sincronitzar totes les dades. Torna-ho a provar amb el botó de sincronitzar.',
      { cause: error },
    )
  }

  const conflicts = syncResults.flatMap((result) => result.conflicts || [])
  const sharedConflictSummary = {
    count: conflicts.length,
    examples: conflicts.slice(0, 6),
  }
  const valueWithConflictSummary = {
    ...value,
    lastSharedConflictAt: conflicts.length > 0 ? now : '',
    sharedConflictSummary,
  }

  if (conflicts.length > 0 || existing?.sharedConflictSummary?.count > 0) {
    await setDoc(
      spaceRef,
      cleanForFirestore({
        lastSharedConflictAt: valueWithConflictSummary.lastSharedConflictAt,
        sharedConflictSummary,
        updatedAt: now,
      }),
      { merge: true },
    )
  }

  const writtenCollections = new Set(
    syncResults.filter((result) => result.writtenCount > 0).map((result) => result.collectionName),
  )
  const changeSignal = await publishTutoringChangeSignal({
    changeCollections: changeCollections.filter((collectionName) => writtenCollections.has(collectionName)),
    changedAt: now,
    spaceId,
    user,
  })

  return { ...valueWithConflictSummary, changeSignal }
}

export async function loadTutoringSpace(spaceId) {
  if (!spaceId) throw new Error('No s’ha indicat quin espai de tutoria cal carregar.')
  const spaceSnapshot = await getDoc(getTutoringSpaceDocRef(spaceId))
  if (!spaceSnapshot.exists()) throw new Error('No s’ha trobat aquesta tutoria compartida.')
  const space = { id: spaceSnapshot.id, ...spaceSnapshot.data() }
  const entries = await Promise.all(
    SHARED_TUTORING_COLLECTIONS.map(async (collectionName) => {
      const snapshot = await getDocs(collection(db, 'tutoringSpaces', spaceId, collectionName))
      return [
        collectionName,
        snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() })),
      ]
    }),
  )
  const changeSignalsSnapshot = await getDocs(collection(db, 'tutoringSpaces', spaceId, 'changeSignals'))

  return {
    ...space,
    changeSignals: changeSignalsSnapshot.docs.map((snapshotDoc) => ({
      id: snapshotDoc.id,
      ...snapshotDoc.data(),
    })),
    collections: entries.reduce((dataset, [collectionName, rows]) => ({ ...dataset, [collectionName]: rows }), {}),
  }
}

function getTutoringCoordinationCollectionRef(spaceId) {
  return collection(db, 'tutoringSpaces', spaceId, TUTORING_COORDINATION_ITEMS_COLLECTION)
}

function getTutoringCoordinationMemberStateCollectionRef(spaceId) {
  return collection(db, 'tutoringSpaces', spaceId, TUTORING_COORDINATION_MEMBER_STATES_COLLECTION)
}

function stripLocalCoordinationFields(item = {}) {
  const value = { ...item }
  delete value.syncStatus
  delete value.syncError
  return value
}

export function subscribeToTutoringCoordinationItems(spaceId, onChange, onError) {
  if (!spaceId) return () => {}
  return onSnapshot(
    query(getTutoringCoordinationCollectionRef(spaceId), orderBy('createdAt', 'asc'), limit(300)),
    (snapshot) => {
      onChange(snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data(), spaceId })))
    },
    onError,
  )
}

export function subscribeToTutoringCoordinationMemberStates(spaceId, onChange, onError) {
  if (!spaceId) return () => {}
  return onSnapshot(
    getTutoringCoordinationMemberStateCollectionRef(spaceId),
    (snapshot) => {
      onChange(snapshot.docs.map((snapshotDoc) => ({ uid: snapshotDoc.id, ...snapshotDoc.data(), spaceId })))
    },
    onError,
  )
}

export async function saveTutoringCoordinationItem({ item, spaceId }) {
  if (!auth.currentUser?.uid || !auth.currentUser?.email) {
    throw new Error('Cal iniciar sessió abans d’escriure a la coordinació de cotutoria.')
  }
  if (!spaceId || !item?.id) throw new Error('No s’ha pogut identificar el missatge de cotutoria.')
  const value = cleanForFirestore(stripLocalCoordinationFields({ ...item, spaceId: undefined }))
  assertFirestoreDocumentSize(`tutoringSpaces/${spaceId}/coordinationItems`, item.id, value)
  await setDoc(doc(getTutoringCoordinationCollectionRef(spaceId), item.id), value)
  return { ...item, syncStatus: 'synced' }
}

export async function saveTutoringCoordinationMemberState({ spaceId, state }) {
  if (!auth.currentUser?.uid || !auth.currentUser?.email) {
    throw new Error('Cal iniciar sessió abans d’actualitzar els avisos de cotutoria.')
  }
  if (!spaceId || !state?.uid) throw new Error('No s’ha pogut identificar l’estat personal de cotutoria.')
  await setDoc(doc(getTutoringCoordinationMemberStateCollectionRef(spaceId), state.uid), cleanForFirestore(state))
  return state
}

export function subscribeToTutoringSpaceChangeSignals(spaceId, onChange, onError) {
  if (!spaceId) {
    onChange?.([])
    return () => {}
  }

  return onSnapshot(
    collection(db, 'tutoringSpaces', spaceId, 'changeSignals'),
    (snapshot) => {
      onChange?.(snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() })))
    },
    onError,
  )
}

export async function syncTutoringSpaceCollection({ collectionName, rows = [], spaceId, user }) {
  if (!user?.uid || !user?.email) {
    throw new Error('Cal iniciar sessió amb Google abans de sincronitzar la tutoria compartida.')
  }
  if (!spaceId || !SHARED_TUTORING_COLLECTIONS.includes(collectionName)) {
    throw new Error('No s’ha pogut identificar la col·lecció de tutoria compartida.')
  }

  return mergeTutoringSpaceCollection(spaceId, collectionName, rows, {
    now: new Date().toISOString(),
    user,
  })
}

export async function deleteCloudCollection(uid, collectionName) {
  const snapshot = await getDocs(getCollectionRef(uid, collectionName))
  await Promise.all(snapshot.docs.map((snapshotDoc) => deleteDoc(snapshotDoc.ref)))
}


export function isFeedbackAdmin(user) {
  return user?.email === 'mperezc@educand.ad'
}

export async function sendFeedback({ category, message, name }) {
  const user = auth.currentUser
  if (!user?.email || !user.emailVerified) {
    throw new Error('Inicia sessió amb Google per enviar el missatge.')
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('No tens connexió. El text es conserva; torna-ho a provar quan recuperis internet.')
  }
  await addDoc(collection(db, 'feedbackMessages'), {
    category,
    message: message.trim(),
    name: name.trim(),
    senderUid: user.uid,
    senderEmail: user.email,
    createdAt: serverTimestamp(),
    status: 'new',
  })
}

export function subscribeFeedback(onMessages, onError) {
  return onSnapshot(query(collection(db, 'feedbackMessages'), orderBy('createdAt', 'desc')), (snapshot) => {
    onMessages(snapshot.docs.map((item) => ({ ...item.data(), id: item.id })))
  }, onError)
}

export async function markFeedbackRead(id) {
  await updateDoc(doc(db, 'feedbackMessages', id), { status: 'read' })
}

export function subscribeInternalMessages(userEmail, callback, onError) {
  const cleanEmail = normalizeEmail(userEmail)
  if (!cleanEmail) {
    callback([])
    return () => {}
  }

  return onSnapshot(
    query(collection(db, 'internalMessages'), where('participantEmails', 'array-contains', cleanEmail)),
    (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    onError,
  )
}

export function subscribeInternalAnnouncements(callback, onError) {
  return onSnapshot(
    collection(db, 'internalAnnouncements'),
    (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    onError,
  )
}

export function subscribeInternalMessageState(userUid, callback, onError) {
  if (!userUid) {
    callback({})
    return () => {}
  }

  return onSnapshot(
    getInternalMessageStateDocRef(userUid),
    (snapshot) => callback(snapshot.exists() ? snapshot.data() : {}),
    onError,
  )
}

export async function sendInternalMessage({ message, recipientEmail, user }) {
  if (!user?.uid || !user?.email) {
    throw new Error('Cal iniciar sessió amb Google abans d’enviar un missatge.')
  }
  const senderEmailLower = normalizeEmail(user.email)
  const recipientEmailLower = normalizeEmail(recipientEmail)
  const body = String(message || '').trim()
  if (!recipientEmailLower || !recipientEmailLower.includes('@')) {
    throw new Error('Cal indicar un correu complet del destinatari.')
  }
  if (recipientEmailLower === senderEmailLower) {
    throw new Error('No et pots enviar un missatge a tu mateix.')
  }
  if (!body) throw new Error('Escriu un missatge abans d’enviar-lo.')
  if (body.length > 2000) throw new Error('El missatge no pot superar els 2.000 caràcters.')

  return addDoc(collection(db, 'internalMessages'), cleanForFirestore({
    body,
    createdAt: serverTimestamp(),
    participantEmails: [senderEmailLower, recipientEmailLower].sort(),
    readAt: null,
    recipientEmailLower,
    senderEmail: user.email,
    senderEmailLower,
    senderName: user.displayName || user.email.split('@')[0],
    senderUid: user.uid,
    status: 'unread',
  }))
}

export async function markInternalMessagesRead(messages, user) {
  if (!user?.uid || !user?.email) return
  const cleanEmail = normalizeEmail(user.email)
  const unread = (messages || []).filter(
    (item) => item.recipientEmailLower === cleanEmail && item.status === 'unread',
  )
  if (unread.length === 0) return

  for (let offset = 0; offset < unread.length; offset += 400) {
    const batch = writeBatch(db)
    unread.slice(offset, offset + 400).forEach((item) => {
      batch.update(doc(db, 'internalMessages', item.id), {
        readAt: serverTimestamp(),
        status: 'read',
      })
    })
    await batch.commit()
  }
}

export async function sendInternalAnnouncement({ message, user }) {
  if (!user?.uid || normalizeEmail(user.email) !== 'mperezc@educand.ad') {
    throw new Error('Només l’administrador d’AvaluaPro pot enviar avisos generals.')
  }
  const body = String(message || '').trim()
  if (!body) throw new Error('Escriu una novetat abans d’enviar-la.')
  if (body.length > 2000) throw new Error('La novetat no pot superar els 2.000 caràcters.')

  return addDoc(collection(db, 'internalAnnouncements'), cleanForFirestore({
    body,
    createdAt: serverTimestamp(),
    senderEmail: user.email,
    senderName: user.displayName || 'Marc Pérez Casals',
    senderUid: user.uid,
  }))
}

export async function markInternalAnnouncementsRead(user) {
  if (!user?.uid) return
  await setDoc(
    getInternalMessageStateDocRef(user.uid),
    { announcementsReadAt: serverTimestamp() },
    { merge: true },
  )
}

// Els mòduls de dades nous comparteixen aquesta instància per evitar crear una
// segona connexió de Firestore o duplicar la configuració de Firebase.
export { db as firebaseDb }
