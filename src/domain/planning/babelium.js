import { createSessionItem } from './model.js'

export const BABELIUM_MINUTES = 30

export function isBabeliumItem(item) {
  return item?.id === `babelium_${item?.sessionId}`
}

export function createBabeliumItem(session, options = {}) {
  return createSessionItem({
    id: `babelium_${session.id}`,
    ownerUid: session.ownerUid,
    applicationId: session.applicationId,
    sessionId: session.id,
    type: 'activity',
    title: 'Babèlium · Lectura autònoma',
    plannedMinutes: BABELIUM_MINUTES,
    order: 0,
  }, options)
}

/** Aplica els canvis d’horari només a sessions sense historial de classe. */
export function withBabelium(bundle, slot, options = {}) {
  const { session } = bundle
  if (session.status !== 'planned' || session.classroomOpenedAt
    || session.attendanceConfirmedAt || session.classroomClosedAt
    || (bundle.results || []).length) return {
    ...bundle, items: [...(bundle.items || [])].sort((left, right) =>
      Number(isBabeliumItem(right)) - Number(isBabeliumItem(left)) || Number(left.order) - Number(right.order)),
  }
  const enabled = slot ? Boolean(slot.babeliumEnabled) : Boolean(session.babeliumEnabled)
  const nextSession = { ...session, babeliumEnabled: enabled }
  const regularItems = (bundle.items || []).filter((item) => !isBabeliumItem(item))
  const fixedItem = enabled
    ? (bundle.items || []).find(isBabeliumItem) || createBabeliumItem(nextSession, options) : null
  return {
    ...bundle,
    session: nextSession,
    items: enabled ? [fixedItem, ...regularItems] : regularItems,
    removedBabeliumItems: enabled ? [] : (bundle.items || []).filter(isBabeliumItem),
  }
}
