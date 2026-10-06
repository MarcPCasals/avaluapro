import { normalizeResourceSections } from './documents.js'

export const RESOURCE_SCOPES = { specific: 'Competències específiques', transversal: 'Competències transversals' }
export const RESOURCE_CATEGORIES = { factsAndConcepts: 'Fets i conceptes', procedures: 'Procediments', attitudesAndValues: 'Actituds i valors' }

export function comparableResourceText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[‘’]/g, "'").replace(/([A-Z]+\d+)(?=[A-Za-zÀ-ÿ])/g, '$1 ')
    .replace(/\s+/g, ' ').trim().toLocaleLowerCase('ca')
}

export function resourceKey(resource) {
  return JSON.stringify([resource.scope, resource.category, comparableResourceText(resource.text)])
}

export function normalizeActivityResourceSelections(values = []) {
  const result = new Map()
  for (const value of Array.isArray(values) ? values : []) {
    if (!RESOURCE_SCOPES[value?.scope] || !RESOURCE_CATEGORIES[value?.category]) continue
    const text = String(value.text || '').replace(/\s+/g, ' ').trim()
    if (!text) continue
    const resource = { scope: value.scope, category: value.category, text }
    result.set(resourceKey(resource), resource)
  }
  return [...result.values()]
}

export function getPlanningResources(unit = {}) {
  const sections = normalizeResourceSections(unit.resourceSections, unit)
  return normalizeActivityResourceSelections(Object.keys(RESOURCE_SCOPES).flatMap(scope =>
    Object.keys(RESOURCE_CATEGORIES).flatMap(category => (sections[scope][category] || []).map(text => ({ scope, category, text })))))
}

/** Cada línia és un recurs. Els encapçalaments restringeixen la coincidència. */
export function matchPastedResources(input, resources) {
  let category = null
  let scope = null
  const matches = new Map()
  const unmatched = []
  for (const line of String(input || '').split(/\r?\n/)) {
    const text = line.replace(/^\s*[-•]\s*/, '').trim()
    if (!text) continue
    const heading = comparableResourceText(text).replace(/:$/, '')
    const categoryEntry = Object.entries(RESOURCE_CATEGORIES).find(([, label]) => comparableResourceText(label) === heading)
    const scopeEntry = Object.entries(RESOURCE_SCOPES).find(([, label]) => comparableResourceText(label) === heading)
    if (categoryEntry) { category = categoryEntry[0]; continue }
    if (scopeEntry) { scope = scopeEntry[0]; category = null; continue }
    const candidates = resources.filter(resource => (!category || resource.category === category)
      && (!scope || resource.scope === scope) && comparableResourceText(resource.text) === comparableResourceText(text))
    if (candidates.length === 1) matches.set(resourceKey(candidates[0]), candidates[0])
    else unmatched.push({ text, reason: candidates.length ? 'Hi ha més d’una coincidència; selecciona-la a la llista.' : 'No s’ha trobat a la llista de la UP.' })
  }
  return { matches: [...matches.values()], unmatched }
}

/** Cobertura derivada dels vincles: retirar o eliminar una activitat la recalcula. */
export function getResourceCoverage(resources, activities = [], completedActivityIds = new Set()) {
  return resources.map(resource => {
    const key = resourceKey(resource)
    const linkedActivities = activities.filter(activity => normalizeActivityResourceSelections(activity.resourceSelections)
      .some(selection => resourceKey(selection) === key))
    return { ...resource, key, activities: linkedActivities, completed: linkedActivities.some(activity => completedActivityIds.has(activity.id)) }
  })
}
