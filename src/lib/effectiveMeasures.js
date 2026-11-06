export function getEffectiveMeasures(student) {
  return Array.isArray(student?.effectiveMeasures)
    ? student.effectiveMeasures.filter((entry) => entry && typeof entry.measure === 'string' && entry.measure.trim())
    : []
}

export function saveEffectiveMeasure(measures, draft, id, now = new Date().toISOString()) {
  const measure = String(draft.measure || '').trim()
  const context = String(draft.context || '').trim()
  const reviewedOn = String(draft.reviewedOn || '').trim()
  if (!measure || !context) return measures

  const existing = measures.find((entry) => entry.id === id)
  const entry = {
    id,
    measure,
    context,
    reviewedOn,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }
  return existing
    ? measures.map((item) => item.id === id ? entry : item)
    : [...measures, entry]
}

export function formatMeasureReviewDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return ''
  return new Date(`${value}T12:00:00`).toLocaleDateString('ca-AD', { day: 'numeric', month: 'long', year: 'numeric' })
}
