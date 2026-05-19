import { useState } from 'react'
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clipboard,
  ClipboardList,
  MessageCircle,
  MessageSquareText,
  TrendingUp,
  UserRound,
} from 'lucide-react'
import { Modal } from '../../components/Modal'
import { DIAGNOSIS_OPTIONS } from '../../data/studentAnnotations'
import { getStudentTrackingStats } from '../../lib/analytics'
import { calculateGrade, gradeClassName } from '../../lib/grades'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'

function getCriterionMark(marks, studentId, criterionId) {
  return marks.find((mark) => mark.studentId === studentId && mark.criterionId === criterionId)?.value || ''
}

function getCompetencyGrade(marks, studentId, competency) {
  const grades = competency.criteria.map((criterion) => getCriterionMark(marks, studentId, criterion.id))
  return calculateGrade(grades)
}

const taskStatusLabel = {
  DONE: 'Feta',
  LATE: 'Tard',
  MISSING: 'No feta',
  EXEMPT: 'Exempt',
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('ca-ES')
}

function formatNoteLine(note) {
  return `- ${formatDate(note.date)}: ${note.text}`
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // Continue with the textarea fallback for browsers that expose Clipboard but block it.
    }
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!copied) throw new Error('Copy command failed')
}

function getLateTasks(state, studentId, tasks) {
  return tasks.filter(
    (task) =>
      state.taskRecords.find((record) => record.studentId === studentId && record.taskId === task.id)?.status ===
      'LATE',
  )
}

function getRedPointCount(student, missingTasks) {
  return Math.max(missingTasks.length, student.legacyTrackingPenaltyCount || 0)
}

function buildMeetingSummary({
  activeDiagnoses,
  behaviorEvents,
  competencies,
  diaryEntries,
  evaluationGrade,
  evaluatedCriteria,
  isEvaluationMode,
  isTrackingMode,
  lateTasks,
  missingTasks,
  redPointCount,
  state,
  student,
  studentId,
  teamNotes,
  totalCriteria,
  tracking,
  tutoringNotes,
}) {
  const lines = [
    `RESUM PER REUNIÓ: ${student.name}`,
    student.halfGroup ? `Mig grup: ${student.halfGroup}` : '',
    '',
  ]

  if (isEvaluationMode) {
    lines.push(
      'AVALUACIÓ',
      `- Nota de la UT: ${evaluationGrade || '-'}`,
      `- Criteris avaluats: ${evaluatedCriteria}/${totalCriteria}`,
      `- Competències actives: ${competencies.length}`,
    )
    competencies.forEach((competency) => {
      lines.push(`- ${competency.name}: ${getCompetencyGrade(state.marks, studentId, competency) || '-'}`)
    })
  }

  if (isTrackingMode) {
    const blackPoints = behaviorEvents.filter((event) => event.type === 'incident')

    lines.push(
      'SEGUIMENT',
      `- Constància: ${tracking.consistency}%`,
      `- Tasques fetes: ${tracking.done}/${tracking.total}`,
      `- Tasques incompletes: ${lateTasks.length}`,
      `- Punts vermells: ${redPointCount}`,
      `- Punts negres: ${blackPoints.length}`,
      `- Entrades de diari: ${diaryEntries.length}`,
    )

    if (missingTasks.length > 0) {
      lines.push('', 'Tasques no fetes:', ...missingTasks.slice(-5).map((task) => `- ${formatDate(task.date)}: ${task.title}`))
    }

    if (blackPoints.length > 0) {
      lines.push('', 'Últimes incidències:', ...blackPoints.slice(0, 3).map(formatNoteLine))
    }
  }

  lines.push(
    '',
    'ANOTACIONS CLAU',
    activeDiagnoses.length > 0
      ? `- Diagnòstics: ${activeDiagnoses.map((diagnosis) => diagnosis.label).join(' · ')}`
      : '- Diagnòstics: cap marcat',
    student.personalNotes ? `- Informació personal: ${student.personalNotes}` : '- Informació personal: sense registrar',
    '',
    'Equips educatius:',
    teamNotes.length > 0 ? teamNotes.slice(0, 3).map(formatNoteLine).join('\n') : '- Sense entrades',
    '',
    'Tutoria:',
    tutoringNotes.length > 0 ? tutoringNotes.slice(0, 3).map(formatNoteLine).join('\n') : '- Sense entrades',
  )

  return lines.filter((line) => line !== '').join('\n')
}

export function StudentProfileModal({ studentId, mode = 'evaluation', onClose, onOpenAnnotations }) {
  const state = useAvaluaproStore()
  const [copyState, setCopyState] = useState('')
  const { activeClassId, activeUtId } = state.ui
  const student = state.students.find((item) => item.id === studentId)
  const tasks = state.tasks
    .filter((task) => task.classId === activeClassId && task.utId === activeUtId)
    .sort((a, b) => a.order - b.order)
  const competencies = state.competencies
    .filter((competency) => competency.utId === activeUtId)
    .sort((a, b) => a.order - b.order)
    .map((competency) => ({
      ...competency,
      criteria: state.criteria
        .filter((criterion) => criterion.competencyId === competency.id)
        .sort((a, b) => a.order - b.order),
    }))
  const behaviorEvents = state.behaviorEvents
    .filter((event) => event.classId === activeClassId && event.studentId === studentId)
    .sort((a, b) => b.date.localeCompare(a.date))
  const agendaNotes = state.agendaNotes
    .filter((note) => note.classId === activeClassId && note.studentId === studentId)
    .sort((a, b) => b.date.localeCompare(a.date))
  const teamNote = agendaNotes.find((note) => note.type === 'team')
  const tutoringNote = agendaNotes.find((note) => note.type === 'tutoring')
  const teamNotes = agendaNotes.filter((note) => note.type === 'team')
  const tutoringNotes = agendaNotes.filter((note) => note.type === 'tutoring')
  const trackingNotes = agendaNotes.filter((note) => note.type === 'tracking')
  const diagnoses = student?.diagnoses || []
  const activeDiagnoses = DIAGNOSIS_OPTIONS.filter((diagnosis) => diagnoses.includes(diagnosis.id))
  const tracking = getStudentTrackingStats(studentId, state.taskRecords, tasks)
  const criterionMarks = competencies.flatMap((competency) =>
    competency.criteria.map((criterion) => getCriterionMark(state.marks, studentId, criterion.id)).filter(Boolean),
  )
  const evaluationGrade = calculateGrade(criterionMarks)
  const evaluatedCriteria = criterionMarks.length
  const totalCriteria = competencies.reduce((total, competency) => total + competency.criteria.length, 0)
  const missingTasks = tasks.filter(
    (task) =>
      state.taskRecords.find((record) => record.studentId === studentId && record.taskId === task.id)
        ?.status === 'MISSING',
  )
  const redPointCount = getRedPointCount(student || {}, missingTasks)
  const lateTasks = getLateTasks(state, studentId, tasks)
  const blackPoints = behaviorEvents.filter((event) => event.type === 'incident')
  const diaryEntries = behaviorEvents.filter((event) => event.type === 'positive')
  const isEvaluationMode = mode === 'evaluation'
  const isTrackingMode = mode === 'tracking'

  if (!student) return null

  const meetingSummary = buildMeetingSummary({
    activeDiagnoses,
    behaviorEvents,
    competencies,
    diaryEntries,
    evaluationGrade,
    evaluatedCriteria,
    isEvaluationMode,
    isTrackingMode,
    lateTasks,
    missingTasks,
    redPointCount,
    state,
    student,
    studentId,
    teamNotes,
    totalCriteria,
    tracking,
    tutoringNotes,
  })

  const handleCopyMeetingSummary = async () => {
    try {
      await copyTextToClipboard(meetingSummary)
      setCopyState('Resum copiat')
    } catch {
      setCopyState('No s’ha pogut copiar automàticament. El resum queda visible per seleccionar-lo.')
    }
  }

  return (
    <Modal onClose={onClose} size="xl" title={student.name}>
      <div className="student-profile">
        <section className="student-profile-summary">
          <div>
            <strong>{student.name}</strong>
            <span>{student.halfGroup || 'Sense grup assignat'}</span>
          </div>
          <div className="student-profile-metrics">
            {isEvaluationMode && (
              <>
                <span>
                  <TrendingUp size={16} />
                  Nota UT {evaluationGrade || '-'}
                </span>
                <span>
                  <BookOpen size={16} />
                  {evaluatedCriteria}/{totalCriteria} criteris
                </span>
                <span>
                  <ClipboardList size={16} />
                  {competencies.length} competències
                </span>
              </>
            )}
            {isTrackingMode && (
              <>
                <span>
                  <TrendingUp size={16} />
                  {tracking.consistency}% constància
                </span>
                <span>
                  <ClipboardList size={16} />
                  {tracking.done}/{tracking.total} tasques
                </span>
                <span>
                  <AlertTriangle size={16} />
                  {redPointCount} vermells · {blackPoints.length} negres
                </span>
              </>
            )}
          </div>
        </section>

        {isTrackingMode && (
        <section className="profile-section">
          <h3>
            <ClipboardList size={18} />
            Seguiment individual
          </h3>
          <div className="profile-followup-grid">
            <article className="profile-followup-card red">
              <span>Punts vermells</span>
              <strong>{redPointCount}</strong>
              <small>
                {student.legacyTrackingPenaltyCount > missingTasks.length
                  ? 'Inclou comptadors importats del Seguidor V1'
                  : 'Tasques marcades com a no fetes'}
              </small>
              <div className="profile-dot-row red">
                {Array.from({ length: Math.max(3, Math.min(redPointCount, 4)) }).map((_, index) => (
                  <i className={index < redPointCount ? 'active' : ''} key={index} />
                ))}
                {redPointCount > 4 && <b>+{redPointCount - 4}</b>}
              </div>
            </article>
            <article className="profile-followup-card black">
              <span>Punts negres</span>
              <strong>{blackPoints.length}</strong>
              <small>Negatius de comportament amb explicació</small>
              <div className="profile-dot-row black">
                {Array.from({ length: Math.max(3, Math.min(blackPoints.length, 4)) }).map((_, index) => (
                  <i className={index < blackPoints.length ? 'active' : ''} key={index} />
                ))}
              </div>
            </article>
            <article className="profile-followup-card diary">
              <span>Diari</span>
              <strong>{diaryEntries.length}</strong>
              <small>Observacions sense negatiu</small>
              <BookOpen size={28} />
            </article>
            <article className="profile-followup-card agenda">
              <span>Avisos d’agenda</span>
              <strong>{trackingNotes.length}</strong>
              <small>Registres generats des del seguiment</small>
              <MessageSquareText size={28} />
            </article>
          </div>
        </section>
        )}

        <section className="profile-section">
          <div className="profile-section-title">
            <h3>
              <MessageSquareText size={18} />
              Avisos i anotacions clau
            </h3>
            <div className="profile-section-actions">
              <button className="secondary-action" onClick={handleCopyMeetingSummary} type="button">
                <Clipboard size={16} />
                Copiar resum
              </button>
              {onOpenAnnotations && (
                <button className="secondary-action" onClick={() => onOpenAnnotations(studentId)} type="button">
                  <MessageCircle size={16} />
                  Obrir anotacions
                </button>
              )}
            </div>
          </div>
          {copyState && <p className="profile-copy-state">{copyState}</p>}
          <div className="profile-alert-grid">
            <article className="profile-alert-card diagnoses">
              <UserRound size={18} />
              <div>
                <strong>Diagnòstics</strong>
                <span>
                  {activeDiagnoses.length > 0
                    ? activeDiagnoses.map((diagnosis) => diagnosis.label).join(' · ')
                    : 'Sense diagnòstics marcats'}
                </span>
              </div>
            </article>
            <article className={`profile-alert-card ${teamNote ? 'team' : ''}`}>
              <AlertTriangle size={18} />
              <div>
                <strong>Últim equip educatiu</strong>
                <span>{teamNote ? teamNote.text : 'Sense entrades d’equip educatiu'}</span>
                {teamNote && <small>{formatDate(teamNote.date)}</small>}
              </div>
            </article>
            <article className={`profile-alert-card ${tutoringNote ? 'tutoring' : ''}`}>
              <MessageCircle size={18} />
              <div>
                <strong>Última tutoria</strong>
                <span>{tutoringNote ? tutoringNote.text : 'Sense comentaris de tutoria'}</span>
                {tutoringNote && <small>{formatDate(tutoringNote.date)}</small>}
              </div>
            </article>
          </div>
        </section>

        <section className="profile-section">
          <div className="profile-section-title">
            <h3>
              <Clipboard size={18} />
              Resum per reunió
            </h3>
            <span className="profile-context-label">
              {isEvaluationMode ? 'Només avaluació + anotacions' : 'Només seguiment + anotacions'}
            </span>
          </div>
          <div className="profile-meeting-summary">
            <pre>{meetingSummary}</pre>
          </div>
        </section>

        {isEvaluationMode && (
        <section className="profile-section">
          <h3>
            <BookOpen size={18} />
            Avaluació de la UT
          </h3>
          <div className="profile-competency-grid">
            {competencies.map((competency) => {
              const grade = getCompetencyGrade(state.marks, studentId, competency)
              return (
                <article className="profile-competency" key={competency.id}>
                  <div>
                    <strong>{competency.name}</strong>
                    <span className={gradeClassName(grade)}>{grade || '-'}</span>
                  </div>
                  <ul>
                    {competency.criteria.map((criterion) => (
                      <li key={criterion.id}>
                        <span>{criterion.name}</span>
                        <strong>{getCriterionMark(state.marks, studentId, criterion.id) || '-'}</strong>
                      </li>
                    ))}
                  </ul>
                </article>
              )
            })}
            {competencies.length === 0 && (
              <p className="empty-list">Aquesta UT no té competències actives.</p>
            )}
          </div>
        </section>
        )}

        {isTrackingMode && (
        <section className="profile-section">
          <h3>
            <ClipboardList size={18} />
            Seguiment de tasques
          </h3>
          <div className="profile-task-list">
            {tasks.map((task) => {
              const record = state.taskRecords.find(
                (item) => item.studentId === studentId && item.taskId === task.id,
              )
              const status = record?.status || ''
              return (
                <div className={`profile-task-row ${status.toLowerCase() || 'empty'}`} key={task.id}>
                  <div>
                    <strong>{task.title}</strong>
                    <span>{formatDate(task.date)}</span>
                  </div>
                  <small>{taskStatusLabel[status] || 'Sense registre'}</small>
                </div>
              )
            })}
            {tasks.length === 0 && <p className="empty-list">Aquesta UT encara no té tasques.</p>}
          </div>
        </section>
        )}

        {isTrackingMode && (
        <section className="profile-section">
          <h3>
            <MessageSquareText size={18} />
            Avisos d’agenda registrats
          </h3>
          <div className="profile-event-list">
            {trackingNotes.map((note) => (
              <div className="profile-event-row agenda" key={note.id}>
                <MessageSquareText size={16} />
                <div>
                  <strong>Avís d’agenda</strong>
                  <span>{note.text}</span>
                </div>
                <small>{formatDate(note.date)}</small>
              </div>
            ))}
            {trackingNotes.length === 0 && (
              <p className="empty-list">Encara no s’ha registrat cap avís d’agenda des del seguiment.</p>
            )}
          </div>
        </section>
        )}

        {isTrackingMode && (
        <section className="profile-section">
          <h3>
            <MessageSquareText size={18} />
            Comportament i observacions
          </h3>
          <div className="profile-event-list">
            {behaviorEvents.map((event) => (
              <div className={`profile-event-row ${event.type}`} key={event.id}>
                {event.type === 'incident' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                <div>
                  <strong>{event.type === 'incident' ? 'Punt negre' : 'Entrada de diari'}</strong>
                  <span>{event.text}</span>
                </div>
                <small>{formatDate(event.date)}</small>
              </div>
            ))}
            {behaviorEvents.length === 0 && (
              <p className="empty-list">Encara no hi ha observacions d’aquest alumne.</p>
            )}
          </div>
        </section>
        )}
      </div>
    </Modal>
  )
}
