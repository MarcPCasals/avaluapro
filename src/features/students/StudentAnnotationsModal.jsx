import {
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clipboard,
  ClipboardList,
  MessageCircle,
  Trash2,
  TrendingUp,
  UserRound,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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

function formatNote(note) {
  return `- ${new Date(note.date).toLocaleDateString('ca-ES')}: ${note.text}`
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('ca-ES')
}

function getRedPointCount(student, missingTasks) {
  return Math.max(missingTasks.length, student.legacyTrackingPenaltyCount || 0)
}

function buildStudentAnnotationSummary({ diagnoses, student, teamNotes, tutoringNotes }) {
  const diagnosisLabels = DIAGNOSIS_OPTIONS
    .filter((diagnosis) => diagnoses.includes(diagnosis.id))
    .map((diagnosis) => diagnosis.label)

  return [
    `ANOTACIONS PERSONALS: ${student.name}`,
    student.halfGroup ? `Grup: ${student.halfGroup}` : '',
    '',
    '1. DIAGNÒSTICS',
    diagnosisLabels.length > 0 ? diagnosisLabels.map((label) => `- ${label}`).join('\n') : '- Sense diagnòstics marcats',
    student.diagnosisNotes ? `\nAnotacions diagnòstiques:\n${student.diagnosisNotes}` : '',
    '',
    '2. INFORMACIÓ PERSONAL',
    student.personalNotes || '- Sense informació personal registrada',
    '',
    '3. EQUIPS EDUCATIUS I AVALUACIONS',
    teamNotes.length > 0 ? teamNotes.map(formatNote).join('\n') : '- Sense entrades',
    '',
    '4. COMENTARI TUTORIA',
    tutoringNotes.length > 0 ? tutoringNotes.map(formatNote).join('\n') : '- Sense entrades',
  ]
    .filter((line) => line !== '')
    .join('\n')
}

function getReminderText({ activeDiagnoses, student, teamNotes, tutoringNotes }) {
  const latestTeamNote = teamNotes[0]
  const latestTutoringNote = tutoringNotes[0]

  if (latestTeamNote) {
    return {
      tone: 'team',
      title: 'Alerta d’equip educatiu',
      body: latestTeamNote.text,
      meta: new Date(latestTeamNote.date).toLocaleDateString('ca-ES'),
    }
  }

  if (latestTutoringNote) {
    return {
      tone: 'tutoring',
      title: 'Comentari de tutoria',
      body: latestTutoringNote.text,
      meta: new Date(latestTutoringNote.date).toLocaleDateString('ca-ES'),
    }
  }

  if (student.personalNotes) {
    return {
      tone: 'personal',
      title: 'Informació personal',
      body: student.personalNotes,
      meta: 'Dada de context docent',
    }
  }

  if (activeDiagnoses.length > 0) {
    return {
      tone: 'diagnosis',
      title: 'Diagnòstic marcat',
      body: activeDiagnoses.map((diagnosis) => diagnosis.label).join(' · '),
      meta: 'Tingues-ho present a classe',
    }
  }

  return {
    tone: 'empty',
    title: 'Sense alertes destacades',
    body: 'Ara mateix no hi ha cap informació crítica marcada per aquest alumne.',
    meta: 'Seguiment ordinari',
  }
}

function NoteEntryList({ label, notes, onDelete }) {
  if (notes.length === 0) {
    return <p className="empty-list">Encara no hi ha entrades.</p>
  }

  return (
    <div className="annotation-entry-list">
      {notes.map((note) => (
        <article className={`annotation-entry ${note.type}`} key={note.id}>
          <div>
            <header>
              <span>{label}</span>
              <strong>{new Date(note.date).toLocaleDateString('ca-ES')}</strong>
            </header>
            <p>{note.text}</p>
          </div>
          <button className="danger-soft" onClick={() => onDelete(note.id)} title="Eliminar entrada" type="button">
            <Trash2 size={15} />
          </button>
        </article>
      ))}
    </div>
  )
}

function LatestAnnotationCard({ color, emptyText, expanded, notes, onToggle, title }) {
  const latest = notes[0]

  return (
    <button className={`annotation-latest-card ${color} ${latest ? 'active' : ''}`} onClick={onToggle} type="button">
      <div>
        <strong>{title}</strong>
        <span>{latest ? new Date(latest.date).toLocaleDateString('ca-ES') : 'Sense entrades'}</span>
      </div>
      <p>{latest?.text || emptyText}</p>
      <small>{latest ? (expanded ? 'Amagar historial' : `Veure ${notes.length} entrada/es`) : 'Afegeix una entrada quan calgui'}</small>
    </button>
  )
}

export function StudentAnnotationsModal({ studentId, onClose, onOpenProfile }) {
  const students = useAvaluaproStore((state) => state.students)
  const tasks = useAvaluaproStore((state) => state.tasks)
  const taskRecords = useAvaluaproStore((state) => state.taskRecords)
  const competencies = useAvaluaproStore((state) => state.competencies)
  const criteria = useAvaluaproStore((state) => state.criteria)
  const marks = useAvaluaproStore((state) => state.marks)
  const behaviorEvents = useAvaluaproStore((state) => state.behaviorEvents)
  const agendaNotes = useAvaluaproStore((state) => state.agendaNotes)
  const activeClassId = useAvaluaproStore((state) => state.ui.activeClassId)
  const activeUtId = useAvaluaproStore((state) => state.ui.activeUtId)
  const updateStudent = useAvaluaproStore((state) => state.updateStudent)
  const addAgendaNote = useAvaluaproStore((state) => state.addAgendaNote)
  const deleteAgendaNote = useAvaluaproStore((state) => state.deleteAgendaNote)
  const [teamText, setTeamText] = useState('')
  const [tutoringText, setTutoringText] = useState('')
  const [copyState, setCopyState] = useState('')
  const [expandedSections, setExpandedSections] = useState({ team: false, tutoring: false })
  const student = students.find((item) => item.id === studentId)

  const notes = useMemo(
    () =>
      agendaNotes
        .filter((note) => note.studentId === studentId && note.classId === activeClassId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [activeClassId, agendaNotes, studentId],
  )
  const teamNotes = notes.filter((note) => note.type === 'team')
  const tutoringNotes = notes.filter((note) => note.type === 'tutoring')
  const trackingNotes = notes.filter((note) => note.type === 'tracking')
  const activeTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.classId === activeClassId && task.utId === activeUtId)
        .sort((a, b) => a.order - b.order),
    [activeClassId, activeUtId, tasks],
  )
  const activeCompetencies = useMemo(
    () =>
      competencies
        .filter((competency) => competency.utId === activeUtId)
        .sort((a, b) => a.order - b.order)
        .map((competency) => ({
          ...competency,
          criteria: criteria
            .filter((criterion) => criterion.competencyId === competency.id)
            .sort((a, b) => a.order - b.order),
        })),
    [activeUtId, competencies, criteria],
  )
  const studentBehaviorEvents = useMemo(
    () =>
      behaviorEvents
        .filter((event) => event.classId === activeClassId && event.studentId === studentId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [activeClassId, behaviorEvents, studentId],
  )

  useEffect(() => {
    const handleAddDemoTeamNote = async () => {
      setExpandedSections((current) => ({ ...current, team: true }))
      await addAgendaNote(
        studentId,
        'team',
        'Entrada demo: acordem vigilar l’evolució de l’alumne i revisar si necessita suport puntual.',
      )
    }

    window.addEventListener('avaluapro-add-demo-team-note', handleAddDemoTeamNote)
    return () => window.removeEventListener('avaluapro-add-demo-team-note', handleAddDemoTeamNote)
  }, [addAgendaNote, studentId])

  if (!student) return null

  const diagnoses = student.diagnoses || []
  const activeDiagnoses = DIAGNOSIS_OPTIONS.filter((diagnosis) => diagnoses.includes(diagnosis.id))
  const hasTeamAlert = teamNotes.length > 0
  const hasTutoringAlert = tutoringNotes.length > 0
  const reminder = getReminderText({ activeDiagnoses, student, teamNotes, tutoringNotes })
  const tracking = getStudentTrackingStats(studentId, taskRecords, activeTasks)
  const criterionMarks = activeCompetencies.flatMap((competency) =>
    competency.criteria.map((criterion) => getCriterionMark(marks, studentId, criterion.id)).filter(Boolean),
  )
  const evaluationGrade = calculateGrade(criterionMarks)
  const evaluatedCriteria = criterionMarks.length
  const totalCriteria = activeCompetencies.reduce((total, competency) => total + competency.criteria.length, 0)
  const missingTasks = activeTasks.filter(
    (task) =>
      taskRecords.find((record) => record.studentId === studentId && record.taskId === task.id)
        ?.status === 'MISSING',
  )
  const redPointCount = getRedPointCount(student || {}, missingTasks)
  const blackPoints = studentBehaviorEvents.filter((event) => event.type === 'incident')
  const diaryEntries = studentBehaviorEvents.filter((event) => event.type === 'positive')

  const toggleDiagnosis = (diagnosisId) => {
    const nextDiagnoses = diagnoses.includes(diagnosisId)
      ? diagnoses.filter((id) => id !== diagnosisId)
      : [...diagnoses, diagnosisId]
    updateStudent(studentId, { diagnoses: nextDiagnoses })
  }

  const handleAddTeamNote = async () => {
    await addAgendaNote(studentId, 'team', teamText)
    setTeamText('')
  }

  const handleAddTutoringNote = async () => {
    await addAgendaNote(studentId, 'tutoring', tutoringText)
    setTutoringText('')
  }

  const handleCopyText = async () => {
    const summary = buildStudentAnnotationSummary({ diagnoses, student, teamNotes, tutoringNotes })

    try {
      await navigator.clipboard.writeText(summary)
      setCopyState('Text copiat')
    } catch {
      setCopyState('No s’ha pogut copiar automàticament')
    }
  }

  const toggleSection = (section) => {
    setExpandedSections((current) => ({ ...current, [section]: !current[section] }))
  }

  return (
    <Modal onClose={onClose} size="xl" title={`Anotacions i resum: ${student.name}`}>
      <div className="annotations-panel" data-tour="annotation-panel">
        <section className="annotation-hero">
          <div className="annotation-photo-card">
            {student.photoUrl ? (
              <img alt={student.name} src={student.photoUrl} />
            ) : (
              <div className="photo-placeholder">
                <UserRound size={34} />
              </div>
            )}
            <strong>{student.name}</strong>
            <span>{student.halfGroup || 'Sense mig grup assignat'}</span>
          </div>
          <div className="annotation-quick-status">
            <article className={activeDiagnoses.length > 0 ? 'active' : ''}>
              <strong>{activeDiagnoses.length}</strong>
              <span>diagnòstics marcats</span>
            </article>
            <article className={hasTeamAlert ? 'team' : ''}>
              <strong>{teamNotes.length}</strong>
              <span>equips educatius</span>
            </article>
            <article className={hasTutoringAlert && !hasTeamAlert ? 'tutoring' : ''}>
              <strong>{tutoringNotes.length}</strong>
              <span>comentaris tutoria</span>
            </article>
          </div>
        </section>

        <section className="annotation-tools-row">
          <div>
            <span>L’historial de comentaris es desa localment i entra a la còpia de seguretat.</span>
            {copyState && <small>{copyState}</small>}
          </div>
          <button className="secondary-action" onClick={handleCopyText} type="button">
            <Clipboard size={16} />
            Copiar text
          </button>
          {onOpenProfile && (
            <button className="secondary-action" onClick={() => onOpenProfile(studentId)} type="button">
              <BarChart3 size={16} />
              Obrir perfil personal
            </button>
          )}
        </section>

        <section className={`annotation-reminder-card ${reminder.tone}`}>
          <div>
            <strong>Què he de tenir present?</strong>
            <span>{reminder.title}</span>
          </div>
          <p>{reminder.body}</p>
          <small>{reminder.meta}</small>
        </section>

        <section className="profile-section">
          <div className="profile-section-title">
            <h3>
              <TrendingUp size={18} />
              Resum de la UT activa
            </h3>
            <span className="profile-context-label">
              Nota {evaluationGrade || '-'} · {evaluatedCriteria}/{totalCriteria} criteris · {tracking.total} tasques
            </span>
          </div>
          <div className="profile-alert-grid">
            <article className="profile-alert-card diagnoses">
              <div>
                <strong>Diagnòstics</strong>
                <span>
                  {activeDiagnoses.length > 0
                    ? activeDiagnoses.map((diagnosis) => diagnosis.label).join(' · ')
                    : 'Sense diagnòstics marcats'}
                </span>
              </div>
            </article>
            <article className={`profile-alert-card ${hasTeamAlert ? 'team' : ''}`}>
              <div>
                <strong>Equips educatius</strong>
                <span>{teamNotes.length} entrada/es</span>
                {teamNotes[0] && <small>{formatDate(teamNotes[0].date)}</small>}
              </div>
            </article>
            <article className={`profile-alert-card ${hasTutoringAlert ? 'tutoring' : ''}`}>
              <div>
                <strong>Tutoria</strong>
                <span>{tutoringNotes.length} comentari/s</span>
                {tutoringNotes[0] && <small>{formatDate(tutoringNotes[0].date)}</small>}
              </div>
            </article>
          </div>
        </section>

        <section className="profile-section">
          <h3>
            <BookOpen size={18} />
            Avaluació de la UT
          </h3>
          <div className="profile-competency-grid">
            {activeCompetencies.map((competency) => {
              const grade = getCompetencyGrade(marks, studentId, competency)
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
                        <strong>{getCriterionMark(marks, studentId, criterion.id) || '-'}</strong>
                      </li>
                    ))}
                  </ul>
                </article>
              )
            })}
            {activeCompetencies.length === 0 && (
              <p className="empty-list">Aquesta UT no té competències actives.</p>
            )}
          </div>
        </section>

        <section className="profile-section">
          <h3>
            <ClipboardList size={18} />
            Seguiment de tasques
          </h3>
          <div className="profile-followup-grid compact">
            <article className="profile-followup-card red">
              <span>Punts vermells</span>
              <strong>{redPointCount}</strong>
              <small>Tasques no fetes o comptadors importats</small>
            </article>
            <article className="profile-followup-card black">
              <span>Punts negres</span>
              <strong>{blackPoints.length}</strong>
              <small>Incidències de comportament</small>
            </article>
            <article className="profile-followup-card diary">
              <span>Diari</span>
              <strong>{diaryEntries.length}</strong>
              <small>Observacions sense negatiu</small>
            </article>
            <article className="profile-followup-card agenda">
              <span>Agenda</span>
              <strong>{trackingNotes.length}</strong>
              <small>Notes a l’agenda registrades</small>
            </article>
          </div>
          <div className="profile-task-list">
            {activeTasks.map((task) => {
              const record = taskRecords.find((item) => item.studentId === studentId && item.taskId === task.id)
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
            {activeTasks.length === 0 && <p className="empty-list">Aquesta UT encara no té tasques.</p>}
          </div>
        </section>

        <section className="annotation-latest-grid">
          <LatestAnnotationCard
            color="team"
            emptyText="No hi ha cap comentari d’equip educatiu registrat."
            expanded={expandedSections.team}
            notes={teamNotes}
            onToggle={() => toggleSection('team')}
            title="Últim equip educatiu"
          />
          <LatestAnnotationCard
            color="tutoring"
            emptyText="No hi ha cap comentari de tutoria registrat."
            expanded={expandedSections.tutoring}
            notes={tutoringNotes}
            onToggle={() => toggleSection('tutoring')}
            title="Última tutoria"
          />
        </section>

        <section className="annotation-section" data-tour="annotation-diagnosis">
          <h3>
            <UserRound size={18} />
            1. Diagnòstics
          </h3>
          <div className="diagnosis-chip-list">
            {DIAGNOSIS_OPTIONS.map((diagnosis) => (
              <button
                className={`diagnosis-chip ${diagnosis.color} ${diagnoses.includes(diagnosis.id) ? 'active' : ''}`}
                key={diagnosis.id}
                onClick={() => toggleDiagnosis(diagnosis.id)}
                type="button"
              >
                {diagnosis.label}
              </button>
            ))}
          </div>
          <textarea
            onChange={(event) => updateStudent(studentId, { diagnosisNotes: event.target.value })}
            placeholder="Anotacions addicionals sobre diagnòstics..."
            value={student.diagnosisNotes || ''}
          />
        </section>

        <section className="annotation-section compact">
          <h3>2. Informació personal</h3>
          <textarea
            onChange={(event) => updateStudent(studentId, { personalNotes: event.target.value })}
            placeholder="Informació personal rellevant per al seguiment docent..."
            value={student.personalNotes || ''}
          />
        </section>

        <section className="annotation-section team" data-tour="annotation-team">
          <div className="annotation-section-title">
            <div>
              <button className="annotation-collapse" onClick={() => toggleSection('team')} type="button">
                <h3>3. Equips educatius i avaluacions</h3>
                {expandedSections.team ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              <span>Nota d’alerta: marca l’alumne en vermell.</span>
            </div>
            <button className="secondary-action" disabled={!teamText.trim()} onClick={handleAddTeamNote} type="button">
              + Nova entrada
            </button>
          </div>
          <textarea
            onChange={(event) => setTeamText(event.target.value)}
            placeholder="Escriu una nova entrada d’equip educatiu..."
            value={teamText}
          />
          {expandedSections.team && (
            <NoteEntryList label="Equip educatiu" notes={teamNotes} onDelete={deleteAgendaNote} />
          )}
        </section>

        <section className="annotation-section tutoring">
          <div className="annotation-section-title">
            <div>
              <button className="annotation-collapse" onClick={() => toggleSection('tutoring')} type="button">
                <h3>
                  <MessageCircle size={18} />
                  4. Comentari tutoria
                </h3>
                {expandedSections.tutoring ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              <span>Marca l’alumne en groc si no hi ha alerta d’equip educatiu.</span>
            </div>
            <button className="secondary-action" disabled={!tutoringText.trim()} onClick={handleAddTutoringNote} type="button">
              + Nova entrada
            </button>
          </div>
          <textarea
            onChange={(event) => setTutoringText(event.target.value)}
            placeholder="Escriu una nova entrada de tutoria..."
            value={tutoringText}
          />
          {expandedSections.tutoring && (
            <NoteEntryList label="Tutoria" notes={tutoringNotes} onDelete={deleteAgendaNote} />
          )}
        </section>
      </div>
    </Modal>
  )
}
