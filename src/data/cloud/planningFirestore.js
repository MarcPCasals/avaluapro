import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
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
import { firebaseDb } from '../../lib/firebase.js'
import {
  recordFirestoreLookup,
  recordFirestoreQuerySnapshot,
} from '../../lib/firestoreReadDiagnostics.js'
import { applyPlanningCloudOperationToDatabase } from './planningCloudSync.js'

const OWNER_COLLECTIONS = Object.freeze({
  academicYear: 'planningAcademicYears',
  temporalUnit: 'planningTemporalUnits',
  timetableVersion: 'planningTimetables',
  timetableSlot: 'planningTimetableSlots',
  calendarEvent: 'planningCalendarEvents',
})

function cleanForPlanningFirestore(value) {
  if (Array.isArray(value)) return value.map(cleanForPlanningFirestore)
  if (!value || typeof value !== 'object') return value ?? null
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, cleanForPlanningFirestore(entry)]),
  )
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

function safeId(value, fieldName) {
  const id = String(value || '').trim().replaceAll('/', '_')
  if (!id) throw new Error(`No s'ha pogut identificar ${fieldName}`)
  return id
}

function planningUnitRef(planningUnitId) {
  return doc(firebaseDb, 'planningUnits', safeId(planningUnitId, 'la UP'))
}

function planningChildRef(planningUnitId, collectionName, documentId) {
  return doc(planningUnitRef(planningUnitId), collectionName, safeId(documentId, collectionName))
}

function planningApplicationRef(planningUnitId, applicationId) {
  return planningChildRef(planningUnitId, 'applications', applicationId)
}

function applicationChildRef(planningUnitId, applicationId, collectionName, documentId) {
  return doc(
    planningApplicationRef(planningUnitId, applicationId),
    collectionName,
    safeId(documentId, collectionName),
  )
}

function planningSessionRef(planningUnitId, applicationId, sessionId) {
  return applicationChildRef(planningUnitId, applicationId, 'sessions', sessionId)
}

function sessionChildRef(planningUnitId, applicationId, sessionId, collectionName, documentId) {
  return doc(
    planningSessionRef(planningUnitId, applicationId, sessionId),
    collectionName,
    safeId(documentId, collectionName),
  )
}

function mapSnapshot(snapshot) {
  return snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() }))
}

async function readPlanningQuery(scope, reference) {
  const snapshot = await getDocs(reference)
  recordFirestoreQuerySnapshot(`planning.${scope}`, snapshot)
  return snapshot
}

async function readPlanningDocument(scope, reference) {
  const snapshot = await getDoc(reference)
  recordFirestoreLookup(`planning.${scope}`)
  return snapshot
}

/** Desa configuració privada del curs sense afegir-la a la càrrega global d'AvaluaPro. */
export async function saveOwnerPlanningEntity(uid, entity) {
  const ownerUid = safeId(uid, 'el docent')
  const collectionName = OWNER_COLLECTIONS[entity?.entityType]
  if (!collectionName) throw new Error(`Entitat privada de planificació desconeguda: ${entity?.entityType}`)
  if (entity.ownerUid !== uid) throw new Error("L'entitat no pertany al docent autenticat")
  const value = cleanForPlanningFirestore(entity)
  await setDoc(doc(firebaseDb, 'users', ownerUid, collectionName, safeId(entity.id, collectionName)), value)
  return value
}

export async function loadPlanningAcademicYears(uid, maxItems = 20) {
  const snapshot = await readPlanningQuery('academicYears', query(
    collection(firebaseDb, 'users', safeId(uid, 'el docent'), OWNER_COLLECTIONS.academicYear),
    orderBy('startsOn', 'desc'),
    limit(maxItems),
  ))
  return mapSnapshot(snapshot)
}

export async function loadPlanningTemporalUnits(uid, academicYearId, maxItems = 20) {
  const snapshot = await readPlanningQuery('temporalUnits', query(
    collection(firebaseDb, 'users', safeId(uid, 'el docent'), OWNER_COLLECTIONS.temporalUnit),
    where('academicYearId', '==', safeId(academicYearId, 'el curs acadèmic')),
    orderBy('order', 'asc'),
    limit(maxItems),
  ))
  return mapSnapshot(snapshot)
}

export async function loadPlanningTimetables(uid, academicYearId, maxItems = 20) {
  const snapshot = await readPlanningQuery('timetables', query(
    collection(firebaseDb, 'users', safeId(uid, 'el docent'), OWNER_COLLECTIONS.timetableVersion),
    where('academicYearId', '==', safeId(academicYearId, 'el curs acadèmic')),
    orderBy('effectiveFrom', 'desc'),
    limit(maxItems),
  ))
  return mapSnapshot(snapshot)
}

export async function loadPlanningTimetableSlots(uid, timetableVersionId, maxItems = 100) {
  const snapshot = await readPlanningQuery('timetableSlots', query(
    collection(firebaseDb, 'users', safeId(uid, 'el docent'), OWNER_COLLECTIONS.timetableSlot),
    where('timetableVersionId', '==', safeId(timetableVersionId, "l'horari")),
    orderBy('weekday', 'asc'),
    orderBy('startsAt', 'asc'),
    limit(maxItems),
  ))
  return mapSnapshot(snapshot)
}

export async function loadPlanningCalendarEvents(uid, academicYearId, fromDate, toDate, maxItems = 200) {
  const snapshot = await readPlanningQuery('calendarEvents', query(
    collection(firebaseDb, 'users', safeId(uid, 'el docent'), OWNER_COLLECTIONS.calendarEvent),
    where('academicYearId', '==', safeId(academicYearId, 'el curs acadèmic')),
    where('startsOn', '>=', fromDate),
    where('startsOn', '<=', toDate),
    orderBy('startsOn', 'asc'),
    limit(maxItems),
  ))
  return mapSnapshot(snapshot)
}

export async function savePlanningUnit(planningUnit, { accessByEmail, authorizedEmails, ownerEmail } = {}) {
  const sharingFields = {}
  if (authorizedEmails !== undefined) {
    sharingFields.authorizedEmails = [...new Set(authorizedEmails.map(normalizeEmail).filter(Boolean))]
  }
  if (accessByEmail !== undefined) sharingFields.accessByEmail = cleanForPlanningFirestore(accessByEmail)
  if (ownerEmail !== undefined) sharingFields.ownerEmailLower = normalizeEmail(ownerEmail)
  const value = cleanForPlanningFirestore({ ...planningUnit, ...sharingFields })
  await setDoc(planningUnitRef(planningUnit.id), value, { merge: true })
  return value
}

async function savePlanningChild(planningUnitId, collectionName, entity) {
  const value = cleanForPlanningFirestore(entity)
  await setDoc(planningChildRef(planningUnitId, collectionName, entity.id), value)
  return value
}

export function savePlanningPhase(phase) {
  return savePlanningChild(phase.planningUnitId, 'phases', phase)
}

export function savePlanningActivity(activity) {
  return savePlanningChild(activity.planningUnitId, 'activities', activity)
}

export function savePlanningApplication(application) {
  return savePlanningChild(application.planningUnitId, 'applications', application)
}

export async function savePlanningActivityOverride(planningUnitId, activityOverride) {
  const value = cleanForPlanningFirestore(activityOverride)
  await setDoc(
    applicationChildRef(planningUnitId, activityOverride.applicationId, 'activityOverrides', activityOverride.id),
    value,
  )
  return value
}

export async function savePlanningSession(planningUnitId, session) {
  const value = cleanForPlanningFirestore(session)
  await setDoc(applicationChildRef(planningUnitId, session.applicationId, 'sessions', session.id), value)
  return value
}

export async function savePlanningSessionItem(planningUnitId, applicationId, sessionItem) {
  const value = cleanForPlanningFirestore(sessionItem)
  await setDoc(
    sessionChildRef(planningUnitId, applicationId, sessionItem.sessionId, 'items', sessionItem.id),
    value,
  )
  return value
}

export async function savePlanningActivityResult(planningUnitId, applicationId, result) {
  const value = cleanForPlanningFirestore(result)
  await setDoc(
    sessionChildRef(planningUnitId, applicationId, result.sessionId, 'results', result.id),
    value,
  )
  return value
}

export async function savePlanningPrivateNote(note) {
  const value = cleanForPlanningFirestore(note)
  await setDoc(doc(firebaseDb, 'planningPrivateNotes', safeId(note.id, 'la nota privada')), value)
  return value
}

export async function savePlanningAccessGrant(planningUnitId, grant) {
  const email = normalizeEmail(grant.granteeEmail)
  if (!email || !email.includes('@')) throw new Error('Cal indicar el correu complet de la persona convidada')
  const unitReference = planningUnitRef(planningUnitId)
  const grantReference = planningChildRef(planningUnitId, 'accessGrants', email)
  const now = new Date().toISOString()
  const batch = writeBatch(firebaseDb)
  batch.set(grantReference, cleanForPlanningFirestore({ ...grant, granteeEmail: email }))
  batch.update(
    unitReference,
    new FieldPath('accessByEmail', email),
    cleanForPlanningFirestore({ classIds: grant.classIds || [], role: grant.role, status: 'active' }),
    'authorizedEmails',
    arrayUnion(email),
    'updatedAt',
    now,
  )
  await batch.commit()
  return { ...grant, granteeEmail: email }
}

export async function revokePlanningAccessGrant(planningUnitId, granteeEmail) {
  const email = normalizeEmail(granteeEmail)
  const batch = writeBatch(firebaseDb)
  batch.delete(planningChildRef(planningUnitId, 'accessGrants', email))
  batch.update(
    planningUnitRef(planningUnitId),
    new FieldPath('accessByEmail', email),
    deleteField(),
    'authorizedEmails',
    arrayRemove(email),
    'updatedAt',
    new Date().toISOString(),
  )
  await batch.commit()
  return email
}

export async function loadPlanningAccessGrants(planningUnitId) {
  const snapshot = await readPlanningQuery(
    'accessGrants',
    collection(planningUnitRef(planningUnitId), 'accessGrants'),
  )
  return mapSnapshot(snapshot).sort((left, right) =>
    String(right.updatedAt || '').localeCompare(String(left.updatedAt || '')))
}

function planningUnitQueryConstraints({ academicYearId, temporalUnitId, maxItems, sharedEmail, ownerUid }) {
  const constraints = []
  if (ownerUid) constraints.push(where('ownerUid', '==', ownerUid))
  if (sharedEmail) constraints.push(where('authorizedEmails', 'array-contains', normalizeEmail(sharedEmail)))
  if (academicYearId) constraints.push(where('academicYearId', '==', academicYearId))
  if (temporalUnitId) constraints.push(where('temporalUnitId', '==', temporalUnitId))
  constraints.push(orderBy('updatedAt', 'desc'), limit(maxItems || 100))
  return constraints
}

export async function loadOwnedPlanningUnits(ownerUid, filters = {}) {
  const snapshot = await readPlanningQuery('units.owned', query(
    collection(firebaseDb, 'planningUnits'),
    ...planningUnitQueryConstraints({ ...filters, ownerUid }),
  ))
  return mapSnapshot(snapshot)
}

export async function loadSharedPlanningUnits(email, filters = {}) {
  const snapshot = await readPlanningQuery('units.shared', query(
    collection(firebaseDb, 'planningUnits'),
    ...planningUnitQueryConstraints({ ...filters, sharedEmail: email }),
  ))
  return mapSnapshot(snapshot)
}

export async function loadPlanningUnitStructure(planningUnitId) {
  const unitReference = planningUnitRef(planningUnitId)
  const [unitSnapshot, phasesSnapshot, activitiesSnapshot] = await Promise.all([
    readPlanningDocument('unitStructure.unit', unitReference),
    readPlanningQuery('unitStructure.phases', query(collection(unitReference, 'phases'), orderBy('order', 'asc'))),
    readPlanningQuery(
      'unitStructure.activities',
      query(collection(unitReference, 'activities'), orderBy('order', 'asc')),
    ),
  ])
  if (!unitSnapshot.exists()) throw new Error("No s'ha trobat aquesta UP")
  return {
    planningUnit: { id: unitSnapshot.id, ...unitSnapshot.data() },
    phases: mapSnapshot(phasesSnapshot),
    activities: mapSnapshot(activitiesSnapshot),
  }
}

export async function loadPlanningApplications(planningUnitId, classId, maxItems = 50, managerUid = '') {
  const unitReference = planningUnitRef(planningUnitId)
  const constraints = []
  // El filtre de grup també forma part de la frontera de privacitat per a una
  // Agenda compartida. Quan hi és, evitem combinar-lo amb un orderBy remot:
  // aquesta combinació exigeix un índex compost i, si encara s'està creant,
  // faria que l'aplicació acabés llegint una còpia local buida. Els consumidors
  // ja ordenen les poques aplicacions retornades per updatedAt.
  if (classId) constraints.push(where('classId', '==', classId))
  if (managerUid) constraints.push(where('managerUid', '==', managerUid))
  if (!classId && !managerUid) constraints.push(orderBy('updatedAt', 'desc'))
  constraints.push(limit(maxItems))
  return mapSnapshot(await readPlanningQuery(
    'applications',
    query(collection(unitReference, 'applications'), ...constraints),
  ))
}

export async function loadPlanningActivityOverrides(planningUnitId, applicationId) {
  return mapSnapshot(await readPlanningQuery(
    'activityOverrides',
    collection(planningApplicationRef(planningUnitId, applicationId), 'activityOverrides'),
  ))
}

export async function loadPlanningSessions({
  applicationId,
  from,
  maxItems = 100,
  planningUnitId,
  to,
}) {
  const constraints = [where('startsAt', '>=', from), where('startsAt', '<=', to), orderBy('startsAt', 'asc')]
  constraints.push(limit(maxItems))
  const snapshot = await readPlanningQuery('sessions', query(
    collection(planningApplicationRef(planningUnitId, applicationId), 'sessions'),
    ...constraints,
  ))
  return mapSnapshot(snapshot)
}

export async function loadPlanningSessionDetail(planningUnitId, applicationId, sessionId, options = {}) {
  const sessionReference = planningSessionRef(planningUnitId, applicationId, sessionId)
  const knownSession = options.session?.id === sessionId ? options.session : null
  const [sessionSnapshot, itemsSnapshot, resultsSnapshot] = await Promise.all([
    knownSession ? Promise.resolve(null) : readPlanningDocument('sessionDetail.session', sessionReference),
    readPlanningQuery('sessionDetail.items', query(collection(sessionReference, 'items'), orderBy('order', 'asc'))),
    readPlanningQuery('sessionDetail.results', collection(sessionReference, 'results')),
  ])
  if (!knownSession && !sessionSnapshot.exists()) throw new Error("No s'ha trobat aquesta sessió")
  return {
    // Les llistes d'Agenda ja han llegit el document de sessió. Reutilitzar-lo
    // evita una segona lectura per sessió sense alterar l'abast local dels seus
    // elements i resultats. Els consumidors que no el tenen conserven el camí
    // compatible que el consulta directament.
    session: knownSession || { id: sessionSnapshot.id, ...sessionSnapshot.data() },
    items: mapSnapshot(itemsSnapshot),
    results: mapSnapshot(resultsSnapshot),
  }
}

export async function loadPlanningPrivateNotes(ownerUid, { planningUnitId, sessionId, maxItems = 100 } = {}) {
  const constraints = [where('ownerUid', '==', ownerUid)]
  if (sessionId) constraints.push(where('sessionId', '==', sessionId))
  else if (planningUnitId) constraints.push(where('planningUnitId', '==', planningUnitId))
  constraints.push(orderBy('updatedAt', 'desc'), limit(maxItems))
  return mapSnapshot(await readPlanningQuery(
    'privateNotes',
    query(collection(firebaseDb, 'planningPrivateNotes'), ...constraints),
  ))
}

export async function deletePlanningPrivateNote(noteId) {
  await deleteDoc(doc(firebaseDb, 'planningPrivateNotes', safeId(noteId, 'la nota privada')))
}

export async function touchPlanningUnit(planningUnitId, updatedAt = new Date().toISOString()) {
  await updateDoc(planningUnitRef(planningUnitId), { updatedAt })
}

/**
 * Aplica una operació local només si el document remot encara és la versió
 * sobre la qual es va editar. Aquesta comparació dins una transacció evita que
 * l'ordinador substitueixi silenciosament una edició més nova feta a l'iPad.
 */
export async function applyPlanningCloudOperation(operation) {
  return applyPlanningCloudOperationToDatabase(firebaseDb, operation)
}
