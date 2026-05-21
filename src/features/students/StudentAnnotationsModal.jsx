import { BarChart3, Camera, ChevronDown, ChevronUp, Clipboard, MessageCircle, Trash2, UserRound, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../../components/Modal'
import { DIAGNOSIS_OPTIONS } from '../../data/studentAnnotations'
import { imageFileToCompressedDataUrl } from '../../lib/imageFiles'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'

function formatNote(note) {
  return `- ${new Date(note.date).toLocaleDateString('ca-ES')}: ${note.text}`
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
  const agendaNotes = useAvaluaproStore((state) => state.agendaNotes)
  const activeClassId = useAvaluaproStore((state) => state.ui.activeClassId)
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

  const handlePhotoUpload = async (file) => {
    if (!file) return

    try {
      const photoUrl = await imageFileToCompressedDataUrl(file, { maxSize: 480 })
      await updateStudent(studentId, { photoUrl })
    } catch (error) {
      window.alert(error.message)
    }
  }

  return (
    <Modal onClose={onClose} size="xl" title={`Perfil de l’alumne: ${student.name}`}>
      <div className="annotations-panel" data-tour="annotation-panel">
        <section className="annotation-hero">
          <div className="annotation-photo-card">
            {student.photoUrl ? (
              <img alt={student.name} src={student.photoUrl} />
            ) : (
              <div className="photo-placeholder">
                <Camera size={34} />
              </div>
            )}
            <label>
              Foto de l’alumne
              <input
                accept="image/*"
                onChange={(event) => handlePhotoUpload(event.target.files?.[0])}
                type="file"
              />
            </label>
            {student.photoUrl && (
              <button className="secondary-action compact" onClick={() => updateStudent(studentId, { photoUrl: '' })} type="button">
                <X size={15} />
                Treure foto
              </button>
            )}
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
              Obrir resum de la UT
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
