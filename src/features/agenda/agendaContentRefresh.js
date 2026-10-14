// This action reads only source content. It never loads, saves or schedules sessions.
const CONTENT_FIELDS = ['description', 'teacherMaterials', 'studentMaterials']

function sourceUnitId(bundle, item) {
  return item.sourcePlanningUnitId || item.sourceActivity?.planningUnitId || bundle.planningUnit.id
}

export async function loadAgendaContentRefresh({ bundles, repository, loadStructure, loadOverrides }) {
  const unitIds = [...new Set(bundles.flatMap((bundle) => [
    bundle.planningUnit.id,
    ...bundle.items.filter((item) => item.sourceActivityId).map((item) => sourceUnitId(bundle, item)),
  ]))]
  const applications = [...new Map(bundles.map((bundle) => [
    `${bundle.planningUnit.id}:${bundle.application.id}`, bundle,
  ])).values()]
  const options = { completeSnapshot: true, forceRemote: true }
  const [structures, overrides] = await Promise.all([
    Promise.all(unitIds.map((id) => repository.loadScope(
      `planningUnit:${id}:structure`,
      async () => {
        const structure = await loadStructure(id)
        return [structure.planningUnit, ...structure.phases, ...structure.activities]
      }, options,
    ))),
    Promise.all(applications.map((bundle) => repository.loadScope(
      `application:${bundle.application.id}:overrides`,
      async () => (await loadOverrides(bundle.planningUnit.id, bundle.application.id))
        .map((entity) => ({ entity, context: { planningUnitId: bundle.planningUnit.id, applicationId: bundle.application.id } })),
      options,
    ))),
  ])
  const failed = [...structures, ...overrides].find((result) => result.error)
  if (failed) throw failed.error
  if ([...structures, ...overrides].some((result) => result.source === 'local')) {
    throw new Error('Cal connexió per actualitzar les descripcions i els materials de la Programació.')
  }
  return {
    sessionIds: new Set(bundles.map((bundle) => bundle.session.id)),
    structures: new Map(unitIds.map((id, index) => [id, structures[index].entities])),
    overrides: new Map(applications.map((bundle, index) => [
      `${bundle.planningUnit.id}:${bundle.application.id}`, overrides[index].entities,
    ])),
  }
}

export function refreshPlanningUnitMaterials(planningUnit, entities = []) {
  const source = entities.find((entity) => entity.entityType === 'planningUnit' && entity.id === planningUnit.id)
  return source ? { ...planningUnit, transversalMaterials: structuredClone(source.transversalMaterials || []) } : planningUnit
}

/** An explicit allowlist protects every scheduling field, even if the source changed. */
export function refreshAgendaBundleContent(bundle, refresh) {
  if (!refresh.sessionIds.has(bundle.session.id)) return bundle
  const overrides = [...(refresh.overrides.get(`${bundle.planningUnit.id}:${bundle.application.id}`) || [])]
    .sort((left, right) => String(left.updatedAt || left.createdAt || '').localeCompare(String(right.updatedAt || right.createdAt || '')))
  return {
    ...bundle,
    planningUnit: refreshPlanningUnitMaterials(bundle.planningUnit, refresh.structures.get(bundle.planningUnit.id)),
    items: bundle.items.map((item) => {
      if (!item.sourceActivityId) return item
      const source = refresh.structures.get(sourceUnitId(bundle, item))
        ?.find((entity) => entity.entityType === 'planningActivity' && entity.id === item.sourceActivityId)
      // An absent source must not remove the scheduled activity or its cached content.
      if (!source) return item
      const content = Object.fromEntries(CONTENT_FIELDS.map((field) => [field,
        structuredClone(source[field] ?? (field === 'description' ? '' : [])),
      ]))
      for (const override of overrides) {
        if (override.activityId !== source.id) continue
        for (const field of CONTENT_FIELDS) {
          if (Object.hasOwn(override.changes || {}, field)) content[field] = structuredClone(override.changes[field])
        }
      }
      return { ...item, sourceActivity: { ...(item.sourceActivity || { id: source.id, planningUnitId: source.planningUnitId }), ...content } }
    }),
  }
}

export function summarizeAgendaContentRefresh(bundles, refresh) {
  const updated = new Set()
  const missing = new Set()
  for (const bundle of bundles) {
    for (const item of bundle.items) {
      if (!item.sourceActivityId) continue
      const unitId = sourceUnitId(bundle, item)
      const source = refresh.structures.get(unitId)
        ?.find((entity) => entity.entityType === 'planningActivity' && entity.id === item.sourceActivityId)
      const target = source ? updated : missing
      target.add(`${unitId}:${item.sourceActivityId}`)
    }
  }
  return { activityCount: updated.size, missingCount: missing.size }
}
