const ZONE = 'Europe/Andorra'
const partsFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })

export function planningExpiryDate(expiresAtEpochMs) {
  if (!expiresAtEpochMs) return ''
  const parts = Object.fromEntries(partsFormatter.formatToParts(new Date(expiresAtEpochMs - 1)).map((part) => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}

/** Caduca a les 00:00 de l’endemà, en hora d’Andorra, també amb canvi d’hora. */
export function planningExpiryFromDate(date) {
  if (!date) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('La data de caducitat no és vàlida.')
  const parsed = new Date(`${date}T00:00:00Z`)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new Error('La data de caducitat no és vàlida.')
  const target = parsed.getTime() + 86400000
  let candidate = target
  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = Object.fromEntries(partsFormatter.formatToParts(new Date(candidate)).map((part) => [part.type, part.value]))
    const localAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second))
    candidate -= localAsUtc - target
  }
  return candidate
}

export function isPlanningAccessExpired(grant, now = Date.now()) {
  return grant?.expiresAtEpochMs != null && Number(grant.expiresAtEpochMs) <= now
}
