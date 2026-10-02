import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, ClipboardCheck, Loader2 } from 'lucide-react'
import { Modal } from '../../components/Modal'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'
import { loadClassSessionChoices } from './loadNextClassSessions'
import { TaskDateField } from './TaskDateField'
import { getTaskSessionKey, formatTaskSession } from './taskSessionChoices'

export function NewTaskModal({ onClose }) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [extraClassDates, setExtraClassDates] = useState({})
  const [sessionChoices, setSessionChoices] = useState({})
  const [sessionKey, setSessionKey] = useState('')
  const [sessionLoadError, setSessionLoadError] = useState(false)
  const [loadingNextSessions, setLoadingNextSessions] = useState(false)
  const state = useAvaluaproStore()
  const addTasksToClasses = useAvaluaproStore((store) => store.addTasksToClasses)
  const currentClass = state.classes.find((item) => item.id === state.ui.activeClassId)
  const currentUt = state.uts.find((item) => item.id === state.ui.activeUtId)
  const targetClassOptions = state.classes
    .filter((classItem) => classItem.id !== state.ui.activeClassId)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((classItem) => {
      const classUts = state.uts
        .filter((ut) => ut.classId === classItem.id)
        .sort((a, b) => a.name.localeCompare(b.name, 'ca', { numeric: true }))
      const sameNameUt = classUts.find((ut) => ut.name === currentUt?.name)
      return { classItem, uts: classUts, defaultUt: sameNameUt || classUts[0] }
    })
    .filter((option) => option.defaultUt)
  const existingTasks = useMemo(
    () =>
      state.tasks.filter(
        (task) => task.classId === state.ui.activeClassId && task.utId === state.ui.activeUtId,
      ),
    [state.tasks, state.ui.activeClassId, state.ui.activeUtId],
  )

  useEffect(() => {
    let cancelled = false
    if (!state.cloud.user?.uid) return undefined
    queueMicrotask(() => { if (!cancelled) setLoadingNextSessions(true) })
    loadClassSessionChoices(state.cloud.user, state.classes.map((item) => item.id))
      .then((result) => { if (!cancelled) { setSessionChoices(result); setSessionLoadError(false) } })
      .catch(() => { if (!cancelled) { setSessionChoices({}); setSessionLoadError(true) } })
      .finally(() => { if (!cancelled) setLoadingNextSessions(false) })
    return () => { cancelled = true }
  }, [state.cloud.user, state.classes])

  const nextSessions = Object.fromEntries(Object.entries(sessionChoices).map(([classId, choices]) => [classId,
    choices.find((candidate) => new Date(candidate.startsAt) > new Date()) || null,
  ]))
  const formatNextSession = formatTaskSession

  const handleSave = async () => {
    const entries = [
      { classId: state.ui.activeClassId, utId: state.ui.activeUtId, date },
      ...Object.entries(extraClassDates).map(([classId, classDate]) => ({
        classId,
        utId: classDate.utId,
        date: classDate.date || date,
      })),
    ].filter((entry) => entry.classId && entry.utId)
    await addTasksToClasses({ title, entries })
    onClose()
  }

  const toggleExtraClass = (classId) => {
    setExtraClassDates((current) => {
      if (current[classId]) {
        const next = { ...current }
        delete next[classId]
        return next
      }
      const option = targetClassOptions.find((item) => item.classItem.id === classId)
      return { ...current, [classId]: { date, utId: option?.defaultUt.id } }
    })
  }

  return (
    <Modal onClose={onClose} title="Nova Tasca">
      <div className="modal-section">
        <h3>
          <ClipboardCheck size={18} />
          Tasca de seguiment
        </h3>
        <div className="context-strip">
          <span>{currentClass?.name || 'Classe'}</span>
          <span>{currentUt?.name || 'UT'}</span>
          <span>{existingTasks.length} tasques existents</span>
        </div>
        <label className="field-label">
          Nom de la tasca
          <input
            autoFocus
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex: Fonts i evidències"
            value={title}
          />
        </label>
        <TaskDateField date={date} label={currentClass?.name || 'Classe'} sessions={sessionChoices[state.ui.activeClassId] || []}
          sessionKey={sessionKey} loading={loadingNextSessions} error={sessionLoadError}
          onChangeDate={(value) => { setDate(value); setSessionKey('') }}
          onSelectSession={(session) => { setSessionKey(session ? getTaskSessionKey(session) : ''); if (session) setDate(session.date) }} />
        <div className="task-next-session-choice">
          <button
            className="secondary-action compact"
            disabled={loadingNextSessions || !nextSessions[state.ui.activeClassId]}
            onClick={() => { const session = nextSessions[state.ui.activeClassId]; setDate(session.date); setSessionKey(getTaskSessionKey(session)) }}
            type="button"
          >
            {loadingNextSessions ? <Loader2 className="spin" size={15} /> : <CalendarClock size={15} />}
            Per la propera sessió
          </button>
          <span>{loadingNextSessions ? 'Consultant l’horari…' : nextSessions[state.ui.activeClassId] ? formatNextSession(nextSessions[state.ui.activeClassId]) : 'No s’ha trobat cap sessió posterior a l’horari.'}</span>
        </div>
        {targetClassOptions.length > 0 && (
          <div className="task-target-list">
            <strong>Afegir també a altres classes</strong>
            {targetClassOptions.map(({ classItem, uts, defaultUt }) => (
              <div className="task-target-row" key={classItem.id}>
                <input
                  aria-label={`Afegir també a ${classItem.name}`}
                  checked={Object.prototype.hasOwnProperty.call(extraClassDates, classItem.id)}
                  onChange={() => toggleExtraClass(classItem.id)}
                  type="checkbox"
                />
                <span>{classItem.name}</span>
                <select
                  disabled={!Object.prototype.hasOwnProperty.call(extraClassDates, classItem.id)}
                  onChange={(event) =>
                    setExtraClassDates((current) => ({
                      ...current,
                      [classItem.id]: { ...(current[classItem.id] || { date }), utId: event.target.value },
                    }))
                  }
                  value={extraClassDates[classItem.id]?.utId || defaultUt.id}
                >
                  {uts.map((ut) => (
                    <option key={ut.id} value={ut.id}>
                      {ut.name}
                    </option>
                  ))}
                </select>
                <TaskDateField date={extraClassDates[classItem.id]?.date || date} label={classItem.name}
                  sessions={sessionChoices[classItem.id] || []} sessionKey={extraClassDates[classItem.id]?.sessionKey || ''}
                  disabled={!Object.prototype.hasOwnProperty.call(extraClassDates, classItem.id)} loading={loadingNextSessions} error={sessionLoadError}
                  onChangeDate={(value) => setExtraClassDates((current) => ({ ...current, [classItem.id]: { ...current[classItem.id], date: value, sessionKey: '' } }))}
                  onSelectSession={(session) => setExtraClassDates((current) => ({ ...current, [classItem.id]: { ...current[classItem.id], ...(session ? { date: session.date } : {}), sessionKey: session ? getTaskSessionKey(session) : '' } }))} />
                {Object.prototype.hasOwnProperty.call(extraClassDates, classItem.id) && nextSessions[classItem.id] && (
                  <button
                    className="task-target-next-session"
                    onClick={(event) => {
                      event.preventDefault()
                      setExtraClassDates((current) => ({
                        ...current,
                        [classItem.id]: { ...current[classItem.id], date: nextSessions[classItem.id].date, sessionKey: getTaskSessionKey(nextSessions[classItem.id]) },
                      }))
                    }}
                    title={`Proper sessió: ${formatNextSession(nextSessions[classItem.id])}`}
                    type="button"
                  ><CalendarClock size={14} />Proper sessió</button>
                )}
              </div>
            ))}
          </div>
        )}
        <button className="primary-action" disabled={!title.trim()} onClick={handleSave} type="button">
          Crear tasca
        </button>
      </div>
    </Modal>
  )
}
