export const MAIN_SEATING_ROOM = { roomId: 'main', roomName: 'Aula principal' }

export function normalizeSeatingContext(context = {}) {
  return {
    roomId: String(context?.roomId || 'main'),
    roomName: String(context?.roomName || 'Aula principal').trim() || 'Aula principal',
    halfGroup: ['A', 'B'].includes(context?.halfGroup) ? context.halfGroup : 'all',
  }
}

export function getSeatingContextKey(context) {
  const { roomId, halfGroup } = normalizeSeatingContext(context)
  return JSON.stringify([roomId, halfGroup])
}

export function isSameSeatingContext(firstPlan, secondPlan) {
  return getSeatingContextKey(firstPlan?.layout?.seatingContext) === getSeatingContextKey(secondPlan?.layout?.seatingContext)
}

export function getSeatingHalfGroup(value) {
  const name = String(value || '').trim().toUpperCase()
  if (name === 'A' || /(?:GRUP|GROUP)\s*A$/.test(name)) return 'A'
  if (name === 'B' || /(?:GRUP|GROUP)\s*B$/.test(name)) return 'B'
  return ''
}

export function getSeatingStudents(students, context) {
  const { halfGroup } = normalizeSeatingContext(context)
  return halfGroup === 'all' ? students : students.filter(student => getSeatingHalfGroup(student.halfGroup) === halfGroup)
}

export function getSeatingRooms(plans, extraRooms = []) {
  const rooms = new Map([['main', MAIN_SEATING_ROOM]])
  for (const context of [...plans.map(plan => plan.layout?.seatingContext), ...extraRooms]) {
    const normalized = normalizeSeatingContext(context)
    if (normalized.roomId !== 'main') rooms.set(normalized.roomId, normalized)
  }
  return [...rooms.values()]
}

export function getSessionSeatingPlans({ plans = [], classes = [], session = {} }) {
  const sessionClass = classes.find(item => item.id === session.classId)
  const rosterClassId = sessionClass?.tutorialLinkedClassId || session.classId
  const classIds = new Set([session.classId, rosterClassId, ...classes
    .filter(item => item.tutorialLinkedClassId === rosterClassId).map(item => item.id)])
  const halfGroup = getSeatingHalfGroup(session.subgroupId) || 'all'
  return plans.filter(plan => classIds.has(plan.classId) && plan.isActive &&
    normalizeSeatingContext(plan.layout?.seatingContext).halfGroup === halfGroup)
    .sort((a, b) => {
      const aContext = normalizeSeatingContext(a.layout?.seatingContext)
      const bContext = normalizeSeatingContext(b.layout?.seatingContext)
      const preferred = session.roomId || 'main'
      return Number(bContext.roomId === preferred) - Number(aContext.roomId === preferred) ||
        String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''))
    })
}
