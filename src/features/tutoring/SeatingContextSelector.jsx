import { useState } from 'react'
import { getSeatingRoomContext, getSeatingRoomGroupOptions, getSeatingStudents } from './seatingContext.js'
import './SeatingContextSelector.css'

export function SeatingContextSelector({ context, rooms, students, onChange, onAddRoom, disabled = false }) {
  const [creatingRoom, setCreatingRoom] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [roomHalfGroup, setRoomHalfGroup] = useState(context.halfGroup === 'B' ? 'B' : 'A')
  const count = getSeatingStudents(students, context).length
  const selectedRoom = rooms.find(room => room.roomId === context.roomId)
  const groupOptions = getSeatingRoomGroupOptions(selectedRoom, context)
  const labels = { all: 'Tot el grup', A: 'Mig grup A', B: 'Mig grup B' }
  return <section className="seating-context-selector" aria-label="Aula i alumnat de la disposició">
    <label>Aula
      <select value={context.roomId} disabled={disabled} onChange={event => {
        const room = rooms.find(item => item.roomId === event.target.value)
        if (room) onChange(getSeatingRoomContext(room))
      }}>
        {rooms.map(room => <option key={room.roomId} value={room.roomId}>{room.roomName}{room.halfGroup && room.halfGroup !== 'all' ? ` · ${labels[room.halfGroup]}` : ''}</option>)}
      </select>
    </label>
    <button type="button" onClick={() => { setCreatingRoom(true); setRoomHalfGroup(context.halfGroup === 'B' ? 'B' : 'A') }} disabled={disabled}>Afegir aula</button>
    <label>Alumnat
      <select value={context.halfGroup} disabled={disabled} onChange={event => onChange({ ...context, halfGroup: event.target.value })}>
        {groupOptions.map(group => <option key={group} value={group}>{labels[group]}</option>)}
      </select>
    </label>
    <p role="status">{count} alumnes · Proposta amb les dades i les relacions de tutoria.
      {context.halfGroup !== 'all' && count === 0 && ' Assigna primer els alumnes a aquest mig grup a la gestió de mitjos grups.'}
    </p>
    {creatingRoom && <form className="seating-create-room" onSubmit={event => {
      event.preventDefault()
      if (!roomName.trim()) return
      onAddRoom({ roomName: roomName.trim(), halfGroup: roomHalfGroup })
      setCreatingRoom(false)
      setRoomName('')
    }}>
      <label>Nom de la nova aula<input required value={roomName} onChange={event => setRoomName(event.target.value)} placeholder="Per exemple, Laboratori" /></label>
      <label>Alumnat d’aquesta aula<select value={roomHalfGroup} onChange={event => setRoomHalfGroup(event.target.value)}>
        <option value="A">Mig grup A</option><option value="B">Mig grup B</option><option value="all">Tot el grup</option>
      </select></label>
      <button type="submit" disabled={disabled || !roomName.trim()}>Crear aula</button>
      <button type="button" onClick={() => setCreatingRoom(false)}>Cancel·lar</button>
    </form>}
  </section>
}
