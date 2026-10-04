import './StudentGenderField.css'
export function StudentGenderField({ student, onChange, compact = false }) {
  const options = <>
    <option value="">Sense informar</option>
    <option value="boy">Noi</option>
    <option value="girl">Noia</option>
    <option value="other">Una altra identitat</option>
  </>
  const label = `Noi / noia de ${student.name || student.displayName}`
  if (compact) {
    const symbols = { boy: '♂', girl: '♀', other: '⚧' }
    const descriptions = { boy: 'Noi', girl: 'Noia', other: 'Una altra identitat' }
    return <span className="student-gender-compact" title={`${label}: ${descriptions[student.gender] || 'Sense informar'}`}>
      <span aria-hidden="true">{symbols[student.gender] || '—'}</span>
      <select aria-label={label} value={student.gender || ''} onChange={(event) => onChange(event.target.value)}>{options}</select>
    </span>
  }
  return <label className="student-gender-field">Noi / noia
    <select aria-label={label} value={student.gender || ''} onChange={(event) => onChange(event.target.value)}>{options}</select>
    <small>Dada opcional per equilibrar grups i interpretar el sociograma.</small>
  </label>
}
