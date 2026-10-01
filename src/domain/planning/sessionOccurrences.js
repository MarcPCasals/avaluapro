/** Una franja física és una hora concreta d'una aplicació i un mig grup. */
export function getSessionOccurrenceKey(session = {}) {
  return JSON.stringify([
    session.applicationId || '',
    session.classId || '',
    String(session.startsAt || '').slice(0, 19),
    session.subgroupId || '',
  ])
}

function hasClassroomHistory(bundle) {
  const session = bundle.session
  return session.status !== 'planned'
    || Boolean(session.classroomOpenedAt || session.attendanceConfirmedAt || session.classroomClosedAt)
    || (bundle.results || []).length > 0
}

/**
 * Les còpies previstes d'una mateixa franja no són capacitat lectiva extra.
 * Conserva la revisió més recent. Les sessions passades o amb dades d'aula
 * continuen íntegres; mai no s'interpreten com còpies eliminables.
 */
export function reconcileSessionOccurrences(bundles = [], now = new Date().toISOString()) {
  const byOccurrence = new Map()
  const kept = []
  const duplicates = []
  const nowMs = Date.parse(now)
  for (const bundle of bundles) {
    if (hasClassroomHistory(bundle) || !(Date.parse(bundle.session.startsAt) > nowMs)) {
      kept.push(bundle)
      continue
    }
    const key = getSessionOccurrenceKey(bundle.session)
    const current = byOccurrence.get(key)
    if (!current) {
      byOccurrence.set(key, bundle)
      continue
    }
    const version = (entry) => [
      entry.session.updatedAt || '', entry.session.createdAt || '', entry.session.id || '',
    ].join('|')
    if (version(bundle) > version(current)) {
      duplicates.push(current)
      byOccurrence.set(key, bundle)
    } else {
      duplicates.push(bundle)
    }
  }
  return {
    bundles: [...kept, ...byOccurrence.values()]
      .sort((a, b) => a.session.startsAt.localeCompare(b.session.startsAt)),
    duplicateBundles: duplicates,
  }
}
