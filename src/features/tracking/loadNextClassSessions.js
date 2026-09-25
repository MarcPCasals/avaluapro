import {
  applyPlanningCloudOperation,
  loadPlanningAcademicYears,
  loadPlanningCalendarEvents,
  loadPlanningTimetables,
  loadPlanningTimetableSlots,
} from '../../data/cloud/planningFirestore'
import { getSharedPlanningRepository } from '../../data/planningRepository'
import { buildTimetableSessionCandidates } from '../../domain/planning'

function localDateKey(date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((value, index) => index === 0 ? String(value) : String(value).padStart(2, '0'))
    .join('-')
}

function localTimeKey(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`
}

/**
 * Carrega només les peces de l'Agenda necessàries per proposar la pròxima
 * classe. Reutilitza el repositori local-first perquè l'opció funcioni també
 * amb la còpia local quan Firebase no respon.
 */
export async function loadNextClassSessions(user, classIds, now = new Date()) {
  if (!user?.uid || classIds.length === 0) return {}
  const repository = getSharedPlanningRepository({
    applyRemoteOperation: applyPlanningCloudOperation,
    uid: user.uid,
    isOnline: () => globalThis.navigator?.onLine !== false,
  })
  const today = localDateKey(now)
  const academicYearResult = await repository.loadScope(
    'academicYears',
    () => loadPlanningAcademicYears(user.uid),
    { completeSnapshot: true },
  )
  const academicYear = academicYearResult.entities.find((year) => year.startsOn <= today && year.endsOn >= today)
    || academicYearResult.entities.sort((left, right) => right.startsOn.localeCompare(left.startsOn))[0]
  if (!academicYear) return {}

  const [timetableResult, eventResult] = await Promise.all([
    repository.loadScope(
      `academicYear:${academicYear.id}:planningTimetables`,
      () => loadPlanningTimetables(user.uid, academicYear.id),
      { completeSnapshot: true },
    ),
    repository.loadScope(
      `academicYear:${academicYear.id}:planningCalendarEvents`,
      () => loadPlanningCalendarEvents(user.uid, academicYear.id, academicYear.startsOn, academicYear.endsOn),
      { completeSnapshot: true },
    ),
  ])
  const timetables = timetableResult.entities
  const slotEntries = await Promise.all(timetables.map(async (timetable) => {
    const result = await repository.loadScope(
      `timetable:${timetable.id}:slots`,
      () => loadPlanningTimetableSlots(user.uid, timetable.id),
      { completeSnapshot: true },
    )
    return [timetable.id, result.entities]
  }))
  const slotsByTimetableId = Object.fromEntries(slotEntries)
  const after = `${today}T${localTimeKey(now)}`

  return Object.fromEntries(classIds.map((classId) => {
    const { candidates } = buildTimetableSessionCandidates({
      calendarEvents: eventResult.entities,
      classId,
      from: today,
      slotsByTimetableId,
      timetables,
      to: academicYear.endsOn,
    })
    return [classId, candidates.find((candidate) => candidate.startsAt > after) || null]
  }))
}
