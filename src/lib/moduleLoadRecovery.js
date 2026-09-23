const MODULE_RECOVERY_KEY = 'avaluapro:module-load-recovery'
const MODULE_RECOVERY_COOLDOWN_MS = 60_000

const MODULE_LOAD_ERROR_PATTERNS = [
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
  /loading chunk [^ ]+ failed/i,
  /chunkloaderror/i,
]

function errorMessage(error) {
  if (typeof error === 'string') return error
  if (typeof error?.message === 'string') return error.message
  return ''
}

/**
 * Detecta l'error que es produeix quan una pestanya antiga intenta obrir un
 * mòdul que ja no existeix després d'una publicació nova.
 */
export function isStaleModuleLoadError(error) {
  const message = errorMessage(error)
  return MODULE_LOAD_ERROR_PATTERNS.some((pattern) => pattern.test(message))
}

/**
 * Recarrega l'aplicació una sola vegada. El límit temporal evita un bucle si
 * la connexió continua fallant després d'haver obtingut la versió nova.
 */
export function recoverStaleModuleLoad({
  error,
  force = false,
  now = Date.now(),
  reload,
  storage,
} = {}) {
  if (!force && !isStaleModuleLoadError(error)) return false
  if (typeof reload !== 'function') return false

  let lastAttempt = 0
  try {
    lastAttempt = Number(storage?.getItem(MODULE_RECOVERY_KEY) || 0)
  } catch {
    // Alguns navegadors poden bloquejar sessionStorage; la recàrrega continua sent segura.
  }

  if (lastAttempt > 0 && now - lastAttempt < MODULE_RECOVERY_COOLDOWN_MS) return false

  try {
    storage?.setItem(MODULE_RECOVERY_KEY, String(now))
  } catch {
    // La protecció principal és obtenir l'HTML nou; l'emmagatzematge és només antibucles.
  }

  reload()
  return true
}

/**
 * Vite avisa abans que React rebi l'error d'un mòdul dinàmic. També escoltem
 * les promeses rebutjades per cobrir Safari i pestanyes que fa estona que són obertes.
 */
export function installModuleLoadRecovery(windowObject = globalThis.window) {
  if (!windowObject?.addEventListener) return () => {}

  const attemptRecovery = (event, force = false) => {
    const recovered = recoverStaleModuleLoad({
      error: event?.payload || event?.reason || event,
      force,
      reload: () => windowObject.location.reload(),
      storage: windowObject.sessionStorage,
    })
    if (recovered) event?.preventDefault?.()
  }

  const handlePreloadError = (event) => attemptRecovery(event, true)
  const handleUnhandledRejection = (event) => attemptRecovery(event)

  windowObject.addEventListener('vite:preloadError', handlePreloadError)
  windowObject.addEventListener('unhandledrejection', handleUnhandledRejection)

  return () => {
    windowObject.removeEventListener('vite:preloadError', handlePreloadError)
    windowObject.removeEventListener('unhandledrejection', handleUnhandledRejection)
  }
}
