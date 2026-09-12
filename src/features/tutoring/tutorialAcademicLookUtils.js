import { antecedentCompetencyKey, normalizeAntecedentCompetencies } from '../../lib/antecedentCompetencies.js'

export const ANTECEDENT_PROFILE_META = {
  invisible: {
    label: 'Alumne invisible',
    priorityBoost: 2,
    supportLabel: 'visibilitat i suport',
    tone: 'warning',
  },
  priority: {
    label: 'Intervenció prioritària',
    priorityBoost: 3,
    supportLabel: 'seguiment prioritari',
    tone: 'danger',
  },
  ordinary: {
    label: 'Seguiment ordinari',
    priorityBoost: 0,
    supportLabel: '',
    tone: 'neutral',
  },
  stable: {
    label: 'Hàbit estable',
    priorityBoost: 0,
    supportLabel: 'referència estable',
    tone: 'positive',
  },
}

function isGenericCompetencyKey(value) {
  return /^(?:TRANS\s+)?C\d+$/i.test(String(value || '').trim())
}

function getAntecedentSourceLabel(antecedent) {
  return antecedent?.courseLabel ? `Antecedents · ${antecedent.courseLabel}` : 'Antecedents'
}

function createAntecedentAcademicRow({
  areaId,
  areaName,
  competencyName,
  getNumericFromGrade,
  grade,
  isNotDeveloped,
  sourceLabel,
  subject,
}) {
  return {
    academicSource: 'antecedent',
    areaId,
    areaName,
    competencyName,
    grade,
    notDeveloped: isNotDeveloped(grade),
    score: getNumericFromGrade(grade),
    source: 'antecedent',
    sourceLabel,
    sourceOrder: 1000,
    subject,
    trackingSummary: null,
  }
}

function findGradeForCompetency({ competency, grades, isSameCompetencyName }) {
  const candidates = [
    competency.key,
    competency.name,
    antecedentCompetencyKey(competency.name),
    `C${Number(competency.competencyIndex || 0) + 1}`,
  ].filter(Boolean)

  for (const candidate of candidates) {
    const normalizedCandidate = antecedentCompetencyKey(candidate)
    if (grades[normalizedCandidate]) return [normalizedCandidate, grades[normalizedCandidate]]
    if (grades[candidate]) return [candidate, grades[candidate]]
  }

  const entry = Object.entries(grades).find(([key]) => !isGenericCompetencyKey(key) && isSameCompetencyName(key, competency.name))
  return entry || null
}

export function buildAntecedentAcademicRows({
  allowGlobalAntecedent = true,
  antecedent,
  buildCompetencies,
  getNumericFromGrade,
  isNotDeveloped,
  isSameCompetencyName,
  preferredSubject = '',
  subjectOptions = [],
}) {
  if (!antecedent) return []

  const rows = []
  const sourceLabel = getAntecedentSourceLabel(antecedent)
  const grades = normalizeAntecedentCompetencies(antecedent.competencyGrades || {})
  const usedGradeKeys = new Set()

  subjectOptions.forEach((subjectOption) => {
    buildCompetencies(subjectOption.subject).forEach((competency) => {
      const match = findGradeForCompetency({ competency, grades, isSameCompetencyName })
      if (!match) return
      const [gradeKey, grade] = match
      if (!grade || usedGradeKeys.has(gradeKey)) return
      usedGradeKeys.add(gradeKey)
      rows.push(
        createAntecedentAcademicRow({
          areaId: subjectOption.areaId,
          areaName: subjectOption.areaName,
          competencyName: competency.name,
          getNumericFromGrade,
          grade,
          isNotDeveloped,
          sourceLabel,
          subject: subjectOption.subject,
        }),
      )
    })
  })

  if (rows.length === 0) {
    const genericGrades = Object.entries(grades).filter(([key, grade]) => isGenericCompetencyKey(key) && grade)
    const preferredOption =
      subjectOptions.find((option) => option.subject === preferredSubject) ||
      (subjectOptions.length === 1 ? subjectOptions[0] : null)
    if (preferredOption) {
      const competencies = buildCompetencies(preferredOption.subject)
      genericGrades.forEach(([key, grade]) => {
        const index = Math.max(0, Number(String(key).match(/\d+/)?.[0] || 1) - 1)
        const competency = competencies[index]
        if (!competency) return
        rows.push(
          createAntecedentAcademicRow({
            areaId: preferredOption.areaId,
            areaName: preferredOption.areaName,
            competencyName: competency.name,
            getNumericFromGrade,
            grade,
            isNotDeveloped,
            sourceLabel,
            subject: preferredOption.subject,
          }),
        )
      })
    }
  }

  if (rows.length === 0 && allowGlobalAntecedent && antecedent.lastLookGrade) {
    rows.push(
      createAntecedentAcademicRow({
        areaId: 'antecedents',
        areaName: 'Antecedents',
        competencyName: 'Última mirada global',
        getNumericFromGrade,
        grade: antecedent.lastLookGrade,
        isNotDeveloped,
        sourceLabel,
        subject: 'Antecedents',
      }),
    )
  }

  return rows
}

export function resolveEffectiveTutorialAcademicProfile({
  allowGlobalAntecedent = true,
  antecedent,
  buildCompetencies,
  currentRows = [],
  getNumericFromGrade,
  isNotDeveloped,
  isSameCompetencyName,
  preferredSubject = '',
  subjectOptions = [],
}) {
  const antecedentProfile = antecedent?.profile || ''
  const antecedentProfileMeta = ANTECEDENT_PROFILE_META[antecedentProfile] || null

  if (currentRows.length > 0) {
    return {
      academicSource: 'current',
      academicSourceLabel: 'Dades actuals',
      antecedentProfile,
      antecedentProfileMeta,
      evaluatedCompetencies: currentRows,
      hasCurrentAcademicData: true,
      usedAntecedents: false,
    }
  }

  const antecedentRows = buildAntecedentAcademicRows({
    allowGlobalAntecedent,
    antecedent,
    buildCompetencies,
    getNumericFromGrade,
    isNotDeveloped,
    isSameCompetencyName,
    preferredSubject,
    subjectOptions,
  })

  if (antecedentRows.length > 0) {
    const academicSource =
      antecedentRows.length === 1 && antecedentRows[0].competencyName === 'Última mirada global'
        ? 'antecedent-global'
        : 'antecedent-competencies'
    return {
      academicSource,
      academicSourceLabel:
        academicSource === 'antecedent-global' ? 'Antecedents globals' : 'Antecedents per competències',
      antecedentProfile,
      antecedentProfileMeta,
      evaluatedCompetencies: antecedentRows,
      hasCurrentAcademicData: false,
      usedAntecedents: true,
    }
  }

  return {
    academicSource: 'empty',
    academicSourceLabel: 'Sense dades acadèmiques',
    antecedentProfile,
    antecedentProfileMeta,
    evaluatedCompetencies: [],
    hasCurrentAcademicData: false,
    usedAntecedents: false,
  }
}
