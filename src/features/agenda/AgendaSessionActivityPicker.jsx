import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'

export function AgendaSessionActivityPicker({ choices, freeMinutes, busy, onAdd, onClose }) {
  const [source, setSource] = useState('outside')
  const [activityId, setActivityId] = useState('')
  const [minutes, setMinutes] = useState('')
  const [error, setError] = useState('')
  const activity = choices.find((choice) => choice.id === activityId)
  const visibleChoices = source === 'outside' ? choices.filter((choice) => choice.available) : choices
  const timed = Number(activity?.plannedMinutes) > 0
  const maxMinutes = Math.min(freeMinutes, activity?.remainingMinutes || 0)
  const selectActivity = (id) => {
    const selected = choices.find((choice) => choice.id === id)
    setActivityId(id)
    setMinutes(selected?.remainingMinutes ? Math.min(freeMinutes, selected.remainingMinutes) || '' : '')
    setError('')
  }
  const submit = async (event) => {
    event.preventDefault()
    setError('')
    try { await onAdd(activityId, timed ? Number(minutes) : null) }
    catch (failure) { setError(failure.message || 'No s’ha pogut afegir l’activitat.') }
  }
  return <form className="agenda-session-item-editor agenda-session-activity-picker" onSubmit={submit}>
    <label>Mostrar activitats<select name="activitySource" disabled={busy} value={source} onChange={(event) => { setSource(event.target.value); selectActivity('') }}>
      <option value="outside">Fora del calendari ({choices.filter((choice) => choice.available).length})</option>
      <option value="planning">Tota la programació d’aquesta UP</option>
    </select></label>
    <label>Activitat<select autoFocus name="activityId" required disabled={busy} value={activityId} onChange={(event) => selectActivity(event.target.value)}>
      <option value="">Tria una activitat</option>
      {visibleChoices.map((choice) => <option key={choice.id} value={choice.id} disabled={!choice.available}>{choice.code} · {choice.title} · {choice.calendarLabel}</option>)}
    </select></label>
    {!visibleChoices.length && <p>Totes les activitats d’aquesta UP ja estan fetes o calendaritzades amb aquest grup.</p>}
    {activity && timed && <label>Minuts en aquesta sessió<input name="plannedMinutes" type="number" min="1" max={maxMinutes} required disabled={busy} value={minutes} onChange={(event) => setMinutes(event.target.value)} /><small>{activity.remainingMinutes} min fora del calendari · {freeMinutes} min lliures en aquesta sessió.</small></label>}
    {activity && !timed && <p>Aquest element s’afegirà sense ocupar minuts.</p>}
    {activity && timed && freeMinutes === 0 && <p>La sessió és plena. Treu una activitat o ajusta’n el temps abans d’afegir-ne una altra.</p>}
    <p>Les activitats retirades continuen disponibles aquí. Pots afegir només una part dels minuts pendents. La programació original es conserva.</p>
    <div><button className="primary-action compact" disabled={busy || !activity?.available || (timed && (!Number.isFinite(Number(minutes)) || Number(minutes) <= 0 || Number(minutes) > maxMinutes))} type="submit">{busy ? <Loader2 className="spin" size={15} /> : <Plus size={15} />}Afegir a la sessió</button><button className="secondary-action compact" disabled={busy} onClick={onClose} type="button">Cancel·lar</button></div>
    {error && <p role="alert">{error}</p>}
  </form>
}
