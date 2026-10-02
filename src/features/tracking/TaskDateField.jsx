import './TaskDateField.css'
import { formatTaskSession, getTaskSessionKey, selectTaskSession } from './taskSessionChoices.js'

export function TaskDateField({ date, disabled = false, label = 'Data', loading = false, error = false, sessions = [], sessionKey = '', onChangeDate, onSelectSession }) {
  return <div className="task-session-date-field">
    <label className="field-label">Sessió de classe
      <select aria-label={`Sessió de classe · ${label}`} disabled={disabled || loading || sessions.length === 0} value={sessionKey} onChange={(event) => onSelectSession(selectTaskSession(sessions, event.target.value))}>
        <option value="">Selecciona una sessió o indica una data</option>
        {sessions.map((session) => <option key={getTaskSessionKey(session)} value={getTaskSessionKey(session)}>{formatTaskSession(session)}</option>)}
      </select>
    </label>
    {loading ? <small role="status">Consultant les sessions de l’horari…</small> : error ? <small role="status">No s’han pogut carregar les sessions. Pots indicar la data manualment.</small> : !sessions.length && <small>No hi ha sessions disponibles a l’horari per a aquesta classe.</small>}
    <label className="field-label">Data
      <input aria-label={`Data · ${label}`} disabled={disabled} onChange={(event) => onChangeDate(event.target.value)} type="date" value={date} />
    </label>
  </div>
}
