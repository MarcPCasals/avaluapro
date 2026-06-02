import { COLLECTIONS, EMPTY_DATASET } from '../data/seedData'

const DB_NAME = 'avaluapro-v2'
const DB_VERSION = 10

const INDEXES = {
  students: ['classId'],
  semesters: ['classId'],
  uts: ['classId', 'semesterId'],
  competencies: ['classId', 'utId'],
  marks: ['studentId', 'criterionId'],
  tasks: ['classId', 'utId'],
  taskRecords: ['classId', 'utId', 'studentId', 'taskId'],
  behaviorEvents: ['classId', 'studentId'],
  agendaNotes: ['classId', 'studentId'],
  tutorialRecords: ['classId', 'studentId', 'type'],
  tutorialMarks: ['classId', 'studentId', 'subject', 'criterionKey'],
  tutorialRelations: ['classId', 'sourceStudentId', 'targetStudentId', 'type'],
  tutorialGroupSets: ['classId', 'strategy'],
  tutorialSociogramLayouts: ['classId'],
  tutorialStudentRoles: ['classId', 'studentId', 'role'],
  tutorialSeatingPlans: ['classId'],
  seatingCharts: ['classId', 'halfGroup'],
  studentAntecedents: ['studentId', 'classId'],
}

function ensureStore(db, collection) {
  if (!db.objectStoreNames.contains(collection)) {
    return db.createObjectStore(collection, { keyPath: 'id' })
  }

  return null
}

function ensureIndexes(store, collection) {
  const indexes = INDEXES[collection] || []
  indexes.forEach((indexName) => {
    if (!store.indexNames.contains(indexName)) {
      store.createIndex(indexName, indexName, { unique: false })
    }
  })
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      COLLECTIONS.forEach((collection) => {
        const store = ensureStore(db, collection) || request.transaction.objectStore(collection)
        ensureIndexes(store, collection)
      })
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function getStorageErrorMessage(error) {
  const isQuotaError =
    error?.name === 'QuotaExceededError' ||
    error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error?.code === 22 ||
    error?.code === 1014

  if (isQuotaError) {
    return 'Límit d’emmagatzematge superat. Avaluapro no ha pogut guardar aquest canvi perquè el navegador no té prou espai disponible.'
  }

  return 'No s’han pogut guardar les dades locals. Revisa l’espai disponible del navegador.'
}

function readStore(db, collection) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(collection, 'readonly')
    const store = transaction.objectStore(collection)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function replaceStore(db, collection, rows) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(collection, 'readwrite')
    const store = transaction.objectStore(collection)
    store.clear()
    rows.forEach((row) => store.put(row))

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

export async function loadDataset() {
  const db = await openDatabase()
  const entries = await Promise.all(
    COLLECTIONS.map(async (collection) => [collection, await readStore(db, collection)]),
  )
  db.close()
  return entries.reduce((dataset, [collection, rows]) => ({ ...dataset, [collection]: rows }), {
    ...EMPTY_DATASET,
  })
}

export async function saveDataset(dataset) {
  await saveCollections(dataset, COLLECTIONS)
}

export async function saveCollections(dataset, collections) {
  let db
  try {
    db = await openDatabase()
    await Promise.all(
      collections.map((collection) => replaceStore(db, collection, dataset[collection] || [])),
    )
  } catch (error) {
    throw new Error(getStorageErrorMessage(error), { cause: error })
  } finally {
    if (db) {
      db.close()
    }
  }
}

export async function resetDatabase() {
  const db = await openDatabase()
  await Promise.all(COLLECTIONS.map((collection) => replaceStore(db, collection, [])))
  db.close()
}
