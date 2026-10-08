import { readFile } from 'node:fs/promises'
import { before, beforeEach, after, test } from 'node:test'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, setDoc, getDoc, getDocs, collection, query, where, limit, updateDoc, deleteDoc } from 'firebase/firestore'
let env
before(async () => { env = await initializeTestEnvironment({ projectId: 'avaluapro-student-consultation-test', firestore: { rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') } }) })
beforeEach(async () => { await env.clearFirestore() })
after(async () => { await env?.cleanup() })
const db = (uid, email, verified = true, provider = 'google.com') => env.authenticatedContext(uid, { email, email_verified: verified, firebase: { sign_in_provider: provider } }).firestore()
const owner = () => db('owner', 'owner@educand.ad')
const direction = () => db('direction', 'direction@educand.ad')
const ref = (database) => doc(database, 'studentOverviewShares', 'share-1')
const data = (extra = {}) => ({ ownerUid: 'owner', classId: 'class1', schemaVersion: 1, enabled: true, authorizedEmails: ['direction@educand.ad'], expiresAtEpochMs: Date.now() + 86400000, updatedAt: new Date().toISOString(), snapshot: { className: 'Grup fictici', subject: 'Ciències', utName: '', showTutoringColumns: true, rows: [] }, ...extra })

test('només el propietari crea i gestiona la consulta', async () => {
  await assertFails(setDoc(ref(direction()), data()))
  await assertSucceeds(setDoc(ref(owner()), data()))
  await assertFails(updateDoc(ref(direction()), { enabled: false }))
  await assertFails(updateDoc(ref(direction()), { snapshot: data().snapshot }))
  await assertFails(deleteDoc(ref(direction())))
  await assertFails(updateDoc(ref(owner()), { ownerUid: 'direction' }))
  await assertFails(updateDoc(ref(owner()), { classId: 'another' }))
  await assertFails(setDoc(doc(owner(), 'studentOverviewShares', 'bad-expiry'), data({ expiresAtEpochMs: Date.now() - 1000 })))
  await assertFails(updateDoc(ref(owner()), { extraData: 'not allowed' }))
})

test('consulta autenticada només amb el correu verificat autoritzat, sense llistar ni accedir al quadern', async () => {
  await setDoc(ref(owner()), data())
  await assertSucceeds(getDoc(ref(direction())))
  await assertSucceeds(getDoc(ref(db('upper', 'DIRECTION@educand.ad'))))
  await assertFails(getDoc(ref(db('wrong', 'wrong@educand.ad'))))
  await assertFails(getDoc(ref(db('unverified', 'direction@educand.ad', false))))
  await assertFails(getDoc(ref(env.unauthenticatedContext().firestore())))
  await assertFails(getDocs(collection(direction(), 'studentOverviewShares')))
  await assertSucceeds(getDocs(query(collection(owner(), 'studentOverviewShares'), where('ownerUid', '==', 'owner'), limit(20))))
  await assertFails(getDoc(doc(direction(), 'users', 'owner', 'students', 's1')))
})

test('la caducitat, la revocació i el canvi de destinataris es compleixen al servidor', async () => {
  await setDoc(ref(owner()), data())
  await assertSucceeds(updateDoc(ref(owner()), { enabled: false }))
  await assertFails(getDoc(ref(direction())))
  await assertSucceeds(getDoc(ref(owner())))
  await assertSucceeds(updateDoc(ref(owner()), { enabled: true, authorizedEmails: ['new@educand.ad'] }))
  await assertFails(getDoc(ref(direction())))
  await assertSucceeds(getDoc(ref(db('new', 'new@educand.ad'))))
  await env.withSecurityRulesDisabled((context) => updateDoc(ref(context.firestore()), { expiresAtEpochMs: Date.now() - 1000 }))
  await assertFails(getDoc(ref(db('new', 'new@educand.ad'))))
  await assertSucceeds(updateDoc(ref(owner()), { enabled: false }))
  await assertSucceeds(updateDoc(ref(owner()), { enabled: true, expiresAtEpochMs: Date.now() + 86400000 }))
  await assertSucceeds(getDoc(ref(db('new', 'new@educand.ad'))))
})

test('només Google educand autoritzat, també per enllaços anteriors amb correus externs', async () => {
  await setDoc(ref(owner()), data({ authorizedEmails: ['direction@educand.ad', 'external@example.com', 'fake@educand.ad.evil', 'other@sub.educand.ad'] }))
  await assertSucceeds(getDoc(ref(direction())))
  for (const email of ['external@example.com', 'fake@educand.ad.evil', 'other@sub.educand.ad']) {
    await assertFails(getDoc(ref(db('external', email))))
  }
  for (const provider of ['password', 'custom', 'anonymous']) {
    await assertFails(getDoc(ref(db('same-email', 'direction@educand.ad', true, provider))))
  }
})
