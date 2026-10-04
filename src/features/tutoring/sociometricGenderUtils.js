import { countStudentGenders } from './genderBalanceUtils.js'

// Two-sided exact random-label comparison with fixed category totals.
// The probability ordering is the same as Fisher's 2x2 exact test:
// https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.fisher_exact.html
export function exactGenderAssociation(a, b, c, d) {
  const n = a + b + c + d
  const row = a + b
  const column = a + c
  if (!row || row === n || !column || column === n) return 1
  const logFactorial = [0]
  for (let i = 1; i <= n; i += 1) logFactorial[i] = logFactorial[i - 1] + Math.log(i)
  const choose = (total, k) => logFactorial[total] - logFactorial[k] - logFactorial[total - k]
  const probability = (x) => Math.exp(choose(column, x) + choose(n - column, row - x) - choose(n, row))
  const observed = probability(a)
  let p = 0
  for (let x = Math.max(0, row - (n - column)); x <= Math.min(row, column); x += 1) {
    const value = probability(x)
    if (value <= observed * (1 + 1e-10)) p += value
  }
  return Math.min(1, p)
}

export function summarizeSociometricGender(students, rows, hasRelations) {
  const counts = countStudentGenders(students)
  const byId = new Map(rows.map((row) => [row.student.id, row]))
  const groups = ['boy', 'girl'].map((gender) => {
    const members = students.filter((student) => student.gender === gender && byId.has(student.id))
    return { gender, total: members.length,
      rejected: members.filter((student) => byId.get(student.id).category === 'Rebutjat').length,
      leaders: members.filter((student) => byId.get(student.id).category === 'Líder').length,
      averageRejection: members.length ? members.reduce((sum, student) => sum + (byId.get(student.id).avoidReceived || 0), 0) / members.length : null,
    }
  })
  const eligible = hasRelations && counts.unknown === 0 && rows.length === students.length && groups.every((group) => group.total >= 5)
  const comparisons = ['rejected', 'leaders'].map((metric) => {
    const [boys, girls] = groups
    const p = exactGenderAssociation(boys[metric], boys.total - boys[metric], girls[metric], girls.total - girls[metric])
    return { metric, p: eligible ? p : null, adjustedP: eligible ? Math.min(1, p * 2) : null,
      signal: eligible && p * 2 < 0.05,
      higher: boys.total && girls.total && boys[metric] / boys.total !== girls[metric] / girls.total
        ? boys[metric] / boys.total > girls[metric] / girls.total ? 'boy' : 'girl' : null }
  })
  return { counts, groups, comparisons, eligible, hasRelations }
}
