import { getAuth } from 'firebase/auth'
import { collection, doc, getDocFromServer, getDocsFromServer, limit, onSnapshot, orderBy, query, setDoc, updateDoc, where } from 'firebase/firestore'
import { firebaseDb } from '../../lib/firebase.js'

const COLLECTION = 'studentOverviewShares'
function currentOwner() {
  const user = getAuth().currentUser
  if (!user) throw new Error('Entra amb Google per compartir aquesta vista.')
  return user.uid
}

export async function listStudentOverviewShares(classId) {
  const result = await getDocsFromServer(query(collection(firebaseDb, COLLECTION), where('ownerUid', '==', currentOwner()), where('classId', '==', classId), orderBy('updatedAt', 'desc'), limit(20)))
  return result.docs.map((item) => ({ ...item.data(), id: item.id })).filter((item) => item.classId === classId)
}

export async function saveStudentOverviewShare({ id, classId, snapshot, authorizedEmails, expiresAtEpochMs }) {
  const ownerUid = currentOwner()
  const ref = id ? doc(firebaseDb, COLLECTION, id) : doc(collection(firebaseDb, COLLECTION))
  const value = { ownerUid, classId, snapshot, authorizedEmails, expiresAtEpochMs, enabled: true, schemaVersion: 1, updatedAt: new Date().toISOString() }
  if (id) {
    const existing = await getDocFromServer(ref)
    if (!existing.exists() || existing.data().ownerUid !== ownerUid || existing.data().classId !== classId) throw new Error('No pots modificar aquest enllaç.')
    await updateDoc(ref, value)
  } else await setDoc(ref, value)
  return { ...value, id: ref.id }
}

export async function revokeStudentOverviewShare(id) {
  currentOwner()
  await updateDoc(doc(firebaseDb, COLLECTION, id), { enabled: false })
}

export function subscribeStudentOverviewShare(id, onChange, onError) {
  return onSnapshot(doc(firebaseDb, COLLECTION, id), { includeMetadataChanges: true }, (result) => {
    onChange(result.exists() ? { ...result.data(), id: result.id, fromCache: result.metadata.fromCache } : null)
  }, onError)
}
