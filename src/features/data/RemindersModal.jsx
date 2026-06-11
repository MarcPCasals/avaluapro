import { Bell, CheckCircle2, Clock3, Plus, Skull } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Modal } from '../../components/Modal'
import { getLocalToday, getPendingReminderSummary, reminderDateTime } from '../../lib/reminders'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'

function formatReminderDate(reminder = {}) {
  const dueAt = reminderDateTime(reminder)
  if (!dueAt) return 'Sense data'
  return dueAt.toLocaleString('ca-ES', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  })
}

export function RemindersModal({ onClose }) {
  const classes = useAvaluaproStore((state) => state.classes)
  const students = useAvaluaproStore((state) => state.students)
  const tasks = useAvaluaproStore((state) => state.tasks)
  const taskRecords = useAvaluaproStore((state) => state.taskRecords)
  const agendaNotes = useAvaluaproStore((state) => state.agendaNotes)
  const activeClassId = useAvaluaproStore((state) => state.ui.activeClassId)
  const addAgendaNote = useAvaluaproStore((state) => state.addAgendaNote)
  const updateAgendaNote = useAvaluaproStore((state) => state.updateAgendaNote)
  const updateTask = useAvaluaproStore((state) => state.updateTask)
  const updateTaskRecordMeta = useAvaluaproStore((state) => state.updateTaskRecordMeta)
  const [draft, setDraft] = useState({
    classId: activeClassId || '',
    date: getLocalToday(),
    text: '',
    time: '',
  })

  const summary = useMemo(
    () => getPendingReminderSummary({ agendaNotes, classes, students, taskRecords, tasks }),
    [agendaNotes, classes, students, taskRecords, tasks],
  )

  const markDone = async (item) => {
    const dismissedAt = new Date().toISOString()
    const reminder = { ...item.reminder, dismissedAt }
    if (item.kind === 'agenda' || item.kind === 'general') {
      await updateAgendaNote(item.note.id, { reminder })
      return
    }
    if (item.kind === 'record') {
      await updateTaskRecordMeta(item.student.id, item.task.id, { reminder })
      return
    }
    await updateTask(item.task.id, { reminder })
  }

  const addGeneralReminder = async () => {
    if (!draft.text.trim() || !draft.date) return
    await addAgendaNote(null, 'generalReminder', draft.text, {
      classId: draft.classId,
      reminder: {
        date: draft.date,
        dismissedAt: '',
        snoozeUntil: '',
        text: draft.text.trim(),
        time: draft.time || '',
      },
      source: 'manual-general-reminder',
    })
    setDraft((current) => ({ ...current, text: '', time: '' }))
  }

  return (
    <Modal onClose={onClose} size="lg" title="Recordatoris">
      <div className="reminders-modal">
        <section className="reminder-composer">
          <header>
            <Bell size={18} />
            <strong>Afegir recordatori general</strong>
          </header>
          <div className="reminder-form-grid">
            <label>
              Classe
              <select
                onChange={(event) => setDraft((current) => ({ ...current, classId: event.target.value }))}
                value={draft.classId}
              >
                <option value="">General</option>
                {classes.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Data
              <input
                onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
                type="date"
                value={draft.date}
              />
            </label>
            <label>
              Hora
              <input
                onChange={(event) => setDraft((current) => ({ ...current, time: event.target.value }))}
                type="time"
                value={draft.time}
              />
            </label>
          </div>
          <textarea
            maxLength={500}
            onChange={(event) => setDraft((current) => ({ ...current, text: event.target.value }))}
            placeholder="Ex: revisar el material de laboratori abans de 2n B..."
            value={draft.text}
          />
          <button className="primary-action compact" disabled={!draft.text.trim() || !draft.date} onClick={addGeneralReminder} type="button">
            <Plus size={15} />
            Afegir recordatori
          </button>
        </section>

        <section className="reminder-list">
          <header>
            <strong>Recordatoris pendents</strong>
            <span>{summary.count}</span>
          </header>
          {summary.items.length === 0 ? (
            <p className="empty-list">No hi ha cap recordatori pendent.</p>
          ) : (
            summary.items.map((item) => (
              <article className={`reminder-row ${item.kind}`} key={item.id}>
                {item.kind === 'agenda' ? <Skull size={18} /> : <Clock3 size={18} />}
                <div>
                  <strong>{item.title}</strong>
                  <span>{formatReminderDate(item.reminder)}</span>
                  <small>{item.detail}</small>
                  {item.classItem && <small>{item.classItem.name}</small>}
                </div>
                <button className="secondary-action compact" onClick={() => markDone(item)} type="button">
                  <CheckCircle2 size={15} />
                  Fet
                </button>
              </article>
            ))
          )}
        </section>
      </div>
    </Modal>
  )
}
