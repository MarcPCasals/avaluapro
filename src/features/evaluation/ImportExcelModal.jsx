import { AlertTriangle, CheckCircle2, Clipboard, Save } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Modal } from '../../components/Modal'
import { gradeTextClassName } from '../../lib/grades'

const VALID_GRADES = new Set(['A', 'B', 'C', 'D', 'NA'])
const EMPTY_MARKS = new Set(['', '-', '—', '.'])

function normalizeGrade(value) {
  const cleanValue = String(value || '').trim().toUpperCase()
  if (EMPTY_MARKS.has(cleanValue)) return { value: '', invalid: false }
  if (VALID_GRADES.has(cleanValue)) return { value: cleanValue, invalid: false }
  return { value: '', invalid: Boolean(cleanValue), raw: value }
}

function createEmptyMatrix(students, criteria) {
  return students.map(() => criteria.map(() => ({ value: '', raw: '', invalid: false, touched: false })))
}

function splitClipboardRows(rawText) {
  return rawText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((row) => row.trim())
    .map((row) => row.split('\t'))
}

function rowLooksLikeHeader(row) {
  if (row.length === 0) return false
  const normalized = row.map((cell) => String(cell || '').trim().toLowerCase())
  if (normalized[0]?.includes('alumne')) return true

  const gradeLikeCount = row.filter((cell) => !normalizeGrade(cell).invalid).length
  return gradeLikeCount < Math.max(1, Math.floor(row.length / 2))
}

function removeLeadingStudentNameIfPresent(row, criteriaCount) {
  if (row.length !== criteriaCount + 1) return row
  const first = normalizeGrade(row[0])
  return first.invalid ? row.slice(1) : row
}

function buildMatrixFromClipboard(rawText, students, criteria) {
  const matrix = createEmptyMatrix(students, criteria)
  const rawRows = splitClipboardRows(rawText)
  const rows = rawRows[0] && rowLooksLikeHeader(rawRows[0]) ? rawRows.slice(1) : rawRows

  rows.slice(0, students.length).forEach((row, rowIndex) => {
    const gradeCells = removeLeadingStudentNameIfPresent(row, criteria.length)
    gradeCells.slice(0, criteria.length).forEach((cell, columnIndex) => {
      const normalized = normalizeGrade(cell)
      matrix[rowIndex][columnIndex] = {
        ...normalized,
        raw: String(cell || '').trim(),
        touched: Boolean(String(cell || '').trim()),
      }
    })
  })

  return { matrix, ignoredRows: Math.max(0, rows.length - students.length) }
}

function countMatrixValues(matrix) {
  return matrix.flat().filter((cell) => cell.value).length
}

function countMatrixInvalids(matrix) {
  return matrix.flat().filter((cell) => cell.invalid).length
}

export function ImportExcelModal({ criteria, onClose, onSave, students }) {
  const [{ matrix, ignoredRows }, setImportState] = useState(() => ({
    matrix: createEmptyMatrix(students, criteria),
    ignoredRows: 0,
  }))

  const importedValues = useMemo(() => countMatrixValues(matrix), [matrix])
  const invalidValues = useMemo(() => countMatrixInvalids(matrix), [matrix])
  const updates = useMemo(
    () =>
      students.flatMap((student, rowIndex) =>
        criteria
          .map((criterion, columnIndex) => ({
            studentId: student.id,
            criterionId: criterion.id,
            value: matrix[rowIndex]?.[columnIndex]?.value || '',
            touched: matrix[rowIndex]?.[columnIndex]?.touched,
          }))
          .filter((update) => update.touched && update.value),
      ),
    [criteria, matrix, students],
  )

  const applyClipboardText = (text) => {
    setImportState(buildMatrixFromClipboard(text, students, criteria))
  }

  const updateCell = (rowIndex, columnIndex, value) => {
    setImportState((current) => {
      const nextMatrix = current.matrix.map((row) => row.map((cell) => ({ ...cell })))
      const normalized = normalizeGrade(value)
      nextMatrix[rowIndex][columnIndex] = {
        ...normalized,
        raw: value,
        touched: Boolean(String(value || '').trim()),
      }
      return { ...current, matrix: nextMatrix }
    })
  }

  const handleCellPaste = (event) => {
    const text = event.clipboardData.getData('text/plain')
    if (!text.includes('\t') && !text.includes('\n')) return

    event.preventDefault()
    applyClipboardText(text)
  }

  const copyTemplate = async () => {
    const header = criteria.map((criterion) => criterion.name).join('\t')
    const body = students.map((student) => [student.name, ...criteria.map(() => '')].join('\t')).join('\n')
    await navigator.clipboard.writeText(`Alumne\t${header}\n${body}`)
  }

  const handleSave = async () => {
    await onSave(updates)
    onClose()
  }

  return (
    <Modal onClose={onClose} size="xl" title="Importació massiva des d’Excel">
      <div className="excel-import-panel">
        <section className="excel-import-help">
          <Clipboard size={20} />
          <div>
            <strong>Com importar notes ràpidament?</strong>
            <p>
              Selecciona les cel·les amb notes al teu Excel i copia-les. Fes clic a la primera cel·la blanca d’aquesta
              taula i prem Ctrl + V.
            </p>
          </div>
        </section>

        <div className="excel-import-status">
          <span className="ok">
            <CheckCircle2 size={16} />
            {importedValues} notes vàlides
          </span>
          {invalidValues > 0 && (
            <span className="warning">
              <AlertTriangle size={16} />
              {invalidValues} cel·les ignorades perquè no són A/B/C/D/NA
            </span>
          )}
          {ignoredRows > 0 && (
            <span className="warning">
              <AlertTriangle size={16} />
              {ignoredRows} files sobrants ignorades
            </span>
          )}
        </div>

        <div className="excel-preview-wrap">
          <table className="excel-preview-table">
            <thead>
              <tr>
                <th>Alumne</th>
                {criteria.map((criterion) => (
                  <th key={criterion.id}>{criterion.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student, rowIndex) => (
                <tr key={student.id}>
                  <td>{student.name}</td>
                  {criteria.map((criterion, columnIndex) => {
                    const cell = matrix[rowIndex]?.[columnIndex] || { value: '', raw: '', invalid: false }
                    return (
                      <td className={cell.invalid ? 'invalid-import-cell' : gradeTextClassName(cell.value)} key={criterion.id}>
                        <input
                          aria-label={`${student.name} ${criterion.name}`}
                          autoFocus={rowIndex === 0 && columnIndex === 0}
                          className={cell.invalid ? 'invalid' : gradeTextClassName(cell.value)}
                          onChange={(event) => updateCell(rowIndex, columnIndex, event.target.value)}
                          onPaste={rowIndex === 0 && columnIndex === 0 ? handleCellPaste : undefined}
                          placeholder="-"
                          value={cell.raw || cell.value}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="excel-import-actions">
          <button className="secondary-action" onClick={copyTemplate} type="button">
            <Clipboard size={17} />
            Copiar plantilla
          </button>
          <span>{updates.length} canvis preparats</span>
          <button className="primary-action" disabled={updates.length === 0 || invalidValues > 0} onClick={handleSave} type="button">
            <Save size={17} />
            Desar importació a la taula principal
          </button>
        </footer>
      </div>
    </Modal>
  )
}
