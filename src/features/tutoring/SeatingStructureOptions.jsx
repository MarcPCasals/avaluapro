import './SeatingStructureOptions.css'

export function SeatingStructureOptions({ value, onChange }) {
  return <div className="seating-structure-options">
    <label>Files
      <select value={value.rows} onChange={event => onChange({ ...value, rows: Number(event.target.value) })}>
        {[2, 3, 4, 5, 6, 7].map(rows => <option key={rows} value={rows}>{rows} files</option>)}
      </select>
    </label>
    <label>Taula docent
      <select value={value.teacherDeskSide} onChange={event => onChange({ ...value, teacherDeskSide: event.target.value })}>
        <option value="left">Esquerra</option>
        <option value="center">Centre</option>
        <option value="right">Dreta</option>
      </select>
    </label>
  </div>
}
