import { StickyNote } from 'lucide-react'
import { FormattedText } from '../../components/FormattedText'

export function SessionNotesNotice({ privateNotes = [], applicationNotes = [] }) {
  const ownIds = new Set(privateNotes.map((note) => note.id))
  const notes = [...privateNotes, ...applicationNotes.filter((note) => !ownIds.has(note.id))]
  if (!notes.length) return null
  return <aside className="classroom-session-notes" aria-label="Notes d’aquesta sessió"><strong><StickyNote size={18} />Notes d’aquesta sessió</strong>{notes.map((note) => <div key={note.id}><FormattedText as="p" text={note.text} /><small>{note.recordInPlanning || !ownIds.has(note.id) ? 'Registrada a l’aplicació a l’aula' : 'Recordatori personal'}</small></div>)}</aside>
}
