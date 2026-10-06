import { getPlanningResources, getResourceCoverage, RESOURCE_CATEGORIES, RESOURCE_SCOPES } from '../../domain/planning/resources'

export function PlanningResourceCoverage({ unit, activities, completedActivityIds }) {
  const coverage = getResourceCoverage(getPlanningResources(unit), activities, completedActivityIds)
  if (!coverage.length) return null
  const linked = coverage.filter(resource => resource.activities.length > 0).length
  return <details className="planning-resource-coverage">
    <summary>Seguiment dels recursos · {linked} de {coverage.length} vinculats a activitats</summary>
    <p>Els recursos ratllats ja tenen una activitat assignada. Pots veure on es treballen i quins apareixen en activitats fetes.</p>
    {Object.entries(RESOURCE_SCOPES).map(([scope, label]) => <details className="planning-resource-group" key={scope}><summary>{label}<small>{coverage.filter(resource => resource.scope === scope && resource.activities.length).length} vinculats · {coverage.filter(resource => resource.scope === scope).length} recursos</small></summary>
      {Object.entries(RESOURCE_CATEGORIES).map(([category, categoryLabel]) => {
        const group = coverage.filter(resource => resource.scope === scope && resource.category === category)
        if (!group.length) return null
        return <details className="planning-resource-category" key={category}><summary>{categoryLabel}<small>{group.filter(resource => resource.activities.length).length} vinculats · {group.length} recursos</small></summary><ul>{group.map(resource => <li key={resource.key} className={resource.activities.length ? 'covered' : ''}>
          <span className="planning-resource-label">{resource.text}</span>
          <small>{resource.activities.length ? `Vinculat: ${resource.activities.map(activity => activity.title).join(' · ')}` : 'Pendent de vincular a una activitat'}</small>
          {resource.completed && <small className="planning-resource-completed">Tractat en una activitat feta</small>}
        </li>)}</ul></details>
      })}
    </details>)}
  </details>
}
