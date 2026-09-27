export const DATA_CAPABILITIES = Object.freeze([
  'authentication',
  'cloudRead',
  'cloudWrite',
  'localPersistence',
  'realBackupImport',
  'export',
  'messaging',
  'sharing',
])

export const ASSISTANCE_CAPABILITIES = Object.freeze(
  Object.fromEntries(DATA_CAPABILITIES.map((capability) => [capability, false])),
)

export const ALLOWED_EVALUATIONS = Object.freeze(['A', 'B', 'C', 'D'])
export const ALLOWED_MARKS = Object.freeze(['A', 'B', 'C', 'D', 'NA'])

export function assertAssistanceAdapter(adapter) {
  if (!adapter || adapter.kind !== 'assistance-memory') {
    throw new Error('L’entorn d’assistència requereix un adaptador exclusiu en memòria.')
  }

  const capabilities = adapter.getCapabilities()
  DATA_CAPABILITIES.forEach((capability) => {
    if (capabilities[capability] !== false) {
      throw new Error(`Capacitat prohibida a l’entorn d’assistència: ${capability}.`)
    }
  })

  return true
}
