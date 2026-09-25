const CHANNEL_NAME = 'avaluapro-live-resources-v1'
const LEASE_PREFIX = 'avaluapro-live-resource:'
const DEFAULT_LEASE_TTL_MS = 8000
const DEFAULT_RETRY_MS = 2000

function createOwnerId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function parseSingleTabLease(rawValue, now = Date.now()) {
  try {
    const lease = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue
    if (!lease?.owner || !Number.isFinite(lease.expiresAt) || lease.expiresAt <= now) return null
    return { owner: String(lease.owner), expiresAt: lease.expiresAt }
  } catch {
    return null
  }
}

export function hasForeignLiveLease(rawValue, owner, now = Date.now()) {
  const lease = parseSingleTabLease(rawValue, now)
  return Boolean(lease && lease.owner !== owner)
}

/**
 * Manté una sola font en temps real per recurs i navegador. La pestanya líder
 * rep Firestore i comparteix la resposta amb BroadcastChannel; les altres
 * pestanyes conserven la mateixa interfície sense obrir un listener duplicat.
 * Si el navegador no ofereix els dos mecanismes, es prioritza la continuïtat i
 * cada pestanya obre la seva font com abans.
 */
export function subscribeWithSingleTabLeader({
  environment = typeof window === 'undefined' ? null : window,
  getPayloadKey = () => 'default',
  leaseTtlMs = DEFAULT_LEASE_TTL_MS,
  onError,
  onPayload,
  retryMs = DEFAULT_RETRY_MS,
  scope,
  start,
}) {
  if (!scope || typeof start !== 'function') return () => {}

  let BroadcastChannelClass
  let storage
  try {
    BroadcastChannelClass = environment?.BroadcastChannel
    storage = environment?.localStorage
  } catch {
    BroadcastChannelClass = null
    storage = null
  }
  if (!BroadcastChannelClass || !storage) {
    const stop = start({ emit: onPayload || (() => {}), fail: onError || (() => {}) })
    return typeof stop === 'function' ? stop : () => {}
  }

  const owner = createOwnerId()
  const leaseKey = `${LEASE_PREFIX}${encodeURIComponent(scope)}`
  let channel
  try {
    channel = new BroadcastChannelClass(CHANNEL_NAME)
  } catch {
    const stop = start({ emit: onPayload || (() => {}), fail: onError || (() => {}) })
    return typeof stop === 'function' ? stop : () => {}
  }
  const payloads = new Map()
  let stopped = false
  let leader = false
  let stopSource = null

  const publish = (type, payload) => {
    try {
      channel.postMessage({ owner, payload, scope, type })
    } catch {
      // La resposta local ja s'ha aplicat. Una pestanya incompatible no ha de
      // trencar el listener de la pestanya que té el lideratge.
    }
  }

  const emit = (payload) => {
    if (stopped) return
    payloads.set(getPayloadKey(payload), payload)
    onPayload?.(payload)
    publish('payload', payload)
  }

  const fail = (error) => {
    if (stopped) return
    const message = error?.message || String(error || '')
    onError?.(error)
    publish('error', { message })
  }

  const stopLeading = () => {
    if (!leader && !stopSource) return
    leader = false
    if (typeof stopSource === 'function') stopSource()
    stopSource = null
    payloads.clear()
  }

  const releaseLease = () => {
    try {
      const lease = parseSingleTabLease(storage.getItem(leaseKey))
      if (lease?.owner === owner) storage.removeItem(leaseKey)
    } catch {
      // El listener ja s'ha tancat; no cal bloquejar el desmuntatge.
    }
    publish('released', null)
  }

  const startLeading = () => {
    if (leader || stopped) return
    leader = true
    try {
      const stop = start({ emit, fail })
      stopSource = typeof stop === 'function' ? stop : null
    } catch (error) {
      fail(error)
      stopLeading()
      releaseLease()
    }
  }

  const writeLease = (now = Date.now()) => {
    storage.setItem(leaseKey, JSON.stringify({ owner, expiresAt: now + leaseTtlMs }))
    return parseSingleTabLease(storage.getItem(leaseKey), now)?.owner === owner
  }

  const attemptLeadership = () => {
    if (stopped) return false
    const now = Date.now()
    try {
      const rawLease = storage.getItem(leaseKey)
      if (hasForeignLiveLease(rawLease, owner, now)) {
        stopLeading()
        return false
      }
      if (!writeLease(now)) {
        stopLeading()
        return false
      }
      startLeading()
      return true
    } catch {
      // Si localStorage deixa de funcionar a mig ús, conservem la pantalla
      // activa obrint la font en aquesta pestanya.
      startLeading()
      return true
    }
  }

  channel.onmessage = (event) => {
    const message = event?.data
    if (stopped || !message || message.scope !== scope || message.owner === owner) return
    if (message.type === 'payload') onPayload?.(message.payload)
    if (message.type === 'error') onError?.(new Error(message.payload?.message || 'Error de sincronització.'))
    if (message.type === 'request' && leader) {
      payloads.forEach((payload) => publish('payload', payload))
    }
    if (message.type === 'released' && !leader) attemptLeadership()
  }

  const handleStorage = (event) => {
    if (event.key !== leaseKey || stopped) return
    const lease = parseSingleTabLease(event.newValue)
    if (lease?.owner && lease.owner !== owner) stopLeading()
    if (!lease) attemptLeadership()
  }
  environment.addEventListener?.('storage', handleStorage)

  const intervalId = environment.setInterval(() => {
    if (stopped) return
    const now = Date.now()
    try {
      const lease = parseSingleTabLease(storage.getItem(leaseKey), now)
      if (leader) {
        if (lease?.owner !== owner) {
          stopLeading()
          return
        }
        writeLease(now)
        return
      }
      if (!lease) attemptLeadership()
    } catch {
      startLeading()
    }
  }, retryMs)

  const isLeader = attemptLeadership()
  if (!isLeader) publish('request', null)

  return () => {
    if (stopped) return
    stopped = true
    environment.clearInterval(intervalId)
    environment.removeEventListener?.('storage', handleStorage)
    stopLeading()
    releaseLease()
    channel.close()
  }
}
