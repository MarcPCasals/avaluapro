import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Download, ImagePlus, Trash2, Users, X } from 'lucide-react'
import { Modal } from '../../components/Modal'
import { imageFileToCompressedDataUrl } from '../../lib/imageFiles'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'

function normalizeName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function parseStudentRows(rawText, existingStudents) {
  const existingNames = new Set(existingStudents.map((student) => normalizeName(student.name)))
  const seenInPaste = new Set()
  let blankLines = 0

  const rows = rawText.replace(/\r\n/g, '\n').split('\n').map((line, index) => {
    const trimmedLine = line.trim()
    if (!trimmedLine) {
      blankLines += 1
      return null
    }

    const columns = line.split('\t').map((column) => column.trim()).filter(Boolean)
    const fallbackColumns = trimmedLine.split(/[;,]/).map((column) => column.trim()).filter(Boolean)
    const parts = columns.length > 1 ? columns : fallbackColumns
    const name = (parts[0] || trimmedLine).replace(/\s+/g, ' ').trim()
    const halfGroup = (parts[1] || '').replace(/\s+/g, ' ').trim()
    const personalNotes = (parts[2] || '').trim()
    const key = normalizeName(name)
    const duplicateInClass = existingNames.has(key)
    const duplicateInPaste = seenInPaste.has(key)
    seenInPaste.add(key)

    return {
      id: `${index}_${key}`,
      name,
      halfGroup,
      personalNotes,
      duplicateInClass,
      duplicateInPaste,
      canImport: Boolean(name) && !duplicateInClass && !duplicateInPaste,
    }
  })

  return {
    blankLines,
    rows: rows.filter(Boolean),
  }
}

function plural(count, singular, pluralText) {
  return `${count} ${count === 1 ? singular : pluralText}`
}

function escapeCsv(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

export function ManageStudentsModal({ classId, onClose }) {
  const [bulkText, setBulkText] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState([])
  const [bulkHalfGroup, setBulkHalfGroup] = useState('')
  const students = useAvaluaproStore((state) => state.students)
  const currentClass = useAvaluaproStore((state) => state.classes.find((item) => item.id === classId))
  const addStudents = useAvaluaproStore((state) => state.addStudents)
  const updateStudent = useAvaluaproStore((state) => state.updateStudent)
  const deleteStudent = useAvaluaproStore((state) => state.deleteStudent)
  const classStudents = useMemo(
    () =>
      students
        .filter((student) => student.classId === classId)
        .sort((a, b) => a.name.localeCompare(b.name, 'ca', { numeric: true })),
    [classId, students],
  )
  const preview = useMemo(
    () => parseStudentRows(bulkText, classStudents),
    [bulkText, classStudents],
  )
  const importableRows = preview.rows.filter((row) => row.canImport)
  const duplicateRows = preview.rows.filter((row) => row.duplicateInClass || row.duplicateInPaste)
  const allSelected = classStudents.length > 0 && selectedStudentIds.length === classStudents.length
  const configuredCount = classStudents.filter((student) => student.photoUrl || student.personalNotes).length
  const halfGroups = [...new Set(classStudents.map((student) => student.halfGroup).filter(Boolean))].sort()

  const handleAdd = async () => {
    await addStudents(classId, importableRows)
    setBulkText('')
  }

  const toggleStudentSelection = (studentId) => {
    setSelectedStudentIds((current) =>
      current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId],
    )
  }

  const toggleAllStudents = () => {
    setSelectedStudentIds(allSelected ? [] : classStudents.map((student) => student.id))
  }

  const applyHalfGroupToSelection = async () => {
    await Promise.all(selectedStudentIds.map((studentId) => updateStudent(studentId, { halfGroup: bulkHalfGroup })))
    setSelectedStudentIds([])
    setBulkHalfGroup('')
  }

  const deleteSelection = async () => {
    const shouldDelete = window.confirm(`Vols eliminar ${selectedStudentIds.length} alumne/s i totes les seves dades?`)
    if (!shouldDelete) return

    await Promise.all(selectedStudentIds.map((studentId) => deleteStudent(studentId)))
    setSelectedStudentIds([])
  }

  const exportStudents = () => {
    const header = ['Nom', 'Mig grup', 'Foto carregada', 'Informació personal']
    const rows = classStudents.map((student) => [
      student.name,
      student.halfGroup || '',
      student.photoUrl ? 'Sí' : 'No',
      student.personalNotes || '',
    ])
    const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(';')).join('\n')
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `avaluapro-${currentClass?.name || 'classe'}-alumnes.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handlePhotoUpload = async (studentId, file) => {
    if (!file) return

    try {
      const photoUrl = await imageFileToCompressedDataUrl(file)
      await updateStudent(studentId, { photoUrl })
    } catch (error) {
      window.alert(error.message)
    }
  }

  return (
    <Modal onClose={onClose} size="xl" title="Gestió d’Alumnes">
      <div className="student-manager">
        <section className="modal-section">
          <h3>
            <Users size={18} />
            Afegir alumnes
          </h3>
          <p>
            Enganxa una llista amb un alumne per línia. Si copies dues columnes d’Excel o Clickedu,
            la segona es guardarà com a mig grup. També pots enganxar 3 columnes: nom, mig grup i informació personal.
            Les fotos es carreguen després des de l’iPad o l’ordinador.
          </p>
          <textarea
            onChange={(event) => setBulkText(event.target.value)}
            placeholder={'ALUMNE 1\tGrup A\tObservació personal\nALUMNE 2\tGrup B\nALUMNE 3'}
            value={bulkText}
          />
          {bulkText.trim() && (
            <div className="student-import-preview">
              <div className="preview-summary">
                <span>
                  <CheckCircle2 size={15} />
                  {plural(importableRows.length, 'preparat', 'preparats')}
                </span>
                {duplicateRows.length > 0 && (
                  <span className="warning">
                    <AlertTriangle size={15} />
                    {plural(duplicateRows.length, 'duplicat', 'duplicats')}
                  </span>
                )}
                {preview.blankLines > 0 && (
                  <span>{plural(preview.blankLines, 'línia buida ignorada', 'línies buides ignorades')}</span>
                )}
              </div>
              <div className="preview-list">
                {preview.rows.slice(0, 8).map((row) => (
                  <div className={`preview-row ${row.canImport ? '' : 'blocked'}`} key={row.id}>
                    <strong>{row.name}</strong>
                    <small>
                      {row.halfGroup || 'Sense grup'}
                      {row.personalNotes && ' · info personal'}
                      {row.duplicateInClass && ' · ja existeix'}
                      {row.duplicateInPaste && ' · repetit al text'}
                    </small>
                  </div>
                ))}
                {preview.rows.length > 8 && (
                  <small className="preview-more">+ {preview.rows.length - 8} alumnes més</small>
                )}
              </div>
            </div>
          )}
          <button className="primary-action" disabled={importableRows.length === 0} onClick={handleAdd} type="button">
            Afegir {importableRows.length} alumne/s
          </button>
        </section>

        <section className="modal-section">
          <div className="student-list-header">
            <h3>Alumnes de la classe ({classStudents.length})</h3>
            <button className="secondary-action compact" disabled={classStudents.length === 0} onClick={exportStudents} type="button">
              <Download size={16} />
              Exportar CSV
            </button>
          </div>
          <div className="student-manager-summary">
            <article>
              <strong>{classStudents.length}</strong>
              <span>Alumnes</span>
            </article>
            <article>
              <strong>{halfGroups.length || '-'}</strong>
              <span>{halfGroups.length > 0 ? halfGroups.join(' · ') : 'Sense migs grups'}</span>
            </article>
            <article>
              <strong>{configuredCount}</strong>
              <span>Amb foto o informació personal</span>
            </article>
          </div>
          <div className="bulk-student-actions">
            <label className="copy-check">
              <input checked={allSelected} onChange={toggleAllStudents} type="checkbox" />
              Seleccionar tots
            </label>
            <input
              onChange={(event) => setBulkHalfGroup(event.target.value)}
              placeholder="Mig grup per aplicar"
              value={bulkHalfGroup}
            />
            <button
              className="secondary-action compact"
              disabled={selectedStudentIds.length === 0}
              onClick={applyHalfGroupToSelection}
              type="button"
            >
              Aplicar a {selectedStudentIds.length}
            </button>
            <button
              className="danger-action compact"
              disabled={selectedStudentIds.length === 0}
              onClick={deleteSelection}
              type="button"
            >
              Eliminar selecció
            </button>
          </div>
          <div className="student-editor-list">
            {classStudents.map((student) => (
              <div className="student-editor-row" key={student.id}>
                <label className="copy-check">
                  <input
                    checked={selectedStudentIds.includes(student.id)}
                    onChange={() => toggleStudentSelection(student.id)}
                    type="checkbox"
                  />
                </label>
                <input
                  aria-label={`Nom de ${student.name}`}
                  onChange={(event) => updateStudent(student.id, { name: event.target.value })}
                  value={student.name}
                />
                <input
                  aria-label={`Mig grup de ${student.name}`}
                  onChange={(event) => updateStudent(student.id, { halfGroup: event.target.value })}
                  placeholder="Grup"
                  value={student.halfGroup || ''}
                />
                <input
                  accept="image/*"
                  aria-label={`Carregar foto de ${student.name}`}
                  id={`photo-${student.id}`}
                  onChange={(event) => handlePhotoUpload(student.id, event.target.files?.[0])}
                  type="file"
                />
                <div className="student-photo-tools">
                  {student.photoUrl ? (
                    <img alt="" src={student.photoUrl} />
                  ) : (
                    <span>
                      <ImagePlus size={16} />
                    </span>
                  )}
                  <label className="secondary-action compact" htmlFor={`photo-${student.id}`}>
                    Foto
                  </label>
                  {student.photoUrl && (
                    <button
                      className="danger-soft mini"
                      onClick={() => updateStudent(student.id, { photoUrl: '' })}
                      title="Treure foto"
                      type="button"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <input
                  aria-label={`Informació personal de ${student.name}`}
                  onChange={(event) => updateStudent(student.id, { personalNotes: event.target.value })}
                  placeholder="Info personal"
                  value={student.personalNotes || ''}
                />
                <button
                  className="danger-soft"
                  onClick={() => deleteStudent(student.id)}
                  title="Eliminar alumne"
                  type="button"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
            {classStudents.length === 0 && (
              <p className="empty-list">Encara no hi ha alumnes en aquesta classe.</p>
            )}
          </div>
        </section>
      </div>
    </Modal>
  )
}
