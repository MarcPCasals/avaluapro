import { normalizeSeatingContext } from './seatingContext.js'
import './SeatingPlanViewer.css'

// Student-facing map: names and seat positions only.
export function SeatingPlanViewer({ plan, students = [] }) {
  if (!plan) return <p>No hi ha cap disposició activa per a aquest grup. Guarda-la i marca-la com a activa a Tutoria → Disposició d’aula.</p>
  const context = normalizeSeatingContext(plan.layout?.seatingContext)
  const layout = plan.layout || {}
  const columns = layout.blocks?.reduce((total, size) => total + Number(size), 0) || Number(layout.columns) || 9
  const rows = Number(layout.rows) || 5
  const names = new Map(students.map(student => [student.id, student.name || student.displayName]))
  const bySeat = new Map((plan.seats || []).map(seat => [
    `${seat.x ?? Number(seat.block || 0) * 3 + Number(seat.place || 0)}:${seat.y ?? seat.row ?? 0}`, names.get(seat.studentId),
  ]))
  const active = Array.isArray(layout.activeSeatIds) && layout.activeSeatIds.length > 0 ? new Set(layout.activeSeatIds) : null
  return <section className="seating-plan-viewer" aria-label="Disposició d’aula activa">
    <p>{context.roomName} · {context.halfGroup === 'all' ? 'Tot el grup' : `Mig grup ${context.halfGroup}`} · {plan.title}</p>
    <div className="seating-viewer-front">Pissarra · Davant de l’aula</div>
    <p style={{ textAlign: ['left', 'center', 'right'].includes(layout.teacherDeskSide) ? layout.teacherDeskSide : 'left' }}>Taula docent</p>
    <div className="seating-viewer-scroll"><div className="seating-viewer-grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(85px, 1fr))` }}>
      {Array.from({ length: rows * columns }, (_, index) => {
        const x = index % columns, y = Math.floor(index / columns)
        const name = bySeat.get(`${x}:${y}`)
        const enabled = !active || active.has(`seat_${x}_${y}`)
        return <div key={`${x}:${y}`} className={enabled ? 'seating-viewer-seat' : 'seating-viewer-gap'}>{enabled && (name || 'Lliure')}</div>
      })}
    </div></div>
  </section>
}
