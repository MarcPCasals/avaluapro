export function normalizeSavedSeatingRestrictions(restrictions = {}) {
  return {
    avoidedZoneByStudentId: { ...(restrictions.avoidedZoneByStudentId || {}) },
    blockedSeatIds: [...(restrictions.blockedSeatIds || [])],
    neverNearPairs: [...(restrictions.neverNearPairs || [])],
    preferredZoneByStudentId: { ...(restrictions.preferredZoneByStudentId || {}) },
    preferNearPairs: [...(restrictions.preferNearPairs || [])],
  }
}

export function getSavedSeatingAssignments(plan, getSeatId) {
  return Object.fromEntries(
    (plan?.seats || []).map((seat) => {
      const x = Number.isFinite(Number(seat.x))
        ? Number(seat.x)
        : Number(seat.block || 0) * 3 + Number(seat.place || 0)
      const y = Number.isFinite(Number(seat.y)) ? Number(seat.y) : Number(seat.row || 0)
      return [seat.studentId, getSeatId(x, y)]
    }),
  )
}

export function getUnseatedStudentIds(studentIds, assignments) {
  const placedStudentIds = new Set(Object.keys(assignments || {}))
  return (studentIds || []).filter((studentId) => !placedStudentIds.has(studentId))
}
