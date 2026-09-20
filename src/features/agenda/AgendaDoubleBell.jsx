import { Bell } from 'lucide-react'

export function AgendaDoubleBell({ size = 13 }) {
  return (
    <span aria-hidden="true" className="agenda-double-bell">
      <Bell size={size} />
      <Bell size={size} />
    </span>
  )
}
