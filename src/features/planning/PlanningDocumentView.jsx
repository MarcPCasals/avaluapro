import { useMemo, useState } from 'react'
import { Download, FileJson, FileText, Image, Loader2 } from 'lucide-react'
import {
  buildPlanningDocumentExport,
  getPlanningDocumentFilename,
  normalizeResourceSections,
  PEDAGOGICAL_TYPE_LABELS,
} from '../../domain/planning/documents'
import { downloadBlob, downloadJson } from '../../lib/downloads'
import { FormattedText } from '../../components/FormattedText'

const PHASE_LABELS = {
  closing: 'Tancament',
  custom: 'Altres',
  preparation: 'Preparació',
  resolution: 'Resolució',
}

function CurriculumDocument({ curriculum = {} }) {
  const rows = [
    ['Competència', curriculum.competencies],
    ['Aprenentatge esperat', curriculum.expectedLearnings],
    ['Criteri d’avaluació', curriculum.assessmentCriteria],
    ['Indicador d’avaluació', curriculum.indicators],
  ]
  const count = Math.max(1, ...rows.map(([, items]) => items?.length || 0))
  return (
    <div className="planning-document-table-wrap">
      <table className="planning-document-curriculum">
        <thead><tr>{rows.map(([label]) => <th key={label}>{label}</th>)}</tr></thead>
        <tbody>{Array.from({ length: count }, (_, index) => (
          <tr key={index}>{rows.map(([label, items]) => <td key={label}>{items?.[index]?.label || '—'}</td>)}</tr>
        ))}</tbody>
      </table>
    </div>
  )
}

function ResourceDocument({ label, value }) {
  const rows = [
    ['Fets i conceptes', value.factsAndConcepts],
    ['Procediments', value.procedures],
    ['Actituds i valors', value.attitudesAndValues],
  ]
  return (
    <section className="planning-document-resource">
      <h3>{label}</h3>
      <dl>{rows.map(([rowLabel, items]) => (
        <div key={rowLabel}><dt>{rowLabel}</dt><dd>{items?.length ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : '—'}</dd></div>
      ))}</dl>
    </section>
  )
}

function materialsText(activity) {
  return [...(activity.teacherMaterials || []), ...(activity.studentMaterials || [])]
    .map((material) => material.label)
    .filter(Boolean)
    .join(' · ')
}

function diversityText(activity) {
  return (activity.diversityMeasures || []).map((measure) => [
    measure.label,
    measure.studentNames?.length ? measure.studentNames.join(', ') : '',
  ].filter(Boolean).join(': ')).join(' · ')
}

function SequenceDocument({ activities, phases, unit }) {
  const phaseById = useMemo(() => new Map(phases.map((phase) => [phase.id, phase])), [phases])
  const roots = useMemo(() => phases.filter((phase) => !phase.parentPhaseId).sort((a, b) => a.order - b.order), [phases])
  const ordered = useMemo(() => {
    const phaseOrder = new Map()
    roots.forEach((root, rootIndex) => {
      phaseOrder.set(root.id, rootIndex * 1000)
      phases.filter((phase) => phase.parentPhaseId === root.id)
        .sort((a, b) => a.order - b.order)
        .forEach((child, childIndex) => phaseOrder.set(child.id, rootIndex * 1000 + childIndex + 1))
    })
    return [...activities].sort((a, b) => (phaseOrder.get(a.phaseId) ?? 99999) - (phaseOrder.get(b.phaseId) ?? 99999) || a.order - b.order)
  }, [activities, phases, roots])
  const sequenceNumberById = useMemo(() => new Map(ordered.map((activity, index) => [activity.id, index + 1])), [ordered])
  const indicatorsById = useMemo(() => new Map((unit.curriculum?.indicators || []).map((indicator) => [indicator.id, indicator.label])), [unit.curriculum])
  return roots.map((root) => {
    const phaseActivities = ordered.filter((activity) => {
      const phase = phaseById.get(activity.phaseId)
      return activity.phaseId === root.id || phase?.parentPhaseId === root.id
    })
    const total = phaseActivities.reduce((sum, activity) => sum + (Number(activity.plannedMinutes) || 0), 0)
    return (
      <section className={`planning-document-phase ${root.kind}`} key={root.id}>
        <header><span>Fase de {PHASE_LABELS[root.kind]?.toLocaleLowerCase('ca') || root.title.toLocaleLowerCase('ca')}</span><strong>{total} min</strong></header>
        <div className="planning-document-table-wrap">
          <table className="planning-document-sequence">
            <thead><tr><th>Núm.</th><th>Subfase</th><th>Descriptiu activitat</th><th>Min.</th><th>Materials</th><th>Agrup. / espai</th><th>IA</th></tr></thead>
            <tbody>{phaseActivities.map((activity) => {
              const phase = phaseById.get(activity.phaseId)
              return (
                <tr key={activity.id}>
                  <td className="number">{sequenceNumberById.get(activity.id)}</td>
                  <td>
                    <div className="planning-document-icon-slot" title="Espai reservat per a la imatge pedagògica original"><Image size={14} /><span>Imatge pendent</span></div>
                    <strong>{phase?.parentPhaseId ? phase.title : '—'}</strong>
                    <small>{PEDAGOGICAL_TYPE_LABELS[activity.pedagogicalType] || 'Altres'}</small>
                  </td>
                  <td className="activity-copy">
                    <strong>{activity.title}</strong>
                    {activity.description && <FormattedText as="p" text={activity.description} />}
                    <div><b>Atenció a la diversitat</b><span>{diversityText(activity) || '—'}</span></div>
                    <div><b>Comentaris per a l’aplicació</b><span>{activity.applicationComment || '—'}</span></div>
                  </td>
                  <td className="number">{activity.plannedMinutes ?? '—'}</td>
                  <td>{materialsText(activity) || '—'}</td>
                  <td>{[activity.grouping, activity.space].filter(Boolean).join(' · ') || '—'}</td>
                  <td>{(activity.indicatorIds || []).map((id) => indicatorsById.get(id)).filter(Boolean).join(' · ') || '—'}</td>
                </tr>
              )
            })}</tbody>
            <tfoot><tr><td colSpan="3">Total fase de {root.title.toLocaleLowerCase('ca')}</td><td colSpan="4">{total} min</td></tr></tfoot>
          </table>
        </div>
      </section>
    )
  })
}

/** Vista formal compartible; no rep notes privades ni incidències individuals. */
export function PlanningDocumentView({ activities = [], phases = [], unit }) {
  const [wordBusy, setWordBusy] = useState(false)
  const [message, setMessage] = useState('')
  const resources = normalizeResourceSections(unit.resourceSections, unit)
  const totalMinutes = activities.reduce((sum, activity) => sum + (Number(activity.plannedMinutes) || 0), 0)
  const exportJson = () => {
    downloadJson(buildPlanningDocumentExport({ activities, phases, unit }), getPlanningDocumentFilename(unit, 'json'))
    setMessage('Còpia JSON descarregada.')
  }
  const exportWord = async () => {
    setWordBusy(true)
    setMessage('')
    try {
      const { buildPlanningWordBlob } = await import('./planningWord')
      const blob = await buildPlanningWordBlob({ activities, phases, unit })
      downloadBlob(blob, getPlanningDocumentFilename(unit, 'docx'))
      setMessage('Word editable descarregat.')
    } catch (error) {
      setMessage(error.message || 'No s’ha pogut crear el Word.')
    } finally {
      setWordBusy(false)
    }
  }

  return (
    <section className="planning-document-shell">
      <div className="planning-document-toolbar">
        <div><FileText size={18} /><span><strong>Vista de document</strong><small>Plantilla oficial modernitzada</small></span></div>
        <div>
          <button className="secondary-action compact" onClick={exportJson} type="button"><FileJson size={16} />JSON</button>
          <button className="primary-action compact" disabled={wordBusy} onClick={exportWord} type="button">{wordBusy ? <Loader2 className="spin" size={16} /> : <Download size={16} />}Word editable</button>
        </div>
        {message && <p aria-live="polite">{message}</p>}
      </div>
      <article className="planning-document-page">
        <header className="planning-document-cover">
          <div><span>{unit.code}</span><small>{unit.level}</small></div>
          <div><small>Seqüència d’ensenyament / aprenentatge</small><h2>{unit.title}</h2></div>
        </header>
        <section className="planning-document-general">
          <h3>Informació general</h3>
          <dl>
            <div><dt>Situació o pregunta complexa</dt><dd>{unit.complexSituation || '—'}</dd></div>
            <div><dt>Proposta de producció o producte</dt><dd>{unit.expectedProduct || '—'}</dd></div>
            <div><dt>Llengua de vehiculació</dt><dd>{unit.vehicularLanguage || '—'}</dd></div>
          </dl>
        </section>
        <CurriculumDocument curriculum={unit.curriculum} />
        <div className="planning-document-resources">
          <ResourceDocument label="Recursos de competències específiques" value={resources.specific} />
          <ResourceDocument label="Recursos de competències transversals" value={resources.transversal} />
        </div>
        <SequenceDocument activities={activities} phases={phases} unit={unit} />
        <footer>Total de temps de les tres fases: <strong>{totalMinutes} minuts</strong></footer>
      </article>
    </section>
  )
}
