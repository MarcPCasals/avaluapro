export function TutorialProfileList({ emptyText, onSelectProfile, rows, selectedStudentId = '' }) {
  if (rows.length === 0) {
    return <div className="empty-state compact">{emptyText}</div>
  }

  return (
    <div className="tutorial-student-profile-list">
      {rows.map((row) => (
        <button
          aria-pressed={row.student.id === selectedStudentId}
          className={`tutorial-student-profile-row ${row.priority > 0 ? 'risk' : ''} ${
            row.student.id === selectedStudentId ? 'selected' : ''
          }`}
          data-tutorial-student-row={row.student.id}
          key={row.student.id}
          onClick={() => onSelectProfile(row)}
          type="button"
        >
          <div>
            <strong>{row.student.name}</strong>
            <small>
              {row.notDevelopedCount} no assolides · {row.trackingCount} registres · {row.academicSourceLabel}
            </small>
          </div>
          <span className="tutorial-report-row-status">{row.reportStatus}</span>
          <em>Preparar</em>
        </button>
      ))}
    </div>
  )
}
