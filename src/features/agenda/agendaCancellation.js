import {
  buildAgendaCancellationReflow,
  buildTimetableSessionCandidates,
  getSchedulingSubject,
  getSessionCandidateKey,
  isBabeliumItem,
} from '../../domain/planning/index.js'
import { getNoClassCalendarEvent, isNoClassCalendarEvent } from '../../lib/agendaCalendar.js'

const dateOf = (session) => String(session.startsAt).slice(0, 10)
const blocks = (events, session) => getNoClassCalendarEvent(events, dateOf(session), session.classId,
  { sessionId: session.id, timetableSlotId: session.timetableSlotId })
const hasHistory = (bundle) => bundle.session.classroomOpenedAt || bundle.session.attendanceConfirmedAt
  || bundle.session.classroomClosedAt || bundle.session.applicationNotes?.length || bundle.results?.length

export function buildAutomaticCancellationPreview({ setup, event, calendarEvents, academicYear, now, occupiedSessions = [] }) {
  const affected = setup.existingSessionBundles.filter((bundle) => bundle.session.status === 'planned'
    && !hasHistory(bundle) && blocks([event], bundle.session))
    .sort((left, right) => left.session.startsAt.localeCompare(right.session.startsAt))
  if (!affected.some((bundle) => bundle.items?.some((item) => !isBabeliumItem(item)))) return null
  const target = affected[0]
  // Anul·lar només A no consumeix els seus minuts a la classe que B sí que fa.
  const targetedSubgroup = (event.sessionId || event.timetableSlotId) && target.session.subgroupId
    && affected.every((bundle) => bundle.session.subgroupId === target.session.subgroupId)
    ? target.session.subgroupId : ''
  const proposal = buildTimetableSessionCandidates({
    calendarEvents,
    classId: setup.application.classId,
    subject: getSchedulingSubject(setup),
    from: dateOf(target.session),
    to: academicYear.endsOn,
    timetables: setup.timetables,
    slotsByTimetableId: setup.slotsByTimetableId,
    occupiedCandidateKeys: [...setup.existingSessions, ...occupiedSessions].map((session) => getSessionCandidateKey({
      ...session, date: dateOf(session),
    })),
  })
  const preview = buildAgendaCancellationReflow({
    application: setup.application,
    existingSessionBundles: targetedSubgroup
      ? setup.existingSessionBundles.filter((bundle) => bundle.session.subgroupId === targetedSubgroup)
      : setup.existingSessionBundles,
    candidates: proposal.candidates.filter((candidate) => candidate.startsAt > target.session.startsAt
      && (!targetedSubgroup || candidate.subgroupId === targetedSubgroup)),
    targetSessionId: target.session.id,
    options: { now, calendarEvents },
  })
  if (preview.unscheduled.length) {
    throw new Error('No hi ha prou sessions disponibles fins al final del curs per traslladar totes les activitats. No s’ha desat l’anul·lació.')
  }
  return { ...preview, setup }
}

/** Prepara tots els grups abans de desar, inclosos els que no són a la vista. */
export async function saveCalendarEventWithAutomaticReflow({
  event, calendarEvents, academicYear, loadApplications, loadSetup, saveEvent, saveReflow, now,
}) {
  const nextEvents = [...calendarEvents.filter((item) => item.id !== event.id), event]
  const previews = []
  if (isNoClassCalendarEvent(event)) {
    const records = await loadApplications()
    const setups = []
    for (const { application, planningUnit } of records) {
      if (event.classIds?.length && !event.classIds.includes(application.classId)) continue
      setups.push(await loadSetup({ applicationId: application.id,
        classId: application.classId, planningUnitId: planningUnit.id }))
    }
    let occupiedSessions = setups.flatMap((setup) => setup.existingSessions)
    for (const setup of setups) {
      const preview = buildAutomaticCancellationPreview({ setup, event,
        calendarEvents: nextEvents, academicYear, now,
        occupiedSessions: occupiedSessions.filter((session) => session.classId === setup.application.classId) })
      if (preview) {
        previews.push(preview)
        const replacedIds = new Set([...preview.removedSessions, ...preview.sessions.map((b) => b.session)].map((s) => s.id))
        occupiedSessions = [...occupiedSessions.filter((session) => !replacedIds.has(session.id)),
          ...preview.sessions.map((bundle) => bundle.session)]
      }
    }
  }
  await saveEvent(event)
  for (const preview of previews) await saveReflow(preview)
  return event
}
