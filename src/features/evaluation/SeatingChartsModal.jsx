import {
  Armchair,
  Ban,
  CheckCircle2,
  ImagePlus,
  Info,
  LayoutGrid,
  Save,
  Trash2,
  UserX,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { imageFileToCompressedDataUrl } from '../../lib/imageFiles'
import { Modal } from '../../components/Modal'

const DEFAULT_COLUMNS = 6
const DEFAULT_ROWS = 5

function getChartLabel(halfGroup) {
  return halfGroup === 'all' ? 'Grup sencer' : `Mig grup: ${halfGroup}`
}

function getShortName(name = '') {
  const cleanName = String(name).replace(/\s+/g, ' ').trim()
  if (!cleanName) return ''
  const [surnamePart, givenPart = ''] = cleanName.split(',').map((part) => part.trim())
  if (givenPart) {
    const surname = surnamePart.split(' ')[0] || surnamePart
    return `${givenPart.split(' ')[0]} ${surname}`.trim()
  }
  const parts = cleanName.split(' ')
  return parts.length <= 2 ? cleanName : `${parts[0]} ${parts.at(-1)}`
}

function createSeatGrid(rows, columns, enabledCount = rows * columns) {
  return Array.from({ length: rows * columns }, (_, index) => {
    const x = index % columns
    const y = Math.floor(index / columns)
    return {
      blocked: false,
      enabled: index < enabledCount,
      id: `seat-${y}-${x}`,
      x,
      y,
    }
  })
}

function mergeSeatGrid(previousSeats = [], rows, columns, enabledCount) {
  const previousById = new Map(previousSeats.map((seat) => [seat.id, seat]))
  return createSeatGrid(rows, columns, enabledCount).map((seat) => ({
    ...seat,
    ...(previousById.get(seat.id) || {}),
    x: seat.x,
    y: seat.y,
  }))
}

function normalizeManualLayout(layout, students) {
  const studentIds = new Set(students.map((student) => student.id))
  const rows = Math.max(3, Math.min(8, Number(layout?.rows) || DEFAULT_ROWS))
  const columns = Math.max(3, Math.min(8, Number(layout?.columns) || DEFAULT_COLUMNS))
  const enabledCount = Math.min(rows * columns, Math.max(students.length + 4, columns * 3))
  const seats =
    Array.isArray(layout?.seats) && layout.seats.length > 0
      ? mergeSeatGrid(layout.seats, rows, columns, enabledCount)
      : createSeatGrid(rows, columns, enabledCount)
  const seatById = new Map(seats.map((seat) => [seat.id, seat]))
  const placements = (Array.isArray(layout?.placements) ? layout.placements : [])
    .filter((placement) => studentIds.has(placement.studentId))
    .filter((placement) => {
      const seat = seatById.get(placement.seatId)
      return seat?.enabled && !seat.blocked
    })

  return {
    columns,
    placements,
    rows,
    seats,
    teacherDeskSide: layout?.teacherDeskSide || 'center',
  }
}

function getSlotStudents(students, halfGroup) {
  return students
    .filter((student) => halfGroup === 'all' || student.halfGroup === halfGroup)
    .sort((a, b) => a.name.localeCompare(b.name, 'ca', { numeric: true }))
}

function getPlacement(layout, seatId) {
  return layout.placements.find((placement) => placement.seatId === seatId)
}

export function SeatingChartsModal({ charts, classId, halfGroups, students = [], onClose, onDelete, onSave }) {
  const slots = ['all', ...halfGroups]
  const [activeHalfGroup, setActiveHalfGroup] = useState('all')
  const activeChart = charts.find((item) => item.halfGroup === activeHalfGroup)
  const slotStudents = useMemo(() => getSlotStudents(students, activeHalfGroup), [activeHalfGroup, students])

  return (
    <Modal onClose={onClose} size="xl" title="Llocs fixos">
      <div className="seating-panel">
        <section className="seating-help">
          <Info size={20} />
          <span>
            Pots dissenyar manualment la disposició d’aula del grup sencer o dels mitjos grups. Aquesta eina no fa
            propostes sociomètriques: només guarda la col·locació que decideix el docent.
          </span>
        </section>

        <ManualSeatingEditor
          key={`${activeHalfGroup}_${activeChart?.id || 'new'}_${activeChart?.updatedAt || ''}_${slotStudents.map((student) => student.id).join('-')}`}
          activeChart={activeChart}
          activeHalfGroup={activeHalfGroup}
          charts={charts}
          classId={classId}
          onDelete={onDelete}
          onSave={onSave}
          setActiveHalfGroup={setActiveHalfGroup}
          slotStudents={slotStudents}
          slots={slots}
        />
      </div>
    </Modal>
  )
}

function ManualSeatingEditor({
  activeChart,
  activeHalfGroup,
  charts,
  classId,
  onDelete,
  onSave,
  setActiveHalfGroup,
  slotStudents,
  slots,
}) {
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [seatMode, setSeatMode] = useState('place')
  const [message, setMessage] = useState('')
  const [draftLayout, setDraftLayout] = useState(() => normalizeManualLayout(activeChart?.manualLayout, slotStudents))

  const studentsById = useMemo(() => new Map(slotStudents.map((student) => [student.id, student])), [slotStudents])
  const placedStudentIds = useMemo(
    () => new Set(draftLayout.placements.map((placement) => placement.studentId)),
    [draftLayout.placements],
  )
  const pendingStudents = slotStudents.filter((student) => !placedStudentIds.has(student.id))
  const selectedStudent = studentsById.get(selectedStudentId)

  const handleUpload = async (halfGroup, file) => {
    if (!file) return

    try {
      const imageData = await imageFileToCompressedDataUrl(file, {
        maxSize: 1400,
        maxOutputBytes: 720 * 1024,
        quality: 0.86,
      })
      await onSave({
        classId,
        halfGroup,
        imageData,
        manualLayout: charts.find((item) => item.halfGroup === halfGroup)?.manualLayout || null,
        mode: 'image',
        title: getChartLabel(halfGroup),
      })
      setMessage('Imatge de la disposició guardada.')
    } catch (error) {
      window.alert(error.message)
    }
  }

  const updateGridSize = (patch) => {
    setDraftLayout((current) => {
      const rows = Math.max(3, Math.min(8, Number(patch.rows ?? current.rows) || DEFAULT_ROWS))
      const columns = Math.max(3, Math.min(8, Number(patch.columns ?? current.columns) || DEFAULT_COLUMNS))
      const seats = mergeSeatGrid(current.seats, rows, columns, Math.min(rows * columns, Math.max(slotStudents.length + 4, columns * 3)))
      const validSeatIds = new Set(seats.filter((seat) => seat.enabled && !seat.blocked).map((seat) => seat.id))
      return {
        ...current,
        columns,
        placements: current.placements.filter((placement) => validSeatIds.has(placement.seatId)),
        rows,
        seats,
      }
    })
  }

  const toggleSeatEnabled = (seat) => {
    setDraftLayout((current) => {
      const hasPlacement = current.placements.some((placement) => placement.seatId === seat.id)
      if (hasPlacement) return current
      return {
        ...current,
        seats: current.seats.map((item) =>
          item.id === seat.id ? { ...item, blocked: false, enabled: !item.enabled } : item,
        ),
      }
    })
  }

  const toggleSeatBlocked = (seat) => {
    setDraftLayout((current) => {
      const hasPlacement = current.placements.some((placement) => placement.seatId === seat.id)
      if (hasPlacement) return current
      return {
        ...current,
        seats: current.seats.map((item) =>
          item.id === seat.id ? { ...item, blocked: !item.blocked, enabled: true } : item,
        ),
      }
    })
  }

  const placeStudent = (seat) => {
    if (!selectedStudentId || !seat.enabled || seat.blocked) return
    setDraftLayout((current) => ({
      ...current,
      placements: [
        ...current.placements.filter(
          (placement) => placement.studentId !== selectedStudentId && placement.seatId !== seat.id,
        ),
        { seatId: seat.id, studentId: selectedStudentId },
      ],
    }))
    setSelectedStudentId('')
  }

  const handleSeatClick = (seat) => {
    const placement = getPlacement(draftLayout, seat.id)
    if (seatMode === 'block') {
      toggleSeatBlocked(seat)
      return
    }
    if (!seat.enabled && !placement) {
      toggleSeatEnabled(seat)
      return
    }
    if (selectedStudentId) {
      placeStudent(seat)
      return
    }
    if (placement) {
      setSelectedStudentId(placement.studentId)
      return
    }
    toggleSeatEnabled(seat)
  }

  const unseatStudent = (studentId) => {
    setDraftLayout((current) => ({
      ...current,
      placements: current.placements.filter((placement) => placement.studentId !== studentId),
    }))
    setSelectedStudentId((current) => (current === studentId ? '' : current))
  }

  const handleSaveManualLayout = async () => {
    await onSave({
      classId,
      halfGroup: activeHalfGroup,
      imageData: activeChart?.imageData || '',
      manualLayout: draftLayout,
      mode: 'manual',
      title: getChartLabel(activeHalfGroup),
    })
    setMessage('Disposició manual guardada.')
  }

  const handleDeleteCurrent = async () => {
    if (!activeChart) return
    const shouldDelete = window.confirm(`Vols eliminar la disposició de ${getChartLabel(activeHalfGroup)}?`)
    if (!shouldDelete) return
    await onDelete(activeChart.id)
    setMessage('Disposició eliminada.')
  }

  const resetDraft = () => {
    setDraftLayout(normalizeManualLayout(null, slotStudents))
    setSelectedStudentId('')
    setMessage('S’ha creat una graella nova. Desa-la si la vols conservar.')
  }

  return (
    <div className="manual-seating-shell">
          <aside className="manual-seating-sidebar">
            <section className="manual-seating-slots">
              <strong>Vista</strong>
              {slots.map((halfGroup) => {
                const chart = charts.find((item) => item.halfGroup === halfGroup)
                return (
                  <button
                    className={activeHalfGroup === halfGroup ? 'active' : ''}
                    key={halfGroup}
                    onClick={() => setActiveHalfGroup(halfGroup)}
                    type="button"
                  >
                    <span>{getChartLabel(halfGroup)}</span>
                    {chart?.manualLayout ? <CheckCircle2 size={15} /> : chart?.imageData ? <ImagePlus size={15} /> : null}
                  </button>
                )
              })}
            </section>

            <section className="manual-seating-controls">
              <strong>Graella</strong>
              <label>
                Files
                <input
                  max="8"
                  min="3"
                  onChange={(event) => updateGridSize({ rows: event.target.value })}
                  type="number"
                  value={draftLayout.rows}
                />
              </label>
              <label>
                Columnes
                <input
                  max="8"
                  min="3"
                  onChange={(event) => updateGridSize({ columns: event.target.value })}
                  type="number"
                  value={draftLayout.columns}
                />
              </label>
              <div className="manual-seating-mode-toggle">
                <button className={seatMode === 'place' ? 'active' : ''} onClick={() => setSeatMode('place')} type="button">
                  <Armchair size={16} />
                  Col·locar
                </button>
                <button className={seatMode === 'block' ? 'active' : ''} onClick={() => setSeatMode('block')} type="button">
                  <Ban size={16} />
                  Bloquejar
                </button>
              </div>
              <button className="secondary-action compact" onClick={resetDraft} type="button">
                <LayoutGrid size={16} />
                Nova graella
              </button>
            </section>

            <section className="manual-seating-pending">
              <strong>Pendents ({pendingStudents.length})</strong>
              <div>
                {pendingStudents.length === 0 ? (
                  <p>Tots els alumnes visibles tenen lloc.</p>
                ) : (
                  pendingStudents.map((student) => (
                    <button
                      className={selectedStudentId === student.id ? 'active' : ''}
                      key={student.id}
                      onClick={() => setSelectedStudentId((current) => (current === student.id ? '' : student.id))}
                      type="button"
                    >
                      {getShortName(student.name)}
                    </button>
                  ))
                )}
              </div>
            </section>
          </aside>

          <section className="manual-seating-editor">
            <header>
              <div>
                <span>{getChartLabel(activeHalfGroup)}</span>
                <h3>Editor manual d’aula</h3>
                <p>
                  {selectedStudent
                    ? `Seleccionat: ${selectedStudent.name}. Clica una taula activa per col·locar-lo.`
                    : seatMode === 'block'
                      ? 'Clica una taula buida per bloquejar-la o desbloquejar-la.'
                      : 'Clica un alumne pendent o una taula ocupada per moure alumnes.'}
                </p>
              </div>
              <div className="manual-seating-actions">
                <button className="primary-action compact" onClick={handleSaveManualLayout} type="button">
                  <Save size={16} />
                  Guardar
                </button>
                <label className="secondary-action compact">
                  <ImagePlus size={16} />
                  Pujar imatge
                  <input
                    accept="image/*"
                    onChange={(event) => handleUpload(activeHalfGroup, event.target.files?.[0])}
                    type="file"
                  />
                </label>
                {activeChart && (
                  <button className="danger-soft" onClick={handleDeleteCurrent} title="Eliminar disposició" type="button">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </header>

            {message && <p className="manual-seating-message">{message}</p>}

            <div className="manual-seating-classroom">
              <div className="manual-seating-front">
                <span>Pissarra</span>
                <strong>Taula docent</strong>
              </div>
              <div
                className={`manual-seating-grid ${seatMode === 'block' ? 'block-mode' : ''}`}
                style={{ gridTemplateColumns: `repeat(${draftLayout.columns}, minmax(92px, 1fr))` }}
              >
                {draftLayout.seats.map((seat) => {
                  const placement = getPlacement(draftLayout, seat.id)
                  const student = studentsById.get(placement?.studentId)
                  const isSelected = selectedStudentId && placement?.studentId === selectedStudentId
                  return (
                    <button
                      className={`manual-seat ${seat.enabled ? 'enabled' : 'disabled'} ${
                        seat.blocked ? 'blocked' : ''
                      } ${placement ? 'occupied' : ''} ${isSelected ? 'selected' : ''}`}
                      key={seat.id}
                      onClick={() => handleSeatClick(seat)}
                      type="button"
                    >
                      <Armchair aria-hidden="true" size={22} />
                      {seat.blocked ? (
                        <span>
                          <Ban size={15} />
                          Bloquejat
                        </span>
                      ) : student ? (
                        <>
                          <strong>{getShortName(student.name)}</strong>
                          <em>{student.halfGroup || 'Grup sencer'}</em>
                          <span
                            className="manual-seat-unseat"
                            onClick={(event) => {
                              event.stopPropagation()
                              unseatStudent(student.id)
                            }}
                            role="button"
                            tabIndex={0}
                            title="Deixar pendent"
                          >
                            <UserX size={13} />
                          </span>
                        </>
                      ) : seat.enabled ? (
                        <span>Taula lliure</span>
                      ) : (
                        <span>Espai</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {activeChart?.imageData && (
              <details className="manual-seating-image-reference">
                <summary>Imatge carregada anteriorment</summary>
                <img alt={getChartLabel(activeHalfGroup)} src={activeChart.imageData} />
              </details>
            )}
          </section>
    </div>
  )
}
