export const GRADE_OPTIONS = ['', 'A', 'B', 'C', 'D', 'NA']

const PAIR_GRADE_MATRIX = {
  A: { A: 'A', B: 'A', C: 'B', D: 'C', NA: 'C' },
  B: { A: 'A', B: 'B', C: 'B', D: 'C', NA: 'C' },
  C: { A: 'B', B: 'B', C: 'C', D: 'D', NA: 'D' },
  D: { A: 'C', B: 'C', C: 'D', D: 'D', NA: 'D' },
  NA: { A: 'C', B: 'C', C: 'D', D: 'D', NA: 'D' },
}

const THREE_GRADE_MATRIX = {
  AAA: 'A',
  AAB: 'A',
  AAC: 'B',
  AAD: 'B',
  ABB: 'B',
  ABC: 'B',
  ACC: 'B',
  BBB: 'B',
  BBC: 'B',
  ABD: 'C',
  ACD: 'C',
  BBD: 'C',
  BCC: 'C',
  BCD: 'C',
  CCC: 'C',
  CCD: 'C',
  ADD: 'D',
  BDD: 'D',
  CDD: 'D',
  DDD: 'D',
}

const GRADE_SORT_ORDER = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
}

export function getNumericFromGrade(grade) {
  if (grade === 'A') return 4
  if (grade === 'B') return 3
  if (grade === 'C') return 2
  if (grade === 'D' || grade === 'NA') return 1
  return 0
}

export function calculateGrade(marks) {
  const validMarks = marks.filter((mark) => ['A', 'B', 'C', 'D', 'NA'].includes(mark))
  if (validMarks.length === 0) return ''
  if (validMarks.length === 3) {
    const key = validMarks
      .map((mark) => (mark === 'NA' ? 'D' : mark))
      .sort((a, b) => GRADE_SORT_ORDER[a] - GRADE_SORT_ORDER[b])
      .join('')
    return THREE_GRADE_MATRIX[key] || validMarks.reduce((current, next) => combineTwoGrades(current, next))
  }
  return validMarks.reduce((current, next) => combineTwoGrades(current, next))
}

export function combineTwoGrades(firstGrade, secondGrade) {
  if (!firstGrade) return secondGrade || ''
  if (!secondGrade) return firstGrade || ''
  return PAIR_GRADE_MATRIX[firstGrade]?.[secondGrade] || ''
}

export function gradeClassName(grade) {
  return `grade grade-${grade || 'empty'}`
}

export function gradeTextClassName(grade) {
  return `grade-text grade-text-${grade || 'empty'}`
}
