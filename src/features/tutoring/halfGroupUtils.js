import { halfGroupGenderGap } from './genderBalanceUtils.js'
export const HALF_GROUP_NAMES = ['Grup A', 'Grup B']

export function analyzeHalfGroups(students, relations, assignments) {
  const ids = new Set(students.map((student) => student.id))
  const result = { work: 0, negative: 0, positive: 0, conflicts: [], internalRelations: [] }
  for (const relation of relations) {
    const { sourceStudentId: source, targetStudentId: target } = relation
    if (source === target || !ids.has(source) || !ids.has(target) ||
        !assignments[source] || assignments[source] !== assignments[target]) continue
    if (!['positive', 'friendship', 'avoid'].includes(relation.type)) continue
    result.internalRelations.push(relation)
    const strength = Math.max(1, Math.min(5, Number(relation.strength) || 1))
    if (relation.type === 'positive') result.work += strength
    if (relation.type === 'friendship') result.positive += strength
    if (relation.type === 'avoid') {
      result.negative += strength
      result.conflicts.push(relation)
    }
  }
  return result
}

// Lexicographic comparison: social affinity never compensates for lost work
// relationships or additional negative relationships.
function isBetter(a, b) {
  return !b || a.genderGap < b.genderGap || (a.genderGap === b.genderGap && (a.work > b.work ||
    (a.work === b.work && (a.negative < b.negative ||
      (a.negative === b.negative && a.positive > b.positive)))))
}

export function proposeHalfGroups(students, relations, locks = {}) {
  const ordered = [...students].sort((a, b) => a.id.localeCompare(b.id))
  const activeLocks = Object.fromEntries(ordered.filter((student) => HALF_GROUP_NAMES.includes(locks[student.id])).map((student) => [student.id, locks[student.id]]))
  const lockedA = Object.values(activeLocks).filter((name) => name === HALF_GROUP_NAMES[0]).length
  const lockedB = Object.values(activeLocks).length - lockedA
  const maxSize = Math.ceil(ordered.length / 2)
  if (lockedA > maxSize || lockedB > maxSize) throw new Error('Els bloquejos impedeixen equilibrar els mitjos grups. Desbloqueja algun alumne.')
  const sizeA = lockedB > Math.floor(ordered.length / 2) ? Math.floor(ordered.length / 2) : maxSize
  let best = null
  let bestScore = null
  const evaluate = (assignments) => {
    const score = { ...analyzeHalfGroups(ordered, relations, assignments), genderGap: halfGroupGenderGap(ordered, assignments) }
    if (isBetter(score, bestScore)) {
      best = { ...assignments }
      bestScore = score
    }
    return score
  }
  if (ordered.length <= 18) {
    const visit = (index, remaining, assignments) => {
      if (remaining < 0 || remaining > ordered.length - index) return
      if (index === ordered.length) { evaluate(assignments); return }
      const fixed = activeLocks[ordered[index].id]
      if (fixed) {
        assignments[ordered[index].id] = fixed
        visit(index + 1, remaining - (fixed === HALF_GROUP_NAMES[0] ? 1 : 0), assignments)
        return
      }
      assignments[ordered[index].id] = HALF_GROUP_NAMES[0]
      visit(index + 1, remaining - 1, assignments)
      assignments[ordered[index].id] = HALF_GROUP_NAMES[1]
      visit(index + 1, remaining, assignments)
    }
    visit(0, sizeA, {})
  } else {
    // Deterministic multiple starts and improving swaps preserve equal sizes.
    let seed = 719
    for (let start = 0; start < 40; start += 1) {
      const shuffled = ordered.filter((student) => !activeLocks[student.id])
      for (let index = shuffled.length - 1; index > 0; index -= 1) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
        const other = seed % (index + 1)
        ;[shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]]
      }
      const assignments = { ...activeLocks, ...Object.fromEntries(shuffled.map((student, index) =>
        [student.id, HALF_GROUP_NAMES[index < sizeA - lockedA ? 0 : 1]])) }
      let score = evaluate(assignments)
      for (let pass = 0; pass < ordered.length; pass += 1) {
        let swap = null
        let nextScore = score
        for (const a of ordered) for (const b of ordered) {
          if (activeLocks[a.id] || activeLocks[b.id]) continue
          if (assignments[a.id] !== HALF_GROUP_NAMES[0] || assignments[b.id] !== HALF_GROUP_NAMES[1]) continue
          assignments[a.id] = HALF_GROUP_NAMES[1]
          assignments[b.id] = HALF_GROUP_NAMES[0]
          const candidate = { ...analyzeHalfGroups(ordered, relations, assignments), genderGap: halfGroupGenderGap(ordered, assignments) }
          if (isBetter(candidate, nextScore)) { swap = [a.id, b.id]; nextScore = candidate }
          assignments[a.id] = HALF_GROUP_NAMES[0]
          assignments[b.id] = HALF_GROUP_NAMES[1]
        }
        if (!swap) break
        assignments[swap[0]] = HALF_GROUP_NAMES[1]
        assignments[swap[1]] = HALF_GROUP_NAMES[0]
        score = evaluate(assignments)
      }
    }
  }
  // Keep A/B labels aligned with existing assignments where possible.
  const matches = ordered.filter((student) => student.halfGroup === best[student.id]).length
  const reverseMatches = ordered.filter((student) => student.halfGroup ===
    HALF_GROUP_NAMES[best[student.id] === HALF_GROUP_NAMES[0] ? 1 : 0]).length
  if (Object.keys(activeLocks).length === 0 && ordered.length % 2 === 0 && reverseMatches > matches) {
    best = Object.fromEntries(ordered.map((student) => [student.id,
      HALF_GROUP_NAMES[best[student.id] === HALF_GROUP_NAMES[0] ? 1 : 0]]))
  }
  return best
}
