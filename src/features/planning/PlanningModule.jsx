import { acknowledgePlanningUnitDraft, getPlanningUnitDraftValues, updatePlanningUnitDraft } from '../../domain/planning/unitDraft'
import { PlanningResourceCoverage } from './PlanningResourceCoverage'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive, Bell, BookOpenText, CalendarClock, CalendarRange, Check, ChevronDown,
  Cloud, CloudOff, Copy, Eye, History, Lightbulb, Loader2,
  FileText, Link2, Pencil, Plus, RotateCcw, Save, Share2, Trash2, Users, X,
} from 'lucide-react'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'
import { ContextualHelp } from '../../components/ContextualHelp'
import { useDialogAccessibility } from '../../lib/useDialogAccessibility'
import { saveAgendaSchedulingRequest } from '../../lib/agendaSchedulingNavigation'
import {
  AcademicYearDialog, ActivityDialog, ActivityHistoryDialog, AnnualCopyDialog, PhaseDialog,
  PlanningConnectionDialog, PlanningUnitDialog, TemporalUnitDialog,
} from './PlanningDialogs'
import { PlanningActivitySequence } from './PlanningActivitySequence'
import { PlanningDocumentDialog } from './PlanningDocumentDialog'
import { PlanningPedagogicalContent, PlanningUnitResources } from './PlanningPedagogicalContent'
import { PlanningRemindersDialog } from './PlanningRemindersDialog'
import { PlanningSharingDialog } from './PlanningSharingDialog'
import { subscribePlanningDirection } from '../../data/cloud/planningDirectionSubscription'
import { PlanningSharedView } from './PlanningSharedView'
import { usePlanningWorkspace } from './usePlanningWorkspace'
import { getPlanningReminderSummary } from '../../lib/reminders'
import { getConnectablePlanningUnits, getConnectedClassIds } from '../../domain/planning/classPlanning'
import { getTutorialCollaboratorEmails, resolveTutorialPlanningContext } from '../../domain/planning/tutorialPlanning'
import { buildActivityCurriculumOptions } from '../../domain/planning/activityCurriculum'
import './planning.css'

function SyncBadge({ isOnline, sync }) {
  const Icon = !isOnline ? CloudOff : sync.state === 'saving' ? Loader2 : sync.state === 'saved' ? Check : Cloud
  return (
    <span aria-live="polite" className={`planning-sync ${sync.state}`} role="status" title={sync.message || `${sync.pendingCount || 0} canvis pendents`}>
      <Icon className={sync.state === 'saving' ? 'spin' : ''} size={15} />
      {sync.label}
    </span>
  )
}

function PlanningPreviewDialog({ activities, classes, loadApplications, onClose, onShare, phases, unit, initialTab = 'program' }) {
  const dialogRef = useDialogAccessibility(onClose)
  const [liveData, setLiveData] = useState(null)
  useEffect(() => subscribePlanningDirection(unit.id, setLiveData, () => setLiveData(null)), [unit.id])
  return (
    <div className="planning-dialog-backdrop">
      <section aria-label="Vista de direcció" aria-modal="true" className="planning-preview-dialog" ref={dialogRef} role="dialog" tabIndex="-1">
        <button aria-label="Tancar vista de direcció" className="planning-preview-close" onClick={onClose} type="button"><X size={18} /></button>
        <PlanningSharedView initialTab={initialTab} activities={activities} classes={classes} liveApplications={liveData?.applications} loadApplications={loadApplications} onShare={onShare} phases={phases} role="owner" unit={unit} />
      </section>
    </div>
  )
}

function ConnectedChangeDialog({ activeClassName, otherClassNames, onChoose, supportsCurrentClass }) {
  const dialogRef = useDialogAccessibility(() => onChoose('cancel'))
  return (
    <div className="planning-dialog-backdrop">
      <section aria-labelledby="planning-change-scope-title" aria-modal="true" className="planning-connected-change-dialog" ref={dialogRef} role="dialog" tabIndex="-1">
        <button aria-label="Cancel·lar" className="planning-preview-close" onClick={() => onChoose('cancel')} type="button"><X size={18} /></button>
        <div className="planning-connected-change-icon"><Users size={22} /></div>
        <div>
          <p>Programació connectada</p>
          <h2 id="planning-change-scope-title">On vols aplicar aquest canvi?</h2>
          <span>La UP també està connectada amb {otherClassNames.join(' i ')}.</span>
        </div>
        <div className="planning-connected-change-actions">
          {supportsCurrentClass && (
            <button className="primary-action" onClick={() => onChoose('current')} type="button">
              <strong>Només {activeClassName}</strong>
              <small>{otherClassNames.join(' i ')} quedarà sense aquest canvi.</small>
            </button>
          )}
          <button className={supportsCurrentClass ? 'secondary-action' : 'primary-action'} onClick={() => onChoose('all')} type="button">
            <strong>{[activeClassName, ...otherClassNames].join(' i ')}</strong>
            <small>Actualitza la UP compartida per a totes les classes connectades.</small>
          </button>
          <button className="planning-cancel-change" onClick={() => onChoose('cancel')} type="button">Cancel·lar i no desar res</button>
        </div>
      </section>
    </div>
  )
}

function EmptyPlanning({ className, hasTemporalUnits, onConnectUnit, onCreateUnit, onCreateUt }) {
  return (
    <section className="planning-empty-state">
      <span><BookOpenText size={30} /></span>
      <div>
        <h2>Comença la programació de {className || 'la classe'}</h2>
        <p>{hasTemporalUnits
          ? 'Crea una UP des de zero o connecta aquesta classe amb una programació que ja tens.'
          : 'Primer defineix les dates d’una UT. Després podràs crear-hi la primera UP.'}</p>
      </div>
      <div className="planning-empty-actions">
        <button className="primary-action" onClick={hasTemporalUnits ? onCreateUnit : onCreateUt} type="button">
          <Plus size={17} />
          {hasTemporalUnits ? 'Nova UP' : 'Crear la primera UT'}
        </button>
        {hasTemporalUnits && <button className="secondary-action" onClick={onConnectUnit} type="button"><Link2 size={17} />Connectar una programació</button>}
      </div>
    </section>
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
        <div className="contextual-section-title"><h3>Millora per al curs següent</h3><ContextualHelp title="Millora per al curs següent">Les dades reals de l’Agenda generen propostes revisables per al curs següent. Cap proposta modifica la UP fins que l’acceptes.</ContextualHelp></div>
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

function MaterialLinkControl({ field, index, label, onChange, optional = false, tone, value = '' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [error, setError] = useState('')
  const openEditor = () => {
    setDraft(value)
    setError('')
    setEditing(true)
  }
  const confirmLink = () => {
    const nextValue = draft.trim()
    if (!nextValue) {
      setError('Enganxa un enllaç abans de continuar.')
      return
    }
    try {
      const parsed = new URL(nextValue)
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid protocol')
    } catch {
      setError('L’enllaç ha de començar per http:// o https://')
      return
    }
    onChange(index, field, nextValue)
    setEditing(false)
    setError('')
  }
  const removeLink = () => {
    onChange(index, field, '')
    setDraft('')
    setEditing(false)
    setError('')
  }

  return (
    <div className={`planning-material-link-control ${tone}`}>
      <button className={`planning-material-link-button ${value ? 'linked' : ''}`} onClick={openEditor} type="button">
        <Link2 size={15} />
        <span>{label}</span>
        {optional && <em>Opcional</em>}
        <small>{value ? 'Enllaç afegit' : 'Afegir enllaç'}</small>
      </button>
      {editing && (
        <div className="planning-material-link-popover">
          <input
            aria-label={`Enllaç de ${label.toLocaleLowerCase('ca')} del material transversal ${index + 1}`}
            autoFocus
            onChange={(event) => { setDraft(event.target.value); setError('') }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') { event.preventDefault(); confirmLink() }
              if (event.key === 'Escape') setEditing(false)
            }}
            placeholder="Enganxa aquí l’enllaç"
            type="url"
            value={draft}
          />
          {error && <span role="alert">{error}</span>}
          <div>
            {value && <button className="planning-link-remove" onClick={removeLink} type="button">Eliminar</button>}
            <button className="secondary-action compact" onClick={() => setEditing(false)} type="button">Cancel·lar</button>
            <button className="primary-action compact" onClick={confirmLink} type="button"><Check size={14} />Fet</button>
          </div>
        </div>
      )}
    </div>
  )
}

function TransversalMaterialsDialog({ onClose, onError, onSave, unit }) {
  const dialogRef = useDialogAccessibility(onClose)
  const [materials, setMaterials] = useState(unit.transversalMaterials || [])
  const [saving, setSaving] = useState(false)
  const [validationError, setValidationError] = useState('')
  const addMaterial = () => setMaterials((current) => [...current, {
    id: globalThis.crypto?.randomUUID?.() || `transversal-material-${Date.now()}`,
    kind: 'link',
    label: '',
    preparationKind: 'reference',
    reminderDaysBefore: 0,
    teacherUrl: '',
    url: '',
  }])
  const updateMaterial = (index, field, value) => {
    setValidationError('')
    setMaterials((current) => current.map((material, materialIndex) => (
      materialIndex === index ? { ...material, [field]: value } : material
    )))
  }
  const removeMaterial = (index) => setMaterials((current) => current.filter((_, materialIndex) => materialIndex !== index))
  const saveMaterials = async (event) => {
    event.preventDefault()
    if (materials.some((material) => !material.url && !material.teacherUrl)) {
      setValidationError('Cada material necessita almenys un enllaç: de l’alumnat o del docent.')
      return
    }
    setValidationError('')
    setSaving(true)
    try {
      const result = await onSave(unit, { transversalMaterials: materials })
      if (result === false) return
      onClose()
    } catch (error) {
      onError(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="planning-dialog-backdrop">
      <form aria-labelledby="planning-transversal-materials-title" aria-modal="true" className="planning-transversal-materials-dialog" onSubmit={saveMaterials} ref={dialogRef} role="dialog" tabIndex="-1">
        <button aria-label="Tancar materials transversals" className="planning-preview-close" onClick={onClose} type="button"><X size={18} /></button>
        <header>
          <span><Link2 size={20} /></span>
          <div>
            <p>{unit.code} · {unit.title}</p>
            <h2 id="planning-transversal-materials-title">Materials transversals</h2>
            <small>Aquests materials apareixeran automàticament a totes les activitats i sessions de la UP.</small>
          </div>
        </header>
        <div className="planning-transversal-materials-toolbar">
          <strong>{materials.length === 0 ? 'Encara no hi ha cap material' : `${materials.length} ${materials.length === 1 ? 'material' : 'materials'}`}</strong>
          <button className="secondary-action compact" onClick={addMaterial} type="button"><Plus size={15} />Afegir material</button>
        </div>
        <div className="planning-transversal-materials-list">
          {materials.length === 0 ? (
            <p className="planning-transversal-materials-empty">Afegeix el primer material per tenir-lo sempre disponible durant les sessions a l’aula.</p>
          ) : materials.map((material, index) => (
            <div className="planning-material-row link planning-transversal-material-row" key={material.id || index}>
              <input aria-label={`Nom del material transversal ${index + 1}`} placeholder="Nom del material" required value={material.label || ''} onChange={(event) => updateMaterial(index, 'label', event.target.value)} />
              <MaterialLinkControl field="url" index={index} label="Recurs de l’alumnat" onChange={updateMaterial} tone="student" value={material.url} />
              <MaterialLinkControl field="teacherUrl" index={index} label="Recurs del docent" onChange={updateMaterial} optional tone="teacher" value={material.teacherUrl} />
              <button aria-label={`Eliminar el material transversal ${material.label || index + 1}`} className="icon-action danger" onClick={() => removeMaterial(index)} type="button"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
        <footer>
          {validationError && <span className="planning-transversal-validation" role="alert">{validationError}</span>}
          <button className="secondary-action" disabled={saving} onClick={onClose} type="button">Cancel·lar</button>
          <button className="primary-action" disabled={saving} type="submit">
            {saving ? <Loader2 className="spin" size={15} /> : <Save size={15} />}
            {saving ? 'Desant…' : 'Desar i tancar'}
          </button>
        </footer>
      </form>
    </div>
  )
}

function UnitEditor({ activities, canManageUnit = false, curriculumCatalog, loadCompletedActivityIds, manuallyCompletedActivityIds = new Set(), onAcceptImprovements, onAddActivity, onAddChildPhase, onAddPhase, onArchive, onDeleteActivity, onDeletePhase, onDuplicate, onEditActivity, onEditPhase, onError, onMoveActivity, onMovePhase, onOpenDocuments, onOpenHistory, onOpenApplication, onOpenPreview, onOpenSharing, onReactivate, onSave, onSetActivityManualCompletion, phases, sourceYearLabel, temporalUnit, unit, values, onChange, onSaveResources, resourcesPending }) {
  const [busy, setBusy] = useState(false)
  const [completedActivityIds, setCompletedActivityIds] = useState(() => new Set())
  const [completedActivitiesLoading, setCompletedActivitiesLoading] = useState(true)
  const [completionBusyId, setCompletionBusyId] = useState('')
  useEffect(() => {
    let active = true
    Promise.resolve(loadCompletedActivityIds?.())
      .then((ids) => {
        if (active) setCompletedActivityIds(new Set(ids || []))
      })
      .catch(() => {
        if (active) setCompletedActivityIds(new Set())
      })
      .finally(() => {
        if (active) setCompletedActivitiesLoading(false)
      })
    return () => { active = false }
  }, [loadCompletedActivityIds, unit.id])
  const allCompletedActivityIds = useMemo(() => new Set([
    ...completedActivityIds,
    ...manuallyCompletedActivityIds,
  ]), [completedActivityIds, manuallyCompletedActivityIds])
  const setManualCompletion = async (activity, completed) => {
    setCompletionBusyId(activity.id)
    try {
      await onSetActivityManualCompletion(activity, completed)
    } catch (error) {
      onError(error)
    } finally {
      setCompletionBusyId('')
    }
  }
  const update = onChange
  const acceptImprovements = async (proposalIds) => {
    const result = await onAcceptImprovements(proposalIds)
    if (result === false) return false
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
        <div className="planning-editor-heading-row">
          <div>
            <span>{unit.code} · {unit.level}</span>
            <h2>{unit.title}</h2>
          </div>
          <UnitSummary activities={activities} phases={phases} temporalUnit={temporalUnit} unit={unit} />
        </div>
        <div className="planning-editor-actions">
          {canManageUnit && <button className="secondary-action compact" onClick={onOpenDocuments} type="button"><FileText size={16} />Document i imports</button>}
          {onOpenApplication && <button className="secondary-action compact" onClick={onOpenApplication} type="button"><Eye size={16} />Aplicació a l’aula</button>}
          {canManageUnit && <button className="secondary-action compact" onClick={onOpenPreview} type="button"><Eye size={16} />Vista direcció</button>}
          {canManageUnit && <button className="secondary-action compact" onClick={onOpenSharing} type="button"><Share2 size={16} />Compartir</button>}
          {canManageUnit && <button className="secondary-action compact" onClick={onOpenHistory} type="button"><History size={16} />Recuperar activitat</button>}
          {canManageUnit && <button className="secondary-action compact" onClick={onDuplicate} type="button"><Copy size={16} />Duplicar</button>}
          {canManageUnit && (unit.status === 'archived' ? (
            <button className="secondary-action compact" disabled={busy} onClick={() => handleStatusChange(onReactivate)} type="button"><RotateCcw size={16} />Reactivar</button>
          ) : (
            <button className="secondary-action compact" disabled={busy} onClick={() => handleStatusChange(onArchive)} type="button"><Archive size={16} />Arxivar</button>
          ))}
          <button className="primary-action compact" disabled={busy} type="submit">
            {busy ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
            Desar
          </button>
        </div>
      </header>
      {unit.copiedFrom && <div className="planning-version-origin"><Copy size={15} /><span>Versió creada a partir d’una UP de {sourceYearLabel || 'un curs anterior'}. L’original es conserva intacte.</span></div>}
      <details className="planning-basics-disclosure">
        <summary>
          <div className="planning-section-title">
            <span>01–02</span>
            <h3>Informació inicial de la UP</h3>
          </div>
          <ChevronDown size={18} />
        </summary>
        <div className="planning-basics-content">
          <div className="contextual-section-title"><span>Informació inicial de la UP</span><ContextualHelp title="Informació inicial de la UP">Reuneix la identificació de la unitat, el repte, el producte final, la llengua de vehiculació i els recursos de tota la UP.</ContextualHelp></div>
          <section className="planning-editor-section">
            <div className="planning-section-title">
              <span>01</span>
              <div className="contextual-section-title"><h3>Identificació</h3><ContextualHelp title="Identificació de la UP">Situa la unitat dins del curs amb el codi, el títol, la durada i les dades generals necessàries.</ContextualHelp></div>
            </div>
            <div className="planning-form-grid three">
              <label>Codi<input required value={values.code || ''} onChange={(event) => update('code', event.target.value)} /></label>
              <label>Nivell<input required value={values.level || ''} onChange={(event) => update('level', event.target.value)} /></label>
              <label>Unitat temporal<input readOnly value={temporalUnit?.label || 'Sense UT'} /></label>
            </div>
            <label>Títol de la UP<input required value={values.title || ''} onChange={(event) => update('title', event.target.value)} /></label>
          </section>
          <section className="planning-editor-section">
            <div className="planning-section-title">
              <span>02</span>
              <div className="contextual-section-title"><h3>Punt de partida</h3><ContextualHelp title="Punt de partida">Defineix el repte i el producte que donaran sentit a la seqüència d’activitats.</ContextualHelp></div>
            </div>
            <label>Situació o pregunta complexa<textarea rows="4" value={values.complexSituation || ''} onChange={(event) => update('complexSituation', event.target.value)} /></label>
            <label>Proposta de producció o producte<textarea rows="3" value={values.expectedProduct || ''} onChange={(event) => update('expectedProduct', event.target.value)} /></label>
            <label>Llengua de vehiculació<input value={values.vehicularLanguage || ''} onChange={(event) => update('vehicularLanguage', event.target.value)} /></label>
          </section>
          <PlanningUnitResources onChange={update} onSave={onSaveResources} hasChanges={resourcesPending} values={values} />
        </div>
      </details>
      <PlanningActivitySequence
        activities={activities}
        completedActivityIds={allCompletedActivityIds}
        completedActivitiesLoading={completedActivitiesLoading}
        completionBusyId={completionBusyId}
        manuallyCompletedActivityIds={manuallyCompletedActivityIds}
        onAdd={onAddActivity}
        onAddChildPhase={onAddChildPhase}
        onAddPhase={onAddPhase}
        onDelete={onDeleteActivity}
        onDeletePhase={onDeletePhase}
        onEdit={onEditActivity}
        onEditPhase={onEditPhase}
        onMove={onMoveActivity}
        onMovePhase={onMovePhase}
        onSetManualCompletion={setManualCompletion}
        phases={phases}
        planningUnit={values}
      />
      <PlanningResourceCoverage unit={values} activities={activities} completedActivityIds={allCompletedActivityIds} />
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
    <aside aria-label="Resum de la UP" className="planning-unit-summary">
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
    </aside>
  )
}

export default function PlanningModule({ embedded = false, tutorialContext: forcedTutorialContext = null }) {
  const user = useAvaluaproStore((state) => state.cloud.user)
  const sharedTutoringSpaces = useAvaluaproStore((state) => state.cloud.sharedTutoringSpaces || [])
  const classes = useAvaluaproStore((state) => state.classes)
  const storeActiveClassId = useAvaluaproStore((state) => state.ui.activeClassId)
  const students = useAvaluaproStore((state) => state.students)
  const competencies = useAvaluaproStore((state) => state.competencies)
  const criteria = useAvaluaproStore((state) => state.criteria)
  const indicators = useAvaluaproStore((state) => state.indicators)
  const uts = useAvaluaproStore((state) => state.uts)
  const agendaNotes = useAvaluaproStore((state) => state.agendaNotes)
  const updateAgendaNote = useAvaluaproStore((state) => state.updateAgendaNote)
  const setActiveClass = useAvaluaproStore((state) => state.setActiveClass)
  const setActiveMode = useAvaluaproStore((state) => state.setActiveMode)
  const resolvedTutorialContext = useMemo(
    () => resolveTutorialPlanningContext(classes, storeActiveClassId),
    [classes, storeActiveClassId],
  )
  const tutorialContext = forcedTutorialContext || resolvedTutorialContext
  const [planningContext, setPlanningContext] = useState(forcedTutorialContext ? 'tutorial' : 'subject')
  const isTutorialPlanning = Boolean(
    forcedTutorialContext
    || (planningContext === 'tutorial' && resolvedTutorialContext.tutoringSpaceId),
  )
  const tutorialSpaceId = isTutorialPlanning ? tutorialContext?.tutoringSpaceId || '' : ''
  const contextClassId = isTutorialPlanning
    ? tutorialContext?.scheduleClass?.id || storeActiveClassId
    : storeActiveClassId
  const activeClassId = contextClassId
  const workspace = usePlanningWorkspace(user, contextClassId, { tutoringSpaceId: tutorialSpaceId })
  const [unitDraft, setUnitDraft] = useState(null)
  const unitDraftKey = `${workspace.activePlanningUnit?.id || ''}:${activeClassId}`
  const unitValues = getPlanningUnitDraftValues(workspace.activePlanningUnit, unitDraft, unitDraftKey)
  const updateUnitDraft = (field, value) => setUnitDraft(current => updatePlanningUnitDraft(current, unitDraftKey, field, value))
  const acknowledgeUnitDraft = snapshot => setUnitDraft(current => acknowledgePlanningUnitDraft(current, unitDraftKey, snapshot))
  const saveUnitDraft = async (unit, values) => {
    const result = await withConnectedConfirmation(() => workspace.saveUnit(unit, values))
    if (result !== false) acknowledgeUnitDraft(values)
    return result
  }
  const resourcesPending = unitDraft?.key === unitDraftKey && Object.hasOwn(unitDraft.changes, 'resourceSections')
  const saveUnitResources = async sections => {
    const snapshot = { resourceSections: sections }
    const result = await workspace.saveUnit(workspace.activePlanningUnit, snapshot)
    acknowledgeUnitDraft(snapshot)
    return result
  }
  const saveActivityWithResources = async action => {
    if (resourcesPending) await saveUnitResources(unitValues.resourceSections)
    return action()
  }
  const [dialog, setDialog] = useState(null)
  const [showUtManager, setShowUtManager] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [editingUt, setEditingUt] = useState(null)
  const [editingPhase, setEditingPhase] = useState(null)
  const [editingActivity, setEditingActivity] = useState(null)
  const [activityPhaseId, setActivityPhaseId] = useState('')
  const [phaseParentId, setPhaseParentId] = useState('')
  const [connectedDecision, setConnectedDecision] = useState(null)
  const collaboratorSyncRef = useRef('')
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
  const activeClass = classes.find((item) => item.id === contextClassId) || null
  const activityCurriculumOptions = useMemo(() => buildActivityCurriculumOptions({
    classId: contextClassId,
    competencies,
    criteria,
    subjectName: activeClass?.subject || '',
    uts,
  }), [activeClass?.subject, competencies, contextClassId, criteria, uts])
  const activeSharedTutoringSpace = sharedTutoringSpaces.find((space) => space.id === tutorialSpaceId) || null
  const tutorialCollaboratorEmails = useMemo(
    () => getTutorialCollaboratorEmails(tutorialContext, activeSharedTutoringSpace, user?.email),
    [activeSharedTutoringSpace, tutorialContext, user?.email],
  )
  useEffect(() => {
    if (!isTutorialPlanning || workspace.activeRole !== 'owner' || tutorialCollaboratorEmails.length === 0) return
    const key = `${workspace.activePlanningUnit?.id || ''}:${tutorialCollaboratorEmails.join('|')}`
    if (!workspace.activePlanningUnit?.id || collaboratorSyncRef.current === key) return
    collaboratorSyncRef.current = key
    workspace.syncTutoringCollaborators(tutorialCollaboratorEmails)
      .catch((syncError) => {
        collaboratorSyncRef.current = ''
        workspace.setError(syncError.message || 'No s’ha pogut compartir la UP amb la cotutoria.')
      })
  }, [isTutorialPlanning, tutorialCollaboratorEmails, workspace])
  const connectableUnits = useMemo(
    () => isTutorialPlanning
      ? workspace.classPlanningUnits.filter((unit) => !workspace.applications.some((application) => (
          application.planningUnitId === unit.id
          && application.classId === activeClassId
          && (application.managerUid || application.ownerUid) === user?.uid
          && application.status !== 'archived'
        )))
      : getConnectablePlanningUnits(workspace.ownedPlanningUnits, workspace.applications, activeClassId),
    [activeClassId, isTutorialPlanning, user?.uid, workspace.applications, workspace.classPlanningUnits, workspace.ownedPlanningUnits],
  )
  const connectedClassIds = getConnectedClassIds(workspace.applications, workspace.activePlanningUnit?.id)
  const connectedClassLabels = connectedClassIds
    .map((classId) => classes.find((item) => item.id === classId)?.name
      || workspace.applications.find((application) => application.classId === classId)?.classLabel)
    .filter(Boolean)
  const otherConnectedClassLabels = connectedClassLabels.filter((label) => label !== activeClass?.name)
  const requestConnectedScope = (supportsCurrentClass) => {
    // La programació tutorial és una única font compartida: editar-la des de
    // qualsevol dels dos accessos sempre actualitza la UP comuna. Les agendas
    // continuen separades mitjançant les aplicacions de cada docent.
    if (isTutorialPlanning) return Promise.resolve('all')
    if (otherConnectedClassLabels.length === 0) return Promise.resolve('all')
    return new Promise((resolve) => setConnectedDecision({ resolve, supportsCurrentClass }))
  }
  const resolveConnectedDecision = (scope) => {
    const resolve = connectedDecision?.resolve
    setConnectedDecision(null)
    resolve?.(scope)
  }
  const resolveSyncConflict = async (strategy) => {
    const keepLocal = strategy === 'local'
    const confirmed = globalThis.confirm?.(keepLocal
      ? 'Es conservaran els canvis d’aquest dispositiu i substituiran la versió de Firebase. Vols continuar?'
      : 'Es descartaran els canvis pendents d’aquest dispositiu i es recuperarà la versió de Firebase. Vols continuar?')
    if (!confirmed) return
    try {
      await workspace.resolveConflicts(strategy)
    } catch (conflictError) {
      workspace.setError(conflictError.message || 'No s’ha pogut resoldre la diferència entre dispositius.')
    }
  }
  const withConnectedConfirmation = async (allClassesAction, currentClassAction = null) => {
    const scope = await requestConnectedScope(Boolean(currentClassAction))
    if (scope === 'cancel') return false
    return scope === 'current' ? currentClassAction() : allClassesAction()
  }
  const planningReminderSummary = useMemo(
    () => getPlanningReminderSummary({
      agendaNotes,
      classes,
      planningUnitId: workspace.activePlanningUnit?.id || '',
    }),
    [agendaNotes, classes, workspace.activePlanningUnit?.id],
  )

  if (!user) {
    return (
      <section className="planning-auth-required">
        <BookOpenText size={34} />
        <h1>Programació</h1>
        <p>Inicia sessió amb Google des de «Dades i Compte» per crear una programació protegida i disponible als teus dispositius.</p>
      </section>
    )
  }

  const visibleUnits = workspace.classPlanningUnits.filter((unit) => showArchived || unit.status !== 'archived')
  const selectableUnits = workspace.activePlanningUnit && !visibleUnits.some((unit) => unit.id === workspace.activePlanningUnit.id)
    ? [workspace.activePlanningUnit, ...visibleUnits]
    : visibleUnits
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
  const ensureActiveTutorialApplication = async () => {
    if (!isTutorialPlanning || workspace.activeApplication || !workspace.activePlanningUnit) return workspace.activeApplication
    return workspace.connectUnitToClass(workspace.activePlanningUnit, {
      classId: contextClassId,
      classLabel: activeClass?.name || 'Tutoria',
    })
  }
  const openAgendaReflow = async () => {
    try {
      await ensureActiveTutorialApplication()
      if (contextClassId !== storeActiveClassId) await setActiveClass(contextClassId)
    } catch (agendaError) {
      workspace.setError(agendaError.message || 'No s’ha pogut preparar aquesta UP per al teu horari.')
      return
    }
    saveAgendaSchedulingRequest(globalThis.sessionStorage, {
      mode: 'smart',
      planningUnitId: workspace.activePlanningUnit?.id,
    })
    setActiveMode('agenda')
  }

  return (
    <section className={`planning-screen ${embedded ? 'planning-screen-embedded' : ''}`} data-app-module="planning">
      <header className="planning-topbar">
        <div className="planning-title-lockup">
          <span><BookOpenText size={23} /></span>
          <div><p>Planificació pedagògica</p><h1>Programació</h1></div>
        </div>
        {activeClass && (
          <div className="planning-class-context">
            <span style={{ background: isTutorialPlanning ? '#7c3aed' : activeClass.color }} />
            <div>
              <small>{isTutorialPlanning ? 'Programació compartida' : 'Programació de'}</small>
              <strong>{isTutorialPlanning ? 'Classe de tutoria' : activeClass.name}</strong>
            </div>
          </div>
        )}
        <div className="planning-course-controls">
          {!forcedTutorialContext && resolvedTutorialContext.tutoringSpaceId && (
            <label className="planning-context-selector">
              <span>Àmbit</span>
              <select onChange={(event) => setPlanningContext(event.target.value)} value={planningContext}>
                <option value="subject">{classes.find((item) => item.id === storeActiveClassId)?.name || 'La meva matèria'}</option>
                <option value="tutorial">Tutoria compartida</option>
              </select>
            </label>
          )}
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
          {workspace.activePlanningUnit && (
            <button className="secondary-action compact planning-reminders-trigger" onClick={() => setDialog('reminders')} type="button">
              <Bell size={16} />Recordatoris
              {planningReminderSummary.count > 0 && <span>{planningReminderSummary.count}</span>}
            </button>
          )}
          <div className={`planning-sync-recovery ${workspace.sync.state === 'error' ? 'error' : ''}`}>
            <SyncBadge isOnline={workspace.isOnline} sync={workspace.sync} />
            {workspace.sync.state === 'error' && (
              <button aria-label="Reintentar la sincronització de Programació" className="planning-sync-retry" onClick={() => workspace.refreshFromCloud().catch((refreshError) => workspace.setError(refreshError.message || 'No s’ha pogut reintentar la sincronització de Programació.'))} title="Tornar a enviar els canvis pendents a Firebase" type="button"><RotateCcw size={15} />Reintentar sincronització</button>
            )}
          </div>
        </div>
      </header>

      {workspace.error && <div className="planning-message error"><strong>{workspace.error}</strong><button onClick={() => workspace.setError('')} type="button">Tancar</button></div>}
      {workspace.sync.message && workspace.sync.state !== 'review' && (
        <div className="planning-message warning">
          <Cloud size={18} />
          <strong>{workspace.sync.message}</strong>
          {workspace.sync.state === 'error' && (
            <button className="planning-message-retry" onClick={() => workspace.refreshFromCloud().catch((refreshError) => workspace.setError(refreshError.message || 'No s’ha pogut reintentar la sincronització de Programació.'))} type="button"><RotateCcw size={15} />Reintentar sincronització</button>
          )}
        </div>
      )}
      {workspace.sync.state === 'review' && (
        <div className="planning-message warning planning-conflict-message">
          <div><Cloud size={18} /><strong>Hi ha versions diferents en dos dispositius.</strong></div>
          <div className="planning-conflict-actions">
            <button onClick={() => resolveSyncConflict('local')} type="button">Conservar aquest dispositiu</button>
            <button onClick={() => resolveSyncConflict('remote')} type="button">Recuperar Firebase</button>
          </div>
        </div>
      )}

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

      {/* Keep an open editor mounted during background refreshes: its draft
          and the resource inputs must survive until the user saves them. */}
      {workspace.loading && !workspace.activePlanningUnit ? (
        <div className="planning-loading"><Loader2 className="spin" size={26} />Carregant la programació…</div>
      ) : workspace.academicYears.length === 0 && workspace.planningUnits.length === 0 ? (
        <section className="planning-empty-state first-step">
          <span><CalendarRange size={30} /></span><div><h2>Configura el curs acadèmic</h2><p>Les dates es defineixen cada any i no afecten els cursos anteriors.</p></div>
          <button className="primary-action" onClick={() => setDialog('year')} type="button"><Plus size={17} />Crear el curs</button>
        </section>
      ) : workspace.classPlanningUnits.length === 0 ? (
        <EmptyPlanning className={activeClass?.name} hasTemporalUnits={workspace.temporalUnits.length > 0} onConnectUnit={() => setDialog('connect')} onCreateUnit={() => setDialog('unit')} onCreateUt={() => setDialog('ut')} />
      ) : (
        <div className="planning-workbench">
          <main className="planning-editor-panel">
            <nav aria-label="Unitats de programació" className="planning-unit-toolbar">
              <label>
                <span>Unitat de programació</span>
                <select aria-label="Unitat de programació" onChange={(event) => workspace.setActivePlanningUnitId(event.target.value)} value={workspace.activePlanningUnitId || ''}>
                  {selectableUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>{unit.code} · {unit.title}{unit.status === 'archived' ? ' · Arxivada' : ''}</option>
                  ))}
                </select>
              </label>
              <div>
                {!isTutorialPlanning && <button className="secondary-action compact" onClick={() => setDialog('connect')} type="button"><Link2 size={15} />Connectar</button>}
                {workspace.activePlanningUnit && workspace.canEditActiveUnit && <button className="secondary-action compact" onClick={() => setDialog('transversalMaterials')} type="button"><BookOpenText size={15} />Materials transversals</button>}
                <button className="secondary-action compact" disabled={workspace.temporalUnits.length === 0 || !workspace.activeAcademicYear} onClick={() => setDialog('unit')} type="button"><Plus size={15} />Nova UP</button>
                <button className={`secondary-action compact ${showArchived ? 'active' : ''}`} onClick={() => setShowArchived((value) => !value)} type="button">
                  <Archive size={14} />{showArchived ? 'Amagar arxivades' : 'Arxivades'}
                </button>
              </div>
            </nav>
            {workspace.activePlanningUnit && workspace.canEditActiveUnit ? (
              <>
                {connectedClassLabels.length > 1 && (
                  <div className="planning-connected-banner"><Users size={17} /><span>Aquesta UP està connectada amb <strong>{connectedClassLabels.join(' i ')}</strong>. En canviar una activitat podràs aplicar-ho només a la classe actual o a totes.</span></div>
                )}
                {isTutorialPlanning && !workspace.activeApplication && (
                  <div className="planning-tutoring-agenda-banner">
                    <CalendarClock size={18} />
                    <div><strong>UP compartida, agenda pròpia</strong><span>Connecta-la a la teva classe de tutoria per calendaritzar-la sense barrejar les sessions de la cotutora.</span></div>
                    <button className="secondary-action compact" onClick={() => ensureActiveTutorialApplication().catch((error) => workspace.setError(error.message))} type="button">Connectar al meu horari</button>
                  </div>
                )}
                <UnitEditor
                  activities={workspace.activities}
                  loadCompletedActivityIds={workspace.loadCompletedActivityIds}
                  manuallyCompletedActivityIds={workspace.manuallyCompletedActivityIds}
                  curriculumCatalog={curriculumCatalog}
                  key={`${workspace.activePlanningUnit.id}:${activeClassId}`}
                  canManageUnit={workspace.activeRole === 'owner'}
                  onAcceptImprovements={(proposalIds) => withConnectedConfirmation(() => workspace.acceptImprovementSuggestions(proposalIds))}
                  onAddActivity={(phaseId) => handleOpenActivity(null, phaseId)}
                  onAddChildPhase={(parentId) => handleOpenPhase(null, parentId)}
                  onAddPhase={() => handleOpenPhase()}
                  onArchive={(unit) => withConnectedConfirmation(() => workspace.archiveUnit(unit))}
                  onDeleteActivity={(activity) => handleActivityAction(() => withConnectedConfirmation(
                    () => workspace.removeActivity(activity),
                    () => workspace.removeActivityForActiveClass(activity),
                  ))}
                  onDeletePhase={(phase) => handleActivityAction(() => withConnectedConfirmation(
                    () => workspace.removePhase(phase),
                  ))}
                  onDuplicate={() => setDialog('annualCopy')}
                  onEditActivity={(activity) => handleOpenActivity(activity)}
                  onEditPhase={(phase) => handleOpenPhase(phase)}
                  onError={(error) => workspace.setError(error.message || 'No s’ha pogut desar la UP.')}
                  onMoveActivity={(move) => handleActivityAction(() => withConnectedConfirmation(
                    () => workspace.moveActivity(move),
                    () => workspace.moveActivityForActiveClass(move),
                  ))}
                  onMovePhase={(move) => handleActivityAction(() => withConnectedConfirmation(
                    () => workspace.movePhase(move),
                  ))}
                  onOpenDocuments={() => setDialog('documents')}
                  onOpenHistory={() => setDialog('history')}
                  onOpenApplication={workspace.canReadActiveApplications ? () => setDialog('application-preview') : null}
                  onOpenPreview={() => setDialog('preview')}
                  onOpenSharing={() => setDialog('sharing')}
                  onReactivate={(unit) => withConnectedConfirmation(() => workspace.saveUnit(unit, { status: 'draft' }))}
                  values={unitValues}
                  onChange={updateUnitDraft}
                  onSaveResources={saveUnitResources}
                  resourcesPending={resourcesPending}
                  onSave={saveUnitDraft}
                  onSetActivityManualCompletion={workspace.setActivityManualCompletion}
                  phases={workspace.phases}
                  sourceYearLabel={sourceYearLabel}
                  temporalUnit={activeTemporalUnit}
                  unit={workspace.activePlanningUnit}
                />
              </>
            ) : workspace.activePlanningUnit ? (
              <PlanningSharedView
                activities={workspace.activities}
                classes={classes}
                loadApplications={workspace.canReadActiveApplications ? workspace.loadApplicationOverview : null}
                phases={workspace.phases}
                role={workspace.activeRole}
                unit={workspace.activePlanningUnit}
              />
            ) : (
              <EmptyPlanning className={activeClass?.name} hasTemporalUnits={workspace.temporalUnits.length > 0} onConnectUnit={() => setDialog('connect')} onCreateUnit={() => setDialog('unit')} onCreateUt={() => setDialog('ut')} />
            )}
          </main>
        </div>
      )}

      {workspace.activePlanningUnit && (
        <button className="planning-agenda-floating" onClick={openAgendaReflow} title="Actualitzar les sessions futures de l’Agenda" type="button">
          <CalendarClock size={18} /><span>Actualitzar Agenda</span>
        </button>
      )}

      {dialog === 'year' && <AcademicYearDialog onClose={() => setDialog(null)} onSave={workspace.createYear} />}
      {dialog === 'ut' && <TemporalUnitDialog initialValue={editingUt} onClose={() => { setDialog(null); setEditingUt(null) }} onSave={(values) => editingUt ? workspace.saveTemporalUnit(editingUt, values) : workspace.createTemporalUnit(values)} />}
      {dialog === 'unit' && <PlanningUnitDialog onClose={() => setDialog(null)} onSave={(values) => workspace.createUnit(values, { classId: activeClassId, classLabel: activeClass?.name })} temporalUnits={workspace.temporalUnits} />}
      {dialog === 'connect' && <PlanningConnectionDialog applications={workspace.applications} classes={classes} currentClass={activeClass} onClose={() => setDialog(null)} onSave={(unit) => workspace.connectUnitToClass(unit, { classId: activeClassId, classLabel: activeClass?.name })} units={connectableUnits} />}
      {dialog === 'transversalMaterials' && workspace.activePlanningUnit && <TransversalMaterialsDialog onClose={() => setDialog(null)} onError={(error) => workspace.setError(error.message || 'No s’han pogut desar els materials transversals.')} onSave={(unit, values) => withConnectedConfirmation(() => workspace.saveUnit(unit, values))} unit={workspace.activePlanningUnit} />}
      {dialog === 'phase' && <PhaseDialog initialValue={editingPhase} onClose={() => { setDialog(null); setEditingPhase(null); setPhaseParentId('') }} onSave={(values, current) => withConnectedConfirmation(() => workspace.savePhase(values, current))} parentPhaseId={phaseParentId} />}
      {dialog === 'activity' && <ActivityDialog activities={workspace.activities} planningUnit={unitValues} availableCompetencies={activityCurriculumOptions} classes={classes} initialPhaseId={activityPhaseId} initialValue={editingActivity} onClose={() => { setDialog(null); setEditingActivity(null); setActivityPhaseId('') }} onSave={(values, current) => withConnectedConfirmation(
        () => saveActivityWithResources(() => workspace.saveActivity(values, current)),
        () => saveActivityWithResources(() => workspace.saveActivityForActiveClass(values, current)),
      )} phases={workspace.phases} students={students} />}
      {dialog === 'annualCopy' && <AnnualCopyDialog academicYears={workspace.academicYears} loadTemporalUnits={workspace.loadTemporalUnitsForYear} onClose={() => setDialog(null)} onSave={(values) => workspace.duplicateUnitToAcademicYear(values, { classId: activeClassId, classLabel: activeClass?.name })} sourceYearId={workspace.activeAcademicYearId} />}
      {dialog === 'history' && <ActivityHistoryDialog loadStructure={workspace.loadHistoricalUnitStructure} loadUnits={workspace.loadHistoricalUnits} onClose={() => setDialog(null)} onSave={(values) => withConnectedConfirmation(() => workspace.copyHistoricalActivity(values))} phases={workspace.phases} />}
      {dialog === 'sharing' && workspace.activePlanningUnit && <PlanningSharingDialog classes={classes} grants={workspace.accessGrants} onClose={() => setDialog(null)} onRevoke={workspace.revokeAccessGrant} onSave={workspace.saveAccessGrant} unit={workspace.activePlanningUnit} />}
      {dialog === 'documents' && <PlanningDocumentDialog activities={workspace.activities} onClose={() => setDialog(null)} onImportBundle={(bundle, temporalUnitId) => workspace.importPlanningBundle(bundle, temporalUnitId, { classId: activeClassId, classLabel: activeClass?.name })} onImportTable={workspace.activePlanningUnit ? (rows, phaseId) => withConnectedConfirmation(() => workspace.importPlanningTable(rows, phaseId)) : null} phases={workspace.phases} temporalUnits={workspace.temporalUnits} unit={workspace.activePlanningUnit} />}
      {['preview', 'application-preview'].includes(dialog) && workspace.activePlanningUnit && <PlanningPreviewDialog onShare={workspace.activeRole === 'owner' ? () => setDialog('sharing') : undefined} initialTab={dialog === 'application-preview' ? 'applications' : 'program'} activities={workspace.activities} classes={classes} loadApplications={workspace.loadApplicationOverview} onClose={() => setDialog(null)} phases={workspace.phases} unit={workspace.activePlanningUnit} />}
      {dialog === 'reminders' && workspace.activePlanningUnit && <PlanningRemindersDialog agendaNotes={agendaNotes} classes={classes} onClose={() => setDialog(null)} onUpdate={updateAgendaNote} unit={workspace.activePlanningUnit} />}
      {connectedDecision && <ConnectedChangeDialog activeClassName={activeClass?.name || 'aquesta classe'} onChoose={resolveConnectedDecision} otherClassNames={otherConnectedClassLabels} supportsCurrentClass={connectedDecision.supportsCurrentClass} />}
    </section>
  )
}
