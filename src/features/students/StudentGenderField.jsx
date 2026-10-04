import './StudentGenderField.css'
export function StudentGenderField({ student, onChange }) {
  return <label className="student-gender-field">Noi / noia
    <select aria-label={`Noi / noia de ${student.name || student.displayName}`} value={student.gender || ''} onChange={(event) => onChange(event.target.value)}>
      <option value="">Sense informar</option>
      <option value="boy">Noi</option>
      <option value="girl">Noia</option>
      <option value="other">Una altra identitat</option>
    </select>
    <small>Dada opcional per equilibrar grups i interpretar el sociograma.</small>
  </label>
}
