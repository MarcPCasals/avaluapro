import { buildStudentProfiles } from './analytics.js'
import { getNumericFromGrade } from './grades.js'

const ALIAS_PREFIX = 'Student'
const MAX_FOCUS_STUDENTS = 8

const EXCLUDED_FROM_AI_PACKAGE = [
  'student names',
  'surnames',
  'email addresses',
  'photos',
  'diagnosis labels',
  'family information',
  'raw free-text observations',
  'local identity map',
]

function safeArray(value) {
  return Array.isArray(value) ? value : []
}

function getAlias(index) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (index < alphabet.length) return `${ALIAS_PREFIX} ${alphabet[index]}`
  return `${ALIAS_PREFIX} ${Math.floor(index / alphabet.length)}${alphabet[index % alphabet.length]}`
}

function roundMetric(value) {
  if (!Number.isFinite(value)) return null
  return Number(value.toFixed(2))
}

function getAverage(values, { includeZero = false } = {}) {
  const numbers = values.filter((value) => Number.isFinite(value) && (includeZero || value > 0))
  if (numbers.length === 0) return null
  return roundMetric(numbers.reduce((sum, value) => sum + value, 0) / numbers.length)
}

function getActiveClass(state) {
  return safeArray(state.classes).find((classItem) => classItem.id === state.ui?.activeClassId) || null
}

function getActiveUt(state) {
  return safeArray(state.uts).find((ut) => ut.id === state.ui?.activeUtId) || null
}

function getClassStudents(state, classId) {
  return safeArray(state.students)
    .filter((student) => student.classId === classId)
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ca', { numeric: true }))
}

function buildAliasMap(students) {
  return new Map(students.map((student, index) => [student.id, getAlias(index)]))
}

function getGradeDistribution(profiles) {
  const distribution = { A: 0, B: 0, C: 0, D: 0, noEvidence: 0 }

  profiles.forEach((profile) => {
    const grade = profile.evaluation?.grade
    if (distribution[grade] !== undefined) {
      distribution[grade] += 1
      return
    }
    distribution.noEvidence += 1
  })

  return distribution
}

function getRelationStats(studentId, relations) {
  const incoming = relations.filter((relation) => relation.targetStudentId === studentId)
  const outgoing = relations.filter((relation) => relation.sourceStudentId === studentId)
  const positiveReceived = incoming.filter((relation) => relation.type === 'positive' || relation.type === 'friendship').length
  const positiveGiven = outgoing.filter((relation) => relation.type === 'positive' || relation.type === 'friendship').length
  const avoidReceived = incoming.filter((relation) => relation.type === 'avoid').length
  const avoidGiven = outgoing.filter((relation) => relation.type === 'avoid').length

  return { avoidGiven, avoidReceived, positiveGiven, positiveReceived }
}

function getRelationTotals(relations) {
  return {
    positiveOrFriendship: relations.filter((relation) => relation.type === 'positive' || relation.type === 'friendship').length,
    avoid: relations.filter((relation) => relation.type === 'avoid').length,
  }
}

function getPriorityScore(profile, relationStats) {
  const evaluationScore = profile.evaluation?.score || 0
  const consistency = profile.tracking?.consistency || 0
  const hasTrackingData = Boolean(profile.tracking?.hasTrackingData)
  const redPointCount = profile.redPointCount || 0
  const incidents = profile.incidents || 0

  return (
    (evaluationScore > 0 && evaluationScore <= 1.5 ? 3 : 0) +
    (evaluationScore > 1.5 && evaluationScore <= 2 ? 2 : 0) +
    (hasTrackingData && consistency < 55 ? 2 : 0) +
    (hasTrackingData && consistency >= 55 && consistency < 70 ? 1 : 0) +
    (redPointCount >= 3 ? 2 : redPointCount > 0 ? 1 : 0) +
    (incidents >= 2 ? 2 : incidents > 0 ? 1 : 0) +
    (relationStats.avoidReceived >= 2 ? 2 : relationStats.avoidReceived > 0 ? 1 : 0) +
    (relationStats.positiveReceived === 0 && (relationStats.avoidReceived > 0 || relationStats.positiveGiven > 0) ? 1 : 0)
  )
}

function getStudentSignals(profile, relationStats) {
  const signals = []
  const evaluationScore = profile.evaluation?.score || 0
  const consistency = profile.tracking?.consistency || 0
  const hasTrackingData = Boolean(profile.tracking?.hasTrackingData)
  const redPointCount = profile.redPointCount || 0
  const incidents = profile.incidents || 0

  if (evaluationScore > 0 && evaluationScore <= 2) signals.push('low achievement')
  if (hasTrackingData && consistency < 60) signals.push('low work consistency')
  if (redPointCount >= 3) signals.push('repeated missing work')
  if (incidents >= 2) signals.push('repeated behavior incidents')
  if (relationStats.avoidReceived >= 2) signals.push('social friction signal')
  if (relationStats.positiveReceived === 0 && relationStats.positiveGiven > 0) signals.push('gives support but receives little')
  if (evaluationScore > 0 && evaluationScore <= 2 && hasTrackingData && consistency >= 70) {
    signals.push('works consistently but does not yet achieve')
  }
  if (evaluationScore >= 3 && hasTrackingData && consistency < 60) {
    signals.push('achieves but habits are fragile')
  }

  return signals
}

function getSuggestedFocus(signals) {
  if (signals.includes('works consistently but does not yet achieve')) return 'Check conceptual barriers before adding more practice.'
  if (signals.includes('achieves but habits are fragile')) return 'Protect achievement by stabilizing routines and deadlines.'
  if (signals.includes('social friction signal')) return 'Review grouping and seating decisions with human judgement.'
  if (signals.includes('low achievement') && signals.includes('low work consistency')) {
    return 'Start with a short intervention that combines learning goal and work routine.'
  }
  if (signals.includes('repeated missing work')) return 'Clarify the minimum expected evidence for the next task.'
  if (signals.includes('repeated behavior incidents')) return 'Use observable behavior notes and a concrete next-step agreement.'
  return 'Monitor with a short, observable follow-up.'
}

function buildFocusStudents({ aliasMap, profiles, relations }) {
  return profiles
    .map((profile) => {
      const relationStats = getRelationStats(profile.student.id, relations)
      const signals = getStudentSignals(profile, relationStats)
      const priorityScore = getPriorityScore(profile, relationStats)

      return {
        alias: aliasMap.get(profile.student.id),
        halfGroup: profile.student.halfGroup || 'not specified',
        evaluation: {
          grade: profile.evaluation?.grade || 'no evidence',
          score: profile.evaluation?.score || null,
        },
        tracking: {
          consistencyPercent: profile.tracking?.hasTrackingData ? profile.tracking.consistency : null,
          lateTasks: profile.tracking?.late || 0,
          missingTasks: profile.tracking?.missing || 0,
          redPoints: profile.redPointCount || 0,
        },
        behavior: {
          incidentCount: profile.incidents || 0,
        },
        sociometric: relationStats,
        signals,
        suggestedFocus: getSuggestedFocus(signals),
        priorityScore,
      }
    })
    .filter((student) => student.priorityScore > 0 || student.signals.length > 0)
    .sort((a, b) => b.priorityScore - a.priorityScore || a.alias.localeCompare(b.alias))
    .slice(0, MAX_FOCUS_STUDENTS)
}

function buildCompetencyFocus(state, students, activeUtId) {
  const competencies = safeArray(state.competencies)
    .filter((competency) => competency.utId === activeUtId && !competency.inactive)
    .sort((a, b) => (a.order || 0) - (b.order || 0))

  return competencies
    .map((competency) => {
      const criteria = safeArray(state.criteria).filter((criterion) => criterion.competencyId === competency.id)
      const grades = students.flatMap((student) =>
        criteria
          .map((criterion) =>
            safeArray(state.marks).find((mark) => mark.studentId === student.id && mark.criterionId === criterion.id)?.value,
          )
          .filter(Boolean),
      )
      const scores = grades.map(getNumericFromGrade).filter((score) => score > 0)
      const riskEvidence = grades.filter((grade) => grade === 'C' || grade === 'D').length

      return {
        competency: competency.name,
        averageScore: getAverage(scores),
        evidenceCount: grades.length,
        fragileOrRiskEvidence: riskEvidence,
      }
    })
    .filter((row) => row.evidenceCount > 0)
    .sort((a, b) => {
      const averageA = a.averageScore ?? 999
      const averageB = b.averageScore ?? 999
      return averageA - averageB || b.fragileOrRiskEvidence - a.fragileOrRiskEvidence
    })
    .slice(0, 4)
}

function buildCooperativeSummary(state, classId) {
  const latestGroupSet = safeArray(state.tutorialGroupSets)
    .filter((groupSet) => groupSet.classId === classId)
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))[0]

  if (!latestGroupSet) {
    return {
      available: false,
      note: 'No cooperative group set is available for this class.',
    }
  }

  return {
    available: true,
    groupCount: safeArray(latestGroupSet.groups).length,
    groupSize: latestGroupSet.groupSize || null,
    strategy: latestGroupSet.strategy || 'not specified',
    sourceType: latestGroupSet.sourceType || 'not specified',
    manualChangeCount: latestGroupSet.manualChangeCount || 0,
  }
}

function buildPromptPackage({ activeClass, activeUt, aliasMap, classId, profiles, relations, state, students }) {
  const scores = profiles.map((profile) => profile.evaluation?.score || 0)
  const trackingProfiles = profiles.filter((profile) => profile.tracking?.hasTrackingData)
  const activeTasks = safeArray(state.tasks).filter((task) => task.classId === classId && (!activeUt?.id || task.utId === activeUt.id))
  const relationTotals = getRelationTotals(relations)
  const focusStudents = buildFocusStudents({ aliasMap, profiles, relations })

  return {
    purpose: 'privacy_safe_ai_teacher_briefing',
    generatedAt: new Date().toISOString(),
    classContext: {
      classLabel: 'active class',
      subject: activeClass?.subject || 'not specified',
      activeUnit: activeUt?.name || 'not specified',
      studentCount: students.length,
    },
    privacyGuardrails: {
      directIdentifiersIncluded: false,
      localIdentityMapIncluded: false,
      freeTextIncluded: false,
      diagnosisLabelsIncluded: false,
      excludedFields: EXCLUDED_FROM_AI_PACKAGE,
      humanReviewRequired: true,
    },
    classSignals: {
      gradeDistribution: getGradeDistribution(profiles),
      averageEvaluationScore: getAverage(scores),
      trackingCoverage: {
        studentsWithTrackingData: trackingProfiles.length,
        activeTaskCount: activeTasks.length,
        averageConsistencyPercent: getAverage(trackingProfiles.map((profile) => profile.tracking.consistency), {
          includeZero: true,
        }),
      },
      behavior: {
        incidentCount: safeArray(state.behaviorEvents).filter(
          (event) => event.classId === classId && event.type === 'incident',
        ).length,
        redPointCount: profiles.reduce((sum, profile) => sum + (profile.redPointCount || 0), 0),
      },
      sociometric: {
        relationCount: relations.length,
        positiveOrFriendshipRelationCount: relationTotals.positiveOrFriendship,
        avoidRelationCount: relationTotals.avoid,
      },
      cooperativeGroups: buildCooperativeSummary(state, classId),
    },
    competencyFocus: buildCompetencyFocus(state, students, activeUt?.id),
    focusStudents,
  }
}

export function buildAiTeacherBriefingPrompt() {
  return [
    'You are an educational planning assistant helping a teacher prepare the next intervention.',
    '',
    'Use only the pseudonymized classroom signals in the attached JSON file. Do not infer identity, diagnosis, family situation, or protected attributes. Do not make final decisions. Produce practical options for human review.',
    '',
    'Return:',
    '1. A 5-bullet class briefing.',
    '2. Three next-session actions for the whole class.',
    '3. A short plan for each focus student, using only their pseudonym.',
    '4. Two questions the teacher should answer before acting.',
  ].join('\n')
}

export function buildPrivacySafeTeacherBriefing(state) {
  const activeClass = getActiveClass(state)
  const activeUt = getActiveUt(state)
  const classId = activeClass?.id || state.ui?.activeClassId || ''
  const students = getClassStudents(state, classId)
  const aliasMap = buildAliasMap(students)
  const profiles = buildStudentProfiles(state, classId, activeUt?.id)
  const relations = safeArray(state.tutorialRelations).filter((relation) => relation.classId === classId)
  const promptPackage = buildPromptPackage({
    activeClass,
    activeUt,
    aliasMap,
    classId,
    profiles,
    relations,
    state,
    students,
  })

  return {
    activeClass,
    activeUt,
    localIdentityMap: students.map((student) => ({
      alias: aliasMap.get(student.id),
      name: student.name,
    })),
    promptPackage,
    promptText: buildAiTeacherBriefingPrompt(),
  }
}
