import { PEDAGOGICAL_TYPE_LABELS } from './documents.js'
import { groupParallelSessionBundles, summarizeAssignedActivityProgress, summarizeCompletedActivityIds } from './scheduler.js'
import { getAgendaActivityMinutesById, getManuallyCompletedActivityIds, applyPlanningActivityOverrides } from './classPlanning.js'

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
  ['applicationComment', 'Comentari d’aplicació'], ['type', 'Tipus d’activitat'],
  ['pedagogicalType', 'Tipus pedagògic'], ['resourceSelections', 'Recursos vinculats'], ['curriculumSelections', 'Currículum vinculat'],
  ['evidenceMode', 'Recollida d’evidències'], ['indicatorIds', 'Indicadors vinculats'], ['diversityMeasureIds', 'Mesures vinculades'],
]
function display(value) {
  if (value == null || value === '') return 'Sense especificar'
  if (Array.isArray(value)) return value.map((item) => typeof item === 'object'
    ? [item.label || item.text || item.title, item.url, item.teacherUrl, ...(item.studentNames || []), ...(item.assessmentCriteria || []).map((criterion) => criterion.label)].filter(Boolean).join(' · ') : item).join('; ') || 'Cap'
  return String(value)
}
export function compareGroupPlanning(activities, overrides = [], phases = []) {
  const formatField = (field, value) => field === 'phaseId' ? phases.find((phase) => phase.id === value)?.title || 'Fase sense nom'
    : field === 'pedagogicalType' ? PEDAGOGICAL_TYPE_LABELS[value] || 'Personalitzat'
    : field === 'evidenceMode' ? { none: 'Sense evidències', final: 'Al final', perSession: 'A cada sessió' }[value] || 'Sense especificar'
    : ['indicatorIds', 'diversityMeasureIds'].includes(field) ? `${(value || []).length} vinculats`
    : field === 'type' ? { activity: 'Activitat', indication: 'Indicació', transition: 'Pausa o transició' }[value] || 'Activitat'
    : field === 'order' ? String(Number(value || 0) + 1) : display(value)
  const effective = applyPlanningActivityOverrides(activities, overrides)
  const byId = new Map(effective.map((item) => [item.id, item]))
  return activities.flatMap((original) => {
    const current = byId.get(original.id)
    if (!current) return [{ id: original.id, title: original.title, changes: [{ label: 'Activitat', before: 'Inclosa', after: 'Retirada del grup' }] }]
    const changes = FIELDS.flatMap(([field, label]) => JSON.stringify(original[field] ?? null) === JSON.stringify(current[field] ?? null)
      ? [] : [{ label, before: formatField(field, original[field]), after: formatField(field, current[field]) }])
    const agenda = [...overrides].sort((a, b) => String(a.updatedAt || '').localeCompare(String(b.updatedAt || '')))
      .filter((item) => item.activityId === original.id && item.changes?.agendaPlannedMinutes != null).at(-1)
    if (agenda && Number(agenda.changes.agendaPlannedMinutes) !== Number(original.plannedMinutes)) {
      changes.push({ label: 'Minuts a l’Agenda', before: display(original.plannedMinutes), after: display(agenda.changes.agendaPlannedMinutes) })
    }
    return changes.length ? [{ id: original.id, title: current.title, changes }] : []
  })
}

/** Una activitat conserva tota la seqüència de sessions, també les cancel·lades. */
export function buildDirectionActivityReports(activities = [], bundle = {}, phases = []) {
  const overrides = bundle.overrides || []
  const sessions = [...(bundle.sessions || [])].sort((a, b) => String(a.session.startsAt).localeCompare(String(b.session.startsAt)))
  const effectiveById = new Map(applyPlanningActivityOverrides(activities, overrides).map((activity) => [activity.id, activity]))
  const changesById = new Map(compareGroupPlanning(activities, overrides, phases).map((item) => [item.id, item.changes]))
  const agendaMinutes = getAgendaActivityMinutesById(activities.map((item) => effectiveById.get(item.id) || item), overrides)
  const manualIds = getManuallyCompletedActivityIds(overrides)
  const completedIds = summarizeCompletedActivityIds(sessions)
  const validSessions = sessions.map((entry) => ({ ...entry, items: (entry.items || []).filter((item) => {
    const result = (entry.results || []).find((candidate) => candidate.sessionItemId === item.id)
    return !['notHeld', 'skipped'].includes(result?.status)
  }) }))
  const { assignedMinutesByActivityId } = summarizeAssignedActivityProgress(validSessions)
  return activities.map((original) => {
    const effective = effectiveById.get(original.id)
    const occurrences = sessions.flatMap((entry, index) => (entry.items || [])
      .filter((item) => item.sourceActivityId === original.id)
      .map((item) => ({ session: entry.session, sessionNumber: index + 1, item, result: (entry.results || []).find((result) => result.sessionItemId === item.id) })))
    let actualMinutes = null
    for (const logical of groupParallelSessionBundles(sessions)) {
      const totals = logical.bundles.map((entry) => {
        const itemIds = new Set((entry.items || []).filter((item) => item.sourceActivityId === original.id).map((item) => item.id))
        const recorded = (entry.results || []).filter((result) => itemIds.has(result.sessionItemId) && result.actualMinutes != null && !['notHeld', 'skipped'].includes(result.status))
        return recorded.length ? recorded.reduce((total, result) => total + Number(result.actualMinutes), 0) : null
      }).filter((total) => total != null)
      if (totals.length) actualMinutes = (actualMinutes || 0) + Math.max(...totals)
    }
    const removed = !effective
    const completed = completedIds.has(original.id) || manualIds.has(original.id)
    const plannedMinutes = agendaMinutes[original.id] ?? effective?.plannedMinutes ?? original.plannedMinutes
    const remainingMinutes = completed ? 0 : Math.max(0, Number(plannedMinutes || 0) - (assignedMinutesByActivityId[original.id] || 0))
    const scheduled = occurrences.some(({ session, result }) => session.status === 'planned' && !['skipped', 'notHeld'].includes(result?.status))
    const started = occurrences.some(({ result }) => result && ['continued', 'completed'].includes(result.status))
    const status = removed ? 'removed' : completed ? 'completed' : remainingMinutes > 0 && scheduled ? 'partial' : remainingMinutes > 0 && (sessions.length > 0 || bundle.application?.status === 'completed') ? 'unscheduled' : scheduled ? 'scheduled' : started ? 'started' : 'unplanned'
    const changes = changesById.get(original.id) || []
    const actualChanged = occurrences.some(({ item, result }) => result?.actualMinutes != null && Number(item.plannedMinutes || 0) !== Number(result.actualMinutes))
    return { original, activity: effective || original, occurrences, actualMinutes, plannedMinutes, remainingMinutes, status, manuallyCompleted: manualIds.has(original.id), changes, modified: changes.length > 0 || actualChanged || (completed && actualMinutes != null && Number(original.plannedMinutes || 0) !== actualMinutes) }
  })
}
