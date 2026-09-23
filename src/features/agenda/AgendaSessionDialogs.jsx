import { useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowRight, CalendarX2, CheckCircle2, Clock3, Edit3, Loader2,
  RotateCcw, Trash2, X,
} from 'lucide-react'
import { Modal } from '../../components/Modal'
import { moveHorizontalTabFocus } from '../../lib/tabs'
import { AgendaSessionDetail } from './AgendaSessionViews'

const CHANGE_SCOPES = [
  ['groupOnly', 'Només aquest grup', 'La UP base i els altres grups no canvien.'],
  ['baseAndGroup', 'UP base i aquest grup', 'El canvi passa a la programació ideal i queda aplicat aquí.'],
  ['groupAndProposal', 'Aquest grup i proposta', 'Aquí s’aplica ara i queda una proposta pendent per a la UP.'],
]

function dateLabel(startsAt) {
  return new Intl.DateTimeFormat('ca-AD', { day: 'numeric', month: 'short', weekday: 'short' })
    .format(new Date(`${String(startsAt).slice(0, 10)}T12:00:00`))
}

export function AgendaSessionDetailDialog({ bundle, calendarEvents, classes, onAdjust, onClose, onOpenClassroom }) {
  return (
    <Modal onClose={onClose} panelClassName="agenda-dialog agenda-session-dialog" size="lg" title="Detall de la sessió">
      <AgendaSessionDetail bundle={bundle} calendarEvents={calendarEvents} classes={classes} onAdjust={() => { onClose(); onAdjust(bundle) }} onOpenClassroom={() => { onClose(); onOpenClassroom(bundle) }} />
    </Modal>
  )
}

export function AgendaSessionAdjustDialog({
  bundle,
  initialAction = 'session',
  initialItemId = '',
  onBuildContinuation,
  onClose,
  onConfirmContinuation,
  onRemoveItem,
  onSaveItem,
  onSaved,
  onStatus,
}) {
  const editableItems = useMemo(() => bundle.items.filter((item) => item.sourceActivityId), [bundle.items])
  const [action, setAction] = useState(initialAction)
  const [itemId, setItemId] = useState(initialItemId || editableItems[0]?.id || '')
  const item = editableItems.find((candidate) => candidate.id === itemId) || editableItems[0] || null
  const [title, setTitle] = useState(item?.title || '')
  const [plannedMinutes, setPlannedMinutes] = useState(item?.plannedMinutes || '')
  const [scope, setScope] = useState('groupOnly')
  const [continuationMinutes, setContinuationMinutes] = useState(item?.plannedMinutes || 15)
  const [continuationPreview, setContinuationPreview] = useState(null)
  const [confirmRemoval, setConfirmRemoval] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const itemHasResult = Boolean(item && (bundle.results || []).some((result) => result.sessionItemId === item.id))
  const canRemoveItem = bundle.session.status === 'planned'
    && !bundle.session.classroomOpenedAt
    && !bundle.session.attendanceConfirmedAt
    && !bundle.session.classroomClosedAt
    && !itemHasResult

  const selectItem = (nextId) => {
    const nextItem = editableItems.find((candidate) => candidate.id === nextId)
    setItemId(nextId)
    setTitle(nextItem?.title || '')
    setPlannedMinutes(nextItem?.plannedMinutes || '')
    setContinuationMinutes(nextItem?.plannedMinutes || 15)
    setContinuationPreview(null)
    setConfirmRemoval(false)
  }

  const execute = async (operation, successMessage) => {
    setBusy(true)
    setError('')
    try {
      await operation()
      onSaved(successMessage)
      onClose()
    } catch (operationError) {
      setError(operationError.message || 'No s’ha pogut aplicar el canvi.')
    } finally {
      setBusy(false)
    }
  }

  const previewContinuation = async () => {
    setBusy(true)
    setError('')
    try {
      setContinuationPreview(await onBuildContinuation(bundle, item, Number(continuationMinutes)))
    } catch (previewError) {
      setError(previewError.message || 'No s’ha pogut preparar la continuació.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal onClose={onClose} panelClassName="agenda-dialog agenda-adjust-dialog" size="lg" title="Reajustar la sessió">
      <nav aria-label="Tipus de reajustament" className="agenda-adjust-tabs" role="tablist">
        <button aria-selected={action === 'session'} className={action === 'session' ? 'active' : ''} onClick={() => setAction('session')} onKeyDown={moveHorizontalTabFocus} role="tab" tabIndex={action === 'session' ? 0 : -1} type="button"><CalendarX2 size={15} />Sessió</button>
        <button aria-selected={action === 'activity'} className={action === 'activity' ? 'active' : ''} disabled={editableItems.length === 0} onClick={() => setAction('activity')} onKeyDown={moveHorizontalTabFocus} role="tab" tabIndex={action === 'activity' ? 0 : -1} type="button"><Edit3 size={15} />Activitat</button>
        <button aria-selected={action === 'continuation'} className={action === 'continuation' ? 'active' : ''} disabled={editableItems.length === 0} onClick={() => setAction('continuation')} onKeyDown={moveHorizontalTabFocus} role="tab" tabIndex={action === 'continuation' ? 0 : -1} type="button"><ArrowRight size={15} />Continuació</button>
      </nav>

      {action === 'session' && <section className="agenda-adjust-panel" role="tabpanel">
        <div className="agenda-adjust-heading"><CalendarX2 size={21} /><div><strong>{bundle.session.status === 'cancelled' ? 'Restaurar aquesta sessió' : 'Anul·lar aquesta sessió'}</strong><p>{dateLabel(bundle.session.startsAt)} · {String(bundle.session.startsAt).slice(11, 16)} · {bundle.planningUnit.code}</p></div></div>
        {bundle.session.status === 'cancelled' ? <div className="agenda-adjust-preview ready"><CheckCircle2 size={18} /><div><strong>Tornarà a comptar dins la planificació</strong><p>Les activitats deixaran de constar com a pendents quan tornis a obrir la calendarització.</p></div></div> : <div className="agenda-adjust-preview warning"><AlertTriangle size={18} /><div><strong>{bundle.items.length} activitats o fragments tornaran a quedar pendents</strong><p>La sessió es conservarà a la cronologia com a anul·lada. Després podràs redistribuir només els minuts que han quedat sense fer.</p></div></div>}
        <button className={bundle.session.status === 'cancelled' ? 'primary-action' : 'danger-action'} disabled={busy} onClick={() => execute(() => onStatus(bundle.session.status === 'cancelled' ? 'planned' : 'cancelled'), bundle.session.status === 'cancelled' ? 'Sessió restaurada.' : 'Sessió anul·lada; les activitats han tornat a quedar pendents.')} type="button">{busy ? <Loader2 className="spin" size={16} /> : bundle.session.status === 'cancelled' ? <RotateCcw size={16} /> : <CalendarX2 size={16} />}{bundle.session.status === 'cancelled' ? 'Restaurar sessió' : 'Confirmar anul·lació'}</button>
      </section>}

      {action === 'activity' && item && <section className="agenda-adjust-panel" role="tabpanel">
        <label>Activitat<select value={item.id} onChange={(event) => selectItem(event.target.value)}>{editableItems.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title}{candidate.plannedMinutes ? ` · ${candidate.plannedMinutes} min` : ''}{candidate.segmentCount > 1 ? ` · part ${candidate.segmentIndex}/${candidate.segmentCount}` : ''}</option>)}</select></label>
        <label>Títol<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label>Minuts previstos<input min="1" type="number" value={plannedMinutes} onChange={(event) => setPlannedMinutes(event.target.value)} /></label>
        <fieldset className="agenda-change-scopes"><legend>On vols aplicar el canvi?</legend>{CHANGE_SCOPES.map(([value, label, detail]) => <label className={scope === value ? 'selected' : ''} key={value}><input checked={scope === value} name="change-scope" onChange={() => setScope(value)} type="radio" /><span><strong>{label}</strong><small>{detail}</small></span></label>)}</fieldset>
        <div className="agenda-adjust-preview"><Edit3 size={18} /><div><strong>Previsualització</strong><p>«{item.title}» passarà a «{title}»{plannedMinutes ? ` amb ${plannedMinutes} minuts` : ' sense temps definit'} segons l’abast seleccionat.</p></div></div>
        <button className="primary-action" disabled={busy || !title.trim()} onClick={() => execute(() => onSaveItem(item, { plannedMinutes: plannedMinutes ? Number(plannedMinutes) : null, title: title.trim() }, scope), 'Canvi aplicat amb l’abast seleccionat.')} type="button">{busy && <Loader2 className="spin" size={16} />}Aplicar canvi</button>
        <div className="agenda-remove-session-item">
          {!confirmRemoval ? <>
            <div><strong>Treure aquest fragment de la sessió</strong><p>L’activitat original de la UP i les altres parts programades es conservaran.</p></div>
            <button className="danger-action compact" disabled={busy || !canRemoveItem} onClick={() => setConfirmRemoval(true)} type="button"><Trash2 size={15} />Treure de la sessió</button>
          </> : <>
            <div><strong>Vols treure «{item.title}»?</strong><p>S’eliminaran només {item.plannedMinutes ? `aquests ${item.plannedMinutes} minuts` : 'aquest element'} de la sessió del {dateLabel(bundle.session.startsAt)}.</p></div>
            <div className="agenda-remove-session-item-actions"><button className="secondary-action compact" disabled={busy} onClick={() => setConfirmRemoval(false)} type="button"><X size={14} />Cancel·lar</button><button className="danger-action compact" disabled={busy} onClick={() => execute(() => onRemoveItem(item), 'Fragment eliminat de la sessió.')} type="button">{busy ? <Loader2 className="spin" size={14} /> : <Trash2 size={14} />}Confirmar</button></div>
          </>}
          {!canRemoveItem && <small>Aquesta activitat ja té dades de classe i es conserva per no perdre l’historial.</small>}
        </div>
      </section>}

      {action === 'continuation' && item && <section className="agenda-adjust-panel" role="tabpanel">
        <label>Activitat<select value={item.id} onChange={(event) => selectItem(event.target.value)}>{editableItems.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}</select></label>
        <label>Minuts que cal continuar<input min="1" type="number" value={continuationMinutes} onChange={(event) => { setContinuationMinutes(event.target.value); setContinuationPreview(null) }} /></label>
        {!continuationPreview ? <div className="agenda-adjust-preview"><Clock3 size={18} /><div><strong>Primer revisarem on encaixa</strong><p>Agenda aprofitarà els minuts lliures de la següent sessió i només crearà una data nova si cal.</p></div></div> : <div className="agenda-continuation-preview"><header><CheckCircle2 size={17} /><strong>{continuationPreview.sessions.length} sessions afectades</strong></header>{continuationPreview.sessions.map((candidate) => <div key={candidate.session.id}><span>{dateLabel(candidate.session.startsAt)} · {String(candidate.session.startsAt).slice(11, 16)}</span><strong>{candidate.items.reduce((total, current) => total + (current.plannedMinutes || 0), 0)} min</strong><small>{candidate.isExisting ? 'Aprofita una sessió prevista' : 'Crea una sessió nova'}</small></div>)}</div>}
        {continuationPreview ? <button className="primary-action" disabled={busy} onClick={() => execute(() => onConfirmContinuation(continuationPreview), 'Continuació afegida a les pròximes sessions.')} type="button">{busy && <Loader2 className="spin" size={16} />}Confirmar continuació</button> : <button className="secondary-action" disabled={busy || Number(continuationMinutes) <= 0} onClick={previewContinuation} type="button">{busy ? <Loader2 className="spin" size={16} /> : <ArrowRight size={16} />}Previsualitzar continuació</button>}
      </section>}

      {error && <p className="agenda-inline-error" role="alert">{error}</p>}
      <div className="modal-actions"><button className="secondary-action" disabled={busy} onClick={onClose} type="button">Tancar</button></div>
    </Modal>
  )
}
