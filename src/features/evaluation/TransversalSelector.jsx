import { CheckCircle2, Power } from 'lucide-react'
import { transversalStructure } from '../../data/subjects'

export function TransversalSelector({ className, selectedNames, onToggle, busy = false }) {
  return (
    <div className="ut-competency-config">
      <section className="ut-config-intro">
        <div>
          <strong>{className} · Competències transversals</strong>
          <span>Activa les que avalues en aquesta classe. La selecció s’aplica a totes les UTs;
            cada UT conserva les seves notes. Desactivar una competència conserva les notes.</span>
        </div>
        <small>{selectedNames.length} de {transversalStructure.length} competències actives</small>
      </section>
      <div className="ut-competency-switch-list">
        {transversalStructure.map(competency => {
          const active = selectedNames.includes(competency.name)
          return (
            <article className={`ut-competency-switch ${active ? 'active' : ''}`} key={competency.name}>
              <button aria-pressed={active} aria-label={`${active ? 'Desactivar' : 'Activar'} ${competency.name}`}
                className="competency-toggle" disabled={busy}
                onClick={() => onToggle(competency.name, !active)} type="button">
                {active ? <CheckCircle2 size={20} /> : <Power size={20} />}
                <span>{active ? 'Activa' : 'Inactiva'}</span>
              </button>
              <div><strong>{competency.name}</strong><ul>
                {competency.criteria.map(criterion => <li key={criterion}>{criterion}</li>)}
              </ul></div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
