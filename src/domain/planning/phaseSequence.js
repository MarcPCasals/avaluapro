/** L'ordre és entre germans: cada fase precedeix totes les seves subfases. */
export function orderPlanningPhases(phases = []) {
  const byParent = new Map()
  const visited = new Set()
  const ordered = []
  for (const phase of phases) {
    const parent = phase.parentPhaseId || null
    byParent.set(parent, [...(byParent.get(parent) || []), phase])
  }
  const compare = (a, b) => Number(a.order || 0) - Number(b.order || 0)
  for (const siblings of byParent.values()) siblings.sort(compare)
  const visit = (phase, depth) => {
    if (visited.has(phase.id)) return
    visited.add(phase.id)
    ordered.push({ ...phase, depth })
    for (const child of byParent.get(phase.id) || []) visit(child, depth + 1)
  }
  for (const root of byParent.get(null) || []) visit(root, 0)
  // Conserva també una fase òrfena; evita bucles en estructures incompletes.
  for (const phase of [...phases].sort(compare)) visit(phase, 0)
  return ordered
}
