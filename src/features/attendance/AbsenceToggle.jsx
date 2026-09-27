import { getAbsenceTimeParts, findAbsenceInSlot, getStudentAbsenceHours } from '../../lib/attendance'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'
import { AbsenceControl } from './AbsenceControl'

export function AbsenceToggle({ classId, studentId }) {
  const absenceRecords = useAvaluaproStore((state) => state.absenceRecords)
  const toggleStudentAbsence = useAvaluaproStore((state) => state.toggleStudentAbsence)
  const currentSlot = getAbsenceTimeParts().slotKey
  const activeRecord = findAbsenceInSlot(absenceRecords, studentId, classId, currentSlot)
  const totalHours = getStudentAbsenceHours(absenceRecords, studentId, classId)
  return (
    <AbsenceControl
      activeRecord={activeRecord}
      onToggle={() => toggleStudentAbsence(studentId)}
      totalHours={totalHours}
    />
  )
}
