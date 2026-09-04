export function antecedentCompetencyKey(name = '') {
  const match = String(name).trim().match(/^(TRANS\s+)?(C\d+)\b/i)
  return match ? `${match[1] ? 'TRANS ' : ''}${match[2].toUpperCase()}` : name
}

export function normalizeAntecedentCompetencies(grades = {}) {
  // Full-name entries may be manual corrections of previously imported short codes.
  const entries = Object.entries(grades || {}).sort(([a], [b]) =>
    Number(a !== antecedentCompetencyKey(a)) - Number(b !== antecedentCompetencyKey(b)))
  return Object.fromEntries(entries.map(([key, value]) => [antecedentCompetencyKey(key), value]))
}
