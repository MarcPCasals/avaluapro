/** Read the saved tutoring plans directly; never create a second seating configuration. */
export function getClassTutorialSeatingPlans(plans, classId) {
  return (plans || []).filter(plan => plan.classId === classId)
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))
}

export function buildTutorialSeatingMirror(plan, students, halfGroup = 'all') {
  const layout = plan?.layout || {}
  const blocks = (layout.blocks || []).map(Number).filter(n => Number.isInteger(n) && n > 0)
  const columns = blocks.length ? blocks.reduce((sum, n) => sum + n, 0) : Number(layout.columns) || 9
  const rows = Number(layout.rows) || 5
  const byId = new Map(students.map(student => [student.id, student]))
  const placements = new Map((plan?.seats || []).map(seat => {
    const x = Number(seat.x ?? Number(seat.block || 0) * 3 + Number(seat.place || 0))
    const y = Number(seat.y ?? seat.row ?? 0)
    return [`seat_${x}_${y}`, seat]
  }))
  const defaults = [[0, 1, 3, 4, 5, 7, 8], [0, 1, 3, 4, 5, 7, 8], [0, 1, 4, 5, 7, 8], [0, 1, 4, 5, 8], []]
  const active = new Set(layout.activeSeatIds?.length ? layout.activeSeatIds
    : blocks.length ? Array.from({ length: rows * columns }, (_, i) => `seat_${i % columns}_${Math.floor(i / columns)}`)
      : defaults.flatMap((xs, y) => xs.map(x => `seat_${x}_${y}`)))
  const blocked = new Set(layout.seatingRestrictions?.blockedSeatIds || [])
  const blockStarts = blocks.slice(0, -1).map((_, i) => blocks.slice(0, i + 1).reduce((sum, n) => sum + n, 0))
  const seats = Array.from({ length: rows * columns }, (_, i) => {
    const x = i % columns, y = Math.floor(i / columns), id = `seat_${x}_${y}`
    const saved = placements.get(id)
    const student = byId.get(saved?.studentId)
    const group = saved?.halfGroup || student?.halfGroup || ''
    return { id, x, y, active: active.has(id) || Boolean(saved), blocked: blocked.has(id), student,
      visible: halfGroup === 'all' || group === halfGroup, group, blockStart: blockStarts.includes(x) }
  })
  return { columns, rows, seats, teacherDeskSide: ['left', 'center', 'right'].includes(layout.teacherDeskSide) ? layout.teacherDeskSide : 'left' }
}
