import { useMemo, useState } from 'react'
import { ClipboardCheck } from 'lucide-react'
import { Modal } from '../../components/Modal'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'

export function NewTaskModal({ onClose }) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [extraClassDates, setExtraClassDates] = useState({})
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
        <label className="field-label">
          Data
          <input onChange={(event) => setDate(event.target.value)} type="date" value={date} />
        </label>
        {targetClassOptions.length > 0 && (
          <div className="task-target-list">
            <strong>Afegir també a altres classes</strong>
            {targetClassOptions.map(({ classItem, uts, defaultUt }) => (
              <label className="task-target-row" key={classItem.id}>
                <input
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
                <input
                  disabled={!Object.prototype.hasOwnProperty.call(extraClassDates, classItem.id)}
                  onChange={(event) =>
                    setExtraClassDates((current) => ({
                      ...current,
                      [classItem.id]: { ...(current[classItem.id] || { utId: uts[0]?.id }), date: event.target.value },
                    }))
                  }
                  type="date"
                  value={extraClassDates[classItem.id]?.date || date}
                />
              </label>
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
