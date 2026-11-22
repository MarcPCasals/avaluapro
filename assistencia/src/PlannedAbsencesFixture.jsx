import { useState } from 'react'
import { PlannedAbsencesView } from '../../src/features/agenda/PlannedAbsencesView.jsx'
import '../../src/features/agenda/agenda.css'

const classItem = { id: 'class-01', name: 'Grup 01' }
const initialStudents = [
  { id: 'student-01', classId: 'class-01', name: 'Prova, Alumna', halfGroup: 'Grup A' },
  { id: 'student-02', classId: 'class-01', name: 'Exemple, Biel', halfGroup: 'Grup A' },
]
const session = {
  session: { id: 'session-01', classId: 'class-01', startsAt: '2026-11-24T09:00:00', status: 'planned', timetableSlotId: 'slot-01' },
  planningUnit: { transversalMaterials: [] },
  items: [{ id: 'item-01', title: 'Preparar un esquema', sourceActivity: {
    description: 'Llegeix el text i prepara un esquema breu.',
    studentMaterials: [{ kind: 'link', label: 'Text de prova', url: 'https://example.test/text' }],
  } }],
}

export function PlannedAbsencesFixture() {
  const [students, setStudents] = useState(initialStudents)
  const updateStudent = async (studentId, patch) => setStudents((current) => current.map((student) =>
    student.id === studentId ? { ...student, ...patch } : student))
  return <main className="agenda-main"><PlannedAbsencesView classItem={classItem} students={students}
    calendarEvents={[]} loadSessionRange={async () => [session]}
    slotsByTimetableId={{}} timetables={[]} updateStudent={updateStudent} today="2026-11-23" /></main>
}
