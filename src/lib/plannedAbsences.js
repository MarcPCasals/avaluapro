import { getNoClassCalendarEvent } from './agendaCalendar.js'
import { getEffectiveActivityMaterialLinks } from '../domain/planning/materials.js'

export function getPlannedAbsenceSessions({ bundles = [], calendarEvents = [], candidates = [], period, student }) {
  if (!period || !student) return []
  const scheduled = bundles.filter(({ session }) => {
    const date = String(session.startsAt || '').slice(0, 10)
    if (session.classId !== student.classId || date < period.startsOn || date > period.endsOn) return false
    if (['cancelled', 'notHeld'].includes(session.status)) return false
    if (session.subgroupId && session.subgroupId !== student.halfGroup) return false
    return !getNoClassCalendarEvent(calendarEvents, date, student.classId, {
      sessionId: session.id,
      timetableSlotId: session.timetableSlotId,
    })
  })
  const unscheduled = candidates.filter((candidate) => {
    if (candidate.date < period.startsOn || candidate.date > period.endsOn) return false
    if (candidate.subgroupId && candidate.subgroupId !== student.halfGroup) return false
    return !bundles.some(({ session }) => String(session.startsAt).slice(0, 10) === candidate.date
      && (candidate.timetableSlotId ? session.timetableSlotId === candidate.timetableSlotId
        : session.startsAt === candidate.startsAt))
  }).map((candidate) => ({
    session: { ...candidate, id: `timetable-${candidate.date}-${candidate.timetableSlotId || candidate.calendarEventId}`,
      classId: student.classId, status: 'planned' },
    items: [],
    planningUnit: {},
  }))
  return [...scheduled, ...unscheduled].sort((a, b) => a.session.startsAt.localeCompare(b.session.startsAt))
}

export function buildPlannedAbsenceEmail({ student, period, bundles = [] }) {
  const lines = [
    `Assumpte: Activitats de classe del ${period.startsOn} al ${period.endsOn}`,
    '',
    `Hola ${String(student.name || '').split(' ')[0]},`,
    '',
    'Durant els dies que no podràs venir a classe, tenim previstes aquestes sessions:',
    '',
  ]
  for (const bundle of bundles) {
    const date = String(bundle.session.startsAt).slice(0, 10)
    const time = String(bundle.session.startsAt).slice(11, 16)
    lines.push(`${date} · ${time}${bundle.session.subgroupId ? ` · ${bundle.session.subgroupId}` : ''}`)
    if (!bundle.items?.length) {
      lines.push('Activitats encara pendents de concretar.')
    }
    for (const item of bundle.items || []) {
      lines.push(`- ${item.title}`)
      if (item.sourceActivity?.description?.trim()) lines.push(`  ${item.sourceActivity.description.trim()}`)
    }
    const activities = bundle.items?.length ? bundle.items.map((item) => item.sourceActivity || {}) : [{}]
    const links = activities.flatMap((activity) => getEffectiveActivityMaterialLinks(activity, bundle.planningUnit || {}))
      .filter((material) => material.audience === 'students')
    const physical = activities.flatMap((activity) => activity.studentMaterials || [])
      .concat(bundle.planningUnit?.transversalMaterials || [])
      .filter((material) => material.kind === 'physical')
    for (const material of [...new Map(links.map((item) => [item.url, item])).values()]) {
      lines.push(`  Material: ${material.label || material.url} — ${material.url}`)
    }
    for (const material of [...new Map(physical.map((item) => [item.label, item])).values()]) {
      lines.push(`  Material: ${material.label}`)
    }
    lines.push('')
  }
  if (!bundles.length) lines.push('Encara no hi ha sessions calendaritzades per a aquests dies.', '')
  lines.push('Aquesta previsió pot canviar. Revisa les indicacions actualitzades que t’enviï el professorat.', '', 'Fins aviat!')
  return lines.join('\n')
}
