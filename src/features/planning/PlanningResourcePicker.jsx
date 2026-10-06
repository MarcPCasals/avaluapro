import { useState } from 'react'
import { getPlanningResources, matchPastedResources, normalizeActivityResourceSelections, resourceKey, RESOURCE_CATEGORIES, RESOURCE_SCOPES } from '../../domain/planning/resources'

export function PlanningResourcePicker({ unit, selections, onChange }) {
  const [draft, setDraft] = useState('')
  const [report, setReport] = useState(null)
  const resources = getPlanningResources(unit)
  const selected = new Set(selections.map(resourceKey))
  const unavailable = selections.filter(selection => !resources.some(resource => resourceKey(resource) === resourceKey(selection)))
  const toggle = (resource, checked) => onChange(checked
    ? normalizeActivityResourceSelections([...selections, resource])
    : selections.filter(selection => resourceKey(selection) !== resourceKey(resource)))
  const paste = () => {
    const result = matchPastedResources(draft, resources)
    onChange(normalizeActivityResourceSelections([...selections, ...result.matches]))
    setReport(result)
    if (!result.unmatched.length) setDraft('')
  }
  return <section className="planning-resource-picker">
    <h3>Recursos de competències de l’activitat</h3>
    <p>Selecciona els recursos definits a «Informació inicial de la UP → Recursos de tota la UP». Un mateix recurs pot treballar-se en diverses activitats.</p>
    {resources.length === 0 && <p>Encara no hi ha recursos a la UP. Afegeix-los a «Informació inicial de la UP → Recursos de tota la UP» i desa la UP.</p>}
    {resources.length > 0 && <>
      <label>Enganxa una llista de recursos<textarea rows={5} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Un recurs per línia. Pots incloure els encapçalaments Fets i conceptes, Procediments i Actituds i valors." /></label>
      <button className="secondary-action compact" disabled={!draft.trim()} onClick={paste} type="button">Vincular la llista</button>
      {report && <div role="status"><p>{report.matches.length} recursos reconeguts a la UP.</p>{report.unmatched.length > 0 && <><p>Aquestes línies no s’han vinculat. Revisa el text o selecciona el recurs a la llista:</p><ul>{report.unmatched.map((item, index) => <li key={index}>{item.text}<small>{item.reason}</small></li>)}</ul></>}</div>}
      <p><strong>{selections.length} recursos seleccionats</strong></p>
      {Object.entries(RESOURCE_SCOPES).map(([scope, label]) => <details className="planning-resource-group" key={scope}>
        <summary>{label}<small>{resources.filter(resource => resource.scope === scope && selected.has(resourceKey(resource))).length} seleccionats · {resources.filter(resource => resource.scope === scope).length} disponibles</small></summary>
        {Object.entries(RESOURCE_CATEGORIES).map(([category, categoryLabel]) => {
          const group = resources.filter(resource => resource.scope === scope && resource.category === category)
          if (!group.length) return null
          return <details className="planning-resource-category" key={category}><summary>{categoryLabel}<small>{group.filter(resource => selected.has(resourceKey(resource))).length} seleccionats · {group.length} disponibles</small></summary><div className="planning-resource-options">{group.map(resource => <label className="planning-resource-option" key={resourceKey(resource)}><input type="checkbox" checked={selected.has(resourceKey(resource))} onChange={event => toggle(resource, event.target.checked)} /><span>{resource.text}</span></label>)}</div></details>
        })}
      </details>)}
    </>}
    {unavailable.length > 0 && <details className="planning-resource-group"><summary>Recursos vinculats que ja no són a la llista de la UP ({unavailable.length})</summary><p>Es conserven a l’activitat perquè no es perdi el contingut.</p>{unavailable.map(resource => <label className="planning-resource-option" key={resourceKey(resource)}><input type="checkbox" checked onChange={() => toggle(resource, false)} /><span>{resource.text}</span></label>)}</details>}
  </section>
}
