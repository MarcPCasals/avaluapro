export const CROSS_DEVICE_REFRESH_EVENT = 'avaluapro:cross-device-refresh'

export const CROSS_DEVICE_REFRESH_THROTTLE_MS = 15_000

export function shouldRefreshCrossDevice({
  isOnline = true,
  isVisible = true,
  lastRequestedAt = 0,
  now = Date.now(),
  throttleMs = CROSS_DEVICE_REFRESH_THROTTLE_MS,
} = {}) {
  return Boolean(isOnline && isVisible && now - lastRequestedAt >= throttleMs)
}
