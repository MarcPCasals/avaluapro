export function getSeatingObjectiveWeights(objective = 'balanced') {
  return {
    avoid: objective === 'calm' ? 1.7 : 1,
    conflict: objective === 'calm' ? 1.8 : 1,
    support: objective === 'support' ? 2.4 : 1,
    supervision: objective === 'supervision' ? 8 : 0,
    work: objective === 'work' ? 2.2 : 1,
  }
}

export function selectBestSeatingCandidate(candidates = []) {
  return [...candidates].sort(
    (a, b) =>
      b.analysis.score - a.analysis.score ||
      a.analysis.conflicts.length - b.analysis.conflicts.length ||
      a.variant - b.variant,
  )[0] || null
}

export function getSeatingZoneIterationState({
  getZoneId,
  lockedStudentIds = [],
  placements = [],
  seats = [],
  zoneId,
}) {
  const lockedStudents = new Set(lockedStudentIds)
  const recalculatedStudentIds = new Set(
    placements
      .filter(
        (placement) =>
          getZoneId(placement.seat) === zoneId &&
          !lockedStudents.has(placement.studentId),
      )
      .map((placement) => placement.studentId),
  )
  const stableAssignments = Object.fromEntries(
    placements
      .filter((placement) => !recalculatedStudentIds.has(placement.studentId))
      .map((placement) => [placement.studentId, placement.seat.id]),
  )
  const occupiedStableSeatIds = new Set(Object.values(stableAssignments))
  const outsideFreeSeatIds = seats
    .filter(
      (seat) =>
        seat.enabled &&
        getZoneId(seat) !== zoneId &&
        !occupiedStableSeatIds.has(seat.id),
    )
    .map((seat) => seat.id)

  return {
    outsideFreeSeatIds,
    recalculatedStudentIds: [...recalculatedStudentIds],
    stableAssignments,
  }
}
