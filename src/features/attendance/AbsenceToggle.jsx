import { getAbsenceTimeParts, findAbsenceInSlot, getStudentAbsenceHours } from '../../lib/attendance'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'

export function AbsenceToggle({ classId, studentId }) {
  const absenceRecords = useAvaluaproStore((state) => state.absenceRecords)
  const toggleStudentAbsence = useAvaluaproStore((state) => state.toggleStudentAbsence)
  const currentSlot = getAbsenceTimeParts().slotKey
  const activeRecord = findAbsenceInSlot(absenceRecords, studentId, classId, currentSlot)
  const totalHours = getStudentAbsenceHours(absenceRecords, studentId, classId)
  const title = activeRecord
    ? `Absència registrada avui a les ${activeRecord.time}. Clica per desfer-la.`
    : `Registrar 1 hora d’absència ara${totalHours > 0 ? ` · Total: ${totalHours} h` : ''}`

  return (
    <button
      aria-label={title}
      aria-pressed={Boolean(activeRecord)}
      className={`absence-toggle ${activeRecord ? 'active' : ''}`}
      onClick={() => toggleStudentAbsence(studentId)}
      title={title}
      type="button"
    >
      A
    </button>
  )
}
