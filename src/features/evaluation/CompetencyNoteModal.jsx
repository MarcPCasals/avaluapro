import { useState } from 'react'
import { Modal } from '../../components/Modal'

export function CompetencyNoteModal({ student, competency, initialText = '', onClose, onSave }) {
  const [text, setText] = useState(initialText)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onSave(text)
      onClose()
    } catch (saveError) {
      setError(saveError.message || 'No s’ha pogut desar la nota.')
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose} title={`Nota de ${competency.name} · ${student.name}`}>
      <form className="competency-note-form" onSubmit={handleSave}>
        <p>Es conservarà per a aquest alumne i aquesta competència en les properes UT del grup.</p>
        <label htmlFor="competency-note-text">Què vols recordar per a la propera avaluació?</label>
        <textarea
          autoFocus
          id="competency-note-text"
          maxLength={2000}
          onChange={(event) => setText(event.target.value)}
          rows={6}
          value={text}
        />
        {error && <p role="alert">{error}</p>}
        <div className="modal-actions">
          <button className="secondary-action" disabled={busy} onClick={onClose} type="button">Cancel·lar</button>
          <button className="primary-action" disabled={busy} type="submit">{busy ? 'Desant…' : 'Desar nota'}</button>
        </div>
      </form>
    </Modal>
  )
}
