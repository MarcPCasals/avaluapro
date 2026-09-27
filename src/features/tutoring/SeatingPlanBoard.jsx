export function SeatingPlanBoard({
  columns = 5,
  onSelectSeat,
  seats = [],
  selectedStudentId = '',
}) {
  return (
    <section className="safe-seating-classroom" data-seating-plan-board>
      <header className="safe-seating-front">
        <span>Pissarra</span>
        <strong>Taula docent</strong>
      </header>
      <div
        className="safe-seating-grid"
        style={{ '--safe-seating-columns': columns }}
      >
        {seats.map((seat) => {
          const selected = seat.student?.id === selectedStudentId
          return (
            <button
              aria-pressed={selected}
              className={`${seat.student ? 'occupied' : 'empty'} ${selected ? 'selected' : ''}`}
              data-seating-student={seat.student?.id || ''}
              key={seat.id}
              onClick={() => onSelectSeat?.(seat)}
              type="button"
            >
              <small>Fila {seat.row} · taula {seat.column}</small>
              {seat.student ? (
                <>
                  <strong>{seat.student.name}</strong>
                  <span>{seat.category}</span>
                  <em>{seat.student.halfGroup}</em>
                </>
              ) : (
                <strong>Taula lliure</strong>
              )}
            </button>
          )
        })}
      </div>
      <footer className="safe-seating-legend">
        <span><i className="group-a">A</i> Grup A fictici</span>
        <span><i className="group-b">B</i> Grup B fictici</span>
        <span>Totes les posicions són simulades</span>
      </footer>
    </section>
  )
}
