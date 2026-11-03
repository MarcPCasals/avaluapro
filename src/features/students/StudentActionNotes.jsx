import '../evaluation/ActionDialogs.css'

export function StudentActionNotes({ notes = [] }) {
  return (
        <details className="action-note-history student-action-notes">
          <summary>Notes i orientacions d’accions ({notes.length})</summary>
          {notes.length === 0 ? <p>Encara no hi ha comentaris d’accions.</p> :
            ['Orientacions i mesures educatives', 'Justificacions'].map((label, index) => {
              const groupNotes = notes.filter(note => Boolean(note.orientation) === (index === 0))
              return groupNotes.length > 0 && <section key={label}>
                <h3>{label}</h3>
                {groupNotes.map(note => <article className="student-action-note" key={`${note.criterionId}:${note.actionId}`}>
                  <strong>{!note.actionId.startsWith('text:') && `${note.actionId} · `}{note.description}</strong>
                  <small>{[note.className, note.utName, note.competencyName, note.criterionName].filter(Boolean).join(' · ')}</small>
                  <p>{note.text}</p>
                </article>)}
              </section>
            })}
        </details>
  )
}
