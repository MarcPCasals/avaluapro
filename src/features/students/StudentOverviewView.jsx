import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileSpreadsheet,
  Filter,
  MessageCircle,
  PencilLine,
  Search,
  Star,
  UserRound,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Modal } from '../../components/Modal'
import { ContextualHelp } from '../../components/ContextualHelp'
import { DIAGNOSIS_OPTIONS, getDominantDiagnosis } from '../../data/studentAnnotations'
import { buildStudentProfiles } from '../../lib/analytics'
import { formatAbsenceDateTime, formatAbsenceHours, getStudentAbsenceHours, getStudentAbsenceRecords } from '../../lib/attendance'
import { downloadBlob, getTodaySlug } from '../../lib/downloads'
import { buildStudentOverviewExcel } from '../../lib/studentOverviewExcel'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'
import { StudentAnnotationsModal } from './StudentAnnotationsModal'
import { StudentProfileModal } from './StudentProfileModal'

const REGISTRY_TYPES = [
  { id: 'family-contact', label: 'Contacte amb la família' },
  { id: 'student-interview', label: 'Entrevista amb l’alumne' },
  { id: 'tutorial-observation', label: 'Observació tutorial' },
  { id: 'team-information', label: 'Informació de l’equip educatiu' },
  { id: 'guidance', label: 'Orientació' },
  { id: 'agreement', label: 'Acord o mesura' },
  { id: 'other-tutorial', label: 'Altres informacions tutorials' },
]

const REGISTRY_TYPE_IDS = new Set(REGISTRY_TYPES.map((type) => type.id))

const OTHER_TUTORING_TYPES = [
  { id: 'agenda', label: 'Nota a l’agenda' },
  { id: 'incident', label: 'Full d’incidents' },
  { id: 'classroom-expulsion', label: 'Expulsió d’aula' },
  { id: 'center-expulsion', label: 'Expulsió de centre' },
  { id: 'doip', label: 'DOIP equip educatiu' },
]

const OTHER_TUTORING_TYPE_IDS = new Set(OTHER_TUTORING_TYPES.map((type) => type.id))

function todayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

function formatShortDate(value) {
  if (!value) return ''
  const [year, month, day] = String(value).slice(0, 10).split('-')
  return year && month && day ? `${day}/${month}/${year.slice(-2)}` : value
}

function latestByDate(items) {
  return [...items].sort((a, b) =>
    String(b.updatedAt || b.createdAt || b.date || '').localeCompare(
      String(a.updatedAt || a.createdAt || a.date || ''),
    ),
  )[0]
}

function SourceEditor({ label, onSave, placeholder, value }) {
  const [draft, setDraft] = useState(value || '')
  const [savedValue, setSavedValue] = useState(value || '')
  const [saving, setSaving] = useState(false)
  const isDirty = draft !== savedValue

  const handleSave = async () => {
    if (!isDirty) return
    setSaving(true)
    await onSave(draft)
    setSavedValue(draft)
    setSaving(false)
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

function RegistryModal({ onClose, student }) {
  const addTutorialRecord = useAvaluaproStore((state) => state.addTutorialRecord)
  const updateTutorialRecord = useAvaluaproStore((state) => state.updateTutorialRecord)
  const tutorialRecords = useAvaluaproStore((state) => state.tutorialRecords)
  const records = useMemo(
    () => tutorialRecords
      .filter((record) => record.studentId === student.id && REGISTRY_TYPE_IDS.has(record.type))
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))),
    [student.id, tutorialRecords],
  )
  const [form, setForm] = useState({
    date: todayInputValue(),
    followUpDate: '',
    isImportant: false,
    note: '',
    type: 'tutorial-observation',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.note.trim()) return
    setSaving(true)
    await addTutorialRecord({
      ...form,
      classId: student.classId,
      note: form.note.trim(),
      studentId: student.id,
    })
    setForm((current) => ({ ...current, followUpDate: '', isImportant: false, note: '' }))
    setSaving(false)
  }

  return (
    <Modal onClose={onClose} size="lg" title={`Registre tutorial: ${student.name}`}>
      <div className="student-overview-registry-modal">
        <form onSubmit={handleSubmit}>
          <label>
            Tipus
            <select
              onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
              value={form.type}
            >
              {REGISTRY_TYPES.map((type) => (
                <option key={type.id} value={type.id}>{type.label}</option>
              ))}
            </select>
          </label>
          <label>
            Data
            <input
              onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
              type="date"
              value={form.date}
            />
          </label>
          <label className="full">
            Informació
            <textarea
              autoFocus
              maxLength={700}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              placeholder="Què cal recordar o quina actuació s’ha acordat?"
              value={form.note}
            />
          </label>
          <label>
            Data de seguiment · opcional
            <input
              min={form.date}
              onChange={(event) => setForm((current) => ({ ...current, followUpDate: event.target.value }))}
              type="date"
              value={form.followUpDate}
            />
          </label>
          <label className="student-overview-important-check">
            <input
              checked={form.isImportant}
              onChange={(event) => setForm((current) => ({ ...current, isImportant: event.target.checked }))}
              type="checkbox"
            />
            Destacar a «A tenir en compte»
          </label>
          <button className="primary-action" disabled={saving || !form.note.trim()} type="submit">
            {saving ? 'Desant…' : 'Afegir al registre tutorial'}
          </button>
        </form>

        <section>
          <h3>Historial de la font</h3>
          {records.length === 0 ? (
            <p className="empty-list">Encara no hi ha entrades al registre tutorial.</p>
          ) : (
            <div className="student-overview-registry-history">
              {records.map((record) => {
                const type = REGISTRY_TYPES.find((item) => item.id === record.type)
                const pending = record.followUpDate && record.followUpStatus !== 'done'
                const overdue = pending && record.followUpDate < todayInputValue()
                return (
                  <article key={record.id}>
                    <div>
                      <strong>{type?.label || 'Registre tutorial'}</strong>
                      <small>{formatShortDate(record.date)}</small>
                      <p>{record.note}</p>
                      {record.followUpDate && (
                        <span className={overdue ? 'overdue' : record.followUpStatus === 'done' ? 'done' : ''}>
                          {record.followUpStatus === 'done'
                            ? 'Seguiment completat'
                            : `Seguiment ${formatShortDate(record.followUpDate)}`}
                        </span>
                      )}
                    </div>
                    <div>
                      <button
                        aria-label={record.isImportant ? 'Treure de destacats' : 'Destacar'}
                        className={record.isImportant ? 'active' : ''}
                        onClick={() => updateTutorialRecord(record.id, { isImportant: !record.isImportant })}
                        title={record.isImportant ? 'Treure de destacats' : 'Destacar'}
                        type="button"
                      >
                        <Star size={16} />
                      </button>
                      {record.followUpDate && (
                        <button
                          aria-label={record.followUpStatus === 'done' ? 'Reobrir seguiment' : 'Completar seguiment'}
                          className={record.followUpStatus === 'done' ? 'active done' : ''}
                          onClick={() =>
                            updateTutorialRecord(record.id, {
                              followUpStatus: record.followUpStatus === 'done' ? 'pending' : 'done',
                            })
                          }
                          title={record.followUpStatus === 'done' ? 'Reobrir seguiment' : 'Completar seguiment'}
                          type="button"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </Modal>
  )
}

function OtherTutoringRecordsModal({ onClose, records, student }) {
  const sortedRecords = [...records].sort((a, b) =>
    String(b.updatedAt || b.createdAt || b.date || '').localeCompare(
      String(a.updatedAt || a.createdAt || a.date || ''),
    ),
  )

  return (
    <Modal onClose={onClose} size="md" title={`Agenda i incidències: ${student.name}`}>
      <div className="student-overview-other-records">
        {sortedRecords.length === 0 ? (
          <p className="empty-list">No hi ha notes a l’agenda, incidents ni altres registres disciplinaris.</p>
        ) : (
          sortedRecords.map((record) => {
            const type = OTHER_TUTORING_TYPES.find((item) => item.id === record.type)
            return (
              <article key={record.id}>
                <div>
                  <strong>{type?.label || 'Registre tutorial'}</strong>
                  <small>{formatShortDate(record.date)}</small>
                </div>
                <p>{record.note || 'Sense comentari afegit.'}</p>
              </article>
            )
          })
        )}
      </div>
    </Modal>
  )
}

export function StudentOverviewView() {
  const activeClassId = useAvaluaproStore((state) => state.ui.activeClassId)
  const activeUtId = useAvaluaproStore((state) => state.ui.activeUtId)
  const activeClass = useAvaluaproStore((state) => state.classes.find((item) => item.id === activeClassId))
  const students = useAvaluaproStore((state) => state.students)
  const tasks = useAvaluaproStore((state) => state.tasks)
  const taskRecords = useAvaluaproStore((state) => state.taskRecords)
  const marks = useAvaluaproStore((state) => state.marks)
  const behaviorEvents = useAvaluaproStore((state) => state.behaviorEvents)
  const absenceRecords = useAvaluaproStore((state) => state.absenceRecords)
  const agendaNotes = useAvaluaproStore((state) => state.agendaNotes)
  const tutorialRecords = useAvaluaproStore((state) => state.tutorialRecords)
  const updateStudent = useAvaluaproStore((state) => state.updateStudent)
  const [search, setSearch] = useState('')
  const [onlyAttention, setOnlyAttention] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [profileStudentId, setProfileStudentId] = useState(null)
  const [annotationsStudentId, setAnnotationsStudentId] = useState(null)
  const [registryStudentId, setRegistryStudentId] = useState(null)
  const [otherRecordsStudentId, setOtherRecordsStudentId] = useState(null)
  const showTutoringColumns = Boolean(activeClass?.isTutoringGroup || activeClass?.subject === 'Tutoria')

  const profilesByStudentId = useMemo(
    () =>
      new Map(
        buildStudentProfiles(
          { behaviorEvents, classes: activeClass ? [activeClass] : [], marks, students, taskRecords, tasks },
          activeClassId,
          activeUtId,
        ).map((profile) => [profile.student.id, profile]),
      ),
    [activeClass, activeClassId, activeUtId, behaviorEvents, marks, students, taskRecords, tasks],
  )

  const allRows = useMemo(() => {
    return students
      .filter((student) => student.classId === activeClassId)
      .map((student) => {
        const notes = agendaNotes.filter((note) => note.studentId === student.id)
        const records = tutorialRecords.filter(
          (record) => record.studentId === student.id && REGISTRY_TYPE_IDS.has(record.type),
        )
        const otherTutorialRecords = tutorialRecords.filter(
          (record) => record.studentId === student.id && OTHER_TUTORING_TYPE_IDS.has(record.type),
        )
        const studentAbsenceRecords = getStudentAbsenceRecords(absenceRecords, student.id, activeClassId)
        const pendingRecords = records.filter(
          (record) => record.followUpDate && record.followUpStatus !== 'done',
        )
        const importantRecords = records.filter((record) => record.isImportant && record.followUpStatus !== 'done')
        return {
          absenceHours: getStudentAbsenceHours(absenceRecords, student.id, activeClassId),
          absenceRecords: studentAbsenceRecords,
          importantRecords,
          latestTeamNote: latestByDate(notes.filter((note) => note.type === 'team')),
          latestTrackingNote: latestByDate(notes.filter((note) => note.type === 'tracking')),
          latestTutoringNote: latestByDate(notes.filter((note) => note.type === 'tutoring')),
          otherTutorialRecords,
          pendingRecords,
          profile: profilesByStudentId.get(student.id),
          records,
          student,
        }
      })
      .sort((a, b) => a.student.name.localeCompare(b.student.name, 'ca', { numeric: true }))
  }, [absenceRecords, activeClassId, agendaNotes, profilesByStudentId, students, tutorialRecords])

  const rows = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('ca')
    return allRows
      .filter((row) => !normalizedSearch || row.student.name.toLocaleLowerCase('ca').includes(normalizedSearch))
      .filter(
        (row) =>
          !showTutoringColumns ||
          !onlyAttention ||
          row.importantRecords.length > 0 ||
          row.pendingRecords.length > 0,
      )
      .sort((a, b) => {
        if (onlyAttention) {
          const priorityA = a.importantRecords.length + a.pendingRecords.length
          const priorityB = b.importantRecords.length + b.pendingRecords.length
          if (priorityA !== priorityB) return priorityB - priorityA
        }
        return 0
      })
  }, [allRows, onlyAttention, search, showTutoringColumns])

  const selectedProfileStudent = students.find((student) => student.id === profileStudentId)
  const selectedRegistryStudent = students.find((student) => student.id === registryStudentId)
  const selectedOtherRecordsStudent = students.find((student) => student.id === otherRecordsStudentId)
  const selectedOtherRecords = allRows.find((row) => row.student.id === otherRecordsStudentId)?.otherTutorialRecords || []
  const attentionCount = showTutoringColumns
    ? allRows.filter((row) => row.importantRecords.length > 0 || row.pendingRecords.length > 0).length
    : 0
  const activeUt = useAvaluaproStore((state) => state.uts.find((item) => item.id === activeUtId))

  const handleDownloadExcel = async () => {
    if (allRows.length === 0 || exportingExcel) return
    setExportingExcel(true)
    try {
      const blob = await buildStudentOverviewExcel({ activeClass, activeUt, rows: allRows, showTutoringColumns })
      const classSlug = String(activeClass?.name || 'classe')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase()
      downloadBlob(blob, `avaluapro-alumnes-${classSlug || 'classe'}-${getTodaySlug()}.xlsx`)
    } finally {
      setExportingExcel(false)
    }
  }

  return (
    <section className="student-overview-view">
      <header className="student-overview-header">
        <div>
          <span><ClipboardList size={17} /> Vista integrada</span>
          <div className="contextual-section-title">
            <h1>Tota la informació de l’alumnat</h1>
            <ContextualHelp title="Vista integrada de l’alumnat">
              Cada bloc mostra la dada original. Quan l’edites aquí, també queda actualitzada a la seva pantalla d’origen; no es crea una còpia paral·lela.
            </ContextualHelp>
          </div>
        </div>
        <div className="student-overview-header-summary">
          <strong>{activeClass?.name || 'Classe actual'}</strong>
          <span>{rows.length} alumnes visibles</span>
        </div>
      </header>

      <div className="student-overview-toolbar">
        <label>
          <Search size={17} />
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cercar un alumne…"
            type="search"
            value={search}
          />
        </label>
        <div className="student-overview-toolbar-actions">
          <button
            className="student-overview-excel-button"
            disabled={allRows.length === 0 || exportingExcel}
            onClick={handleDownloadExcel}
            title="Descarrega tots els alumnes de la classe seleccionada"
            type="button"
          >
            <FileSpreadsheet size={17} />
            {exportingExcel ? 'Preparant Excel…' : 'Descarregar Excel'}
          </button>
          {showTutoringColumns && (
            <button className={onlyAttention ? 'active' : ''} onClick={() => setOnlyAttention((value) => !value)} type="button">
              <Filter size={16} />
              Només pendents o importants
              {attentionCount > 0 && <span>{attentionCount}</span>}
            </button>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">
          <UserRound size={30} />
          <h2>No hi ha alumnes que coincideixin amb el filtre.</h2>
        </div>
      ) : (
        <div className="student-overview-table-wrap">
          <table className={`student-overview-table ${showTutoringColumns ? 'has-tutoring-columns' : ''}`}>
            <colgroup>
              <col className="student" />
              <col className="profile" />
              <col className="general" />
              <col className="learning" />
              <col className="absences" />
              <col className="annotations" />
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
                {showTutoringColumns && <th><span>Anotacions de tutoria</span><small>Fonts: equip educatiu i tutoria</small></th>}
                {showTutoringColumns && <th><span>Registre tutorial</span><small>Font: registre tutorial</small></th>}
                {showTutoringColumns && <th><span>Agenda i incidències</span><small>Font: altres registres tutorials</small></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ absenceHours, absenceRecords: rowAbsences, importantRecords, latestTeamNote, latestTrackingNote, latestTutoringNote, otherTutorialRecords, pendingRecords, profile, records, student }) => {
                const diagnoses = DIAGNOSIS_OPTIONS.filter((option) => (student.diagnoses || []).includes(option.id))
                const dominantDiagnosis = getDominantDiagnosis(student.diagnoses)
                const overdue = pendingRecords.some((record) => record.followUpDate < todayInputValue())
                const otherRecordCounts = OTHER_TUTORING_TYPES
                  .map((type) => ({ ...type, count: otherTutorialRecords.filter((record) => record.type === type.id).length }))
                  .filter((type) => type.count > 0)
                return (
                  <tr key={student.id}>
                    <th className={dominantDiagnosis ? `student-diagnosis-${dominantDiagnosis.color}` : ''} scope="row">
                      <button onClick={() => setProfileStudentId(student.id)} type="button">
                        <strong>{student.name}</strong>
                        <small>{student.halfGroup || 'Sense mig grup'}</small>
                      </button>
                    </th>
                    <td>
                      <button className="student-overview-cell-button" onClick={() => setProfileStudentId(student.id)} type="button">
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
                        onSave={(personalNotes) => updateStudent(student.id, { personalNotes })}
                        placeholder="Sense informació general…"
                        value={student.personalNotes}
                      />
                    </td>
                    <td>
                      <button className="student-overview-cell-button" onClick={() => setAnnotationsStudentId(student.id)} type="button">
                        <div className="student-overview-learning-summary">
                          <span>
                            <small>Nota global</small>
                            <strong>{profile?.evaluation.grade || '—'}</strong>
                          </span>
                          <span>
                            <small>Constància UT</small>
                            <strong>{profile?.tracking.hasTrackingData ? `${profile.tracking.consistency}%` : '—'}</strong>
                          </span>
                          <span>
                            <small>No fetes</small>
                            <strong>{profile?.tracking.missing || 0}</strong>
                          </span>
                          <span>
                            <small>Incidències</small>
                            <strong>{profile?.incidents || 0}</strong>
                          </span>
                        </div>
                        <small><PencilLine size={13} /> Consultar les fonts</small>
                      </button>
                    </td>
                    <td>
                      <div className="student-overview-absence-summary">
                        <strong>{formatAbsenceHours(absenceHours)}</strong>
                        {rowAbsences[0] ? <small>Última: {formatAbsenceDateTime(rowAbsences[0])}</small> : <em>Sense absències</em>}
                      </div>
                    </td>
                    <td>
                      <button className="student-overview-cell-button" onClick={() => setAnnotationsStudentId(student.id)} type="button">
                        {latestTrackingNote ? (
                          <>
                            <p>{latestTrackingNote.text}</p>
                          </>
                        ) : (
                          <em>Sense anotacions</em>
                        )}
                        <small><MessageCircle size={13} /> Veure i afegir</small>
                      </button>
                    </td>
                    {showTutoringColumns && <td>
                      <button className="student-overview-cell-button" onClick={() => setAnnotationsStudentId(student.id)} type="button">
                        {latestTeamNote || latestTutoringNote ? (
                          <>
                            {latestTeamNote && <p><b>Equip:</b> {latestTeamNote.text}</p>}
                            {latestTutoringNote && <p><b>Tutoria:</b> {latestTutoringNote.text}</p>}
                          </>
                        ) : (
                          <em>Sense anotacions de tutoria</em>
                        )}
                        <small><MessageCircle size={13} /> Veure i afegir</small>
                      </button>
                    </td>}
                    {showTutoringColumns && <td>
                      <button className="student-overview-cell-button" onClick={() => setRegistryStudentId(student.id)} type="button">
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
                    </td>}
                    {showTutoringColumns && <td>
                      <button className="student-overview-cell-button" onClick={() => setOtherRecordsStudentId(student.id)} type="button">
                        {otherRecordCounts.length > 0 ? (
                          <div className="student-overview-record-counts">
                            {otherRecordCounts.map((type) => <span key={type.id}>{type.label}: <b>{type.count}</b></span>)}
                          </div>
                        ) : (
                          <em>Sense notes d’agenda ni incidències</em>
                        )}
                        <small><ClipboardList size={13} /> Veure el detall</small>
                      </button>
                    </td>}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <details className="student-overview-source-note">
        <summary><ChevronDown size={15} /> Què s’actualitza a cada lloc?</summary>
        <p>
          Perfil i informació general modifiquen la fitxa de l’alumne. Les absències venen del control d’assistència
          i les anotacions de seguiment, de les pantalles d’avaluació i tasques.
          {showTutoringColumns && ' En aquest grup tutorial, les anotacions d’equip i tutoria, el registre qualitatiu i els registres d’agenda o incidències es mostren en columnes separades.'}
          {' '}Aquesta pantalla no en crea còpies.
        </p>
      </details>

      {selectedProfileStudent && (
        <StudentProfileModal
          mode="evaluation"
          onClose={() => setProfileStudentId(null)}
          onOpenAnnotations={(studentId) => {
            setProfileStudentId(null)
            setAnnotationsStudentId(studentId)
          }}
          studentId={selectedProfileStudent.id}
        />
      )}
      {annotationsStudentId && (
        <StudentAnnotationsModal
          onClose={() => setAnnotationsStudentId(null)}
          onOpenProfile={(studentId) => {
            setAnnotationsStudentId(null)
            setProfileStudentId(studentId)
          }}
          studentId={annotationsStudentId}
        />
      )}
      {selectedRegistryStudent && (
        <RegistryModal onClose={() => setRegistryStudentId(null)} student={selectedRegistryStudent} />
      )}
      {selectedOtherRecordsStudent && (
        <OtherTutoringRecordsModal
          onClose={() => setOtherRecordsStudentId(null)}
          records={selectedOtherRecords}
          student={selectedOtherRecordsStudent}
        />
      )}
    </section>
  )
}
