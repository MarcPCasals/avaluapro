import { useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clipboard,
  ClipboardList,
  Eye,
  FileDown,
  FileSpreadsheet,
  GraduationCap,
  HeartHandshake,
  Layers3,
  LayoutGrid,
  Lock,
  Network,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  Shuffle,
  Star,
  Trash2,
  TrendingDown,
  UserX,
  UsersRound,
} from 'lucide-react'
import { Modal } from '../../components/Modal'
import { SUBJECT_AREAS, SUBJECT_STRUCTURES } from '../../data/subjects'
import { downloadBlob, getTodaySlug } from '../../lib/downloads'
import { GRADE_OPTIONS, calculateGrade, getNumericFromGrade, gradeClassName, gradeTextClassName } from '../../lib/grades'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'

const TUTORING_RECORD_TYPES = [
  { id: 'agenda', label: 'Notes a l’agenda', tone: 'amber' },
  { id: 'incident', label: 'Fulls d’incidents', tone: 'red' },
  { id: 'classroom-expulsion', label: 'Expulsions d’aula', tone: 'violet' },
  { id: 'center-expulsion', label: 'Expulsions de centre', tone: 'slate' },
]
const TUTORING_RELATION_TYPES = [
  { id: 'positive', label: 'Treballa bé amb', shortLabel: 'Positiva', tone: 'green' },
  { id: 'friendship', label: 'S’hi relaciona sovint', shortLabel: 'Afinitat', tone: 'blue' },
  { id: 'avoid', label: 'Evitar de moment', shortLabel: 'Incompatibilitat', tone: 'red' },
]
const COOPERATIVE_GROUP_STRATEGIES = [
  { id: 'balanced', label: 'Equilibrat' },
  { id: 'supportive', label: 'Prioritza suports' },
  { id: 'calm', label: 'Evita tensions' },
]
const SOCIOGRAM_FILTERS = [
  { id: 'all', label: 'Totes' },
  { id: 'supportive', label: 'Afinitats' },
  { id: 'avoid', label: 'Evitar' },
]
const VALID_IMPORT_GRADES = new Set(['A', 'B', 'C', 'D', 'NA'])
const EMPTY_IMPORT_MARKS = new Set(['', '-', '—', '.'])
const SEATING_GRID_COLUMNS = 9
const SEATING_GRID_ROWS = 5
const DEFAULT_SEATING_ACTIVE_SEATS = [
  [0, 1, 3, 4, 5, 7, 8],
  [0, 1, 3, 4, 5, 7, 8],
  [0, 1, 4, 5, 7, 8],
  [0, 1, 4, 5, 8],
  [],
]

function countByType(records, type) {
  return records.filter((record) => record.type === type).length
}

function getRecordTypeMeta(type) {
  return TUTORING_RECORD_TYPES.find((item) => item.id === type) || TUTORING_RECORD_TYPES[0]
}

function getRelationTypeMeta(type) {
  return TUTORING_RELATION_TYPES.find((item) => item.id === type) || TUTORING_RELATION_TYPES[0]
}

function getRelationCategory(type) {
  return type === 'avoid' ? 'avoid' : 'supportive'
}

function getSociogramInitials(name) {
  const [surnameBlock = '', firstNameBlock = ''] = String(name || '').split(',')
  const firstName = firstNameBlock.trim().split(/\s+/).filter(Boolean)[0]
  const firstSurname = surnameBlock.trim().split(/\s+/).filter(Boolean)[0]
  const fallback = String(name || '')
    .split(/[,\s]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')

  return `${firstName?.[0] || ''}${firstSurname?.[0] || ''}`.toUpperCase() || fallback.toUpperCase() || '?'
}

function getTodayDateInput() {
  return new Date().toISOString().slice(0, 10)
}

function formatShortDate(value) {
  if (!value) return 'Sense data'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ca-AD', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

function formatLongDate(value) {
  if (!value) return 'Sense data'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ca-AD', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

function printTutorialProfile() {
  document.body.classList.add('tutorial-profile-printing')
  const clearPrintClass = () => document.body.classList.remove('tutorial-profile-printing')
  window.addEventListener('afterprint', clearPrintClass, { once: true })
  window.print()
  window.setTimeout(clearPrintClass, 1200)
}

function getSubjectArea(subjectName) {
  return SUBJECT_AREAS.find((area) => area.subjects.includes(subjectName))
}

function normalizeCompetencyLabel(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function getCompetencyCode(value) {
  const match = String(value || '').match(/\b(?:trans\s*)?c\s*(\d+)\b/i)
  return match ? `C${match[1]}` : ''
}

function isSameCompetencyName(a, b) {
  const normalizedA = normalizeCompetencyLabel(a)
  const normalizedB = normalizeCompetencyLabel(b)
  if (normalizedA && normalizedA === normalizedB) return true

  const codeA = getCompetencyCode(a)
  const codeB = getCompetencyCode(b)
  return Boolean(codeA && codeA === codeB)
}

function focusNextTutorialGradeSelect(currentElement) {
  const fields = Array.from(document.querySelectorAll('[data-tutorial-grade-select="true"]'))
  const currentIndex = fields.indexOf(currentElement)
  if (currentIndex < 0) return

  fields[currentIndex + 1]?.focus()
}

function getSubjectOptionsForArea(areaFilter) {
  const areas = SUBJECT_AREAS.filter((area) => area.id !== 'tutorial')
  return areas
    .filter((area) => areaFilter === 'all' || area.id === areaFilter)
    .flatMap((area) =>
      area.subjects
        .filter((subject) => SUBJECT_STRUCTURES[subject])
        .map((subject) => ({
          subject,
          areaId: area.id,
          areaName: area.name,
          structure: SUBJECT_STRUCTURES[subject],
        })),
    )
}

function getAllTutorialSubjectOptions() {
  return getSubjectOptionsForArea('all')
}

function buildTutorialCompetencies(subject) {
  const structure = SUBJECT_STRUCTURES[subject] || []
  return structure.map((competency, competencyIndex) => ({
    ...competency,
    key: `${subject}__c${competencyIndex + 1}`,
    subject,
    competencyIndex,
    criteria: competency.criteria.map((criterion, criterionIndex) => ({
      key: `${subject}__c${competencyIndex + 1}__ca${criterionIndex + 1}`,
      name: criterion,
      order: criterionIndex + 1,
    })),
  }))
}

function getStoredTutorialCompetencyGrade(tutorialMarks, classId, studentId, subject, competency) {
  const directGrade = tutorialMarks.find(
    (mark) =>
      mark.classId === classId &&
      mark.studentId === studentId &&
      mark.subject === subject &&
      mark.competencyKey === competency.key,
  )?.value
  if (directGrade) return directGrade

  const legacyCriterionGrades = competency.criteria
    .map(
      (criterion) =>
        tutorialMarks.find(
          (mark) =>
            mark.classId === classId &&
            mark.studentId === studentId &&
            mark.subject === subject &&
            mark.criterionKey === criterion.key,
        )?.value,
    )
    .filter(Boolean)

  return calculateGrade(legacyCriterionGrades)
}

function getLinkedEvaluationCompetencyGradeSource({ competency, evaluationContext, studentId, subject }) {
  if (!evaluationContext || subject !== evaluationContext.linkedSubject) return null

  const classSemesters = (evaluationContext.semesters || [])
    .filter((semester) => semester.classId === evaluationContext.linkedClassId)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
  const semesterOrderById = new Map(classSemesters.map((semester, index) => [semester.id, semester.order || index + 1]))
  const classUts = evaluationContext.uts
    .filter((ut) => ut.classId === evaluationContext.linkedClassId)
    .sort(
      (a, b) =>
        (semesterOrderById.get(a.semesterId) || 0) - (semesterOrderById.get(b.semesterId) || 0) ||
        (a.order || 0) - (b.order || 0) ||
        a.name.localeCompare(b.name, 'ca'),
    )
  const utOrderById = new Map(classUts.map((ut, index) => [ut.id, index]))
  const utsById = new Map(classUts.map((ut) => [ut.id, ut]))
  const matchingCompetencies = evaluationContext.competencies
    .filter((item) => utOrderById.has(item.utId) && isSameCompetencyName(item.name, competency.name))
    .sort((a, b) => (utOrderById.get(b.utId) || 0) - (utOrderById.get(a.utId) || 0))

  for (const item of matchingCompetencies) {
    const competencyCriteria = evaluationContext.criteria.filter((criterion) => criterion.competencyId === item.id)
    const criterionGrades = competencyCriteria
      .map(
        (criterion) =>
          evaluationContext.marks.find(
            (mark) => mark.studentId === studentId && mark.criterionId === criterion.id,
          )?.value,
      )
      .filter(Boolean)
    const grade = calculateGrade(criterionGrades)
    if (grade) {
      const sourceUt = utsById.get(item.utId)
      return {
        source: 'linked',
        utName: sourceUt?.name || 'UT anterior',
        utOrder: utOrderById.get(item.utId) ?? 0,
        value: grade,
      }
    }
  }

  return null
}

function getTutorialCompetencyGradeSource({
  classId,
  competency,
  evaluationContext,
  studentId,
  subject,
  tutorialMarks,
}) {
  const storedGrade = getStoredTutorialCompetencyGrade(tutorialMarks, classId, studentId, subject, competency)
  if (storedGrade) return { source: 'manual', value: storedGrade }

  const linkedGrade = getLinkedEvaluationCompetencyGradeSource({ competency, evaluationContext, studentId, subject })
  if (linkedGrade) return linkedGrade

  return { source: 'empty', value: '' }
}

function getTutorialCompetencyGrade({
  classId,
  competency,
  evaluationContext,
  studentId,
  subject,
  tutorialMarks,
}) {
  return getTutorialCompetencyGradeSource({
    classId,
    competency,
    evaluationContext,
    studentId,
    subject,
    tutorialMarks,
  }).value
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '-'
  return `${Math.round(value)}%`
}

function isNotDeveloped(grade) {
  return grade === 'D' || grade === 'NA'
}

function average(values) {
  const cleanValues = values.filter((value) => Number.isFinite(value) && value > 0)
  if (cleanValues.length === 0) return 0
  return cleanValues.reduce((total, value) => total + value, 0) / cleanValues.length
}

function getGradeFromAverageScore(score) {
  if (!score) return ''
  if (score >= 3.5) return 'A'
  if (score >= 2.5) return 'B'
  if (score >= 1.5) return 'C'
  return 'D'
}

function formatAverageGrade(score) {
  return getGradeFromAverageScore(score) || '-'
}

function summarizeTutorialData({ classId, evaluationContext, students, tutorialMarks }) {
  const subjectOptions = getAllTutorialSubjectOptions()
  const areaBuckets = new Map()
  const subjectBuckets = new Map()
  const trajectoryBuckets = new Map()
  const studentProfiles = students.map((student) => {
    const evaluatedCompetencies = []

    subjectOptions.forEach((subjectOption) => {
      buildTutorialCompetencies(subjectOption.subject).forEach((competency) => {
        const gradeSource = getTutorialCompetencyGradeSource({
          classId,
          competency,
          evaluationContext,
          studentId: student.id,
          subject: subjectOption.subject,
          tutorialMarks,
        })
        const grade = gradeSource.value
        if (!grade) return

        const score = getNumericFromGrade(grade)
        const row = {
          areaId: subjectOption.areaId,
          areaName: subjectOption.areaName,
          subject: subjectOption.subject,
          competencyName: competency.name,
          grade,
          score,
          sourceLabel: gradeSource.utName || 'Dades manuals',
          sourceOrder: Number.isFinite(gradeSource.utOrder) ? gradeSource.utOrder : 999,
          notDeveloped: isNotDeveloped(grade),
        }
        evaluatedCompetencies.push(row)

        const trajectoryKey = row.sourceLabel
        const trajectoryBucket = trajectoryBuckets.get(trajectoryKey) || {
          label: row.sourceLabel,
          order: row.sourceOrder,
          scores: [],
        }
        trajectoryBucket.scores.push(score)
        trajectoryBuckets.set(trajectoryKey, trajectoryBucket)

        const areaBucket = areaBuckets.get(subjectOption.areaId) || {
          id: subjectOption.areaId,
          name: subjectOption.areaName,
          scores: [],
          notDeveloped: 0,
          evaluated: 0,
        }
        areaBucket.scores.push(score)
        areaBucket.notDeveloped += row.notDeveloped ? 1 : 0
        areaBucket.evaluated += 1
        areaBuckets.set(subjectOption.areaId, areaBucket)

        const subjectBucket = subjectBuckets.get(subjectOption.subject) || {
          subject: subjectOption.subject,
          areaName: subjectOption.areaName,
          scores: [],
          notDeveloped: 0,
          evaluated: 0,
        }
        subjectBucket.scores.push(score)
        subjectBucket.notDeveloped += row.notDeveloped ? 1 : 0
        subjectBucket.evaluated += 1
        subjectBuckets.set(subjectOption.subject, subjectBucket)
      })
    })

    const notDevelopedCount = evaluatedCompetencies.filter((item) => item.notDeveloped).length
    const averageScore = average(evaluatedCompetencies.map((item) => item.score))
    const notDevelopedPercent =
      evaluatedCompetencies.length > 0 ? (notDevelopedCount / evaluatedCompetencies.length) * 100 : 0
    const weakestAreas = Object.values(
      evaluatedCompetencies.reduce((areas, item) => {
        const current = areas[item.areaId] || { name: item.areaName, scores: [], notDeveloped: 0, evaluated: 0 }
        current.scores.push(item.score)
        current.notDeveloped += item.notDeveloped ? 1 : 0
        current.evaluated += 1
        return { ...areas, [item.areaId]: current }
      }, {}),
    )
      .map((area) => ({ ...area, averageScore: average(area.scores) }))
      .sort((a, b) => a.averageScore - b.averageScore || b.notDeveloped - a.notDeveloped)

    return {
      student,
      evaluatedCompetencies,
      evaluatedCount: evaluatedCompetencies.length,
      notDevelopedCount,
      notDevelopedPercent,
      averageScore,
      weakestArea: weakestAreas[0] || null,
    }
  })

  const evaluatedCount = studentProfiles.reduce((total, profile) => total + profile.evaluatedCount, 0)
  const notDevelopedCount = studentProfiles.reduce((total, profile) => total + profile.notDevelopedCount, 0)
  const riskProfiles = studentProfiles
    .filter(
      (profile) =>
        profile.evaluatedCount > 0 &&
        (profile.notDevelopedPercent >= 30 || profile.notDevelopedCount >= 2 || profile.averageScore <= 2),
    )
    .sort(
      (a, b) =>
        b.notDevelopedPercent - a.notDevelopedPercent ||
        b.notDevelopedCount - a.notDevelopedCount ||
        a.student.name.localeCompare(b.student.name, 'ca'),
    )
  const areaSummaries = [...areaBuckets.values()]
    .map((area) => ({
      ...area,
      averageScore: average(area.scores),
      averageGrade: formatAverageGrade(average(area.scores)),
      notDevelopedPercent: area.evaluated > 0 ? (area.notDeveloped / area.evaluated) * 100 : 0,
    }))
    .sort((a, b) => a.averageScore - b.averageScore || b.notDevelopedPercent - a.notDevelopedPercent)
  const subjectSummaries = [...subjectBuckets.values()]
    .map((subject) => ({
      ...subject,
      averageScore: average(subject.scores),
      averageGrade: formatAverageGrade(average(subject.scores)),
      notDevelopedPercent: subject.evaluated > 0 ? (subject.notDeveloped / subject.evaluated) * 100 : 0,
    }))
    .sort((a, b) => a.averageScore - b.averageScore || b.notDevelopedPercent - a.notDevelopedPercent)

  const globalGradeCounts = { A: 0, B: 0, C: 0, D: 0, NA: 0 }
  studentProfiles.forEach((profile) => {
    profile.evaluatedCompetencies.forEach((item) => {
      if (globalGradeCounts[item.grade] !== undefined) globalGradeCounts[item.grade] += 1
    })
  })

  return {
    evaluatedCount,
    globalAverageGrade: formatAverageGrade(average(studentProfiles.map((profile) => profile.averageScore))),
    globalGradeCounts,
    notDevelopedCount,
    notDevelopedPercent: evaluatedCount > 0 ? (notDevelopedCount / evaluatedCount) * 100 : 0,
    studentProfiles,
    riskProfiles,
    areaSummaries,
    subjectSummaries,
    trajectory: [...trajectoryBuckets.values()]
      .map((bucket) => ({
        ...bucket,
        averageScore: average(bucket.scores),
        averageGrade: formatAverageGrade(average(bucket.scores)),
      }))
      .filter((bucket) => bucket.averageScore > 0)
      .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, 'ca'))
      .slice(-4),
    weakestArea: areaSummaries[0] || null,
    weakestSubject: subjectSummaries[0] || null,
  }
}

function summarizeTutorialRecords({ students, records }) {
  const studentsById = new Map(students.map((student) => [student.id, student]))
  const studentRows = students
    .map((student) => {
      const studentRecords = records.filter((record) => record.studentId === student.id)
      return {
        student,
        records: studentRecords,
        total: studentRecords.length,
        agenda: countByType(studentRecords, 'agenda'),
        incident: countByType(studentRecords, 'incident'),
        classroomExpulsion: countByType(studentRecords, 'classroom-expulsion'),
        centerExpulsion: countByType(studentRecords, 'center-expulsion'),
      }
    })
    .sort((a, b) => b.total - a.total || a.student.name.localeCompare(b.student.name, 'ca'))

  const recentRecords = [...records]
    .sort((a, b) => {
      const dateCompare = String(b.date || '').localeCompare(String(a.date || ''))
      if (dateCompare !== 0) return dateCompare
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
    })
    .slice(0, 8)
    .map((record) => ({
      ...record,
      student: studentsById.get(record.studentId),
      typeMeta: getRecordTypeMeta(record.type),
    }))

  return {
    studentRows,
    recentRecords,
    studentsWithRecords: studentRows.filter((row) => row.total > 0),
  }
}

function summarizeTutorialRelations({ relations, students }) {
  const studentsById = new Map(students.map((student) => [student.id, student]))
  const studentRows = students
    .map((student) => {
      const outgoing = relations.filter((relation) => relation.sourceStudentId === student.id)
      const incoming = relations.filter((relation) => relation.targetStudentId === student.id)
      const supportiveCount = [...outgoing, ...incoming].filter(
        (relation) => relation.type === 'positive' || relation.type === 'friendship',
      ).length
      const avoidCount = [...outgoing, ...incoming].filter((relation) => relation.type === 'avoid').length

      return {
        student,
        incoming,
        outgoing,
        supportiveCount,
        avoidCount,
        total: outgoing.length + incoming.length,
      }
    })
    .sort((a, b) => a.student.name.localeCompare(b.student.name, 'ca'))
  const reciprocalPairs = new Set()

  relations
    .filter((relation) => relation.type === 'positive' || relation.type === 'friendship')
    .forEach((relation) => {
      const hasReverse = relations.some(
        (candidate) =>
          candidate.sourceStudentId === relation.targetStudentId &&
          candidate.targetStudentId === relation.sourceStudentId &&
          (candidate.type === 'positive' || candidate.type === 'friendship'),
      )
      if (!hasReverse) return
      reciprocalPairs.add([relation.sourceStudentId, relation.targetStudentId].sort().join('__'))
    })

  const enrichedRelations = relations
    .map((relation) => ({
      ...relation,
      sourceStudent: studentsById.get(relation.sourceStudentId),
      targetStudent: studentsById.get(relation.targetStudentId),
      typeMeta: getRelationTypeMeta(relation.type),
    }))
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))

  return {
    avoidCount: relations.filter((relation) => relation.type === 'avoid').length,
    bridgeStudent: studentRows.find((row) => row.supportiveCount > 0)?.student || null,
    enrichedRelations,
    isolatedStudents: studentRows.filter((row) => row.total === 0).map((row) => row.student),
    positiveCount: relations.filter((relation) => relation.type === 'positive' || relation.type === 'friendship').length,
    reciprocalCount: reciprocalPairs.size,
    studentRows,
  }
}

function getRingPosition(index, total, radiusX, radiusY, centerX = 50, centerY = 50) {
  if (total <= 1) {
    return { x: centerX, y: centerY - radiusY }
  }

  const angle = -Math.PI / 2 + (index / total) * Math.PI * 2
  return {
    x: centerX + Math.cos(angle) * radiusX,
    y: centerY + Math.sin(angle) * radiusY,
  }
}

function clampSociogramPosition(value, min, max, fallback) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return fallback
  return Math.min(max, Math.max(min, numericValue))
}

function getSociogramPosition(studentId, fallback, positionsByStudentId) {
  const customPosition = positionsByStudentId?.get(studentId)
  if (!customPosition) return fallback

  return {
    x: clampSociogramPosition(customPosition.x, 6, 94, fallback.x),
    y: clampSociogramPosition(customPosition.y, 8, 92, fallback.y),
  }
}

function buildTutorialSociogramMap({
  filter,
  positionsByStudentId,
  relations,
  roleRowsByStudent,
  selectedStudentId,
  studentRows,
  students,
}) {
  const studentsById = new Map(students.map((student) => [student.id, student]))
  const rowsByStudentId = new Map(studentRows.map((row) => [row.student.id, row]))
  const selectedId = selectedStudentId || studentRows[0]?.student.id || students[0]?.id || ''
  const filteredRelations = relations.filter((relation) => {
    if (!studentsById.has(relation.sourceStudentId) || !studentsById.has(relation.targetStudentId)) return false
    if (filter === 'supportive') return getRelationCategory(relation.type) === 'supportive'
    if (filter === 'avoid') return getRelationCategory(relation.type) === 'avoid'
    return true
  })
  const selectedRelationStudentIds = new Set(
    filteredRelations
      .filter((relation) => relation.sourceStudentId === selectedId || relation.targetStudentId === selectedId)
      .flatMap((relation) => [relation.sourceStudentId, relation.targetStudentId]),
  )
  selectedRelationStudentIds.delete(selectedId)

  const selectedStudent = studentsById.get(selectedId)
  const relatedStudents = [...selectedRelationStudentIds]
    .map((studentId) => studentsById.get(studentId))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name, 'ca'))
  const remainingStudents = students
    .filter((student) => student.id !== selectedId && !selectedRelationStudentIds.has(student.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'ca'))

  const nodes = []
  if (selectedStudent) {
    nodes.push({
      ...rowsByStudentId.get(selectedStudent.id),
      id: selectedStudent.id,
      initials: getSociogramInitials(selectedStudent.name),
      isConflict: Boolean(roleRowsByStudent?.get(selectedStudent.id)?.conflict),
      isDimmed: false,
      isRelated: false,
      isSelected: true,
      isStar: Boolean(roleRowsByStudent?.get(selectedStudent.id)?.star),
      student: selectedStudent,
      ...getSociogramPosition(selectedStudent.id, { x: 50, y: 50 }, positionsByStudentId),
    })
  }

  relatedStudents.forEach((student, index) => {
    const position = getSociogramPosition(
      student.id,
      getRingPosition(index, relatedStudents.length, 28, 26),
      positionsByStudentId,
    )
    nodes.push({
      ...rowsByStudentId.get(student.id),
      id: student.id,
      initials: getSociogramInitials(student.name),
      isConflict: Boolean(roleRowsByStudent?.get(student.id)?.conflict),
      isDimmed: false,
      isRelated: true,
      isSelected: false,
      isStar: Boolean(roleRowsByStudent?.get(student.id)?.star),
      student,
      ...position,
    })
  })

  remainingStudents.forEach((student, index) => {
    const position = getSociogramPosition(
      student.id,
      getRingPosition(index, remainingStudents.length, 44, 37),
      positionsByStudentId,
    )
    nodes.push({
      ...rowsByStudentId.get(student.id),
      id: student.id,
      initials: getSociogramInitials(student.name),
      isConflict: Boolean(roleRowsByStudent?.get(student.id)?.conflict),
      isDimmed: Boolean(selectedStudent),
      isRelated: false,
      isSelected: false,
      isStar: Boolean(roleRowsByStudent?.get(student.id)?.star),
      student,
      ...position,
    })
  })

  const nodesByStudentId = new Map(nodes.map((node) => [node.id, node]))
  const links = filteredRelations
    .map((relation) => {
      const source = nodesByStudentId.get(relation.sourceStudentId)
      const target = nodesByStudentId.get(relation.targetStudentId)
      if (!source || !target) return null
      const typeMeta = getRelationTypeMeta(relation.type)
      return {
        ...relation,
        category: getRelationCategory(relation.type),
        isSelectedLink: relation.sourceStudentId === selectedId || relation.targetStudentId === selectedId,
        source,
        target,
        typeMeta,
      }
    })
    .filter(Boolean)

  return {
    filteredCount: filteredRelations.length,
    links,
    nodes,
    relatedCount: relatedStudents.length,
    selectedNode: nodesByStudentId.get(selectedId) || null,
  }
}

function summarizeTutorialGroup({ recordRowsByStudent, tutorialRecordSummary, tutorialSummary }) {
  const academicProfiles = tutorialSummary.studentProfiles.filter((profile) => profile.evaluatedCount > 0)
  const priorityStudents = tutorialSummary.studentProfiles
    .map((profile) => {
      const recordRow = recordRowsByStudent.get(profile.student.id)
      const recordSeverity =
        (recordRow?.agenda || 0) +
        (recordRow?.incident || 0) * 2 +
        (recordRow?.classroomExpulsion || 0) * 3 +
        (recordRow?.centerExpulsion || 0) * 4
      const academicSeverity =
        profile.notDevelopedCount * 2 +
        (profile.notDevelopedPercent >= 30 ? 2 : 0) +
        (profile.evaluatedCount > 0 && profile.averageScore <= 2 ? 2 : 0)
      const score = academicSeverity + recordSeverity
      const reasons = []
      if (profile.notDevelopedCount > 0) reasons.push(`${profile.notDevelopedCount} competència/es no assolides`)
      if (profile.notDevelopedPercent >= 30) reasons.push(`${formatPercent(profile.notDevelopedPercent)} no assolides`)
      if (recordRow?.agenda) reasons.push(`${recordRow.agenda} nota/es a l’agenda`)
      if (recordRow?.incident) reasons.push(`${recordRow.incident} incident/s`)
      if ((recordRow?.classroomExpulsion || 0) + (recordRow?.centerExpulsion || 0) > 0) {
        reasons.push(`${(recordRow?.classroomExpulsion || 0) + (recordRow?.centerExpulsion || 0)} expulsió/ns`)
      }

      return {
        academicSeverity,
        profile,
        reasons,
        recordRow,
        recordSeverity,
        score,
      }
    })
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.academicSeverity - a.academicSeverity ||
        b.recordSeverity - a.recordSeverity ||
        a.profile.student.name.localeCompare(b.profile.student.name, 'ca'),
    )

  const totalRecords = tutorialRecordSummary.studentRows.reduce((total, row) => total + row.total, 0)
  const studentsWithData = new Set([
    ...academicProfiles.map((profile) => profile.student.id),
    ...tutorialRecordSummary.studentsWithRecords.map((row) => row.student.id),
  ])

  return {
    academicCoveragePercent:
      tutorialSummary.studentProfiles.length > 0
        ? (academicProfiles.length / tutorialSummary.studentProfiles.length) * 100
        : 0,
    priorityStudents,
    studentsWithData: studentsWithData.size,
    totalRecords,
  }
}

function getStudentCooperativeProfile({ profile, recordRow, relationRow, roleRow }) {
  const recordSeverity =
    (recordRow?.agenda || 0) +
    (recordRow?.incident || 0) * 2 +
    (recordRow?.classroomExpulsion || 0) * 3 +
    (recordRow?.centerExpulsion || 0) * 4
  const academicRisk =
    profile.evaluatedCount > 0 && (profile.averageScore <= 2 || profile.notDevelopedPercent >= 30)
  const priorityScore =
    profile.notDevelopedCount * 2 +
    (profile.notDevelopedPercent >= 30 ? 2 : 0) +
    (profile.averageScore > 0 && profile.averageScore <= 2 ? 2 : 0) +
    recordSeverity
  const performanceLevel =
    profile.averageScore >= 3.25
      ? 'alt'
      : profile.averageScore > 0 && profile.averageScore <= 2
        ? 'baix'
        : 'mitjà'

  return {
    academicRisk,
    avoidCount: relationRow?.avoidCount || 0,
    halfGroup: profile.student.halfGroup || 'Sense mig grup',
    isConflict: Boolean(roleRow?.conflict),
    isStar: Boolean(roleRow?.star),
    performanceLevel,
    priorityScore,
    recordSeverity,
    relationCount: relationRow?.total || 0,
    student: profile.student,
    supportiveCount: relationRow?.supportiveCount || 0,
    tutorialProfile: profile,
  }
}

function relationBetween(relations, studentIdA, studentIdB) {
  return relations.find(
    (relation) =>
      (relation.sourceStudentId === studentIdA && relation.targetStudentId === studentIdB) ||
      (relation.sourceStudentId === studentIdB && relation.targetStudentId === studentIdA),
  )
}

function buildTutorialRoleRows(students, roles) {
  const rolesByStudentId = new Map(students.map((student) => [student.id, { conflict: false, star: false }]))
  roles.forEach((role) => {
    const row = rolesByStudentId.get(role.studentId)
    if (!row) return
    if (role.role === 'star') row.star = true
    if (role.role === 'conflict') row.conflict = true
  })
  return rolesByStudentId
}

function buildEffectiveTutorialRelations({ relations, rolesByStudentId, students }) {
  const explicitPairKeys = new Set(
    relations.map((relation) => [relation.sourceStudentId, relation.targetStudentId].sort().join('__')),
  )
  const syntheticRelations = []

  students.forEach((student) => {
    if (!rolesByStudentId.get(student.id)?.star) return
    students.forEach((otherStudent) => {
      if (otherStudent.id === student.id) return
      const pairKey = [student.id, otherStudent.id].sort().join('__')
      if (explicitPairKeys.has(pairKey)) return
      syntheticRelations.push({
        id: `synthetic_star_${student.id}_${otherStudent.id}`,
        isSynthetic: true,
        note: 'Alumne estrella: pot oferir ajuda acadèmica sense indicar amistat.',
        sourceStudentId: student.id,
        strength: 2,
        targetStudentId: otherStudent.id,
        type: 'positive',
      })
    })
  })

  return [...relations, ...syntheticRelations]
}

function findStudentBySearch(students, searchValue) {
  const cleanValue = String(searchValue || '').trim().toLocaleLowerCase('ca')
  if (!cleanValue) return null
  return (
    students.find((student) => student.name.toLocaleLowerCase('ca') === cleanValue) ||
    students.find((student) => student.name.toLocaleLowerCase('ca').includes(cleanValue))
  )
}

function getGridSeatId(x, y) {
  return `seat_${x}_${y}`
}

function getDefaultSeatingActiveSeatIds() {
  return DEFAULT_SEATING_ACTIVE_SEATS.flatMap((columns, rowIndex) =>
    columns.map((columnIndex) => getGridSeatId(columnIndex, rowIndex)),
  )
}

function getSeatZone(seat) {
  const x = Number(seat?.x ?? seat?.block ?? 0)
  if (x <= 2) return 0
  if (x <= 5) return 1
  return 2
}

function normalizeSeatingLayout(layout) {
  const validSeatIds = new Set()
  Array.from({ length: SEATING_GRID_ROWS }).forEach((_, y) => {
    Array.from({ length: SEATING_GRID_COLUMNS }).forEach((__, x) => validSeatIds.add(getGridSeatId(x, y)))
  })
  const activeSeatIds =
    Array.isArray(layout?.activeSeatIds) && layout.activeSeatIds.length > 0
      ? layout.activeSeatIds
      : getDefaultSeatingActiveSeatIds()

  return {
    activeSeatIds: activeSeatIds.filter((seatId) => validSeatIds.has(seatId)),
    columns: SEATING_GRID_COLUMNS,
    rows: SEATING_GRID_ROWS,
  }
}

function getSeatingCapacity(layout) {
  const cleanLayout = normalizeSeatingLayout(layout)
  return cleanLayout.activeSeatIds.length
}

function getHalfGroupClassName(halfGroup) {
  const cleanValue = String(halfGroup || '').toLocaleLowerCase('ca')
  if (cleanValue.includes('a')) return 'half-a'
  if (cleanValue.includes('b')) return 'half-b'
  return 'half-none'
}

function getCooperativePlacementScore({ candidate, group, groupSize, prioritizeHalfGroups, relations, strategy }) {
  if (group.members.length >= groupSize) return Number.POSITIVE_INFINITY
  if (candidate.isConflict && group.members.some((member) => member.isConflict)) return Number.POSITIVE_INFINITY
  if (
    prioritizeHalfGroups &&
    group.members.some((member) => member.halfGroup && member.halfGroup !== candidate.halfGroup)
  ) {
    return Number.POSITIVE_INFINITY
  }

  let score = group.members.length * 8
  const nextMembers = [...group.members, candidate]
  const averagePerformance =
    nextMembers.reduce((total, member) => total + (member.tutorialProfile.averageScore || 2.5), 0) / nextMembers.length
  score += Math.abs(averagePerformance - 2.7) * 10

  const riskCount = group.members.filter((member) => member.priorityScore >= 4).length
  if (candidate.priorityScore >= 4) score += riskCount * 18

  const sameHalfGroupCount = group.members.filter((member) => member.halfGroup === candidate.halfGroup).length
  const differentHalfGroupCount = group.members.filter((member) => member.halfGroup !== candidate.halfGroup).length
  if (prioritizeHalfGroups) {
    score += differentHalfGroupCount * 28
    score -= sameHalfGroupCount * 8
  } else {
    score += sameHalfGroupCount * 2
  }

  group.members.forEach((member) => {
    const relation = relationBetween(relations, candidate.student.id, member.student.id)
    if (!relation) return
    if (relation.type === 'avoid') score += strategy === 'calm' ? 120 : 90
    if (relation.type === 'positive') score -= strategy === 'supportive' ? 18 : 10
    if (relation.type === 'friendship') score -= strategy === 'supportive' ? 10 : 5
  })

  const hasAcademicRisk = group.members.some((member) => member.academicRisk)
  const hasStarPeer = group.members.some((member) => member.isStar)
  if (candidate.academicRisk && hasStarPeer) score -= strategy === 'supportive' ? 32 : 22
  if (candidate.isStar && hasAcademicRisk) score -= strategy === 'supportive' ? 32 : 22

  if (strategy === 'calm') score += candidate.avoidCount * 2
  if (strategy === 'supportive' && candidate.academicRisk) {
    const hasStrongPeer = group.members.some((member) => member.performanceLevel === 'alt' && member.priorityScore <= 2)
    score += hasStrongPeer ? -16 : 8
  }

  return score
}

function enrichCooperativeGroups(groups, relations) {
  return groups.map((group) => {
    const avoidRelations = []
    const supportiveRelations = []
    group.members.forEach((member, memberIndex) => {
      group.members.slice(memberIndex + 1).forEach((otherMember) => {
        const relation = relationBetween(relations, member.student.id, otherMember.student.id)
        if (!relation) return
        const typeMeta = getRelationTypeMeta(relation.type)
        const row = {
          label: `${member.student.name} / ${otherMember.student.name}`,
          note: relation.note,
          type: relation.type,
          typeMeta,
        }
        if (relation.type === 'avoid') avoidRelations.push(row)
        if (relation.type === 'positive' || relation.type === 'friendship') supportiveRelations.push(row)
      })
    })
    const averageScore = average(group.members.map((member) => member.tutorialProfile.averageScore || 0))
    const priorityMembers = group.members.filter((member) => member.priorityScore >= 4)
    const highPerformanceCount = group.members.filter((member) => member.performanceLevel === 'alt').length
    const lowPerformanceCount = group.members.filter((member) => member.performanceLevel === 'baix').length

    return {
      ...group,
      averageScore,
      avoidRelations,
      highPerformanceCount,
      lowPerformanceCount,
      priorityMembers,
      supportiveRelations,
    }
  })
}

function buildCooperativeGroups({
  groupSize,
  prioritizeHalfGroups,
  profiles,
  recordRowsByStudent,
  relationRowsByStudent,
  relations,
  roleRowsByStudent,
  strategy,
}) {
  const cleanGroupSize = Math.min(6, Math.max(2, Number(groupSize) || 4))
  const students = profiles
    .map((profile) =>
      getStudentCooperativeProfile({
        profile,
        recordRow: recordRowsByStudent.get(profile.student.id),
        relationRow: relationRowsByStudent.get(profile.student.id),
        roleRow: roleRowsByStudent?.get(profile.student.id),
      }),
    )
    .sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore
      if ((b.tutorialProfile.averageScore || 0) !== (a.tutorialProfile.averageScore || 0)) {
        return (a.tutorialProfile.averageScore || 0) - (b.tutorialProfile.averageScore || 0)
      }
      return a.student.name.localeCompare(b.student.name, 'ca')
    })

  if (prioritizeHalfGroups) {
    const studentsByHalfGroup = new Map()
    students.forEach((student) => {
      const key = student.halfGroup || 'Sense mig grup'
      studentsByHalfGroup.set(key, [...(studentsByHalfGroup.get(key) || []), student])
    })

    let globalIndex = 0
    const halfGroupGroups = []
    studentsByHalfGroup.forEach((halfGroupStudents, halfGroupName) => {
      const localGroupCount = Math.max(1, Math.ceil(halfGroupStudents.length / cleanGroupSize))
      const localGroups = Array.from({ length: localGroupCount }, () => {
        globalIndex += 1
        return {
          halfGroupName,
          id: `group_${globalIndex}`,
          members: [],
          name: `Grup ${globalIndex} · ${halfGroupName}`,
        }
      })

      halfGroupStudents.forEach((student) => {
        const bestGroup = localGroups
          .map((group) => ({
            group,
            score: getCooperativePlacementScore({
              candidate: student,
              group,
              groupSize: cleanGroupSize,
              prioritizeHalfGroups: false,
              relations,
              strategy,
            }),
          }))
          .sort((a, b) => a.score - b.score || a.group.members.length - b.group.members.length)[0]?.group

        bestGroup?.members.push(student)
      })
      halfGroupGroups.push(...localGroups)
    })

    return enrichCooperativeGroups(halfGroupGroups, relations)
  }

  const groupCount = Math.max(1, Math.ceil(students.length / cleanGroupSize))
  const groups = Array.from({ length: groupCount }, (_, index) => ({
    id: `group_${index + 1}`,
    members: [],
    name: `Grup ${index + 1}`,
  }))

  students.forEach((student) => {
    const bestGroup = groups
      .map((group) => ({
        group,
        score: getCooperativePlacementScore({
          candidate: student,
          group,
          groupSize: cleanGroupSize,
          prioritizeHalfGroups,
          relations,
          strategy,
        }),
      }))
      .sort((a, b) => a.score - b.score || a.group.members.length - b.group.members.length)[0]?.group

    bestGroup?.members.push(student)
  })

  return enrichCooperativeGroups(groups, relations)
}

function isSeatAdjacent(seatA, seatB) {
  if (!seatA || !seatB) return false
  return Math.abs((seatA.x ?? 0) - (seatB.x ?? 0)) + Math.abs((seatA.y ?? 0) - (seatB.y ?? 0)) <= 1
}

function buildTutorialSeatingPlan({
  layout,
  lockedStudentIds = [],
  manualEmptySeatIds = [],
  manualSeatByStudentId = {},
  problemSeatsByStudentId = {},
  prioritizeHalfGroups,
  profilesByStudentId,
  relations,
  students,
  unseatedStudentIds = [],
  variant,
}) {
  const cleanLayout = normalizeSeatingLayout(layout)
  const activeSeatIds = new Set(cleanLayout.activeSeatIds)
  const manualEmptySeats = new Set(manualEmptySeatIds)
  const forcedUnseated = new Set(unseatedStudentIds)
  const lockedStudents = new Set(lockedStudentIds)
  const seats = []
  Array.from({ length: cleanLayout.rows }).forEach((_, y) => {
    Array.from({ length: cleanLayout.columns }).forEach((__, x) => {
      const seatId = getGridSeatId(x, y)
      seats.push({
        enabled: activeSeatIds.has(seatId),
        id: seatId,
        x,
        y,
        zone: getSeatZone({ x }),
      })
    })
  })

  const studentsToPlace = students
    .map((student) => profilesByStudentId.get(student.id))
    .filter(Boolean)
    .sort((a, b) => {
      if ((b.isConflict ? 1 : 0) !== (a.isConflict ? 1 : 0)) return (b.isConflict ? 1 : 0) - (a.isConflict ? 1 : 0)
      const problemA = problemSeatsByStudentId[a.student.id] ? 1 : 0
      const problemB = problemSeatsByStudentId[b.student.id] ? 1 : 0
      if (problemB !== problemA) return problemB - problemA
      if ((b.priorityScore || 0) !== (a.priorityScore || 0)) return (b.priorityScore || 0) - (a.priorityScore || 0)
      return a.student.name.localeCompare(b.student.name, 'ca')
    })

  const halfGroups = [...new Set(studentsToPlace.map((student) => student.halfGroup || 'Sense mig grup'))]
  const halfGroupZone = new Map(halfGroups.map((halfGroup, index) => [halfGroup, index % 3]))
  const placed = []
  const activeSeatMap = new Map(seats.filter((seat) => seat.enabled).map((seat) => [seat.id, seat]))
  const placedStudentIds = new Set()

  Object.entries(manualSeatByStudentId || {}).forEach(([studentId, seatId]) => {
    if (forcedUnseated.has(studentId)) return
    const student = profilesByStudentId.get(studentId)
    const seat = activeSeatMap.get(seatId)
    if (!student || !seat || placed.some((placement) => placement.seat.id === seat.id)) return
    placed.push({
      halfGroup: student.halfGroup,
      isConflict: student.isConflict,
      isLocked: lockedStudents.has(student.student.id),
      isStar: student.isStar,
      seat,
      student,
      studentId: student.student.id,
    })
    placedStudentIds.add(student.student.id)
  })

  studentsToPlace.forEach((student, studentIndex) => {
    if (forcedUnseated.has(student.student.id) || placedStudentIds.has(student.student.id)) return
    const availableSeats = seats.filter(
      (seat) =>
        seat.enabled &&
        !manualEmptySeats.has(seat.id) &&
        !placed.some((placement) => placement.seat.id === seat.id),
    )
    const bestSeat = availableSeats
      .map((seat) => {
        let score = Math.abs(seat.zone - ((studentIndex + variant) % 3)) * 2 + seat.y
        if (problemSeatsByStudentId[student.student.id] === seat.id) score += 1500
        if (prioritizeHalfGroups) {
          score += seat.zone === halfGroupZone.get(student.halfGroup || 'Sense mig grup') ? -35 : 80
        }
        placed.forEach((placement) => {
          const adjacent = isSeatAdjacent(seat, placement.seat)
          const relation = relationBetween(relations, student.student.id, placement.student.student.id)
          if (student.isConflict && placement.student.isConflict) score += 10000
          if (!adjacent) return
          if (relation?.type === 'avoid') score += 500
          if (relation?.type === 'friendship') score += 8
          if (relation?.type === 'positive') score -= 8
          if (student.isStar && placement.student.academicRisk) score -= 14
          if (placement.student.isStar && student.academicRisk) score -= 14
        })
        return { score, seat }
      })
      .sort((a, b) => a.score - b.score || a.seat.y - b.seat.y || a.seat.x - b.seat.x)[0]?.seat

    if (bestSeat) {
      placed.push({
        halfGroup: student.halfGroup,
        isConflict: student.isConflict,
        isLocked: lockedStudents.has(student.student.id),
        isStar: student.isStar,
        seat: bestSeat,
        student,
        studentId: student.student.id,
      })
      placedStudentIds.add(student.student.id)
    }
  })

  const unplacedProfiles = studentsToPlace.filter((student) => !placedStudentIds.has(student.student.id))
  const warnings = []
  if (placed.length < studentsToPlace.length) {
    warnings.push(`Falten ${studentsToPlace.length - placed.length} alumne/s per falta de llocs actius.`)
  }
  if (
    prioritizeHalfGroups &&
    placed.some((placement) => placement.seat.zone !== halfGroupZone.get(placement.halfGroup || 'Sense mig grup'))
  ) {
    warnings.push('No s’ha pogut mantenir algun alumne dins del bloc del seu mig grup.')
  }
  placed.forEach((placement, index) => {
    placed.slice(index + 1).forEach((otherPlacement) => {
      if (!isSeatAdjacent(placement.seat, otherPlacement.seat)) return
      const relation = relationBetween(relations, placement.student.student.id, otherPlacement.student.student.id)
      if (relation?.type === 'avoid') {
        warnings.push(
          `${placement.student.student.name} i ${otherPlacement.student.student.name} tenen una relació a evitar i queden massa a prop.`,
        )
      }
      if (placement.isConflict && otherPlacement.isConflict) {
        warnings.push(
          `${placement.student.student.name} i ${otherPlacement.student.student.name} estan marcats com a conflictius i queden massa a prop.`,
        )
      }
    })
  })

  return {
    canRespectCriteria: warnings.length === 0,
    columns: cleanLayout.columns,
    layout: cleanLayout,
    placements: placed,
    rows: cleanLayout.rows,
    seats,
    unplacedProfiles,
    warnings: [...new Set(warnings)],
  }
}

function materializeSavedSeatingPlan({ plan, profilesByStudentId }) {
  const cleanLayout = normalizeSeatingLayout(plan?.layout)
  const lockedStudents = new Set(plan?.layout?.lockedStudentIds || [])
  const activeSeatIds = new Set(cleanLayout.activeSeatIds)
  const seats = []
  Array.from({ length: cleanLayout.rows }).forEach((_, row) => {
    Array.from({ length: cleanLayout.columns }).forEach((__, column) => {
      const seatId = getGridSeatId(column, row)
      seats.push({ enabled: activeSeatIds.has(seatId), id: seatId, x: column, y: row, zone: getSeatZone({ x: column }) })
    })
  })
  const placements = (plan?.seats || [])
    .map((seat) => {
      const profile = profilesByStudentId.get(seat.studentId)
      if (!profile) return null
      const x = Number.isFinite(Number(seat.x)) ? Number(seat.x) : Number(seat.block || 0) * 3 + Number(seat.place || 0)
      const y = Number.isFinite(Number(seat.y)) ? Number(seat.y) : Number(seat.row || 0)
      return {
        halfGroup: profile.halfGroup,
        isConflict: profile.isConflict,
        isLocked: Boolean(seat.isLocked || lockedStudents.has(profile.student.id)),
        isStar: profile.isStar,
        seat: {
          enabled: true,
          id: getGridSeatId(x, y),
          x,
          y,
          zone: getSeatZone({ x }),
        },
        student: profile,
        studentId: profile.student.id,
      }
    })
    .filter(Boolean)

  return {
    canRespectCriteria: true,
    columns: cleanLayout.columns,
    layout: cleanLayout,
    placements,
    rows: cleanLayout.rows,
    seats,
    unplacedProfiles: [],
    warnings: [],
  }
}

function materializeSavedCooperativeGroups({ profilesByStudentId, relations, savedGroupSet }) {
  if (!savedGroupSet) return []

  const groups = (savedGroupSet.groups || []).map((group, index) => ({
    id: group.id || `saved_group_${index + 1}`,
    members: (group.memberIds || []).map((studentId) => profilesByStudentId.get(studentId)).filter(Boolean),
    name: group.name || `Grup ${index + 1}`,
  }))

  return enrichCooperativeGroups(groups, relations)
}

function getCooperativeGroupCopyText(groups) {
  return groups
    .map((group) => {
      const members = group.members.map((member) => `- ${member.student.name}`).join('\n')
      const warnings = group.avoidRelations.length
        ? `\nAvisos:\n${group.avoidRelations.map((relation) => `- Evitar: ${relation.label}`).join('\n')}`
        : ''
      return `${group.name}\n${members}${warnings}`
    })
    .join('\n\n')
}

function getTutorialProfilePriority(profile, recordRow) {
  return (
    profile.notDevelopedCount * 3 +
    (profile.notDevelopedPercent >= 30 ? 2 : 0) +
    (profile.averageScore > 0 && profile.averageScore <= 2 ? 2 : 0) +
    (recordRow?.agenda || 0) +
    (recordRow?.incident || 0) * 2 +
    (recordRow?.classroomExpulsion || 0) * 3 +
    (recordRow?.centerExpulsion || 0) * 4
  )
}

function getProfileExecutiveSummary(profile, records) {
  const subjectSummaries = getProfileSubjectSummaries(profile)
  const weakestSubject = subjectSummaries[0]
  const notDevelopedText =
    profile.notDevelopedCount > 0
      ? `${profile.notDevelopedCount} competència/es no assolides (${formatPercent(profile.notDevelopedPercent)}).`
      : 'No hi ha competències no assolides registrades.'
  const recordCounts = TUTORING_RECORD_TYPES.map((type) => ({
    ...type,
    count: countByType(records, type.id),
  }))
  const relevantRecords = recordCounts.filter((item) => item.count > 0)
  const weakestEvidence = profile.weakestArea
    ? `L’àrea més delicada és ${profile.weakestArea.name}${
        weakestSubject ? `, sobretot a ${weakestSubject.subject}` : ''
      }.`
    : 'Encara no hi ha una àrea delicada clara.'
  const trackingEvidence =
    relevantRecords.length > 0
      ? relevantRecords.map((item) => `${item.count} ${item.label.toLowerCase()}`).join(' · ')
      : 'Sense registres tutorials específics.'

  let title = 'Seguiment ordinari'
  let tone = 'ok'
  let action = 'Mantenir observació ordinària i actualitzar el perfil quan entrin noves dades.'

  if (profile.notDevelopedCount >= 2 || profile.notDevelopedPercent >= 30) {
    title = 'Prioritat acadèmica'
    tone = 'warning'
    action = 'Revisar amb l’alumne quines competències pesen més i pactar una acció concreta de millora.'
  }
  if (relevantRecords.some((item) => ['incident', 'classroom-expulsion', 'center-expulsion'].includes(item.id))) {
    title = 'Prioritat tutorial'
    tone = 'risk'
    action = 'Contrastar amb l’equip educatiu si els registres tutorial expliquen o agreugen el rendiment.'
  }
  if ((profile.notDevelopedCount >= 2 || profile.averageScore <= 2) && relevantRecords.length > 0) {
    title = 'Prioritat combinada'
    tone = 'risk'
    action = 'Preparar una intervenció conjunta: tutor, docent de referència i família si escau.'
  }

  return {
    action,
    bullets: [notDevelopedText, weakestEvidence, trackingEvidence],
    title,
    tone,
  }
}

function getProfileSubjectSummaries(profile) {
  return Object.values(
    profile.evaluatedCompetencies.reduce((subjects, item) => {
      const subject = subjects[item.subject] || {
        areaName: item.areaName,
        evaluated: 0,
        notDeveloped: 0,
        scores: [],
        subject: item.subject,
      }
      subject.evaluated += 1
      subject.notDeveloped += item.notDeveloped ? 1 : 0
      subject.scores.push(item.score)
      return { ...subjects, [item.subject]: subject }
    }, {}),
  )
    .map((subject) => ({
      ...subject,
      averageScore: average(subject.scores),
      averageGrade: formatAverageGrade(average(subject.scores)),
      notDevelopedPercent: subject.evaluated > 0 ? (subject.notDeveloped / subject.evaluated) * 100 : 0,
    }))
    .sort((a, b) => b.notDevelopedPercent - a.notDevelopedPercent || a.averageScore - b.averageScore)
}

function getProfileAreaSummaries(profile) {
  return Object.values(
    profile.evaluatedCompetencies.reduce((areas, item) => {
      const area = areas[item.areaId] || {
        evaluated: 0,
        id: item.areaId,
        name: item.areaName,
        notDeveloped: 0,
        scores: [],
      }
      area.evaluated += 1
      area.notDeveloped += item.notDeveloped ? 1 : 0
      area.scores.push(item.score)
      return { ...areas, [item.areaId]: area }
    }, {}),
  )
    .map((area) => ({
      ...area,
      averageScore: average(area.scores),
      averageGrade: formatAverageGrade(average(area.scores)),
      notDevelopedPercent: area.evaluated > 0 ? (area.notDeveloped / area.evaluated) * 100 : 0,
    }))
    .sort((a, b) => b.notDevelopedPercent - a.notDevelopedPercent || a.averageScore - b.averageScore)
}

function SubjectCatalogCard({ completion, item, onSelect }) {
  const isComplete = completion?.total > 0 && completion.completed === completion.total

  return (
    <article className={`tutorial-subject-card ${isComplete ? 'complete' : ''}`}>
      <div>
        <strong>{item.subject}</strong>
        <small>{item.areaName}</small>
      </div>
      <span>
        {item.structure.length} competències
        {completion?.total ? ` · ${completion.completed}/${completion.total}` : ''}
      </span>
      <button className="secondary-action compact" onClick={() => onSelect(item.subject)} type="button">
        {isComplete ? 'Omplert' : 'Omplir'}
      </button>
    </article>
  )
}

function normalizeImportGrade(value) {
  const cleanValue = String(value || '').trim().toUpperCase()
  if (EMPTY_IMPORT_MARKS.has(cleanValue)) return { invalid: false, raw: String(value || '').trim(), value: '' }
  if (VALID_IMPORT_GRADES.has(cleanValue)) return { invalid: false, raw: cleanValue, value: cleanValue }
  return { invalid: Boolean(cleanValue), raw: String(value || '').trim(), value: '' }
}

function buildTutorialImportColumns(subjectOptions) {
  return subjectOptions.flatMap((subjectOption) =>
    buildTutorialCompetencies(subjectOption.subject).map((competency) => ({
      areaName: subjectOption.areaName,
      competency,
      id: `${subjectOption.subject}_${competency.key}`,
      label: competency.name,
      subject: subjectOption.subject,
    })),
  )
}

function groupImportColumnsBySubject(columns) {
  return columns.reduce((groups, column) => {
    const lastGroup = groups[groups.length - 1]
    if (lastGroup?.subject === column.subject) {
      lastGroup.columns.push(column)
      return groups
    }
    return [...groups, { areaName: column.areaName, columns: [column], subject: column.subject }]
  }, [])
}

function filterImportColumns(columns, areaFilter, subjectFilter) {
  return columns.filter(
    (column) =>
      (areaFilter === 'all' || column.areaName === areaFilter) &&
      (subjectFilter === 'all' || column.subject === subjectFilter),
  )
}

function createTutorialImportMatrix({ classId, columns, evaluationContext, students, tutorialMarks }) {
  return students.map((student) =>
    columns.map((column) => {
      const value = getTutorialCompetencyGrade({
        classId,
        competency: column.competency,
        evaluationContext,
        studentId: student.id,
        subject: column.subject,
        tutorialMarks,
      })

      return { invalid: false, raw: value, touched: false, value }
    }),
  )
}

function detectImportSeparator(text) {
  const firstLine = String(text || '').split(/\r?\n/).find((line) => line.trim()) || ''
  if (firstLine.includes('\t')) return '\t'
  if (firstLine.includes(';')) return ';'
  return ','
}

function splitImportRows(rawText) {
  const separator = detectImportSeparator(rawText)
  return String(rawText || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((row) => row.trim())
    .map((row) => row.split(separator).map((cell) => cell.trim()))
}

function rowLooksLikeTutorialHeader(row) {
  const firstCell = String(row[0] || '').toLowerCase()
  return (
    firstCell.includes('alumne') ||
    firstCell.includes('competència') ||
    firstCell.includes('materia') ||
    firstCell.includes('matèria') ||
    row.some((cell) => String(cell || '').includes(' · C'))
  )
}

function removeLeadingStudentName(row, columnCount) {
  if (row.length !== columnCount + 1) return row
  return normalizeImportGrade(row[0]).invalid ? row.slice(1) : row
}

function buildTutorialMatrixFromText(rawText, currentMatrix, columns, students) {
  const matrix = currentMatrix.map((row) => row.map((cell) => ({ ...cell, raw: '', touched: false, value: '' })))
  const rawRows = splitImportRows(rawText)
  let rows = rawRows
  while (rows[0] && rowLooksLikeTutorialHeader(rows[0])) {
    rows = rows.slice(1)
  }

  rows.slice(0, students.length).forEach((row, rowIndex) => {
    const cells = removeLeadingStudentName(row, columns.length)
    cells.slice(0, columns.length).forEach((cell, columnIndex) => {
      matrix[rowIndex][columnIndex] = {
        ...normalizeImportGrade(cell),
        touched: Boolean(String(cell || '').trim()),
      }
    })
  })

  return { ignoredRows: Math.max(0, rows.length - students.length), matrix }
}

function buildTutorialTemplateText({ classId, columns, evaluationContext, students, tutorialMarks }) {
  const subjectHeader = ['Alumne', ...columns.map((column) => column.subject)]
  const competencyHeader = ['Competència', ...columns.map((column) => column.label)]
  const rows = students.map((student) => [
    student.name,
    ...columns.map((column) =>
      getTutorialCompetencyGrade({
        classId,
        competency: column.competency,
        evaluationContext,
        studentId: student.id,
        subject: column.subject,
        tutorialMarks,
      }),
    ),
  ])

  return [subjectHeader, competencyHeader, ...rows].map((row) => row.join('\t')).join('\n')
}

function countImportValues(matrix) {
  return matrix.flat().filter((cell) => cell.value).length
}

function countImportInvalids(matrix) {
  return matrix.flat().filter((cell) => cell.invalid).length
}

function TutoringBulkImportModal({
  activeClass,
  classId,
  columns,
  evaluationContext,
  onClose,
  onSave,
  students,
  tutorialMarks,
}) {
  const [importAreaFilter, setImportAreaFilter] = useState('all')
  const [importSubjectFilter, setImportSubjectFilter] = useState('all')
  const importAreaOptions = useMemo(
    () =>
      Object.values(
        columns.reduce((areas, column) => ({ ...areas, [column.areaName]: column.areaName }), {}),
      ).sort((a, b) => a.localeCompare(b, 'ca')),
    [columns],
  )
  const importSubjectOptions = useMemo(
    () =>
      Array.from(
        new Set(
          columns
            .filter((column) => importAreaFilter === 'all' || column.areaName === importAreaFilter)
            .map((column) => column.subject),
        ),
      ).sort((a, b) => a.localeCompare(b, 'ca')),
    [columns, importAreaFilter],
  )
  const scopedColumns = useMemo(
    () => filterImportColumns(columns, importAreaFilter, importSubjectFilter),
    [columns, importAreaFilter, importSubjectFilter],
  )
  const groupedColumns = useMemo(() => groupImportColumnsBySubject(scopedColumns), [scopedColumns])
  const [{ ignoredRows, matrix }, setImportState] = useState(() => ({
    ignoredRows: 0,
    matrix: createTutorialImportMatrix({ classId, columns, evaluationContext, students, tutorialMarks }),
  }))
  const resetImportMatrix = (nextAreaFilter, nextSubjectFilter) => {
    const nextColumns = filterImportColumns(columns, nextAreaFilter, nextSubjectFilter)
    setImportState({
      ignoredRows: 0,
      matrix: createTutorialImportMatrix({
        classId,
        columns: nextColumns,
        evaluationContext,
        students,
        tutorialMarks,
      }),
    })
  }
  const importedValues = useMemo(() => countImportValues(matrix), [matrix])
  const invalidValues = useMemo(() => countImportInvalids(matrix), [matrix])
  const updates = useMemo(
    () =>
      students.flatMap((student, rowIndex) =>
        scopedColumns
          .map((column, columnIndex) => ({
            classId,
            competencyKey: column.competency.key,
            studentId: student.id,
            subject: column.subject,
            touched: matrix[rowIndex]?.[columnIndex]?.touched,
            value: matrix[rowIndex]?.[columnIndex]?.value || '',
          }))
          .filter((update) => update.touched),
      ),
    [classId, matrix, scopedColumns, students],
  )

  const applyText = (text) => {
    setImportState((current) => buildTutorialMatrixFromText(text, current.matrix, scopedColumns, students))
  }

  const updateCell = (rowIndex, columnIndex, value) => {
    setImportState((current) => {
      const nextMatrix = current.matrix.map((row) => row.map((cell) => ({ ...cell })))
      nextMatrix[rowIndex][columnIndex] = {
        ...normalizeImportGrade(value),
        touched: Boolean(String(value || '').trim()),
      }
      return { ...current, matrix: nextMatrix }
    })
  }

  const handlePaste = (event) => {
    const text = event.clipboardData.getData('text/plain')
    if (!text.includes('\t') && !text.includes('\n') && !text.includes(';')) return

    event.preventDefault()
    applyText(text)
  }

  const downloadTemplate = () => {
    const templateText = buildTutorialTemplateText({
      classId,
      columns: scopedColumns,
      evaluationContext,
      students,
      tutorialMarks,
    })
    const blob = new Blob([templateText], { type: 'text/tab-separated-values;charset=utf-8' })
    downloadBlob(blob, `avaluapro-tutoria-${activeClass?.name || 'classe'}-${getTodaySlug()}.tsv`)
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    applyText(await file.text())
    event.target.value = ''
  }

  const handleSave = async () => {
    await onSave(updates)
    onClose()
  }
  const copyTemplate = async () => {
    await navigator.clipboard.writeText(
      buildTutorialTemplateText({
        classId,
        columns: scopedColumns,
        evaluationContext,
        students,
        tutorialMarks,
      }),
    )
  }

  return (
    <Modal onClose={onClose} size="xl" title="Importació massiva de tutoria">
      <div className="tutorial-bulk-import-panel">
        <section className="excel-import-help">
          <FileSpreadsheet size={22} />
          <div>
            <strong>Una plantilla per a totes les matèries</strong>
            <p>
              Descarrega la plantilla, omple les notes A/B/C/D/NA a Excel i torna-la a carregar. La primera fila
              agrupa les columnes per matèria i la segona indica la competència exacta.
            </p>
          </div>
        </section>

        <div className="tutorial-bulk-filter-grid">
          <label>
            Àrea de la plantilla
            <select
              onChange={(event) => {
                const nextAreaFilter = event.target.value
                setImportAreaFilter(nextAreaFilter)
                setImportSubjectFilter('all')
                resetImportMatrix(nextAreaFilter, 'all')
              }}
              value={importAreaFilter}
            >
              <option value="all">Totes les àrees</option>
              {importAreaOptions.map((areaName) => (
                <option key={areaName} value={areaName}>
                  {areaName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Matèria de la plantilla
            <select
              onChange={(event) => {
                const nextSubjectFilter = event.target.value
                setImportSubjectFilter(nextSubjectFilter)
                resetImportMatrix(importAreaFilter, nextSubjectFilter)
              }}
              value={importSubjectFilter}
            >
              <option value="all">Totes les matèries</option>
              {importSubjectOptions.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </label>
          <article>
            <strong>{scopedColumns.length}</strong>
            <span>competències incloses</span>
            <small>{columns.length - scopedColumns.length} ocultes pel filtre</small>
          </article>
        </div>

        <div className="tutorial-bulk-import-actions">
          <button className="secondary-action" onClick={downloadTemplate} type="button">
            <FileDown size={17} />
            Descarregar plantilla Excel
          </button>
          <label className="secondary-action file-action">
            <FileSpreadsheet size={17} />
            Carregar plantilla omplerta
            <input accept=".csv,.tsv,.txt" onChange={handleFileUpload} type="file" />
          </label>
          <button
            className="secondary-action"
            onClick={copyTemplate}
            type="button"
          >
            <Clipboard size={17} />
            Copiar plantilla
          </button>
        </div>

        <div className="excel-import-status">
          <span className="ok">
            <CheckCircle2 size={16} />
            {importedValues} notes vàlides
          </span>
          {invalidValues > 0 && (
            <span className="warning">
              <AlertTriangle size={16} />
              {invalidValues} cel·les ignorades perquè no són A/B/C/D/NA
            </span>
          )}
          {ignoredRows > 0 && (
            <span className="warning">
              <AlertTriangle size={16} />
              {ignoredRows} files sobrants ignorades
            </span>
          )}
        </div>

        <div className="tutorial-bulk-preview-wrap">
          <table className="tutorial-bulk-preview-table">
            <thead>
              <tr>
                <th rowSpan="2">Alumne</th>
                {groupedColumns.map((group) => (
                  <th className="subject-header" colSpan={group.columns.length} key={`${group.subject}_subject`}>
                    <span>{group.areaName}</span>
                    <strong>{group.subject}</strong>
                  </th>
                ))}
              </tr>
              <tr>
                {scopedColumns.map((column) => (
                  <th key={column.id}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student, rowIndex) => (
                <tr key={student.id}>
                  <th>{student.name}</th>
                  {scopedColumns.map((column, columnIndex) => {
                    const cell = matrix[rowIndex]?.[columnIndex] || { invalid: false, raw: '', value: '' }
                    return (
                      <td className={cell.invalid ? 'invalid-import-cell' : gradeTextClassName(cell.value)} key={column.id}>
                        <input
                          aria-label={`${student.name} ${column.subject} ${column.label}`}
                          className={cell.invalid ? 'invalid' : gradeTextClassName(cell.value)}
                          onChange={(event) => updateCell(rowIndex, columnIndex, event.target.value)}
                          onPaste={rowIndex === 0 && columnIndex === 0 ? handlePaste : undefined}
                          placeholder="-"
                          value={cell.raw || cell.value}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="excel-import-actions">
          <span>{updates.length} canvis preparats</span>
          <button className="primary-action" disabled={updates.length === 0 || invalidValues > 0} onClick={handleSave} type="button">
            <CheckCircle2 size={17} />
            Importar totes les notes
          </button>
        </footer>
      </div>
    </Modal>
  )
}

function TutorialStatsCard({ icon: Icon, label, value, detail, tone = 'neutral', onClick }) {
  const Component = onClick ? 'button' : 'article'
  return (
    <Component className={`tutorial-stat-card ${tone}`} onClick={onClick} type={onClick ? 'button' : undefined}>
      <Icon size={20} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
      {onClick && <em>Consultar</em>}
    </Component>
  )
}

function TutorialGroupGradeChart({ summary }) {
  const points = summary.trajectory || []
  const hasTrend = points.length > 0
  const width = 520
  const height = 250
  const padding = { top: 24, right: 34, bottom: 54, left: 86 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const getX = (index) => padding.left + (points.length <= 1 ? plotWidth : (index / (points.length - 1)) * plotWidth)
  const getY = (score) => padding.top + ((4 - Math.min(4, Math.max(1, score))) / 3) * plotHeight
  const linePoints = points.map((point, index) => `${getX(index)},${getY(point.averageScore)}`).join(' ')
  const areaPoints = hasTrend ? `${padding.left},${getY(1)} ${linePoints} ${getX(points.length - 1)},${getY(1)}` : ''

  return (
    <article className="tutorial-chart-card tutorial-line-chart-card">
      <header>
        <div>
          <span>Trajectòria temporal</span>
          <strong>{summary.globalAverageGrade}</strong>
        </div>
        <small>Mitjana global de totes les assignatures amb dades</small>
      </header>
      {hasTrend ? (
        <svg className="tutorial-line-chart" role="img" viewBox={`0 0 ${width} ${height}`}>
          {[4, 3, 2, 1].map((score) => (
            <g key={score}>
              <line x1={padding.left} x2={width - padding.right} y1={getY(score)} y2={getY(score)} />
              <text className="axis-number" x={padding.left - 52} y={getY(score) + 7}>
                {score.toFixed(1).replace('.', ',')}
              </text>
              <text className={`axis-grade grade-${formatAverageGrade(score)}`} x={padding.left - 16} y={getY(score) + 7}>
                {formatAverageGrade(score)}
              </text>
            </g>
          ))}
          <polygon className="line-area" points={areaPoints} />
          <polyline className="line-stroke" points={linePoints} />
          {points.map((point, index) => (
            <g key={`${point.label}-${index}`}>
              <circle cx={getX(index)} cy={getY(point.averageScore)} r="7" />
              <text className="x-label" x={getX(index)} y={height - 18}>
                {point.label}
              </text>
            </g>
          ))}
        </svg>
      ) : (
        <div className="empty-state compact">Encara no hi ha prou dades per veure una trajectòria del grup.</div>
      )}
    </article>
  )
}

function TutorialSubjectAverageChart({ subjects }) {
  const visibleSubjects = [...subjects]
    .filter((subject) => subject.evaluated > 0)
    .sort((a, b) => b.averageScore - a.averageScore || a.subject.localeCompare(b.subject, 'ca'))
  const maxScore = 4

  return (
    <article className="tutorial-chart-card wide">
      <header>
        <div>
          <span>Comparativa per assignatura</span>
          <strong>{visibleSubjects.length ? 'Millor / pitjor' : '-'}</strong>
        </div>
        <small>Mitjana de les competències de cada matèria</small>
      </header>
      {visibleSubjects.length === 0 ? (
        <div className="empty-state compact">Encara no hi ha notes suficients per comparar assignatures.</div>
      ) : (
        <div className="tutorial-subject-bar-chart">
          {visibleSubjects.map((subject) => {
            const grade = subject.averageGrade || formatAverageGrade(subject.averageScore)
            return (
              <div className="tutorial-subject-bar-row" key={subject.subject}>
                <strong>{subject.subject}</strong>
                <div>
                  <i className={`grade-${grade || 'empty'}`} style={{ width: `${(subject.averageScore / maxScore) * 100}%` }} />
                </div>
                <span className={gradeClassName(grade)}>{grade || '-'}</span>
                <small>{formatPercent(subject.notDevelopedPercent)} no assolides</small>
              </div>
            )
          })}
        </div>
      )}
    </article>
  )
}

function TutorialStudentProfileModal({ classLabel, onClose, onDeleteRecord, profile, recordRow }) {
  const [tutorComment, setTutorComment] = useState('')
  const [reportAreaFilter, setReportAreaFilter] = useState('all')
  const [reportSubjectFilter, setReportSubjectFilter] = useState('all')
  const [printSections, setPrintSections] = useState({
    executiveSummary: true,
    performanceSummary: true,
    competencyDetail: true,
    trackingSummary: true,
    trackingEvidence: true,
    tutorComment: true,
  })
  if (!profile) return null

  const records = recordRow?.records || []
  const hasTracking = records.length > 0
  const reportDate = getTodayDateInput()
  const executiveSummary = getProfileExecutiveSummary(profile, records)
  const reportAreaOptions = Object.values(
    profile.evaluatedCompetencies.reduce(
      (areas, item) => ({ ...areas, [item.areaId]: { id: item.areaId, name: item.areaName } }),
      {},
    ),
  ).sort((a, b) => a.name.localeCompare(b.name, 'ca'))
  const reportSubjectOptions = Array.from(new Set(profile.evaluatedCompetencies.map((item) => item.subject))).sort(
    (a, b) => a.localeCompare(b, 'ca'),
  )
  const filteredCompetencies = profile.evaluatedCompetencies.filter(
    (item) =>
      (reportAreaFilter === 'all' || item.areaId === reportAreaFilter) &&
      (reportSubjectFilter === 'all' || item.subject === reportSubjectFilter),
  )
  const profileAreaSummaries = getProfileAreaSummaries(profile)
  const profileSubjectSummaries = getProfileSubjectSummaries(profile)
  const weakestSubjects = profileSubjectSummaries.filter((subject) => subject.notDeveloped > 0).slice(0, 4)
  const strongestSubjects = profileSubjectSummaries
    .filter((subject) => subject.evaluated > 0 && subject.notDeveloped === 0)
    .sort((a, b) => b.averageScore - a.averageScore || a.subject.localeCompare(b.subject, 'ca'))
    .slice(0, 4)
  const groupedByArea = Object.values(
    filteredCompetencies.reduce((areas, item) => {
      const area = areas[item.areaId] || { name: item.areaName, rows: [] }
      area.rows.push(item)
      return { ...areas, [item.areaId]: area }
    }, {}),
  )
  const selectedPrintSections = Object.values(printSections).filter(Boolean).length
  const togglePrintSection = (section) => {
    setPrintSections((current) => ({ ...current, [section]: !current[section] }))
  }

  return (
    <Modal
      onClose={onClose}
      panelClassName="tutorial-print-panel"
      size="xl"
      title={`Perfil tutorial: ${profile.student.name}`}
    >
      <div className="tutorial-profile-modal">
        <header className="tutorial-print-header">
          <span>AvaluaPro · Informe tutorial</span>
          <h2>{profile.student.name}</h2>
          <p>
            {classLabel || 'Classe sense nom'} · Generat el {formatLongDate(reportDate)}
          </p>
        </header>

        <div className="tutorial-profile-modal-toolbar">
          <p>
            Resum combinat de rendiment competencial i seguiment tutorial. Aquest és el punt de partida
            per preparar una reunió o guardar el perfil com a PDF.
          </p>
          <button className="secondary-action compact" onClick={printTutorialProfile} type="button">
            <FileDown size={16} />
            Imprimir / desar PDF
          </button>
        </div>

        <section className="tutorial-print-options">
          <div>
            <h3 className="tutorial-profile-section-title">Seccions de l’informe</h3>
            <p>Activa només allò que vols incloure quan imprimeixis o desis el perfil com a PDF.</p>
          </div>
          <div className="tutorial-print-option-grid">
            <label>
              <input
                checked={printSections.executiveSummary}
                onChange={() => togglePrintSection('executiveSummary')}
                type="checkbox"
              />
              Resum executiu
            </label>
            <label>
              <input
                checked={printSections.performanceSummary}
                onChange={() => togglePrintSection('performanceSummary')}
                type="checkbox"
              />
              Resum de rendiment
            </label>
            <label>
              <input
                checked={printSections.competencyDetail}
                onChange={() => togglePrintSection('competencyDetail')}
                type="checkbox"
              />
              Detall de competències
            </label>
            <label>
              <input
                checked={printSections.trackingSummary}
                onChange={() => togglePrintSection('trackingSummary')}
                type="checkbox"
              />
              Resum de seguiment
            </label>
            <label>
              <input
                checked={printSections.trackingEvidence}
                onChange={() => togglePrintSection('trackingEvidence')}
                type="checkbox"
              />
              Evidències de seguiment
            </label>
            <label>
              <input
                checked={printSections.tutorComment}
                onChange={() => togglePrintSection('tutorComment')}
                type="checkbox"
              />
              Comentari del tutor
            </label>
          </div>
          <div className="tutorial-report-filter-grid">
            <label>
              Àrea del detall
              <select
                onChange={(event) => {
                  setReportAreaFilter(event.target.value)
                  setReportSubjectFilter('all')
                }}
                value={reportAreaFilter}
              >
                <option value="all">Totes les àrees</option>
                {reportAreaOptions.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Assignatura del detall
              <select onChange={(event) => setReportSubjectFilter(event.target.value)} value={reportSubjectFilter}>
                <option value="all">Totes les assignatures</option>
                {reportSubjectOptions.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {selectedPrintSections === 0 && (
            <strong className="tutorial-print-warning">Selecciona almenys una secció abans d’imprimir.</strong>
          )}
        </section>

        {printSections.executiveSummary && (
          <section className={`tutorial-executive-summary ${executiveSummary.tone}`}>
            <h3 className="tutorial-profile-section-title">Resum executiu</h3>
            <strong>{executiveSummary.title}</strong>
            <ul>
              {executiveSummary.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
            <p>{executiveSummary.action}</p>
          </section>
        )}

        {printSections.tutorComment && (
          <section className="tutorial-tutor-comment-section">
            <h3 className="tutorial-profile-section-title">Comentari del tutor</h3>
            <textarea
              className="tutorial-tutor-comment-editor"
              onChange={(event) => setTutorComment(event.target.value)}
              placeholder="Escriu aquí la síntesi docent: què preocupa, què ha millorat, quin acord proposem o quin seguiment cal fer..."
              value={tutorComment}
            />
            <div className={`tutorial-tutor-comment-print ${tutorComment.trim() ? '' : 'empty'}`}>
              {tutorComment.trim() || 'Sense comentari del tutor afegit.'}
            </div>
          </section>
        )}

        {printSections.performanceSummary && (
          <section>
            <h3 className="tutorial-profile-section-title">Rendiment competencial</h3>
            <div className="tutorial-profile-summary">
              <article>
                <span>Competències avaluades</span>
                <strong>{profile.evaluatedCount}</strong>
              </article>
              <article className={profile.notDevelopedCount > 0 ? 'warning' : 'ok'}>
                <span>No assolides</span>
                <strong>{profile.notDevelopedCount}</strong>
              </article>
              <article>
                <span>% no assolides</span>
                <strong>{formatPercent(profile.notDevelopedPercent)}</strong>
              </article>
              <article>
                <span>Àrea més delicada</span>
                <strong>{profile.weakestArea?.name || '-'}</strong>
              </article>
            </div>
            <div className="tutorial-profile-insight-grid">
              <article>
                <h4>Àrees del perfil</h4>
                {profileAreaSummaries.length === 0 ? (
                  <p>Encara no hi ha prou dades per detectar àrees fortes o delicades.</p>
                ) : (
                  profileAreaSummaries.slice(0, 4).map((area) => (
                    <div className="tutorial-profile-insight-row" key={area.id}>
                      <strong>{area.name}</strong>
                      <span>{formatPercent(area.notDevelopedPercent)} no assolides</span>
                      <small>{area.evaluated} comp. · mitjana {area.averageGrade}</small>
                    </div>
                  ))
                )}
              </article>
              <article>
                <h4>Matèries a prioritzar</h4>
                {weakestSubjects.length === 0 ? (
                  <p>No hi ha cap matèria amb competències no assolides registrades.</p>
                ) : (
                  weakestSubjects.map((subject) => (
                    <div className="tutorial-profile-insight-row risk" key={subject.subject}>
                      <strong>{subject.subject}</strong>
                      <span>{subject.notDeveloped}/{subject.evaluated} no assolides</span>
                      <small>{subject.areaName}</small>
                    </div>
                  ))
                )}
              </article>
              <article>
                <h4>Punts forts</h4>
                {strongestSubjects.length === 0 ? (
                  <p>Encara no hi ha matèries completament assolides o sense risc.</p>
                ) : (
                  strongestSubjects.map((subject) => (
                    <div className="tutorial-profile-insight-row ok" key={subject.subject}>
                      <strong>{subject.subject}</strong>
                      <span>Cap no assolida</span>
                      <small>Mitjana {subject.averageGrade}</small>
                    </div>
                  ))
                )}
              </article>
            </div>
          </section>
        )}

        {printSections.trackingSummary && (
          <section>
            <h3 className="tutorial-profile-section-title">Seguiment tutorial</h3>
            <div className="tutorial-profile-summary tracking">
              {TUTORING_RECORD_TYPES.map((type) => (
                <article className={type.tone} key={type.id}>
                  <span>{type.label}</span>
                  <strong>{countByType(records, type.id)}</strong>
                </article>
              ))}
            </div>
          </section>
        )}

        {printSections.competencyDetail && (
          <section>
            <h3 className="tutorial-profile-section-title">Detall de competències</h3>
            {profile.evaluatedCount === 0 ? (
              <div className="empty-state compact">Encara no hi ha notes tutorials per aquest alumne.</div>
            ) : (
              <div className="tutorial-profile-area-list">
                {groupedByArea.map((area) => (
                  <section key={area.name}>
                    <h3>{area.name}</h3>
                    {area.rows.map((row) => (
                      <div
                        className={`tutorial-profile-row ${row.notDeveloped ? 'risk' : ''}`}
                        key={`${row.subject}_${row.competencyName}`}
                      >
                        <div>
                          <strong>{row.subject}</strong>
                          <span>{row.competencyName}</span>
                        </div>
                        <span className={gradeClassName(row.grade)}>{row.grade}</span>
                      </div>
                    ))}
                  </section>
                ))}
                {filteredCompetencies.length === 0 && (
                  <div className="empty-state compact">Aquest filtre no té competències registrades.</div>
                )}
              </div>
            )}
          </section>
        )}

        {printSections.trackingEvidence && (
          <section className="tutorial-profile-record-section">
          <h3 className="tutorial-profile-section-title">Evidències de seguiment</h3>
            {!hasTracking ? (
              <div className="empty-state compact">Encara no hi ha registres tutorials vinculats a aquest alumne.</div>
            ) : (
              <div className="tutorial-record-history compact">
                {records
                  .slice()
                  .sort((a, b) => {
                    const dateCompare = String(b.date || '').localeCompare(String(a.date || ''))
                    if (dateCompare !== 0) return dateCompare
                    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
                  })
                  .map((record) => {
                    const typeMeta = getRecordTypeMeta(record.type)
                    return (
                      <article className={`tutorial-record-entry ${typeMeta.tone}`} key={record.id}>
                        <div>
                          <strong>{typeMeta.label}</strong>
                          <span>{formatShortDate(record.date)}</span>
                          <p>{record.note || 'Sense comentari afegit.'}</p>
                        </div>
                        <button
                          className="icon-button danger subtle"
                          onClick={() => onDeleteRecord(record.id)}
                          title="Eliminar registre"
                          type="button"
                        >
                          <Trash2 size={16} />
                        </button>
                      </article>
                    )
                  })}
              </div>
            )}
          </section>
        )}

        <footer className="tutorial-print-footer">
          Informe orientatiu generat amb AvaluaPro. Les dades s’han d’interpretar dins del context educatiu de l’alumne.
        </footer>
      </div>
    </Modal>
  )
}

function TutorialRecordStudentModal({ onClose, onDelete, row }) {
  if (!row) return null

  return (
    <Modal onClose={onClose} size="lg" title={`Seguiment tutorial: ${row.student.name}`}>
      <div className="tutorial-record-modal">
        <section className="tutorial-record-modal-summary">
          {TUTORING_RECORD_TYPES.map((type) => (
            <article className={type.tone} key={type.id}>
              <span>{type.label}</span>
              <strong>{countByType(row.records, type.id)}</strong>
            </article>
          ))}
        </section>

        {row.records.length === 0 ? (
          <div className="empty-state compact">Aquest alumne encara no té registres tutorials.</div>
        ) : (
          <div className="tutorial-record-history">
            {row.records
              .slice()
              .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
              .map((record) => {
                const typeMeta = getRecordTypeMeta(record.type)
                return (
                  <article className={`tutorial-record-entry ${typeMeta.tone}`} key={record.id}>
                    <div>
                      <strong>{typeMeta.label}</strong>
                      <span>{formatShortDate(record.date)}</span>
                      <p>{record.note || 'Sense comentari afegit.'}</p>
                    </div>
                    <button
                      className="icon-button danger subtle"
                      onClick={() => onDelete(record.id)}
                      title="Eliminar registre"
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </article>
                )
              })}
          </div>
        )}
      </div>
    </Modal>
  )
}

export function TutoringView() {
  const sociogramCanvasRef = useRef(null)
  const sociogramDragRef = useRef(null)
  const [activePanel, setActivePanel] = useState('evaluation')
  const [areaFilter, setAreaFilter] = useState('all')
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [profileFilter, setProfileFilter] = useState('priority')
  const [subjectFilter, setSubjectFilter] = useState('auto')
  const [selectedTutorialProfileId, setSelectedTutorialProfileId] = useState('')
  const [selectedTutorialRecordStudentId, setSelectedTutorialRecordStudentId] = useState('')
  const [recordForm, setRecordForm] = useState({
    studentId: '',
    type: 'agenda',
    date: getTodayDateInput(),
    note: '',
  })
  const [relationForm, setRelationForm] = useState({
    sourceStudentId: '',
    targetStudentId: '',
    type: 'positive',
    strength: '2',
    note: '',
  })
  const [relationSearch, setRelationSearch] = useState({ source: '', target: '' })
  const [selectedRelationStudentId, setSelectedRelationStudentId] = useState('')
  const [activeRelationshipTool, setActiveRelationshipTool] = useState('')
  const [sociogramFilter, setSociogramFilter] = useState('all')
  const [sociogramDraftPositions, setSociogramDraftPositions] = useState({})
  const [cooperativeGroupSize, setCooperativeGroupSize] = useState('4')
  const [cooperativeStrategy, setCooperativeStrategy] = useState('balanced')
  const [prioritizeHalfGroups, setPrioritizeHalfGroups] = useState(true)
  const [cooperativeGroupSetName, setCooperativeGroupSetName] = useState('')
  const [selectedCooperativeGroupSetId, setSelectedCooperativeGroupSetId] = useState('')
  const [seatingLayout, setSeatingLayout] = useState({ activeSeatIds: getDefaultSeatingActiveSeatIds(), columns: 9, rows: 5 })
  const [seatingManualSeatByStudentId, setSeatingManualSeatByStudentId] = useState({})
  const [seatingManualEmptySeatIds, setSeatingManualEmptySeatIds] = useState([])
  const [seatingLockedStudentIds, setSeatingLockedStudentIds] = useState([])
  const [seatingVariant, setSeatingVariant] = useState(0)
  const [seatingPrioritizeHalfGroups, setSeatingPrioritizeHalfGroups] = useState(true)
  const [seatingProblemSeats, setSeatingProblemSeats] = useState({})
  const [seatingUnseatedStudentIds, setSeatingUnseatedStudentIds] = useState([])
  const [draggingSeatingStudentId, setDraggingSeatingStudentId] = useState('')
  const [selectedSeatingPlanId, setSelectedSeatingPlanId] = useState('')
  const activeClassId = useAvaluaproStore((state) => state.ui.activeClassId)
  const classes = useAvaluaproStore((state) => state.classes)
  const students = useAvaluaproStore((state) => state.students)
  const marks = useAvaluaproStore((state) => state.marks)
  const competencies = useAvaluaproStore((state) => state.competencies)
  const criteria = useAvaluaproStore((state) => state.criteria)
  const semesters = useAvaluaproStore((state) => state.semesters)
  const uts = useAvaluaproStore((state) => state.uts)
  const tutorialRecords = useAvaluaproStore((state) => state.tutorialRecords)
  const tutorialMarks = useAvaluaproStore((state) => state.tutorialMarks)
  const tutorialRelations = useAvaluaproStore((state) => state.tutorialRelations)
  const tutorialGroupSets = useAvaluaproStore((state) => state.tutorialGroupSets)
  const tutorialSociogramLayouts = useAvaluaproStore((state) => state.tutorialSociogramLayouts)
  const tutorialStudentRoles = useAvaluaproStore((state) => state.tutorialStudentRoles)
  const tutorialSeatingPlans = useAvaluaproStore((state) => state.tutorialSeatingPlans)
  const updateTutorialMark = useAvaluaproStore((state) => state.updateTutorialMark)
  const importTutorialMarks = useAvaluaproStore((state) => state.importTutorialMarks)
  const addTutorialRecord = useAvaluaproStore((state) => state.addTutorialRecord)
  const deleteTutorialRecord = useAvaluaproStore((state) => state.deleteTutorialRecord)
  const upsertTutorialRelation = useAvaluaproStore((state) => state.upsertTutorialRelation)
  const saveTutorialGroupSet = useAvaluaproStore((state) => state.saveTutorialGroupSet)
  const deleteTutorialGroupSet = useAvaluaproStore((state) => state.deleteTutorialGroupSet)
  const upsertTutorialSociogramLayout = useAvaluaproStore((state) => state.upsertTutorialSociogramLayout)
  const resetTutorialSociogramLayout = useAvaluaproStore((state) => state.resetTutorialSociogramLayout)
  const toggleTutorialStudentRole = useAvaluaproStore((state) => state.toggleTutorialStudentRole)
  const saveTutorialSeatingPlan = useAvaluaproStore((state) => state.saveTutorialSeatingPlan)
  const activeClass = classes.find((classItem) => classItem.id === activeClassId)
  const linkedClassId = activeClass?.tutorialLinkedClassId || activeClass?.id
  const linkedClass = classes.find((classItem) => classItem.id === linkedClassId) || activeClass
  const classStudents = useMemo(
    () => students.filter((student) => student.classId === linkedClassId).sort((a, b) => a.name.localeCompare(b.name, 'ca')),
    [linkedClassId, students],
  )
  const classTutorialRecords = useMemo(
    () => tutorialRecords.filter((record) => record.classId === activeClassId),
    [activeClassId, tutorialRecords],
  )
  const classTutorialRelations = useMemo(
    () => tutorialRelations.filter((relation) => relation.classId === activeClassId),
    [activeClassId, tutorialRelations],
  )
  const classTutorialStudentRoles = useMemo(
    () => (tutorialStudentRoles || []).filter((role) => role.classId === activeClassId),
    [activeClassId, tutorialStudentRoles],
  )
  const tutorialRoleRowsByStudent = useMemo(
    () => buildTutorialRoleRows(classStudents, classTutorialStudentRoles),
    [classStudents, classTutorialStudentRoles],
  )
  const effectiveTutorialRelations = useMemo(
    () =>
      buildEffectiveTutorialRelations({
        relations: classTutorialRelations,
        rolesByStudentId: tutorialRoleRowsByStudent,
        students: classStudents,
      }),
    [classStudents, classTutorialRelations, tutorialRoleRowsByStudent],
  )
  const classTutorialGroupSets = useMemo(
    () =>
      (tutorialGroupSets || [])
        .filter((groupSet) => groupSet.classId === activeClassId)
        .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''))),
    [activeClassId, tutorialGroupSets],
  )
  const classTutorialSociogramLayout = useMemo(
    () => (tutorialSociogramLayouts || []).find((layout) => layout.classId === activeClassId) || null,
    [activeClassId, tutorialSociogramLayouts],
  )
  const classTutorialSeatingPlan = useMemo(
    () =>
      (tutorialSeatingPlans || [])
        .filter((plan) => plan.classId === activeClassId)
        .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))[0] ||
      null,
    [activeClassId, tutorialSeatingPlans],
  )
  const classTutorialSeatingPlans = useMemo(
    () =>
      (tutorialSeatingPlans || [])
        .filter((plan) => plan.classId === activeClassId)
        .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''))),
    [activeClassId, tutorialSeatingPlans],
  )
  const savedSociogramPositionsByStudentId = useMemo(
    () =>
      new Map(
        (classTutorialSociogramLayout?.positions || []).map((position) => [
          position.studentId,
          { x: position.x, y: position.y },
        ]),
      ),
    [classTutorialSociogramLayout],
  )
  const sociogramPositionsByStudentId = useMemo(
    () =>
      new Map([
        ...savedSociogramPositionsByStudentId,
        ...Object.entries(sociogramDraftPositions).map(([studentId, position]) => [
          studentId,
          { x: position.x, y: position.y },
        ]),
      ]),
    [savedSociogramPositionsByStudentId, sociogramDraftPositions],
  )
  const subjectOptions = useMemo(() => getSubjectOptionsForArea(areaFilter), [areaFilter])
  const allSubjectOptions = useMemo(() => getAllTutorialSubjectOptions(), [])
  const bulkImportColumns = useMemo(() => buildTutorialImportColumns(allSubjectOptions), [allSubjectOptions])
  const autoSubject =
    linkedClass?.subject && SUBJECT_STRUCTURES[linkedClass.subject] ? linkedClass.subject : subjectOptions[0]?.subject
  const selectedSubject = subjectFilter === 'auto' ? autoSubject : subjectFilter
  const selectedSubjectArea = getSubjectArea(selectedSubject)
  const selectedCompetencies = useMemo(() => buildTutorialCompetencies(selectedSubject), [selectedSubject])
  const evaluationContext = useMemo(
    () => ({
      criteria,
      competencies,
      linkedClassId,
      linkedSubject: linkedClass?.subject,
      marks,
      semesters,
      uts,
    }),
    [criteria, competencies, linkedClass?.subject, linkedClassId, marks, semesters, uts],
  )

  const isSelectedSubjectLinked = Boolean(selectedSubject && selectedSubject === linkedClass?.subject)
  const linkedGradeCount = useMemo(() => {
    if (!isSelectedSubjectLinked || classStudents.length === 0 || selectedCompetencies.length === 0) return 0

    return classStudents.reduce(
      (studentTotal, student) =>
        studentTotal +
        selectedCompetencies.filter((competency) => {
          const gradeSource = getTutorialCompetencyGradeSource({
            classId: activeClassId,
            competency,
            evaluationContext,
            studentId: student.id,
            subject: selectedSubject,
            tutorialMarks,
          })
          return gradeSource.source === 'linked'
        }).length,
      0,
    )
  }, [
    activeClassId,
    classStudents,
    evaluationContext,
    isSelectedSubjectLinked,
    selectedCompetencies,
    selectedSubject,
    tutorialMarks,
  ])
  const tutorialSummary = useMemo(
    () =>
      summarizeTutorialData({
        classId: activeClassId,
        evaluationContext,
        students: classStudents,
        tutorialMarks,
      }),
    [activeClassId, classStudents, evaluationContext, tutorialMarks],
  )
  const subjectCompletion = useMemo(() => {
    const entries = subjectOptions.map((item) => {
      const subjectCompetencies = buildTutorialCompetencies(item.subject)
      const total = classStudents.length * subjectCompetencies.length
      const completed = classStudents.reduce(
        (studentTotal, student) =>
          studentTotal +
          subjectCompetencies.filter((competency) =>
            getTutorialCompetencyGrade({
              classId: activeClassId,
              competency,
              evaluationContext,
              studentId: student.id,
              subject: item.subject,
              tutorialMarks,
            }),
          ).length,
        0,
      )

      return [item.subject, { completed, total }]
    })

    return new Map(entries)
  }, [activeClassId, classStudents, evaluationContext, subjectOptions, tutorialMarks])
  const tutorialRecordSummary = useMemo(
    () => summarizeTutorialRecords({ students: classStudents, records: classTutorialRecords }),
    [classStudents, classTutorialRecords],
  )
  const tutorialRelationSummary = useMemo(
    () => summarizeTutorialRelations({ students: classStudents, relations: classTutorialRelations }),
    [classStudents, classTutorialRelations],
  )
  const tutorialRecordRowsByStudent = useMemo(
    () => new Map(tutorialRecordSummary.studentRows.map((row) => [row.student.id, row])),
    [tutorialRecordSummary.studentRows],
  )
  const tutorialRelationRowsByStudent = useMemo(
    () => new Map(tutorialRelationSummary.studentRows.map((row) => [row.student.id, row])),
    [tutorialRelationSummary.studentRows],
  )
  const tutorialGroupSummary = useMemo(
    () =>
      summarizeTutorialGroup({
        recordRowsByStudent: tutorialRecordRowsByStudent,
        tutorialRecordSummary,
        tutorialSummary,
      }),
    [tutorialRecordRowsByStudent, tutorialRecordSummary, tutorialSummary],
  )
  const cooperativeProfilesByStudentId = useMemo(
    () =>
      new Map(
        tutorialSummary.studentProfiles.map((profile) => [
          profile.student.id,
          getStudentCooperativeProfile({
            profile,
            recordRow: tutorialRecordRowsByStudent.get(profile.student.id),
            relationRow: tutorialRelationRowsByStudent.get(profile.student.id),
            roleRow: tutorialRoleRowsByStudent.get(profile.student.id),
          }),
        ]),
      ),
    [tutorialRecordRowsByStudent, tutorialRelationRowsByStudent, tutorialRoleRowsByStudent, tutorialSummary.studentProfiles],
  )
  const selectedTutorialProfile = tutorialSummary.studentProfiles.find(
    (profile) => profile.student.id === selectedTutorialProfileId,
  )
  const selectedTutorialRecordRow = tutorialRecordSummary.studentRows.find(
    (row) => row.student.id === selectedTutorialRecordStudentId,
  )
  const selectedRelationRow =
    tutorialRelationSummary.studentRows.find((row) => row.student.id === selectedRelationStudentId) ||
    tutorialRelationSummary.studentRows[0]
  const tutorialSociogramMap = useMemo(
    () =>
      buildTutorialSociogramMap({
        filter: sociogramFilter,
        positionsByStudentId: sociogramPositionsByStudentId,
        relations: tutorialRelationSummary.enrichedRelations,
        roleRowsByStudent: tutorialRoleRowsByStudent,
        selectedStudentId: selectedRelationRow?.student.id,
        studentRows: tutorialRelationSummary.studentRows,
        students: classStudents,
      }),
    [
      classStudents,
      selectedRelationRow?.student.id,
      sociogramFilter,
      sociogramPositionsByStudentId,
      tutorialRelationSummary.enrichedRelations,
      tutorialRoleRowsByStudent,
      tutorialRelationSummary.studentRows,
    ],
  )
  const cooperativeGroups = useMemo(
    () =>
      buildCooperativeGroups({
        groupSize: cooperativeGroupSize,
        prioritizeHalfGroups,
        profiles: tutorialSummary.studentProfiles,
        recordRowsByStudent: tutorialRecordRowsByStudent,
        relationRowsByStudent: tutorialRelationRowsByStudent,
        relations: effectiveTutorialRelations,
        roleRowsByStudent: tutorialRoleRowsByStudent,
        strategy: cooperativeStrategy,
      }),
    [
      cooperativeGroupSize,
      cooperativeStrategy,
      effectiveTutorialRelations,
      prioritizeHalfGroups,
      tutorialRecordRowsByStudent,
      tutorialRelationRowsByStudent,
      tutorialRoleRowsByStudent,
      tutorialSummary.studentProfiles,
    ],
  )
  const selectedCooperativeGroupSet =
    classTutorialGroupSets.find((groupSet) => groupSet.id === selectedCooperativeGroupSetId) || null
  const latestCooperativeGroupSet = classTutorialGroupSets[0] || null
  const hasRelationChangesAfterGroupSave = Boolean(
    latestCooperativeGroupSet &&
      classTutorialRelations.some(
        (relation) =>
          String(relation.updatedAt || relation.createdAt || '') >
          String(latestCooperativeGroupSet.updatedAt || latestCooperativeGroupSet.createdAt || ''),
      ),
  )
  const visibleCooperativeGroups = useMemo(
    () =>
      selectedCooperativeGroupSet
        ? materializeSavedCooperativeGroups({
            profilesByStudentId: cooperativeProfilesByStudentId,
            relations: effectiveTutorialRelations,
            savedGroupSet: selectedCooperativeGroupSet,
          })
        : cooperativeGroups,
    [cooperativeGroups, cooperativeProfilesByStudentId, effectiveTutorialRelations, selectedCooperativeGroupSet],
  )
  const generatedSeatingPlan = useMemo(
    () =>
      buildTutorialSeatingPlan({
        layout: seatingLayout,
        lockedStudentIds: seatingLockedStudentIds,
        manualEmptySeatIds: seatingManualEmptySeatIds,
        manualSeatByStudentId: seatingManualSeatByStudentId,
        problemSeatsByStudentId: seatingProblemSeats,
        prioritizeHalfGroups: seatingPrioritizeHalfGroups,
        profilesByStudentId: cooperativeProfilesByStudentId,
        relations: effectiveTutorialRelations,
        students: classStudents,
        unseatedStudentIds: seatingUnseatedStudentIds,
        variant: seatingVariant,
      }),
    [
      classStudents,
      cooperativeProfilesByStudentId,
      effectiveTutorialRelations,
      seatingLayout,
      seatingLockedStudentIds,
      seatingManualEmptySeatIds,
      seatingManualSeatByStudentId,
      seatingProblemSeats,
      seatingPrioritizeHalfGroups,
      seatingUnseatedStudentIds,
      seatingVariant,
    ],
  )
  const selectedSeatingPlan =
    classTutorialSeatingPlans.find((plan) => plan.id === selectedSeatingPlanId) || null
  const visibleSeatingPlan = selectedSeatingPlan
    ? materializeSavedSeatingPlan({ plan: selectedSeatingPlan, profilesByStudentId: cooperativeProfilesByStudentId })
    : generatedSeatingPlan
  const seatingCapacity = getSeatingCapacity(seatingLayout)
  const hasRelationChangesAfterSeatingSave = Boolean(
    classTutorialSeatingPlan &&
      classTutorialRelations.some(
        (relation) => String(relation.updatedAt || relation.createdAt || '') > String(classTutorialSeatingPlan.updatedAt || ''),
      ),
  )
  const filteredTutorialProfiles = useMemo(
    () =>
      tutorialSummary.studentProfiles
        .filter((profile) => {
          const recordRow = tutorialRecordRowsByStudent.get(profile.student.id)
          if (profileFilter === 'all') return true
          if (profileFilter === 'priority') return getTutorialProfilePriority(profile, recordRow) > 0
          if (profileFilter === 'not-developed') return profile.notDevelopedCount > 0
          if (profileFilter === 'tracking') return (recordRow?.total || 0) > 0
          return true
        })
        .sort((a, b) => {
          const priorityA = getTutorialProfilePriority(a, tutorialRecordRowsByStudent.get(a.student.id))
          const priorityB = getTutorialProfilePriority(b, tutorialRecordRowsByStudent.get(b.student.id))
          if (priorityA !== priorityB) return priorityB - priorityA
          return a.student.name.localeCompare(b.student.name, 'ca')
        }),
    [profileFilter, tutorialRecordRowsByStudent, tutorialSummary.studentProfiles],
  )
  const selectedRecordType = getRecordTypeMeta(recordForm.type)

  const handleSubmitTutorialRecord = async (event) => {
    event.preventDefault()
    const studentId = recordForm.studentId || classStudents[0]?.id
    if (!studentId) return

    await addTutorialRecord({
      classId: activeClassId,
      studentId,
      type: recordForm.type,
      date: recordForm.date,
      note: recordForm.note,
    })
    setRecordForm((current) => ({
      ...current,
      studentId,
      date: getTodayDateInput(),
      note: '',
    }))
  }

  const handleSubmitTutorialRelation = async (event) => {
    event.preventDefault()
    const sourceStudentId = relationForm.sourceStudentId || classStudents[0]?.id
    const targetStudentId =
      relationForm.targetStudentId || classStudents.find((student) => student.id !== sourceStudentId)?.id
    if (!sourceStudentId || !targetStudentId || sourceStudentId === targetStudentId) return

    await upsertTutorialRelation({
      classId: activeClassId,
      note: relationForm.note,
      sourceStudentId,
      strength: relationForm.strength,
      targetStudentId,
      type: relationForm.type,
    })
    setSelectedRelationStudentId(sourceStudentId)
    setRelationForm((current) => ({
      ...current,
      sourceStudentId,
      targetStudentId: '',
      note: '',
    }))
    setRelationSearch((current) => ({ ...current, target: '' }))
  }

  const handleRelationSearchChange = (field, value) => {
    const matchedStudent = findStudentBySearch(classStudents, value)
    setRelationSearch((current) => ({ ...current, [field]: value }))
    if (matchedStudent) {
      setRelationForm((current) => ({
        ...current,
        [field === 'source' ? 'sourceStudentId' : 'targetStudentId']: matchedStudent.id,
      }))
    }
  }

  const resetSeatingManualChanges = () => {
    setSeatingManualSeatByStudentId((current) =>
      Object.fromEntries(Object.entries(current).filter(([studentId]) => seatingLockedStudentIds.includes(studentId))),
    )
    setSeatingManualEmptySeatIds([])
    setSeatingProblemSeats({})
    setSeatingUnseatedStudentIds((current) => current.filter((studentId) => seatingLockedStudentIds.includes(studentId)))
  }

  const toggleSeatingGridSeat = (seat, placement) => {
    if (selectedSeatingPlan) return
    setSelectedSeatingPlanId('')
    if (placement?.studentId) {
      if (seatingLockedStudentIds.includes(placement.studentId)) return
      setSeatingUnseatedStudentIds((current) => [...new Set([...current, placement.studentId])])
      setSeatingManualEmptySeatIds((current) => [...new Set([...current, placement.seat.id])])
      setSeatingManualSeatByStudentId((current) => {
        const next = { ...current }
        delete next[placement.studentId]
        return next
      })
      return
    }

    setSeatingLayout((current) => {
      const cleanLayout = normalizeSeatingLayout(current)
      const activeSeatIds = cleanLayout.activeSeatIds.includes(seat.id)
        ? cleanLayout.activeSeatIds.filter((seatId) => seatId !== seat.id)
        : [...cleanLayout.activeSeatIds, seat.id]
      return normalizeSeatingLayout({ ...cleanLayout, activeSeatIds })
    })
    setSeatingManualEmptySeatIds((current) => current.filter((seatId) => seatId !== seat.id))
  }

  const toggleSeatingLockedStudent = (placement) => {
    if (!placement?.studentId || !placement?.seat?.id) return
    setSelectedSeatingPlanId('')
    setSeatingManualSeatByStudentId((current) => ({
      ...current,
      [placement.studentId]: placement.seat.id,
    }))
    setSeatingManualEmptySeatIds((current) => current.filter((seatId) => seatId !== placement.seat.id))
    setSeatingUnseatedStudentIds((current) => current.filter((studentId) => studentId !== placement.studentId))
    setSeatingLockedStudentIds((current) =>
      current.includes(placement.studentId)
        ? current.filter((studentId) => studentId !== placement.studentId)
        : [...current, placement.studentId],
    )
  }

  const toggleSeatingProblemSeat = (placement) => {
    if (!placement?.studentId || !placement?.seat?.id) return
    setSelectedSeatingPlanId('')
    setSeatingProblemSeats((current) => ({
      ...current,
      [placement.studentId]: current[placement.studentId] === placement.seat.id ? undefined : placement.seat.id,
    }))
  }

  const handleSeatingDragStart = (event, placement) => {
    if (selectedSeatingPlan || !placement?.studentId) return
    if (seatingLockedStudentIds.includes(placement.studentId)) return
    setDraggingSeatingStudentId(placement.studentId)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', placement.studentId)
  }

  const handleSeatingPendingDragStart = (event, studentId) => {
    if (selectedSeatingPlan || !studentId) return
    setDraggingSeatingStudentId(studentId)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', studentId)
  }

  const handleSeatingDrop = (event, targetSeat, targetPlacement) => {
    event.preventDefault()
    if (selectedSeatingPlan || !targetSeat?.enabled) return
    const draggedStudentId = event.dataTransfer.getData('text/plain') || draggingSeatingStudentId
    if (!draggedStudentId) return
    if (seatingLockedStudentIds.includes(draggedStudentId) || seatingLockedStudentIds.includes(targetPlacement?.studentId)) {
      setDraggingSeatingStudentId('')
      return
    }
    const sourcePlacement = generatedSeatingPlan.placements.find((placement) => placement.studentId === draggedStudentId)
    if (targetPlacement?.studentId === draggedStudentId) return

    setSelectedSeatingPlanId('')
    setSeatingManualSeatByStudentId((current) => {
      const next = { ...current, [draggedStudentId]: targetSeat.id }
      if (targetPlacement?.studentId) {
        if (sourcePlacement?.seat?.id) next[targetPlacement.studentId] = sourcePlacement.seat.id
        else delete next[targetPlacement.studentId]
      }
      return next
    })
    setSeatingUnseatedStudentIds((current) => {
      const next = new Set(current.filter((studentId) => studentId !== draggedStudentId))
      if (targetPlacement?.studentId && !sourcePlacement?.seat?.id) next.add(targetPlacement.studentId)
      return [...next]
    })
    setSeatingManualEmptySeatIds((current) => {
      const next = new Set(current)
      next.delete(targetSeat.id)
      if (sourcePlacement?.seat?.id && !targetPlacement) next.add(sourcePlacement.seat.id)
      if (targetPlacement && sourcePlacement?.seat?.id) next.delete(sourcePlacement.seat.id)
      return [...next]
    })
    setDraggingSeatingStudentId('')
  }

  const handleSaveTutorialSeatingPlan = async () => {
    await saveTutorialSeatingPlan({
      classId: activeClassId,
      layout: {
        ...generatedSeatingPlan.layout,
        lockedStudentIds: seatingLockedStudentIds,
        prioritizeHalfGroups: seatingPrioritizeHalfGroups,
      },
      seats: generatedSeatingPlan.placements.map((placement) => ({
        halfGroup: placement.halfGroup,
        isConflict: placement.isConflict,
        isLocked: placement.isLocked,
        isStar: placement.isStar,
        studentId: placement.studentId,
        x: placement.seat.x,
        y: placement.seat.y,
      })),
      title: 'Disposició recomanada',
    })
    setSelectedSeatingPlanId('')
  }

  const persistSociogramPosition = async (studentId, position) => {
    if (!activeClassId || !studentId || !position) return

    const nextPositions = {
      ...Object.fromEntries(savedSociogramPositionsByStudentId),
      ...sociogramDraftPositions,
      [studentId]: position,
    }
    await upsertTutorialSociogramLayout({ classId: activeClassId, positions: nextPositions })
  }

  const handleSociogramPointerDown = (event, node) => {
    if (!sociogramCanvasRef.current) return

    event.currentTarget.setPointerCapture?.(event.pointerId)
    setSelectedRelationStudentId(node.id)
    sociogramDragRef.current = {
      lastPosition: null,
      moved: false,
      pointerId: event.pointerId,
      studentId: node.id,
    }
  }

  const handleSociogramPointerMove = (event, node) => {
    const dragState = sociogramDragRef.current
    const canvasElement = sociogramCanvasRef.current
    if (!dragState || dragState.pointerId !== event.pointerId || dragState.studentId !== node.id || !canvasElement) {
      return
    }

    const rect = canvasElement.getBoundingClientRect()
    if (!rect.width || !rect.height) return

    const nextPosition = {
      x: clampSociogramPosition(((event.clientX - rect.left) / rect.width) * 100, 6, 94, node.x),
      y: clampSociogramPosition(((event.clientY - rect.top) / rect.height) * 100, 8, 92, node.y),
    }
    sociogramDragRef.current = { ...dragState, lastPosition: nextPosition, moved: true }
    setSociogramDraftPositions((current) => ({ ...current, [node.id]: nextPosition }))
  }

  const handleSociogramPointerUp = async (event, node) => {
    const dragState = sociogramDragRef.current
    if (!dragState || dragState.pointerId !== event.pointerId || dragState.studentId !== node.id) return

    event.currentTarget.releasePointerCapture?.(event.pointerId)
    sociogramDragRef.current = null
    if (dragState.moved && dragState.lastPosition) {
      await persistSociogramPosition(node.id, dragState.lastPosition)
    }
  }

  const handleResetSociogramLayout = async () => {
    setSociogramDraftPositions({})
    sociogramDragRef.current = null
    await resetTutorialSociogramLayout(activeClassId)
  }

  const handleSaveCooperativeGroupSet = async () => {
    if (cooperativeGroups.length === 0) return

    const fallbackName = `Grups cooperatius ${formatShortDate(getTodayDateInput())}`
    await saveTutorialGroupSet({
      classId: activeClassId,
      groupSize: cooperativeGroupSize,
      groups: cooperativeGroups,
      name: cooperativeGroupSetName || fallbackName,
      prioritizeHalfGroups,
      strategy: cooperativeStrategy,
    })
    setCooperativeGroupSetName('')
    setSelectedCooperativeGroupSetId('')
  }

  const handleDeleteCooperativeGroupSet = async (groupSetId) => {
    await deleteTutorialGroupSet(groupSetId)
    if (selectedCooperativeGroupSetId === groupSetId) {
      setSelectedCooperativeGroupSetId('')
    }
  }

  const handleCopyCooperativeGroups = async () => {
    await navigator.clipboard.writeText(getCooperativeGroupCopyText(visibleCooperativeGroups))
  }

  return (
    <section className="tutoring-view">
      <header className="tutoring-hero">
        <div>
          <span className="section-kicker">
            <GraduationCap size={17} />
            Mode tutoria
          </span>
          <h1>{activeClass?.name || 'Tutoria'}</h1>
          <p>
            Espai per recollir la visió global del grup: dades acadèmiques de totes les assignatures,
            seguiment tutorial i perfil individual de cada alumne.
          </p>
        </div>
        <aside>
          <strong>{classStudents.length}</strong>
          <span>alumnes vinculats</span>
          <small>Dades compartides amb {linkedClass?.name || 'la classe activa'}</small>
        </aside>
      </header>

      <div className="tutoring-panel-tabs" aria-label="Vistes de tutoria">
        <button
          className={activePanel === 'evaluation' ? 'active' : ''}
          onClick={() => setActivePanel('evaluation')}
          type="button"
        >
          <BookOpenCheck size={17} />
          Avaluació tutorial
        </button>
        <button
          className={activePanel === 'tracking' ? 'active' : ''}
          onClick={() => setActivePanel('tracking')}
          type="button"
        >
          <ClipboardList size={17} />
          Seguiment tutorial
        </button>
        <button
          className={activePanel === 'relationships' ? 'active' : ''}
          onClick={() => setActivePanel('relationships')}
          type="button"
        >
          <Network size={17} />
          Relacions i grups
        </button>
        <button
          className={activePanel === 'profile' ? 'active' : ''}
          onClick={() => setActivePanel('profile')}
          type="button"
        >
          <UsersRound size={17} />
          Perfil i PDF
        </button>
      </div>

      {activePanel === 'evaluation' && (
        <section className="tutorial-evaluation-panel">
          <section className="tutorial-group-diagnosis">
            <header>
              <div>
                <span className="section-kicker">
                  <BarChart3 size={17} />
                  Diagnòstic tutorial del grup
                </span>
                <h2>Visió de tutor</h2>
                <p>
                  Lectura global del grup combinant competències de totes les assignatures i registres tutorials.
                </p>
              </div>
              <button className="secondary-action compact" onClick={() => setActivePanel('profile')} type="button">
                Veure perfils
              </button>
            </header>

            <div className="tutorial-group-diagnosis-grid">
              <article>
                <span>Competències no assolides</span>
                <strong>{tutorialSummary.evaluatedCount > 0 ? formatPercent(tutorialSummary.notDevelopedPercent) : '-'}</strong>
                <small>
                  {tutorialSummary.notDevelopedCount} de {tutorialSummary.evaluatedCount} competències avaluades
                </small>
              </article>
              <article>
                <span>Cobertura tutorial</span>
                <strong>{formatPercent(tutorialGroupSummary.academicCoveragePercent)}</strong>
                <small>{tutorialGroupSummary.studentsWithData} alumnes amb dades acadèmiques o de seguiment</small>
              </article>
              <article>
                <span>Àrea prioritària</span>
                <strong>{tutorialSummary.weakestArea?.name || '-'}</strong>
                <small>
                  {tutorialSummary.weakestArea
                    ? `${formatPercent(tutorialSummary.weakestArea.notDevelopedPercent)} no assolides`
                    : 'Encara no hi ha prou dades'}
                </small>
              </article>
              <article className={tutorialGroupSummary.priorityStudents.length > 0 ? 'risk' : 'ok'}>
                <span>Alumnes prioritaris</span>
                <strong>{tutorialGroupSummary.priorityStudents.length}</strong>
                <small>Rendiment baix, registres tutorials o acumulació combinada</small>
              </article>
            </div>

            {tutorialGroupSummary.priorityStudents.length > 0 ? (
              <div className="tutorial-group-priority-list">
                {tutorialGroupSummary.priorityStudents.slice(0, 6).map((item) => (
                  <button
                    className="tutorial-group-priority-row"
                    key={item.profile.student.id}
                    onClick={() => setSelectedTutorialProfileId(item.profile.student.id)}
                    type="button"
                  >
                    <div>
                      <strong>{item.profile.student.name}</strong>
                      <span>{item.reasons.slice(0, 3).join(' · ')}</span>
                    </div>
                    <em>{item.score}</em>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state compact">
                Quan hi hagi notes tutorials o registres de seguiment, aquí apareixeran els alumnes que cal mirar abans.
              </div>
            )}
          </section>

          <div className="tutorial-stats-grid">
            <TutorialGroupGradeChart summary={tutorialSummary} />
            <TutorialSubjectAverageChart subjects={tutorialSummary.subjectSummaries} />
            <TutorialStatsCard
              detail={`${tutorialSummary.notDevelopedCount} de ${tutorialSummary.evaluatedCount} competències avaluades`}
              icon={TrendingDown}
              label="Competències no assolides"
              tone={tutorialSummary.notDevelopedPercent >= 30 ? 'risk' : 'neutral'}
              value={tutorialSummary.evaluatedCount > 0 ? formatPercent(tutorialSummary.notDevelopedPercent) : '-'}
            />
            <TutorialStatsCard
              detail={
                tutorialSummary.weakestArea
                  ? `${tutorialSummary.weakestArea.notDeveloped} no assolides · mitjana ${tutorialSummary.weakestArea.averageGrade}`
                  : 'Encara no hi ha prou dades'
              }
              icon={BarChart3}
              label="Àrea amb més dificultat"
              tone="amber"
              value={tutorialSummary.weakestArea?.name || '-'}
            />
            <TutorialStatsCard
              detail="Baix assoliment o acumulació de competències no assolides"
              icon={AlertTriangle}
              label="Alumnes a mirar"
              onClick={() => setActivePanel('profile')}
              tone={tutorialSummary.riskProfiles.length > 0 ? 'risk' : 'ok'}
              value={tutorialSummary.riskProfiles.length}
            />
            <TutorialStatsCard
              detail="Competències amb alguna nota tutorial registrada"
              icon={Eye}
              label="Cobertura de dades"
              tone="blue"
              value={tutorialSummary.evaluatedCount}
            />
          </div>

          {tutorialSummary.evaluatedCount > 0 && (
            <div className="tutorial-insight-grid">
              <article className="tutoring-card compact">
                <div>
                  <Layers3 size={22} />
                  <h2>Àrees de dificultat</h2>
                </div>
                <div className="tutorial-insight-list">
                  {tutorialSummary.areaSummaries.slice(0, 4).map((area) => (
                    <div className="tutorial-insight-row" key={area.id}>
                      <strong>{area.name}</strong>
                      <span>{formatPercent(area.notDevelopedPercent)} no assolides</span>
                      <small>Mitjana {area.averageGrade}</small>
                    </div>
                  ))}
                </div>
              </article>

              <article className="tutoring-card compact">
                <div>
                  <BookOpenCheck size={22} />
                  <h2>Assignatures a revisar</h2>
                </div>
                <div className="tutorial-insight-list">
                  {tutorialSummary.subjectSummaries.slice(0, 5).map((subject) => (
                    <div className="tutorial-insight-row" key={subject.subject}>
                      <strong>{subject.subject}</strong>
                      <span>{formatPercent(subject.notDevelopedPercent)} no assolides</span>
                      <small>{subject.areaName}</small>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          )}

          <div className="tutorial-filter-bar">
            <label>
              Àrea
              <select
                onChange={(event) => {
                  setAreaFilter(event.target.value)
                  setSubjectFilter('auto')
                }}
                value={areaFilter}
              >
                <option value="all">Totes les àrees</option>
                {SUBJECT_AREAS.filter((area) => area.id !== 'tutorial').map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Assignatura
              <select onChange={(event) => setSubjectFilter(event.target.value)} value={subjectFilter}>
                <option value="auto">Assignatura vinculada o primera disponible</option>
                {subjectOptions.map((item) => (
                  <option key={item.subject} value={item.subject}>
                    {item.subject}
                  </option>
                ))}
              </select>
            </label>
            <button className="secondary-action tutorial-import-all-button" onClick={() => setShowBulkImport(true)} type="button">
              <FileSpreadsheet size={17} />
              Importar totes les matèries
            </button>
          </div>

          <div className="tutorial-subject-overview">
            {subjectOptions.map((item) => (
              <SubjectCatalogCard
                completion={subjectCompletion.get(item.subject)}
                item={item}
                key={item.subject}
                onSelect={setSubjectFilter}
              />
            ))}
          </div>

          <article className="tutorial-mark-grid-card">
            <header>
              <span className="section-kicker">
                <Layers3 size={17} />
                {selectedSubjectArea?.name || 'Àrea'}
              </span>
              <div>
                <h2>{selectedSubject || 'Assignatura'}</h2>
                <p>
                  Posa o revisa la nota de cada competència. Si aquesta classe està vinculada amb una assignatura
                  que ja té notes a Avaluapro, les competències apareixen carregades automàticament.
                </p>
                {isSelectedSubjectLinked && (
                  <div className="tutorial-linked-note">
                    <CheckCircle2 size={16} />
                    <span>
                      {linkedGradeCount > 0
                        ? `${linkedGradeCount} notes es llegeixen automàticament de ${linkedClass?.name || 'la classe vinculada'}.`
                        : `Aquesta assignatura està vinculada amb ${linkedClass?.name || 'la classe vinculada'}, però encara no hi ha notes carregades.`}
                      {' '}Si edites una cel·la aquí, quedarà guardada com a nota tutorial pròpia.
                    </span>
                  </div>
                )}
              </div>
            </header>

            {classStudents.length === 0 ? (
              <div className="empty-state compact">Afegeix alumnes a la classe vinculada per començar a posar notes.</div>
            ) : selectedCompetencies.length === 0 ? (
              <div className="empty-state compact">Aquesta assignatura encara no té competències configurades.</div>
            ) : (
              <div className="tutorial-mark-table-wrap">
                <table className="tutorial-mark-table">
                  <thead>
                    <tr>
                      <th>Alumne</th>
                      {selectedCompetencies.map((competency) => (
                        <th key={competency.key}>
                          <span>{selectedSubject}</span>
                          <strong>{competency.name}</strong>
                        </th>
                      ))}
                      <th>Resultat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.map((student) => {
                      const rowValues = selectedCompetencies.map((competency) =>
                        getTutorialCompetencyGrade({
                          classId: activeClassId,
                          competency,
                          evaluationContext,
                          studentId: student.id,
                          subject: selectedSubject,
                          tutorialMarks,
                        }),
                      )
                      const finalGrade = calculateGrade(rowValues)

                      return (
                        <tr key={student.id}>
                          <th>
                            <button
                              className="tutorial-student-link"
                              onClick={() => setSelectedTutorialProfileId(student.id)}
                              type="button"
                            >
                              <span>{student.name}</span>
                              <small>{student.halfGroup || 'Sense mig grup'}</small>
                            </button>
                          </th>
                          {selectedCompetencies.map((competency) => {
                            const gradeSource = getTutorialCompetencyGradeSource({
                              classId: activeClassId,
                              competency,
                              evaluationContext,
                              studentId: student.id,
                              subject: selectedSubject,
                              tutorialMarks,
                            })
                            const value = gradeSource.value
                            return (
                              <td key={`${student.id}_${competency.key}`}>
                                <select
                                  className={`${gradeTextClassName(value)} ${
                                    gradeSource.source === 'linked' ? 'linked-grade-select' : ''
                                  }`}
                                  data-tutorial-grade-select="true"
                                  onKeyDown={(event) => {
                                    const key = event.key.toUpperCase()
                                    const nextValue = key === 'N' ? 'NA' : key
                                    if (['A', 'B', 'C', 'D', 'NA'].includes(nextValue)) {
                                      event.preventDefault()
                                      updateTutorialMark({
                                        classId: activeClassId,
                                        studentId: student.id,
                                        subject: selectedSubject,
                                        competencyKey: competency.key,
                                        value: nextValue,
                                      })
                                      window.setTimeout(() => focusNextTutorialGradeSelect(event.currentTarget), 0)
                                    }
                                    if (event.key === 'Backspace' || event.key === 'Delete') {
                                      event.preventDefault()
                                      updateTutorialMark({
                                        classId: activeClassId,
                                        studentId: student.id,
                                        subject: selectedSubject,
                                        competencyKey: competency.key,
                                        value: '',
                                      })
                                    }
                                  }}
                                  onChange={(event) =>
                                    updateTutorialMark({
                                      classId: activeClassId,
                                      studentId: student.id,
                                      subject: selectedSubject,
                                      competencyKey: competency.key,
                                      value: event.target.value,
                                    })
                                  }
                                  title={
                                    gradeSource.source === 'linked'
                                      ? `Nota llegida de ${linkedClass?.name || 'la classe vinculada'} (${gradeSource.utName || 'última mirada'}). Pots sobreescriure-la.`
                                      : 'Nota tutorial pròpia'
                                  }
                                  value={value}
                                >
                                  {GRADE_OPTIONS.map((option) => (
                                    <option key={option} value={option}>
                                      {option || '-'}
                                    </option>
                                  ))}
                                </select>
                                {gradeSource.source === 'linked' && (
                                  <small className="tutorial-linked-ut">{gradeSource.utName || 'Última mirada'}</small>
                                )}
                              </td>
                            )
                          })}
                          <td>
                            <span className={gradeClassName(finalGrade)}>{finalGrade || '-'}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </section>
      )}

      {activePanel === 'tracking' && (
        <section className="tutorial-tracking-panel">
          <div className="tutorial-record-summary">
            {TUTORING_RECORD_TYPES.map((type) => (
              <button
                className={`tutorial-record-pill ${type.tone} ${recordForm.type === type.id ? 'active' : ''}`}
                key={type.id}
                onClick={() => setRecordForm((current) => ({ ...current, type: type.id }))}
                type="button"
              >
                <strong>{countByType(classTutorialRecords, type.id)}</strong>
                {type.label}
              </button>
            ))}
          </div>

          <div className="tutorial-tracking-grid">
            <article className="tutoring-card tutorial-record-form-card">
              <div>
                <Plus size={24} />
                <h2>Nou registre tutorial</h2>
              </div>
              <p>
                Registra notes a l’agenda, incidents o expulsions sense duplicar la classe. Tot queda vinculat al
                perfil tutorial de l’alumne.
              </p>

              <form className="tutorial-record-form" onSubmit={handleSubmitTutorialRecord}>
                <label>
                  Alumne
                  <select
                    onChange={(event) => setRecordForm((current) => ({ ...current, studentId: event.target.value }))}
                    value={recordForm.studentId}
                  >
                    <option value="">Primer alumne de la llista</option>
                    {classStudents.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Tipus
                  <select
                    className={`tutorial-record-type-select ${selectedRecordType.tone}`}
                    onChange={(event) => setRecordForm((current) => ({ ...current, type: event.target.value }))}
                    value={recordForm.type}
                  >
                    {TUTORING_RECORD_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Data
                  <input
                    onChange={(event) => setRecordForm((current) => ({ ...current, date: event.target.value }))}
                    type="date"
                    value={recordForm.date}
                  />
                </label>

                <label className="full">
                  Motiu o observació
                  <textarea
                    onChange={(event) => setRecordForm((current) => ({ ...current, note: event.target.value }))}
                    placeholder="Ex: nota a l’agenda per acumulació de tasques no fetes, incident al passadís, expulsió puntual..."
                    value={recordForm.note}
                  />
                </label>

                <button className="primary-action" disabled={classStudents.length === 0} type="submit">
                  Afegir registre
                </button>
              </form>
            </article>

            <article className="tutoring-card">
              <div>
                <UsersRound size={24} />
                <h2>Alumnes amb seguiment</h2>
              </div>
              {tutorialRecordSummary.studentsWithRecords.length === 0 ? (
                <div className="empty-state compact">Encara no hi ha registres tutorials en aquesta classe.</div>
              ) : (
                <div className="tutorial-tracking-student-list">
                  {tutorialRecordSummary.studentsWithRecords.slice(0, 12).map((row) => (
                    <button
                      className="tutorial-tracking-student-row"
                      key={row.student.id}
                      onClick={() => setSelectedTutorialRecordStudentId(row.student.id)}
                      type="button"
                    >
                      <div>
                        <strong>{row.student.name}</strong>
                        <small>{row.student.halfGroup || 'Sense mig grup'}</small>
                      </div>
                      <span>{row.agenda} agenda</span>
                      <span>{row.incident} incid.</span>
                      <span>{row.classroomExpulsion + row.centerExpulsion} exp.</span>
                    </button>
                  ))}
                </div>
              )}
            </article>
          </div>

          <article className="tutoring-card compact">
            <div>
              <CalendarDays size={22} />
              <h2>Historial recent</h2>
            </div>
            {tutorialRecordSummary.recentRecords.length === 0 ? (
              <div className="empty-state compact">Quan afegeixis registres, apareixeran aquí ordenats per data.</div>
            ) : (
              <div className="tutorial-record-history compact">
                {tutorialRecordSummary.recentRecords.map((record) => (
                  <article className={`tutorial-record-entry ${record.typeMeta.tone}`} key={record.id}>
                    <div>
                      <strong>{record.student?.name || 'Alumne no trobat'}</strong>
                      <span>
                        {record.typeMeta.label} · {formatShortDate(record.date)}
                      </span>
                      <p>{record.note || 'Sense comentari afegit.'}</p>
                    </div>
                    <button
                      className="icon-button danger subtle"
                      onClick={() => deleteTutorialRecord(record.id)}
                      title="Eliminar registre"
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </article>
                ))}
              </div>
            )}
          </article>
        </section>
      )}

      {activePanel === 'relationships' && (
        <section className="tutorial-relationships-panel">
          <section className="tutorial-relationships-hero">
            <div>
              <span className="section-kicker">
                <Network size={17} />
                Relacions del grup
              </span>
              <h2>Sociograma inicial</h2>
              <p>
                Registra afinitats, parelles que funcionen bé i incompatibilitats abans de generar grups cooperatius.
              </p>
            </div>
            <div className="tutorial-relationship-summary">
              <article className="green">
                <HeartHandshake size={19} />
                <strong>{tutorialRelationSummary.positiveCount}</strong>
                <span>relacions positives</span>
              </article>
              <article className="red">
                <UserX size={19} />
                <strong>{tutorialRelationSummary.avoidCount}</strong>
                <span>incompatibilitats</span>
              </article>
              <article>
                <UsersRound size={19} />
                <strong>{tutorialRelationSummary.isolatedStudents.length}</strong>
                <span>sense relacions</span>
              </article>
              <article>
                <Network size={19} />
                <strong>{tutorialRelationSummary.reciprocalCount}</strong>
                <span>parelles recíproques</span>
              </article>
            </div>
          </section>

          <section className="tutorial-tool-launch-grid">
            <button onClick={() => setActiveRelationshipTool('sociogram')} type="button">
              <Network size={25} />
              <strong>Sociograma</strong>
              <span>Mapa visual de relacions reals del grup.</span>
            </button>
            <button onClick={() => setActiveRelationshipTool('groups')} type="button">
              <UsersRound size={25} />
              <strong>Grups cooperatius</strong>
              <span>Proposta automàtica amb rols, notes i relacions.</span>
            </button>
            <button onClick={() => setActiveRelationshipTool('seating')} type="button">
              <LayoutGrid size={25} />
              <strong>Disposició d’aula</strong>
              <span>Matriu flexible de taules i cadires.</span>
            </button>
          </section>

          <section
            className={`tutorial-sociogram-visual-card relationship-tool-panel ${
              activeRelationshipTool === 'sociogram' ? 'active' : ''
            }`}
          >
            <header>
              <div>
                <span className="section-kicker">
                  <Network size={17} />
                  Sociograma visual
                </span>
                <h2>Mapa de relacions</h2>
                <p>
                  Clica un alumne per posar-lo al centre i veure ràpidament afinitats, incompatibilitats i alumnes sense
                  connexions registrades.
                </p>
              </div>
              <div className="tutorial-sociogram-actions">
                <button className="secondary-action compact" onClick={() => setActiveRelationshipTool('')} type="button">
                  Tornar a eines
                </button>
                <div className="tutorial-sociogram-filter-tabs" aria-label="Filtre del sociograma">
                  {SOCIOGRAM_FILTERS.map((filter) => (
                    <button
                      className={sociogramFilter === filter.id ? 'active' : ''}
                      key={filter.id}
                      onClick={() => setSociogramFilter(filter.id)}
                      type="button"
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
                <button
                  className="secondary-action compact"
                  disabled={!classTutorialSociogramLayout && Object.keys(sociogramDraftPositions).length === 0}
                  onClick={handleResetSociogramLayout}
                  type="button"
                >
                  <RotateCcw size={16} />
                  Restablir mapa
                </button>
              </div>
            </header>

            {classStudents.length === 0 ? (
              <div className="empty-state compact">Afegeix alumnes a la tutoria per veure el sociograma.</div>
            ) : (
              <div
                aria-label="Mapa visual de relacions tutorials"
                className="tutorial-sociogram-canvas"
                ref={sociogramCanvasRef}
              >
                <svg aria-hidden="true" className="tutorial-sociogram-lines" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <defs>
                    <marker id="sociogram-arrow-green" markerHeight="7" markerWidth="7" orient="auto" refX="6" refY="3.5">
                      <path d="M0,0 L7,3.5 L0,7 Z" />
                    </marker>
                    <marker id="sociogram-arrow-blue" markerHeight="7" markerWidth="7" orient="auto" refX="6" refY="3.5">
                      <path d="M0,0 L7,3.5 L0,7 Z" />
                    </marker>
                    <marker id="sociogram-arrow-red" markerHeight="7" markerWidth="7" orient="auto" refX="6" refY="3.5">
                      <path d="M0,0 L7,3.5 L0,7 Z" />
                    </marker>
                  </defs>
                  {tutorialSociogramMap.links.map((link) => (
                    <line
                      className={`tutorial-sociogram-link ${link.typeMeta.tone} ${
                        link.isSelectedLink ? 'selected' : 'muted'
                      }`}
                      key={link.id}
                      markerEnd={`url(#sociogram-arrow-${link.typeMeta.tone})`}
                      strokeWidth={1 + Number(link.strength || 2) * 0.45}
                      vectorEffect="non-scaling-stroke"
                      x1={link.source.x}
                      x2={link.target.x}
                      y1={link.source.y}
                      y2={link.target.y}
                    >
                      <title>
                        {link.source.student.name} → {link.target.student.name}: {link.typeMeta.shortLabel}
                      </title>
                    </line>
                  ))}
                </svg>
                <div className="tutorial-sociogram-node-layer">
                  {tutorialSociogramMap.nodes.map((node) => (
                    <button
                      className={`tutorial-sociogram-node ${node.isSelected ? 'selected' : ''} ${
                        node.isRelated ? 'related' : ''
                      } ${node.isDimmed ? 'dimmed' : ''} ${node.avoidCount > 0 ? 'has-avoid' : ''} ${
                        node.isStar ? 'is-star' : ''
                      } ${node.isConflict ? 'is-conflict' : ''}`}
                      key={node.id}
                      onClick={() => setSelectedRelationStudentId(node.id)}
                      onPointerCancel={(event) => handleSociogramPointerUp(event, node)}
                      onPointerDown={(event) => handleSociogramPointerDown(event, node)}
                      onPointerMove={(event) => handleSociogramPointerMove(event, node)}
                      onPointerUp={(event) => handleSociogramPointerUp(event, node)}
                      style={{ left: `${node.x}%`, top: `${node.y}%` }}
                      title={node.student.name}
                      type="button"
                    >
                      {node.student.photoUrl ? (
                        <img
                          alt=""
                          className="tutorial-sociogram-node-photo"
                          draggable="false"
                          src={node.student.photoUrl}
                        />
                      ) : (
                        <span>{node.initials}</span>
                      )}
                      <strong>{node.student.name}</strong>
                      <small>
                        {node.isStar ? 'estrella · ' : ''}
                        {node.isConflict ? 'conflictiu · ' : ''}
                        {node.supportiveCount || 0}+ · {node.avoidCount || 0} evitar
                      </small>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <footer className="tutorial-sociogram-legend">
              <span className="green">Afinitat / treballa bé</span>
              <span className="blue">Relació habitual</span>
              <span className="red">Evitar de moment</span>
              <strong>
                {tutorialSociogramMap.selectedNode?.student.name || 'Sense alumne seleccionat'} ·{' '}
                {tutorialSociogramMap.relatedCount} relació/ns visibles
              </strong>
            </footer>
          </section>

          <section
            className={`cooperative-generator-panel relationship-tool-panel ${
              activeRelationshipTool === 'groups' ? 'active' : ''
            }`}
          >
            <header>
              <div>
                <span className="section-kicker">
                  <UsersRound size={17} />
                  Grups cooperatius
                </span>
                <h2>Proposta automàtica</h2>
                <p>
                  Combina relacions, incompatibilitats, rendiment i seguiment tutorial per preparar una primera
                  proposta revisable.
                </p>
              </div>
              <div className="cooperative-generator-controls">
                <button className="secondary-action compact" onClick={() => setActiveRelationshipTool('')} type="button">
                  Tornar a eines
                </button>
                <label>
                  Mida
                  <select
                    onChange={(event) => setCooperativeGroupSize(event.target.value)}
                    value={cooperativeGroupSize}
                  >
                    <option value="2">Parelles</option>
                    <option value="3">Grups de 3</option>
                    <option value="4">Grups de 4</option>
                    <option value="5">Grups de 5</option>
                    <option value="6">Grups de 6</option>
                  </select>
                </label>
                <label>
                  Criteri
                  <select
                    onChange={(event) => setCooperativeStrategy(event.target.value)}
                    value={cooperativeStrategy}
                  >
                    {COOPERATIVE_GROUP_STRATEGIES.map((strategy) => (
                      <option key={strategy.id} value={strategy.id}>
                        {strategy.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="cooperative-toggle-control">
                  Mig grup
                  <button
                    className={prioritizeHalfGroups ? 'active' : ''}
                    onClick={() => setPrioritizeHalfGroups((current) => !current)}
                    type="button"
                  >
                    {prioritizeHalfGroups ? 'Prioritzar' : 'Permetre barreja'}
                  </button>
                </label>
                <label className="wide">
                  Nom versió
                  <input
                    onChange={(event) => setCooperativeGroupSetName(event.target.value)}
                    placeholder="Ex: Laboratori UT2"
                    value={cooperativeGroupSetName}
                  />
                </label>
                <button className="secondary-action compact" onClick={handleSaveCooperativeGroupSet} type="button">
                  <Save size={16} />
                  Guardar versió
                </button>
                <button className="secondary-action compact" onClick={handleCopyCooperativeGroups} type="button">
                  <Clipboard size={16} />
                  Copiar proposta
                </button>
              </div>
            </header>

            {selectedCooperativeGroupSet && (
              <div className="cooperative-saved-active">
                <div>
                  <strong>Veient versió guardada: {selectedCooperativeGroupSet.name}</strong>
                  <span>
                    {formatShortDate(selectedCooperativeGroupSet.createdAt?.slice(0, 10))} ·{' '}
                    {selectedCooperativeGroupSet.groups?.length || 0} grups
                  </span>
                </div>
                <button
                  className="secondary-action compact"
                  onClick={() => setSelectedCooperativeGroupSetId('')}
                  type="button"
                >
                  Tornar a proposta actual
                </button>
              </div>
            )}

            {hasRelationChangesAfterGroupSave && (
              <div className="tutorial-seating-warning">
                <AlertTriangle size={18} />
                <div>
                  <strong>Les relacions han canviat des de l’última versió de grups guardada.</strong>
                  <p>Revisa la proposta abans de reutilitzar-la perquè pot haver canviat algun criteri important.</p>
                </div>
              </div>
            )}

            {classTutorialGroupSets.length > 0 && (
              <div className="cooperative-saved-list">
                {classTutorialGroupSets.map((groupSet) => (
                  <article className={selectedCooperativeGroupSetId === groupSet.id ? 'active' : ''} key={groupSet.id}>
                    <button onClick={() => setSelectedCooperativeGroupSetId(groupSet.id)} type="button">
                      <strong>{groupSet.name}</strong>
                      <span>
                        {formatShortDate(groupSet.createdAt?.slice(0, 10))} · {groupSet.groups?.length || 0} grups ·{' '}
                        {COOPERATIVE_GROUP_STRATEGIES.find((strategy) => strategy.id === groupSet.strategy)?.label ||
                          'Equilibrat'}
                      </span>
                    </button>
                    <button
                      className="icon-button danger subtle"
                      onClick={() => handleDeleteCooperativeGroupSet(groupSet.id)}
                      title="Eliminar versió"
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </article>
                ))}
              </div>
            )}

            {classStudents.length < 2 ? (
              <div className="empty-state compact">Calen almenys dos alumnes per generar grups cooperatius.</div>
            ) : (
              <div className="cooperative-group-grid">
                {visibleCooperativeGroups.map((group) => (
                  <article
                    className={`cooperative-group-card ${group.avoidRelations.length > 0 ? 'warning' : ''}`}
                    key={group.id}
                  >
                    <header>
                      <div>
                        <span>{group.name}</span>
                        <strong>{group.members.length} alumnes</strong>
                      </div>
                      <em>{group.averageScore > 0 ? `Mitjana ${formatAverageGrade(group.averageScore)}` : 'Sense notes'}</em>
                    </header>

                    <div className="cooperative-group-members">
                      {group.members.map((member) => (
                        <div className={`cooperative-member ${member.performanceLevel}`} key={member.student.id}>
                          <strong>{member.student.name}</strong>
                          <span>
                            {member.halfGroup} · {member.performanceLevel}
                            {member.priorityScore >= 4 ? ' · prioritat' : ''}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="cooperative-group-badges">
                      <span>{group.highPerformanceCount} alt rendiment</span>
                      <span>{group.lowPerformanceCount} reforç</span>
                      <span>{group.priorityMembers.length} prioritaris</span>
                    </div>

                    {(group.supportiveRelations.length > 0 || group.avoidRelations.length > 0) && (
                      <div className="cooperative-group-evidence">
                        {group.supportiveRelations.slice(0, 3).map((relation) => (
                          <p className="positive" key={`${group.id}_${relation.label}_${relation.type}`}>
                            {relation.typeMeta.shortLabel}: {relation.label}
                          </p>
                        ))}
                        {group.avoidRelations.slice(0, 3).map((relation) => (
                          <p className="warning" key={`${group.id}_${relation.label}_${relation.type}`}>
                            Revisar: {relation.label}
                          </p>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section
            className={`tutorial-seating-planner-panel relationship-tool-panel ${
              activeRelationshipTool === 'seating' ? 'active' : ''
            }`}
          >
            <header>
              <div>
                <span className="section-kicker">
                  <LayoutGrid size={17} />
                  Disposició d’aula
                </span>
                <h2>Proposta de llocs</h2>
                <p>Matriu editable amb mig grup, relacions i llocs fixats.</p>
              </div>
              <div className="tutorial-seating-controls">
                <button className="secondary-action compact" onClick={() => setActiveRelationshipTool('')} type="button">
                  Tornar a eines
                </button>
                <label className="cooperative-toggle-control">
                  Mig grup
                  <button
                    className={seatingPrioritizeHalfGroups ? 'active' : ''}
                    onClick={() => setSeatingPrioritizeHalfGroups((current) => !current)}
                    type="button"
                  >
                    {seatingPrioritizeHalfGroups ? 'Prioritzar' : 'Permetre barreja'}
                  </button>
                </label>
                <button
                  className="secondary-action compact"
                  onClick={() => {
                    setSelectedSeatingPlanId('')
                    setSeatingVariant((current) => current + 1)
                  }}
                  type="button"
                >
                  <Shuffle size={16} />
                  Canviar proposta
                </button>
                <button className="secondary-action compact" onClick={resetSeatingManualChanges} type="button">
                  <RotateCcw size={16} />
                  Netejar canvis
                </button>
                <button className="secondary-action compact" onClick={handleSaveTutorialSeatingPlan} type="button">
                  <Save size={16} />
                  Guardar disposició
                </button>
              </div>
            </header>

            <div className="tutorial-seating-matrix-help compact">
              <article className="tutorial-seating-capacity">
                <strong>Capacitat activa</strong>
                <div>
                  <span>
                    {seatingCapacity}/{classStudents.length} llocs
                  </span>
                </div>
              </article>
              <article>
                <strong>Matriu 9 x 5</strong>
                <p>Clica espais buits per crear o eliminar taules.</p>
              </article>
              <article>
                <strong>Moure alumnes</strong>
                <p>Arrossega per intercanviar. El candau fixa el lloc.</p>
              </article>
            </div>

            {(generatedSeatingPlan.warnings.length > 0 || hasRelationChangesAfterSeatingSave) && (
              <div className="tutorial-seating-warning">
                <AlertTriangle size={18} />
                <div>
                  <strong>No es poden respectar tots els criteris amb aquesta matriu.</strong>
                  {hasRelationChangesAfterSeatingSave && (
                    <p>Les relacions han canviat des de l’última disposició guardada. Revisa-la o genera’n una de nova.</p>
                  )}
                  {generatedSeatingPlan.warnings.slice(0, 3).map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              </div>
            )}

            {classTutorialSeatingPlans.length > 0 && (
              <div className="tutorial-seating-saved-list">
                {classTutorialSeatingPlans.slice(0, 5).map((plan) => (
                  <button
                    className={selectedSeatingPlanId === plan.id ? 'active' : ''}
                    key={plan.id}
                    onClick={() => setSelectedSeatingPlanId(plan.id)}
                    type="button"
                  >
                    <strong>{plan.title || 'Disposició guardada'}</strong>
                    <span>{formatShortDate(plan.updatedAt?.slice(0, 10))}</span>
                  </button>
                ))}
                {selectedSeatingPlan && (
                  <button className="secondary-action compact" onClick={() => setSelectedSeatingPlanId('')} type="button">
                    Tornar a proposta actual
                  </button>
                )}
              </div>
            )}

            {generatedSeatingPlan.unplacedProfiles.length > 0 && !selectedSeatingPlan && (
              <div className="tutorial-seating-pending-list">
                <strong>Alumnes pendents de col·locar</strong>
                <div>
                  {generatedSeatingPlan.unplacedProfiles.map((profile) => (
                    <button
                      draggable
                      key={profile.student.id}
                      onDragStart={(event) => handleSeatingPendingDragStart(event, profile.student.id)}
                      type="button"
                    >
                      {profile.student.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="tutorial-seating-board-grid">
              {visibleSeatingPlan.seats.map((seat) => {
                const placement = visibleSeatingPlan.placements.find((item) => item.seat.id === seat.id)
                const isManualEmpty = seatingManualEmptySeatIds.includes(seat.id)
                const isLocked = Boolean(placement?.isLocked || seatingLockedStudentIds.includes(placement?.studentId))
                return (
                  <div
                    className={`tutorial-seat-card ${seat.enabled ? 'active-table' : 'disabled'} ${
                      placement?.isStar ? 'star' : ''
                    } ${placement?.isConflict ? 'conflict' : ''} ${
                      placement ? getHalfGroupClassName(placement.halfGroup) : ''
                    } ${seatingProblemSeats[placement?.studentId] === placement?.seat?.id ? 'problem' : ''} ${
                      isLocked ? 'locked' : ''
                    } ${
                      draggingSeatingStudentId ? 'drop-ready' : ''
                    }`}
                    draggable={Boolean(placement && !selectedSeatingPlan && !isLocked)}
                    key={seat.id}
                    onClick={() => toggleSeatingGridSeat(seat, placement)}
                    onDragEnd={() => setDraggingSeatingStudentId('')}
                    onDragOver={(event) => {
                      if (seat.enabled && !selectedSeatingPlan) event.preventDefault()
                    }}
                    onDragStart={(event) => handleSeatingDragStart(event, placement)}
                    onDrop={(event) => handleSeatingDrop(event, seat, placement)}
                    role="button"
                    tabIndex={0}
                    title={
                      placement
                        ? isLocked
                          ? 'Aquest alumne està fixat en aquest lloc.'
                          : 'Clica per deixar aquesta taula buida. Arrossega per intercanviar lloc.'
                        : seat.enabled
                          ? 'Clica per deixar aquest espai buit.'
                          : 'Clica per crear una taula.'
                    }
                  >
                    {!seat.enabled ? (
                      <span className="empty">Espai</span>
                    ) : placement ? (
                      <>
                        <div className="tutorial-seat-student-media">
                          {placement.student.student.photoUrl ? (
                            <img alt="" draggable="false" src={placement.student.student.photoUrl} />
                          ) : (
                            <span>{getSociogramInitials(placement.student.student.name)}</span>
                          )}
                        </div>
                        <div className="tutorial-seat-student-copy">
                          <strong>
                            {placement.student.student.name}
                            {placement.isStar ? <Star size={14} /> : null}
                            {placement.isConflict ? <i aria-label="conflictiu" /> : null}
                          </strong>
                          <small>
                            {placement.halfGroup}
                            {seatingProblemSeats[placement.studentId] === placement.seat.id
                              ? ' · revisar lloc'
                              : ''}
                          </small>
                        </div>
                        {!selectedSeatingPlan && (
                          <div className="tutorial-seat-actions">
                            <button
                              className={`tutorial-seat-lock-button ${isLocked ? 'active' : ''}`}
                              onClick={(event) => {
                                event.stopPropagation()
                                toggleSeatingLockedStudent(placement)
                              }}
                              title={isLocked ? 'Desfixar aquest lloc' : 'Fixar aquest alumne en aquest lloc'}
                              type="button"
                            >
                              <Lock size={13} />
                            </button>
                            <button
                              className="tutorial-seat-problem-button"
                              onClick={(event) => {
                                event.stopPropagation()
                                toggleSeatingProblemSeat(placement)
                              }}
                              type="button"
                            >
                              Revisar
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="empty">{isManualEmpty ? 'Buida' : 'Taula lliure'}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          <div className="tutorial-relationships-grid">
            <article className="tutoring-card tutorial-relation-form-card">
              <div>
                <Plus size={24} />
                <h2>Registrar relació</h2>
              </div>
              <form className="tutorial-relation-form" onSubmit={handleSubmitTutorialRelation}>
                <label>
                  Alumne origen
                  <div className="tutorial-relation-picker">
                    <Search size={16} />
                    <input
                      list="tutorial-source-students"
                      onChange={(event) => handleRelationSearchChange('source', event.target.value)}
                      placeholder="Escriu el nom..."
                      value={relationSearch.source}
                    />
                    <select
                      onChange={(event) => {
                        const student = classStudents.find((item) => item.id === event.target.value)
                        setRelationForm((current) => ({ ...current, sourceStudentId: event.target.value }))
                        setRelationSearch((current) => ({ ...current, source: student?.name || '' }))
                      }}
                      value={relationForm.sourceStudentId}
                    >
                      <option value="">Primer alumne de la llista</option>
                      {classStudents.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>

                <label>
                  Alumne relacionat
                  <div className="tutorial-relation-picker">
                    <Search size={16} />
                    <input
                      list="tutorial-target-students"
                      onChange={(event) => handleRelationSearchChange('target', event.target.value)}
                      placeholder="Escriu el nom..."
                      value={relationSearch.target}
                    />
                    <select
                      onChange={(event) => {
                        const student = classStudents.find((item) => item.id === event.target.value)
                        setRelationForm((current) => ({ ...current, targetStudentId: event.target.value }))
                        setRelationSearch((current) => ({ ...current, target: student?.name || '' }))
                      }}
                      value={relationForm.targetStudentId}
                    >
                      <option value="">Tria un alumne</option>
                      {classStudents
                        .filter((student) => student.id !== relationForm.sourceStudentId)
                        .map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </label>
                <datalist id="tutorial-source-students">
                  {classStudents.map((student) => (
                    <option key={student.id} value={student.name} />
                  ))}
                </datalist>
                <datalist id="tutorial-target-students">
                  {classStudents
                    .filter((student) => student.id !== relationForm.sourceStudentId)
                    .map((student) => (
                      <option key={student.id} value={student.name} />
                    ))}
                </datalist>

                <fieldset className="tutorial-relation-type-grid">
                  <legend>Tipus</legend>
                  {TUTORING_RELATION_TYPES.map((type) => (
                    <button
                      className={`tutorial-relation-type-button ${type.tone} ${
                        relationForm.type === type.id ? 'active' : ''
                      }`}
                      key={type.id}
                      onClick={() => setRelationForm((current) => ({ ...current, type: type.id }))}
                      type="button"
                    >
                      {type.shortLabel}
                    </button>
                  ))}
                </fieldset>

                <label>
                  Intensitat
                  <select
                    onChange={(event) => setRelationForm((current) => ({ ...current, strength: event.target.value }))}
                    value={relationForm.strength}
                  >
                    <option value="1">Baixa</option>
                    <option value="2">Mitjana</option>
                    <option value="3">Alta</option>
                  </select>
                </label>

                <label className="full">
                  Nota breu
                  <textarea
                    onChange={(event) => setRelationForm((current) => ({ ...current, note: event.target.value }))}
                    placeholder="Ex: treballen bé en tasques obertes, cal evitar-los en exàmens cooperatius..."
                    value={relationForm.note}
                  />
                </label>

                <button className="primary-action" disabled={classStudents.length < 2} type="submit">
                  Guardar relació
                </button>
              </form>
            </article>

            <article className="tutoring-card tutorial-sociogram-card">
              <div>
                <Network size={24} />
                <h2>Mapa ràpid del grup</h2>
              </div>
              {classStudents.length === 0 ? (
                <div className="empty-state compact">Afegeix alumnes a la tutoria per començar el sociograma.</div>
              ) : (
                <div className="tutorial-sociogram-list">
                  {tutorialRelationSummary.studentRows.map((row) => {
                    const isSelected = row.student.id === selectedRelationRow?.student.id
                    const roleRow = tutorialRoleRowsByStudent.get(row.student.id)
                    return (
                      <article
                        className={`tutorial-sociogram-row ${isSelected ? 'active' : ''}`}
                        key={row.student.id}
                      >
                        <button
                          className="tutorial-sociogram-row-main"
                          onClick={() => setSelectedRelationStudentId(row.student.id)}
                          type="button"
                        >
                          <div>
                            <strong>{row.student.name}</strong>
                            <small>{row.student.halfGroup || 'Sense mig grup'}</small>
                          </div>
                          <span className="green">{row.supportiveCount} positives</span>
                          <span className="red">{row.avoidCount} evitar</span>
                          <span>{row.total} total</span>
                        </button>
                        <div className="tutorial-role-actions">
                          <button
                            className={roleRow?.star ? 'active star' : ''}
                            onClick={() =>
                              toggleTutorialStudentRole({ classId: activeClassId, role: 'star', studentId: row.student.id })
                            }
                            type="button"
                          >
                            <Star size={15} />
                            Estrella
                          </button>
                          <button
                            className={roleRow?.conflict ? 'active conflict' : ''}
                            onClick={() =>
                              toggleTutorialStudentRole({
                                classId: activeClassId,
                                role: 'conflict',
                                studentId: row.student.id,
                              })
                            }
                            type="button"
                          >
                            <ShieldAlert size={15} />
                            Conflictiu
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </article>
          </div>

          <div className="tutorial-relationships-grid detail">
            <article className="tutoring-card tutorial-student-relation-search">
              <div>
                <Search size={24} />
                <h2>Cercador per alumne</h2>
              </div>
              <label>
                Alumne
                <div className="tutorial-relation-picker">
                  <Search size={16} />
                  <input
                    list="tutorial-summary-students"
                    onChange={(event) => {
                      const matchedStudent = findStudentBySearch(classStudents, event.target.value)
                      if (matchedStudent) setSelectedRelationStudentId(matchedStudent.id)
                    }}
                    placeholder="Escriu el nom..."
                  />
                  <select
                    onChange={(event) => setSelectedRelationStudentId(event.target.value)}
                    value={selectedRelationRow?.student.id || ''}
                  >
                    {classStudents.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
              <datalist id="tutorial-summary-students">
                {classStudents.map((student) => (
                  <option key={student.id} value={student.name} />
                ))}
              </datalist>
            </article>

            <article className="tutoring-card tutorial-student-relation-card">
              <button
                onClick={() => {
                  setActiveRelationshipTool('sociogram')
                }}
                type="button"
              >
                <Network size={24} />
                <strong>Sociograma centrat</strong>
                <span>{selectedRelationRow?.student.name || 'Selecciona un alumne'}</span>
              </button>
            </article>

            <article className="tutoring-card tutorial-student-relation-card">
              <button onClick={() => setActiveRelationshipTool('groups')} type="button">
                <UsersRound size={24} />
                <strong>Grup cooperatiu</strong>
                <span>
                  {visibleCooperativeGroups.find((group) =>
                    group.members.some((member) => member.student.id === selectedRelationRow?.student.id),
                  )?.name || 'Encara no assignat'}
                </span>
              </button>
            </article>

            <article className="tutoring-card tutorial-student-relations-log">
              <div>
                <ClipboardList size={24} />
                <h2>Relacions i comentaris</h2>
              </div>
              {!selectedRelationRow ? (
                <div className="empty-state compact">Selecciona un alumne per veure’n les relacions.</div>
              ) : selectedRelationRow.total === 0 ? (
                <div className="empty-state compact">Aquest alumne encara no té relacions registrades.</div>
              ) : (
                <div className="tutorial-relation-pills">
                  {[...selectedRelationRow.outgoing, ...selectedRelationRow.incoming].map((relation) => {
                    const typeMeta = getRelationTypeMeta(relation.type)
                    const isOutgoing = relation.sourceStudentId === selectedRelationRow.student.id
                    const otherStudent = classStudents.find(
                      (student) => student.id === (isOutgoing ? relation.targetStudentId : relation.sourceStudentId),
                    )
                    return (
                      <article className={`tutorial-relation-pill ${typeMeta.tone}`} key={relation.id}>
                        <strong>
                          {isOutgoing ? 'Cap a' : 'Rep de'} {otherStudent?.name || 'Alumne no trobat'}
                        </strong>
                        <span>
                          {typeMeta.shortLabel} · intensitat {relation.strength || 2}
                        </span>
                        {relation.note && <p>{relation.note}</p>}
                      </article>
                    )
                  })}
                </div>
              )}
            </article>
          </div>
        </section>
      )}

      {activePanel === 'profile' && (
        <section className="tutorial-profile-panel">
          <article className="tutoring-card">
            <div>
              <UsersRound size={24} />
              <h2>Perfils tutorials</h2>
            </div>
            <p>
              Consulta el resum de cada alumne amb competències no assolides, àrees delicades i evidències
              preparades per al futur PDF.
            </p>
            <div className="tutorial-profile-filter-tabs" aria-label="Filtre de perfils tutorials">
              <button
                className={profileFilter === 'priority' ? 'active' : ''}
                onClick={() => setProfileFilter('priority')}
                type="button"
              >
                Prioritaris
              </button>
              <button
                className={profileFilter === 'not-developed' ? 'active' : ''}
                onClick={() => setProfileFilter('not-developed')}
                type="button"
              >
                No assolides
              </button>
              <button
                className={profileFilter === 'tracking' ? 'active' : ''}
                onClick={() => setProfileFilter('tracking')}
                type="button"
              >
                Seguiment
              </button>
              <button
                className={profileFilter === 'all' ? 'active' : ''}
                onClick={() => setProfileFilter('all')}
                type="button"
              >
                Tots
              </button>
            </div>
            {tutorialSummary.studentProfiles.length === 0 ? (
              <div className="empty-state compact">Afegeix alumnes per començar a preparar perfils tutorials.</div>
            ) : filteredTutorialProfiles.length === 0 ? (
              <div className="empty-state compact">Aquest filtre no té cap alumne ara mateix.</div>
            ) : (
              <div className="tutorial-student-profile-list">
                {filteredTutorialProfiles.map((profile) => {
                  const recordRow = tutorialRecordRowsByStudent.get(profile.student.id)
                  const trackingCount = recordRow?.total || 0
                  const priority = getTutorialProfilePriority(profile, recordRow)
                  return (
                    <button
                      className={`tutorial-student-profile-row ${
                        priority > 0 ? 'risk' : ''
                      }`}
                      key={profile.student.id}
                      onClick={() => setSelectedTutorialProfileId(profile.student.id)}
                      type="button"
                    >
                      <div>
                        <strong>{profile.student.name}</strong>
                        <small>
                          {profile.weakestArea?.name || 'Sense àrea delicada detectada'} · {trackingCount} registre/s
                        </small>
                      </div>
                      <span>{priority > 0 ? `P${priority}` : 'OK'}</span>
                      <span>{profile.evaluatedCount} comp.</span>
                      <span>{profile.notDevelopedCount} no assolides</span>
                      <span>{recordRow?.agenda || 0} agenda</span>
                      <em>{profile.evaluatedCount > 0 ? formatPercent(profile.notDevelopedPercent) : '-'}</em>
                    </button>
                  )
                })}
              </div>
            )}
          </article>

          <article className="tutoring-card muted tutorial-profile-pdf-card">
            <div>
              <FileDown size={24} />
              <h2>PDF de tutoria</h2>
            </div>
            <p>
              Obre el perfil d’un alumne per revisar rendiment, registres tutorials i evidències. Des d’allà
              pots imprimir-lo o desar-lo com a PDF.
            </p>
            <div className="tutorial-profile-pdf-stats">
              <span>
                <strong>{tutorialSummary.studentProfiles.length}</strong>
                perfils
              </span>
              <span>
                <strong>{tutorialRecordSummary.studentsWithRecords.length}</strong>
                amb seguiment
              </span>
            </div>
            <button
              className="secondary-action"
              disabled={tutorialSummary.studentProfiles.length === 0}
              onClick={() => setSelectedTutorialProfileId(tutorialSummary.studentProfiles[0]?.student.id || '')}
              type="button"
            >
              Obrir primer perfil
            </button>
          </article>
        </section>
      )}

      {selectedTutorialProfile && (
        <TutorialStudentProfileModal
          classLabel={activeClass?.name}
          onClose={() => setSelectedTutorialProfileId('')}
          onDeleteRecord={deleteTutorialRecord}
          profile={selectedTutorialProfile}
          recordRow={tutorialRecordRowsByStudent.get(selectedTutorialProfile.student.id)}
        />
      )}

      {selectedTutorialRecordRow && (
        <TutorialRecordStudentModal
          onClose={() => setSelectedTutorialRecordStudentId('')}
          onDelete={deleteTutorialRecord}
          row={selectedTutorialRecordRow}
        />
      )}
      {showBulkImport && (
        <TutoringBulkImportModal
          activeClass={activeClass}
          classId={activeClassId}
          columns={bulkImportColumns}
          evaluationContext={evaluationContext}
          onClose={() => setShowBulkImport(false)}
          onSave={importTutorialMarks}
          students={classStudents}
          tutorialMarks={tutorialMarks}
        />
      )}
    </section>
  )
}
