import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'

export function AgendaSessionActivityPicker({ choices, freeMinutes, busy, onAdd, onClose }) {
  const [source, setSource] = useState('planning')
  const [fixed, setFixed] = useState(false)
  const [customText, setCustomText] = useState('')
  const custom = source === 'custom'
  const [activityId, setActivityId] = useState('')
  const [minutes, setMinutes] = useState('')
  const [error, setError] = useState('')
  const activity = choices.find((choice) => choice.id === activityId)
  const pendingChoices = choices.filter(choice => !choice.completed)
  const visibleChoices = source === 'outside' ? pendingChoices.filter(choice => choice.available && (choice.remainingMinutes > 0 || !Number(choice.plannedMinutes) && !choice.isScheduled)) : pendingChoices
  const timed = custom || Number(activity?.plannedMinutes) > 0
  const maxMinutes = custom ? freeMinutes : Math.min(freeMinutes, activity?.availableMinutes || 0)
  const selectActivity = (id) => {
    const selected = choices.find((choice) => choice.id === id)
    setActivityId(id)
    setMinutes(selected?.availableMinutes ? Math.min(freeMinutes, selected.availableMinutes) || '' : '')
    setError('')
  }
  const submit = async (event) => {
    event.preventDefault()
    setError('')
    try { await onAdd(custom ? { title: customText, fixedToSession: fixed } : activityId, timed ? Number(minutes) : null) }
    catch (failure) { setError(failure.message || 'No s’ha pogut afegir l’activitat.') }
  }
  return <form className="agenda-session-item-editor agenda-session-activity-picker" onSubmit={submit}>
    <label>Mostrar activitats<select name="activitySource" disabled={busy} value={source} onChange={(event) => { setSource(event.target.value); selectActivity(''); if (event.target.value === 'custom') setMinutes(freeMinutes || '') }}>
      <option value="outside">Fora del calendari ({pendingChoices.filter(choice => choice.available && (choice.remainingMinutes > 0 || !Number(choice.plannedMinutes) && !choice.isScheduled)).length})</option>
      <option value="planning">Pendents de fer d’aquesta UP</option>
      <option value="custom">Activitat pròpia · només en aquesta sessió</option>
    </select></label>
    {custom ? <label>Què faràs a classe?<textarea autoFocus name="customActivityText" required disabled={busy} value={customText} onChange={(event) => setCustomText(event.target.value)} /></label> : <label>Activitat<select autoFocus name="activityId" required disabled={busy} value={activityId} onChange={(event) => selectActivity(event.target.value)}>
      <option value="">Tria una activitat</option>
      {visibleChoices.map((choice) => <option key={choice.id} value={choice.id} disabled={!choice.available}>{choice.code} · {choice.title} · {choice.calendarLabel}</option>)}
    </select></label>}
    {!custom && !visibleChoices.length && <p>Totes les activitats d’aquesta UP ja estan fetes amb aquest grup.</p>}
    {custom && <label><input type="checkbox" checked={fixed} disabled={busy} onChange={(event) => setFixed(event.target.checked)} />Fixar al dia i l’hora d’aquesta sessió</label>}
    {(custom || activity) && timed && <label>Minuts en aquesta sessió<input name="plannedMinutes" type="number" min="1" max={maxMinutes} required disabled={busy} value={minutes} onChange={(event) => setMinutes(event.target.value)} /><small>{custom ? freeMinutes : activity.availableMinutes} min disponibles · {freeMinutes} min lliures en aquesta sessió.</small></label>}
    {!custom && activity && !timed && <p>Aquest element s’afegirà sense ocupar minuts.</p>}
    {(custom || activity) && timed && freeMinutes === 0 && <p>La sessió és plena. Treu una activitat o ajusta’n el temps abans d’afegir-ne una altra.</p>}
    {custom ? <p>Si la fixes, els reajustaments no la traslladaran. No modifica la Programació.</p> : <p>Les activitats retirades continuen disponibles aquí. Pots afegir només una part dels minuts pendents. Si ja estan programades en una altra sessió, es traslladen sense duplicar-les. La programació original es conserva.</p>}
    <div><button className="primary-action compact" disabled={busy || (custom ? !customText.trim() : !activity?.available) || (timed && (!Number.isFinite(Number(minutes)) || Number(minutes) <= 0 || Number(minutes) > maxMinutes))} type="submit">{busy ? <Loader2 className="spin" size={15} /> : <Plus size={15} />}Afegir a la sessió</button><button className="secondary-action compact" disabled={busy} onClick={onClose} type="button">Cancel·lar</button></div>
    {error && <p role="alert">{error}</p>}
  </form>
}
