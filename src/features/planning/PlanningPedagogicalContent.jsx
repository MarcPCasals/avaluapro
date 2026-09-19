import { useId, useMemo, useState } from 'react'
import { CheckCircle2, Plus, X } from 'lucide-react'
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
    const value = normalizeLabel(draft)
    if (!value || items.some((item) => item.toLocaleLowerCase('ca') === value.toLocaleLowerCase('ca'))) return
    onChange([...items, value])
    setDraft('')
  }
  return (
    <div className="planning-content-collection">
      <strong>{label}</strong>
      <div className="planning-content-add">
        <input
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            add()
          }}
          placeholder="Escriu i prem +"
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
    <section className="planning-resource-section">
      <header><strong>{label}</strong><span>Els tres apartats de la plantilla oficial</span></header>
      {RESOURCE_FIELDS.map((field) => (
        <TextCollection
          items={value[field.key] || []}
          key={field.key}
          label={field.label}
          onChange={(items) => onChange({ ...value, [field.key]: items })}
        />
      ))}
    </section>
  )
}

export function PlanningPedagogicalContent({ catalog, onChange, values }) {
  const curriculum = values.curriculum || {
    competencies: [], expectedLearnings: [], assessmentCriteria: [], indicators: [],
  }
  const resourceSections = normalizeResourceSections(values.resourceSections, values)
  const updateCurriculum = (key, items) => onChange('curriculum', { ...curriculum, [key]: items })
  const updateResourceSection = (key, section) => onChange('resourceSections', {
    ...resourceSections,
    [key]: section,
  })
  return (
    <section className="planning-editor-section planning-pedagogical-section">
      <div className="planning-section-title">
        <span>04</span>
        <div><h3>Contingut pedagògic</h3><p>El currículum i els recursos que direcció consultarà a la UP.</p></div>
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
      <details>
        <summary>Recursos de competències</summary>
        <div className="planning-resource-grid">
          <ResourceSection label="Competències específiques" onChange={(section) => updateResourceSection('specific', section)} value={resourceSections.specific} />
          <ResourceSection label="Competències transversals" onChange={(section) => updateResourceSection('transversal', section)} value={resourceSections.transversal} />
        </div>
      </details>
      <p className="planning-content-help">Les opcions d’AvaluaPro són suggeriments. En desar, la UP conserva el text visible perquè continuï sent llegible encara que el currículum d’avaluació canviï més endavant.</p>
    </section>
  )
}
