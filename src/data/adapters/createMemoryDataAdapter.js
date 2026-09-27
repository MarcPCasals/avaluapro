import {
  ALLOWED_EVALUATIONS,
  ALLOWED_MARKS,
  ASSISTANCE_CAPABILITIES,
  assertAssistanceAdapter,
} from './dataAdapterContract.js'
import { buildAssistanceDatasetFromSafePackage } from './importSafeAssistancePackage.js'

function cloneDataset(dataset) {
  return structuredClone(dataset)
}

function normalizeDataset(dataset) {
  const normalized = cloneDataset(dataset)
  normalized.metadata = {
    ...(normalized.metadata || {}),
    kind: 'synthetic',
    containsRealData: false,
    persistent: false,
  }
  normalized.classes = Array.isArray(normalized.classes) ? normalized.classes : []
  normalized.students = Array.isArray(normalized.students) ? normalized.students : []
  normalized.evaluationCompetencies = Array.isArray(normalized.evaluationCompetencies)
    ? normalized.evaluationCompetencies
    : []
  normalized.evaluationMarks = Array.isArray(normalized.evaluationMarks) ? normalized.evaluationMarks : []
  normalized.trackingTasks = Array.isArray(normalized.trackingTasks) ? normalized.trackingTasks : []
  normalized.trackingRecords = Array.isArray(normalized.trackingRecords) ? normalized.trackingRecords : []
  normalized.absenceRecords = Array.isArray(normalized.absenceRecords) ? normalized.absenceRecords : []
  return normalized
}

function buildSnapshot(dataset, revision, pendingChangeCount) {
  return Object.freeze({
    ...cloneDataset(dataset),
    dirty: pendingChangeCount > 0,
    pendingChangeCount,
    revision,
  })
}

function assertNonNegativeInteger(value, field) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`El camp ${field} ha de ser un enter no negatiu.`)
  }
}

export function createMemoryDataAdapter(initialDataset) {
  const initialState = normalizeDataset(initialDataset)
  let currentDataset = cloneDataset(initialState)
  let revision = 0
  let pendingChangeCount = 0
  let snapshot = buildSnapshot(currentDataset, revision, pendingChangeCount)
  const listeners = new Set()

  function emit({ reset = false } = {}) {
    revision += 1
    pendingChangeCount = reset ? 0 : pendingChangeCount + 1
    snapshot = buildSnapshot(currentDataset, revision, pendingChangeCount)
    listeners.forEach((listener) => listener())
  }

  function updateStudent(studentId, patch) {
    let found = false
    const students = currentDataset.students.map((student) => {
      if (student.id !== studentId) return student
      found = true
      return { ...student, ...patch }
    })
    if (!found) throw new Error('No s’ha trobat l’alumne fictici.')
    currentDataset = { ...currentDataset, students }
    emit()
  }

  const adapter = {
    kind: 'assistance-memory',

    getCapabilities() {
      return ASSISTANCE_CAPABILITIES
    },

    getSnapshot() {
      return snapshot
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    setStudentEvaluation(studentId, evaluation) {
      if (!ALLOWED_EVALUATIONS.includes(evaluation)) {
        throw new Error('Nivell d’avaluació fictici no vàlid.')
      }
      updateStudent(studentId, { evaluation })
    },

    setCompletedTasks(studentId, completedTasks) {
      assertNonNegativeInteger(completedTasks, 'completedTasks')
      const student = currentDataset.students.find((item) => item.id === studentId)
      if (!student) throw new Error('No s’ha trobat l’alumne fictici.')
      updateStudent(studentId, {
        completedTasks: Math.min(completedTasks, student.totalTasks),
      })
    },

    setAbsenceHours(studentId, absenceHours) {
      assertNonNegativeInteger(absenceHours, 'absenceHours')
      updateStudent(studentId, { absenceHours })
    },

    toggleAbsence(studentId, classId, slot) {
      const student = currentDataset.students.find(
        (item) => item.id === studentId && item.classId === classId,
      )
      if (!student) throw new Error('No s’ha trobat l’alumne fictici dins del grup.')
      if (!slot?.slotKey || !slot?.date || !slot?.time) {
        throw new Error('La franja d’absència fictícia no és vàlida.')
      }

      const activeRecord = currentDataset.absenceRecords.find(
        (record) => record.studentId === studentId && record.classId === classId && record.slotKey === slot.slotKey,
      )
      const absenceRecords = activeRecord
        ? currentDataset.absenceRecords.filter((record) => record.id !== activeRecord.id)
        : [...currentDataset.absenceRecords, {
            id: `synthetic-absence-${studentId}-${slot.slotKey}`,
            classId,
            studentId,
            date: slot.date,
            time: slot.time,
            slotKey: slot.slotKey,
            hours: 1,
            recordedAt: `${slot.date}T${slot.time}:00`,
          }]
      const absenceHours = absenceRecords
        .filter((record) => record.studentId === studentId && record.classId === classId)
        .reduce((total, record) => total + (Number(record.hours) || 1), 0)
      currentDataset = {
        ...currentDataset,
        absenceRecords,
        students: currentDataset.students.map((item) =>
          item.id === studentId ? { ...item, absenceHours } : item,
        ),
      }
      emit()
    },

    setStudentPersonalNotes(studentId, personalNotes) {
      updateStudent(studentId, { personalNotes: String(personalNotes || '').slice(0, 700) })
    },

    setEvaluationMark(studentId, criterionId, value) {
      if (value && !ALLOWED_MARKS.includes(value)) {
        throw new Error('Nivell d’avaluació fictici no vàlid.')
      }
      if (!currentDataset.students.some((student) => student.id === studentId)) {
        throw new Error('No s’ha trobat l’alumne fictici.')
      }
      const criterionExists = currentDataset.evaluationCompetencies.some((competency) =>
        competency.criteria.some((criterion) => criterion.id === criterionId),
      )
      if (!criterionExists) throw new Error('No s’ha trobat el criteri fictici.')

      const remainingMarks = currentDataset.evaluationMarks.filter(
        (mark) => !(mark.studentId === studentId && mark.criterionId === criterionId),
      )
      currentDataset = {
        ...currentDataset,
        evaluationMarks: value
          ? [...remainingMarks, {
              id: `synthetic-mark-${studentId}-${criterionId}`,
              criterionId,
              studentId,
              value,
            }]
          : remainingMarks,
      }
      emit()
    },

    setTaskStatus(studentId, taskId, status) {
      const allowedStatuses = ['DONE', 'LATE', 'MISSING', 'EXEMPT']
      if (!allowedStatuses.includes(status)) throw new Error('Estat de tasca fictici no vàlid.')
      if (!currentDataset.students.some((student) => student.id === studentId)) {
        throw new Error('No s’ha trobat l’alumne fictici.')
      }
      const task = currentDataset.trackingTasks.find((item) => item.id === taskId)
      if (!task) throw new Error('No s’ha trobat la tasca fictícia.')

      const remainingRecords = currentDataset.trackingRecords.filter(
        (record) => !(record.studentId === studentId && record.taskId === taskId),
      )
      currentDataset = {
        ...currentDataset,
        trackingRecords: [...remainingRecords, {
          id: `synthetic-record-${studentId}-${taskId}`,
          classId: task.classId,
          studentId,
          taskId,
          status,
        }],
      }
      emit()
    },

    reset() {
      currentDataset = cloneDataset(initialState)
      emit({ reset: true })
      return snapshot
    },

    loadSafePackage(candidate) {
      currentDataset = normalizeDataset(buildAssistanceDatasetFromSafePackage(candidate))
      emit()
      return snapshot
    },
  }

  assertAssistanceAdapter(adapter)
  return Object.freeze(adapter)
}
