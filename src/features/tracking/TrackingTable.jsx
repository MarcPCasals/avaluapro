import { formatTaskSession, getTaskSessionKey, selectTaskSession } from './taskSessionChoices.js'
import { useState } from 'react'
import {
  AlertTriangle,
  Bell,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Skull,
  Trash2,
  Triangle,
  XCircle,
} from 'lucide-react'
import { getDominantDiagnosis } from '../../data/studentAnnotations.js'

const STATUS_BUTTONS = [
  { id: 'DONE', label: 'Fet', icon: CheckCircle2 },
  { id: 'LATE', label: 'Tard', icon: Clock3 },
  { id: 'MISSING', label: 'No fet', icon: XCircle },
  { id: 'EXEMPT', label: 'Exempt', icon: Triangle },
]

function getRecord(taskRecords, studentId, taskId) {
  return taskRecords.find((record) => record.studentId === studentId && record.taskId === taskId)
}

function getStudentRowClass(student) {
  const dominantDiagnosis = getDominantDiagnosis(student.diagnoses)
  return dominantDiagnosis ? `student-diagnosis-${dominantDiagnosis.color}` : ''
}

function EditableTaskDate({ nextSession, sessions, task, onChangeDate }) {
  const [isEditing, setIsEditing] = useState(false)
  const formattedDate = new Date(task.date).toLocaleDateString('ca-ES', { day: '2-digit', month: 'short' })

  if (isEditing) {
    return (
      <div className="task-date-editor">
        {sessions.length > 0 && <select aria-label={`Sessió per a ${task.title}`} defaultValue="" onChange={async (event) => {
          const session = selectTaskSession(sessions, event.target.value)
          if (!session) return
          await onChangeDate(task.id, session.date)
          setIsEditing(false)
        }}>
          <option value="">Selecciona una sessió</option>
          {sessions.map((session) => <option key={getTaskSessionKey(session)} value={getTaskSessionKey(session)}>{formatTaskSession(session)}</option>)}
        </select>}
        <input
          autoFocus
          className="task-date-input"
          onChange={async (event) => {
            await onChangeDate(task.id, event.target.value)
            setIsEditing(false)
          }}
          type="date"
          value={task.date}
        />
        <button onClick={() => setIsEditing(false)} type="button">Tancar</button>
        {nextSession && (
          <button
            aria-label="Posar la data de la propera sessió"
            onClick={async () => {
              await onChangeDate(task.id, nextSession.date)
              setIsEditing(false)
            }}
            onMouseDown={(event) => event.preventDefault()}
            title={`Proper sessió: ${nextSession.date} · ${nextSession.startsAt.slice(11, 16)}`}
            type="button"
          >
            <CalendarClock size={13} />Proper sessió
          </button>
        )}
      </div>
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
    if (cleanTitle && cleanTitle !== task.title) await onChangeTitle(task.id, cleanTitle)
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

function TaskCompletionSummary({ rows, task, taskRecords }) {
  const visibleStudentIds = new Set(rows.map((row) => row.student.id))
  const scopedRecords = taskRecords.filter(
    (record) => record.taskId === task.id && visibleStudentIds.has(record.studentId),
  )
  const done = scopedRecords.filter((record) => record.status === 'DONE').length
  const late = scopedRecords.filter((record) => record.status === 'LATE').length
  const exempt = scopedRecords.filter((record) => record.status === 'EXEMPT').length
  const total = Math.max(rows.length - exempt, 0)

  return (
    <div className="task-completion-summary">
      <span className="done">{done}/{total}</span>
      {late > 0 && <span className="late">{late} incompleta</span>}
    </div>
  )
}

export function TrackingTable({
  nextClassSession = null,
  classSessionChoices = [],
  onAddBehavior = () => {},
  onChangeTaskDate = () => {},
  onChangeTaskTitle = () => {},
  onDeleteTask = () => {},
  onMarkVisibleStudentsDone = () => {},
  onOpenAgendaDetail = () => {},
  onOpenAnnotations = () => {},
  onOpenProfile = () => {},
  onOpenRecordNote = () => {},
  onOpenRecordReminder = () => {},
  onOpenRedPoints = () => {},
  onOpenReminders = () => {},
  onOpenTaskNote = () => {},
  onOpenTaskReminder = () => {},
  onSetTaskStatus = () => {},
  renderAbsenceControl = () => null,
  rows = [],
  tableWrapRef = null,
  taskRecords = [],
  tasks = [],
}) {
  return (
    <div className="grid-scroll" data-tour="tracking-table" ref={tableWrapRef}>
      <table className="tracking-table">
        <thead>
          <tr>
            <th className="sticky-student tracking-student-header">
              <span>Alumne</span>
              <button className="note-signal" onClick={onOpenReminders} title="Recordatoris del grup" type="button">
                <Bell size={19} />
              </button>
            </th>
            {tasks.map((task, taskIndex) => (
              <th className="task-header" key={task.id}>
                <EditableTaskTitle task={task} onChangeTitle={onChangeTaskTitle} />
                <TaskCompletionSummary rows={rows} task={task} taskRecords={taskRecords} />
                <EditableTaskDate sessions={classSessionChoices} nextSession={nextClassSession} task={task} onChangeDate={onChangeTaskDate} />
                <button
                  className="task-header-action done-all"
                  data-tour={taskIndex === 0 ? 'task-done-all' : undefined}
                  onClick={() => onMarkVisibleStudentsDone(task.id)}
                  title="Marcar tots els alumnes visibles com a fets"
                  type="button"
                >
                  <CheckCircle2 size={16} />
                </button>
                <button
                  className="task-header-action reminder"
                  data-tour={taskIndex === 0 ? 'task-reminder-all' : undefined}
                  onClick={() => onOpenTaskReminder(task)}
                  title="Programar recordatori de la tasca"
                  type="button"
                >
                  <Bell size={15} />
                </button>
                <button
                  className={`task-header-action info ${task.note ? 'active' : ''}`}
                  data-tour={taskIndex === 0 ? 'task-info-all' : undefined}
                  onClick={() => onOpenTaskNote(task)}
                  title="Afegir informació general de la tasca"
                  type="button"
                >
                  i
                </button>
                <button className="task-delete-button" onClick={() => onDeleteTask(task)} title="Eliminar tasca" type="button">
                  <Trash2 size={14} />
                </button>
              </th>
            ))}
            <th className="summary-header">Constància</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, studentIndex) => {
            const {
              incidentsCount = 0,
              interventionInsight = null,
              noteState = 'empty',
              positivesCount = 0,
              redPointCount = 0,
              stats,
              student,
              trackingAgendaNotesCount = 0,
            } = row
            const isDemoMarti = student.id === 'student_6'
            const isDemoJoel = student.id === 'student_12'

            return (
              <tr
                className={getStudentRowClass(student)}
                data-student-row={student.id}
                data-tour={isDemoMarti ? 'demo-marti-tracking-row' : isDemoJoel ? 'demo-joel-tracking-row' : undefined}
                key={student.id}
              >
                <td className="sticky-student tracking-student-cell">
                  <div className="tracking-student-row">
                    <div className="tracking-student-main">
                      <button
                        className={`student-note-button ${noteState}`}
                        onClick={() => onOpenAnnotations(student.id)}
                        title="Resum i anotacions per reunió"
                        type="button"
                      >
                        <MessageCircle size={17} />
                      </button>
                      {renderAbsenceControl(student)}
                      <button className="tracking-student-name" onClick={() => onOpenProfile(student.id)} type="button">
                        <strong>{student.name}</strong>
                        <span className="student-list-meta">
                          {student.halfGroup && <small>{student.halfGroup}</small>}
                          {student.isSkiStudyStudent && <span className="student-ee-badge" title="Esquí Estudi">EE</span>}
                        </span>
                      </button>
                    </div>
                    <div className="student-flags" data-tour={studentIndex === 0 ? 'tracking-student-actions' : undefined}>
                      <button
                        className={`red-point-stack ${redPointCount >= 3 ? 'warning' : ''}`}
                        disabled={redPointCount === 0}
                        onClick={() => onOpenRedPoints(student.id)}
                        title="Punts vermells per tasques no fetes"
                        type="button"
                      >
                        {Array.from({ length: Math.min(redPointCount, 4) }).map((_, pointIndex) => <i key={pointIndex} />)}
                        {redPointCount > 4 && <b>+{redPointCount - 4}</b>}
                      </button>
                      <button
                        className="black-point-button"
                        onClick={() => onAddBehavior(student, 'incident')}
                        title="Afegir negatiu de comportament"
                        type="button"
                      >
                        <AlertTriangle size={15} />{incidentsCount}
                      </button>
                      <button
                        className="diary-button"
                        onClick={() => onAddBehavior(student, 'positive')}
                        title="Afegir entrada de diari"
                        type="button"
                      >
                        <BookOpen size={15} />{positivesCount}
                      </button>
                      <button
                        className={`agenda-note-chip ${trackingAgendaNotesCount > 0 ? 'active' : ''}`}
                        onClick={() => onOpenAgendaDetail(student.id)}
                        title={trackingAgendaNotesCount > 0 ? 'Veure o afegir notes a l’agenda' : 'Afegir nota directa a l’agenda'}
                        type="button"
                      >
                        <Skull size={13} />{trackingAgendaNotesCount}
                      </button>
                    </div>
                  </div>
                </td>
                {tasks.map((task, taskIndex) => {
                  const record = getRecord(taskRecords, student.id, task.id)
                  return (
                    <td className="task-cell" key={`${student.id}_${task.id}`}>
                      <button
                        className={`task-cell-info ${record?.note ? 'active' : ''}`}
                        data-tour={studentIndex === 0 && taskIndex === 0 ? 'task-info-individual' : undefined}
                        onClick={() => onOpenRecordNote({ record, student, task })}
                        title="Afegir informació de la tasca"
                        type="button"
                      >
                        i
                      </button>
                      <div className="status-group">
                        {STATUS_BUTTONS.map((status) => {
                          const Icon = status.icon
                          const active = record?.status === status.id
                          return (
                            <button
                              aria-pressed={active}
                              className={`status-button ${status.id.toLowerCase()} ${active ? 'active' : ''}`}
                              data-tour={
                                status.id === 'MISSING' && isDemoMarti && task.id === 'task_1'
                                  ? 'demo-marti-missing-button'
                                  : status.id === 'MISSING' && isDemoJoel && task.id === 'task_4'
                                    ? 'demo-joel-missing-button'
                                    : undefined
                              }
                              key={status.id}
                              onClick={() => onSetTaskStatus(student, task.id, status.id)}
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
                        onClick={() => onOpenRecordReminder({ record, student, task })}
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
                    <span className={`intervention-badge ${interventionInsight.level}`}>{interventionInsight.label}</span>
                  )}
                  <div className="progress-line"><span style={{ width: `${stats.consistency}%` }} /></div>
                  <strong>{stats.consistency}%</strong>
                  <small>{stats.done} fetes · {stats.missing} no fetes</small>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
