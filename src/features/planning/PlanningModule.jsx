import { useMemo, useState } from 'react'
import {
  Archive, BookOpenText, CalendarRange, Check, ChevronDown, ChevronRight, CircleDot,
  Cloud, CloudOff, Copy, Eye, EyeOff, FolderTree, History, Lightbulb, Loader2,
  Pencil, Plus, RotateCcw, Save,
} from 'lucide-react'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'
import {
  AcademicYearDialog, ActivityDialog, ActivityHistoryDialog, AnnualCopyDialog, PhaseDialog,
  PlanningUnitDialog, TemporalUnitDialog,
} from './PlanningDialogs'
import { PlanningActivitySequence } from './PlanningActivitySequence'
import { PlanningPedagogicalContent } from './PlanningPedagogicalContent'
import { usePlanningWorkspace } from './usePlanningWorkspace'
import './planning.css'

const PHASE_LABELS = {
  closing: 'Tancament',
  custom: 'Personalitzada',
  preparation: 'Preparació',
  resolution: 'Resolució',
}

function SyncBadge({ isOnline, sync }) {
  const Icon = !isOnline ? CloudOff : sync.state === 'saving' ? Loader2 : sync.state === 'saved' ? Check : Cloud
  return (
    <span className={`planning-sync ${sync.state}`} title={`${sync.pendingCount || 0} canvis pendents`}>
      <Icon className={sync.state === 'saving' ? 'spin' : ''} size={15} />
      {sync.label}
    </span>
  )
}

function EmptyPlanning({ hasTemporalUnits, onCreateUnit, onCreateUt }) {
  return (
    <section className="planning-empty-state">
      <span><BookOpenText size={30} /></span>
      <div>
        <h2>Comença la programació del curs</h2>
        <p>{hasTemporalUnits
          ? 'Crea una UP buida i organitza-la amb les fases que necessitis.'
          : 'Primer defineix les dates d’una UT. Després podràs crear-hi la primera UP.'}</p>
      </div>
      <button className="primary-action" onClick={hasTemporalUnits ? onCreateUnit : onCreateUt} type="button">
        <Plus size={17} />
        {hasTemporalUnits ? 'Nova UP' : 'Crear la primera UT'}
      </button>
    </section>
  )
}

function PhaseTree({ activities, onAddChild, onAddRoot, onEdit, phases }) {
  const roots = phases.filter((phase) => !phase.parentPhaseId)
  const childrenByParent = useMemo(() => phases.reduce((result, phase) => {
    if (!phase.parentPhaseId) return result
    return { ...result, [phase.parentPhaseId]: [...(result[phase.parentPhaseId] || []), phase] }
  }, {}), [phases])
  const renderPhase = (phase, depth = 0) => {
    const childPhases = childrenByParent[phase.id] || []
    const activityCount = activities.filter((activity) => activity.phaseId === phase.id).length
    return (
      <li key={phase.id}>
        <div className="planning-phase-row" style={{ '--phase-depth': depth }}>
          {childPhases.length > 0 ? <ChevronDown size={14} /> : <CircleDot size={11} />}
          <button className="planning-phase-name" onClick={() => onEdit(phase)} type="button">
            <strong>{phase.title}</strong>
            <span>{activityCount} activitats</span>
          </button>
          <button aria-label={`Afegir subfase a ${phase.title}`} className="icon-action" onClick={() => onAddChild(phase.id)} title="Afegir subfase" type="button"><Plus size={14} /></button>
          <button aria-label={`Editar ${phase.title}`} className="icon-action" onClick={() => onEdit(phase)} title="Editar fase" type="button"><Pencil size={14} /></button>
        </div>
        {childPhases.length > 0 && <ul>{childPhases.map((child) => renderPhase(child, depth + 1))}</ul>}
      </li>
    )
  }
  return (
    <div className="planning-outline-block">
      <div className="planning-outline-heading">
        <div><FolderTree size={17} /><strong>Fases</strong></div>
        <button className="icon-action accent" onClick={onAddRoot} title="Afegir fase" type="button"><Plus size={15} /></button>
      </div>
      <ul className="planning-phase-tree">{roots.map((phase) => renderPhase(phase))}</ul>
    </div>
  )
}

function ImprovementPanel({ onAccept, onError, proposals = [] }) {
  const pending = proposals.filter((proposal) => proposal.status === 'pending')
  const [selectedIds, setSelectedIds] = useState([])
  const [busy, setBusy] = useState(false)
  const accept = async () => {
    if (selectedIds.length === 0) return
    setBusy(true)
    try {
      await onAccept(selectedIds)
      setSelectedIds([])
    } catch (error) {
      onError(error)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="planning-improvement-section">
      <div className="planning-section-title">
        <span>05</span>
        <div><h3>Millora per al curs següent</h3><p>Les dades reals de l’Agenda generaran propostes revisables; mai modificaran la UP soles.</p></div>
      </div>
      {pending.length === 0 ? (
        <div className="planning-improvement-empty"><Lightbulb size={18} /><p>Encara no hi ha propostes pendents. Apareixeran quan es revisin activitats des de l’Agenda.</p></div>
      ) : (
        <>
          <div className="planning-improvement-toolbar">
            <label><input checked={selectedIds.length === pending.length} onChange={(event) => setSelectedIds(event.target.checked ? pending.map((proposal) => proposal.id) : [])} type="checkbox" />Seleccionar-les totes</label>
            <button className="primary-action compact" disabled={busy || selectedIds.length === 0} onClick={accept} type="button">Acceptar {selectedIds.length || ''}</button>
          </div>
          <div className="planning-improvement-list">{pending.map((proposal) => (
            <label className={proposal.actualMinutesAverage && proposal.plannedMinutes && proposal.actualMinutesAverage > proposal.plannedMinutes ? 'overrun' : ''} key={proposal.id}>
              <input checked={selectedIds.includes(proposal.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, proposal.id] : current.filter((id) => id !== proposal.id))} type="checkbox" />
              <span><strong>{proposal.title}</strong><small>{proposal.detail}</small>{proposal.actualMinutesAverage && <em>{proposal.plannedMinutes || '—'} min previstos · {proposal.actualMinutesAverage} min reals{proposal.sourceGroupNames?.length ? ` · ${proposal.sourceGroupNames.join(', ')}` : ''}</em>}</span>
            </label>
          ))}</div>
        </>
      )}
    </section>
  )
}

function UnitEditor({ activities, curriculumCatalog, onAcceptImprovements, onAddActivity, onArchive, onDeleteActivity, onDuplicate, onEditActivity, onError, onMoveActivity, onOpenHistory, onReactivate, onSave, phases, sourceYearLabel, temporalUnit, unit }) {
  const [values, setValues] = useState(unit)
  const [busy, setBusy] = useState(false)
  const update = (field, value) => setValues((current) => ({ ...current, [field]: value }))
  const acceptImprovements = async (proposalIds) => {
    const result = await onAcceptImprovements(proposalIds)
    setValues((current) => ({
      ...current,
      improvementProposals: result.planningUnit.improvementProposals,
      updatedAt: result.planningUnit.updatedAt,
    }))
    return result
  }
  const handleSave = async (event) => {
    event.preventDefault()
    setBusy(true)
    try {
      await onSave(unit, values)
    } catch (error) {
      onError(error)
    } finally {
      setBusy(false)
    }
  }
  const handleStatusChange = async (action) => {
    setBusy(true)
    try {
      await action(unit)
    } catch (error) {
      onError(error)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form className="planning-unit-editor" onSubmit={handleSave}>
      <header className="planning-editor-header">
        <div>
          <span>{unit.code} · {unit.level}</span>
          <h2>{unit.title}</h2>
        </div>
        <div className="planning-editor-actions">
          <button className="secondary-action compact" onClick={onOpenHistory} type="button"><History size={16} />Recuperar activitat</button>
          <button className="secondary-action compact" onClick={onDuplicate} type="button"><Copy size={16} />Duplicar</button>
          {unit.status === 'archived' ? (
            <button className="secondary-action compact" disabled={busy} onClick={() => handleStatusChange(onReactivate)} type="button"><RotateCcw size={16} />Reactivar</button>
          ) : (
            <button className="secondary-action compact" disabled={busy} onClick={() => handleStatusChange(onArchive)} type="button"><Archive size={16} />Arxivar</button>
          )}
          <button className="primary-action compact" disabled={busy} type="submit">
            {busy ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
            Desar
          </button>
        </div>
      </header>
      {unit.copiedFrom && <div className="planning-version-origin"><Copy size={15} /><span>Versió creada a partir d’una UP de {sourceYearLabel || 'un curs anterior'}. L’original es conserva intacte.</span></div>}
      <div className="planning-editor-section">
        <div className="planning-section-title">
          <span>01</span>
          <div><h3>Identificació</h3><p>La informació que situa la UP dins del curs.</p></div>
        </div>
        <div className="planning-form-grid three">
          <label>Codi<input required value={values.code || ''} onChange={(event) => update('code', event.target.value)} /></label>
          <label>Nivell<input required value={values.level || ''} onChange={(event) => update('level', event.target.value)} /></label>
          <label>Unitat temporal<input readOnly value={temporalUnit?.label || 'Sense UT'} /></label>
        </div>
        <label>Títol de la UP<input required value={values.title || ''} onChange={(event) => update('title', event.target.value)} /></label>
      </div>
      <div className="planning-editor-section">
        <div className="planning-section-title">
          <span>02</span>
          <div><h3>Punt de partida</h3><p>Defineix el repte i el producte que donarà sentit a la seqüència.</p></div>
        </div>
        <label>Situació o pregunta complexa<textarea rows="4" value={values.complexSituation || ''} onChange={(event) => update('complexSituation', event.target.value)} /></label>
        <label>Proposta de producció o producte<textarea rows="3" value={values.expectedProduct || ''} onChange={(event) => update('expectedProduct', event.target.value)} /></label>
        <label>Llengua de vehiculació<input value={values.vehicularLanguage || ''} onChange={(event) => update('vehicularLanguage', event.target.value)} /></label>
      </div>
      <PlanningActivitySequence
        activities={activities}
        onAdd={onAddActivity}
        onDelete={onDeleteActivity}
        onEdit={onEditActivity}
        onMove={onMoveActivity}
        phases={phases}
      />
      <PlanningPedagogicalContent catalog={curriculumCatalog} onChange={update} values={values} />
      <ImprovementPanel onAccept={acceptImprovements} onError={onError} proposals={values.improvementProposals} />
    </form>
  )
}

function UnitSummary({ activities, phases, temporalUnit, unit }) {
  const rootPhases = phases.filter((phase) => !phase.parentPhaseId).length
  const curriculumCount = Object.values(unit.curriculum || {}).reduce((total, items) => total + (items?.length || 0), 0)
  const measureCount = activities.reduce((total, activity) => total + (activity.diversityMeasures?.length || 0), 0)
  return (
    <aside className="planning-summary-panel">
      <div className="planning-summary-status">
        <span className={`planning-status-dot ${unit.status}`} />
        <div><strong>{unit.status === 'archived' ? 'Arxivada' : unit.status === 'active' ? 'Activa' : 'Esborrany'}</strong><span>Versió {unit.versionNumber}</span></div>
      </div>
      <dl>
        <div><dt>UT</dt><dd>{temporalUnit?.label || 'Sense UT'}</dd></div>
        <div><dt>Fases</dt><dd>{rootPhases}</dd></div>
        <div><dt>Subfases</dt><dd>{Math.max(0, phases.length - rootPhases)}</dd></div>
        <div><dt>Activitats</dt><dd>{activities.length}</dd></div>
        <div><dt>Currículum</dt><dd>{curriculumCount}</dd></div>
        <div><dt>Mesures</dt><dd>{measureCount}</dd></div>
      </dl>
      <section>
        <h3>Estructura actual</h3>
        {phases.length === 0 ? <p>Encara no hi ha fases.</p> : phases.map((phase) => (
          <div className="planning-summary-phase" key={phase.id}>
            <span>{PHASE_LABELS[phase.kind] || 'Fase'}</span>
            <strong>{phase.title}</strong>
          </div>
        ))}
      </section>
      <section className="planning-summary-note">
        <Eye size={16} />
        <p>Direcció podrà veure aquesta estructura i el contingut pedagògic, però mai les notes personals.</p>
      </section>
    </aside>
  )
}

export default function PlanningModule() {
  const user = useAvaluaproStore((state) => state.cloud.user)
  const classes = useAvaluaproStore((state) => state.classes)
  const students = useAvaluaproStore((state) => state.students)
  const competencies = useAvaluaproStore((state) => state.competencies)
  const criteria = useAvaluaproStore((state) => state.criteria)
  const indicators = useAvaluaproStore((state) => state.indicators)
  const workspace = usePlanningWorkspace(user)
  const [dialog, setDialog] = useState(null)
  const [showUtManager, setShowUtManager] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [showSummary, setShowSummary] = useState(true)
  const [editingUt, setEditingUt] = useState(null)
  const [editingPhase, setEditingPhase] = useState(null)
  const [editingActivity, setEditingActivity] = useState(null)
  const [activityPhaseId, setActivityPhaseId] = useState('')
  const [phaseParentId, setPhaseParentId] = useState('')
  const curriculumCatalog = useMemo(() => {
    const unique = (items) => Array.from(new Map(items
      .filter((item) => item.label)
      .map((item) => [item.label.toLocaleLowerCase('ca'), item])).values())
      .sort((left, right) => left.label.localeCompare(right.label, 'ca'))
    return {
      competencies: unique(competencies.map((item) => ({ label: item.name, sourceId: item.id }))),
      expectedLearnings: [],
      assessmentCriteria: unique(criteria.map((item) => ({ label: item.name, sourceId: item.id }))),
      indicators: unique(indicators.map((item) => ({ label: item.name || item.label || item.title, sourceId: item.id }))),
    }
  }, [competencies, criteria, indicators])

  if (!user) {
    return (
      <section className="planning-auth-required">
        <BookOpenText size={34} />
        <h1>Programació</h1>
        <p>Inicia sessió amb Google des de «Dades i Compte» per crear una programació protegida i disponible als teus dispositius.</p>
      </section>
    )
  }

  const visibleUnits = workspace.planningUnits.filter((unit) => showArchived || unit.status !== 'archived')
  const activeTemporalUnit = workspace.temporalUnits.find((item) => item.id === workspace.activePlanningUnit?.temporalUnitId)
  const sourceYearLabel = workspace.academicYears.find((year) => year.id === workspace.activePlanningUnit?.copiedFrom?.academicYearId)?.label
  const handleOpenPhase = (phase = null, parentId = '') => {
    setEditingPhase(phase)
    setPhaseParentId(parentId)
    setDialog('phase')
  }
  const handleOpenActivity = (activity = null, phaseId = '') => {
    setEditingActivity(activity)
    setActivityPhaseId(phaseId || activity?.phaseId || '')
    setDialog('activity')
  }
  const handleActivityAction = async (action) => {
    try {
      return await action()
    } catch (actionError) {
      workspace.setError(actionError.message || 'No s’ha pogut modificar la seqüència.')
      return null
    }
  }

  return (
    <section className="planning-screen">
      <header className="planning-topbar">
        <div className="planning-title-lockup">
          <span><BookOpenText size={23} /></span>
          <div><p>Planificació pedagògica</p><h1>Programació</h1></div>
        </div>
        <div className="planning-course-controls">
          {workspace.academicYears.length > 0 && (
            <label>
              <span>Curs</span>
              <select value={workspace.activeAcademicYearId} onChange={(event) => workspace.setActiveAcademicYearId(event.target.value)}>
                {workspace.academicYears.map((year) => <option key={year.id} value={year.id}>{year.label}</option>)}
              </select>
            </label>
          )}
          <button className="secondary-action compact" onClick={() => setDialog('year')} type="button"><Plus size={16} />Nou curs</button>
          {workspace.activeAcademicYear && <button className="secondary-action compact" onClick={() => setShowUtManager((value) => !value)} type="button"><CalendarRange size={16} />Dates de les UT</button>}
          <SyncBadge isOnline={workspace.isOnline} sync={workspace.sync} />
        </div>
      </header>

      {workspace.error && <div className="planning-message error"><strong>{workspace.error}</strong><button onClick={() => workspace.setError('')} type="button">Tancar</button></div>}

      {showUtManager && workspace.activeAcademicYear && (
        <section className="planning-ut-manager">
          <div><CalendarRange size={19} /><div><strong>{workspace.activeAcademicYear.label}</strong><span>{workspace.activeAcademicYear.startsOn} — {workspace.activeAcademicYear.endsOn}</span></div></div>
          <div className="planning-ut-list">
            {workspace.temporalUnits.map((ut) => (
              <button key={ut.id} onClick={() => { setEditingUt(ut); setDialog('ut') }} type="button">
                <span>{ut.label}</span><small>{ut.startsOn} — {ut.endsOn}</small><Pencil size={14} />
              </button>
            ))}
            <button className="add" onClick={() => { setEditingUt(null); setDialog('ut') }} type="button"><Plus size={15} />Afegir UT</button>
          </div>
        </section>
      )}

      {workspace.loading && workspace.academicYears.length === 0 ? (
        <div className="planning-loading"><Loader2 className="spin" size={26} />Carregant la programació…</div>
      ) : workspace.academicYears.length === 0 ? (
        <section className="planning-empty-state first-step">
          <span><CalendarRange size={30} /></span><div><h2>Configura el curs acadèmic</h2><p>Les dates es defineixen cada any i no afecten els cursos anteriors.</p></div>
          <button className="primary-action" onClick={() => setDialog('year')} type="button"><Plus size={17} />Crear el curs</button>
        </section>
      ) : workspace.planningUnits.length === 0 ? (
        <EmptyPlanning hasTemporalUnits={workspace.temporalUnits.length > 0} onCreateUnit={() => setDialog('unit')} onCreateUt={() => setDialog('ut')} />
      ) : (
        <div className={`planning-workbench ${showSummary ? '' : 'summary-hidden'}`}>
          <aside className="planning-outline-panel">
            <div className="planning-outline-heading units-heading">
              <div><BookOpenText size={17} /><strong>Unitats</strong></div>
              <button className="icon-action accent" disabled={workspace.temporalUnits.length === 0} onClick={() => setDialog('unit')} title="Nova UP" type="button"><Plus size={15} /></button>
            </div>
            <div className="planning-unit-list">
              {visibleUnits.map((unit) => (
                <button className={unit.id === workspace.activePlanningUnitId ? 'active' : ''} key={unit.id} onClick={() => workspace.setActivePlanningUnitId(unit.id)} type="button">
                  <span>{unit.code}</span><div><strong>{unit.title}</strong><small>{unit.level}</small></div><ChevronRight size={15} />
                </button>
              ))}
            </div>
            <button className="planning-archive-toggle" onClick={() => setShowArchived((value) => !value)} type="button">
              <Archive size={14} />{showArchived ? 'Amagar arxivades' : 'Mostrar arxivades'}
            </button>
            {workspace.activePlanningUnit && <PhaseTree activities={workspace.activities} onAddChild={(parentId) => handleOpenPhase(null, parentId)} onAddRoot={() => handleOpenPhase()} onEdit={(phase) => handleOpenPhase(phase)} phases={workspace.phases} />}
          </aside>

          <main className="planning-editor-panel">
            {workspace.activePlanningUnit ? (
              <UnitEditor
                activities={workspace.activities}
                curriculumCatalog={curriculumCatalog}
                key={workspace.activePlanningUnit.id}
                onAcceptImprovements={workspace.acceptImprovementSuggestions}
                onAddActivity={(phaseId) => handleOpenActivity(null, phaseId)}
                onArchive={workspace.archiveUnit}
                onDeleteActivity={(activity) => handleActivityAction(() => workspace.removeActivity(activity))}
                onDuplicate={() => setDialog('annualCopy')}
                onEditActivity={(activity) => handleOpenActivity(activity)}
                onError={(error) => workspace.setError(error.message || 'No s’ha pogut desar la UP.')}
                onMoveActivity={(move) => handleActivityAction(() => workspace.moveActivity(move))}
                onOpenHistory={() => setDialog('history')}
                onReactivate={(unit) => workspace.saveUnit(unit, { status: 'draft' })}
                onSave={workspace.saveUnit}
                phases={workspace.phases}
                sourceYearLabel={sourceYearLabel}
                temporalUnit={activeTemporalUnit}
                unit={workspace.activePlanningUnit}
              />
            ) : (
              <EmptyPlanning hasTemporalUnits={workspace.temporalUnits.length > 0} onCreateUnit={() => setDialog('unit')} onCreateUt={() => setDialog('ut')} />
            )}
          </main>

          {showSummary && workspace.activePlanningUnit && <UnitSummary activities={workspace.activities} phases={workspace.phases} temporalUnit={activeTemporalUnit} unit={workspace.activePlanningUnit} />}
          <button className="planning-summary-toggle" onClick={() => setShowSummary((value) => !value)} title={showSummary ? 'Amagar resum' : 'Mostrar resum'} type="button">
            {showSummary ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      )}

      {dialog === 'year' && <AcademicYearDialog onClose={() => setDialog(null)} onSave={workspace.createYear} />}
      {dialog === 'ut' && <TemporalUnitDialog initialValue={editingUt} onClose={() => { setDialog(null); setEditingUt(null) }} onSave={(values) => editingUt ? workspace.saveTemporalUnit(editingUt, values) : workspace.createTemporalUnit(values)} />}
      {dialog === 'unit' && <PlanningUnitDialog onClose={() => setDialog(null)} onSave={workspace.createUnit} temporalUnits={workspace.temporalUnits} />}
      {dialog === 'phase' && <PhaseDialog initialValue={editingPhase} onClose={() => { setDialog(null); setEditingPhase(null); setPhaseParentId('') }} onSave={workspace.savePhase} parentPhaseId={phaseParentId} />}
      {dialog === 'activity' && <ActivityDialog availableIndicators={workspace.activePlanningUnit?.curriculum?.indicators || []} classes={classes} initialPhaseId={activityPhaseId} initialValue={editingActivity} onClose={() => { setDialog(null); setEditingActivity(null); setActivityPhaseId('') }} onSave={workspace.saveActivity} phases={workspace.phases} students={students} />}
      {dialog === 'annualCopy' && <AnnualCopyDialog academicYears={workspace.academicYears} loadTemporalUnits={workspace.loadTemporalUnitsForYear} onClose={() => setDialog(null)} onSave={workspace.duplicateUnitToAcademicYear} sourceYearId={workspace.activeAcademicYearId} />}
      {dialog === 'history' && <ActivityHistoryDialog loadStructure={workspace.loadHistoricalUnitStructure} loadUnits={workspace.loadHistoricalUnits} onClose={() => setDialog(null)} onSave={workspace.copyHistoricalActivity} phases={workspace.phases} />}
    </section>
  )
}
