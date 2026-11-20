import { canonicalizeSubjectName, getSubjectStructure } from '../../data/subjects.js'

const CFN_CRITERION_ACTION_VERBS = {
  '1:1': ['Predir', 'Contrastar', 'Representar'],
  '1:2': ['Descriure', 'Relacionar', 'Explicar'],
  '2:1': ['Formular', 'Relacionar', 'Concloure'],
  '2:2': ['Dissenyar', 'Mesurar', 'Comunicar'],
  '3:1': ['Valorar', 'Decidir', 'Defensar'],
  '3:2': ['Fonamentar', 'Raonar', 'Contraargumentar'],
}

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

export function criterionActionVerbs({ competencyLabel = '', criterionLabel = '', subjectName = '' } = {}) {
  if (canonicalizeSubjectName(subjectName) !== 'Ciències Físiques i de la Natura') return []
  const competencyNumber = String(competencyLabel).match(/(?:^|\s)C\s*([1-3])\b/i)?.[1]
  const criterionNumber = String(criterionLabel).match(/(?:^|\s)CA\s*([1-2])\b/i)?.[1]
  return [...(CFN_CRITERION_ACTION_VERBS[`${competencyNumber}:${criterionNumber}`] || [])]
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

function comparableCurriculumLabel(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('ca').replace(/[^a-z0-9]/g, '')
}

function leadingCurriculumCode(value, prefix) {
  return new RegExp(`^${prefix}\\s*(\\d+)\\b`, 'i').exec(String(value || ''))?.[1] || ''
}

/** Relaciona els codis de la UP importada amb les opcions reals del formulari. */
export function reconcileActivityCurriculumSelections(selections = [], options = []) {
  const normalized = normalizeActivityCurriculumSelections(selections)
  if (!options.length) return normalized
  return normalized.map((selection) => {
    const competency = options.find((option) => option.key === selection.competencyKey)
      || options.find((option) => comparableCurriculumLabel(option.label) === comparableCurriculumLabel(selection.label))
      || (selection.label.match(/^C\s*\d+$/i)
        ? options.find((option) => leadingCurriculumCode(option.label, 'C') === leadingCurriculumCode(selection.label, 'C'))
        : null)
    if (!competency) return selection
    return {
      competencyKey: competency.key,
      label: competency.label,
      assessmentCriteria: selection.assessmentCriteria.map((criterion) => {
        const matched = competency.criteria.find((option) => option.key === criterion.criterionKey)
          || competency.criteria.find((option) => comparableCurriculumLabel(option.label) === comparableCurriculumLabel(criterion.label))
          || (criterion.label.match(/^CA\s*\d+$/i)
            ? competency.criteria.find((option) => leadingCurriculumCode(option.label, 'CA') === leadingCurriculumCode(criterion.label, 'CA'))
            : null)
        return matched ? { criterionKey: matched.key, label: matched.label } : criterion
      }),
    }
  })
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
          actionVerbs: criterionActionVerbs({
            competencyLabel: competency.label,
            criterionLabel: label,
            subjectName,
          }),
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
