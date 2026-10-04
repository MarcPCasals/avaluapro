import { StudentGenderField } from './StudentGenderField.jsx'
import './StudentGroupGenderControls.css'

export function StudentGroupGenderControls({ student, halfGroups, onChange }) {
  return <div className="student-group-gender-controls">
    <select className="student-compact-group" aria-label={`Mig grup de ${student.name}`} title={student.halfGroup || 'Sense mig grup'} value={student.halfGroup || ''} onChange={(event) => onChange({ halfGroup: event.target.value })}>
      <option value="">—</option>
      {halfGroups.map((group) => <option key={group} value={group}>{/^Grup [AB]$/.test(group) ? group.slice(-1) : group}</option>)}
    </select>
    <StudentGenderField compact student={student} onChange={(gender) => onChange({ gender })} />
  </div>
}
