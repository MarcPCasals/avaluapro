import { useId, useMemo, useState } from 'react'
import { CheckCircle2, Plus, X } from 'lucide-react'
import { ContextualHelp } from '../../components/ContextualHelp'
import { createId } from '../../lib/ids'
import { normalizeResourceSections } from '../../domain/planning/documents'

const CURRICULUM_FIELDS = [
  { key: 'competencies', label: 'Competències', placeholder: 'Afegeix una competència' },
  { key: 'expectedLearnings', label: 'Aprenentatges esperats', placeholder: 'Afegeix un aprenentatge esperat' },
  { key: 'assessmentCriteria', label: 'Criteris d’avaluació', placeholder: 'Afegeix un criteri' },
  { key: 'indicators', label: 'Indicadors d’avaluació', placeholder: 'Afegeix un indicador' },
]

const RESOURCE_FIELDS = [
  { key: 'factsAndConcepts', label: 'Fets i conceptes' },
  { key: 'procedures', label: 'Procediments' },
  { key: 'attitudesAndValues', label: 'Actituds i valors' },
]

function normalizeLabel(value) {
  return String(value || '').trim()
}

function CurriculumCollection({ items, label, onChange, placeholder, suggestions }) {
  const [draft, setDraft] = useState('')
  const listId = useId()
  const suggestionByLabel = useMemo(() => new Map(
    (suggestions || []).map((item) => [normalizeLabel(item.label).toLocaleLowerCase('ca'), item]),
  ), [suggestions])
  const add = () => {
    const labelValue = normalizeLabel(draft)
    if (!labelValue || items.some((item) => item.label.toLocaleLowerCase('ca') === labelValue.toLocaleLowerCase('ca'))) return
    const suggestion = suggestionByLabel.get(labelValue.toLocaleLowerCase('ca'))
    onChange([...items, {
      id: createId('plan-curriculum'),
      label: labelValue,
      sourceId: suggestion?.sourceId || null,
    }])
    setDraft('')
  }
  return (
    <div className="planning-content-collection">
      <strong>{label}</strong>
      <div className="planning-content-add">
        <input
          list={listId}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            add()
          }}
          placeholder={placeholder}
          value={draft}
        />
        <datalist id={listId}>{(suggestions || []).map((item) => <option key={`${item.sourceId}-${item.label}`} value={item.label} />)}</datalist>
        <button aria-label={`Afegir a ${label}`} className="icon-action accent" onClick={add} type="button"><Plus size={16} /></button>
      </div>
      {items.length > 0 ? (
        <div className="planning-content-chips">
          {items.map((item) => (
            <span key={item.id}><CheckCircle2 size={13} />{item.label}<button aria-label={`Retirar ${item.label}`} onClick={() => onChange(items.filter((entry) => entry.id !== item.id))} type="button"><X size={12} /></button></span>
          ))}
        </div>
      ) : <small>Encara no n’hi ha cap.</small>}
    </div>
  )
}

function TextCollection({ items, label, onChange }) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const next = [...items]
    draft.split(/\r?\n/).map(normalizeLabel).filter(Boolean).forEach(value => {
      if (!next.some(item => item.toLocaleLowerCase('ca') === value.toLocaleLowerCase('ca'))) next.push(value)
    })
    if (next.length === items.length) return
    onChange(next)
    setDraft('')
  }
  return (
    <div className="planning-content-collection">
      <strong>{label}</strong>
      <div className="planning-content-add">
        <textarea
          aria-label={`Recursos de ${label}`}
          rows={3}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Escriu o enganxa recursos, un per línia, i prem +"
          value={draft}
        />
        <button aria-label={`Afegir a ${label}`} className="icon-action accent" onClick={add} type="button"><Plus size={16} /></button>
      </div>
      {items.length > 0 ? (
        <div className="planning-content-chips neutral">
          {items.map((item) => <span key={item}>{item}<button aria-label={`Retirar ${item}`} onClick={() => onChange(items.filter((entry) => entry !== item))} type="button"><X size={12} /></button></span>)}
        </div>
      ) : <small>Encara no n’hi ha cap.</small>}
    </div>
  )
}

function ResourceSection({ label, onChange, value }) {
  return (
    <details className="planning-resource-section planning-resource-group">
      <summary>{label}<small>{RESOURCE_FIELDS.reduce((total, field) => total + (value[field.key]?.length || 0), 0)} recursos</small></summary>
      {RESOURCE_FIELDS.map((field) => (
        <details className="planning-resource-category" key={field.key}>
          <summary>{field.label}<small>{value[field.key]?.length || 0} recursos</small></summary>
          <TextCollection
            items={value[field.key] || []}
            label={field.label}
            onChange={(items) => onChange({ ...value, [field.key]: items })}
          />
        </details>
      ))}
    </details>
  )
}

export function PlanningPedagogicalContent({ catalog, onChange, values }) {
  const curriculum = values.curriculum || {
    competencies: [], expectedLearnings: [], assessmentCriteria: [], indicators: [],
  }
  const updateCurriculum = (key, items) => onChange('curriculum', { ...curriculum, [key]: items })
  return (
    <section className="planning-editor-section planning-pedagogical-section">
      <div className="planning-section-title">
        <span>04</span>
        <div className="contextual-section-title"><h3>Contingut pedagògic</h3><ContextualHelp title="Contingut pedagògic">Recull el currículum, les orientacions i els recursos de la unitat que podran consultar els docents i, quan correspongui, direcció.</ContextualHelp></div>
      </div>
      <details open>
        <summary>Currículum i avaluació</summary>
        <div className="planning-content-grid">
          {CURRICULUM_FIELDS.map((field) => (
            <CurriculumCollection
              items={curriculum[field.key] || []}
              key={field.key}
              label={field.label}
              onChange={(items) => updateCurriculum(field.key, items)}
              placeholder={field.placeholder}
              suggestions={catalog[field.key] || []}
            />
          ))}
        </div>
      </details>
      <p className="planning-content-help">Les opcions d’AvaluaPro són suggeriments. En desar, la UP conserva el text visible perquè continuï sent llegible encara que el currículum d’avaluació canviï més endavant.</p>
    </section>
  )
}

export function PlanningUnitResources({ onChange, values }) {
  const resourceSections = normalizeResourceSections(values.resourceSections, values)
  const updateSection = (key, section) => onChange('resourceSections', { ...resourceSections, [key]: section })
  return <section className="planning-editor-section planning-unit-resources">
    <h3>Recursos de tota la UP</h3>
    <p className="planning-content-help">Defineix aquí els recursos de la unitat, un per línia, i desa la UP. Després podràs seleccionar-los dins de cada activitat. Si la UP s’ha importat, revisa aquí la llista importada.</p>
    <div className="planning-resource-grid">
      <ResourceSection label="Competències específiques" onChange={section => updateSection('specific', section)} value={resourceSections.specific} />
      <ResourceSection label="Competències transversals" onChange={section => updateSection('transversal', section)} value={resourceSections.transversal} />
    </div>
  </section>
}
