import { getSeatingStudents } from './seatingContext.js'
import './SeatingContextSelector.css'

export function SeatingContextSelector({ context, rooms, students, onChange, onAddRoom, disabled = false }) {
  const count = getSeatingStudents(students, context).length
  return <section className="seating-context-selector" aria-label="Aula i alumnat de la disposició">
    <label>Aula
      <select value={context.roomId} disabled={disabled} onChange={event => {
        const room = rooms.find(item => item.roomId === event.target.value)
        if (room) onChange({ ...context, ...room, halfGroup: context.halfGroup })
      }}>
        {rooms.map(room => <option key={room.roomId} value={room.roomId}>{room.roomName}</option>)}
      </select>
    </label>
    <button type="button" onClick={onAddRoom} disabled={disabled}>Afegir aula</button>
    <label>Alumnat
      <select value={context.halfGroup} disabled={disabled} onChange={event => onChange({ ...context, halfGroup: event.target.value })}>
        <option value="all">Tot el grup</option>
        <option value="A">Mig grup A</option>
        <option value="B">Mig grup B</option>
      </select>
    </label>
    <p role="status">{count} alumnes · Proposta amb les dades i les relacions de tutoria.
      {context.halfGroup !== 'all' && count === 0 && ' Assigna primer els alumnes a aquest mig grup a la gestió de mitjos grups.'}
    </p>
  </section>
}
