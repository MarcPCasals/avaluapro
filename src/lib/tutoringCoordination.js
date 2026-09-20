export function sortTutoringCoordinationItems(items = []) {
  return [...items].sort((a, b) =>
    String(a.createdAt || '').localeCompare(String(b.createdAt || '')) || String(a.id || '').localeCompare(String(b.id || '')),
  )
}

export function mergeTutoringCoordinationItems(remoteItems = [], pendingItems = []) {
  const byId = new Map(remoteItems.map((item) => [item.id, { ...item, syncStatus: 'synced' }]))
  pendingItems.forEach((item) => byId.set(item.id, { ...item, syncStatus: 'pending' }))
  return sortTutoringCoordinationItems(Array.from(byId.values()))
}

export function getTutoringCoordinationReadState(memberStates = [], spaceId, uid) {
  return memberStates.find((state) => state.spaceId === spaceId && state.uid === uid) || null
}

export function getUnreadTutoringCoordinationItems(items = [], memberStates = [], uid = '') {
  if (!uid) return []
  return items.filter((item) => {
    if (!item?.spaceId || item.deletedAt || item.authorUid === uid) return false
    const readState = getTutoringCoordinationReadState(memberStates, item.spaceId, uid)
    return String(item.createdAt || '') > String(readState?.lastReadAt || '')
  })
}

export function getOpenTutoringReminders(items = [], uid = '') {
  return items.filter(
    (item) =>
      item.kind === 'reminder' &&
      item.status === 'open' &&
      !item.deletedAt &&
      (!item.assigneeUid || item.assigneeUid === 'all' || item.assigneeUid === uid),
  )
}

function getCalendarDateTime(value, timeZone = 'Europe/Andorra') {
  const date = new Date(value || '')
  if (Number.isNaN(date.getTime())) return null
  const parts = new Intl.DateTimeFormat('ca-AD', {
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    timeZone,
    year: 'numeric',
  }).formatToParts(date)
  const valueByType = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    date: `${valueByType.year}-${valueByType.month}-${valueByType.day}`,
    time: `${valueByType.hour}:${valueByType.minute}`,
  }
}

/**
 * Projecta els recordatoris compartits a l'Agenda sense duplicar-los.
 * L'assignatari continua controlant els avisos emergents, però el calendari és
 * comú: qualsevol recordatori amb data és visible per tots dos cotutors.
 */
export function getTutoringCalendarReminders(
  items = [],
  classes = [],
  spaces = [],
  timeZone = 'Europe/Andorra',
) {
  const classBySpaceId = new Map(
    classes
      .filter((classItem) => classItem.sharedTutoringSpaceId)
      .map((classItem) => [classItem.sharedTutoringSpaceId, classItem]),
  )
  const spaceById = new Map(spaces.map((space) => [space.id, space]))

  return items
    .filter((item) => item.kind === 'reminder' && item.status === 'open' && !item.deletedAt && item.dueAt)
    .map((item) => {
      const dateTime = getCalendarDateTime(item.dueAt, timeZone)
      if (!dateTime) return null
      const classItem = classBySpaceId.get(item.spaceId)
      const classLabel = classItem?.name || spaceById.get(item.spaceId)?.className || 'Tutoria compartida'
      return {
        classItem,
        classLabel,
        coordinationItem: item,
        detail: `Cotutoria compartida · ${classLabel}`,
        id: `tutoring_${item.spaceId}_${item.id}`,
        kind: 'tutoring',
        reminder: dateTime,
        spaceId: item.spaceId,
        title: item.text || 'Recordatori de cotutoria',
      }
    })
    .filter(Boolean)
    .sort((left, right) =>
      `${left.reminder.date}T${left.reminder.time}`.localeCompare(
        `${right.reminder.date}T${right.reminder.time}`,
      ),
    )
}

export function getDueTutoringReminders(items = [], uid = '', now = new Date()) {
  const warningLimit = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString()
  return getOpenTutoringReminders(items, uid).filter((item) => item.dueAt && item.dueAt <= warningLimit)
}

export function getTutoringReminderAcknowledgementKey(item, stage) {
  if (!item?.id || !item?.dueAt || !['pre', 'due'].includes(stage)) return ''
  return `${item.id}:${stage}:${item.dueAt}`
}

export function hasTutoringReminderAcknowledgement(item, memberStates = [], uid = '') {
  const memberState = getTutoringCoordinationReadState(memberStates, item?.spaceId, uid)
  return ['pre', 'due'].some((stage) => {
    const key = getTutoringReminderAcknowledgementKey(item, stage)
    return key && memberState?.reminderAcknowledgements?.[key]
  })
}

export function getPendingTutoringReminderAlerts(
  items = [],
  memberStates = [],
  uid = '',
  now = new Date(),
) {
  if (!uid) return []
  const nowMs = now.getTime()
  if (Number.isNaN(nowMs)) return []

  return getOpenTutoringReminders(items, uid)
    .map((item) => {
      const dueMs = new Date(item.dueAt || '').getTime()
      if (Number.isNaN(dueMs)) return null
      const remainingMs = dueMs - nowMs
      const reminderStage = remainingMs <= 2 * 60 * 60 * 1000
        ? 'due'
        : remainingMs <= 24 * 60 * 60 * 1000
          ? 'pre'
          : ''
      if (!reminderStage) return null

      const memberState = getTutoringCoordinationReadState(memberStates, item.spaceId, uid)
      const acknowledgementKey = getTutoringReminderAcknowledgementKey(item, reminderStage)
      if (memberState?.reminderAcknowledgements?.[acknowledgementKey]) return null
      return { ...item, reminderStage }
    })
    .filter(Boolean)
    .sort((a, b) => String(a.dueAt || '').localeCompare(String(b.dueAt || '')))
}

export function getUrgentTutoringMessages(items = []) {
  return sortTutoringCoordinationItems(items)
    .filter((item) => item.kind === 'urgent' && !item.deletedAt)
    .reverse()
}

export function getTutoringCoordinationCounts(items = [], memberStates = [], uid = '') {
  return {
    due: getPendingTutoringReminderAlerts(items, memberStates, uid).length,
    open: getOpenTutoringReminders(items, uid).length,
    unread: getUnreadTutoringCoordinationItems(items, memberStates, uid).length,
  }
}

export function groupTutoringCoordinationItemsByStudent(items = [], students = []) {
  const studentById = new Map(students.map((student) => [student.id, student]))
  const groups = new Map()

  sortTutoringCoordinationItems(items)
    .filter((item) => !item.deletedAt)
    .forEach((item) => {
      const student = studentById.get(item.studentId)
      const key = student ? student.id : ''
      if (!groups.has(key)) {
        groups.set(key, {
          items: [],
          label: student?.name || 'Missatges generals',
          student,
          studentId: key,
        })
      }
      groups.get(key).items.push(item)
    })

  return Array.from(groups.values()).sort((a, b) => {
    if (!a.studentId) return 1
    if (!b.studentId) return -1
    return a.label.localeCompare(b.label, 'ca')
  })
}

export function getTutorialRecordIdForCoordinationItem(itemId = '') {
  const safeItemId = String(itemId).replaceAll('/', '_').trim()
  return safeItemId ? `trecord_coord_${safeItemId}` : ''
}

export function isCoordinationItemInTutorialRecords(itemId, tutorialRecords = []) {
  if (!itemId) return false
  const recordId = getTutorialRecordIdForCoordinationItem(itemId)
  return tutorialRecords.some(
    (record) => record.id === recordId || record.sourceCoordinationItemId === itemId,
  )
}

export function buildTutorialRecordFromCoordinationItem({
  classId,
  importedByEmail = '',
  importedByUid = '',
  item,
  now = new Date().toISOString(),
}) {
  if (!classId || !item?.id || !item.studentId || !String(item.text || '').trim()) return null

  return {
    authorEmail: item.authorEmail || '',
    authorName: item.authorName || item.authorEmail || '',
    classId,
    createdAt: now,
    date: String(item.createdAt || now).slice(0, 10),
    id: getTutorialRecordIdForCoordinationItem(item.id),
    importedAt: now,
    importedByEmail,
    importedByUid,
    note: String(item.text).trim(),
    source: 'tutoring-coordination',
    sourceCoordinationItemId: item.id,
    sourceCoordinationSpaceId: item.spaceId || '',
    sourceMessageCreatedAt: item.createdAt || '',
    studentId: item.studentId,
    type: 'tutorial-observation',
    updatedAt: now,
  }
}
