import {
  BookOpenText,
  CalendarDays,
  ChevronDown,
  Clock3,
  Eye,
  FileText,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { ContextualTab } from '../../components/ContextualHelp'
import { FormattedText } from '../../components/FormattedText'
import { moveHorizontalTabFocus } from '../../lib/tabs'
import { orderPlanningPhases } from '../../domain/planning/phaseSequence'
import { applyPlanningActivityOverrides } from '../../domain/planning/classPlanning'
import { buildDirectionActivityReports, selectDirectionApplication } from '../../domain/planning/directionView'
import { getEffectiveActivityMaterialLinks } from '../../domain/planning/materials'
import { getSessionLoad } from '../../domain/planning/rules'
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

const ACTIVITY_STATUS_LABELS = {
  completed: 'Feta', scheduled: 'Programada', removed: 'Eliminada de la programació del grup',
  partial: 'Programada parcialment', unscheduled: 'No entra completament a les sessions actuals', started: 'Iniciada', unplanned: 'Encara no programada',
}

function TimePill({ originalMinutes, plannedMinutes, actualMinutes = null, sessionDuration = 60, registered = false }) {
  const minutes = actualMinutes ?? plannedMinutes
  const changed = minutes != null && originalMinutes != null && Number(minutes) !== Number(originalMinutes)
  const status = minutes == null || Number(minutes) === 0 ? 'untimed' : getSessionLoad([{ plannedMinutes: minutes }], sessionDuration).status
  return <span className={`planning-time-pill planning-direction-time ${status}`}>
    <Clock3 size={13} aria-hidden="true" />
    <span>{changed && <del>{originalMinutes} min previstos</del>}
      <span>{minutes != null ? `${Number(Number(minutes).toFixed(1))} min` : 'Sense temps'}{actualMinutes != null ? registered ? ' reals registrats' : ' reals' : changed ? ' nous previstos' : ''}</span>
    </span>
  </span>
}

function MaterialLinks({ activity, unit }) {
  const links = getEffectiveActivityMaterialLinks(activity, unit).filter((material) => /^https?:\/\//i.test(material.url))
  if (!links.length) return null
  return <div className="planning-direction-materials" aria-label="Materials de l’activitat">{links.map((material) => <a className={material.audience} href={material.url} key={`${material.audience}:${material.url}`} target="_blank" rel="noopener noreferrer">
    <ExternalLink size={13} aria-hidden="true" /><span>{material.label || 'Material'}</span><small>{material.audience === 'teacher' ? 'Docent' : 'Alumnat'}{material.transversal ? ' · UP' : ''}</small>
  </a>)}</div>
}

function OccurrenceList({ occurrences }) {
  if (!occurrences.length) return null
  return <ul className="planning-direction-occurrences">{occurrences.map(({ session, item, result, sessionNumber }) => {
    const label = session.status === 'cancelled' ? 'Sessió cancel·lada' : session.status === 'notHeld' || result?.status === 'notHeld' ? 'No feta' : result?.status === 'skipped' ? 'Activitat omesa' : result?.status === 'completed' ? 'Feta' : result?.status === 'continued' ? 'Iniciada · continua' : session.status === 'held' ? 'Sessió feta · activitat sense resultat' : 'Programada'
    return <li key={`${session.id}:${item.id}`}><strong>Sessió {sessionNumber}{session.subgroupId ? ` · Mig grup ${session.subgroupId}` : ''}</strong><span>{new Date(session.startsAt).toLocaleDateString('ca-AD', { day: 'numeric', month: 'long', timeZone: 'Europe/Andorra' })} · {String(session.startsAt).slice(11, 16)} · {label}</span><span>{item.segmentCount > 1 ? `Part ${item.segmentIndex || 1}/${item.segmentCount} · ` : ''}{item.plannedMinutes ?? 0} min previstos{result?.actualMinutes != null ? ` · ${result.actualMinutes} min reals` : ''}</span></li>
  })}</ul>
}

function SharedActivity({ activity, report, unit, sequenceNumber, sessionDuration = 60 }) {
  return <article className="planning-direction-activity">
    <div className="planning-direction-activity-content">
      <div className="planning-direction-activity-heading"><span>{activityKindLabel(activity.type)}</span>{report?.modified && <span className="planning-direction-modified">Activitat modificada</span>}</div>
      <strong>{sequenceNumber && <span className="planning-sequence-code">A{sequenceNumber}</span>}{activity.title}</strong>
      {activity.description && <FormattedText as="p" text={activity.description} />}
      <MaterialLinks activity={activity} unit={unit} />
    </div>
    <aside className="planning-direction-meta">
      <TimePill originalMinutes={report?.original.plannedMinutes ?? activity.plannedMinutes} plannedMinutes={report?.plannedMinutes ?? activity.plannedMinutes} actualMinutes={report?.actualMinutes} registered={report?.status !== 'completed'} sessionDuration={sessionDuration} />
      {activity.grouping && <span className="planning-direction-meta-pill"><Users size={13} />{activity.grouping}</span>}
      {activity.space && <span className="planning-direction-meta-pill">{activity.space}</span>}
    </aside>
    {activity.diversityMeasures?.length > 0 && <div className="planning-direction-adaptations"><ShieldCheck size={15} /><div>{activity.diversityMeasures.map((measure, index) => <p key={measure.id || index}><strong>{measure.label}</strong>{measure.studentNames?.length > 0 && <small>{measure.studentNames.join(' · ')}</small>}</p>)}</div></div>}
    {report && <div className="planning-direction-progress">
      <div><strong className={`planning-direction-status-pill ${report.status}`}>{ACTIVITY_STATUS_LABELS[report.status]}{report.manuallyCompleted ? ' · marca manual' : ''}</strong>{report.remainingMinutes > 0 && report.status !== 'removed' && <span>{Number(report.remainingMinutes.toFixed(1))} min pendents d’assignar</span>}</div>
      <OccurrenceList occurrences={report.occurrences} />
    </div>}
    {report?.changes.length > 0 && <details className="planning-direction-inline-changes"><summary>Canvis d’aquesta activitat</summary><dl>{report.changes.map((change) => <div key={change.label}><dt>{change.label}</dt><dd><del>{change.before}</del><span> → {change.after}</span></dd></div>)}</dl></details>}
  </article>
}

function BaseProgramView({ activities, phases, unit, applications = [], selectedApplicationId, onApplicationChange, readOnly = false }) {
  const sessionDuration = 60
  const bundle = selectDirectionApplication(applications, selectedApplicationId)
  const reports = bundle ? buildDirectionActivityReports(activities, bundle, phases) : []
  const reportById = new Map(reports.map((report) => [report.original.id, report]))
  const displayedActivities = reports.length ? reports.map((report) => report.activity) : activities
  const flatPhases = orderPlanningPhases(phases)
  const sequenceNumbers = new Map(flatPhases.flatMap((phase) => displayedActivities
    .filter((activity) => activity.phaseId === phase.id && reportById.get(activity.id)?.status !== 'removed')
    .sort((a, b) => Number(a.order) - Number(b.order))).map((activity, index) => [activity.id, index + 1]))
  const rootNumbers = new Map(flatPhases.filter((phase) => phase.depth === 0).map((phase, index) => [phase.id, index + 1]))
  const activitiesByPhase = new Map(flatPhases.map((phase) => [
    phase.id,
    displayedActivities.filter((activity) => activity.phaseId === phase.id).sort((a, b) => Number(a.order) - Number(b.order)),
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

      <div className="planning-direction-controls">
        {!readOnly && applications.length > 0 && <label>Temporització del grup<select value={bundle?.application.id || ''} onChange={(event) => onApplicationChange(event.target.value)}>{!bundle && <option value="">Grup pendent de carregar</option>}{applications.map((entry, index) => <option value={entry.application.id} key={entry.application.id}>{entry.application.classLabel || `Grup ${index + 1}`}</option>)}</select></label>}
        {readOnly && bundle && <strong>Programació de {bundle.application.classLabel || 'la classe autoritzada'}</strong>}
      </div>
      {selectedApplicationId && !bundle && <p className="planning-sharing-error" role="status">La programació d’aquest grup encara no està disponible. Espera que es carregui la classe autoritzada.</p>}
      {(!selectedApplicationId || bundle) && <section className="planning-shared-section">
        <header>
          <BookOpenText size={18} />
          <div><strong>Seqüència d’activitats</strong><span>{activities.length} elements</span></div>
        </header>
        <div className="planning-shared-phases">
          {flatPhases.map((phase) => {
            const phaseActivities = activitiesByPhase.get(phase.id) || []
            return (
              <details open key={phase.id} style={{ marginLeft: `${Math.min(phase.depth, 3) * 16}px` }} className={`planning-direction-phase ${phase.kind || 'custom'}`}>
                <summary>
                  <span>{phase.depth === 0 ? `FASE ${rootNumbers.get(phase.id)} — ${phase.title.toLocaleUpperCase('ca')}` : phase.title}</span>
                  <small>{phaseActivities.length} elements</small>
                  <ChevronDown size={15} />
                </summary>
                <div>{phaseActivities.map((activity) => <SharedActivity sequenceNumber={sequenceNumbers.get(activity.id)} activity={activity} report={reportById.get(activity.id)} unit={unit} sessionDuration={sessionDuration} key={activity.id} />)}</div>
              </details>
            )
          })}
        </div>
      </section>}
      {(!selectedApplicationId || bundle) && displayedActivities.some((activity) => !phases.some((phase) => phase.id === activity.phaseId)) && <section className="planning-shared-phases"><details open><summary>Altres activitats</summary><div>{displayedActivities.filter((activity) => !phases.some((phase) => phase.id === activity.phaseId)).map((activity) => <SharedActivity key={activity.id} activity={activity} report={reportById.get(activity.id)} unit={unit} sessionDuration={sessionDuration} />)}</div></details></section>}
      {bundle && <SessionAdditions activities={activities} bundle={bundle} unit={unit} />}

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

export function SharedSession({ items, results, session, activities = [], reports = [], unit }) {
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
        {(session.applicationNotes || []).length > 0 && <section className="planning-session-application-notes"><strong>Notes d’aplicació a l’aula</strong>{session.applicationNotes.map((note) => <p key={note.id}>{note.text}</p>)}</section>}
        {items.map((item) => {
          const result = results.find((candidate) => candidate.sessionItemId === item.id)
          const report = reports.find((entry) => entry.original.id === item.sourceActivityId)
          const activity = report?.activity || activities.find((entry) => entry.id === item.sourceActivityId)
          const modified = report?.modified || (result?.actualMinutes != null && Number(result.actualMinutes) !== Number(item.plannedMinutes || 0))
          return (
            <section key={item.id}>
              <div>
                <strong>{item.title}</strong>
                {modified && <span className="planning-direction-modified">Activitat modificada</span>}
                <TimePill originalMinutes={item.plannedMinutes} plannedMinutes={item.plannedMinutes} actualMinutes={result?.actualMinutes} sessionDuration={session.durationMinutes} />
                {!item.sourceActivityId && <small>Afegida a la sessió</small>}
                <MaterialLinks activity={activity} unit={unit} />
                {report?.changes.length > 0 && <details className="planning-direction-inline-changes"><summary>Canvis d’aquesta activitat</summary><dl>{report.changes.map((change) => <div key={change.label}><dt>{change.label}</dt><dd><del>{change.before}</del> → {change.after}</dd></div>)}</dl></details>}
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

function ApplicationView({ applications, classes, activities = [], unit, phases }) {
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
      {applications.map(({ application, sessions, overrides = [] }, applicationIndex) => {
        const reports = buildDirectionActivityReports(activities, { application, sessions, overrides }, phases)
        return (
        <details open={applicationIndex === 0} key={application.id}>
          <summary>
            <div>
              <span>{application.classLabel || classById.get(application.classId)?.name || `Grup ${applicationIndex + 1}`}</span>
              <small>{STATUS_LABELS[application.status] || application.status} · {sessions.length} sessions</small>
            </div>
            <ChevronDown size={17} />
          </summary>
          <div className="planning-shared-sessions">
            {sessions.map((bundle) => <SharedSession {...bundle} activities={activities} reports={reports} unit={unit} key={bundle.session.id} />)}
          </div>
        </details>
      )})}
    </div>
  )
}

function SessionAdditions({ activities, bundle, unit }) {
  const ids = new Set(activities.map((activity) => activity.id))
  const additions = bundle.sessions.flatMap((entry, index) => (entry.items || []).filter((item) => !item.sourceActivityId || !ids.has(item.sourceActivityId)).map((item) => ({ session: entry.session, item, sessionNumber: index + 1, result: (entry.results || []).find((result) => result.sessionItemId === item.id) })))
  if (!additions.length) return null
  return <section className="planning-shared-phases"><details open><summary>Activitats afegides o retirades de la base</summary><div>{additions.map((occurrence) => <article className="planning-direction-activity" key={`${occurrence.session.id}:${occurrence.item.id}`}><div className="planning-direction-activity-content"><strong>{occurrence.item.title}</strong><span className="planning-direction-modified">{occurrence.item.sourceActivityId ? 'Retirada de la base o procedent d’una altra UP' : 'Afegida a la sessió'}</span><MaterialLinks activity={occurrence.item} unit={unit} /></div><aside className="planning-direction-meta"><TimePill originalMinutes={occurrence.item.plannedMinutes} plannedMinutes={occurrence.item.plannedMinutes} actualMinutes={occurrence.result?.actualMinutes} sessionDuration={occurrence.session.durationMinutes} /></aside><div className="planning-direction-progress"><OccurrenceList occurrences={[occurrence]} /></div></article>)}</div></details></section>
}

/**
 * Vista única per a qualsevol accés compartit. Només rep estructura, sessions
 * i reflexions pedagògiques; les notes privades i les incidències individuals
 * no formen part de les propietats d'aquest component.
 */
export function PlanningSharedView({ activities, classes = [], loadApplications, phases, role, unit, initialTab = 'program', liveApplications, onShare, initialApplicationId = '' }) {
  const [tab, setTab] = useState(initialTab)
  const [applications, setApplications] = useState(null)
  const [selectedApplicationId, setSelectedApplicationId] = useState(initialApplicationId)
  const [loading, setLoading] = useState(initialTab === 'applications')
  const [error, setError] = useState('')
  const availableApplications = liveApplications || applications || []
  const selectedBundle = selectDirectionApplication(availableApplications, selectedApplicationId)
  const documentActivities = selectedBundle ? applyPlanningActivityOverrides(activities, selectedBundle.overrides) : activities

  useEffect(() => {
    if (!loadApplications || liveApplications) return
    let active = true
    loadApplications()
      .then((data) => { if (active) setApplications(data) })
      .catch((loadError) => { if (active) setError(loadError.message || 'No s’ha pogut carregar l’aplicació real.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [initialTab, loadApplications, liveApplications])

  const openApplications = async () => {
    setTab('applications')
    if (liveApplications || applications) return
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
        {onShare && <button className="secondary-action compact" onClick={() => onShare(selectedBundle?.application.id || selectedApplicationId)} type="button">Compartir enllaç amb direcció</button>}
        <nav aria-label="Contingut compartit" role="tablist">
          <ContextualTab aria-selected={tab === 'program'} className={tab === 'program' ? 'active' : ''} help="Mostra l’estructura, el currículum i la seqüència completa de la programació compartida." helpTitle="Programació compartida" onClick={() => setTab('program')} onKeyDown={moveHorizontalTabFocus} role="tab" tabIndex={tab === 'program' ? 0 : -1} type="button">
            Programació
          </ContextualTab>
          <ContextualTab aria-selected={tab === 'document'} className={tab === 'document' ? 'active' : ''} help="Presenta la mateixa UP amb format documental per facilitar-ne la lectura i la revisió." helpTitle="Document de la UP" onClick={() => setTab('document')} onKeyDown={moveHorizontalTabFocus} role="tab" tabIndex={tab === 'document' ? 0 : -1} type="button">
            <FileText size={13} />Document
          </ContextualTab>
          {(loadApplications || liveApplications) && (
            <ContextualTab aria-selected={tab === 'applications'} className={tab === 'applications' ? 'active' : ''} help="Consulta com s’ha aplicat aquesta programació a les classes, amb sessions i resultats reals, sense modificar la UP." helpTitle="Aplicació real" onClick={openApplications} onKeyDown={moveHorizontalTabFocus} role="tab" tabIndex={tab === 'applications' ? 0 : -1} type="button">
              Aplicació real
            </ContextualTab>
          )}
        </nav>
      </header>
      {tab === 'program' ? (
        <div role="tabpanel">{error && <p className="planning-sharing-error" role="alert">{error}</p>}<BaseProgramView readOnly={role === 'directionReader'} selectedApplicationId={selectedApplicationId} onApplicationChange={setSelectedApplicationId} activities={activities} phases={phases} unit={unit} applications={liveApplications || applications || []} /></div>
      ) : tab === 'document' ? (
        <div role="tabpanel">{selectedApplicationId && !selectedBundle ? <p className="planning-sharing-error" role="status">La programació d’aquest grup encara no està disponible.</p> : <PlanningDocumentView activities={documentActivities} phases={orderPlanningPhases(phases)} unit={unit} />}</div>
      ) : loading && !liveApplications ? (
        <div className="planning-shared-loading"><Loader2 className="spin" size={22} />Carregant les sessions…</div>
      ) : error ? (
        <p className="planning-sharing-error">{error}</p>
      ) : (
        <div role="tabpanel"><ApplicationView phases={phases} unit={unit} activities={activities} applications={liveApplications || applications || []} classes={classes} /></div>
      )}
    </section>
  )
}
