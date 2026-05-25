import {
  Camera,
  MessageCircle,
  MessageSquareText,
  UserRound,
  X,
} from 'lucide-react'
import { Modal } from '../../components/Modal'
import { DIAGNOSIS_OPTIONS } from '../../data/studentAnnotations'
import { imageFileToCompressedDataUrl } from '../../lib/imageFiles'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'

function formatDate(date) {
  return new Date(date).toLocaleDateString('ca-ES')
}

export function StudentProfileModal({ studentId, mode = 'evaluation', onClose, onOpenAnnotations }) {
  const state = useAvaluaproStore()
  const { activeClassId } = state.ui
  const student = state.students.find((item) => item.id === studentId)
  const agendaNotes = state.agendaNotes
    .filter((note) => note.classId === activeClassId && note.studentId === studentId)
    .sort((a, b) => b.date.localeCompare(a.date))
  const teamNote = agendaNotes.find((note) => note.type === 'team')
  const tutoringNote = agendaNotes.find((note) => note.type === 'tutoring')
  const diagnoses = student?.diagnoses || []
  const activeDiagnoses = DIAGNOSIS_OPTIONS.filter((diagnosis) => diagnoses.includes(diagnosis.id))
  const updateStudent = state.updateStudent

  if (!student) return null

  const toggleDiagnosis = (diagnosisId) => {
    const nextDiagnoses = diagnoses.includes(diagnosisId)
      ? diagnoses.filter((id) => id !== diagnosisId)
      : [...diagnoses, diagnosisId]
    updateStudent(studentId, { diagnoses: nextDiagnoses })
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
      <div className="annotations-panel profile-personal-panel" data-tour="annotation-panel">
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
            <article className={teamNote ? 'team' : ''}>
              <strong>{teamNote ? 'Sí' : '-'}</strong>
              <span>equip educatiu</span>
            </article>
            <article className={tutoringNote && !teamNote ? 'tutoring' : ''}>
              <strong>{tutoringNote ? 'Sí' : '-'}</strong>
              <span>tutoria</span>
            </article>
          </div>
        </section>

        <section className="annotation-tools-row">
          <div>
            <span>{student.halfGroup || 'Sense mig grup assignat'}</span>
            <small>{mode === 'tracking' ? 'Perfil personal des del seguiment' : 'Perfil personal des de l’avaluació'}</small>
          </div>
          {onOpenAnnotations && (
            <button className="secondary-action" onClick={() => onOpenAnnotations(studentId)} type="button">
              <MessageCircle size={16} />
              Obrir resum i anotacions
            </button>
          )}
        </section>

        <section className="annotation-section" data-tour="annotation-diagnosis">
          <h3>
            <UserRound size={18} />
            Diagnòstics
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
          <h3>Informació general</h3>
          <textarea
            onChange={(event) => updateStudent(studentId, { personalNotes: event.target.value })}
            placeholder="Informació personal rellevant per al seguiment docent..."
            value={student.personalNotes || ''}
          />
        </section>

        <section className="profile-section">
          <div className="profile-section-title">
            <h3>
              <MessageSquareText size={18} />
              Últimes anotacions
            </h3>
          </div>
          <div className="profile-alert-grid">
            <article className={`profile-alert-card ${teamNote ? 'team' : ''}`}>
              <div>
                <strong>Últim equip educatiu</strong>
                <span>{teamNote ? teamNote.text : 'Sense entrades d’equip educatiu'}</span>
                {teamNote && <small>{formatDate(teamNote.date)}</small>}
              </div>
            </article>
            <article className={`profile-alert-card ${tutoringNote ? 'tutoring' : ''}`}>
              <div>
                <strong>Última tutoria</strong>
                <span>{tutoringNote ? tutoringNote.text : 'Sense comentaris de tutoria'}</span>
                {tutoringNote && <small>{formatDate(tutoringNote.date)}</small>}
              </div>
            </article>
          </div>
        </section>
      </div>
    </Modal>
  )
}
