import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Download, Plus, Trash2, UserRoundPlus, Users } from 'lucide-react'
import { Modal } from '../../components/Modal'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'

function normalizeName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function toTitleCase(value = '') {
  return value
    .toLocaleLowerCase('ca')
    .replace(/(^|[\s'’.-])(\p{L})/gu, (match, prefix, letter) => `${prefix}${letter.toLocaleUpperCase('ca')}`)
}

function formatStudentNameForDisplay(rawName = '') {
  const cleanName = rawName.replace(/\s+/g, ' ').trim()
  if (!cleanName.includes(',')) return toTitleCase(cleanName)
  const [surnames, ...rest] = cleanName.split(',')
  return `${toTitleCase(surnames)}, ${toTitleCase(rest.join(',').trim())}`.trim()
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

    const nameCell = trimmedLine.split(/\t|;/)[0].trim()
    const name = formatStudentNameForDisplay(nameCell)
    const key = normalizeName(name)
    const duplicateInClass = existingNames.has(key)
    const duplicateInPaste = seenInPaste.has(key)
    seenInPaste.add(key)

    return {
      id: `${index}_${key}`,
      name,
      halfGroup: '',
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
  const [newHalfGroupName, setNewHalfGroupName] = useState('')
  const students = useAvaluaproStore((state) => state.students)
  const currentClass = useAvaluaproStore((state) => state.classes.find((item) => item.id === classId))
  const addStudents = useAvaluaproStore((state) => state.addStudents)
  const updateClass = useAvaluaproStore((state) => state.updateClass)
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
  const configuredHalfGroups =
    Array.isArray(currentClass?.halfGroups) && currentClass.halfGroups.length > 0
      ? currentClass.halfGroups
      : ['Grup A', 'Grup B']
  const halfGroups = [
    ...configuredHalfGroups,
    ...classStudents.map((student) => student.halfGroup).filter(Boolean),
  ].reduce((groups, group) => (groups.includes(group) ? groups : [...groups, group]), [])

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

  const updateHalfGroupName = async (index, value) => {
    const cleanValue = value.replace(/\s+/g, ' ').trim()
    if (!cleanValue) return

    const previousValue = configuredHalfGroups[index]
    const nextHalfGroups = configuredHalfGroups.map((group, groupIndex) => (groupIndex === index ? cleanValue : group))
    await updateClass(classId, { halfGroups: nextHalfGroups })
    if (previousValue && previousValue !== cleanValue) {
      await Promise.all(
        classStudents
          .filter((student) => student.halfGroup === previousValue)
          .map((student) => updateStudent(student.id, { halfGroup: cleanValue })),
      )
    }
  }

  const addHalfGroup = async () => {
    const cleanValue = newHalfGroupName.replace(/\s+/g, ' ').trim()
    if (!cleanValue || configuredHalfGroups.includes(cleanValue)) return
    await updateClass(classId, { halfGroups: [...configuredHalfGroups, cleanValue] })
    setNewHalfGroupName('')
  }

  const removeHalfGroup = async (groupName) => {
    const shouldRemove = window.confirm(
      `Vols eliminar el mig grup "${groupName}"? Els alumnes que el tenen assignat quedaran sense mig grup.`,
    )
    if (!shouldRemove) return

    await updateClass(classId, {
      halfGroups: configuredHalfGroups.filter((group) => group !== groupName),
    })
    await Promise.all(
      classStudents
        .filter((student) => student.halfGroup === groupName)
        .map((student) => updateStudent(student.id, { halfGroup: '' })),
    )
  }

  const deleteSelection = async () => {
    const shouldDelete = window.confirm(`Vols eliminar ${selectedStudentIds.length} alumne/s i totes les seves dades?`)
    if (!shouldDelete) return

    await Promise.all(selectedStudentIds.map((studentId) => deleteStudent(studentId)))
    setSelectedStudentIds([])
  }

  const exportStudents = () => {
    const header = ['Nom', 'Mig grup']
    const rows = classStudents.map((student) => [
      student.name,
      student.halfGroup || '',
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

  return (
    <Modal onClose={onClose} size="xl" title="Gestió d’Alumnes">
      <div className="student-manager" data-tour="student-manager">
        <section className="modal-section">
          <h3>
            <UserRoundPlus size={18} />
            Afegir alumnes
          </h3>
          <p>
            Enganxa un alumne per línia. Format esperat: <strong>COGNOM 1 COGNOM 2, Nom</strong>.
            Avaluapro ho mostrarà com <strong>Cognom Cognom, Nom</strong>.
          </p>
          <textarea
            onChange={(event) => setBulkText(event.target.value)}
            placeholder={'ALMENDROS ANTUNES, Mireia\nAMAT RICO, Claudia\nATALAYA AZABAL, Vega'}
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
                      Format preparat
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
          <div className="half-group-manager" data-tour="student-manager-half-groups">
            <div>
              <strong>Mitjos grups</strong>
              <small>Defineix els grups disponibles i assigna’ls amb desplegables.</small>
            </div>
            <div className="half-group-list">
              {configuredHalfGroups.map((group, index) => (
                <div className="half-group-row" key={`${group}-${index}`}>
                  <input
                    aria-label={`Nom del mig grup ${index + 1}`}
                    defaultValue={group}
                    onBlur={(event) => updateHalfGroupName(index, event.target.value)}
                  />
                  <button
                    className="danger-soft mini"
                    disabled={configuredHalfGroups.length <= 1}
                    onClick={() => removeHalfGroup(group)}
                    title="Eliminar mig grup"
                    type="button"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="half-group-add">
              <input
                onChange={(event) => setNewHalfGroupName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') addHalfGroup()
                }}
                placeholder="Nou mig grup"
                value={newHalfGroupName}
              />
              <button className="secondary-action compact" onClick={addHalfGroup} type="button">
                <Plus size={15} />
                Afegir
              </button>
            </div>
          </div>
        </section>

        <section className="modal-section">
          <div className="student-list-header">
            <h3>
              <Users size={18} />
              Alumnes de la classe ({classStudents.length})
            </h3>
            <button className="secondary-action compact" disabled={classStudents.length === 0} onClick={exportStudents} type="button">
              <Download size={16} />
              Exportar
            </button>
          </div>
          <div className="student-manager-summary">
            <article>
              <strong>{classStudents.length}</strong>
              <span>Alumnes</span>
            </article>
            <article>
              <strong>{halfGroups.length || '-'}</strong>
              <span>{halfGroups.length > 0 ? halfGroups.join(' · ') : 'Sense mitjos grups'}</span>
            </article>
          </div>
          <div className="bulk-student-actions" data-tour="student-manager-bulk">
            <label className="copy-check">
              <input checked={allSelected} onChange={toggleAllStudents} type="checkbox" />
              Seleccionar tots
            </label>
            <select
              aria-label="Mig grup per aplicar"
              onChange={(event) => setBulkHalfGroup(event.target.value)}
              value={bulkHalfGroup}
            >
              <option value="">Sense mig grup</option>
              {halfGroups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
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
                  onBlur={(event) => updateStudent(student.id, { name: formatStudentNameForDisplay(event.target.value) })}
                  defaultValue={student.name}
                />
                <select
                  aria-label={`Mig grup de ${student.name}`}
                  onChange={(event) => updateStudent(student.id, { halfGroup: event.target.value })}
                  value={student.halfGroup || ''}
                >
                  <option value="">Sense grup</option>
                  {halfGroups.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
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
