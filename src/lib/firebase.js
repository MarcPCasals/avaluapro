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
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { COLLECTIONS } from '../data/seedData'

export const SHARED_TUTORING_COLLECTIONS = [
  'students',
  'tutorialRecords',
  'tutorialMarks',
  'tutorialRelations',
  'tutorialGroupSets',
  'tutorialSociogramLayouts',
  'tutorialStudentRoles',
  'tutorialSeatingPlans',
  'studentAntecedents',
]

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
  const nextIds = new Set(rows.map((row, index) => getSafeDocId(row, collectionName, index)))
  const operations = []

  existingSnapshot.forEach((snapshotDoc) => {
    if (!nextIds.has(snapshotDoc.id)) {
      operations.push({ type: 'delete', ref: snapshotDoc.ref })
    }
  })

  rows.forEach((row, index) => {
    const docId = getSafeDocId(row, collectionName, index)
    const value = cleanForFirestore({ ...row, id: docId })
    assertFirestoreDocumentSize(collectionName, docId, value)
    operations.push({
      type: 'set',
      ref: doc(collectionRef, docId),
      value,
    })
  })

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

function getLatestIsoTimestamp(...values) {
  return values
    .map((value) => String(value || ''))
    .filter(Boolean)
    .sort()
    .at(-1) || ''
}

function getTutoringRowVersion(row = {}) {
  return getLatestIsoTimestamp(row.sharedUpdatedAt, row.updatedAt, row.createdAt)
}

function buildSharedEditMeta(row = {}, user, now) {
  const rowVersion = getTutoringRowVersion(row)
  return {
    sharedUpdatedAt: rowVersion || now,
    sharedUpdatedByEmail: normalizeEmail(user?.email),
    sharedUpdatedByUid: user?.uid || '',
  }
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

    if (existingValue && remoteEditedByOther && remoteVersion && (!localVersion || remoteVersion > localVersion)) {
      conflicts.push({
        collectionName,
        documentId: docId,
        remoteUpdatedAt: remoteVersion,
        remoteUpdatedByEmail: existingValue.sharedUpdatedByEmail || '',
      })
      return
    }

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

export async function saveCloudCollections(uid, dataset, collectionsToSave = COLLECTIONS, meta = {}) {
  if (!uid) throw new Error('Cal iniciar sessió amb Google abans de guardar al núvol.')

  await setDoc(
    getUserDocRef(uid),
    cleanForFirestore({
      email: meta.user?.email || '',
      displayName: meta.user?.displayName || '',
      updatedAt: new Date().toISOString(),
    }),
    { merge: true },
  )

  for (const collectionName of collectionsToSave) {
    await replaceCloudCollection(uid, collectionName, dataset[collectionName] || [])
  }

  await setDoc(
    getMetaDocRef(uid),
    cleanForFirestore({
      app: 'avaluapro-v2',
      version: 2,
      profile: meta.profile || {},
      preferences: meta.preferences || {},
      collections: collectionsToSave,
      updatedAt: new Date().toISOString(),
    }),
    { merge: true },
  )
}

export async function loadCloudDataset(uid) {
  if (!uid) throw new Error('Cal iniciar sessió amb Google abans de carregar dades del núvol.')

  const entries = await Promise.all(
    COLLECTIONS.map(async (collectionName) => {
      const snapshot = await getDocs(getCollectionRef(uid, collectionName))
      return [
        collectionName,
        snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() })),
      ]
    }),
  )

  return entries.reduce((dataset, [collectionName, rows]) => ({ ...dataset, [collectionName]: rows }), {})
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
      profile: backup?.profile || {},
      preferences: backup?.preferences || {},
      counts,
    }),
  )

  for (const collectionName of COLLECTIONS) {
    await saveBackupRows(uid, backupId, collectionName, collections[collectionName] || [])
  }

  return { id: backupId, createdAt, label: meta.label || 'Còpia de seguretat al núvol', reason: meta.reason || 'manual', counts }
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

export async function saveTutoringSpace({
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

  return valueWithConflictSummary
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

  return {
    ...space,
    collections: entries.reduce((dataset, [collectionName, rows]) => ({ ...dataset, [collectionName]: rows }), {}),
  }
}

export async function deleteCloudCollection(uid, collectionName) {
  const snapshot = await getDocs(getCollectionRef(uid, collectionName))
  await Promise.all(snapshot.docs.map((snapshotDoc) => deleteDoc(snapshotDoc.ref)))
}
