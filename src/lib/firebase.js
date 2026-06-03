import { initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  signInWithRedirect,
  signOut,
} from 'firebase/auth'
import {
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
  getRedirectResult(auth).catch((error) => {
    console.warn('No s’ha pogut completar el retorn del login de Google.', error)
    onError?.(new Error(getFirebaseAuthErrorMessage(error), { cause: error }))
  })
  return onAuthStateChanged(auth, (user) => callback(toCloudUser(user)))
}

export async function signInWithGoogle() {
  try {
    await signInWithRedirect(auth, googleProvider)
  } catch (error) {
    throw new Error(getFirebaseAuthErrorMessage(error), { cause: error })
  }
  return null
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
      importedAt: now,
      status: 'imported',
      updatedAt: now,
    }),
    { merge: true },
  )
}

export async function deleteCloudCollection(uid, collectionName) {
  const snapshot = await getDocs(getCollectionRef(uid, collectionName))
  await Promise.all(snapshot.docs.map((snapshotDoc) => deleteDoc(snapshotDoc.ref)))
}
