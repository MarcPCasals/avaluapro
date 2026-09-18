const OPTIONAL_MODULES = new Set(['planning', 'agenda'])

function getPreviewModules(search = '') {
  const params = new URLSearchParams(search)
  const requestedModules = String(params.get('preview') || '')
    .split(',')
    .map((moduleName) => moduleName.trim().toLowerCase())
    .filter(Boolean)

  if (requestedModules.includes('all')) return new Set(OPTIONAL_MODULES)
  return new Set(requestedModules.filter((moduleName) => OPTIONAL_MODULES.has(moduleName)))
}

const previewModules = getPreviewModules(typeof window === 'undefined' ? '' : window.location.search)

// These flags only expose empty module shells. They do not grant permissions or enable new Firebase collections.
export const featureFlags = Object.freeze({
  agenda: previewModules.has('agenda'),
  planning: previewModules.has('planning'),
})

export function isOptionalModeEnabled(mode) {
  if (mode === 'agenda') return featureFlags.agenda
  if (mode === 'planning') return featureFlags.planning
  return true
}

export { getPreviewModules }
