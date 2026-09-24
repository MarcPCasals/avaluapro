import {
  createActivityResult,
  createCalendarSession,
  createSessionItem,
} from './model.js'
import { getProgrammableMinutes, selectEffectiveTimetable } from './rules.js'

const BLOCKING_EVENT_TYPES = new Set(['holiday', 'nonTeaching', 'specialDay', 'cancellation'])

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

function eventBlocksTimetableSlot(event, slot) {
  if (event.sessionId) return false
  return !event.timetableSlotId || event.timetableSlotId === slot.id
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

function sessionBundleParallelKey(bundle) {
  const session = bundle?.session
  if (!session?.subgroupId) return ''
  return [
    String(session.startsAt).slice(0, 10),
    Number(session.durationMinutes) || 0,
    existingItemsSignature(bundle.items || bundle.existingItems),
  ].join('__')
}

/**
 * Agrupa les franges físiques A/B que comparteixen una mateixa sessió
 * pedagògica. Les franges es conserven separades per poder passar llista a
 * cada mig grup, però la cronologia i els recomptes poden tractar-les com una
 * sola passa de la UP.
 */
export function groupParallelSessionBundles(sessionBundles = []) {
  const buckets = new Map()
  for (const bundle of sessionBundles) {
    const key = sessionBundleParallelKey(bundle)
    if (!key) continue
    buckets.set(key, [...(buckets.get(key) || []), bundle])
  }
  const parallelKeys = new Set([...buckets.entries()]
    .filter(([, bucket]) => new Set(bucket.map((bundle) => bundle.session.subgroupId)).size > 1)
    .map(([key]) => key))
  const groups = []
  const groupByKey = new Map()
  for (const bundle of sessionBundles) {
    const key = sessionBundleParallelKey(bundle)
    if (!key || !parallelKeys.has(key)) {
      groups.push({ bundles: [bundle], isParallel: false })
      continue
    }
    let group = groupByKey.get(key)
    if (!group) {
      group = { bundles: [], isParallel: true }
      groupByKey.set(key, group)
      groups.push(group)
    }
    group.bundles.push(bundle)
  }
  return groups
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

    const blockedSlots = matchingSlots.map((slot) => ({
      events: blockingEvents.filter((event) => eventBlocksTimetableSlot(event, slot)),
      slot,
    }))
    const skippedEvents = [...new Map(blockedSlots
      .flatMap((item) => item.events)
      .map((event) => [event.id, event])).values()]

    if (skippedEvents.length > 0) {
      skippedDates.push({
        date: dateKey,
        eventIds: skippedEvents.map((event) => event.id),
        titles: skippedEvents.map((event) => event.title),
      })
    }
    for (const { events, slot } of blockedSlots) {
      if (events.length === 0) {
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
  const scheduledLogicalDrafts = logicalDrafts.filter((draft) => draft.items.length > 0)
  const logicalSessionIndex = new Map(scheduledLogicalDrafts.map((draft, index) => [draft, index + 1]))
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
      logicalSessionIndex: logicalSessionIndex.get(logical),
      parallelSubgroupCount: logical?.drafts.filter((item) => item.candidate.subgroupId).length || 0,
      programmableMinutes: getProgrammableMinutes(session.durationMinutes, marginMinutes),
      session,
    }
  })

  return {
    logicalSessionCount: scheduledLogicalDrafts.length,
    physicalSessionCount: sessions.length,
    scheduledActivityIds: [...new Set(sessions.flatMap((bundle) =>
      bundle.items.map((item) => item.sourceActivityId)))],
    sessions,
    scheduledMinutes: logicalDrafts.reduce((total, draft) => total + draft.items.reduce(
      (sum, item) => sum + (Number(item.plannedMinutes) || 0), 0), 0),
    skippedAlreadyScheduled,
    unscheduled,
  }
}

function canReflowSession(bundle, fromDate) {
  const session = bundle?.session
  if (!session || String(session.startsAt).slice(0, 10) < fromDate) return false
  if (session.status !== 'planned') return false
  if (session.classroomOpenedAt || session.attendanceConfirmedAt || session.classroomClosedAt) return false
  return !(bundle.results || []).length
}

/**
 * Torna a projectar tota la part futura d'una UP sobre les sessions previstes.
 * Les sessions impartides o amb dades reals queden bloquejades. La resta es
 * buida només dins la proposta i es reparteix de nou en l'ordre actual de la
 * programació, de manera que qualsevol inserció o canvi de durada produeix
 * l'efecte dominó esperat abans de desar res.
 */
export function buildActivitySessionReflow({
  activities = [],
  application,
  candidates = [],
  existingSessionBundles = [],
  fromDate,
  marginMinutes = 5,
  options = {},
}) {
  if (!fromDate) throw new Error('Cal indicar des de quina data es reorganitzen les sessions')
  const reflowableBundles = existingSessionBundles
    .filter((bundle) => canReflowSession(bundle, fromDate))
    .sort((left, right) => left.session.startsAt.localeCompare(right.session.startsAt))
  const lockedBundles = existingSessionBundles.filter((bundle) => !reflowableBundles.includes(bundle))
  const { assignedMinutesByActivityId, assignedSourceActivityIds } =
    summarizeAssignedActivityProgress(lockedBundles)
  const remainingActivities = activities.flatMap((activity) => {
    const plannedMinutes = Number(activity.plannedMinutes)
    if (!Number.isFinite(plannedMinutes) || plannedMinutes <= 0) {
      return assignedSourceActivityIds.has(activity.id) ? [] : [activity]
    }
    const remainingMinutes = Math.max(0, plannedMinutes - (assignedMinutesByActivityId[activity.id] || 0))
    return remainingMinutes > 0 ? [{ ...activity, plannedMinutes: remainingMinutes }] : []
  })
  const segmentOffsetByActivityId = {}
  for (const bundle of lockedBundles) {
    for (const item of bundle.items || []) {
      if (!item.sourceActivityId) continue
      segmentOffsetByActivityId[item.sourceActivityId] = Math.max(
        segmentOffsetByActivityId[item.sourceActivityId] || 0,
        Number(item.segmentIndex) || 0,
      )
    }
  }
  const distribution = buildActivitySessionDistribution({
    activities: remainingActivities,
    application,
    candidates,
    existingSessionBundles: reflowableBundles.map((bundle) => ({ ...bundle, items: [] })),
    marginMinutes,
    options,
  })
  const sessions = distribution.sessions.map((bundle) => ({
    ...bundle,
    items: bundle.items.map((item) => {
      const offset = segmentOffsetByActivityId[item.sourceActivityId] || 0
      if (!offset) return item
      return createSessionItem({
        ...item,
        segmentCount: offset + item.segmentCount,
        segmentIndex: offset + item.segmentIndex,
      }, options)
    }),
  }))
  const usedSessionIds = new Set(sessions.map((bundle) => bundle.session.id))
  const removedSessions = reflowableBundles
    .map((bundle) => bundle.session)
    .filter((session) => !usedSessionIds.has(session.id))

  return {
    ...distribution,
    kind: 'reflow',
    lockedSessionCount: lockedBundles.length,
    removedItems: reflowableBundles.flatMap((bundle) => bundle.items || []),
    removedSessions,
    replacedItemCount: reflowableBundles.reduce((total, bundle) => total + (bundle.items || []).length, 0),
    reflowableSessionCount: reflowableBundles.length,
    sessions,
  }
}

/**
 * Recupera una activitat anterior dins d'una sessió futura sense modificar la
 * seqüència mestra de la UP. La recuperació s'insereix al davant i tots els
 * elements encara no impartits es tornen a repartir en cadena. Així, si la
 * sessió ja era plena, l'última activitat passa a la següent i l'efecte dominó
 * continua fins que tota la cronologia torna a encaixar.
 */
export function buildAgendaRecoveryReflow({
  application,
  candidates = [],
  existingSessionBundles = [],
  options = {},
  recoveryItem,
  recoveryMinutes,
  targetSessionId,
}) {
  if (!application?.id || !recoveryItem?.sourceActivityId || !targetSessionId) {
    throw new Error('Cal indicar la sessió i l’activitat anterior que vols recuperar.')
  }
  const minutes = Number(recoveryMinutes)
  if (!Number.isFinite(minutes) || minutes <= 0) {
    throw new Error('Cal indicar quants minuts dedicaràs a recuperar l’activitat.')
  }

  const applicationBundles = existingSessionBundles
    .filter((bundle) => bundle?.session?.applicationId === application.id)
    .sort((left, right) => left.session.startsAt.localeCompare(right.session.startsAt))
  const targetBundle = applicationBundles.find((bundle) => bundle.session.id === targetSessionId)
  if (!targetBundle) throw new Error('No s’ha trobat la sessió que vols reajustar.')

  const targetStartsAt = targetBundle.session.startsAt
  const targetDate = String(targetStartsAt).slice(0, 10)
  const targetCanReflow = canReflowSession(targetBundle, targetDate)
  const targetEndsAt = new Date(targetStartsAt).getTime()
    + (Number(targetBundle.session.durationMinutes) || 0) * 60_000
  const canCorrectCurrentSession = targetBundle.session.status === 'held'
    && (options.currentDateKey === targetDate
      || new Date(options.now || new Date().toISOString()).getTime() <= targetEndsAt)
    && targetBundle.items.length === 1
  if (!targetCanReflow && !canCorrectCurrentSession) {
    throw new Error('Aquesta sessió ja té dades de classe i es conserva com a historial.')
  }
  const correctCurrentSession = !targetCanReflow && canCorrectCurrentSession
  const reflowableBundles = applicationBundles.filter((bundle) =>
    bundle.session.startsAt >= targetStartsAt
      && canReflowSession(bundle, targetDate)
      && (!correctCurrentSession || bundle.session.id !== targetSessionId))

  // Els mitjos grups paral·lels comparteixen una única seqüència pedagògica.
  // Per això només incorporem una vegada els elements de cada parella A/B.
  const displacementBundles = correctCurrentSession
    ? [targetBundle, ...reflowableBundles]
    : reflowableBundles
  const displacedItems = groupParallelSessionBundles(displacementBundles)
    .flatMap((group) => [...(group.bundles[0]?.items || [])].sort(compareOrder))
  const activityMeta = new Map()
  const recoveryKey = `agenda-recovery:${recoveryItem.sourceActivityId}`
  activityMeta.set(recoveryKey, {
    sourceActivityId: recoveryItem.sourceActivityId,
    title: recoveryItem.title,
    type: recoveryItem.type || 'activity',
  })
  const activities = correctCurrentSession ? [] : [{
    id: recoveryKey,
    plannedMinutes: minutes,
    title: recoveryItem.title,
    type: recoveryItem.type || 'activity',
  }]
  displacedItems.forEach((item, index) => {
    const key = `agenda-displaced:${item.id || index}`
    activityMeta.set(key, {
      sourceActivityId: item.sourceActivityId || null,
      title: item.title,
      type: item.type || 'activity',
    })
    activities.push({
      id: key,
      plannedMinutes: item.plannedMinutes,
      title: item.title,
      type: item.type || 'activity',
    })
  })

  const distribution = buildActivitySessionDistribution({
    activities,
    application,
    candidates,
    existingSessionBundles: reflowableBundles.map((bundle) => ({ ...bundle, items: [] })),
    options,
  })
  let provisionalSessions = distribution.sessions.map((bundle) => ({
    ...bundle,
    items: bundle.items.map((item) => {
      const meta = activityMeta.get(item.sourceActivityId)
      return createSessionItem({
        ...item,
        sourceActivityId: meta?.sourceActivityId || null,
        title: meta?.title || item.title,
        type: meta?.type || item.type,
      }, options)
    }),
  }))
  let changedTargetResults = []
  if (correctCurrentSession) {
    const originalItem = targetBundle.items[0]
    const replacementItem = createSessionItem({
      ...originalItem,
      plannedMinutes: minutes,
      sourceActivityId: recoveryItem.sourceActivityId,
      title: recoveryItem.title,
      type: recoveryItem.type || 'activity',
    }, options)
    changedTargetResults = (targetBundle.results || []).map((result) => createActivityResult({
      ...result,
      sourceActivityId: recoveryItem.sourceActivityId,
    }, options))
    provisionalSessions = [{
      candidate: {
        date: targetDate,
        durationMinutes: targetBundle.session.durationMinutes,
        startsAt: targetStartsAt,
      },
      isExisting: true,
      items: [replacementItem],
      session: targetBundle.session,
    }, ...provisionalSessions]
  }

  const lockedBundles = applicationBundles.filter((bundle) =>
    !reflowableBundles.includes(bundle) && bundle.session.id !== targetSessionId)
  const activeLockedBundles = lockedBundles.filter((bundle) =>
    !['cancelled', 'notHeld'].includes(bundle.session.status))
  const segmentOffsetByActivityId = {}
  for (const group of groupParallelSessionBundles(activeLockedBundles)) {
    for (const item of group.bundles[0]?.items || []) {
      if (!item.sourceActivityId) continue
      segmentOffsetByActivityId[item.sourceActivityId] = Math.max(
        segmentOffsetByActivityId[item.sourceActivityId] || 0,
        Number(item.segmentIndex) || 0,
      )
    }
  }
  // L'activitat pot provenir d'una calendarització anterior del mateix grup.
  // En aquest cas no forma part dels paquets que reorganitzem, però el seu
  // últim número de fragment continua sent el punt de partida correcte.
  segmentOffsetByActivityId[recoveryItem.sourceActivityId] = Math.max(
    segmentOffsetByActivityId[recoveryItem.sourceActivityId] || 0,
    Number(recoveryItem.segmentIndex) || 0,
  )

  const logicalNewCountByActivityId = {}
  for (const group of groupParallelSessionBundles(provisionalSessions)) {
    for (const item of group.bundles[0]?.items || []) {
      if (!item.sourceActivityId) continue
      logicalNewCountByActivityId[item.sourceActivityId] =
        (logicalNewCountByActivityId[item.sourceActivityId] || 0) + 1
    }
  }
  const totalCountByActivityId = Object.fromEntries(Object.entries(logicalNewCountByActivityId)
    .map(([sourceActivityId, count]) => [
      sourceActivityId,
      (segmentOffsetByActivityId[sourceActivityId] || 0) + count,
    ]))
  const nextIndexByActivityId = { ...segmentOffsetByActivityId }
  const segmentByItemId = new Map()
  for (const group of groupParallelSessionBundles(provisionalSessions)) {
    const representativeItems = group.bundles[0]?.items || []
    representativeItems.forEach((item, itemIndex) => {
      if (!item.sourceActivityId) return
      const segmentIndex = (nextIndexByActivityId[item.sourceActivityId] || 0) + 1
      nextIndexByActivityId[item.sourceActivityId] = segmentIndex
      for (const physicalBundle of group.bundles) {
        const physicalItem = physicalBundle.items[itemIndex]
        if (physicalItem) segmentByItemId.set(physicalItem.id, segmentIndex)
      }
    })
  }
  const sessions = provisionalSessions.map((bundle) => ({
    ...bundle,
    items: bundle.items.map((item) => !item.sourceActivityId ? item : createSessionItem({
      ...item,
      segmentCount: totalCountByActivityId[item.sourceActivityId],
      segmentIndex: segmentByItemId.get(item.id),
    }, options)),
  }))
  const changedLockedItems = activeLockedBundles.flatMap((bundle) => bundle.items || [])
    .filter((item) => item.sourceActivityId && totalCountByActivityId[item.sourceActivityId])
    .filter((item) => Number(item.segmentCount) !== totalCountByActivityId[item.sourceActivityId])
    .map((item) => createSessionItem({
      ...item,
      segmentCount: totalCountByActivityId[item.sourceActivityId],
    }, options))
  const usedSessionIds = new Set(sessions.map((bundle) => bundle.session.id))

  return {
    ...distribution,
    changedLockedItems,
    changedTargetResults,
    correctCurrentSession,
    kind: 'agenda-recovery',
    recoveryItem,
    recoveryMinutes: minutes,
    removedItems: reflowableBundles.flatMap((bundle) => bundle.items || []),
    removedSessions: reflowableBundles
      .map((bundle) => bundle.session)
      .filter((session) => !usedSessionIds.has(session.id)),
    replacedItemCount: reflowableBundles.reduce(
      (total, bundle) => total + (bundle.items || []).length, correctCurrentSession ? 1 : 0),
    sessions,
    shiftedItemCount: displacedItems.length,
    targetBundle,
  }
}

export function getSessionCandidateKey(candidate) {
  return candidateKey(candidate)
}
