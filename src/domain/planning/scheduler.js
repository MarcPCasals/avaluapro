import {
  createCalendarSession,
  createSessionItem,
} from './model.js'
import { getProgrammableMinutes, selectEffectiveTimetable } from './rules.js'

const BLOCKING_EVENT_TYPES = new Set(['holiday', 'nonTeaching', 'cancellation'])

function compareOrder(left, right) {
  return Number(left.order) - Number(right.order) || String(left.id).localeCompare(String(right.id))
}

function nextDate(dateKey) {
  const date = new Date(`${dateKey}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

function weekdayFromDate(dateKey) {
  const weekday = new Date(`${dateKey}T12:00:00Z`).getUTCDay()
  return weekday === 0 ? 7 : weekday
}

function eventAppliesToClass(event, classId) {
  return !Array.isArray(event.classIds) || event.classIds.length === 0 || event.classIds.includes(classId)
}

function eventCoversDate(event, dateKey) {
  return event.startsOn <= dateKey && (event.endsOn || event.startsOn) >= dateKey
}

function candidateKey(candidate) {
  return `${candidate.date}__${candidate.timetableSlotId || candidate.calendarEventId || ''}__${candidate.startsAt}`
}

function existingItemsSignature(items = []) {
  return items.map((item) => [
    item.sourceActivityId || '',
    Number(item.segmentIndex) || 0,
    item.plannedMinutes == null ? '' : Number(item.plannedMinutes),
    item.type || 'activity',
  ].join(':')).join('|')
}

function parallelDraftKey(draft) {
  if (!draft?.candidate?.subgroupId) return ''
  return [
    draft.candidate.date,
    Number(draft.candidate.durationMinutes) || 0,
    existingItemsSignature(draft.existingItems),
  ].join('__')
}

/**
 * Dues franges de mig grup del mateix dia representen una sola passa de la
 * seqüència: A i B han de rebre el mateix contingut encara que tinguin hores
 * diferents. La unitat lògica conserva totes dues sessions reals, però només
 * consumeix una vegada els minuts de la UP.
 */
function buildLogicalDrafts(drafts) {
  const parallelBuckets = new Map()
  for (const draft of drafts) {
    const key = parallelDraftKey(draft)
    if (!key) continue
    parallelBuckets.set(key, [...(parallelBuckets.get(key) || []), draft])
  }
  const validParallelKeys = new Set([...parallelBuckets.entries()]
    .filter(([, bucket]) => new Set(bucket.map((draft) => draft.candidate.subgroupId)).size > 1)
    .map(([key]) => key))
  const logicalByParallelKey = new Map()
  const logicalDrafts = []
  const logicalByDraft = new Map()

  for (const draft of drafts) {
    const key = parallelDraftKey(draft)
    let logical = key && validParallelKeys.has(key) ? logicalByParallelKey.get(key) : null
    if (!logical) {
      logical = {
        drafts: [],
        items: [],
        remainingMinutes: draft.remainingMinutes,
      }
      logicalDrafts.push(logical)
      if (key && validParallelKeys.has(key)) logicalByParallelKey.set(key, logical)
    }
    logical.drafts.push(draft)
    logical.remainingMinutes = Math.min(logical.remainingMinutes, draft.remainingMinutes)
    logicalByDraft.set(draft, logical)
  }
  return { logicalByDraft, logicalDrafts }
}

/**
 * Resumeix el progrés real d'una aplicació sense comptar dues vegades una
 * activitat impartida en paral·lel als mitjos grups A i B.
 */
export function summarizeAssignedActivityProgress(sessionBundles = []) {
  const drafts = sessionBundles
    .filter((bundle) => bundle?.session && !['cancelled', 'notHeld'].includes(bundle.session.status))
    .map((bundle) => ({
      candidate: {
        date: String(bundle.session.startsAt).slice(0, 10),
        durationMinutes: bundle.session.durationMinutes,
        subgroupId: bundle.session.subgroupId,
      },
      existingItems: bundle.items || [],
      remainingMinutes: 0,
    }))
    .sort((left, right) => String(left.candidate.date).localeCompare(String(right.candidate.date)))
  const { logicalDrafts } = buildLogicalDrafts(drafts)
  const assignedMinutesByActivityId = {}
  const assignedSourceActivityIds = new Set()
  for (const logical of logicalDrafts) {
    for (const item of logical.drafts[0]?.existingItems || []) {
      if (!item.sourceActivityId) continue
      assignedSourceActivityIds.add(item.sourceActivityId)
      assignedMinutesByActivityId[item.sourceActivityId] =
        (assignedMinutesByActivityId[item.sourceActivityId] || 0) + (Number(item.plannedMinutes) || 0)
    }
  }
  return { assignedMinutesByActivityId, assignedSourceActivityIds }
}

/**
 * Converteix l'arbre de fases en una única seqüència pedagògica. Les subfases
 * apareixen just després de la fase mare i els elements orfes es conserven al
 * final, de manera que cap activitat queda fora d'una proposta per un canvi
 * incomplet de l'estructura.
 */
export function orderActivitiesForScheduling(phases, activities) {
  const orderedPhases = []
  const visited = new Set()
  const byParent = new Map()
  for (const phase of phases || []) {
    const parentId = phase.parentPhaseId || null
    byParent.set(parentId, [...(byParent.get(parentId) || []), phase])
  }
  for (const children of byParent.values()) children.sort(compareOrder)

  const visit = (phase) => {
    if (!phase || visited.has(phase.id)) return
    visited.add(phase.id)
    orderedPhases.push(phase)
    for (const child of byParent.get(phase.id) || []) visit(child)
  }
  for (const root of byParent.get(null) || []) visit(root)
  for (const phase of [...(phases || [])].sort(compareOrder)) visit(phase)

  const phaseIndex = new Map(orderedPhases.map((phase, index) => [phase.id, index]))
  return [...(activities || [])].sort((left, right) => {
    const phaseDifference = (phaseIndex.get(left.phaseId) ?? Number.MAX_SAFE_INTEGER) -
      (phaseIndex.get(right.phaseId) ?? Number.MAX_SAFE_INTEGER)
    return phaseDifference || compareOrder(left, right)
  })
}

/**
 * Genera només les sessions reals d'un grup. Per a cada data busca la versió
 * d'horari vigent i descarta festius, dies no lectius i anul·lacions que
 * afecten el grup. Les jornades especials es mostren al calendari, però no
 * s'interpreten automàticament com una anul·lació.
 */
export function buildTimetableSessionCandidates({
  calendarEvents = [],
  classId,
  from,
  occupiedCandidateKeys = [],
  slotsByTimetableId = {},
  timetables = [],
  to,
}) {
  if (!classId || !from || !to || from > to) {
    return { candidates: [], skippedDates: [] }
  }
  const occupied = new Set(occupiedCandidateKeys)
  const candidates = []
  const skippedDates = []
  let dateKey = from
  let guard = 0

  while (dateKey <= to && guard < 800) {
    guard += 1
    const timetable = selectEffectiveTimetable(timetables, dateKey)
    const weekday = weekdayFromDate(dateKey)
    const matchingSlots = timetable
      ? (slotsByTimetableId[timetable.id] || [])
          .filter((slot) => slot.classId === classId && Number(slot.weekday) === weekday)
          .sort((left, right) => String(left.startsAt).localeCompare(String(right.startsAt)))
      : []
    const blockingEvents = calendarEvents.filter((event) =>
      BLOCKING_EVENT_TYPES.has(event.type) &&
      eventCoversDate(event, dateKey) &&
      eventAppliesToClass(event, classId))

    if (matchingSlots.length > 0 && blockingEvents.length > 0) {
      skippedDates.push({
        date: dateKey,
        eventIds: blockingEvents.map((event) => event.id),
        titles: blockingEvents.map((event) => event.title),
      })
    } else {
      for (const slot of matchingSlots) {
        const candidate = {
          date: dateKey,
          durationMinutes: Number(slot.durationMinutes),
          space: slot.space || '',
          startsAt: `${dateKey}T${slot.startsAt}:00`,
          subgroupId: slot.subgroupId || null,
          subject: slot.subject || '',
          timetableSlotId: slot.id,
          timetableVersionId: timetable.id,
        }
        if (!occupied.has(candidateKey(candidate))) candidates.push(candidate)
      }
    }
    const extraordinaryEvents = calendarEvents.filter((event) =>
      event.type === 'extraordinarySession' &&
      event.consumesPlannedSession &&
      event.startsAt &&
      Number(event.durationMinutes) > 0 &&
      eventCoversDate(event, dateKey) &&
      eventAppliesToClass(event, classId))
    for (const event of extraordinaryEvents) {
      const candidate = {
        calendarEventId: event.id,
        date: dateKey,
        durationMinutes: Number(event.durationMinutes),
        space: '',
        startsAt: `${dateKey}T${event.startsAt}:00`,
        subgroupId: event.subgroupId || null,
        subject: '',
        timetableSlotId: null,
        timetableVersionId: timetable?.id || null,
      }
      if (!occupied.has(candidateKey(candidate))) candidates.push(candidate)
    }
    dateKey = nextDate(dateKey)
  }

  return {
    candidates: candidates.sort((left, right) => left.startsAt.localeCompare(right.startsAt)),
    skippedDates,
  }
}

/**
 * Reparteix la seqüència seleccionada sense tocar la UP. Primer construeix una
 * proposta completa en memòria. Pot afegir elements als minuts lliures d'una
 * sessió prevista, però la capa d'interfície no desa res fins que el docent ho
 * confirma.
 */
export function buildActivitySessionDistribution({
  activities = [],
  application,
  candidates = [],
  existingSessionBundles = [],
  marginMinutes = 5,
  options = {},
  scheduledSourceActivityIds = [],
}) {
  if (!application?.id || !application?.ownerUid || !application?.classId) {
    throw new Error("Cal una aplicació de grup per preparar les sessions")
  }
  const scheduled = new Set(scheduledSourceActivityIds)
  const skippedAlreadyScheduled = []
  const pendingActivities = []
  for (const activity of activities) {
    if (scheduled.has(activity.id)) skippedAlreadyScheduled.push(activity.id)
    else pendingActivities.push(activity)
  }

  const drafts = [
    ...existingSessionBundles
      .filter((bundle) => bundle?.session?.status === 'planned')
      .map((bundle) => ({
        candidate: {
          date: String(bundle.session.startsAt).slice(0, 10),
          calendarEventId: bundle.session.calendarEventId,
          durationMinutes: bundle.session.durationMinutes,
          startsAt: bundle.session.startsAt,
          subgroupId: bundle.session.subgroupId,
          timetableSlotId: bundle.session.timetableSlotId,
        },
        existingItems: bundle.items || [],
        isExisting: true,
        items: [],
        remainingMinutes: Math.max(0, getProgrammableMinutes(bundle.session.durationMinutes, marginMinutes) -
          (bundle.items || []).reduce((total, item) => total + (Number(item.plannedMinutes) || 0), 0)),
        session: bundle.session,
      })),
    ...candidates.map((candidate) => ({
      candidate,
      existingItems: [],
      isExisting: false,
      items: [],
      remainingMinutes: getProgrammableMinutes(candidate.durationMinutes, marginMinutes),
      session: null,
    })),
  ].sort((left, right) => left.candidate.startsAt.localeCompare(right.candidate.startsAt))
  const { logicalByDraft, logicalDrafts } = buildLogicalDrafts(drafts)
  const unscheduled = []
  let draftIndex = 0
  let currentDraft = null

  const takeDraft = () => {
    if (currentDraft && currentDraft.remainingMinutes > 0) return currentDraft
    while (draftIndex < logicalDrafts.length) {
      const draft = logicalDrafts[draftIndex]
      draftIndex += 1
      if (draft.remainingMinutes > 0) {
        currentDraft = draft
        return currentDraft
      }
    }
    return null
  }

  for (const activity of pendingActivities) {
    const plannedMinutes = Number(activity.plannedMinutes)
    const hasTime = Number.isFinite(plannedMinutes) && plannedMinutes > 0
    if (!hasTime) {
      const draft = currentDraft || takeDraft()
      if (!draft) {
        unscheduled.push({ activityId: activity.id, remainingMinutes: null, title: activity.title })
        continue
      }
      draft.items.push({ activity, plannedMinutes: null })
      continue
    }

    let remainingMinutes = plannedMinutes
    while (remainingMinutes > 0) {
      const draft = takeDraft()
      if (!draft || draft.remainingMinutes <= 0) {
        unscheduled.push({ activityId: activity.id, remainingMinutes, title: activity.title })
        break
      }
      const segmentMinutes = Math.min(remainingMinutes, draft.remainingMinutes)
      draft.items.push({ activity, plannedMinutes: segmentMinutes })
      draft.remainingMinutes -= segmentMinutes
      remainingMinutes -= segmentMinutes
      if (draft.remainingMinutes === 0) currentDraft = null
    }
  }

  const segmentCounts = new Map()
  for (const draft of logicalDrafts) {
    for (const item of draft.items) {
      segmentCounts.set(item.activity.id, (segmentCounts.get(item.activity.id) || 0) + 1)
    }
  }
  const segmentIndexes = new Map()
  for (const draft of logicalDrafts) {
    draft.items = draft.items.map((item) => {
      const segmentIndex = (segmentIndexes.get(item.activity.id) || 0) + 1
      segmentIndexes.set(item.activity.id, segmentIndex)
      return { ...item, segmentCount: segmentCounts.get(item.activity.id), segmentIndex }
    })
  }
  const sessions = drafts.filter((draft) => (logicalByDraft.get(draft)?.items || []).length > 0).map((draft) => {
    const logical = logicalByDraft.get(draft)
    const logicalItems = logical?.items || []
    const session = draft.session || createCalendarSession(
      {
        applicationId: application.id,
        calendarEventId: draft.candidate.calendarEventId,
        classId: application.classId,
        durationMinutes: draft.candidate.durationMinutes,
        ownerUid: application.ownerUid,
        startsAt: draft.candidate.startsAt,
        subgroupId: draft.candidate.subgroupId,
        timetableSlotId: draft.candidate.timetableSlotId,
      },
      options,
    )
    const items = logicalItems.map(({ activity, plannedMinutes, segmentCount, segmentIndex }, order) => (
      createSessionItem({
        applicationId: application.id,
        order: draft.existingItems.length + order,
        ownerUid: application.ownerUid,
        plannedMinutes,
        segmentCount,
        segmentIndex,
        sessionId: session.id,
        sourceActivityId: activity.id,
        title: activity.title,
        type: activity.type || 'activity',
      }, options)
    ))
    return {
      candidate: draft.candidate,
      existingItems: draft.existingItems,
      isExisting: draft.isExisting,
      items,
      programmableMinutes: getProgrammableMinutes(session.durationMinutes, marginMinutes),
      session,
    }
  })

  return {
    scheduledActivityIds: [...new Set(sessions.flatMap((bundle) =>
      bundle.items.map((item) => item.sourceActivityId)))],
    sessions,
    scheduledMinutes: logicalDrafts.reduce((total, draft) => total + draft.items.reduce(
      (sum, item) => sum + (Number(item.plannedMinutes) || 0), 0), 0),
    skippedAlreadyScheduled,
    unscheduled,
  }
}

export function getSessionCandidateKey(candidate) {
  return candidateKey(candidate)
}
