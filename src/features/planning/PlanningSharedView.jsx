import {
  BookOpenText,
  CalendarDays,
  ChevronDown,
  Clock3,
  Eye,
  FileText,
  Loader2,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { ContextualTab } from '../../components/ContextualHelp'
import { FormattedText } from '../../components/FormattedText'
import { moveHorizontalTabFocus } from '../../lib/tabs'
import { PlanningDocumentView } from './PlanningDocumentView'

const ROLE_LABELS = {
  directionReader: 'Vista de direcció',
  planningAgendaEditor: 'Agenda compartida',
  planningEditor: 'Coedició de la UP',
  tutoringCollaborator: 'Cotutoria · UP compartida i agenda pròpia',
  owner: 'Vista compartida',
}

const STATUS_LABELS = {
  active: 'Activa',
  archived: 'Arxivada',
  cancelled: 'Cancel·lada',
  completed: 'Completada',
  draft: 'Esborrany',
  held: 'Feta',
  notHeld: 'No feta',
  planned: 'Prevista',
}

function activityKindLabel(type) {
  if (type === 'activity') return 'Activitat'
  if (type === 'indication') return 'Indicació'
  return 'Transició'
}

function CurriculumBlock({ curriculum = {} }) {
  const sections = [
    ['Competències', curriculum.competencies],
    ['Aprenentatges esperats', curriculum.expectedLearnings],
    ['Criteris d’avaluació', curriculum.assessmentCriteria],
    ['Indicadors', curriculum.indicators],
  ].filter(([, items]) => items?.length)

  if (sections.length === 0) {
    return <p className="planning-shared-empty">Encara no hi ha currículum vinculat.</p>
  }

  return (
    <div className="planning-shared-curriculum">
      {sections.map(([label, items]) => (
        <section key={label}>
          <strong>{label}</strong>
          <ul>{items.map((item) => <li key={item.id || item.label}>{item.label}</li>)}</ul>
        </section>
      ))}
    </div>
  )
}

function SharedActivity({ activity }) {
  return (
    <article>
      <div>
        <span>{activityKindLabel(activity.type)}</span>
        <strong>{activity.title}</strong>
        {activity.description && <FormattedText as="p" text={activity.description} />}
      </div>
      <aside>
        {activity.plannedMinutes && <span><Clock3 size={13} />{activity.plannedMinutes} min</span>}
        {activity.grouping && <span><Users size={13} />{activity.grouping}</span>}
        {activity.space && <span>{activity.space}</span>}
      </aside>
      {activity.diversityMeasures?.length > 0 && (
        <section>
          <ShieldCheck size={15} />
          <div>
            {activity.diversityMeasures.map((measure) => (
              <p key={measure.id}>
                <strong>{measure.label}</strong>
                {measure.studentNames?.length > 0 && <small>{measure.studentNames.join(' · ')}</small>}
              </p>
            ))}
          </div>
        </section>
      )}
    </article>
  )
}

function BaseProgramView({ activities, phases, unit }) {
  const activitiesByPhase = new Map(phases.map((phase) => [
    phase.id,
    activities.filter((activity) => activity.phaseId === phase.id),
  ]))

  return (
    <div className="planning-shared-program">
      <section className="planning-shared-hero">
        <span>{unit.code} · {unit.level}</span>
        <h2>{unit.title}</h2>
        <div>
          {unit.complexSituation && (
            <p><strong>Situació o pregunta complexa</strong>{unit.complexSituation}</p>
          )}
          {unit.expectedProduct && <p><strong>Producció o producte</strong>{unit.expectedProduct}</p>}
          {unit.vehicularLanguage && <p><strong>Llengua</strong>{unit.vehicularLanguage}</p>}
        </div>
      </section>

      <section className="planning-shared-section">
        <header>
          <BookOpenText size={18} />
          <div><strong>Seqüència d’activitats</strong><span>{activities.length} elements</span></div>
        </header>
        <div className="planning-shared-phases">
          {phases.map((phase) => {
            const phaseActivities = activitiesByPhase.get(phase.id) || []
            return (
              <details open key={phase.id}>
                <summary>
                  <span>{phase.title}</span>
                  <small>{phaseActivities.length} elements</small>
                  <ChevronDown size={15} />
                </summary>
                <div>{phaseActivities.map((activity) => <SharedActivity activity={activity} key={activity.id} />)}</div>
              </details>
            )
          })}
        </div>
      </section>

      <section className="planning-shared-section">
        <header>
          <ShieldCheck size={18} />
          <div><strong>Currículum i intencions pedagògiques</strong><span>Contingut oficial de la UP</span></div>
        </header>
        <CurriculumBlock curriculum={unit.curriculum} />
      </section>
    </div>
  )
}

function SharedSession({ items, results, session }) {
  return (
    <article>
      <header>
        <div>
          <strong>{new Date(session.startsAt).toLocaleDateString('ca-AD', {
            day: 'numeric',
            month: 'long',
            weekday: 'long',
          })}</strong>
          <span>{String(session.startsAt).slice(11, 16)} · {session.durationMinutes} min</span>
        </div>
        <span className={`status ${session.status}`}>{STATUS_LABELS[session.status] || session.status}</span>
      </header>
      <div>
        {items.map((item) => {
          const result = results.find((candidate) => candidate.sessionItemId === item.id)
          return (
            <section key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <small>
                  {item.plannedMinutes ? `${item.plannedMinutes} min previstos` : 'Sense temps'}
                  {result?.actualMinutes ? ` · ${result.actualMinutes} min reals` : ''}
                </small>
              </div>
              {result && (
                <aside>
                  {result.pedagogicalReflection && (
                    <p><strong>Reflexió pedagògica</strong>{result.pedagogicalReflection}</p>
                  )}
                  {result.applicationComment && (
                    <p><strong>Aplicació real</strong>{result.applicationComment}</p>
                  )}
                  {result.missingMaterials?.length > 0 && (
                    <p><strong>Materials que han faltat</strong>{result.missingMaterials.join(' · ')}</p>
                  )}
                </aside>
              )}
            </section>
          )
        })}
      </div>
    </article>
  )
}

function ApplicationView({ applications, classes }) {
  const classById = new Map(classes.map((item) => [item.id, item]))
  if (applications.length === 0) {
    return (
      <div className="planning-shared-empty large">
        <CalendarDays size={26} />
        <strong>Encara no hi ha cap aplicació de grup</strong>
        <p>Quan la UP es calendaritzi, direcció podrà consultar aquí les sessions i les reflexions pedagògiques.</p>
      </div>
    )
  }

  return (
    <div className="planning-shared-applications">
      {applications.map(({ application, sessions }, applicationIndex) => (
        <details open={applicationIndex === 0} key={application.id}>
          <summary>
            <div>
              <span>{application.classLabel || classById.get(application.classId)?.name || `Grup ${applicationIndex + 1}`}</span>
              <small>{STATUS_LABELS[application.status] || application.status} · {sessions.length} sessions</small>
            </div>
            <ChevronDown size={17} />
          </summary>
          <div className="planning-shared-sessions">
            {sessions.map((bundle) => <SharedSession {...bundle} key={bundle.session.id} />)}
          </div>
        </details>
      ))}
    </div>
  )
}

/**
 * Vista única per a qualsevol accés compartit. Només rep estructura, sessions
 * i reflexions pedagògiques; les notes privades i les incidències individuals
 * no formen part de les propietats d'aquest component.
 */
export function PlanningSharedView({ activities, classes = [], loadApplications, phases, role, unit }) {
  const [tab, setTab] = useState('program')
  const [applications, setApplications] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const openApplications = async () => {
    setTab('applications')
    if (applications) return
    setLoading(true)
    setError('')
    try {
      setApplications(await loadApplications())
    } catch (operationError) {
      setError(operationError.message || 'No s’ha pogut carregar l’aplicació real.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="planning-shared-view">
      <header className="planning-shared-view-header">
        <div>
          <Eye size={18} />
          <span><small>{ROLE_LABELS[role] || 'Programació compartida'}</small><strong>{unit.code} · {unit.title}</strong></span>
        </div>
        <nav aria-label="Contingut compartit" role="tablist">
          <ContextualTab aria-selected={tab === 'program'} className={tab === 'program' ? 'active' : ''} help="Mostra l’estructura, el currículum i la seqüència completa de la programació compartida." helpTitle="Programació compartida" onClick={() => setTab('program')} onKeyDown={moveHorizontalTabFocus} role="tab" tabIndex={tab === 'program' ? 0 : -1} type="button">
            Programació
          </ContextualTab>
          <ContextualTab aria-selected={tab === 'document'} className={tab === 'document' ? 'active' : ''} help="Presenta la mateixa UP amb format documental per facilitar-ne la lectura i la revisió." helpTitle="Document de la UP" onClick={() => setTab('document')} onKeyDown={moveHorizontalTabFocus} role="tab" tabIndex={tab === 'document' ? 0 : -1} type="button">
            <FileText size={13} />Document
          </ContextualTab>
          {loadApplications && (
            <ContextualTab aria-selected={tab === 'applications'} className={tab === 'applications' ? 'active' : ''} help="Consulta com s’ha aplicat aquesta programació a les classes, amb sessions i resultats reals, sense modificar la UP." helpTitle="Aplicació real" onClick={openApplications} onKeyDown={moveHorizontalTabFocus} role="tab" tabIndex={tab === 'applications' ? 0 : -1} type="button">
              Aplicació real
            </ContextualTab>
          )}
        </nav>
      </header>
      {tab === 'program' ? (
        <div role="tabpanel"><BaseProgramView activities={activities} phases={phases} unit={unit} /></div>
      ) : tab === 'document' ? (
        <div role="tabpanel"><PlanningDocumentView activities={activities} phases={phases} unit={unit} /></div>
      ) : loading ? (
        <div className="planning-shared-loading"><Loader2 className="spin" size={22} />Carregant les sessions…</div>
      ) : error ? (
        <p className="planning-sharing-error">{error}</p>
      ) : (
        <div role="tabpanel"><ApplicationView applications={applications || []} classes={classes} /></div>
      )}
    </section>
  )
}
