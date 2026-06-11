import { SUBJECT_STRUCTURES } from '../data/subjects'
import { getStudentInterventionInsight, getStudentTrackingStats } from './analytics'
import { calculateGrade } from './grades'

export const TEACHER_GRADE_PACKAGE_SCHEMA = 'avaluapro.teacher-grade-package'
export const TEACHER_GRADE_PACKAGE_VERSION = 1
export const TEACHER_GRADE_PACKAGE_SOFT_LIMIT_BYTES = 750_000

const MATCH_SCORE = {
  exact: 100,
  strong: 88,
  partial: 70,
}

const VALID_PACKAGE_GRADES = new Set(['A', 'B', 'C', 'D', 'NA'])

function createPackageId() {
  if (crypto.randomUUID) return `teacher_package_${crypto.randomUUID()}`
  return `teacher_package_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

export function normalizeStudentNameForMatch(name = '') {
  return String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/[,;:.()[\]{}_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleUpperCase('ca')
}

function getStudentTokens(name = '') {
  return normalizeStudentNameForMatch(name).split(' ').filter(Boolean)
}

function getMainNameParts(name = '') {
  const [surnames = '', firstName = ''] = String(name).split(',')
  return {
    firstNameTokens: getStudentTokens(firstName),
    surnameTokens: getStudentTokens(surnames),
    tokens: getStudentTokens(name),
  }
}

function getStudentMatch(sourceStudent, targetStudent) {
  const sourceName = sourceStudent.normalizedName || normalizeStudentNameForMatch(sourceStudent.name)
  const targetName = normalizeStudentNameForMatch(targetStudent.name)
  if (sourceName && sourceName === targetName) {
    return { reason: 'Coincidència exacta de nom', score: MATCH_SCORE.exact, status: 'exact' }
  }

  const sourceParts = getMainNameParts(sourceStudent.name)
  const targetParts = getMainNameParts(targetStudent.name)
  const sourceSurnameStart = sourceParts.surnameTokens.slice(0, 2).join(' ')
  const targetSurnameStart = targetParts.surnameTokens.slice(0, 2).join(' ')
  const sourceFirstName = sourceParts.firstNameTokens[0]
  const targetFirstName = targetParts.firstNameTokens[0]

  if (sourceSurnameStart && sourceSurnameStart === targetSurnameStart && sourceFirstName === targetFirstName) {
    return { reason: 'Mateix nom i cognoms principals', score: MATCH_SCORE.strong, status: 'strong' }
  }

  const sourceTokenSet = new Set(sourceParts.tokens)
  const sharedTokens = targetParts.tokens.filter((token) => sourceTokenSet.has(token))
  const sharedRatio = sharedTokens.length / Math.max(1, Math.min(sourceParts.tokens.length, targetParts.tokens.length))
  if (sharedTokens.length >= 2 && sharedRatio >= 0.5) {
    return { reason: 'Coincidència parcial de tokens del nom', score: MATCH_SCORE.partial, status: 'partial' }
  }

  return { reason: 'Sense coincidència fiable', score: 0, status: 'missing' }
}

function getManualStudentMatch(sourceStudent, targetStudents = [], manualMatches = {}) {
  const manualTargetStudentId = manualMatches[sourceStudent.sourceStudentId]
  if (manualTargetStudentId === '__skip__') {
    return {
      reason: 'El tutor ha decidit no importar aquest alumne.',
      score: 0,
      status: 'skipped',
      targetStudent: null,
    }
  }

  if (!manualTargetStudentId) return null

  const targetStudent = targetStudents.find((student) => student.id === manualTargetStudentId)
  if (!targetStudent) return null

  return {
    reason: 'Coincidència assignada manualment pel tutor.',
    score: MATCH_SCORE.exact,
    status: 'manual',
    targetStudent,
  }
}

export function findBestStudentMatch(sourceStudent, targetStudents = []) {
  const matches = targetStudents
    .map((targetStudent) => ({
      ...getStudentMatch(sourceStudent, targetStudent),
      targetStudent,
    }))
    .sort((a, b) => b.score - a.score || a.targetStudent.name.localeCompare(b.targetStudent.name, 'ca'))

  const bestMatch = matches[0]
  if (!bestMatch || bestMatch.score < MATCH_SCORE.partial) {
    return {
      reason: 'No s’ha trobat cap alumne equivalent a la classe de tutoria.',
      score: 0,
      status: 'missing',
      targetStudent: null,
    }
  }

  return bestMatch
}

function getClassUts(state, classId) {
  const classSemesters = state.semesters
    .filter((semester) => semester.classId === classId)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
  const semesterOrderById = new Map(classSemesters.map((semester, index) => [semester.id, semester.order || index + 1]))

  return state.uts
    .filter((ut) => ut.classId === classId)
    .sort(
      (a, b) =>
        (semesterOrderById.get(a.semesterId) || 0) - (semesterOrderById.get(b.semesterId) || 0) ||
        (a.order || 0) - (b.order || 0) ||
        a.name.localeCompare(b.name, 'ca'),
    )
}

function isSameCompetencyName(firstName = '', secondName = '') {
  const firstCode = String(firstName).split(':')[0]?.trim()
  const secondCode = String(secondName).split(':')[0]?.trim()
  if (firstCode && secondCode && firstCode === secondCode) return true
  return String(firstName).trim() === String(secondName).trim()
}

function buildTutorialCompetencyKey(subject, competencyIndex) {
  return `${subject}__c${competencyIndex + 1}`
}

export function getLatestEvaluationCompetencyGrade({ classId, competencyName, state, studentId }) {
  if (!classId || !competencyName || !studentId) return null

  const classUts = getClassUts(state, classId)
  const utOrderById = new Map(classUts.map((ut, index) => [ut.id, index]))
  const utsById = new Map(classUts.map((ut) => [ut.id, ut]))
  const matchingCompetencies = state.competencies
    .filter((competency) => utOrderById.has(competency.utId) && isSameCompetencyName(competency.name, competencyName))
    .sort((a, b) => (utOrderById.get(b.utId) || 0) - (utOrderById.get(a.utId) || 0))

  for (const competency of matchingCompetencies) {
    const modifiedMark = state.marks.find(
      (mark) =>
        mark.type === 'competency-modification' &&
        mark.studentId === studentId &&
        mark.competencyId === competency.id,
    )
    const competencyCriteria = state.criteria.filter((criterion) => criterion.competencyId === competency.id)
    const criterionGrades = competencyCriteria
      .map((criterion) =>
        state.marks.find((mark) => mark.studentId === studentId && mark.criterionId === criterion.id)?.value,
      )
      .filter(Boolean)
    const grade = calculateGrade(criterionGrades)
    if (grade || modifiedMark) {
      const sourceUt = utsById.get(competency.utId)
      return {
        competencyId: competency.id,
        grade: grade || 'D',
        modified: Boolean(modifiedMark),
        sourceUtId: sourceUt?.id || competency.utId,
        sourceUtName: sourceUt?.name || 'UT anterior',
        sourceUtOrder: utOrderById.get(competency.utId) ?? 0,
      }
    }
  }

  return null
}

export function buildTeacherGradePackage({ classId, sender = {}, state }) {
  const sourceClass = state.classes.find((classItem) => classItem.id === classId)
  const subject = sourceClass?.subject
  const structure = SUBJECT_STRUCTURES[subject] || []
  if (!sourceClass || !subject || structure.length === 0) {
    throw new Error('Aquesta classe no té una matèria amb competències configurades per enviar notes.')
  }

  const sourceStudents = state.students
    .filter((student) => student.classId === classId)
    .sort((a, b) => a.name.localeCompare(b.name, 'ca'))
  const sourceTasks = state.tasks.filter((task) => task.classId === classId)
  const createdAt = new Date().toISOString()
  let gradeCount = 0
  let emptyCount = 0

  const students = sourceStudents.map((student) => {
    const trackingStats = getStudentTrackingStats(student.id, state.taskRecords, sourceTasks)
    const trackingInsight = getStudentInterventionInsight(student, state.taskRecords, sourceTasks, state.behaviorEvents)
    const competencies = structure.map((competency, competencyIndex) => {
      const latestGrade = getLatestEvaluationCompetencyGrade({
        classId,
        competencyName: competency.name,
        state,
        studentId: student.id,
      })
      if (latestGrade?.grade) gradeCount += 1
      else emptyCount += 1

      return {
        competencyIndex,
        competencyKey: buildTutorialCompetencyKey(subject, competencyIndex),
        competencyName: competency.name,
        grade: latestGrade?.grade || '',
        modified: Boolean(latestGrade?.modified),
        sourceCompetencyId: latestGrade?.competencyId || null,
        sourceUtId: latestGrade?.sourceUtId || null,
        sourceUtName: latestGrade?.sourceUtName || '',
        sourceUtOrder: latestGrade?.sourceUtOrder ?? null,
      }
    })

    return {
      halfGroup: student.halfGroup || '',
      name: student.name,
      normalizedName: normalizeStudentNameForMatch(student.name),
      sourceStudentId: student.id,
      trackingSummary: {
        consistency: trackingStats.consistency,
        done: trackingStats.done,
        exempt: trackingStats.exempt,
        hasTrackingData: trackingStats.hasTrackingData,
        late: trackingStats.late,
        missing: trackingStats.missing,
        profile: trackingInsight.label,
        profileLevel: trackingInsight.level,
        redPointCount: trackingInsight.redPointCount,
        total: trackingStats.total,
      },
      competencies,
    }
  })

  return {
    createdAt,
    id: createPackageId(),
    schema: TEACHER_GRADE_PACKAGE_SCHEMA,
    sender: {
      email: sender.email || '',
      name: sender.name || '',
      uid: sender.uid || '',
    },
    source: {
      classId: sourceClass.id,
      className: sourceClass.name,
      subject,
    },
    students,
    summary: {
      competencyCount: structure.length,
      emptyCount,
      gradeCount,
      studentCount: sourceStudents.length,
      trackingStudentCount: students.filter((student) => student.trackingSummary?.hasTrackingData).length,
    },
    version: TEACHER_GRADE_PACKAGE_VERSION,
  }
}

export function validateTeacherGradePackage(packageData) {
  if (!packageData || typeof packageData !== 'object') {
    throw new Error('El paquet de notes no és vàlid.')
  }
  if (packageData.schema !== TEACHER_GRADE_PACKAGE_SCHEMA) {
    throw new Error('Aquest fitxer no sembla un paquet de notes entre docents d’Avaluapro.')
  }
  if (packageData.version !== TEACHER_GRADE_PACKAGE_VERSION) {
    throw new Error('Aquest paquet de notes és d’una versió no compatible.')
  }
  if (!packageData.source?.subject || !Array.isArray(packageData.students)) {
    throw new Error('El paquet de notes no conté la matèria o la llista d’alumnes correctament.')
  }

  return packageData
}

export function previewTeacherGradePackage({ manualMatches = {}, packageData, targetStudents = [] }) {
  const cleanPackage = validateTeacherGradePackage(packageData)
  const rows = cleanPackage.students.map((sourceStudent) => {
    const match = getManualStudentMatch(sourceStudent, targetStudents, manualMatches) || findBestStudentMatch(sourceStudent, targetStudents)
    const gradedCompetencies = sourceStudent.competencies.filter((competency) =>
      VALID_PACKAGE_GRADES.has(competency.grade),
    )

    return {
      gradedCompetencies,
      matchReason: match.reason,
      matchScore: match.score,
      sourceStudent,
      status: match.status,
      targetStudent: match.targetStudent,
    }
  })

  return {
    packageData: cleanPackage,
    rows,
    summary: {
      exactMatches: rows.filter((row) => row.status === 'exact').length,
      importableGrades: rows.reduce((total, row) => total + (row.targetStudent ? row.gradedCompetencies.length : 0), 0),
      missingMatches: rows.filter((row) => row.status === 'missing').length,
      manualMatches: rows.filter((row) => row.status === 'manual').length,
      partialMatches: rows.filter((row) => row.status === 'partial' || row.status === 'strong').length,
      skippedMatches: rows.filter((row) => row.status === 'skipped').length,
      studentCount: rows.length,
    },
  }
}

export function estimateTeacherGradePackageSize(packageData) {
  return new Blob([JSON.stringify(packageData || {})]).size
}

export function getDuplicateTargetStudentMatches(rows = []) {
  const rowsByTargetStudentId = new Map()

  rows.forEach((row) => {
    if (!row.targetStudent?.id) return
    const currentRows = rowsByTargetStudentId.get(row.targetStudent.id) || []
    rowsByTargetStudentId.set(row.targetStudent.id, [...currentRows, row])
  })

  return [...rowsByTargetStudentId.entries()]
    .filter(([, matchedRows]) => matchedRows.length > 1)
    .map(([targetStudentId, matchedRows]) => ({
      targetStudentId,
      targetStudentName: matchedRows[0]?.targetStudent?.name || 'Alumne desconegut',
      sourceStudentNames: matchedRows.map((row) => row.sourceStudent.name),
    }))
}

export function getTutorialMarkUpdatesFromTeacherPackage({ manualMatches = {}, packageData, targetClassId, targetStudents = [] }) {
  const preview = previewTeacherGradePackage({ manualMatches, packageData, targetStudents })
  const subject = preview.packageData.source.subject

  return preview.rows.flatMap((row) => {
    if (!row.targetStudent) return []

    return row.gradedCompetencies.map((competency) => ({
      classId: targetClassId,
      competencyKey: competency.competencyKey,
      modified: Boolean(competency.modified),
      source: {
        packageId: preview.packageData.id,
        sourceClassId: preview.packageData.source.classId,
        sourceClassName: preview.packageData.source.className,
        sourceStudentId: row.sourceStudent.sourceStudentId,
        sourceUtId: competency.sourceUtId,
        sourceUtName: competency.sourceUtName,
        trackingSummary: row.sourceStudent.trackingSummary || null,
        modified: Boolean(competency.modified),
      },
      studentId: row.targetStudent.id,
      subject,
      value: competency.grade,
    }))
  })
}
