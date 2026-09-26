import { useMemo, useState } from 'react'
import {
  ArrowRight, BookOpenText, Clock3, ExternalLink, History, Layers3, Menu, Pencil,
  Plus, Trash2,
} from 'lucide-react'
import { ContextualHelp } from '../../components/ContextualHelp'
import { FormattedText } from '../../components/FormattedText'
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

function orderedPhases(phases) {
  const byParent = (phases || []).reduce((result, phase) => {
    const key = phase.parentPhaseId || 'root'
    result[key] = [...(result[key] || []), phase].sort((left, right) => Number(left.order) - Number(right.order))
    return result
  }, {})
  const flattened = []
  const visit = (phase, depth) => {
    flattened.push({ ...phase, depth })
    ;(byParent[phase.id] || []).forEach((child) => visit(child, depth + 1))
  }
  ;(byParent.root || []).forEach((phase) => visit(phase, 0))
  return flattened
}

function materialLinks(activity) {
  return [...(activity.teacherMaterials || []), ...(activity.studentMaterials || [])]
    .filter((material) => material.kind === 'link')
}

function ActivityRow({ activity, dragId, onDelete, onDragEnd, onDragStart, onDrop, onEdit, onKeyboardMove, onTouchDrop, programmableMinutes, sequenceNumber, sessionDuration }) {
  const TypeIcon = TYPE_DETAILS[activity.type]?.icon || BookOpenText
  const links = materialLinks(activity)
  const materialCount = (activity.teacherMaterials?.length || 0) + (activity.studentMaterials?.length || 0)
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
      <button className="planning-activity-content" onClick={() => onEdit(activity)} type="button">
        <strong><span className="planning-sequence-code">A{sequenceNumber}</span>{activity.title}</strong>
        {activity.description && <FormattedText as="span" text={activity.description} />}
        <small>
          {activity.grouping && <span>{activity.grouping}</span>}
          {activity.space && <span>{activity.space}</span>}
          {materialCount > 0 && <span>{materialCount} {materialCount === 1 ? 'material' : 'materials'}</span>}
          {competencyCount > 0 && <span>{competencyCount} {competencyCount === 1 ? 'competència' : 'competències'}</span>}
          {criterionCount > 0 && <span>{criterionCount} {criterionCount === 1 ? 'criteri' : 'criteris'}</span>}
          {competencyCount === 0 && activity.indicatorIds?.length > 0 && <span>{activity.indicatorIds.length} {activity.indicatorIds.length === 1 ? 'indicador anterior' : 'indicadors anteriors'}</span>}
          {activity.diversityMeasures?.length > 0 && <span>{activity.diversityMeasures.length} {activity.diversityMeasures.length === 1 ? 'mesura' : 'mesures'}</span>}
          {activity.groupOverride && <span className="planning-group-override-mark">Adaptada a aquest grup</span>}
          {activity.copiedFrom && <span className="planning-source-mark" title="Activitat recuperada d’una programació anterior"><History size={11} />Recuperada</span>}
        </small>
      </button>
      <div className="planning-activity-meta">
        <span className={`planning-time-pill ${load?.status || 'untimed'}`} title={load?.status === 'red' ? `Supera els ${programmableMinutes} minuts programables` : ''}>
          <Clock3 size={13} />{activity.plannedMinutes ? `${activity.plannedMinutes} min` : 'Sense temps'}
        </span>
        {links.slice(0, 1).map((material) => <a aria-label={`Obrir ${material.label}`} href={material.url} key={material.id || material.url} rel="noreferrer" target="_blank"><ExternalLink size={14} /></a>)}
      </div>
      <div className="planning-activity-actions">
        <button aria-label={`Editar ${activity.title}`} className="icon-action" onClick={() => onEdit(activity)} type="button"><Pencil size={15} /></button>
        <button aria-label={`Eliminar ${activity.title}`} className="icon-action danger" onClick={() => onDelete(activity)} type="button"><Trash2 size={15} /></button>
      </div>
    </article>
  )
}

export function PlanningActivitySequence({ activities, onAdd, onAddChildPhase, onAddPhase, onDelete, onEdit, onEditPhase, onMove, phases }) {
  const [dragId, setDragId] = useState('')
  const [sessionDuration, setSessionDuration] = useState(60)
  const flatPhases = useMemo(() => orderedPhases(phases), [phases])
  const rootPhaseNumberById = useMemo(() => new Map(flatPhases
    .filter((phase) => phase.depth === 0)
    .map((phase, index) => [phase.id, index + 1])), [flatPhases])
  const sequenceNumberById = useMemo(() => new Map(flatPhases
    .flatMap((phase) => activities
      .filter((activity) => activity.phaseId === phase.id)
      .sort((left, right) => Number(left.order) - Number(right.order)))
    .map((activity, index) => [activity.id, index + 1])), [activities, flatPhases])
  const orderedActivities = useMemo(() => flatPhases.flatMap((phase) => activities
    .filter((activity) => activity.phaseId === phase.id)
    .sort((left, right) => Number(left.order) - Number(right.order))), [activities, flatPhases])
  const totals = useMemo(() => getPlanningTotals(phases, activities), [activities, phases])
  const programmableMinutes = getProgrammableMinutes(sessionDuration)
  const approximateSessions = totals.totalMinutes > 0 ? Math.ceil(totals.totalMinutes / programmableMinutes) : 0
  const drop = async (targetPhaseId, targetActivityId = null, transferredActivityId = '') => {
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
  const remove = async (activity) => {
    if (!globalThis.confirm?.(`Vols eliminar «${activity.title}» de la seqüència?`)) return
    await onDelete(activity)
  }

  return (
    <section className="planning-sequence-section">
      <div className="planning-sequence-heading">
        <div className="planning-section-title">
          <span>03</span>
          <div className="contextual-section-title"><h3>Seqüència d’activitats</h3><ContextualHelp title="Seqüència d’activitats">Ordena les activitats, indicacions i transicions tal com es treballaran. La temporització servirà després per distribuir-les a l’Agenda.</ContextualHelp></div>
        </div>
        <div className="planning-sequence-tools">
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
          const phaseActivities = activities
            .filter((activity) => activity.phaseId === phase.id)
            .sort((left, right) => Number(left.order) - Number(right.order))
          return (
            <section className={`planning-sequence-phase ${phase.kind} ${phase.depth === 0 ? 'root-phase' : 'subphase'}`} key={phase.id} style={{ '--phase-depth': phase.depth }}>
              <header>
                <div><span /><div><strong>{phase.depth === 0 ? `FASE ${rootPhaseNumberById.get(phase.id)} — ${phase.title.toLocaleUpperCase('ca')}` : phase.title}</strong><small>{totals.totalsByPhase[phase.id] || 0} min · {phaseActivities.length} elements</small></div></div>
                <div className="planning-sequence-phase-actions">
                  <button aria-label={`Afegir subfase a ${phase.title}`} className="icon-action" onClick={() => onAddChildPhase(phase.id)} title="Afegir subfase" type="button"><Plus size={15} /></button>
                  <button aria-label={`Editar ${phase.title}`} className="icon-action" onClick={() => onEditPhase(phase)} title="Editar fase" type="button"><Pencil size={15} /></button>
                  <button className="secondary-action compact" onClick={() => onAdd(phase.id)} type="button"><Plus size={15} />Afegir element</button>
                </div>
              </header>
              <div
                className={`planning-activity-dropzone ${phaseActivities.length === 0 ? 'empty' : ''}`}
                data-phase-id={phase.id}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => { event.preventDefault(); drop(phase.id, null, event.dataTransfer.getData('text/plain')) }}
              >
                {phaseActivities.length === 0 ? <p>Arrossega un element aquí o crea’n un de nou.</p> : phaseActivities.map((activity) => (
                  <ActivityRow
                    activity={activity}
                    dragId={dragId}
                    key={activity.id}
                    onDelete={remove}
                    onDragEnd={() => setDragId('')}
                    onDragStart={setDragId}
                    onDrop={drop}
                    onEdit={onEdit}
                    onKeyboardMove={keyboardMove}
                    onTouchDrop={touchDrop}
                    programmableMinutes={programmableMinutes}
                    sequenceNumber={sequenceNumberById.get(activity.id)}
                    sessionDuration={sessionDuration}
                  />
                ))}
                {phaseActivities.length > 0 && <div className="planning-drop-at-end" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); drop(phase.id, null, event.dataTransfer.getData('text/plain')) }}>Deixa anar aquí per posar-lo al final</div>}
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
