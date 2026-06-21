export function normalizeCooperativeQualitySnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null

  return {
    criticalGroupCount: Math.max(0, Number(snapshot.criticalGroupCount) || 0),
    incompatibilityCount: Math.max(0, Number(snapshot.incompatibilityCount) || 0),
    label: String(snapshot.label || '').trim() || 'Sense valoració',
    reviewGroupCount: Math.max(0, Number(snapshot.reviewGroupCount) || 0),
    score: Math.max(0, Math.min(100, Number(snapshot.score) || 0)),
    unsupportedStudentCount: Math.max(0, Number(snapshot.unsupportedStudentCount) || 0),
  }
}

export function normalizeCooperativeGenerationMeta(meta) {
  if (!meta || typeof meta !== 'object') {
    return {
      dataSources: [],
      halfGroups: '',
      strategyLabel: '',
      strategySummary: '',
    }
  }

  return {
    dataSources: Array.isArray(meta.dataSources)
      ? meta.dataSources.map((source) => String(source || '').trim()).filter(Boolean)
      : [],
    halfGroups: String(meta.halfGroups || '').trim(),
    strategyLabel: String(meta.strategyLabel || '').trim(),
    strategySummary: String(meta.strategySummary || '').trim(),
  }
}

export function getCooperativeGroupSetOrigin(groupSet) {
  if (groupSet?.sourceGroupSetId) return 'Derivada d’una versió anterior'
  if ((Number(groupSet?.manualChangeCount) || 0) > 0 || groupSet?.sourceType === 'manual') {
    return 'Proposta editada manualment'
  }
  return 'Proposta automàtica'
}
