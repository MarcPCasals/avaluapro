const BLOCKED_OPERATION_MESSAGE = 'Operació no disponible a l’entorn d’assistència.'
const RUNTIME_MARKER = Symbol.for('avaluapro.assistance.runtime-boundary')

function blockedOperation() {
  throw new DOMException(BLOCKED_OPERATION_MESSAGE, 'SecurityError')
}

function resolveUrl(value) {
  const rawValue = typeof value === 'string' || value instanceof URL ? value : value?.url
  return new URL(rawValue, window.location.href)
}

function assertSameOrigin(value) {
  const target = resolveUrl(value)
  const sameHost = target.hostname === window.location.hostname && target.port === window.location.port
  const isHttpOrigin = target.origin === window.location.origin
  const isMatchingWebSocket = sameHost && (
    (window.location.protocol === 'http:' && target.protocol === 'ws:') ||
    (window.location.protocol === 'https:' && target.protocol === 'wss:')
  )
  if (!isHttpOrigin && !isMatchingWebSocket) blockedOperation()
}

function replaceMethod(target, methodName, replacement) {
  if (!target || typeof target[methodName] !== 'function') return
  Object.defineProperty(target, methodName, {
    configurable: true,
    value: replacement,
    writable: false,
  })
}

function blockBrowserStorage() {
  if (window.indexedDB) {
    const indexedDbPrototype = Object.getPrototypeOf(window.indexedDB)
    replaceMethod(indexedDbPrototype, 'open', blockedOperation)
    replaceMethod(indexedDbPrototype, 'deleteDatabase', blockedOperation)
    replaceMethod(indexedDbPrototype, 'databases', blockedOperation)
  }

  if (window.Storage) {
    for (const methodName of ['getItem', 'setItem', 'removeItem', 'clear', 'key']) {
      replaceMethod(window.Storage.prototype, methodName, blockedOperation)
    }
  }

  if (window.CacheStorage) {
    for (const methodName of ['open', 'delete', 'has', 'keys', 'match']) {
      replaceMethod(window.CacheStorage.prototype, methodName, blockedOperation)
    }
  }

  if (window.ServiceWorkerContainer) {
    replaceMethod(window.ServiceWorkerContainer.prototype, 'register', blockedOperation)
  }
}

function restrictNetworkToThisOrigin() {
  const nativeFetch = window.fetch.bind(window)
  window.fetch = (input, init) => {
    assertSameOrigin(input)
    return nativeFetch(input, init)
  }

  const nativeXhrOpen = window.XMLHttpRequest.prototype.open
  replaceMethod(window.XMLHttpRequest.prototype, 'open', function open(method, url, ...rest) {
    assertSameOrigin(url)
    return nativeXhrOpen.call(this, method, url, ...rest)
  })

  const NativeWebSocket = window.WebSocket
  window.WebSocket = class AssistanceWebSocket extends NativeWebSocket {
    constructor(url, protocols) {
      assertSameOrigin(url)
      super(url, protocols)
    }
  }

  if (window.EventSource) {
    const NativeEventSource = window.EventSource
    window.EventSource = class AssistanceEventSource extends NativeEventSource {
      constructor(url, init) {
        assertSameOrigin(url)
        super(url, init)
      }
    }
  }

  if (typeof navigator.sendBeacon === 'function') {
    replaceMethod(Object.getPrototypeOf(navigator), 'sendBeacon', blockedOperation)
  }
}

function expectSecurityBlock(operation, label) {
  try {
    operation()
  } catch (error) {
    if (error instanceof DOMException && error.name === 'SecurityError') return
    throw error
  }
  throw new Error(`La frontera d’assistència no ha bloquejat ${label}.`)
}

function verifyRuntimeBoundary() {
  expectSecurityBlock(() => window.fetch('https://avaluapro-assistance-blocked.invalid'), 'la xarxa externa')
  if (window.indexedDB) {
    expectSecurityBlock(() => window.indexedDB.open('avaluapro-assistance-forbidden-probe'), 'IndexedDB')
  }
  if (window.localStorage) {
    expectSecurityBlock(() => window.localStorage.getItem('avaluapro-assistance-forbidden-probe'), 'localStorage')
  }
  document.documentElement.dataset.runtimeBoundary = 'verified'
}

export function installAssistanceRuntimeBoundary() {
  if (window[RUNTIME_MARKER]) return

  Object.defineProperty(window, RUNTIME_MARKER, {
    configurable: false,
    value: true,
    writable: false,
  })
  document.documentElement.dataset.avaluaproEnvironment = 'assistance'
  document.body.dataset.dataPolicy = 'synthetic-only'

  blockBrowserStorage()
  restrictNetworkToThisOrigin()
  verifyRuntimeBoundary()
}

export { BLOCKED_OPERATION_MESSAGE }
