export function normalizeEducandEmail(value) {
  const cleanValue = String(value || '').trim().toLowerCase()
  if (!cleanValue) return ''
  return cleanValue.includes('@') ? cleanValue : `${cleanValue}@educand.ad`
}
