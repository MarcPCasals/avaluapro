import { Bell, BellRing, CheckCircle2, Clock3, Plus, Skull } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Modal } from '../../components/Modal'
import { getLocalToday, getPendingReminderSummary, reminderDateTime, reminderMatchesFocus } from '../../lib/reminders'
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

function formatCoordinationDate(value = '') {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sense data'
  return date.toLocaleString('ca-ES', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  })
}

function formatSessionOption(option) {
  const date = new Date(`${option.date}T12:00:00`)
  const dateLabel = new Intl.DateTimeFormat('ca-AD', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  }).format(date)
  const subgroup = option.subgroupId ? ` · ${option.subgroupId}` : ''
  const planning = option.planningLabel ? ` · ${option.planningLabel}` : ''
  return `${dateLabel} · ${option.time}${subgroup}${planning}`
}

export function RemindersModal({ focusedReminderIds = [], onClose, sessionOptions = [], sessionOptionsLoading = false }) {
  const classes = useAvaluaproStore((state) => state.classes)
  const students = useAvaluaproStore((state) => state.students)
  const tasks = useAvaluaproStore((state) => state.tasks)
  const taskRecords = useAvaluaproStore((state) => state.taskRecords)
  const agendaNotes = useAvaluaproStore((state) => state.agendaNotes)
  const coordinationItems = useAvaluaproStore((state) => state.cloud.tutoringCoordinationItems || [])
  const activeClassId = useAvaluaproStore((state) => state.ui.activeClassId)
  const addAgendaNote = useAvaluaproStore((state) => state.addAgendaNote)
  const addTutoringCoordinationItem = useAvaluaproStore((state) => state.addTutoringCoordinationItem)
  const completeClassroomRecovery = useAvaluaproStore((state) => state.completeClassroomRecovery)
  const setCoordinationReminderCompleted = useAvaluaproStore((state) => state.setTutoringCoordinationReminderCompleted)
  const updateAgendaNote = useAvaluaproStore((state) => state.updateAgendaNote)
  const updateTask = useAvaluaproStore((state) => state.updateTask)
  const updateTaskRecordMeta = useAvaluaproStore((state) => state.updateTaskRecordMeta)
  const [draft, setDraft] = useState({
    classId: activeClassId || '',
    date: getLocalToday(),
    kind: 'personal',
    sessionKey: '',
    text: '',
    time: '',
  })
  const [busy, setBusy] = useState(false)
  const [completingId, setCompletingId] = useState('')
  const [error, setError] = useState('')

  const tutoringClasses = useMemo(
    () => classes.filter((classItem) => classItem.sharedTutoringSpaceId),
    [classes],
  )
  const availableSessions = useMemo(
    () => sessionOptions.filter((option) => option.classId === draft.classId),
    [draft.classId, sessionOptions],
  )
  const selectedSession = availableSessions.find((option) => option.id === draft.sessionKey) || null
  const openCoordinationReminders = useMemo(
    () => coordinationItems
      .filter((item) => item.kind === 'reminder' && item.status === 'open' && !item.deletedAt)
      .sort((left, right) => String(left.dueAt || '9999').localeCompare(String(right.dueAt || '9999'))),
    [coordinationItems],
  )

  const summary = useMemo(
    () => getPendingReminderSummary({ agendaNotes, classes, students, taskRecords, tasks }),
    [agendaNotes, classes, students, taskRecords, tasks],
  )
  const hasFocusedReminders = focusedReminderIds.length > 0
  const visibleSummaryItems = summary.items.filter((item) => reminderMatchesFocus(item.id, focusedReminderIds))
  const visibleCoordinationReminders = openCoordinationReminders.filter((item) =>
    reminderMatchesFocus(`coordination_${item.id}`, focusedReminderIds))
  const visibleReminderCount = visibleSummaryItems.length + visibleCoordinationReminders.length

  const classBySpaceId = useMemo(
    () => new Map(tutoringClasses.map((classItem) => [classItem.sharedTutoringSpaceId, classItem])),
    [tutoringClasses],
  )

  const markDone = async (item) => {
    const dismissedAt = new Date().toISOString()
    const reminder = { ...item.reminder, dismissedAt }
    if (item.kind === 'recovery') {
      await completeClassroomRecovery(item.note.id)
      return
    }
    if (item.kind === 'material') {
      await updateAgendaNote(item.note.id, {
        preparation: { ...item.note.preparation, completedAt: dismissedAt },
        reminder,
      })
      return
    }
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

  const changeKind = (kind) => {
    const currentClassIsShared = tutoringClasses.some((classItem) => classItem.id === draft.classId)
    setError('')
    setDraft((current) => ({
      ...current,
      classId: kind === 'tutoring' && !currentClassIsShared ? tutoringClasses[0]?.id || '' : current.classId,
      kind,
      sessionKey: '',
    }))
  }

  const selectSession = (sessionKey) => {
    const session = availableSessions.find((option) => option.id === sessionKey)
    setDraft((current) => ({
      ...current,
      date: session?.date || current.date,
      sessionKey,
      time: session?.time || current.time,
    }))
  }

  const addReminder = async () => {
    if (!draft.text.trim() || !draft.date || (draft.kind === 'tutoring' && !draft.classId)) return
    setBusy(true)
    setError('')
    try {
      if (draft.kind === 'tutoring') {
        const dueAt = new Date(`${draft.date}T${draft.time || '09:00'}:00`)
        if (Number.isNaN(dueAt.getTime())) throw new Error('Revisa la data i l’hora del recordatori.')
        await addTutoringCoordinationItem({
          assigneeUid: 'all',
          classId: draft.classId,
          dueAt: dueAt.toISOString(),
          kind: 'reminder',
          text: draft.text,
        })
      } else {
        await addAgendaNote(null, 'generalReminder', draft.text, {
          classId: draft.classId,
          ...(selectedSession ? {
            sessionId: selectedSession.sessionId,
            sessionStartsAt: selectedSession.startsAt,
            timetableSlotId: selectedSession.timetableSlotId,
          } : {}),
          reminder: {
            date: draft.date,
            dismissedAt: '',
            snoozeUntil: '',
            text: draft.text.trim(),
            time: draft.time || '',
          },
          source: selectedSession ? 'manual-session-reminder' : 'manual-general-reminder',
        })
      }
      setDraft((current) => ({ ...current, sessionKey: '', text: '', time: '' }))
    } catch (operationError) {
      setError(operationError.message || 'No s’ha pogut desar el recordatori.')
    } finally {
      setBusy(false)
    }
  }

  const completeCoordinationReminder = async (itemId) => {
    setCompletingId(itemId)
    setError('')
    try {
      await setCoordinationReminderCompleted(itemId, true)
    } catch (operationError) {
      setError(operationError.message || 'No s’ha pogut completar el recordatori compartit.')
    } finally {
      setCompletingId('')
    }
  }

  return (
    <Modal onClose={onClose} size="lg" title={hasFocusedReminders ? visibleReminderCount === 1 ? 'Recordatori' : 'Recordatoris del dia' : 'Recordatoris'}>
      <div className="reminders-modal">
        {!hasFocusedReminders && <section className={`reminder-composer ${draft.kind}`}>
          <header>
            {draft.kind === 'tutoring' ? <BellRing size={18} /> : <Bell size={18} />}
            <strong>Nou recordatori</strong>
          </header>
          <div className="reminder-kind-switch" aria-label="Tipus de recordatori">
            <button className={draft.kind === 'personal' ? 'active' : ''} onClick={() => changeKind('personal')} type="button"><Bell size={15} />Personal</button>
            <button className={draft.kind === 'tutoring' ? 'active tutoring' : ''} onClick={() => changeKind('tutoring')} type="button"><BellRing size={15} />Cotutoria</button>
          </div>
          <p className="reminder-kind-help">{draft.kind === 'tutoring'
            ? 'Es compartirà amb la cotutora i apareixerà al calendari de totes dues.'
            : 'És un recordatori teu. Si el vincules a una sessió també apareixerà al Mode aula.'}</p>
          <div className="reminder-form-grid">
            <label>
              Classe
              <select
                onChange={(event) => setDraft((current) => ({ ...current, classId: event.target.value, sessionKey: '' }))}
                value={draft.classId}
              >
                {draft.kind === 'personal' && <option value="">General (sense classe)</option>}
                {(draft.kind === 'tutoring' ? tutoringClasses : classes).map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Data
              <input
                onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value, sessionKey: '' }))}
                type="date"
                value={draft.date}
              />
            </label>
            <label>
              Hora
              <input
                onChange={(event) => setDraft((current) => ({ ...current, sessionKey: '', time: event.target.value }))}
                type="time"
                value={draft.time}
              />
            </label>
          </div>
          {draft.kind === 'personal' && draft.classId && (
            <label className="reminder-session-picker">
              Sessió de la classe <span>opcional</span>
              <select disabled={sessionOptionsLoading} onChange={(event) => selectSession(event.target.value)} value={draft.sessionKey}>
                <option value="">Sense vincular: només al calendari</option>
                {availableSessions.map((option) => <option key={option.id} value={option.id}>{formatSessionOption(option)}</option>)}
              </select>
              <small>{sessionOptionsLoading
                ? 'Carregant les sessions futures de l’horari…'
                : availableSessions.length > 0
                ? 'En seleccionar-la, la data i l’hora s’omplen soles i el recordatori es mostra al Mode aula.'
                : 'No s’han trobat sessions futures d’aquesta classe dins de l’horari carregat.'}</small>
            </label>
          )}
          {draft.kind === 'tutoring' && tutoringClasses.length === 0 && <p className="reminder-form-error">No hi ha cap classe amb cotutoria compartida configurada.</p>}
          <textarea
            maxLength={500}
            onChange={(event) => setDraft((current) => ({ ...current, text: event.target.value }))}
            placeholder={draft.kind === 'tutoring' ? 'Ex: reunió amb la família de…' : 'Ex: recordar que portin gots de plàstic…'}
            value={draft.text}
          />
          {error && <p className="reminder-form-error" role="alert">{error}</p>}
          <button className="primary-action compact" disabled={busy || !draft.text.trim() || !draft.date || (draft.kind === 'tutoring' && !draft.classId)} onClick={addReminder} type="button">
            <Plus size={15} />
            {busy ? 'Desant…' : draft.kind === 'tutoring' ? 'Afegir recordatori de cotutoria' : 'Afegir recordatori'}
          </button>
        </section>}

        <section className={`reminder-list ${hasFocusedReminders ? 'focused' : ''}`}>
          <header>
            <strong>{hasFocusedReminders ? visibleReminderCount === 1 ? 'Recordatori seleccionat' : 'Recordatoris seleccionats' : 'Recordatoris pendents'}</strong>
            <span>{hasFocusedReminders ? visibleReminderCount : summary.count + openCoordinationReminders.length}</span>
          </header>
          {visibleReminderCount === 0 ? (
            <p className="empty-list">{hasFocusedReminders ? 'Aquest recordatori ja no està pendent.' : 'No hi ha cap recordatori pendent.'}</p>
          ) : (
            <>
              {visibleSummaryItems.map((item) => (
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
              ))}
              {visibleCoordinationReminders.map((item) => (
                <article className="reminder-row tutoring" key={`coordination_${item.id}`}>
                  <BellRing size={18} />
                  <div>
                    <strong>{item.text}</strong>
                    <span>{formatCoordinationDate(item.dueAt)}</span>
                    <small>Cotutoria · {classBySpaceId.get(item.spaceId)?.name || 'Tutoria compartida'}</small>
                  </div>
                  <button className="secondary-action compact" disabled={item.syncStatus === 'pending' || completingId === item.id} onClick={() => completeCoordinationReminder(item.id)} type="button">
                    <CheckCircle2 size={15} />
                    {completingId === item.id ? 'Desant…' : 'Fet'}
                  </button>
                </article>
              ))}
            </>
          )}
        </section>
      </div>
    </Modal>
  )
}
