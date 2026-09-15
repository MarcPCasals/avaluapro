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

export function getDueTutoringReminders(items = [], uid = '', now = new Date()) {
  const nowIso = now.toISOString()
  return getOpenTutoringReminders(items, uid).filter((item) => item.dueAt && item.dueAt <= nowIso)
}

export function getTutoringCoordinationCounts(items = [], memberStates = [], uid = '') {
  return {
    due: getDueTutoringReminders(items, uid).length,
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
