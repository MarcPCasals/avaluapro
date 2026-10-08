import { applyPlanningActivityOverrides } from './classPlanning.js'

export function buildPlanningDirectionUrl(unitId, origin = globalThis.location?.href) {
  const url = new URL(origin)
  url.search = ''
  url.hash = ''
  url.searchParams.set('planning-view', unitId)
  return url.href
}

const FIELDS = [
  ['plannedMinutes', 'Minuts previstos'], ['grouping', 'Agrupament'],
  ['diversityMeasures', 'Adaptacions de l’alumnat'], ['description', 'Descripció'],
  ['title', 'Títol'], ['order', 'Ordre'], ['phaseId', 'Fase'], ['space', 'Espai'],
  ['studentMaterials', 'Materials de l’alumnat'], ['teacherMaterials', 'Materials del docent'],
]
function display(value) {
  if (value == null || value === '') return 'Sense especificar'
  if (Array.isArray(value)) return value.map((item) => typeof item === 'object'
    ? [item.label, ...(item.studentNames || [])].filter(Boolean).join(' · ') : item).join('; ') || 'Cap'
  return String(value)
}
export function compareGroupPlanning(activities, overrides = []) {
  const effective = applyPlanningActivityOverrides(activities, overrides)
  const byId = new Map(effective.map((item) => [item.id, item]))
  return activities.flatMap((original) => {
    const current = byId.get(original.id)
    if (!current) return [{ id: original.id, title: original.title, changes: [{ label: 'Activitat', before: 'Inclosa', after: 'Retirada del grup' }] }]
    const changes = FIELDS.flatMap(([field, label]) => JSON.stringify(original[field] ?? null) === JSON.stringify(current[field] ?? null)
      ? [] : [{ label, before: display(original[field]), after: display(current[field]) }])
    const agenda = [...overrides].sort((a, b) => String(a.updatedAt || '').localeCompare(String(b.updatedAt || '')))
      .filter((item) => item.activityId === original.id && item.changes?.agendaPlannedMinutes != null).at(-1)
    if (agenda && Number(agenda.changes.agendaPlannedMinutes) !== Number(original.plannedMinutes)) {
      changes.push({ label: 'Minuts a l’Agenda', before: display(original.plannedMinutes), after: display(agenda.changes.agendaPlannedMinutes) })
    }
    return changes.length ? [{ id: original.id, title: current.title, changes }] : []
  })
}
