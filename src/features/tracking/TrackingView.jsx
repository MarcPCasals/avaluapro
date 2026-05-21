import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  BookOpen,
  CheckCircle2,
  Clock3,
  Clipboard,
  MessageCircle,
  Skull,
  Target,
  Trash2,
  Triangle,
  Users,
  XCircle,
} from 'lucide-react'
import { getDominantDiagnosis } from '../../data/studentAnnotations'
import { buildTrackingInterventions, getStudentTrackingStats } from '../../lib/analytics'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'
import { ManageStudentsModal } from '../students/ManageStudentsModal'
import { StudentAnnotationsModal } from '../students/StudentAnnotationsModal'
import { StudentProfileModal } from '../students/StudentProfileModal'
import { NewTaskModal } from './NewTaskModal'

const statusButtons = [
  { id: 'DONE', label: 'Fet', icon: CheckCircle2 },
  { id: 'LATE', label: 'Tard', icon: Clock3 },
  { id: 'MISSING', label: 'No fet', icon: XCircle },
  { id: 'EXEMPT', label: 'Exempt', icon: Triangle },
]

const interventionFilters = [
  { id: 'all', label: 'Tots' },
  { id: 'priority', label: 'Intervenció' },
  { id: 'monitor', label: 'Seguiment' },
  { id: 'punctual', label: 'Puntual' },
]

function useTrackingModel() {
  const { activeClassId, activeUtId } = useAvaluaproStore((state) => state.ui)
  const allStudents = useAvaluaproStore((state) => state.students)
  const allTasks = useAvaluaproStore((state) => state.tasks)
  const taskRecords = useAvaluaproStore((state) => state.taskRecords)
  const allBehaviorEvents = useAvaluaproStore((state) => state.behaviorEvents)
  const agendaNotes = useAvaluaproStore((state) => state.agendaNotes)

  return useMemo(
    () => ({
      students: allStudents
        .filter((student) => student.classId === activeClassId)
        .sort((a, b) => a.name.localeCompare(b.name, 'ca', { numeric: true })),
      tasks: allTasks
        .filter((task) => task.classId === activeClassId && task.utId === activeUtId)
        .sort((a, b) => a.order - b.order),
      taskRecords,
      behaviorEvents: allBehaviorEvents.filter((event) => event.classId === activeClassId),
      agendaNotes,
    }),
    [activeClassId, activeUtId, allStudents, allTasks, taskRecords, allBehaviorEvents, agendaNotes],
  )
}

function getRecord(taskRecords, studentId, taskId) {
  return taskRecords.find((record) => record.studentId === studentId && record.taskId === taskId)
}

function getMissingTasksForStudent(studentId, taskRecords, tasks) {
  return tasks.filter((task) => getRecord(taskRecords, studentId, task.id)?.status === 'MISSING')
}

function getRedPointCount(student, missingTasks) {
  return Math.max(missingTasks.length, student.legacyTrackingPenaltyCount || 0)
}

function getStudentRowClass(dominantDiagnosis, noteState) {
  return [
    dominantDiagnosis ? `student-diagnosis-${dominantDiagnosis.color}` : '',
    noteState !== 'empty' ? `student-attention-${noteState}` : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function shouldShowAgendaWarning(student, redPointCount, blackPointCount) {
  const deferredAt = student.taskAgendaDeferredAt || 0
  if (redPointCount >= 3 && redPointCount > deferredAt) return true
  return redPointCount + blackPointCount >= 3 && redPointCount > 0 && blackPointCount > 0
}

function BehaviorEventModal({ student, type, onClose, onSave }) {
  const [text, setText] = useState('')
  const isIncident = type === 'incident'

  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        <header className="modal-header">
          <h2>{isIncident ? 'Negatiu de comportament' : 'Entrada de diari'}</h2>
          <button className="modal-close" onClick={onClose} type="button">
            ×
          </button>
        </header>
        <div className="modal-body behavior-modal-body">
          <strong>{student.name}</strong>
          <p>
            {isIncident
              ? 'Explica breument què ha passat. Aquest registre comptarà com a punt negre.'
              : 'Afegeix una observació sense comptar-la com a negatiu.'}
          </p>
          <textarea
            autoFocus
            onChange={(event) => setText(event.target.value)}
            placeholder={isIncident ? 'Ex: interromp repetidament la sessió...' : 'Ex: ajuda el grup, mostra bona actitud...'}
            value={text}
          />
          <div className="modal-actions">
            <button className="secondary-action" onClick={onClose} type="button">
              Cancel·lar
            </button>
            <button
              className="primary-action"
              disabled={!text.trim()}
              onClick={() => onSave(text)}
              type="button"
            >
              Desa
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AgendaWarningModal({ student, missingTasks, redPointCount, blackPointCount, onClose, onLastChance, onRegisterAgenda }) {
  const [copyState, setCopyState] = useState('')
  const agendaText = [
    `Cal informar a l’agenda: ${student.name}`,
    `${redPointCount} punts vermells i ${blackPointCount} punts negres.`,
    missingTasks.length > 0 ? 'Tasques pendents:' : '',
    ...missingTasks.slice(-4).map((task) => `- ${task.title} (${new Date(task.date).toLocaleDateString('ca-ES')})`),
  ]
    .filter(Boolean)
    .join('\n')

  const copyAgendaText = async () => {
    try {
      await navigator.clipboard.writeText(agendaText)
      setCopyState('Text copiat per enganxar a l’agenda.')
    } catch {
      setCopyState('No s’ha pogut copiar automàticament.')
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-panel lg">
        <header className="modal-header">
          <h2>Nota a l’agenda</h2>
          <button className="modal-close" onClick={onClose} type="button">
            ×
          </button>
        </header>
        <div className="modal-body agenda-warning-modal">
          <span className="tour-anchor" data-tour="agenda-warning-modal" />
          <div className="agenda-warning-hero">
            <Skull size={26} />
            <div>
              <strong>{student.name}</strong>
              <span>
                {redPointCount} punts vermells · {blackPointCount} punts negres
              </span>
            </div>
          </div>
          <p>
            Aquest alumne ja té prou registres per valorar posar una nota a l’agenda. Revisa les tasques i decideix
            si poses la nota ara o li dones una darrera oportunitat.
          </p>
          <div className="agenda-task-list">
            {missingTasks.slice(-4).map((task) => (
              <div key={task.id}>
                <strong>{task.title}</strong>
                <span>{new Date(task.date).toLocaleDateString('ca-ES')}</span>
              </div>
            ))}
          </div>
          <div className="modal-actions">
            <button className="secondary-action" onClick={copyAgendaText} type="button">
              <Clipboard size={16} />
              Copiar text
            </button>
            <button className="secondary-action" onClick={onLastChance} type="button">
              Darrera oportunitat
            </button>
            <button className="primary-action agenda-register-action" onClick={() => onRegisterAgenda(agendaText)} type="button">
              Registrar nota a l’agenda
            </button>
            <button className="primary-action" onClick={onClose} type="button">
              Entesos
            </button>
          </div>
          {copyState && <small className="agenda-copy-state">{copyState}</small>}
        </div>
      </div>
    </div>
  )
}

function EditableTaskDate({ task, onChangeDate }) {
  const [isEditing, setIsEditing] = useState(false)
  const formattedDate = new Date(task.date).toLocaleDateString('ca-ES', { day: '2-digit', month: 'short' })

  if (isEditing) {
    return (
      <input
        autoFocus
        className="task-date-input"
        onBlur={() => setIsEditing(false)}
        onChange={async (event) => {
          await onChangeDate(task.id, event.target.value)
          setIsEditing(false)
        }}
        type="date"
        value={task.date}
      />
    )
  }

  return (
    <button className="task-date-button" onClick={() => setIsEditing(true)} title="Canviar data" type="button">
      {formattedDate}
    </button>
  )
}

function EditableTaskTitle({ task, onChangeTitle }) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(task.title)

  const saveTitle = async () => {
    const cleanTitle = title.trim()
    if (cleanTitle && cleanTitle !== task.title) {
      await onChangeTitle(task.id, cleanTitle)
    }
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <input
        autoFocus
        className="task-title-input"
        onBlur={saveTitle}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') saveTitle()
          if (event.key === 'Escape') {
            setTitle(task.title)
            setIsEditing(false)
          }
        }}
        value={title}
      />
    )
  }

  return (
    <button className="task-title-button" onClick={() => setIsEditing(true)} title="Canviar nom" type="button">
      {task.title}
    </button>
  )
}

function TaskCompletionSummary({ students, task, taskRecords }) {
  const visibleStudentIds = new Set(students.map((student) => student.id))
  const scopedRecords = taskRecords.filter(
    (record) => record.taskId === task.id && visibleStudentIds.has(record.studentId),
  )
  const done = scopedRecords.filter((record) => record.status === 'DONE').length
  const late = scopedRecords.filter((record) => record.status === 'LATE').length
  const exempt = scopedRecords.filter((record) => record.status === 'EXEMPT').length
  const total = Math.max(students.length - exempt, 0)

  return (
    <div className="task-completion-summary">
      <span className="done">{done}/{total}</span>
      {late > 0 && <span className="late">{late} incompleta</span>}
    </div>
  )
}

function TaskNoteModal({ draft, onClose, onSave }) {
  const [text, setText] = useState(draft.record?.note || '')
  const title = draft.student ? `Informació de la tasca: ${draft.student.name}` : 'Informació general de la tasca'

  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose} type="button">×</button>
        </header>
        <div className="modal-body behavior-modal-body">
          <strong>{draft.task.title}</strong>
          <p>
            {draft.student
              ? 'Anota informació útil d’aquesta tasca per a aquest alumne sense canviar-ne l’estat.'
              : 'Anota informació general de la tasca per recordar instruccions, adaptacions o incidències de classe.'}
          </p>
          <textarea autoFocus onChange={(event) => setText(event.target.value)} value={text} />
          <div className="modal-actions">
            <button className="secondary-action" onClick={onClose} type="button">Cancel·lar</button>
            <button
              className="primary-action"
              onClick={() => onSave({ taskId: draft.task.id, studentId: draft.student?.id, text })}
              type="button"
            >
              Desa
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TaskReminderModal({ draft, onClose, onSave }) {
  const existingReminder = draft.record?.reminder || draft.task.reminder || {}
  const [reminderDate, setReminderDate] = useState(existingReminder.date || new Date().toISOString().slice(0, 10))
  const [reminderTime, setReminderTime] = useState(existingReminder.time || '')
  const [reminderText, setReminderText] = useState(existingReminder.text || '')
  const title = draft.student ? `Recordatori: ${draft.student.name}` : 'Recordatori de tota la classe'

  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose} type="button">×</button>
        </header>
        <div className="modal-body behavior-modal-body">
          <strong>{draft.task.title}</strong>
          <p>El dia indicat es podrà mostrar aquest recordatori amb el text que escriguis.</p>
          <label className="field-label">
            Dia del recordatori
            <input onChange={(event) => setReminderDate(event.target.value)} type="date" value={reminderDate} />
          </label>
          <label className="field-label">
            Hora opcional
            <input onChange={(event) => setReminderTime(event.target.value)} type="time" value={reminderTime} />
          </label>
          <textarea
            autoFocus
            onChange={(event) => setReminderText(event.target.value)}
            placeholder="Ex: revisar si ha entregat la tasca pendent..."
            value={reminderText}
          />
          <div className="modal-actions">
            <button className="secondary-action" onClick={onClose} type="button">Cancel·lar</button>
            <button
              className="primary-action"
              disabled={!reminderText.trim()}
              onClick={() =>
                onSave({ taskId: draft.task.id, studentId: draft.student?.id, reminderDate, reminderTime, reminderText })
              }
              type="button"
            >
              Desa recordatori
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function IncompleteWarningModal({ warning, onClose }) {
  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        <header className="modal-header">
          <h2>{warning.final ? 'Negatiu per acumulació' : 'Segona tasca incompleta'}</h2>
          <button className="modal-close" onClick={onClose} type="button">×</button>
        </header>
        <div className="modal-body agenda-warning-modal">
          <div className="agenda-warning-hero">
            <Clock3 size={26} />
            <div>
              <strong>{warning.student.name}</strong>
              <span>
                {warning.final
                  ? 'Tres tasques incompletes: queda registrat com a punt vermell.'
                  : 'És la segona vegada que no acaba completament una tasca.'}
              </span>
            </div>
          </div>
          {warning.previousTasks.length > 0 && (
            <div className="agenda-task-list">
              {warning.previousTasks.map((task) => (
                <div key={task.id}>
                  <strong>{task.title}</strong>
                  <span>{new Date(task.date).toLocaleDateString('ca-ES')}</span>
                </div>
              ))}
            </div>
          )}
          <div className="modal-actions">
            <button className="primary-action" onClick={onClose} type="button">Entesos</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ConfirmDeleteTaskModal({ task, onClose, onConfirm }) {
  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        <header className="modal-header">
          <h2>Eliminar tasca</h2>
          <button className="modal-close" onClick={onClose} type="button">×</button>
        </header>
        <div className="modal-body agenda-warning-modal">
          <div className="agenda-warning-hero">
            <Trash2 size={26} />
            <div>
              <strong>{task.title}</strong>
              <span>També s’eliminaran els registres dels alumnes d’aquesta tasca.</span>
            </div>
          </div>
          <p>Aquesta acció no es pot desfer des d’Avaluapro.</p>
          <div className="modal-actions">
            <button className="secondary-action" onClick={onClose} type="button">Cancel·lar</button>
            <button className="danger-action" onClick={onConfirm} type="button">Eliminar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function TrackingView() {
  const { students, tasks, taskRecords, behaviorEvents, agendaNotes } = useTrackingModel()
  const activeClassId = useAvaluaproStore((state) => state.ui.activeClassId)
  const updateTaskRecord = useAvaluaproStore((state) => state.updateTaskRecord)
  const addBehaviorEvent = useAvaluaproStore((state) => state.addBehaviorEvent)
  const addAgendaNote = useAvaluaproStore((state) => state.addAgendaNote)
  const deferTaskAgendaWarning = useAvaluaproStore((state) => state.deferTaskAgendaWarning)
  const deleteTask = useAvaluaproStore((state) => state.deleteTask)
  const updateTask = useAvaluaproStore((state) => state.updateTask)
  const updateTaskRecordMeta = useAvaluaproStore((state) => state.updateTaskRecordMeta)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showStudentsModal, setShowStudentsModal] = useState(false)
  const [profileStudentId, setProfileStudentId] = useState(null)
  const [annotationsStudentId, setAnnotationsStudentId] = useState(null)
  const [interventionFilter, setInterventionFilter] = useState('all')
  const [showInterventions, setShowInterventions] = useState(false)
  const [halfGroupFilter, setHalfGroupFilter] = useState('all')
  const [taskNoteDraft, setTaskNoteDraft] = useState(null)
  const [reminderDraft, setReminderDraft] = useState(null)
  const [incompleteWarning, setIncompleteWarning] = useState(null)
  const [deleteTaskDraft, setDeleteTaskDraft] = useState(null)
  const [showPastTasks, setShowPastTasks] = useState(false)
  const [behaviorDraft, setBehaviorDraft] = useState(null)
  const [agendaWarningStudentId, setAgendaWarningStudentId] = useState(null)
  const interventionInsights = useMemo(
    () => buildTrackingInterventions(students, taskRecords, tasks, behaviorEvents),
    [students, taskRecords, tasks, behaviorEvents],
  )
  const insightByStudentId = useMemo(
    () => new Map(interventionInsights.map((insight) => [insight.student.id, insight])),
    [interventionInsights],
  )
  const interventionCounts = useMemo(
    () =>
      interventionInsights.reduce(
        (acc, insight) => ({ ...acc, [insight.level]: acc[insight.level] + 1 }),
        { priority: 0, monitor: 0, punctual: 0, stable: 0 },
      ),
    [interventionInsights],
  )
  const filteredStudents =
    (interventionFilter === 'all'
      ? students
      : students.filter((student) => insightByStudentId.get(student.id)?.level === interventionFilter))
      .filter((student) => halfGroupFilter === 'all' || student.halfGroup === halfGroupFilter)
  const halfGroups = Array.from(new Set(students.map((student) => student.halfGroup).filter(Boolean))).sort()
  const focusInsights = interventionInsights.filter((insight) => insight.level !== 'stable').slice(0, 4)
  const today = new Date().toISOString().slice(0, 10)
  const pastTaskCount = tasks.filter((task) => task.date < today).length
  const visibleTasks = showPastTasks ? tasks : tasks.filter((task) => task.date >= today)
  const now = new Date()
  const isReminderDue = (reminder = {}) => {
    if (!reminder.date) return false
    if (reminder.snoozeUntil && new Date(reminder.snoozeUntil) > now) return false
    const dueAt = new Date(`${reminder.date}T${reminder.time || '00:00'}`)
    return dueAt <= now
  }
  const dueReminders = [
    ...tasks
      .filter((task) => isReminderDue(task.reminder))
      .map((task) => ({ id: `task_${task.id}`, kind: 'task', task, text: task.reminder.text, reminder: task.reminder })),
    ...taskRecords
      .filter((record) => isReminderDue(record.reminder))
      .map((record) => ({
        id: `record_${record.id}`,
        kind: 'record',
        record,
        task: tasks.find((task) => task.id === record.taskId),
        student: students.find((student) => student.id === record.studentId),
        text: record.reminder.text,
        reminder: record.reminder,
      }))
      .filter((reminder) => reminder.task),
  ]
  const agendaWarningStudent = students.find((student) => student.id === agendaWarningStudentId)
  const agendaWarningMissingTasks = agendaWarningStudent
    ? getMissingTasksForStudent(agendaWarningStudent.id, taskRecords, tasks)
    : []
  const agendaWarningRedPoints = agendaWarningStudent
    ? getRedPointCount(agendaWarningStudent, agendaWarningMissingTasks)
    : 0
  const agendaWarningBlackPoints = agendaWarningStudent
    ? behaviorEvents.filter((event) => event.studentId === agendaWarningStudent.id && event.type === 'incident').length
    : 0
  const handleTaskStatus = async (student, taskId, status) => {
    await updateTaskRecord(student.id, taskId, status)
    if (status === 'LATE') {
      const lateRecords = taskRecords.filter((record) => record.studentId === student.id && record.status === 'LATE')
      const previousLateTasks = lateRecords
        .map((record) => tasks.find((task) => task.id === record.taskId))
        .filter(Boolean)
      const nextLateCount = lateRecords.some((record) => record.taskId === taskId)
        ? lateRecords.length
        : lateRecords.length + 1
      if (nextLateCount === 2) {
        setIncompleteWarning({ student, previousTasks: previousLateTasks, task: tasks.find((item) => item.id === taskId), final: false })
      }
      if (nextLateCount >= 3) {
        const currentRecord = getRecord(taskRecords, student.id, taskId)
        const accumulationNote = `Negatiu vermell per acumulació de tasques incompletes: ${[
          ...previousLateTasks,
          tasks.find((item) => item.id === taskId),
        ]
          .filter(Boolean)
          .map((item) => item.title)
          .join(' · ')}`
        await updateTaskRecord(student.id, taskId, 'MISSING')
        await updateTaskRecordMeta(student.id, taskId, {
          note: [currentRecord?.note, accumulationNote].filter(Boolean).join('\n'),
        })
        setIncompleteWarning({ student, previousTasks: previousLateTasks, task: tasks.find((item) => item.id === taskId), final: true })
      }
      return
    }
    if (status !== 'MISSING') return

    const nextTaskRecords = [...taskRecords.filter((record) => !(record.studentId === student.id && record.taskId === taskId))]
    const task = tasks.find((item) => item.id === taskId)
    if (task) {
      nextTaskRecords.push({
        id: 'preview',
        classId: task.classId,
        utId: task.utId,
        studentId: student.id,
        taskId,
        status,
      })
    }
    const missingCount = getMissingTasksForStudent(student.id, nextTaskRecords, tasks).length
    const redPointCount = getRedPointCount(student, { length: missingCount })
    const blackPointCount = behaviorEvents.filter(
      (event) => event.studentId === student.id && event.type === 'incident',
    ).length
    if (shouldShowAgendaWarning(student, redPointCount, blackPointCount)) {
      setAgendaWarningStudentId(student.id)
    }
  }
  const markVisibleStudentsDone = async (taskId) => {
    for (const student of filteredStudents) {
      await updateTaskRecord(student.id, taskId, 'DONE')
    }
  }
  const saveTaskNote = async ({ taskId, studentId, text, reminderDate, reminderTime, reminderText }) => {
    const patch = {}
    if (text !== undefined) patch.note = text.trim()
    if (reminderDate !== undefined || reminderText !== undefined) {
      patch.reminder = { date: reminderDate, time: reminderTime || '', text: reminderText.trim(), snoozeUntil: '' }
    }
    if (studentId) await updateTaskRecordMeta(studentId, taskId, patch)
    else await updateTask(taskId, patch)
    setTaskNoteDraft(null)
    setReminderDraft(null)
  }
  const snoozeReminder = async (reminder) => {
    const snoozeUntil = new Date(new Date().getTime() + 55 * 60 * 1000).toISOString()
    const nextReminder = { ...reminder.reminder, snoozeUntil }
    if (reminder.kind === 'record' && reminder.student) {
      await updateTaskRecordMeta(reminder.student.id, reminder.task.id, { reminder: nextReminder })
      return
    }
    await updateTask(reminder.task.id, { reminder: nextReminder })
  }
  const handleBehaviorSave = async (text) => {
    if (!behaviorDraft) return
    await addBehaviorEvent(behaviorDraft.student.id, behaviorDraft.type, text)
    const missingCount = getMissingTasksForStudent(behaviorDraft.student.id, taskRecords, tasks).length
    const redPointCount = getRedPointCount(behaviorDraft.student, { length: missingCount })
    const blackPointCount =
      behaviorEvents.filter(
        (event) => event.studentId === behaviorDraft.student.id && event.type === 'incident',
      ).length + (behaviorDraft.type === 'incident' ? 1 : 0)
    if (behaviorDraft.type === 'incident' && shouldShowAgendaWarning(behaviorDraft.student, redPointCount, blackPointCount)) {
      setAgendaWarningStudentId(behaviorDraft.student.id)
    }
    setBehaviorDraft(null)
  }

  useEffect(() => {
    const handleShowDemoTasks = () => {
      setShowPastTasks(true)
    }

    const handleDemoTaskRecord = async () => {
      const student = filteredStudents[0] || students[0]
      const task = tasks[0]
      if (!student || !task) {
        window.alert('Cal una tasca visible per simular el canvi de seguiment.')
        return
      }

      const currentRecord = getRecord(taskRecords, student.id, task.id)
      await updateTaskRecord(student.id, task.id, currentRecord?.status === 'DONE' ? 'LATE' : 'DONE')
    }

    const handleDemoAgendaWarning = async () => {
      const student = filteredStudents[0] || students[0]
      const targetTasks = tasks.slice(0, 3)
      if (!student || targetTasks.length < 3) {
        window.alert('Calen com a mínim 3 tasques a la UT activa per simular la nota a l’agenda.')
        return
      }

      for (const task of targetTasks) {
        await updateTaskRecordMeta(student.id, task.id, { status: 'MISSING' })
      }

      window.setTimeout(() => setAgendaWarningStudentId(student.id), 120)
    }

    window.addEventListener('avaluapro-show-demo-tasks', handleShowDemoTasks)
    window.addEventListener('avaluapro-demo-task-record', handleDemoTaskRecord)
    window.addEventListener('avaluapro-demo-agenda-warning', handleDemoAgendaWarning)
    return () => {
      window.removeEventListener('avaluapro-show-demo-tasks', handleShowDemoTasks)
      window.removeEventListener('avaluapro-demo-task-record', handleDemoTaskRecord)
      window.removeEventListener('avaluapro-demo-agenda-warning', handleDemoAgendaWarning)
    }
  }, [filteredStudents, students, taskRecords, tasks, updateTaskRecord, updateTaskRecordMeta])

  return (
    <section className="work-surface">
      <div className="toolbar" data-tour="tracking-toolbar">
        <button className="tool-button strong" onClick={() => setShowTaskModal(true)} type="button">
          Nova Tasca
        </button>
        <button className={`tool-button ${showPastTasks ? 'active-soft' : ''}`} onClick={() => setShowPastTasks((value) => !value)} type="button">
          {showPastTasks ? 'Amaga passades' : `Mostra passades: ${pastTaskCount}`}
        </button>
        {halfGroups.length > 0 && (
          <select
            className="half-group-select"
            onChange={(event) => setHalfGroupFilter(event.target.value)}
            value={halfGroupFilter}
          >
            <option value="all">Tots els mitjos grups</option>
            {halfGroups.map((halfGroup) => (
              <option key={halfGroup} value={halfGroup}>
                {halfGroup}
              </option>
            ))}
          </select>
        )}
        <button
          className={`intervention-toggle ${showInterventions ? 'active' : ''}`}
          onClick={() => setShowInterventions((isVisible) => !isVisible)}
          type="button"
        >
          <Target size={18} />
          Intervenció setmanal
        </button>
        <button className="tool-button dark" onClick={() => setShowStudentsModal(true)} type="button">
          <Users size={18} />
          Gestió d’Alumnes
        </button>
      </div>
      {showTaskModal && <NewTaskModal onClose={() => setShowTaskModal(false)} />}
      {showStudentsModal && (
        <ManageStudentsModal classId={activeClassId} onClose={() => setShowStudentsModal(false)} />
      )}
      {profileStudentId && (
        <StudentProfileModal
          mode="tracking"
          studentId={profileStudentId}
          onClose={() => setProfileStudentId(null)}
          onOpenAnnotations={(studentId) => {
            setProfileStudentId(null)
            setAnnotationsStudentId(studentId)
          }}
        />
      )}
      {annotationsStudentId && (
        <StudentAnnotationsModal
          studentId={annotationsStudentId}
          onClose={() => setAnnotationsStudentId(null)}
          onOpenProfile={(studentId) => {
            setAnnotationsStudentId(null)
            setProfileStudentId(studentId)
          }}
        />
      )}
      {behaviorDraft && (
        <BehaviorEventModal
          student={behaviorDraft.student}
          type={behaviorDraft.type}
          onClose={() => setBehaviorDraft(null)}
          onSave={handleBehaviorSave}
        />
      )}
      {agendaWarningStudent && (
        <AgendaWarningModal
          student={agendaWarningStudent}
          missingTasks={agendaWarningMissingTasks}
          redPointCount={agendaWarningRedPoints}
          blackPointCount={agendaWarningBlackPoints}
          onClose={() => setAgendaWarningStudentId(null)}
          onLastChance={async () => {
            await deferTaskAgendaWarning(agendaWarningStudent.id, agendaWarningRedPoints)
            setAgendaWarningStudentId(null)
          }}
          onRegisterAgenda={async (agendaText) => {
            await addAgendaNote(agendaWarningStudent.id, 'tracking', agendaText)
            await deferTaskAgendaWarning(agendaWarningStudent.id, agendaWarningRedPoints)
            setAgendaWarningStudentId(null)
          }}
        />
      )}
      {taskNoteDraft && (
        <TaskNoteModal
          draft={taskNoteDraft}
          onClose={() => setTaskNoteDraft(null)}
          onSave={saveTaskNote}
        />
      )}
      {reminderDraft && (
        <TaskReminderModal
          draft={reminderDraft}
          onClose={() => setReminderDraft(null)}
          onSave={saveTaskNote}
        />
      )}
      {incompleteWarning && (
        <IncompleteWarningModal warning={incompleteWarning} onClose={() => setIncompleteWarning(null)} />
      )}
      {deleteTaskDraft && (
        <ConfirmDeleteTaskModal
          task={deleteTaskDraft}
          onClose={() => setDeleteTaskDraft(null)}
          onConfirm={async () => {
            await deleteTask(deleteTaskDraft.id)
            setDeleteTaskDraft(null)
          }}
        />
      )}
      {showInterventions && (
      <section className="tracking-intervention-popover">
        <div className="intervention-copy">
          <span>
            <Target size={18} />
            Intervenció de la setmana
          </span>
          <strong>Prioritza tendències, no una tasca aïllada.</strong>
          <p>
            {interventionCounts.priority} intervenció · {interventionCounts.monitor} en seguiment ·{' '}
            {interventionCounts.punctual} puntual. Clica un alumne per veure la fitxa de seguiment.
          </p>
        </div>
        <div className="intervention-focus-list">
          {focusInsights.length === 0 ? (
            <p>Cap alumne necessita intervenció destacada ara mateix.</p>
          ) : (
            focusInsights.map((insight) => (
              <button
                className={`intervention-focus ${insight.level}`}
                key={insight.student.id}
                onClick={() => setProfileStudentId(insight.student.id)}
                type="button"
              >
                <strong>{insight.student.name}</strong>
                <span>{insight.label}</span>
                <small>
                  {insight.recent.consistency}% recent · {insight.overall.missing} no fetes ·{' '}
                  {insight.recentIncidents} incidències
                </small>
              </button>
            ))
          )}
        </div>
      </section>
      )}
      {dueReminders.length > 0 && (
        <section className="due-reminders">
          <header>
            <Bell size={17} />
            <strong>Recordatoris d’avui</strong>
            <span>{dueReminders.length}</span>
          </header>
          {dueReminders.map((reminder) => (
            <article key={reminder.id}>
              <Bell size={16} />
              <div>
                <strong>{reminder.task.title}</strong>
                {reminder.student && <span>{reminder.student.name}</span>}
                {reminder.reminder?.time && <span>{reminder.reminder.time}</span>}
                <p>{reminder.text}</p>
              </div>
              <button className="secondary-action compact" onClick={() => snoozeReminder(reminder)} type="button">
                Ajornar 55 min
              </button>
              {reminder.student && (
                <button className="secondary-action compact" onClick={() => setProfileStudentId(reminder.student.id)} type="button">
                  Fitxa
                </button>
              )}
            </article>
          ))}
        </section>
      )}
      <div className="tracking-filter-row">
        {interventionFilters.map((filter) => (
          <button
            className={interventionFilter === filter.id ? 'active' : ''}
            key={filter.id}
            onClick={() => setInterventionFilter(filter.id)}
            type="button"
          >
            {filter.label}
          </button>
        ))}
        <span>
          {filteredStudents.length} de {students.length} alumnes visibles
        </span>
      </div>
      {visibleTasks.length === 0 ? (
        <section className="tracking-empty-tasks" data-tour="tracking-table">
          <Clipboard size={26} />
          <div>
            <strong>No hi ha tasques visibles ara mateix.</strong>
            <p>
              {tasks.length === 0
                ? 'Crea una primera tasca per començar el seguiment de la UT.'
                : `Hi ha ${pastTaskCount} tasca/ques passades amagades. Mostra-les per revisar-les o continuar marcant estats.`}
            </p>
          </div>
          {tasks.length === 0 ? (
            <button className="primary-action compact" onClick={() => setShowTaskModal(true)} type="button">
              Nova tasca
            </button>
          ) : (
            <button className="secondary-action compact" onClick={() => setShowPastTasks(true)} type="button">
              Mostra passades: {pastTaskCount}
            </button>
          )}
        </section>
      ) : (
      <div className="grid-scroll" data-tour="tracking-table">
        <table className="tracking-table">
          <thead>
            <tr>
              <th className="sticky-student tracking-student-header">Alumne</th>
              {visibleTasks.map((task) => (
                <th className="task-header" key={task.id}>
                  <EditableTaskTitle task={task} onChangeTitle={(taskId, title) => updateTask(taskId, { title })} />
                  <TaskCompletionSummary students={filteredStudents} task={task} taskRecords={taskRecords} />
                  <EditableTaskDate task={task} onChangeDate={(taskId, date) => updateTask(taskId, { date })} />
                  <button
                    className="task-header-action done-all"
                    onClick={() => markVisibleStudentsDone(task.id)}
                    title="Marcar tots els alumnes visibles com a fets"
                    type="button"
                  >
                    <CheckCircle2 size={16} />
                  </button>
                  <button
                    className="task-header-action reminder"
                    onClick={() => setReminderDraft({ task })}
                    title="Programar recordatori de la tasca"
                    type="button"
                  >
                    <Bell size={15} />
                  </button>
                  <button
                    className={`task-header-action info ${task.note ? 'active' : ''}`}
                    onClick={() => setTaskNoteDraft({ task })}
                    title="Afegir informació general de la tasca"
                    type="button"
                  >
                    i
                  </button>
                  <button
                    className="task-delete-button"
                    onClick={() => setDeleteTaskDraft(task)}
                    title="Eliminar tasca"
                    type="button"
                  >
                    <Trash2 size={14} />
                  </button>
                </th>
              ))}
              <th className="summary-header">Constància</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student, studentIndex) => {
              const stats = getStudentTrackingStats(student.id, taskRecords, tasks)
              const interventionInsight = insightByStudentId.get(student.id)
              const incidents = behaviorEvents.filter(
                (event) => event.studentId === student.id && event.type === 'incident',
              )
              const positives = behaviorEvents.filter(
                (event) => event.studentId === student.id && event.type === 'positive',
              )
              const missingTasks = getMissingTasksForStudent(student.id, taskRecords, tasks)
              const redPointCount = getRedPointCount(student, missingTasks)
              const dominantDiagnosis = getDominantDiagnosis(student.diagnoses)
              const studentNotes = agendaNotes.filter((note) => note.studentId === student.id)
              const hasTeamNotes = studentNotes.some((note) => note.type === 'team')
              const hasTutoringNotes = studentNotes.some((note) => note.type === 'tutoring')
              const trackingAgendaNotes = studentNotes.filter((note) => note.type === 'tracking')
              const noteState = hasTeamNotes ? 'team' : hasTutoringNotes ? 'tutoring' : 'empty'

              return (
                <tr className={getStudentRowClass(dominantDiagnosis, noteState)} key={student.id}>
                  <td className="sticky-student tracking-student-cell">
                    <div className="tracking-student-main">
                      <button
                        className={`student-note-button ${noteState}`}
                        onClick={() => setProfileStudentId(student.id)}
                        title="Resum i anotacions de seguiment"
                        type="button"
                      >
                        <MessageCircle size={17} />
                      </button>
                      <button
                        className="tracking-student-name"
                        onClick={() => setAnnotationsStudentId(student.id)}
                        type="button"
                      >
                        <strong>{student.name}</strong>
                        <small>{student.halfGroup}</small>
                      </button>
                    </div>
                    <div className="student-flags" data-tour={studentIndex === 0 ? 'tracking-student-actions' : undefined}>
                      <span
                        className={`red-point-stack ${redPointCount >= 3 ? 'warning' : ''}`}
                        title="Punts vermells per tasques no fetes"
                      >
                        {Array.from({ length: Math.min(redPointCount, 4) }).map((_, pointIndex) => (
                          <i key={pointIndex} />
                        ))}
                        {redPointCount > 4 && <b>+{redPointCount - 4}</b>}
                      </span>
                      <button
                        className="black-point-button"
                        onClick={() => setBehaviorDraft({ student, type: 'incident' })}
                        title="Afegir negatiu de comportament"
                        type="button"
                      >
                        <AlertTriangle size={15} />
                        {incidents.length}
                      </button>
                      <button
                        className="diary-button"
                        onClick={() => setBehaviorDraft({ student, type: 'positive' })}
                        title="Afegir entrada de diari"
                        type="button"
                      >
                        <BookOpen size={15} />
                        {positives.length}
                      </button>
                      {trackingAgendaNotes.length > 0 && (
                        <button
                          className="agenda-note-chip"
                          onClick={() => setProfileStudentId(student.id)}
                          title="Nota a l’agenda registrada"
                          type="button"
                        >
                          <Skull size={13} />
                          {trackingAgendaNotes.length}
                        </button>
                      )}
                    </div>
                  </td>
                  {visibleTasks.map((task) => {
                    const record = getRecord(taskRecords, student.id, task.id)
                    return (
                      <td className="task-cell" key={`${student.id}_${task.id}`}>
                        <button
                          className={`task-cell-info ${record?.note ? 'active' : ''}`}
                          onClick={() => setTaskNoteDraft({ task, student, record })}
                          title="Afegir informació de la tasca"
                          type="button"
                        >
                          i
                        </button>
                        <div className="status-group">
                          {statusButtons.map((status) => {
                            const Icon = status.icon
                            const active = record?.status === status.id
                            return (
                              <button
                                className={`status-button ${status.id.toLowerCase()} ${active ? 'active' : ''}`}
                                key={status.id}
                                onClick={() => handleTaskStatus(student, task.id, status.id)}
                                title={status.label}
                                type="button"
                              >
                                <Icon size={16} />
                              </button>
                            )
                          })}
                        </div>
                        <button
                          className={`cell-note ${record?.reminder ? 'active' : ''}`}
                          onClick={() => setReminderDraft({ task, student, record })}
                          title="Programar recordatori individual"
                          type="button"
                        >
                          <Bell size={13} />
                        </button>
                      </td>
                    )
                  })}
                  <td className="tracking-summary">
                    {interventionInsight && (
                      <span className={`intervention-badge ${interventionInsight.level}`}>
                        {interventionInsight.label}
                      </span>
                    )}
                    <div className="progress-line">
                      <span style={{ width: `${stats.consistency}%` }} />
                    </div>
                    <strong>{stats.consistency}%</strong>
                    <small>
                      {stats.done} fetes · {stats.missing} no fetes
                    </small>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      )}
    </section>
  )
}
