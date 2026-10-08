import './StudentClassroomNotes.css'
import {
  AlertCircle,
  ChevronDown,
  ClipboardList,
  MessageCircle,
  PencilLine,
  Star,
  UserRound,
} from 'lucide-react'
import { useState } from 'react'
import {
  DIAGNOSIS_OPTIONS,
  getDominantDiagnosis,
  resolveProgressReason,
} from '../../data/studentAnnotations.js'
import { formatClassroomNoteDate } from '../../lib/studentClassroomNotes.js'
import { formatAbsenceDateTime, formatAbsenceHours } from '../../lib/attendance.js'

const OTHER_TUTORING_TYPES = [
  { id: 'agenda', label: 'Nota a l’agenda' },
  { id: 'incident', label: 'Full d’incidents' },
  { id: 'classroom-expulsion', label: 'Expulsió d’aula' },
  { id: 'center-expulsion', label: 'Expulsió de centre' },
  { id: 'doip', label: 'DOIP equip educatiu' },
]

function todayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

function SourceEditor({ label, onSave, placeholder, value }) {
  const normalizedValue = value || ''
  const [draft, setDraft] = useState(normalizedValue)
  const [savedValue, setSavedValue] = useState(normalizedValue)
  const [saving, setSaving] = useState(false)
  const isDirty = draft !== savedValue

  const handleSave = async () => {
    if (!isDirty) return
    setSaving(true)
    try {
      await onSave(draft)
      setSavedValue(draft)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="student-overview-source-editor">
      <textarea
        aria-label={label}
        maxLength={700}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
        value={draft}
      />
      {isDirty && (
        <button disabled={saving} onClick={handleSave} type="button">
          {saving ? 'Desant…' : 'Desar'}
        </button>
      )}
    </div>
  )
}

export function StudentOverviewTable({
  onOpenAnnotations = () => {},
  onOpenOtherRecords = () => {},
  onOpenProfile = () => {},
  onOpenRegistry = () => {},
  onSavePersonalNotes = () => {},
  rows = [],
  showTutoringColumns = false,
}) {
  if (rows.length === 0) {
    return (
      <div className="empty-state">
        <UserRound size={30} />
        <h2>No hi ha alumnes que coincideixin amb el filtre.</h2>
      </div>
    )
  }

  return (
    <>
      <div className="student-overview-table-wrap">
        <table className={`student-overview-table ${showTutoringColumns ? 'has-tutoring-columns' : ''}`}>
          <colgroup>
            <col className="student" />
            <col className="profile" />
            <col className="general" />
            <col className="learning" />
            <col className="absences" />
            <col className="annotations" />
            <col className="classroom-notes" />
            {showTutoringColumns && <col className="tutoring-notes" />}
            {showTutoringColumns && <col className="registry" />}
            {showTutoringColumns && <col className="other-records" />}
          </colgroup>
          <thead>
            <tr>
              <th>Alumne</th>
              <th><span>Perfil</span><small>Font: perfil de l’alumne</small></th>
              <th><span>Informació general</span><small>Font: perfil de l’alumne</small></th>
              <th><span>Avaluació i seguiment</span><small>Fonts: avaluació i seguiment</small></th>
              <th><span>Absències</span><small>Font: control d’assistència</small></th>
              <th><span>Anotacions de seguiment</span><small>Font: seguiment de tasques</small></th>
              <th><span>Notes del Mode aula</span><small>Font: registres de cada sessió</small></th>
              {showTutoringColumns && <th><span>Anotacions de tutoria</span><small>Fonts: equip educatiu i tutoria</small></th>}
              {showTutoringColumns && <th><span>Registre tutorial</span><small>Font: registre tutorial</small></th>}
              {showTutoringColumns && <th><span>Agenda i incidències</span><small>Font: altres registres tutorials</small></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const {
                absenceHours = 0,
                absenceRecords = [],
                classroomNotes = [],
                importantRecords = [],
                latestTeamNote = null,
                latestTrackingNote = null,
                latestTutoringNote = null,
                otherTutorialRecords = [],
                pendingRecords = [],
                profile = null,
                records = [],
                student,
              } = row
              const studentProgressReason = resolveProgressReason(student.progressReason)
              const diagnoses = DIAGNOSIS_OPTIONS
                .filter((option) => (student.diagnoses || []).includes(option.id))
                .map((option) => (
                  option.id === 'progress' && studentProgressReason
                    ? { ...option, label: `${option.label} · ${studentProgressReason.label}` }
                    : option
                ))
              const dominantDiagnosis = getDominantDiagnosis(student.diagnoses)
              const overdue = pendingRecords.some((record) => record.followUpDate < todayInputValue())
              const otherRecordCounts = OTHER_TUTORING_TYPES
                .map((type) => ({
                  ...type,
                  count: otherTutorialRecords.filter((record) => record.type === type.id).length,
                }))
                .filter((type) => type.count > 0)

              return (
                <tr key={student.id}>
                  <th className={dominantDiagnosis ? `student-diagnosis-${dominantDiagnosis.color}` : ''} scope="row">
                    <button onClick={() => onOpenProfile(student.id)} type="button">
                      <strong>{student.name}</strong>
                      <small>{student.halfGroup || 'Sense mig grup'}</small>
                    </button>
                  </th>
                  <td>
                    <button className="student-overview-cell-button" onClick={() => onOpenProfile(student.id)} type="button">
                      <div className="student-overview-chip-list">
                        {student.isSkiStudyStudent && <span className="ee">EE</span>}
                        {diagnoses.length > 0
                          ? diagnoses.map((diagnosis) => <span className={diagnosis.color} key={diagnosis.id}>{diagnosis.label}</span>)
                          : <em>Sense diagnòstics marcats</em>}
                      </div>
                      {student.diagnosisNotes && <p>{student.diagnosisNotes}</p>}
                      <small><PencilLine size={13} /> Editar a la font</small>
                    </button>
                  </td>
                  <td>
                    <SourceEditor
                      key={`${student.id}-${student.personalNotes || ''}`}
                      label={`Informació general de ${student.name}`}
                      onSave={(personalNotes) => onSavePersonalNotes(student.id, personalNotes)}
                      placeholder="Sense informació general…"
                      value={student.personalNotes}
                    />
                  </td>
                  <td>
                    <button className="student-overview-cell-button" onClick={() => onOpenAnnotations(student.id)} type="button">
                      <div className="student-overview-learning-summary">
                        <span><small>Nota global</small><strong>{profile?.evaluation.grade || '—'}</strong></span>
                        <span><small>Constància UT</small><strong>{profile?.tracking.hasTrackingData ? `${profile.tracking.consistency}%` : '—'}</strong></span>
                        <span><small>No fetes</small><strong>{profile?.tracking.missing || 0}</strong></span>
                        <span><small>Incidències</small><strong>{profile?.incidents || 0}</strong></span>
                      </div>
                      <small><PencilLine size={13} /> Consultar les fonts</small>
                    </button>
                  </td>
                  <td>
                    <div className="student-overview-absence-summary">
                      <strong>{formatAbsenceHours(absenceHours)}</strong>
                      {absenceRecords[0]
                        ? <small>Última: {formatAbsenceDateTime(absenceRecords[0])}</small>
                        : <em>Sense absències</em>}
                    </div>
                  </td>
                  <td>
                    <button className="student-overview-cell-button" onClick={() => onOpenAnnotations(student.id)} type="button">
                      {latestTrackingNote ? <p>{latestTrackingNote.text}</p> : <em>Sense anotacions</em>}
                      <small><MessageCircle size={13} /> Veure i afegir</small>
                    </button>
                  </td>
                  <td>
                    {classroomNotes.length === 0 ? <em>Sense notes de sessió</em> : (
                      <div className="student-overview-classroom-notes">
                        <div className="student-overview-classroom-counts">
                          <span className="positive">{classroomNotes.filter((note) => note.type === 'positive').length} positiva{classroomNotes.filter((note) => note.type === 'positive').length === 1 ? '' : 's'}</span>
                          <span className="incident">{classroomNotes.filter((note) => note.type === 'incident').length} negativa{classroomNotes.filter((note) => note.type === 'incident').length === 1 ? '' : 's'}</span>
                        </div>
                        <div className="student-overview-classroom-history" role="region" aria-label={`Notes del Mode aula de ${student.name}`} tabIndex={0}>
                          {classroomNotes.map((note) => (
                            <article className={note.type} key={note.id}>
                              <small>{formatClassroomNoteDate(note)} · {note.type === 'positive' ? 'Positiva' : 'Negativa · incidència'}</small>
                              <p>{note.text}</p>
                            </article>
                          ))}
                        </div>
                      </div>
                    )}
                  </td>
                  {showTutoringColumns && (
                    <td>
                      <button className="student-overview-cell-button" onClick={() => onOpenAnnotations(student.id)} type="button">
                        {latestTeamNote || latestTutoringNote ? (
                          <>
                            {latestTeamNote && <p><b>Equip:</b> {latestTeamNote.text}</p>}
                            {latestTutoringNote && <p><b>Tutoria:</b> {latestTutoringNote.text}</p>}
                          </>
                        ) : <em>Sense anotacions de tutoria</em>}
                        <small><MessageCircle size={13} /> Veure i afegir</small>
                      </button>
                    </td>
                  )}
                  {showTutoringColumns && (
                    <td>
                      <button className="student-overview-cell-button" onClick={() => onOpenRegistry(student.id)} type="button">
                        {importantRecords[0] ? <p><b>Important:</b> {importantRecords[0].note}</p> : null}
                        <div className="student-overview-statuses">
                          {importantRecords.length > 0 && <span className="important"><Star size={13} /> {importantRecords.length}</span>}
                          {pendingRecords.length > 0 && (
                            <span className={overdue ? 'overdue' : 'pending'}>
                              <AlertCircle size={13} /> {pendingRecords.length} pendent{pendingRecords.length === 1 ? '' : 's'}
                            </span>
                          )}
                          {records.length === 0 && <em>Sense registres</em>}
                        </div>
                        <small><ClipboardList size={13} /> Veure i afegir</small>
                      </button>
                    </td>
                  )}
                  {showTutoringColumns && (
                    <td>
                      <button className="student-overview-cell-button" onClick={() => onOpenOtherRecords(student.id)} type="button">
                        {otherRecordCounts.length > 0 ? (
                          <div className="student-overview-record-counts">
                            {otherRecordCounts.map((type) => <span key={type.id}>{type.label}: <b>{type.count}</b></span>)}
                          </div>
                        ) : <em>Sense notes d’agenda ni incidències</em>}
                        <small><ClipboardList size={13} /> Veure el detall</small>
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <details className="student-overview-source-note">
        <summary><ChevronDown size={15} /> Què s’actualitza a cada lloc?</summary>
        <p>
          Perfil i informació general modifiquen la fitxa de l’alumne. Les absències venen del control d’assistència
          i les anotacions de seguiment, de les pantalles d’avaluació i tasques. Les notes del Mode aula mostren totes les entrades positives i negatives registrades per alumne a les sessions d’aquest grup, de més recent a més antiga.
          {showTutoringColumns && ' En aquest grup tutorial, les anotacions d’equip i tutoria, el registre qualitatiu i els registres d’agenda o incidències es mostren en columnes separades.'}
          {' '}Aquesta pantalla no en crea còpies.
        </p>
      </details>
    </>
  )
}
