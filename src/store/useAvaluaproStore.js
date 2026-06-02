import { create } from 'zustand'
import { createId } from '../lib/ids'
import { loadDataset, resetDatabase, saveCollections, saveDataset } from '../db/indexedDb'
import { COLLECTIONS, EMPTY_DATASET, seedDataset } from '../data/seedData'
import { getSubjectOption, getSubjectStructure } from '../data/subjects'
import {
  buildTeacherGradePackage,
  getTutorialMarkUpdatesFromTeacherPackage,
  previewTeacherGradePackage,
} from '../lib/teacherGradePackages'
import {
  listReceivedTeacherGradePackages,
  listSentTeacherGradePackages,
  listCloudBackups,
  loadCloudBackup,
  loadCloudDataset,
  markTeacherGradePackageImported,
  observeFirebaseUser,
  saveCloudBackup,
  saveCloudCollections,
  sendTeacherGradePackage,
  signInWithGoogle,
  signOutFromGoogle,
} from '../lib/firebase'

const PREFERENCES_KEY = 'avaluapro-v2-preferences'
const BACKUP_APP_ID = 'avaluapro-v2'
const BACKUP_VERSION = 2
const CLOUD_SYNC_DELAY_MS = 2500
const DAILY_CLOUD_BACKUP_KEY = 'lastCloudBackupDate'
const DEMO_SUBJECT = 'Ciències Físiques i de la Natura'
const DEFAULT_CLASS_COLORS = ['green', 'blue', 'red', 'purple', 'yellow', 'orange']
const DEFAULT_HALF_GROUPS = ['Grup A', 'Grup B']

let cloudSyncTimer = null
let cloudSyncInFlight = false
const queuedCloudCollections = new Set()

function getQueuedCloudCollections() {
  return Array.from(queuedCloudCollections)
}

function readPreferences() {
  try {
    return JSON.parse(localStorage.getItem(PREFERENCES_KEY)) || {}
  } catch {
    return {}
  }
}

function writePreferences(preferences) {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
  } catch (error) {
    console.warn('No s’han pogut guardar les preferències locals.', error)
  }
}

function getClassTimelineSelection(dataset, classId, preferences = {}) {
  const classSemesters = dataset.semesters
    .filter((semester) => semester.classId === classId)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
  const classUts = dataset.uts
    .filter((ut) => ut.classId === classId)
    .sort((a, b) => {
      const semesterA = classSemesters.find((semester) => semester.id === a.semesterId)
      const semesterB = classSemesters.find((semester) => semester.id === b.semesterId)
      return (
        (semesterA?.order || 0) - (semesterB?.order || 0) ||
        (a.order || 0) - (b.order || 0) ||
        a.name.localeCompare(b.name, 'ca')
      )
    })
  const classMemory = preferences.lastUiByClass?.[classId] || {}
  const lastPosition = preferences.lastPosition?.activeClassId === classId ? preferences.lastPosition : {}
  const requestedSemesterId =
    lastPosition.activeSemesterId || classMemory.activeSemesterId || preferences.activeSemesterId
  const activeSemester =
    classSemesters.find((semester) => semester.id === requestedSemesterId) ||
    classSemesters[0]
  const requestedUtId = lastPosition.activeUtId || classMemory.activeUtId || preferences.activeUtId
  const activeUt =
    classUts.find((ut) => ut.id === requestedUtId && (!activeSemester?.id || ut.semesterId === activeSemester.id)) ||
    classUts.find((ut) => ut.semesterId === activeSemester?.id) ||
    classUts[0]

  return {
    activeSemesterId: activeSemester?.id || '',
    activeUtId:
      activeUt?.id ||
      dataset.uts
        .filter((ut) => ut.semesterId === activeSemester?.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0))[0]?.id ||
      '',
  }
}

function getInitialUi(dataset) {
  const preferences = readPreferences()
  const firstClass = dataset.classes[0]
  const preferredClass = dataset.classes.find(
    (classItem) =>
      classItem.id === preferences.lastPosition?.activeClassId || classItem.id === preferences.activeClassId,
  )
  const activeClassId = preferredClass?.id || firstClass?.id || ''
  const timelineSelection = getClassTimelineSelection(dataset, activeClassId, preferences)

  return {
    activeClassId,
    activeSemesterId: timelineSelection.activeSemesterId,
    activeUtId: timelineSelection.activeUtId,
    activeMode: preferences.activeMode || 'evaluation',
    activeInsight: preferences.activeInsight || 'dashboard',
  }
}

function getInitialProfile() {
  const preferences = readPreferences()

  return {
    defaultSubject: preferences.defaultSubject || '',
  }
}

function getInitialOnboarding(hasStoredData) {
  const preferences = readPreferences()
  const demoMode =
    Object.prototype.hasOwnProperty.call(preferences, 'demoMode')
      ? Boolean(preferences.demoMode)
      : !hasStoredData

  return {
    demoMode,
    guideOpen:
      Object.prototype.hasOwnProperty.call(preferences, 'guideOpen')
        ? Boolean(preferences.guideOpen)
        : demoMode,
    guideMode: preferences.guideMode || (demoMode ? 'demo' : 'own'),
    tutoringGuideSeen: Boolean(preferences.tutoringGuideSeen),
  }
}

function getInitialBackupMeta() {
  const preferences = readPreferences()

  return preferences.backupMeta || null
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function toTitleCase(value = '') {
  return String(value)
    .toLocaleLowerCase('ca')
    .replace(/(^|[\s'’.-])(\p{L})/gu, (match, prefix, letter) => `${prefix}${letter.toLocaleUpperCase('ca')}`)
}

function formatStudentNameForDisplay(rawName = '') {
  const cleanName = String(rawName).replace(/\s+/g, ' ').trim()
  if (!cleanName.includes(',')) return toTitleCase(cleanName)
  const [surnames, ...rest] = cleanName.split(',')
  return `${toTitleCase(surnames)}, ${toTitleCase(rest.join(',').trim())}`.trim()
}

function normalizeDataset(dataset) {
  let normalizedDataset = { ...dataset }
  normalizedDataset = COLLECTIONS.reduce(
    (nextDataset, collection) => ({
      ...nextDataset,
      [collection]: Array.isArray(nextDataset[collection]) ? nextDataset[collection] : [],
    }),
    normalizedDataset,
  )
  const usedUtIds = new Set([
    ...normalizedDataset.tasks.map((task) => task.utId),
    ...normalizedDataset.competencies.map((competency) => competency.utId),
  ])
  normalizedDataset = {
    ...normalizedDataset,
    classes: normalizedDataset.classes.map((classItem) => ({
      ...classItem,
      isTutoringGroup: Boolean(classItem.isTutoringGroup || classItem.subject === 'Tutoria'),
      tutorialLinkedClassId: classItem.tutorialLinkedClassId || classItem.id,
      halfGroups:
        Array.isArray(classItem.halfGroups) && classItem.halfGroups.length > 0
          ? classItem.halfGroups
          : DEFAULT_HALF_GROUPS,
    })),
    uts: normalizedDataset.uts.filter((ut) => ut.name !== 'Transversals' || usedUtIds.has(ut.id)),
  }

  dataset.classes.forEach((classItem) => {
    if (classItem.utModelReady) return
    const timeline = ensureFixedCourseForClass(normalizedDataset, classItem.id)
    normalizedDataset = {
      ...normalizedDataset,
      classes: normalizedDataset.classes.map((item) =>
        item.id === classItem.id ? { ...item, utModelReady: true } : item,
      ),
      semesters: timeline.semesters,
      uts: timeline.uts,
    }
  })

  const indicatorsById = new Map(dataset.indicators.map((indicator) => [indicator.id, indicator]))
  const tasksById = new Map(normalizedDataset.tasks.map((task) => [task.id, task]))
  const seenCriterionMarks = new Set()
  const marks = []

  normalizedDataset.marks.forEach((mark) => {
    const criterionId = mark.criterionId || indicatorsById.get(mark.indicatorId)?.criterionId
    if (!criterionId) return
    const key = `${mark.studentId}_${criterionId}`
    if (seenCriterionMarks.has(key)) return
    seenCriterionMarks.add(key)
    marks.push({ id: mark.id, studentId: mark.studentId, criterionId, value: mark.value })
  })

  const taskRecords = normalizedDataset.taskRecords.map((record) => {
    const task = tasksById.get(record.taskId)
    if (!task) return record

    return {
      ...record,
      classId: record.classId || task.classId,
      utId: record.utId || task.utId,
    }
  })

  return { ...normalizedDataset, marks, taskRecords }
}

function setUiWithPreferences(set, patch) {
  set((state) => {
    const nextUi = { ...state.ui, ...patch }
    const preferences = readPreferences()
    const nextPreferences = {
      ...preferences,
      ...nextUi,
      lastPosition: {
        activeClassId: nextUi.activeClassId,
        activeInsight: nextUi.activeInsight,
        activeMode: nextUi.activeMode,
        activeSemesterId: nextUi.activeSemesterId,
        activeUtId: nextUi.activeUtId,
        savedAt: new Date().toISOString(),
      },
    }
    if (nextUi.activeClassId) {
      nextPreferences.lastUiByClass = {
        ...(preferences.lastUiByClass || {}),
        [nextUi.activeClassId]: {
          activeInsight: nextUi.activeInsight,
          activeMode: nextUi.activeMode,
          activeSemesterId: nextUi.activeSemesterId,
          activeUtId: nextUi.activeUtId,
        },
      }
    }
    writePreferences(nextPreferences)
    return { ui: nextUi }
  })
}

function setProfileWithPreferences(set, patch) {
  set((state) => {
    const nextProfile = { ...state.profile, ...patch }
    const preferences = readPreferences()
    writePreferences({ ...preferences, ...nextProfile })
    return { profile: nextProfile }
  })
}

async function persistCollections(set, get, collections) {
  const state = get()
  const dataset = collections.reduce(
    (nextDataset, collection) => ({ ...nextDataset, [collection]: state[collection] }),
    {},
  )

  try {
    await saveCollections(dataset, collections)
    if (state.cloud.user) {
      scheduleCloudSync(set, get, collections)
    } else {
      set({ error: '' })
    }
  } catch (error) {
    if (state.cloud.user) {
      set((current) => ({
        error: error.message || 'No s’han pogut guardar o sincronitzar les dades.',
        cloud: {
          ...current.cloud,
          status: 'error',
          error: error.message || 'No s’han pogut sincronitzar les dades amb Firebase.',
        },
      }))
    } else {
      set({ error: error.message || 'No s’han pogut guardar les dades locals.' })
    }
  }
}

function scheduleCloudSync(set, get, collections) {
  collections.forEach((collection) => queuedCloudCollections.add(collection))
  if (cloudSyncTimer) clearTimeout(cloudSyncTimer)

  set((current) => ({
    error: '',
    cloud: {
      ...current.cloud,
      status: cloudSyncInFlight ? 'syncing' : 'pending',
      error: '',
      pendingCollections: getQueuedCloudCollections(),
    },
  }))

  cloudSyncTimer = setTimeout(() => {
    flushQueuedCloudSync(set, get)
  }, CLOUD_SYNC_DELAY_MS)
}

async function flushQueuedCloudSync(set, get) {
  if (cloudSyncInFlight || queuedCloudCollections.size === 0) return

  const state = get()
  if (!state.cloud.user) return

  const collectionsToSync = getQueuedCloudCollections()
  queuedCloudCollections.clear()
  cloudSyncInFlight = true

  const dataset = collectionsToSync.reduce(
    (nextDataset, collection) => ({ ...nextDataset, [collection]: get()[collection] }),
    {},
  )

  set((current) => ({
    cloud: {
      ...current.cloud,
      status: 'syncing',
      error: '',
      pendingCollections: collectionsToSync,
    },
  }))

  try {
    await saveCloudCollections(state.cloud.user.uid, dataset, collectionsToSync, {
      profile: get().profile,
      preferences: readPreferences(),
      user: state.cloud.user,
    })
    cloudSyncInFlight = false

    if (queuedCloudCollections.size > 0) {
      set((current) => ({
        cloud: {
          ...current.cloud,
          status: 'pending',
          error: '',
          pendingCollections: getQueuedCloudCollections(),
        },
      }))
      cloudSyncTimer = setTimeout(() => {
        flushQueuedCloudSync(set, get)
      }, CLOUD_SYNC_DELAY_MS)
      return
    }

    set((current) => ({
      error: '',
      cloud: {
        ...current.cloud,
        status: 'synced',
        error: '',
        lastSyncedAt: new Date().toISOString(),
        pendingCollections: [],
      },
    }))
  } catch (error) {
    collectionsToSync.forEach((collection) => queuedCloudCollections.add(collection))
    cloudSyncInFlight = false
    set((current) => ({
      error: error.message || 'No s’han pogut guardar o sincronitzar les dades.',
      cloud: {
        ...current.cloud,
        status: 'error',
        error: error.message || 'No s’han pogut sincronitzar les dades amb Firebase.',
        pendingCollections: getQueuedCloudCollections(),
      },
    }))
  }
}

function getDatasetFromState(state) {
  return COLLECTIONS.reduce(
    (nextDataset, collection) => ({ ...nextDataset, [collection]: state[collection] || [] }),
    {},
  )
}

function getTutoringRosterStudents(state, classId) {
  const targetClass = state.classes.find((classItem) => classItem.id === classId)
  const rosterClassId = targetClass?.tutorialLinkedClassId || classId

  return state.students
    .filter((student) => student.classId === rosterClassId)
    .sort((a, b) => a.name.localeCompare(b.name, 'ca'))
}

function getTeacherSender(state) {
  const user = state.cloud.user

  return {
    email: user?.email || '',
    name: user?.displayName || user?.email || '',
    uid: user?.uid || '',
  }
}

function parseBackupDataset(backup) {
  const source = backup?.collections || backup?.dataset || backup
  if (!source || typeof source !== 'object') {
    throw new Error('El fitxer no sembla una còpia de seguretat vàlida d’Avaluapro.')
  }

  return COLLECTIONS.reduce((dataset, collection) => {
    if (!Array.isArray(source[collection])) {
      if (
        (collection === 'seatingCharts' ||
          collection === 'tutorialRecords' ||
          collection === 'tutorialMarks' ||
          collection === 'tutorialRelations' ||
          collection === 'tutorialGroupSets' ||
          collection === 'tutorialSociogramLayouts' ||
          collection === 'tutorialStudentRoles' ||
          collection === 'tutorialSeatingPlans' ||
          collection === 'studentAntecedents') &&
        source[collection] === undefined
      ) {
        return { ...dataset, [collection]: [] }
      }

      throw new Error(`La còpia de seguretat no conté la col·lecció "${collection}" correctament.`)
    }

    return { ...dataset, [collection]: source[collection] }
  }, {})
}

function createCourseTimeline(classId) {
  const firstSemesterId = createId('sem')
  const secondSemesterId = createId('sem')

  return {
    semesters: [
      { id: firstSemesterId, classId, name: '1r Semestre', order: 1 },
      { id: secondSemesterId, classId, name: '2n Semestre', order: 2 },
    ],
    uts: [
      { id: createId('ut'), classId, semesterId: firstSemesterId, name: 'UT1', order: 1 },
      { id: createId('ut'), classId, semesterId: firstSemesterId, name: 'UT2', order: 2 },
      { id: createId('ut'), classId, semesterId: secondSemesterId, name: 'UT3', order: 1 },
      { id: createId('ut'), classId, semesterId: secondSemesterId, name: 'UT4', order: 2 },
    ],
  }
}

function createSubjectStructureForUts({ classId, subjectName, uts, existingCompetencyCount = 0 }) {
  const subjectStructure = getSubjectStructure(subjectName)
  if (!subjectStructure) return { competencies: [], criteria: [] }

  const competencies = []
  const criteria = []

  uts.forEach((ut) => {
    subjectStructure.forEach((competencyTemplate, index) => {
      const competencyId = createId('comp')
      competencies.push({
        id: competencyId,
        classId,
        utId: ut.id,
        name: competencyTemplate.name,
        color: competencyTemplate.color,
        order: existingCompetencyCount + index + 1,
        source: subjectName,
      })
      competencyTemplate.criteria.forEach((criterionName, criterionIndex) => {
        criteria.push({
          id: createId('crit'),
          competencyId,
          name: criterionName,
          order: criterionIndex + 1,
          rubric: { A: '', B: '', C: '', D: '' },
        })
      })
    })
  })

  return { competencies, criteria }
}

function getNextClassOrder(classes) {
  return classes.reduce((maxOrder, classItem) => Math.max(maxOrder, classItem.order || 0), 0) + 1
}

function ensureFixedCourseForClass(state, classId) {
  const existingSemesters = state.semesters
    .filter((semester) => semester.classId === classId)
    .sort((a, b) => a.order - b.order)
  const nextSemesters = [...state.semesters]
  const nextUts = [...state.uts]

  let firstSemester = existingSemesters.find((semester) => semester.order === 1)
  let secondSemester = existingSemesters.find((semester) => semester.order === 2)

  if (!firstSemester) {
    firstSemester = { id: createId('sem'), classId, name: '1r Semestre', order: 1 }
    nextSemesters.push(firstSemester)
  }

  if (!secondSemester) {
    secondSemester = { id: createId('sem'), classId, name: '2n Semestre', order: 2 }
    nextSemesters.push(secondSemester)
  }

  const requiredUts = [
    { name: 'UT1', semesterId: firstSemester.id, order: 1 },
    { name: 'UT2', semesterId: firstSemester.id, order: 2 },
    { name: 'UT3', semesterId: secondSemester.id, order: 1 },
    { name: 'UT4', semesterId: secondSemester.id, order: 2 },
  ]

  requiredUts.forEach((requiredUt) => {
    const exists = nextUts.some(
      (ut) => ut.classId === classId && ut.name === requiredUt.name,
    )
    if (!exists) {
      nextUts.push({ id: createId('ut'), classId, ...requiredUt })
    }
  })

  return {
    semesters: nextSemesters,
    uts: nextUts,
    classUts: nextUts
      .filter((ut) => ut.classId === classId && ['UT1', 'UT2', 'UT3', 'UT4'].includes(ut.name))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }
}

function ensureSubjectStructureForClass(state, classId, subjectName, classUts) {
  const subjectStructure = getSubjectStructure(subjectName)
  if (!subjectStructure) return { competencies: state.competencies, criteria: state.criteria }

  const nextCompetencies = [...state.competencies]
  const nextCriteria = [...state.criteria]

  classUts.forEach((ut) => {
    const disabledNames = new Set(ut.disabledCompetencyNames || [])
    const existingUtCompetencies = nextCompetencies.filter((competency) => competency.utId === ut.id)
    const existingNames = new Set(existingUtCompetencies.map((competency) => competency.name))
    const missingStructure = subjectStructure.filter(
      (competency) => !existingNames.has(competency.name) && !disabledNames.has(competency.name),
    )
    const created = createSubjectStructureForUts({
      classId,
      subjectName,
      uts: [ut],
      existingCompetencyCount: existingUtCompetencies.length,
    })
    const missingNames = new Set(missingStructure.map((competency) => competency.name))
    const filteredCompetencies = created.competencies.filter((competency) =>
      missingNames.has(competency.name),
    )
    const filteredCompetencyIds = new Set(filteredCompetencies.map((competency) => competency.id))
    const filteredCriteria = created.criteria.filter((criterion) =>
      filteredCompetencyIds.has(criterion.competencyId),
    )

    nextCompetencies.push(...filteredCompetencies)
    nextCriteria.push(...filteredCriteria)
  })

  return { competencies: nextCompetencies, criteria: nextCriteria }
}

export const useAvaluaproStore = create((set, get) => ({
  ...EMPTY_DATASET,
  ui: {
    activeClassId: '',
    activeSemesterId: '',
    activeUtId: '',
    activeMode: 'evaluation',
    activeInsight: 'dashboard',
  },
  profile: {
    defaultSubject: '',
  },
  onboarding: {
    demoMode: false,
    guideOpen: false,
    guideMode: 'demo',
    tutoringGuideSeen: false,
  },
  backupMeta: null,
  cloud: {
    user: null,
    status: 'signed-out',
    error: '',
    lastSyncedAt: '',
    lastCloudBackupAt: '',
    backupStatus: 'idle',
    backupError: '',
    recentBackups: [],
    pendingCollections: [],
    teacherPackages: [],
    sentTeacherPackages: [],
    teacherPackagesError: '',
    teacherPackagesStatus: 'idle',
  },
  status: 'idle',
  error: '',

  initialize: async () => {
    set({ status: 'loading', error: '' })
    try {
      const storedDataset = await loadDataset()
      const hasData = storedDataset.classes.length > 0
      if (!hasData) {
        writePreferences({
          ...readPreferences(),
          defaultSubject: DEMO_SUBJECT,
          demoMode: true,
          guideOpen: true,
        })
      }
      const dataset = normalizeDataset(hasData ? storedDataset : seedDataset)
      await saveDataset(dataset)
      observeFirebaseUser((user) => {
        set((state) => ({
          cloud: {
            ...state.cloud,
            user,
            status: user ? 'signed-in' : 'signed-out',
            error: '',
          },
        }))
        if (user) {
          setTimeout(() => {
            get().maybeCreateDailyCloudBackup()
            get().loadCloudBackups()
            get().loadReceivedTeacherGradePackages()
            get().loadSentTeacherGradePackages()
          }, 0)
        }
      })
      set({
        ...dataset,
        ui: getInitialUi(dataset),
        profile: getInitialProfile(),
        onboarding: getInitialOnboarding(hasData),
        backupMeta: getInitialBackupMeta(),
        status: 'ready',
      })
      if (get().cloud.user) {
        await get().maybeCreateDailyCloudBackup()
        await get().loadCloudBackups()
      }
    } catch (error) {
      set({ error: error.message || 'No s’han pogut carregar les dades locals.', status: 'error' })
    }
  },

  signInWithGoogle: async () => {
    set((state) => ({ cloud: { ...state.cloud, status: 'signing-in', error: '' } }))
    try {
      const user = await signInWithGoogle()
      set((state) => ({
        cloud: { ...state.cloud, user: user || state.cloud.user, status: user ? 'signed-in' : 'signing-in', error: '' },
      }))
    } catch (error) {
      set((state) => ({
        cloud: {
          ...state.cloud,
          status: 'error',
          error: error.message || 'No s’ha pogut iniciar sessió amb Google.',
        },
      }))
    }
  },

  signOutFromGoogle: async () => {
    try {
      await signOutFromGoogle()
      set((state) => ({
        cloud: {
          ...state.cloud,
          user: null,
          status: 'signed-out',
          error: '',
          lastSyncedAt: '',
          teacherPackages: [],
          sentTeacherPackages: [],
          teacherPackagesError: '',
          teacherPackagesStatus: 'idle',
        },
      }))
    } catch (error) {
      set((state) => ({
        cloud: {
          ...state.cloud,
          status: 'error',
          error: error.message || 'No s’ha pogut tancar la sessió.',
        },
      }))
    }
  },

  pushAllToCloud: async () => {
    const state = get()
    if (!state.cloud.user) return
    if (cloudSyncTimer) clearTimeout(cloudSyncTimer)
    queuedCloudCollections.clear()

    set((current) => ({ cloud: { ...current.cloud, status: 'syncing', error: '' } }))
    try {
      await saveCloudCollections(state.cloud.user.uid, getDatasetFromState(state), COLLECTIONS, {
        profile: state.profile,
        preferences: readPreferences(),
        user: state.cloud.user,
      })
      set((current) => ({
        cloud: {
          ...current.cloud,
          status: 'synced',
          error: '',
          lastSyncedAt: new Date().toISOString(),
          pendingCollections: [],
        },
      }))
    } catch (error) {
      set((current) => ({
        cloud: {
          ...current.cloud,
          status: 'error',
          error: error.message || 'No s’han pogut pujar les dades a Firebase.',
        },
      }))
    }
  },

  createCloudBackup: async (reason = 'manual') => {
    const state = get()
    if (!state.cloud.user) throw new Error('Cal iniciar sessió amb Google abans de crear una còpia al núvol.')

    set((current) => ({
      cloud: { ...current.cloud, backupStatus: 'saving', backupError: '' },
    }))
    try {
      const backup = get().createBackup()
      const savedBackup = await saveCloudBackup(state.cloud.user.uid, backup, {
        reason,
        label: reason === 'auto-daily' ? 'Còpia automàtica diària' : 'Còpia manual al núvol',
      })
      const recentBackups = await listCloudBackups(state.cloud.user.uid, 5)
      const today = getTodayKey()
      if (reason === 'auto-daily') {
        writePreferences({ ...readPreferences(), [DAILY_CLOUD_BACKUP_KEY]: today })
      }
      set((current) => ({
        cloud: {
          ...current.cloud,
          backupStatus: 'saved',
          backupError: '',
          lastCloudBackupAt: savedBackup.createdAt,
          recentBackups,
        },
      }))
      return savedBackup
    } catch (error) {
      set((current) => ({
        cloud: {
          ...current.cloud,
          backupStatus: 'error',
          backupError: error.message || 'No s’ha pogut crear la còpia al núvol.',
        },
      }))
      throw error
    }
  },

  maybeCreateDailyCloudBackup: async () => {
    const state = get()
    if (!state.cloud.user || state.status !== 'ready') return
    const preferences = readPreferences()
    const today = getTodayKey()
    if (preferences[DAILY_CLOUD_BACKUP_KEY] === today) return
    await get().createCloudBackup('auto-daily')
  },

  loadCloudBackups: async () => {
    const state = get()
    if (!state.cloud.user) return []
    try {
      const recentBackups = await listCloudBackups(state.cloud.user.uid, 5)
      set((current) => ({
        cloud: {
          ...current.cloud,
          backupError: '',
          recentBackups,
          lastCloudBackupAt: recentBackups[0]?.createdAt || current.cloud.lastCloudBackupAt,
        },
      }))
      return recentBackups
    } catch (error) {
      set((current) => ({
        cloud: {
          ...current.cloud,
          backupStatus: 'error',
          backupError: error.message || 'No s’han pogut carregar les còpies del núvol.',
        },
      }))
      return []
    }
  },

  restoreCloudBackup: async (backupId) => {
    const state = get()
    if (!state.cloud.user) throw new Error('Cal iniciar sessió amb Google abans de restaurar una còpia del núvol.')
    if (cloudSyncTimer) clearTimeout(cloudSyncTimer)
    queuedCloudCollections.clear()

    set((current) => ({
      cloud: { ...current.cloud, backupStatus: 'restoring', backupError: '' },
    }))
    try {
      const backup = await loadCloudBackup(state.cloud.user.uid, backupId)
      await get().restoreBackup(backup, { filename: `copia-nuvol-${backupId}.json` })
      const recentBackups = await listCloudBackups(state.cloud.user.uid, 5)
      set((current) => ({
        cloud: {
          ...current.cloud,
          backupStatus: 'restored',
          backupError: '',
          recentBackups,
          lastCloudBackupAt: recentBackups[0]?.createdAt || current.cloud.lastCloudBackupAt,
        },
      }))
    } catch (error) {
      set((current) => ({
        cloud: {
          ...current.cloud,
          backupStatus: 'error',
          backupError: error.message || 'No s’ha pogut restaurar la còpia del núvol.',
        },
      }))
      throw error
    }
  },

  pullFromCloud: async () => {
    const state = get()
    if (!state.cloud.user) return
    if (cloudSyncTimer) clearTimeout(cloudSyncTimer)
    queuedCloudCollections.clear()

    set((current) => ({ cloud: { ...current.cloud, status: 'syncing', error: '' } }))
    try {
      const cloudDataset = await loadCloudDataset(state.cloud.user.uid)
      const dataset = normalizeDataset(cloudDataset)
      await resetDatabase()
      await saveDataset(dataset)
      const ui = getInitialUi(dataset)
      writePreferences({ ...readPreferences(), ...ui })
      set((current) => ({
        ...dataset,
        ui,
        status: 'ready',
        error: '',
        cloud: {
          ...current.cloud,
          status: 'synced',
          error: '',
          lastSyncedAt: new Date().toISOString(),
          pendingCollections: [],
        },
      }))
    } catch (error) {
      set((current) => ({
        cloud: {
          ...current.cloud,
          status: 'error',
          error: error.message || 'No s’han pogut carregar les dades de Firebase.',
        },
      }))
    }
  },

  setActiveClass: async (classId) => {
    const state = get()
    const activeClass = state.classes.find((classItem) => classItem.id === classId)
    const timeline = activeClass?.subject ? ensureFixedCourseForClass(state, classId) : null
    const workingSemesters = timeline?.semesters || state.semesters
    const workingUts = timeline?.uts || state.uts
    const preferences = readPreferences()
    const selection = getClassTimelineSelection(
      { ...state, semesters: workingSemesters, uts: workingUts },
      classId,
      preferences,
    )
    const ui = {
      activeClassId: classId,
      activeSemesterId: selection.activeSemesterId,
      activeUtId: selection.activeUtId,
      activeMode:
        state.ui.activeMode === 'tutoring' && !(activeClass?.isTutoringGroup || activeClass?.subject === 'Tutoria')
          ? 'evaluation'
          : state.ui.activeMode,
    }

    set((current) => ({
      semesters: workingSemesters,
      uts: workingUts,
      ui: { ...current.ui, ...ui },
    }))
    setUiWithPreferences(set, ui)
    if (activeClass?.subject) {
      await persistCollections(set, get, ['semesters', 'uts'])
    }
  },

  setupInitialWorkspace: async ({ subject, classes = [] }) => {
    const cleanSubject = subject?.trim()
    const cleanClasses = classes
      .map((classItem, index) => ({
        name: classItem.name?.trim() || `Classe ${index + 1}`,
        color: classItem.color || DEFAULT_CLASS_COLORS[index % DEFAULT_CLASS_COLORS.length],
      }))
      .filter((classItem) => classItem.name)
    if (!cleanSubject || cleanClasses.length === 0) return false

    const newClasses = []
    const newSemesters = []
    const newUts = []
    const newCompetencies = []
    const newCriteria = []
    const newTasks = []
    const baseOrder = getNextClassOrder(get().classes) - 1

    cleanClasses.forEach((classItem, index) => {
      const id = createId('class')
      const timeline = createCourseTimeline(id)
      const subjectStructure = createSubjectStructureForUts({
        classId: id,
        subjectName: cleanSubject,
        uts: timeline.uts,
      })

      newClasses.push({
        id,
        name: classItem.name,
        subject: cleanSubject,
        color: classItem.color,
        halfGroups: DEFAULT_HALF_GROUPS,
        order: baseOrder + index + 1,
        utModelReady: true,
        isTutoringGroup: false,
        tutorialLinkedClassId: id,
      })
      newSemesters.push(...timeline.semesters)
      newUts.push(...timeline.uts)
      newCompetencies.push(...subjectStructure.competencies)
      newCriteria.push(...subjectStructure.criteria)
      if (timeline.uts[0]) {
        newTasks.push({
          id: createId('task'),
          classId: id,
          utId: timeline.uts[0].id,
          title: 'Coneixements previs',
          date: new Date().toISOString().slice(0, 10),
          order: 1,
        })
      }
    })

    const firstClass = newClasses[0]
    const firstSemester = newSemesters.find((semester) => semester.classId === firstClass.id)
    const firstUt = newUts.find((item) => item.semesterId === firstSemester?.id)
    const ui = {
      activeClassId: firstClass.id,
      activeSemesterId: firstSemester?.id || '',
      activeUtId: firstUt?.id || '',
      activeMode: 'evaluation',
      activeInsight: 'dashboard',
    }
    const profile = { defaultSubject: cleanSubject }

    set((state) => ({
      classes: [...state.classes, ...newClasses],
      semesters: [...state.semesters, ...newSemesters],
      uts: [...state.uts, ...newUts],
      competencies: [...state.competencies, ...newCompetencies],
      criteria: [...state.criteria, ...newCriteria],
      tasks: [...state.tasks, ...newTasks],
      ui,
      profile,
      onboarding: { demoMode: false, guideOpen: true, guideMode: 'own', tutoringGuideSeen: false },
    }))
    writePreferences({ ...readPreferences(), ...ui, ...profile, demoMode: false, guideOpen: true, guideMode: 'own', tutoringGuideSeen: false })
    await persistCollections(set, get, ['classes', 'semesters', 'uts', 'competencies', 'criteria', 'tasks'])
    return true
  },

  reorderClass: async (classId, direction) => {
    const orderedClasses = [...get().classes].sort((a, b) => (a.order || 0) - (b.order || 0))
    const currentIndex = orderedClasses.findIndex((classItem) => classItem.id === classId)
    const targetIndex = currentIndex + direction
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedClasses.length) return

    const nextOrdered = [...orderedClasses]
    const [movedClass] = nextOrdered.splice(currentIndex, 1)
    nextOrdered.splice(targetIndex, 0, movedClass)
    const orderById = new Map(nextOrdered.map((classItem, index) => [classItem.id, index + 1]))

    set((current) => ({
      classes: current.classes.map((classItem) => ({
        ...classItem,
        order: orderById.get(classItem.id) || classItem.order,
      })),
    }))
    await persistCollections(set, get, ['classes'])
  },

  reorderClassToIndex: async (classId, targetIndex) => {
    const orderedClasses = [...get().classes].sort((a, b) => (a.order || 0) - (b.order || 0))
    const currentIndex = orderedClasses.findIndex((classItem) => classItem.id === classId)
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedClasses.length || currentIndex === targetIndex) return

    const nextOrdered = [...orderedClasses]
    const [movedClass] = nextOrdered.splice(currentIndex, 1)
    nextOrdered.splice(targetIndex, 0, movedClass)
    const orderById = new Map(nextOrdered.map((classItem, index) => [classItem.id, index + 1]))

    set((current) => ({
      classes: current.classes.map((classItem) => ({
        ...classItem,
        order: orderById.get(classItem.id) || classItem.order,
      })),
    }))
    await persistCollections(set, get, ['classes'])
  },

  setActiveSemester: (semesterId) => {
    const preferences = readPreferences()
    const activeClassId = get().ui.activeClassId
    const classMemory = preferences.lastUiByClass?.[activeClassId] || {}
    const semesterUts = get()
      .uts.filter((item) => item.semesterId === semesterId)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
    const ut = semesterUts.find((item) => item.id === classMemory.activeUtId) || semesterUts[0]
    setUiWithPreferences(set, { activeSemesterId: semesterId, activeUtId: ut?.id || '' })
  },

  setActiveUt: (activeUtId) => {
    const ut = get().uts.find((item) => item.id === activeUtId)
    setUiWithPreferences(set, { activeSemesterId: ut?.semesterId || get().ui.activeSemesterId, activeUtId })
  },
  setActiveMode: (activeMode) => setUiWithPreferences(set, { activeMode }),
  setActiveInsight: (activeInsight) => setUiWithPreferences(set, { activeInsight }),
  setDefaultSubject: (defaultSubject) => setProfileWithPreferences(set, { defaultSubject }),
  setGuideOpen: (guideOpen) => {
    set((state) => ({ onboarding: { ...state.onboarding, guideOpen } }))
    writePreferences({ ...readPreferences(), guideOpen })
  },
  openGuide: (guideMode = null) => {
    const nextGuideMode = guideMode || get().onboarding.guideMode || 'own'
    set((state) => ({ onboarding: { ...state.onboarding, guideOpen: true, guideMode: nextGuideMode } }))
    writePreferences({ ...readPreferences(), guideOpen: true, guideMode: nextGuideMode })
  },
  setGuideMode: (guideMode) => {
    set((state) => ({ onboarding: { ...state.onboarding, guideMode } }))
    writePreferences({ ...readPreferences(), guideMode })
  },
  setTutoringGuideSeen: (tutoringGuideSeen = true) => {
    set((state) => ({ onboarding: { ...state.onboarding, tutoringGuideSeen } }))
    writePreferences({ ...readPreferences(), tutoringGuideSeen })
  },
  startOwnData: async () => {
    const shouldStart = window.confirm(
      [
        'Això esborrarà les dades demo del dispositiu i començaràs amb una base buida.',
        '',
        'Després podràs triar la teva matèria, crear classes i afegir alumnes.',
        '',
        'Vols començar amb les teves pròpies dades?',
      ].join('\n'),
    )
    if (!shouldStart) return false

    if (cloudSyncTimer) clearTimeout(cloudSyncTimer)
    queuedCloudCollections.clear()
    await resetDatabase()
    await saveDataset(EMPTY_DATASET)
    const ui = {
      activeClassId: '',
      activeSemesterId: '',
      activeUtId: '',
      activeMode: 'evaluation',
      activeInsight: 'dashboard',
    }
    const profile = { defaultSubject: '' }
    const onboarding = { demoMode: false, guideOpen: false, guideMode: 'own', tutoringGuideSeen: false }
    writePreferences({ ...ui, ...profile, demoMode: false, guideOpen: false, guideMode: 'own', tutoringGuideSeen: false, backupMeta: null })
    set({
      ...EMPTY_DATASET,
      ui,
      profile,
      onboarding,
      backupMeta: null,
      status: 'ready',
      error: '',
    })
    return true
  },

  addUt: async (semesterId) => {
    const semester = get().semesters.find((item) => item.id === semesterId)
    if (!semester) return
    const semesterUts = get().uts.filter((ut) => ut.semesterId === semesterId)
    const classUtCount = get().uts.filter((ut) => ut.classId === semester.classId).length
    const newUt = {
      id: createId('ut'),
      classId: semester.classId,
      semesterId,
      name: `UT${classUtCount + 1}`,
      order: semesterUts.length + 1,
    }

    set((state) => ({ uts: [...state.uts, newUt], ui: { ...state.ui, activeUtId: newUt.id } }))
    await persistCollections(set, get, ['uts'])
    writePreferences({ ...readPreferences(), ...get().ui })
  },

  updateUt: async (utId, patch) => {
    set((state) => ({
      uts: state.uts.map((ut) => (ut.id === utId ? { ...ut, ...patch } : ut)),
    }))
    await persistCollections(set, get, ['uts'])
  },

  deleteUt: async (utId) => {
    const state = get()
    const ut = state.uts.find((item) => item.id === utId)
    if (!ut) return
    const competencyIds = state.competencies.filter((competency) => competency.utId === utId).map((item) => item.id)
    const criterionIds = state.criteria
      .filter((criterion) => competencyIds.includes(criterion.competencyId))
      .map((item) => item.id)
    const taskIds = state.tasks.filter((task) => task.utId === utId).map((task) => task.id)
    const remainingUts = state.uts
      .filter((item) => item.classId === ut.classId && item.id !== utId)
      .sort((a, b) => a.order - b.order)
    const nextUt = remainingUts[0]
    const nextSemester = nextUt ? state.semesters.find((semester) => semester.id === nextUt.semesterId) : null

    set((current) => ({
      uts: current.uts.filter((item) => item.id !== utId),
      competencies: current.competencies.filter((competency) => competency.utId !== utId),
      criteria: current.criteria.filter((criterion) => !competencyIds.includes(criterion.competencyId)),
      marks: current.marks.filter((mark) => !criterionIds.includes(mark.criterionId)),
      tasks: current.tasks.filter((task) => task.utId !== utId),
      taskRecords: current.taskRecords.filter((record) => !taskIds.includes(record.taskId)),
      ui:
        current.ui.activeUtId === utId && nextUt
          ? { ...current.ui, activeSemesterId: nextSemester?.id || current.ui.activeSemesterId, activeUtId: nextUt.id }
          : current.ui,
    }))
    await persistCollections(set, get, ['uts', 'competencies', 'criteria', 'marks', 'tasks', 'taskRecords'])
    if (nextUt && get().ui.activeUtId === nextUt.id) writePreferences({ ...readPreferences(), ...get().ui })
  },

  createBackup: () => ({
    app: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    profile: get().profile,
    preferences: readPreferences(),
    collections: getDatasetFromState(get()),
  }),

  restoreBackup: async (backup, meta = {}) => {
    try {
      const dataset = normalizeDataset(parseBackupDataset(backup))
      await resetDatabase()
      await saveDataset(dataset)
      const ui = getInitialUi(dataset)
      const profile = {
        ...getInitialProfile(),
        ...(backup?.profile || {}),
      }
      const backupMeta = {
        filename: meta.filename || backup?.migration?.trackingV1?.sourceFile || '',
        importedAt: new Date().toISOString(),
        app: backup?.app || '',
        version: backup?.version || '',
      }
      writePreferences({ ...readPreferences(), ...(backup?.preferences || {}), ...ui, ...profile, backupMeta })
      set({ ...dataset, ui, profile, backupMeta, status: 'ready', error: '' })
    } catch (error) {
      set({ error: error.message || 'No s’ha pogut restaurar la còpia de seguretat.' })
      throw error
    }
  },

  addClass: async ({ name, subject, color = 'blue' } = {}) => {
    const id = createId('class')
    const classSubject = subject || get().profile.defaultSubject
    const timeline = createCourseTimeline(id)
    const subjectStructure = createSubjectStructureForUts({
      classId: id,
      subjectName: classSubject,
      uts: timeline.uts,
    })
    const initialTask = timeline.uts[0]
      ? [
          {
            id: createId('task'),
            classId: id,
            utId: timeline.uts[0].id,
            title: 'Coneixements previs',
            date: new Date().toISOString().slice(0, 10),
            order: 1,
          },
        ]
      : []

    set((state) => ({
      classes: [
        ...state.classes,
        {
          id,
          name: name?.trim() || `Grup ${state.classes.length + 1}`,
          subject: classSubject,
          color,
          halfGroups: DEFAULT_HALF_GROUPS,
          order: getNextClassOrder(state.classes),
          utModelReady: true,
          isTutoringGroup: false,
          tutorialLinkedClassId: id,
        },
      ],
      semesters: [...state.semesters, ...timeline.semesters],
      uts: [...state.uts, ...timeline.uts],
      competencies: [...state.competencies, ...subjectStructure.competencies],
      criteria: [...state.criteria, ...subjectStructure.criteria],
      tasks: [...state.tasks, ...initialTask],
      ui: {
        ...state.ui,
        activeClassId: id,
        activeSemesterId: timeline.semesters[0].id,
        activeUtId: timeline.uts[0].id,
      },
    }))
    writePreferences({ ...readPreferences(), ...get().ui })
    await persistCollections(set, get, ['classes', 'semesters', 'uts', 'competencies', 'criteria', 'tasks'])
  },

  updateClass: async (classId, patch) => {
    set((state) => {
      const currentClass = state.classes.find((classItem) => classItem.id === classId)
      const subjectChanged =
        Object.prototype.hasOwnProperty.call(patch, 'subject') && patch.subject !== currentClass?.subject
      const nextSubject = patch.subject ?? currentClass?.subject
      const timeline = subjectChanged ? ensureFixedCourseForClass(state, classId) : null
      const subjectStructure = subjectChanged
        ? ensureSubjectStructureForClass(
            { ...state, semesters: timeline.semesters, uts: timeline.uts },
            classId,
            nextSubject,
            timeline.classUts,
          )
        : null
      const nextIsTutoringGroup =
        patch.isTutoringGroup ?? Boolean(currentClass?.isTutoringGroup || nextSubject === 'Tutoria')
      const shouldLeaveTutoringMode =
        state.ui.activeClassId === classId &&
        state.ui.activeMode === 'tutoring' &&
        !nextIsTutoringGroup &&
        nextSubject !== 'Tutoria'

      return {
        classes: state.classes.map((classItem) =>
          classItem.id === classId ? { ...classItem, ...patch } : classItem,
        ),
        semesters: timeline?.semesters || state.semesters,
        uts: timeline?.uts || state.uts,
        competencies: subjectStructure?.competencies || state.competencies,
        criteria: subjectStructure?.criteria || state.criteria,
        ui: shouldLeaveTutoringMode ? { ...state.ui, activeMode: 'evaluation' } : state.ui,
      }
    })
    writePreferences({ ...readPreferences(), ...get().ui })
    await persistCollections(set, get, ['classes', 'semesters', 'uts', 'competencies', 'criteria'])
  },

  deleteClass: async (classId) => {
    const state = get()
    const classToDelete = state.classes.find((classItem) => classItem.id === classId)
    if (!classToDelete) return

    const studentIds = new Set(state.students.filter((student) => student.classId === classId).map((student) => student.id))
    const utIds = new Set(state.uts.filter((ut) => ut.classId === classId).map((ut) => ut.id))
    const competencyIds = new Set(
      state.competencies
        .filter((competency) => competency.classId === classId || utIds.has(competency.utId))
        .map((competency) => competency.id),
    )
    const criterionIds = new Set(
      state.criteria.filter((criterion) => competencyIds.has(criterion.competencyId)).map((criterion) => criterion.id),
    )
    const taskIds = new Set(state.tasks.filter((task) => task.classId === classId || utIds.has(task.utId)).map((task) => task.id))
    const remainingClasses = state.classes
      .filter((classItem) => classItem.id !== classId)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((classItem, index) => ({ ...classItem, order: index + 1 }))
    const nextClass = remainingClasses[0]
    const nextSemester = nextClass
      ? state.semesters
          .filter((semester) => semester.classId === nextClass.id)
          .sort((a, b) => a.order - b.order)[0]
      : null
    const nextUt = nextSemester
      ? state.uts
          .filter((ut) => ut.semesterId === nextSemester.id)
          .sort((a, b) => a.order - b.order)[0]
      : null
    const ui =
      state.ui.activeClassId === classId
        ? {
            ...state.ui,
            activeClassId: nextClass?.id || '',
            activeSemesterId: nextSemester?.id || '',
            activeUtId: nextUt?.id || '',
          }
        : state.ui

    set({
      classes: remainingClasses,
      students: state.students.filter((student) => student.classId !== classId),
      semesters: state.semesters.filter((semester) => semester.classId !== classId),
      uts: state.uts.filter((ut) => ut.classId !== classId),
      competencies: state.competencies.filter((competency) => !competencyIds.has(competency.id)),
      criteria: state.criteria.filter((criterion) => !criterionIds.has(criterion.id)),
      indicators: state.indicators.filter((indicator) => !criterionIds.has(indicator.criterionId)),
      marks: state.marks.filter((mark) => !studentIds.has(mark.studentId) && !criterionIds.has(mark.criterionId)),
      tasks: state.tasks.filter((task) => !taskIds.has(task.id)),
      taskRecords: state.taskRecords.filter(
        (record) => !studentIds.has(record.studentId) && !taskIds.has(record.taskId),
      ),
      behaviorEvents: state.behaviorEvents.filter(
        (event) => event.classId !== classId && !studentIds.has(event.studentId),
      ),
      agendaNotes: state.agendaNotes.filter((note) => note.classId !== classId && !studentIds.has(note.studentId)),
      tutorialRecords: state.tutorialRecords.filter(
        (record) => record.classId !== classId && !studentIds.has(record.studentId),
      ),
      tutorialMarks: state.tutorialMarks.filter(
        (mark) => mark.classId !== classId && !studentIds.has(mark.studentId),
      ),
      tutorialRelations: state.tutorialRelations.filter(
        (relation) =>
          relation.classId !== classId &&
          !studentIds.has(relation.sourceStudentId) &&
          !studentIds.has(relation.targetStudentId),
      ),
      tutorialGroupSets: (state.tutorialGroupSets || []).filter((groupSet) => groupSet.classId !== classId),
      tutorialSociogramLayouts: (state.tutorialSociogramLayouts || []).filter((layout) => layout.classId !== classId),
      tutorialStudentRoles: (state.tutorialStudentRoles || []).filter(
        (role) => role.classId !== classId && !studentIds.has(role.studentId),
      ),
      tutorialSeatingPlans: (state.tutorialSeatingPlans || []).filter((plan) => plan.classId !== classId),
      seatingCharts: state.seatingCharts.filter((chart) => chart.classId !== classId),
      studentAntecedents: state.studentAntecedents.filter(
        (antecedent) => antecedent.classId !== classId && !studentIds.has(antecedent.studentId),
      ),
      ui,
    })
    writePreferences({ ...readPreferences(), ...ui })
    await persistCollections(set, get, COLLECTIONS)
  },

  updateMark: async (studentId, criterionId, value) => {
    set((state) => {
      const existing = state.marks.find(
        (mark) => mark.studentId === studentId && mark.criterionId === criterionId,
      )
      const marks = value
        ? existing
          ? state.marks.map((mark) => (mark.id === existing.id ? { ...mark, value } : mark))
          : [...state.marks, { id: createId('mark'), studentId, criterionId, value }]
        : state.marks.filter((mark) => mark.id !== existing?.id)
      return { marks }
    })
    await persistCollections(set, get, ['marks'])
  },

  updateMarksBulk: async (updates) => {
    if (updates.length === 0) return

    set((state) => {
      const updateMap = new Map(updates.map((update) => [`${update.studentId}_${update.criterionId}`, update.value]))
      const touchedKeys = new Set(updateMap.keys())
      const marks = state.marks
        .filter((mark) => !touchedKeys.has(`${mark.studentId}_${mark.criterionId}`))
        .concat(
          updates
            .filter((update) => update.value)
            .map((update) => ({
              id: createId('mark'),
              studentId: update.studentId,
              criterionId: update.criterionId,
              value: update.value,
            })),
        )

      return { marks }
    })
    await persistCollections(set, get, ['marks'])
  },

  updateTutorialMark: async ({ classId, studentId, subject, competencyKey, criterionKey, value }) => {
    const targetKey = competencyKey || criterionKey
    if (!classId || !studentId || !subject || !targetKey) return

    set((state) => {
      const existing = state.tutorialMarks.find(
        (mark) =>
          mark.classId === classId &&
          mark.studentId === studentId &&
          mark.subject === subject &&
          (mark.competencyKey === targetKey || (!competencyKey && mark.criterionKey === targetKey)),
      )
      const cleanValue = value || ''
      const tutorialMarks = cleanValue
        ? existing
          ? state.tutorialMarks.map((mark) =>
              mark.id === existing.id
                ? {
                    ...mark,
                    competencyKey: competencyKey || mark.competencyKey,
                    criterionKey: criterionKey || mark.criterionKey,
                    value: cleanValue,
                    updatedAt: new Date().toISOString(),
                  }
                : mark,
            )
          : [
              ...state.tutorialMarks,
              {
                id: createId('tmark'),
                classId,
                studentId,
                subject,
                competencyKey: competencyKey || null,
                criterionKey: criterionKey || null,
                value: cleanValue,
                updatedAt: new Date().toISOString(),
              },
            ]
        : state.tutorialMarks.filter((mark) => mark.id !== existing?.id)

      return { tutorialMarks }
    })
    await persistCollections(set, get, ['tutorialMarks'])
  },

  importTutorialMarks: async (updates) => {
    const cleanUpdates = updates
      .map((update) => ({
        classId: update.classId,
        source: update.source || null,
        studentId: update.studentId,
        subject: update.subject,
        competencyKey: update.competencyKey,
        value: update.value || '',
      }))
      .filter((update) => update.classId && update.studentId && update.subject && update.competencyKey)
    if (cleanUpdates.length === 0) return

    set((state) => {
      const updateMap = new Map(
        cleanUpdates.map((update) => [
          `${update.classId}_${update.studentId}_${update.subject}_${update.competencyKey}`,
          update,
        ]),
      )
      const touchedKeys = new Set(updateMap.keys())
      const untouchedMarks = state.tutorialMarks.filter(
        (mark) => !touchedKeys.has(`${mark.classId}_${mark.studentId}_${mark.subject}_${mark.competencyKey}`),
      )
      const now = new Date().toISOString()
      const tutorialMarks = [
        ...untouchedMarks,
        ...cleanUpdates
          .filter((update) => update.value)
          .map((update) => ({
            id: createId('tmark'),
            classId: update.classId,
            studentId: update.studentId,
            subject: update.subject,
            competencyKey: update.competencyKey,
            criterionKey: null,
            source: update.source || null,
            value: update.value,
            updatedAt: now,
          })),
      ]

      return { tutorialMarks }
    })
    await persistCollections(set, get, ['tutorialMarks'])
  },

  createTeacherGradePackage: (classId = get().ui.activeClassId) =>
    buildTeacherGradePackage({
      classId,
      sender: getTeacherSender(get()),
      state: get(),
    }),

  previewTeacherGradePackage: (packageData, classId = get().ui.activeClassId) =>
    previewTeacherGradePackage({
      packageData,
      targetStudents: getTutoringRosterStudents(get(), classId),
    }),

  importTeacherGradePackage: async (packageData, classId = get().ui.activeClassId) => {
    const state = get()
    const targetStudents = getTutoringRosterStudents(state, classId)
    const preview = previewTeacherGradePackage({ packageData, targetStudents })
    const updates = getTutorialMarkUpdatesFromTeacherPackage({
      packageData,
      targetClassId: classId,
      targetStudents,
    })

    await get().importTutorialMarks(updates)

    return {
      ...preview.summary,
      importedGrades: updates.length,
    }
  },

  sendTeacherGradePackageToTutor: async ({ classId = get().ui.activeClassId, recipientEmail }) => {
    const state = get()
    if (!state.cloud.user) throw new Error('Cal iniciar sessió amb Google abans d’enviar el paquet al núvol.')

    set((current) => ({
      cloud: { ...current.cloud, teacherPackagesError: '', teacherPackagesStatus: 'sending' },
    }))

    try {
      const packageData = get().createTeacherGradePackage(classId)
      const sentPackage = await sendTeacherGradePackage({
        packageData,
        recipientEmail,
        user: state.cloud.user,
      })

      set((current) => ({
        cloud: {
          ...current.cloud,
          teacherPackagesError: '',
          teacherPackagesStatus: 'sent',
        },
      }))
      get().loadSentTeacherGradePackages()

      return sentPackage
    } catch (error) {
      set((current) => ({
        cloud: {
          ...current.cloud,
          teacherPackagesError: error.message || 'No s’ha pogut enviar el paquet de notes.',
          teacherPackagesStatus: 'error',
        },
      }))
      throw error
    }
  },

  loadReceivedTeacherGradePackages: async () => {
    const state = get()
    if (!state.cloud.user?.email) return []

    set((current) => ({
      cloud: { ...current.cloud, teacherPackagesError: '', teacherPackagesStatus: 'loading' },
    }))

    try {
      const teacherPackages = await listReceivedTeacherGradePackages(state.cloud.user.email, 20)
      set((current) => ({
        cloud: {
          ...current.cloud,
          teacherPackages,
          teacherPackagesError: '',
          teacherPackagesStatus: 'loaded',
        },
      }))
      return teacherPackages
    } catch (error) {
      set((current) => ({
        cloud: {
          ...current.cloud,
          teacherPackagesError: error.message || 'No s’han pogut carregar els paquets rebuts.',
          teacherPackagesStatus: 'error',
        },
      }))
      return []
    }
  },

  loadSentTeacherGradePackages: async () => {
    const state = get()
    if (!state.cloud.user?.uid) return []

    set((current) => ({
      cloud: { ...current.cloud, teacherPackagesError: '', teacherPackagesStatus: 'loading' },
    }))

    try {
      const sentTeacherPackages = await listSentTeacherGradePackages(state.cloud.user.uid, 20)
      set((current) => ({
        cloud: {
          ...current.cloud,
          sentTeacherPackages,
          teacherPackagesError: '',
          teacherPackagesStatus: 'loaded',
        },
      }))
      return sentTeacherPackages
    } catch (error) {
      set((current) => ({
        cloud: {
          ...current.cloud,
          teacherPackagesError: error.message || 'No s’han pogut carregar els paquets enviats.',
          teacherPackagesStatus: 'error',
        },
      }))
      return []
    }
  },

  importReceivedTeacherGradePackage: async ({ classId = get().ui.activeClassId, packageId }) => {
    const state = get()
    if (!state.cloud.user?.email) throw new Error('Cal iniciar sessió amb Google abans d’importar paquets rebuts.')
    const receivedPackage = state.cloud.teacherPackages.find((packageItem) => packageItem.id === packageId)
    if (!receivedPackage?.packageData) throw new Error('No s’ha trobat aquest paquet rebut.')

    const result = await get().importTeacherGradePackage(receivedPackage.packageData, classId)
    await markTeacherGradePackageImported({ packageId, userEmail: state.cloud.user.email })
    await get().loadReceivedTeacherGradePackages()

    return result
  },

  addTutorialRecord: async ({ classId, studentId, type, date, note }) => {
    if (!classId || !studentId || !type) return

    const cleanNote = String(note || '').trim()
    const cleanDate = date || new Date().toISOString().slice(0, 10)

    set((state) => ({
      tutorialRecords: [
        ...state.tutorialRecords,
        {
          id: createId('trecord'),
          classId,
          studentId,
          type,
          date: cleanDate,
          note: cleanNote,
          createdAt: new Date().toISOString(),
        },
      ],
    }))
    await persistCollections(set, get, ['tutorialRecords'])
  },

  deleteTutorialRecord: async (recordId) => {
    if (!recordId) return

    set((state) => ({
      tutorialRecords: state.tutorialRecords.filter((record) => record.id !== recordId),
    }))
    await persistCollections(set, get, ['tutorialRecords'])
  },

  upsertTutorialRelation: async ({ classId, sourceStudentId, targetStudentId, type, strength = 2, note }) => {
    if (!classId || !sourceStudentId || !targetStudentId || !type || sourceStudentId === targetStudentId) return

    const cleanNote = String(note || '').trim()
    const cleanStrength = Math.min(3, Math.max(1, Number(strength) || 2))
    const now = new Date().toISOString()

    set((state) => {
      const existing = state.tutorialRelations.find(
        (relation) =>
          relation.classId === classId &&
          relation.sourceStudentId === sourceStudentId &&
          relation.targetStudentId === targetStudentId &&
          relation.type === type,
      )
      const nextRelation = {
        ...(existing || {
          id: createId('trel'),
          classId,
          sourceStudentId,
          targetStudentId,
          type,
          createdAt: now,
        }),
        note: cleanNote,
        strength: cleanStrength,
        updatedAt: now,
      }

      return {
        tutorialRelations: existing
          ? state.tutorialRelations.map((relation) => (relation.id === existing.id ? nextRelation : relation))
          : [...state.tutorialRelations, nextRelation],
      }
    })
    await persistCollections(set, get, ['tutorialRelations'])
  },

  deleteTutorialRelation: async (relationId) => {
    if (!relationId) return

    set((state) => ({
      tutorialRelations: state.tutorialRelations.filter((relation) => relation.id !== relationId),
    }))
    await persistCollections(set, get, ['tutorialRelations'])
  },

  saveTutorialGroupSet: async ({ classId, name, groupSize, prioritizeHalfGroups, strategy, groups }) => {
    if (!classId || !Array.isArray(groups) || groups.length === 0) return

    const cleanName = String(name || '').trim() || `Grups cooperatius ${new Date().toISOString().slice(0, 10)}`
    const now = new Date().toISOString()
    const cleanGroups = groups.map((group, index) => ({
      id: group.id || `group_${index + 1}`,
      memberIds: (group.members || [])
        .map((member) => member.student?.id || member.studentId || member.id)
        .filter(Boolean),
      name: group.name || `Grup ${index + 1}`,
    }))

    set((state) => ({
      tutorialGroupSets: [
        {
          id: createId('tgroups'),
          classId,
          createdAt: now,
          groupSize: Number(groupSize) || 4,
          groups: cleanGroups,
          name: cleanName,
          prioritizeHalfGroups: Boolean(prioritizeHalfGroups),
          strategy: strategy || 'balanced',
          updatedAt: now,
        },
        ...(state.tutorialGroupSets || []),
      ],
    }))
    await persistCollections(set, get, ['tutorialGroupSets'])
  },

  deleteTutorialGroupSet: async (groupSetId) => {
    if (!groupSetId) return

    set((state) => ({
      tutorialGroupSets: (state.tutorialGroupSets || []).filter((groupSet) => groupSet.id !== groupSetId),
    }))
    await persistCollections(set, get, ['tutorialGroupSets'])
  },

  upsertTutorialSociogramLayout: async ({ classId, positions }) => {
    if (!classId || !positions) return

    const now = new Date().toISOString()
    const cleanPositions = Object.entries(positions)
      .map(([studentId, position]) => ({
        studentId,
        x: Math.min(94, Math.max(6, Number(position?.x) || 50)),
        y: Math.min(92, Math.max(8, Number(position?.y) || 50)),
      }))
      .filter((position) => position.studentId)

    set((state) => {
      const existing = (state.tutorialSociogramLayouts || []).find((layout) => layout.classId === classId)
      const nextLayout = {
        id: existing?.id || createId('sociogram'),
        classId,
        createdAt: existing?.createdAt || now,
        positions: cleanPositions,
        updatedAt: now,
      }

      return {
        tutorialSociogramLayouts: existing
          ? (state.tutorialSociogramLayouts || []).map((layout) => (layout.id === existing.id ? nextLayout : layout))
          : [nextLayout, ...(state.tutorialSociogramLayouts || [])],
      }
    })
    await persistCollections(set, get, ['tutorialSociogramLayouts'])
  },

  resetTutorialSociogramLayout: async (classId) => {
    if (!classId) return

    set((state) => ({
      tutorialSociogramLayouts: (state.tutorialSociogramLayouts || []).filter((layout) => layout.classId !== classId),
    }))
    await persistCollections(set, get, ['tutorialSociogramLayouts'])
  },

  toggleTutorialStudentRole: async ({ classId, studentId, role }) => {
    if (!classId || !studentId || !role) return

    const now = new Date().toISOString()
    set((state) => {
      const existing = (state.tutorialStudentRoles || []).find(
        (item) => item.classId === classId && item.studentId === studentId && item.role === role,
      )

      return {
        tutorialStudentRoles: existing
          ? (state.tutorialStudentRoles || []).filter((item) => item.id !== existing.id)
          : [
              {
                id: createId('trole'),
                classId,
                createdAt: now,
                role,
                studentId,
                updatedAt: now,
              },
              ...(state.tutorialStudentRoles || []),
            ],
      }
    })
    await persistCollections(set, get, ['tutorialStudentRoles'])
  },

  saveTutorialSeatingPlan: async ({ classId, layout, seats, title }) => {
    if (!classId || !layout || !Array.isArray(seats)) return

    const now = new Date().toISOString()
    set((state) => {
      const nextPlan = {
        id: createId('tseat'),
        classId,
        createdAt: now,
        layout,
        seats,
        title: String(title || '').trim() || 'Disposició recomanada',
        updatedAt: now,
      }

      return {
        tutorialSeatingPlans: [nextPlan, ...(state.tutorialSeatingPlans || [])],
      }
    })
    await persistCollections(set, get, ['tutorialSeatingPlans'])
  },

  addCompetency: async (utId) => {
    const classId = get().ui.activeClassId
    const existingCompetencies = get().competencies.filter((competency) => competency.utId === utId)
    const competencyId = createId('comp')
    set((state) => ({
      competencies: [
        ...state.competencies,
        {
          id: competencyId,
          classId,
          utId,
          name: `Nova competència ${existingCompetencies.length + 1}`,
          color: ['orange', 'green', 'purple', 'blue'][existingCompetencies.length % 4],
          order: existingCompetencies.length + 1,
        },
      ],
      criteria: [
        ...state.criteria,
        { id: createId('crit'), competencyId, name: 'Criteri 1', order: 1 },
      ],
    }))
    await persistCollections(set, get, ['competencies', 'criteria'])
  },

  updateCompetency: async (competencyId, patch) => {
    set((state) => ({
      competencies: state.competencies.map((competency) =>
        competency.id === competencyId ? { ...competency, ...patch } : competency,
      ),
    }))
    await persistCollections(set, get, ['competencies'])
  },

  deleteCompetency: async (competencyId) => {
    const criteriaIds = get()
      .criteria.filter((criterion) => criterion.competencyId === competencyId)
      .map((criterion) => criterion.id)
    set((state) => ({
      competencies: state.competencies.filter((competency) => competency.id !== competencyId),
      criteria: state.criteria.filter((criterion) => criterion.competencyId !== competencyId),
      indicators: state.indicators.filter((indicator) => !criteriaIds.includes(indicator.criterionId)),
      marks: state.marks.filter((mark) => !criteriaIds.includes(mark.criterionId)),
    }))
    await persistCollections(set, get, ['competencies', 'criteria', 'indicators', 'marks'])
  },

  setUtCompetencyActive: async (utId, competencyName, isActive) => {
    const state = get()
    const ut = state.uts.find((item) => item.id === utId)
    if (!ut || !competencyName) return

    const activeClass = state.classes.find((classItem) => classItem.id === ut.classId)
    const subjectName = getSubjectOption(activeClass?.subject)?.name || activeClass?.subject
    const subjectStructure = getSubjectStructure(subjectName)
    const competencyTemplate = subjectStructure?.find((item) => item.name === competencyName)
    if (!activeClass || !competencyTemplate) return

    const existingCompetency = state.competencies.find(
      (competency) => competency.utId === utId && competency.name === competencyName,
    )
    const disabledNames = new Set(ut.disabledCompetencyNames || [])

    if (!isActive) {
      disabledNames.add(competencyName)
      set((current) => ({
        uts: current.uts.map((item) =>
          item.id === utId ? { ...item, disabledCompetencyNames: Array.from(disabledNames) } : item,
        ),
        competencies: existingCompetency
          ? current.competencies.map((competency) =>
              competency.id === existingCompetency.id ? { ...competency, inactive: true } : competency,
            )
          : current.competencies,
      }))
      await persistCollections(set, get, ['uts', 'competencies'])
      return
    }

    disabledNames.delete(competencyName)
    if (existingCompetency) {
      set((current) => ({
        uts: current.uts.map((item) =>
          item.id === utId ? { ...item, disabledCompetencyNames: Array.from(disabledNames) } : item,
        ),
        competencies: current.competencies.map((competency) =>
          competency.id === existingCompetency.id ? { ...competency, inactive: false } : competency,
        ),
      }))
      await persistCollections(set, get, ['uts', 'competencies'])
      return
    }

    const existingUtCompetencies = state.competencies.filter((competency) => competency.utId === utId)
    const competencyId = createId('comp')
    const templateOrder = subjectStructure.findIndex((item) => item.name === competencyName)
    const newCompetency = {
      id: competencyId,
      classId: activeClass.id,
      utId,
      name: competencyTemplate.name,
      color: competencyTemplate.color,
      order: templateOrder >= 0 ? templateOrder + 1 : existingUtCompetencies.length + 1,
      source: subjectName,
    }
    const newCriteria = competencyTemplate.criteria.map((criterionName, criterionIndex) => ({
      id: createId('crit'),
      competencyId,
      name: criterionName,
      order: criterionIndex + 1,
      rubric: { A: '', B: '', C: '', D: '' },
    }))

    set((current) => ({
      uts: current.uts.map((item) =>
        item.id === utId ? { ...item, disabledCompetencyNames: Array.from(disabledNames) } : item,
      ),
      competencies: [...current.competencies, newCompetency],
      criteria: [...current.criteria, ...newCriteria],
    }))
    await persistCollections(set, get, ['uts', 'competencies', 'criteria'])
  },

  addCriterion: async (competencyId) => {
    const existingCriteria = get().criteria.filter((criterion) => criterion.competencyId === competencyId)
    set((state) => ({
      criteria: [
        ...state.criteria,
        {
          id: createId('crit'),
          competencyId,
          name: `Criteri ${existingCriteria.length + 1}`,
          order: existingCriteria.length + 1,
        },
      ],
    }))
    await persistCollections(set, get, ['criteria'])
  },

  updateCriterion: async (criterionId, patch) => {
    set((state) => ({
      criteria: state.criteria.map((criterion) =>
        criterion.id === criterionId ? { ...criterion, ...patch } : criterion,
      ),
    }))
    await persistCollections(set, get, ['criteria'])
  },

  deleteCriterion: async (criterionId) => {
    set((state) => ({
      criteria: state.criteria.filter((criterion) => criterion.id !== criterionId),
      indicators: state.indicators.filter((indicator) => indicator.criterionId !== criterionId),
      marks: state.marks.filter((mark) => mark.criterionId !== criterionId),
    }))
    await persistCollections(set, get, ['criteria', 'indicators', 'marks'])
  },

  copyCompetenciesToUt: async ({ competencyIds, targetClassId, targetUtId }) => {
    if (competencyIds.length === 0 || !targetClassId || !targetUtId) return

    const sourceCompetencies = get()
      .competencies.filter((competency) => competencyIds.includes(competency.id))
      .sort((a, b) => a.order - b.order)
    const existingTargetCount = get().competencies.filter((competency) => competency.utId === targetUtId).length

    const copiedCompetencies = []
    const copiedCriteria = []

    sourceCompetencies.forEach((competency, index) => {
      const newCompetencyId = createId('comp')
      copiedCompetencies.push({
        ...competency,
        id: newCompetencyId,
        classId: targetClassId,
        utId: targetUtId,
        order: existingTargetCount + index + 1,
      })

      get()
        .criteria.filter((criterion) => criterion.competencyId === competency.id)
        .sort((a, b) => a.order - b.order)
        .forEach((criterion) => {
          copiedCriteria.push({
            ...criterion,
            id: createId('crit'),
            competencyId: newCompetencyId,
          })
        })
    })

    set((state) => ({
      competencies: [...state.competencies, ...copiedCompetencies],
      criteria: [...state.criteria, ...copiedCriteria],
    }))
    await persistCollections(set, get, ['competencies', 'criteria'])
  },

  applySubjectCfnToUt: async (utId, competencyNames = null) => {
    const activeClass = get().classes.find((classItem) => classItem.id === get().ui.activeClassId)
    const subject = getSubjectOption(activeClass?.subject)
    if (!subject || !utId) return
    const targetUt = get().uts.find((ut) => ut.id === utId)
    const disabledNames = new Set(targetUt?.disabledCompetencyNames || [])

    const existingCompetencies = get().competencies.filter((competency) => competency.utId === utId)
    const existingCompetencyNames = new Set(existingCompetencies.map((competency) => competency.name))
    const subjectStructure = getSubjectStructure(subject.name)
    const structure =
      subjectStructure ||
      Array.from({ length: subject.defaultCompetencyCount }).map((_, index) => ({
        name: `${subject.name} · Competència ${index + 1}`,
        color: ['orange', 'green', 'purple', 'blue'][index % 4],
        criteria: [`Criteri ${index + 1}.1`],
      }))
    const requestedNames = competencyNames ? new Set(competencyNames) : null
    const competenciesToCreate = structure.filter(
      (competencyTemplate) =>
        (!requestedNames || requestedNames.has(competencyTemplate.name)) &&
        (requestedNames || !disabledNames.has(competencyTemplate.name)) &&
        !existingCompetencyNames.has(competencyTemplate.name),
    )
    if (requestedNames) {
      requestedNames.forEach((name) => disabledNames.delete(name))
    }
    const newCompetencies = []
    const newCriteria = []

    competenciesToCreate.forEach((competencyTemplate, index) => {
      const competencyId = createId('comp')
      newCompetencies.push({
        id: competencyId,
        classId: activeClass.id,
        utId,
        name: competencyTemplate.name,
        color: competencyTemplate.color,
        order: existingCompetencies.length + index + 1,
        source: subject.name,
      })
      competencyTemplate.criteria.forEach((criterionName, criterionIndex) => {
        newCriteria.push({
          id: createId('crit'),
          competencyId,
          name: criterionName,
          order: criterionIndex + 1,
          rubric: { A: '', B: '', C: '', D: '' },
        })
      })
    })

    if (newCompetencies.length === 0) {
      if (requestedNames && targetUt) {
        set((state) => ({
          uts: state.uts.map((ut) =>
            ut.id === utId ? { ...ut, disabledCompetencyNames: Array.from(disabledNames) } : ut,
          ),
          competencies: state.competencies.map((competency) =>
            competency.utId === utId && requestedNames.has(competency.name)
              ? { ...competency, inactive: false }
              : competency,
          ),
        }))
        await persistCollections(set, get, ['uts', 'competencies'])
      }
      return
    }

    set((state) => ({
      uts: state.uts.map((ut) =>
        ut.id === utId ? { ...ut, disabledCompetencyNames: Array.from(disabledNames) } : ut,
      ),
      competencies: [
        ...state.competencies.map((competency) =>
          requestedNames && competency.utId === utId && requestedNames.has(competency.name)
            ? { ...competency, inactive: false }
            : competency,
        ),
        ...newCompetencies,
      ],
      criteria: [...state.criteria, ...newCriteria],
    }))
    await persistCollections(set, get, ['uts', 'competencies', 'criteria'])
  },

  updateTaskRecord: async (studentId, taskId, status) => {
    const task = get().tasks.find((item) => item.id === taskId)
    if (!task) return

    set((state) => {
      const existing = state.taskRecords.find(
        (record) => record.studentId === studentId && record.taskId === taskId,
      )
      const taskRecords =
        existing?.status === status || status === ''
          ? state.taskRecords.filter((record) => record.id !== existing?.id)
          : existing
            ? state.taskRecords.map((record) =>
                record.id === existing.id ? { ...record, status } : record,
              )
            : [
                ...state.taskRecords,
                {
                  id: createId('rec'),
                  classId: task.classId,
                  utId: task.utId,
                  studentId,
                  taskId,
                  status,
                },
              ]
      return { taskRecords }
    })
    await persistCollections(set, get, ['taskRecords'])
  },

  updateTaskRecordMeta: async (studentId, taskId, patch) => {
    const task = get().tasks.find((item) => item.id === taskId)
    if (!task) return

    set((state) => {
      const existing = state.taskRecords.find(
        (record) => record.studentId === studentId && record.taskId === taskId,
      )
      const taskRecords = existing
        ? state.taskRecords.map((record) => (record.id === existing.id ? { ...record, ...patch } : record))
        : [
            ...state.taskRecords,
            {
              id: createId('rec'),
              classId: task.classId,
              utId: task.utId,
              studentId,
              taskId,
              status: '',
              ...patch,
            },
          ]
      return { taskRecords }
    })
    await persistCollections(set, get, ['taskRecords'])
  },

  addBehaviorEvent: async (studentId, type, text = '') => {
    const classId = get().ui.activeClassId
    const label = text.trim() || (type === 'incident' ? 'Incidència pendent de detallar' : 'Observació positiva')
    const createdAt = new Date().toISOString()
    set((state) => ({
      behaviorEvents: [
        ...state.behaviorEvents,
        {
          id: createId('beh'),
          classId,
          studentId,
          type,
          text: label,
          date: createdAt.slice(0, 10),
          createdAt,
        },
      ],
    }))
    await persistCollections(set, get, ['behaviorEvents'])
  },

  deferTaskAgendaWarning: async (studentId, missingCount) => {
    set((state) => ({
      students: state.students.map((student) =>
        student.id === studentId ? { ...student, taskAgendaDeferredAt: missingCount } : student,
      ),
    }))
    await persistCollections(set, get, ['students'])
  },

  addAgendaNote: async (studentId, type, text, meta = {}) => {
    const classId = get().ui.activeClassId
    const cleanText = text.trim()
    if (!cleanText) return
    const createdAt = new Date().toISOString()

    set((state) => ({
      agendaNotes: [
        ...state.agendaNotes,
        {
          ...meta,
          id: createId('note'),
          classId,
          studentId,
          type,
          text: cleanText,
          date: createdAt.slice(0, 10),
          createdAt,
        },
      ],
    }))
    await persistCollections(set, get, ['agendaNotes'])
  },

  deleteAgendaNote: async (noteId) => {
    set((state) => ({
      agendaNotes: state.agendaNotes.filter((note) => note.id !== noteId),
    }))
    await persistCollections(set, get, ['agendaNotes'])
  },

  addStudents: async (classId, studentsToAdd) => {
    if (studentsToAdd.length === 0) return

    set((state) => ({
      students: [
        ...state.students,
        ...studentsToAdd.map((student) => ({
          id: createId('student'),
          classId,
          name: formatStudentNameForDisplay(student.name),
          halfGroup: student.halfGroup || '',
          photoUrl: student.photoUrl || '',
          personalNotes: student.personalNotes || '',
        })),
      ],
    }))
    await persistCollections(set, get, ['students'])
  },

  addStudentsFromText: async (classId, rawText) => {
    const studentsToAdd = rawText
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line) => line.replace(/\t+/g, ' ').trim())
      .filter(Boolean)
      .map((name) => ({ name: formatStudentNameForDisplay(name), halfGroup: '' }))

    await get().addStudents(classId, studentsToAdd)
  },

  updateStudent: async (studentId, patch) => {
    set((state) => ({
      students: state.students.map((student) =>
        student.id === studentId
          ? { ...student, ...patch, name: patch.name ? formatStudentNameForDisplay(patch.name) : student.name }
          : student,
      ),
    }))
    await persistCollections(set, get, ['students'])
  },

  upsertStudentAntecedent: async (studentId, patch) => {
    const student = get().students.find((item) => item.id === studentId)
    if (!student) return

    const updatedAt = new Date().toISOString()

    set((state) => {
      const existing = state.studentAntecedents.find((antecedent) => antecedent.studentId === studentId)
      const nextAntecedent = {
        id: existing?.id || createId('ant'),
        studentId,
        classId: student.classId,
        courseLabel: patch.courseLabel ?? existing?.courseLabel ?? '',
        lastLookGrade: patch.lastLookGrade ?? existing?.lastLookGrade ?? '',
        competencyGrades: patch.competencyGrades ?? existing?.competencyGrades ?? {},
        profile: patch.profile ?? existing?.profile ?? '',
        qualitativeNotes: patch.qualitativeNotes ?? existing?.qualitativeNotes ?? '',
        diagnosisSnapshot: patch.diagnosisSnapshot ?? existing?.diagnosisSnapshot ?? [],
        createdAt: existing?.createdAt || updatedAt,
        updatedAt,
      }

      return {
        studentAntecedents: existing
          ? state.studentAntecedents.map((antecedent) =>
              antecedent.id === existing.id ? nextAntecedent : antecedent,
            )
          : [...state.studentAntecedents, nextAntecedent],
      }
    })
    await persistCollections(set, get, ['studentAntecedents'])
  },

  bulkUpsertStudentAntecedents: async (entries = []) => {
    const cleanEntries = entries.filter((entry) => entry.studentId)
    if (cleanEntries.length === 0) return
    const updatedAt = new Date().toISOString()

    set((state) => {
      const studentsById = new Map(state.students.map((student) => [student.id, student]))
      const existingByStudentId = new Map(
        state.studentAntecedents.map((antecedent) => [antecedent.studentId, antecedent]),
      )
      const nextByStudentId = new Map(existingByStudentId)

      cleanEntries.forEach((entry) => {
        const student = studentsById.get(entry.studentId)
        if (!student) return
        const existing = existingByStudentId.get(entry.studentId)
        nextByStudentId.set(entry.studentId, {
          id: existing?.id || createId('ant'),
          studentId: entry.studentId,
          classId: student.classId,
          courseLabel: entry.courseLabel ?? existing?.courseLabel ?? '',
          lastLookGrade: entry.lastLookGrade ?? existing?.lastLookGrade ?? '',
          competencyGrades: entry.competencyGrades ?? existing?.competencyGrades ?? {},
          profile: entry.profile ?? existing?.profile ?? '',
          qualitativeNotes: entry.qualitativeNotes ?? existing?.qualitativeNotes ?? '',
          diagnosisSnapshot: entry.diagnosisSnapshot ?? existing?.diagnosisSnapshot ?? [],
          createdAt: existing?.createdAt || updatedAt,
          updatedAt,
        })
      })

      return { studentAntecedents: Array.from(nextByStudentId.values()) }
    })
    await persistCollections(set, get, ['studentAntecedents'])
  },

  deleteStudentAntecedent: async (studentId) => {
    set((state) => ({
      studentAntecedents: state.studentAntecedents.filter((antecedent) => antecedent.studentId !== studentId),
    }))
    await persistCollections(set, get, ['studentAntecedents'])
  },

  deleteStudent: async (studentId) => {
    set((state) => ({
      students: state.students.filter((student) => student.id !== studentId),
      marks: state.marks.filter((mark) => mark.studentId !== studentId),
      taskRecords: state.taskRecords.filter((record) => record.studentId !== studentId),
      behaviorEvents: state.behaviorEvents.filter((event) => event.studentId !== studentId),
      agendaNotes: state.agendaNotes.filter((note) => note.studentId !== studentId),
      studentAntecedents: state.studentAntecedents.filter((antecedent) => antecedent.studentId !== studentId),
      tutorialGroupSets: (state.tutorialGroupSets || []).map((groupSet) => ({
        ...groupSet,
        groups: (groupSet.groups || []).map((group) => ({
          ...group,
          memberIds: (group.memberIds || []).filter((memberId) => memberId !== studentId),
        })),
      })),
      tutorialSociogramLayouts: (state.tutorialSociogramLayouts || []).map((layout) => ({
        ...layout,
        positions: (layout.positions || []).filter((position) => position.studentId !== studentId),
      })),
    }))
    await persistCollections(set, get, [
      'students',
      'marks',
      'taskRecords',
      'behaviorEvents',
      'agendaNotes',
      'studentAntecedents',
      'tutorialGroupSets',
      'tutorialSociogramLayouts',
    ])
  },

  upsertSeatingChart: async ({ classId, halfGroup = 'all', imageData, title }) => {
    if (!classId || !imageData) return

    set((state) => {
      const existing = state.seatingCharts.find(
        (chart) => chart.classId === classId && chart.halfGroup === halfGroup,
      )
      const nextChart = {
        id: existing?.id || createId('seat'),
        classId,
        halfGroup,
        title,
        imageData,
        updatedAt: new Date().toISOString(),
      }

      return {
        seatingCharts: existing
          ? state.seatingCharts.map((chart) => (chart.id === existing.id ? nextChart : chart))
          : [...state.seatingCharts, nextChart],
      }
    })
    await persistCollections(set, get, ['seatingCharts'])
  },

  deleteSeatingChart: async (chartId) => {
    set((state) => ({
      seatingCharts: state.seatingCharts.filter((chart) => chart.id !== chartId),
    }))
    await persistCollections(set, get, ['seatingCharts'])
  },

  addTask: async ({ title, date }) => {
    const { activeClassId, activeUtId } = get().ui
    if (!title.trim() || !activeClassId || !activeUtId) return

    const existingTasks = get().tasks.filter(
      (task) => task.classId === activeClassId && task.utId === activeUtId,
    )

    set((state) => ({
      tasks: [
        ...state.tasks,
        {
          id: createId('task'),
          classId: activeClassId,
          utId: activeUtId,
          title: title.trim(),
          date,
          order: existingTasks.length + 1,
        },
      ],
    }))
    await persistCollections(set, get, ['tasks'])
  },

  addTasksToClasses: async ({ title, entries }) => {
    if (!title.trim() || entries.length === 0) return

    set((state) => ({
      tasks: [
        ...state.tasks,
        ...entries.map((entry) => {
          const existingTasks = state.tasks.filter(
            (task) => task.classId === entry.classId && task.utId === entry.utId,
          )
          return {
            id: createId('task'),
            classId: entry.classId,
            utId: entry.utId,
            title: title.trim(),
            date: entry.date,
            order: existingTasks.length + 1,
          }
        }),
      ],
    }))
    await persistCollections(set, get, ['tasks'])
  },

  updateTask: async (taskId, patch) => {
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task)),
    }))
    await persistCollections(set, get, ['tasks'])
  },

  deleteTask: async (taskId) => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== taskId),
      taskRecords: state.taskRecords.filter((record) => record.taskId !== taskId),
    }))
    await persistCollections(set, get, ['tasks', 'taskRecords'])
  },

  resetToSeed: async () => {
    const dataset = normalizeDataset(seedDataset)
    await resetDatabase()
    await saveDataset(dataset)
    const ui = getInitialUi(dataset)
    const profile = { defaultSubject: DEMO_SUBJECT }
    const onboarding = { demoMode: true, guideOpen: true, guideMode: 'demo', tutoringGuideSeen: false }
    writePreferences({ ...readPreferences(), ...ui, ...profile, demoMode: true, guideOpen: true, guideMode: 'demo', tutoringGuideSeen: false, backupMeta: null })
    set({ ...dataset, ui, profile, onboarding, backupMeta: null, status: 'ready', error: '' })
  },
}))
