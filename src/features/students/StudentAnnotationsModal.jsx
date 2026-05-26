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
import { useEffect, useMemo, useRef, useState } from 'react'
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

function formatNote(note) {
  return `- ${new Date(note.date).toLocaleDateString('ca-ES')}: ${note.text}`
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('ca-ES')
}

function getAgendaRedResetCount(trackingNotes) {
  const latestTrackingNote = trackingNotes[0]
  if (Number.isFinite(latestTrackingNote?.redPointCount)) return latestTrackingNote.redPointCount
  const match = latestTrackingNote?.text.match(/(\d+)\s+punts vermells/i)
  return Number(match?.[1] || 0)
}

function getActiveMissingTasks(missingTasks, trackingNotes) {
  const latestTrackingNote = trackingNotes[0]
  if (!latestTrackingNote) return missingTasks
  const registeredTaskIds = new Set(latestTrackingNote.taskIds || [])
  if (registeredTaskIds.size > 0) {
    return missingTasks.filter((task) => !registeredTaskIds.has(task.id))
  }
  return missingTasks.filter((task) => !latestTrackingNote.text.includes(task.title))
}

function getRedPointCount(student, missingTasks, trackingNotes = []) {
  const activeMissingTasks = getActiveMissingTasks(missingTasks, trackingNotes)
  const legacyCount = Math.max((student.legacyTrackingPenaltyCount || 0) - getAgendaRedResetCount(trackingNotes), 0)
  return Math.max(activeMissingTasks.length, legacyCount)
}

function buildStudentAnnotationSummary({ student, teamNotes, tutoringNotes }) {
  return [
    `ANOTACIONS I RESUM: ${student.name}`,
    student.halfGroup ? `Grup: ${student.halfGroup}` : '',
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

function getReminderText({ teamNotes, tutoringNotes }) {
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

function TrackingDetailPanel({ agendaNotes, diaryEntries, detail, missingTasks, blackPoints }) {
  if (!detail) return null

  const detailConfig = {
    red: {
      title: 'Tasques no fetes',
      empty: 'No hi ha cap tasca no feta activa.',
      rows: missingTasks.map((task) => ({
        id: task.id,
        title: task.title,
        meta: formatDate(task.date),
        body: task.note || '',
      })),
    },
    black: {
      title: 'Punts negres registrats',
      empty: 'No hi ha cap incidència de comportament registrada.',
      rows: blackPoints.map((event) => ({
        id: event.id,
        title: formatDate(event.date),
        meta: 'Negatiu de comportament',
        body: event.text,
      })),
    },
    diary: {
      title: 'Entrades de diari',
      empty: 'No hi ha cap observació sense negatiu registrada.',
      rows: diaryEntries.map((event) => ({
        id: event.id,
        title: formatDate(event.date),
        meta: 'Entrada de diari',
        body: event.text,
      })),
    },
    agenda: {
      title: 'Notes a l’agenda',
      empty: 'No hi ha cap nota a l’agenda registrada.',
      rows: agendaNotes.map((note) => ({
        id: note.id,
        title: formatDate(note.date),
        meta: 'Nota a l’agenda',
        body: note.text,
      })),
    },
  }[detail]

  return (
    <section className={`profile-followup-detail ${detail}`}>
      <h4>{detailConfig.title}</h4>
      {detailConfig.rows.length === 0 ? (
        <p className="empty-list">{detailConfig.empty}</p>
      ) : (
        <div className="profile-task-list">
          {detailConfig.rows.map((row) => (
            <article className={`profile-task-row ${detail}`} key={row.id}>
              <div>
                <strong>{row.title}</strong>
                {row.body && <span>{row.body}</span>}
              </div>
              <small>{row.meta}</small>
            </article>
          ))}
        </div>
      )}
    </section>
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
  const addAgendaNote = useAvaluaproStore((state) => state.addAgendaNote)
  const deleteAgendaNote = useAvaluaproStore((state) => state.deleteAgendaNote)
  const [teamText, setTeamText] = useState('')
  const [tutoringText, setTutoringText] = useState('')
  const [copyState, setCopyState] = useState('')
  const [expandedSections, setExpandedSections] = useState({ team: false, tutoring: false })
  const [trackingDetail, setTrackingDetail] = useState('')
  const teamSectionRef = useRef(null)
  const teamTextRef = useRef(null)
  const tutoringSectionRef = useRef(null)
  const tutoringTextRef = useRef(null)
  const student = students.find((item) => item.id === studentId)

  const notes = useMemo(
    () =>
      agendaNotes
        .filter((note) => note.studentId === studentId && note.classId === activeClassId)
        .sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date)),
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
        .sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date)),
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
  const reminder = getReminderText({ teamNotes, tutoringNotes })
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
  const redPointCount = getRedPointCount(student || {}, missingTasks, trackingNotes)
  const activeMissingTasks = getActiveMissingTasks(missingTasks, trackingNotes)
  const blackPoints = studentBehaviorEvents.filter((event) => event.type === 'incident')
  const diaryEntries = studentBehaviorEvents.filter((event) => event.type === 'positive')

  const handleAddTeamNote = async () => {
    await addAgendaNote(studentId, 'team', teamText)
    setTeamText('')
  }

  const handleAddTutoringNote = async () => {
    await addAgendaNote(studentId, 'tutoring', tutoringText)
    setTutoringText('')
  }

  const handleCopyText = async () => {
    const summary = buildStudentAnnotationSummary({ student, teamNotes, tutoringNotes })

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

  const openAnnotationShortcut = (section) => {
    const sectionRef = section === 'team' ? teamSectionRef : tutoringSectionRef
    const textRef = section === 'team' ? teamTextRef : tutoringTextRef

    setExpandedSections((current) => ({ ...current, [section]: true }))
    window.requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      textRef.current?.focus()
    })
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
            <button
              className={`annotation-quick-card ${hasTeamAlert ? 'team' : ''}`}
              onClick={() => openAnnotationShortcut('team')}
              title="Veure historial i afegir entrada d’equip educatiu"
              type="button"
            >
              <strong>{teamNotes.length}</strong>
              <span>equips educatius</span>
            </button>
            <button
              className={`annotation-quick-card ${hasTutoringAlert && !hasTeamAlert ? 'tutoring' : ''}`}
              onClick={() => openAnnotationShortcut('tutoring')}
              title="Veure historial i afegir comentari de tutoria"
              type="button"
            >
              <strong>{tutoringNotes.length}</strong>
              <span>comentaris tutoria</span>
            </button>
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
            <button
              className={`profile-followup-card red ${trackingDetail === 'red' ? 'active' : ''}`}
              onClick={() => setTrackingDetail((current) => (current === 'red' ? '' : 'red'))}
              type="button"
            >
              <span>Punts vermells</span>
              <strong>{redPointCount}</strong>
              <small>Veure tasques no fetes</small>
            </button>
            <button
              className={`profile-followup-card black ${trackingDetail === 'black' ? 'active' : ''}`}
              onClick={() => setTrackingDetail((current) => (current === 'black' ? '' : 'black'))}
              type="button"
            >
              <span>Punts negres</span>
              <strong>{blackPoints.length}</strong>
              <small>Veure incidències</small>
            </button>
            <button
              className={`profile-followup-card diary ${trackingDetail === 'diary' ? 'active' : ''}`}
              onClick={() => setTrackingDetail((current) => (current === 'diary' ? '' : 'diary'))}
              type="button"
            >
              <span>Diari</span>
              <strong>{diaryEntries.length}</strong>
              <small>Veure observacions</small>
            </button>
            <button
              className={`profile-followup-card agenda ${trackingDetail === 'agenda' ? 'active' : ''}`}
              onClick={() => setTrackingDetail((current) => (current === 'agenda' ? '' : 'agenda'))}
              type="button"
            >
              <span>Agenda</span>
              <strong>{trackingNotes.length}</strong>
              <small>Veure notes registrades</small>
            </button>
          </div>
          <TrackingDetailPanel
            agendaNotes={trackingNotes}
            blackPoints={blackPoints}
            detail={trackingDetail}
            diaryEntries={diaryEntries}
            missingTasks={activeMissingTasks}
          />
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

        <section className="annotation-section team" data-tour="annotation-team" ref={teamSectionRef}>
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
            ref={teamTextRef}
            value={teamText}
          />
          {expandedSections.team && (
            <NoteEntryList label="Equip educatiu" notes={teamNotes} onDelete={deleteAgendaNote} />
          )}
        </section>

        <section className="annotation-section tutoring" ref={tutoringSectionRef}>
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
            ref={tutoringTextRef}
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
