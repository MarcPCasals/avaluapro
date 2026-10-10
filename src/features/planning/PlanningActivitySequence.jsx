import { orderPlanningPhases } from '../../domain/planning/phaseSequence'
import { normalizeActivityResourceSelections } from '../../domain/planning/resources'
import { useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowDown, ArrowUp, ArrowRight, BookOpenText, CheckCircle2, ChevronDown, Clock3, Eye, EyeOff, ExternalLink, History, Layers3, Loader2, Menu, Pencil,
  Plus, RotateCcw, Trash2, X,
} from 'lucide-react'
import { ContextualHelp } from '../../components/ContextualHelp'
import { FormattedText } from '../../components/FormattedText'
import { getEffectiveActivityMaterialLinks } from '../../domain/planning/materials'
import { openExternalLinks } from '../../lib/openExternalLinks'
import {
  getPlanningTotals,
  getProgrammableMinutes,
  getSessionLoad,
} from '../../domain/planning/rules'

const TYPE_DETAILS = {
  activity: { icon: BookOpenText, label: 'Activitat' },
  indication: { icon: Layers3, label: 'Indicació' },
  transition: { icon: ArrowRight, label: 'Pausa o transició' },
}

function ActivityRow({ activity, progress, completionBusy, dragId, isCompleted, isManuallyCompleted, onDelete, onDragEnd, onDragStart, onDrop, onEdit, onKeyboardMove, onSetManualCompletion, onTouchDrop, planningUnit, programmableMinutes, sequenceNumber, sessionDuration }) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const [blockedLinks, setBlockedLinks] = useState([])
  const TypeIcon = TYPE_DETAILS[activity.type]?.icon || BookOpenText
  const links = getEffectiveActivityMaterialLinks(activity, planningUnit)
  const materialCount = (activity.teacherMaterials?.length || 0)
    + (activity.studentMaterials?.length || 0)
    + (planningUnit?.transversalMaterials?.length || 0)
  const resources = normalizeActivityResourceSelections(activity.resourceSelections)
  const competencyCount = activity.curriculumSelections?.length || 0
  const criterionCount = (activity.curriculumSelections || []).reduce((total, selection) => total + (selection.assessmentCriteria?.length || 0), 0)
  const load = activity.plannedMinutes ? getSessionLoad([activity], sessionDuration) : null
  return (
    <article
      className={`planning-activity-row ${dragId === activity.id ? 'dragging' : ''}`}
      data-activity-id={activity.id}
      data-phase-id={activity.phaseId}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        if (event.dataTransfer.getData('text/plain').startsWith('phase:')) return
        event.preventDefault()
        event.stopPropagation()
        onDrop(activity.phaseId, activity.id, event.dataTransfer.getData('text/plain'))
      }}
    >
      <button
        aria-label={`Reordenar ${activity.title}. Arrossega o prem Alt i fletxa amunt o avall`}
        className="planning-drag-handle"
        draggable
        onDragEnd={onDragEnd}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setData('text/plain', activity.id)
          onDragStart(activity.id)
        }}
        onKeyDown={(event) => {
          if (!event.altKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) return
          event.preventDefault()
          onKeyboardMove(activity, event.key === 'ArrowUp' ? -1 : 1)
        }}
        onPointerCancel={onDragEnd}
        onPointerDown={(event) => {
          if (event.pointerType === 'mouse') return
          event.preventDefault()
          event.currentTarget.setPointerCapture(event.pointerId)
          onDragStart(activity.id)
        }}
        onPointerUp={(event) => {
          if (event.pointerType === 'mouse') return
          event.currentTarget.releasePointerCapture(event.pointerId)
          onTouchDrop(event.clientX, event.clientY)
        }}
        title="Arrossega o usa Alt + fletxa amunt/avall"
        type="button"
      ><Menu size={18} /></button>
      <span className={`planning-activity-type ${activity.type || 'activity'}`} title={TYPE_DETAILS[activity.type]?.label || 'Activitat'}><TypeIcon size={16} /></span>
      <div className="planning-activity-text">
        <button className="planning-activity-content" onClick={() => onEdit(activity)} type="button">
          <strong><span className="planning-sequence-code">A{sequenceNumber}</span>{activity.title}</strong>
          {activity.description && <FormattedText as="span" text={activity.description} />}
          <small>
            {activity.grouping && <span>{activity.grouping}</span>}
            {activity.space && <span>{activity.space}</span>}
            {resources.length > 0 && <span>{resources.length} {resources.length === 1 ? 'recurs de competències' : 'recursos de competències'}</span>}
            {materialCount > 0 && <span>{materialCount} {materialCount === 1 ? 'material' : 'materials'}</span>}
            {competencyCount > 0 && <span>{competencyCount} {competencyCount === 1 ? 'competència' : 'competències'}</span>}
            {criterionCount > 0 && <span>{criterionCount} {criterionCount === 1 ? 'criteri' : 'criteris'}</span>}
            {competencyCount === 0 && activity.indicatorIds?.length > 0 && <span>{activity.indicatorIds.length} {activity.indicatorIds.length === 1 ? 'indicador anterior' : 'indicadors anteriors'}</span>}
            {activity.diversityMeasures?.length > 0 && <span>{activity.diversityMeasures.length} {activity.diversityMeasures.length === 1 ? 'mesura' : 'mesures'}</span>}
            {activity.groupOverride && <span className="planning-group-override-mark">Adaptada a aquest grup</span>}
            {activity.copiedFrom && <span className="planning-source-mark" title="Activitat recuperada d’una programació anterior"><History size={11} />Recuperada</span>}
          </small>
        </button>
        {activity.description && (
          <button
            aria-controls={`planning-description-${activity.id}`}
            aria-expanded={descriptionExpanded}
            className="planning-description-toggle"
            onClick={() => setDescriptionExpanded((current) => !current)}
            type="button"
          >Descripció<ChevronDown aria-hidden="true" className={descriptionExpanded ? 'expanded' : ''} size={13} /></button>
        )}
        {progress?.hasSchedule && !progress.completed && !progress.withdrawn && progress.remainingMinutes != null && <span className="planning-agenda-progress" title="Minuts pendents segons la cronologia del grup. La durada original de Programació es conserva."><Clock3 size={12} />Agenda: {Math.round(progress.remainingMinutes * 10) / 10} min pendents</span>}
      </div>
      <div className="planning-activity-meta">
        {!isCompleted && !progress?.withdrawn && (
          <button
            className="planning-completion-toggle"
            disabled={completionBusy}
            onClick={() => onSetManualCompletion(activity, true)}
            title="Marcar manualment aquesta activitat com a feta per al grup actual"
            type="button"
          >{completionBusy ? <Loader2 className="spin" size={13} /> : <CheckCircle2 size={13} />}Fet</button>
        )}
        {isManuallyCompleted && (
          <button
            className="planning-completion-toggle completed"
            disabled={completionBusy}
            onClick={() => onSetManualCompletion(activity, false)}
            title="Desfer la marca manual d’activitat feta"
            type="button"
          >{completionBusy ? <Loader2 className="spin" size={13} /> : <RotateCcw size={13} />}Desfer fet</button>
        )}
        {progress?.withdrawn && <><span className="planning-completion-status">Retirada de la cronologia</span><button className="planning-description-toggle" disabled={completionBusy} onClick={() => onSetManualCompletion(activity, 'restore')} type="button">Recuperar</button></>}
        {progress && !progress.hasSchedule && !progress.withdrawn && !isCompleted && <button className="planning-description-toggle" disabled={completionBusy} onClick={() => onSetManualCompletion(activity, 'withdrawn')} title="Retirar dels pendents del grup conservant l’activitat" type="button">Retirar</button>}
        {isCompleted && !isManuallyCompleted && <span className="planning-completion-status"><CheckCircle2 size={13} />Feta automàticament</span>}
        <span className={`planning-time-pill ${load?.status || 'untimed'}`} title={load?.status === 'red' ? `Supera els ${programmableMinutes} minuts programables` : ''}>
          <Clock3 size={13} />{activity.plannedMinutes ? `${activity.plannedMinutes} min` : 'Sense temps'}
        </span>
        {links.length > 0 && (
          <button
            aria-label={links.length === 1 ? `Obrir ${links[0].label}` : `Obrir els ${links.length} enllaços de ${activity.title}`}
            className="planning-open-links"
            onClick={() => setBlockedLinks(openExternalLinks(links))}
            title={links.length === 1 ? 'Obrir l’enllaç' : `Obrir ${links.length} enllaços en pestanyes noves`}
            type="button"
          ><ExternalLink size={14} /></button>
        )}
      </div>
      <div className="planning-activity-actions">
        <button aria-label={`Editar ${activity.title}`} className="icon-action" onClick={() => onEdit(activity)} type="button"><Pencil size={15} /></button>
        <button aria-label={`Eliminar ${activity.title}`} className="icon-action danger" onClick={() => onDelete(activity)} type="button"><Trash2 size={15} /></button>
      </div>
      {resources.length > 0 && <details className="planning-activity-resources"><summary>Recursos vinculats ({resources.length})</summary><ul>{resources.map((resource, index) => <li key={index}>{resource.text}</li>)}</ul></details>}
      {descriptionExpanded && (
        <FormattedText
          as="div"
          className="planning-activity-description-expanded"
          id={`planning-description-${activity.id}`}
          text={activity.description}
        />
      )}
      {blockedLinks.length > 0 && (
        <div className="planning-blocked-material-links" role="status">
          <AlertTriangle aria-hidden="true" size={17} />
          <div><strong>El navegador ha bloquejat {blockedLinks.length === 1 ? 'un material' : `${blockedLinks.length} materials`}</strong><span>{blockedLinks.length === 1 ? 'Obre’l' : 'Obre’ls'} des d’aquí o permet les finestres emergents d’AvaluaPro per obrir-los tots amb un sol clic.</span><div>{blockedLinks.map((material) => <a className={material.audience === 'teacher' ? 'teacher' : 'students'} href={material.url} key={`${material.audience}:${material.url}`} rel="noreferrer" target="_blank"><ExternalLink size={12} />{material.label}<em>{material.audience === 'teacher' ? 'Docent' : 'Alumnat'}</em></a>)}</div></div>
          <button aria-label="Tancar l’avís de materials bloquejats" onClick={() => setBlockedLinks([])} type="button"><X size={15} /></button>
        </div>
      )}
    </article>
  )
}

export function PlanningActivitySequence({ activities, activityProgress = {}, completedActivityIds = new Set(), completedActivitiesLoading = false, completionBusyId = '', manuallyCompletedActivityIds = new Set(), onAdd, onAddChildPhase, onAddPhase, onDelete, onDeletePhase, onEdit, onEditPhase, onMove, onMovePhase, onSetManualCompletion, phases, planningUnit }) {
  const [dragId, setDragId] = useState('')
  const [phaseDragId, setPhaseDragId] = useState('')
  const [phaseDropId, setPhaseDropId] = useState('')
  const [phaseMoveBusy, setPhaseMoveBusy] = useState(false)
  const [sessionDuration, setSessionDuration] = useState(60)
  const [showCompleted, setShowCompleted] = useState(false)
  const flatPhases = useMemo(() => orderPlanningPhases(phases), [phases])
  const excludedActivityIds = useMemo(() => new Set([...completedActivityIds, ...Object.keys(activityProgress).filter(id => activityProgress[id].withdrawn)]), [completedActivityIds, activityProgress])
  const completedCount = activities.filter((activity) => excludedActivityIds.has(activity.id)).length
  const rootPhaseNumberById = useMemo(() => new Map(flatPhases
    .filter((phase) => phase.depth === 0)
    .map((phase, index) => [phase.id, index + 1])), [flatPhases])
  const sequenceNumberById = useMemo(() => new Map(flatPhases
    .flatMap((phase) => activities
      .filter((activity) => activity.phaseId === phase.id)
      .sort((left, right) => Number(left.order) - Number(right.order)))
    .map((activity, index) => [activity.id, index + 1])), [activities, flatPhases])
  const orderedActivities = useMemo(() => flatPhases.flatMap((phase) => activities
    .filter((activity) => activity.phaseId === phase.id && (showCompleted || !excludedActivityIds.has(activity.id)))
    .sort((left, right) => Number(left.order) - Number(right.order))), [activities, excludedActivityIds, flatPhases, showCompleted])
  const totals = useMemo(() => getPlanningTotals(phases, activities), [activities, phases])
  const programmableMinutes = getProgrammableMinutes(sessionDuration)
  const approximateSessions = totals.totalMinutes > 0 ? Math.ceil(totals.totalMinutes / programmableMinutes) : 0
  const drop = async (targetPhaseId, targetActivityId = null, transferredActivityId = '') => {
    if (phaseDragId || transferredActivityId.startsWith('phase:')) return
    const activityId = transferredActivityId || dragId
    if (!activityId) return
    setDragId('')
    await onMove({ activityId, targetActivityId, targetPhaseId })
  }
  const touchDrop = (clientX, clientY) => {
    const target = globalThis.document?.elementFromPoint(clientX, clientY)?.closest?.('[data-phase-id]')
    if (!target) {
      setDragId('')
      return
    }
    drop(target.dataset.phaseId, target.dataset.activityId || null)
  }
  const keyboardMove = async (activity, direction) => {
    const index = orderedActivities.findIndex((item) => item.id === activity.id)
    const neighbour = orderedActivities[index + direction]
    if (!neighbour) return
    if (direction < 0) {
      await onMove({ activityId: activity.id, targetActivityId: neighbour.id, targetPhaseId: neighbour.phaseId })
      return
    }
    const following = orderedActivities[index + 2]
    await onMove({
      activityId: activity.id,
      targetActivityId: following?.phaseId === neighbour.phaseId ? following.id : null,
      targetPhaseId: neighbour.phaseId,
    })
  }
  const phaseSiblings = (phase) => flatPhases.filter((item) =>
    (item.parentPhaseId || null) === (phase.parentPhaseId || null))
  const finishPhaseDrag = () => {
    setPhaseDragId('')
    setPhaseDropId('')
  }
  const movePhase = async (phaseId, targetPhaseId) => {
    finishPhaseDrag()
    if (phaseMoveBusy || phaseId === targetPhaseId) return
    setPhaseMoveBusy(true)
    try {
      await onMovePhase({ phaseId, targetPhaseId })
    } finally {
      setPhaseMoveBusy(false)
    }
  }
  const movePhaseByDirection = (phase, direction) => {
    const siblings = phaseSiblings(phase)
    const index = siblings.findIndex((item) => item.id === phase.id)
    if (!siblings[index + direction]) return
    return movePhase(phase.id, direction < 0 ? siblings[index - 1].id : siblings[index + 2]?.id || null)
  }
  const dropPhase = (phase, clientY, sourceId = phaseDragId) => {
    const source = flatPhases.find((item) => item.id === sourceId)
    if (!source || source.id === phase.id || !phaseSiblings(source).some((item) => item.id === phase.id)) {
      finishPhaseDrag()
      return
    }
    const header = globalThis.document?.querySelector(`[data-sequence-phase-id="${phase.id}"] > header`)
    const rect = header?.getBoundingClientRect()
    const after = rect && clientY > rect.top + rect.height / 2
    const siblings = phaseSiblings(phase).filter((item) => item.id !== sourceId)
    const index = siblings.findIndex((item) => item.id === phase.id)
    return movePhase(sourceId, after ? siblings[index + 1]?.id || null : phase.id)
  }
  const touchPhaseDrop = (clientX, clientY) => {
    const target = globalThis.document?.elementFromPoint(clientX, clientY)?.closest?.('[data-sequence-phase-id]')
    const phase = flatPhases.find((item) => item.id === target?.dataset.sequencePhaseId)
    if (phase) return dropPhase(phase, clientY)
    finishPhaseDrag()
  }
  const remove = async (activity) => {
    if (!globalThis.confirm?.(`Vols eliminar «${activity.title}» de la seqüència?`)) return
    await onDelete(activity)
  }
  const removePhase = async (phase) => {
    const phaseIds = new Set([phase.id])
    let foundDescendant = true
    while (foundDescendant) {
      foundDescendant = false
      phases.forEach((item) => {
        if (item.parentPhaseId && phaseIds.has(item.parentPhaseId) && !phaseIds.has(item.id)) {
          phaseIds.add(item.id)
          foundDescendant = true
        }
      })
    }
    const activityCount = activities.filter((activity) => phaseIds.has(activity.phaseId)).length
    const childCount = phaseIds.size - 1
    const contents = [
      childCount ? `${childCount} ${childCount === 1 ? 'subfase' : 'subfases'}` : '',
      activityCount ? `${activityCount} ${activityCount === 1 ? 'activitat' : 'activitats'}` : '',
    ].filter(Boolean).join(' i ')
    const message = contents
      ? `Vols eliminar «${phase.title}» i també ${contents}? Aquesta acció no es pot desfer.`
      : `Vols eliminar «${phase.title}»?`
    if (!globalThis.confirm?.(message)) return
    await onDeletePhase(phase)
  }

  return (
    <section className="planning-sequence-section">
      <div className="planning-sequence-heading">
        <div className="planning-section-title">
          <span>03</span>
          <div className="contextual-section-title"><h3>Seqüència d’activitats</h3><ContextualHelp title="Seqüència d’activitats">Ordena les activitats, indicacions i transicions tal com es treballaran. La temporització servirà després per distribuir-les a l’Agenda. Mou una fase o subfase sencera amb la nansa del títol o les fletxes. Conserva totes les activitats i el seu nom; les subfases es reordenen dins de la mateixa fase mare.</ContextualHelp></div>
        </div>
        <div className="planning-sequence-tools">
          {completedActivitiesLoading && <span className="planning-completed-loading">Comprovant activitats fetes…</span>}
          {!completedActivitiesLoading && completedCount > 0 && (
            <button className="secondary-action compact" onClick={() => setShowCompleted((current) => !current)} type="button">
              {showCompleted ? <EyeOff size={15} /> : <Eye size={15} />}
              {showCompleted ? 'Amagar fetes i retirades' : `Mostrar fetes i retirades (${completedCount})`}
            </button>
          )}
          <button className="secondary-action compact" onClick={onAddPhase} type="button"><Plus size={15} />Afegir fase</button>
          <div className="planning-budget-summary">
            <label>Franja de referència<select value={sessionDuration} onChange={(event) => setSessionDuration(Number(event.target.value))}>
              <option value="60">60 min</option><option value="90">90 min</option><option value="120">120 min</option>
            </select></label>
            <div><strong>{totals.totalMinutes} min</strong><span>{programmableMinutes} min programables · {approximateSessions || 0} {approximateSessions === 1 ? 'sessió orientativa' : 'sessions orientatives'}</span></div>
          </div>
        </div>
      </div>

      <div className="planning-sequence-list">
        {flatPhases.map((phase) => {
          const allPhaseActivities = activities
            .filter((activity) => activity.phaseId === phase.id)
            .sort((left, right) => Number(left.order) - Number(right.order))
          const phaseActivities = showCompleted
            ? allPhaseActivities
            : allPhaseActivities.filter((activity) => !excludedActivityIds.has(activity.id))
          if (!showCompleted && allPhaseActivities.length > 0 && phaseActivities.length === 0) return null
          const siblings = phaseSiblings(phase)
          const siblingIndex = siblings.findIndex((item) => item.id === phase.id)
          return (
            <section
              data-sequence-phase-id={phase.id}
              onDragOver={(event) => {
                if (!phaseDragId) return
                event.preventDefault()
                if (siblings.some((item) => item.id === phaseDragId) && phase.id !== phaseDragId) setPhaseDropId(phase.id)
              }}
              onDrop={(event) => {
                const transferred = event.dataTransfer.getData('text/plain')
                if (!phaseDragId && !transferred.startsWith('phase:')) return
                event.preventDefault()
                event.stopPropagation()
                dropPhase(phase, event.clientY, phaseDragId || transferred.slice(6))
              }}
              className={`planning-sequence-phase ${phase.kind} ${phase.depth === 0 ? 'root-phase' : 'subphase'} ${phaseDragId === phase.id ? 'phase-dragging' : ''} ${phaseDropId === phase.id ? 'phase-drop-target' : ''}`} key={phase.id} style={{ '--phase-depth': phase.depth }}>
              <header>
                <div>
                  <button
                    aria-label={`Reordenar ${phase.parentPhaseId ? 'subfase' : 'fase'} ${phase.title}. Arrossega o prem Alt i fletxa amunt o avall`}
                    className="planning-drag-handle planning-phase-drag-handle"
                    disabled={phaseMoveBusy || siblings.length < 2}
                    onKeyDown={(event) => {
                      if (!event.altKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) return
                      event.preventDefault()
                      movePhaseByDirection(phase, event.key === 'ArrowUp' ? -1 : 1)
                    }}
                    onPointerCancel={finishPhaseDrag}
                    onPointerDown={(event) => {
                      if (event.button !== 0) return
                      event.preventDefault()
                      event.currentTarget.setPointerCapture(event.pointerId)
                      setDragId('')
                      setPhaseDragId(phase.id)
                    }}
                    onPointerMove={(event) => {
                      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
                      const target = globalThis.document?.elementFromPoint(event.clientX, event.clientY)?.closest?.('[data-sequence-phase-id]')
                      const targetId = target?.dataset.sequencePhaseId
                      setPhaseDropId(targetId !== phase.id && siblings.some((item) => item.id === targetId) ? targetId : '')
                    }}
                    onPointerUp={(event) => {
                      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
                      event.currentTarget.releasePointerCapture(event.pointerId)
                      touchPhaseDrop(event.clientX, event.clientY)
                    }}
                    title="Moure tot el bloc amb les seves activitats"
                    type="button"
                  ><Menu size={18} /></button>
                  <span /><div><strong>{phase.depth === 0 ? `FASE ${rootPhaseNumberById.get(phase.id)} — ${phase.title.toLocaleUpperCase('ca')}` : phase.title}</strong><small>{totals.totalsByPhase[phase.id] || 0} min · {phaseActivities.length} elements</small></div></div>
                <div className="planning-sequence-phase-actions">
                  <button aria-label={`Pujar ${phase.title}`} className="icon-action planning-phase-move" disabled={phaseMoveBusy || siblingIndex === 0} onClick={() => movePhaseByDirection(phase, -1)} title="Pujar tot el bloc" type="button"><ArrowUp size={15} /></button>
                  <button aria-label={`Baixar ${phase.title}`} className="icon-action planning-phase-move" disabled={phaseMoveBusy || siblingIndex === siblings.length - 1} onClick={() => movePhaseByDirection(phase, 1)} title="Baixar tot el bloc" type="button"><ArrowDown size={15} /></button>
                  <button aria-label={`Afegir subfase a ${phase.title}`} className="icon-action" onClick={() => onAddChildPhase(phase.id)} title="Afegir subfase" type="button"><Plus size={15} /></button>
                  <button aria-label={`Editar ${phase.title}`} className="icon-action" onClick={() => onEditPhase(phase)} title="Editar fase" type="button"><Pencil size={15} /></button>
                  <button
                    aria-label={`Eliminar ${phase.title}`}
                    className="icon-action danger"
                    disabled={!phase.parentPhaseId && flatPhases.filter((item) => item.depth === 0).length <= 1}
                    onClick={() => removePhase(phase)}
                    title={!phase.parentPhaseId && flatPhases.filter((item) => item.depth === 0).length <= 1 ? 'La UP ha de conservar almenys una fase principal' : 'Eliminar fase i el seu contingut'}
                    type="button"
                  ><Trash2 size={15} /></button>
                  <button className="secondary-action compact" onClick={() => onAdd(phase.id)} type="button"><Plus size={15} />Afegir element</button>
                </div>
              </header>
              <div
                className={`planning-activity-dropzone ${phaseActivities.length === 0 ? 'empty' : ''}`}
                data-phase-id={phase.id}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => { if (phaseDragId || event.dataTransfer.getData('text/plain').startsWith('phase:')) return; event.preventDefault(); drop(phase.id, null, event.dataTransfer.getData('text/plain')) }}
              >
                {phaseActivities.length === 0 ? <p>Arrossega un element aquí o crea’n un de nou.</p> : phaseActivities.map((activity) => (
                  <ActivityRow
                    activity={activity}
                    progress={activityProgress[activity.id]}
                    completionBusy={completionBusyId === activity.id}
                    dragId={dragId}
                    isCompleted={completedActivityIds.has(activity.id)}
                    isManuallyCompleted={manuallyCompletedActivityIds.has(activity.id)}
                    key={activity.id}
                    onDelete={remove}
                    onDragEnd={() => setDragId('')}
                    onDragStart={setDragId}
                    onDrop={drop}
                    onEdit={onEdit}
                    onKeyboardMove={keyboardMove}
                    onSetManualCompletion={onSetManualCompletion}
                    onTouchDrop={touchDrop}
                    planningUnit={planningUnit}
                    programmableMinutes={programmableMinutes}
                    sequenceNumber={sequenceNumberById.get(activity.id)}
                    sessionDuration={sessionDuration}
                  />
                ))}
                {phaseActivities.length > 0 && <div className="planning-drop-at-end" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { if (phaseDragId || event.dataTransfer.getData('text/plain').startsWith('phase:')) return; event.preventDefault(); event.stopPropagation(); drop(phase.id, null, event.dataTransfer.getData('text/plain')) }}>Deixa anar aquí per posar-lo al final</div>}
              </div>
            </section>
          )
        })}
      </div>
      {activities.some((activity) => Number(activity.plannedMinutes) > programmableMinutes) && (
        <p className="planning-overflow-note">Les activitats marcades en vermell superen la franja programable. En passar-les a Agenda es proposarà repartir-les o continuar-les a la sessió següent.</p>
      )}
    </section>
  )
}
