import { getSubjectStructure } from '../../data/subjects.js'

function normalizedLabel(value) {
  return String(value || '').trim().toLocaleLowerCase('ca')
}

function curriculumKey(prefix, label, parentKey = '') {
  const normalized = normalizedLabel(label)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return [parentKey, prefix, normalized].filter(Boolean).join(':')
}

export function normalizeActivityCurriculumSelections(selections = []) {
  return (selections || []).map((selection) => ({
    competencyKey: String(selection?.competencyKey || '').trim(),
    label: String(selection?.label || '').trim(),
    assessmentCriteria: (selection?.assessmentCriteria || []).map((criterion) => ({
      criterionKey: String(criterion?.criterionKey || '').trim(),
      label: String(criterion?.label || '').trim(),
    })).filter((criterion) => criterion.criterionKey && criterion.label),
  })).filter((selection) => selection.competencyKey && selection.label)
}

/**
 * Les competències d'avaluació es creen una vegada per UT. Per al selector
 * d'activitats les agrupem pel nom perquè el docent vegi el currículum real de
 * l'assignatura una sola vegada, no una còpia tècnica per cada UT.
 */
export function buildActivityCurriculumOptions({ classId, competencies = [], criteria = [], subjectName = '', uts = [] }) {
  const classUtIds = new Set(uts.filter((unit) => unit.classId === classId).map((unit) => unit.id))
  const classCompetencies = competencies
    .filter((competency) => !competency.inactive && (
      competency.classId === classId || classUtIds.has(competency.utId)
    ))
    .sort((left, right) => Number(left.order) - Number(right.order))
  const grouped = new Map()

  classCompetencies.forEach((competency) => {
    const labelKey = normalizedLabel(competency.name)
    if (!labelKey) return
    const current = grouped.get(labelKey) || {
      key: curriculumKey('competency', competency.name),
      label: competency.name,
      order: Number(competency.order) || grouped.size,
      sourceIds: new Set(),
    }
    current.sourceIds.add(competency.id)
    grouped.set(labelKey, current)
  })

  if (grouped.size === 0) {
    ;(getSubjectStructure(subjectName) || []).forEach((competency, index) => {
      const key = curriculumKey('competency', competency.name)
      grouped.set(normalizedLabel(competency.name), {
        key,
        label: competency.name,
        order: index,
        sourceIds: new Set(),
        templateCriteria: competency.criteria || [],
      })
    })
  }

  return [...grouped.values()]
    .sort((left, right) => left.order - right.order || left.label.localeCompare(right.label, 'ca'))
    .map((competency) => {
      const criterionLabels = criteria
        .filter((criterion) => competency.sourceIds.has(criterion.competencyId) && !criterion.inactive)
        .sort((left, right) => Number(left.order) - Number(right.order))
        .map((criterion) => criterion.name)
      const uniqueLabels = [...new Map([...(criterionLabels.length ? criterionLabels : competency.templateCriteria || [])]
        .filter(Boolean)
        .map((label) => [normalizedLabel(label), label])).values()]
      return {
        key: competency.key,
        label: competency.label,
        criteria: uniqueLabels.map((label) => ({
          key: curriculumKey('criterion', label, competency.key),
          label,
        })),
      }
    })
}

export function activityCurriculumText(activity) {
  return normalizeActivityCurriculumSelections(activity?.curriculumSelections).map((selection) => {
    const criteria = selection.assessmentCriteria.map((criterion) => criterion.label)
    return criteria.length ? `${selection.label}\n${criteria.join('\n')}` : selection.label
  }).join('\n\n')
}
