import { getActiveSeatingPlans } from '../tutoring/activeSeatingPlans'
import { useMemo, useState } from 'react'
import { Modal } from '../../components/Modal'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'
import { navigateToSearchTarget } from '../search/searchNavigation'
import { buildTutorialSeatingMirror, getClassTutorialSeatingPlans } from './tutorialSeatingMirror'

export function TutorialSeatingMirrorModal({ classId, initialHalfGroup = 'all', onClose }) {
  const plans = useAvaluaproStore(state => state.tutorialSeatingPlans)
  const students = useAvaluaproStore(state => state.students)
  const group = useAvaluaproStore(state => state.classes.find(item => item.id === classId))
  const classPlans = useMemo(() => getClassTutorialSeatingPlans(plans, classId), [plans, classId])
  const [selectedId, setSelectedId] = useState('')
  const [halfGroup, setHalfGroup] = useState(initialHalfGroup)
  const [error, setError] = useState('')
  const activeSlots = getActiveSeatingPlans(classPlans, classId)
  const confirmedIds = new Set(Object.values(activeSlots).filter(Boolean).map(item => item.id))
  const confirmedPlans = classPlans.filter(item => confirmedIds.has(item.id))
  const halfScope = /(?:^|\s)A$/i.test(halfGroup) ? 'A' : /(?:^|\s)B$/i.test(halfGroup) ? 'B' : 'all'
  const plan = confirmedPlans.find(item => item.id === selectedId) || activeSlots[halfScope] || activeSlots.all
  const classStudents = students.filter(student => student.classId === classId)
  const halfGroups = [...new Set([...classStudents.map(student => student.halfGroup), ...(plan?.seats || []).map(seat => seat.halfGroup)].filter(Boolean))].sort()
  const effectiveHalfGroup = halfGroups.includes(halfGroup) ? halfGroup : 'all'
  const board = buildTutorialSeatingMirror(plan, classStudents, effectiveHalfGroup)
  const canOpenTutoring = group?.isTutoringGroup || group?.subject === 'Tutoria'
  const openTutoring = async () => {
    try {
      await navigateToSearchTarget(useAvaluaproStore, { classId, mode: 'tutoring', panel: 'relationships', tool: 'seating' })
      onClose()
    } catch (cause) { setError(cause.message) }
  }
  return (
    <Modal title="Llocs fixos · Disposicions de tutoria" size="xl" onClose={onClose}>
      <div className="tutorial-seating-mirror">
        <p>Només es mostren les disposicions actives confirmades a tutoria. Els canvis es fan des de «Disposició d’aula» del mode tutoria.</p>
        {confirmedPlans.length ? <>
          <div className="tutorial-seating-mirror-controls">
            <label>Disposició confirmada<select value={plan.id} onChange={event => setSelectedId(event.target.value)}>
              {confirmedPlans.map(item => <option key={item.id} value={item.id}>{item.title || 'Disposició sense títol'}{activeSlots.all?.id === item.id ? ' · Grup sencer' : ''}{activeSlots.A?.id === item.id ? ' · Activa A' : ''}{activeSlots.B?.id === item.id ? ' · Activa B' : ''}</option>)}
            </select></label>
            {halfGroups.length > 0 && <label>Alumnes<select value={effectiveHalfGroup} onChange={event => { setHalfGroup(event.target.value); setSelectedId('') }}>
              <option value="all">Tota la classe</option>
              {halfGroups.map(name => <option key={name} value={name}>{name}</option>)}
            </select></label>}
          </div>
          <div className="tutorial-seating-mirror-scroll">
            <div className="tutorial-seating-mirror-room" style={{ minWidth: board.columns * 110 }}>
              <div className="tutorial-seating-mirror-board">Pissarra</div>
              <div className="tutorial-seating-mirror-teacher" style={{ textAlign: board.teacherDeskSide }}>Taula docent</div>
              <div className="tutorial-seating-mirror-grid" style={{ gridTemplateColumns: `repeat(${board.columns}, minmax(100px, 1fr))` }}>
                {board.seats.map(seat => <div key={seat.id} className={`tutorial-seating-mirror-seat ${seat.active ? '' : 'unused'} ${seat.student && seat.visible ? 'occupied' : ''} ${seat.blockStart ? 'block-start' : ''}`}>
                  {seat.active && <><small>Fila {seat.y + 1} · Lloc {seat.x + 1}</small>
                    <strong>{seat.student && seat.visible ? seat.student.name : seat.student ? 'Altre mig grup' : seat.blocked ? 'Lloc bloquejat' : 'Lloc lliure'}</strong>
                    {seat.student && seat.visible && <span>{seat.group}</span>}</>}
                </div>)}
              </div>
            </div>
          </div>
          {plan.observation && <p>{plan.observation}</p>}
        </> : <p className="empty-state">Encara no hi ha cap disposició confirmada a tutoria per a aquesta classe.</p>}
        {canOpenTutoring && <button className="secondary-action" type="button" onClick={openTutoring}>Obrir disposició d’aula a tutoria</button>}
        {error && <p role="alert">{error}</p>}
      </div>
    </Modal>
  )
}
