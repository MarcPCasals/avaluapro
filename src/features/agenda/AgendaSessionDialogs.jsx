import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowRight, CalendarX2, CheckCircle2, Clock3, Edit3, Loader2,
  History, RotateCcw,
} from 'lucide-react'
import { FormattedText } from '../../components/FormattedText'
import { BABELIUM_MINUTES, isBabeliumItem } from '../../domain/planning/babelium'
import { Modal } from '../../components/Modal'
import { ContextualTab } from '../../components/ContextualHelp'
import { moveHorizontalTabFocus } from '../../lib/tabs'
import { AgendaSessionDetail } from './AgendaSessionViews'

function dateLabel(startsAt) {
  return new Intl.DateTimeFormat('ca-AD', { day: 'numeric', month: 'short', weekday: 'short' })
    .format(new Date(`${String(startsAt).slice(0, 10)}T12:00:00`))
}

export function AgendaSessionDetailDialog({ bundle, calendarEvents, classes, onAdjust, onClose, onOpenClassroom, onRemoveItem, onSaveItem, onMoveItem, onResolveGap, onLoadActivities, onAddActivity }) {
  return (
    <Modal onClose={onClose} panelClassName="agenda-dialog agenda-session-dialog" size="lg" title="Detall de la sessió">
      <AgendaSessionDetail onMoveItem={onMoveItem} onLoadActivities={onLoadActivities} onAddActivity={onAddActivity} onSaveItem={onSaveItem} onRemoveItem={onRemoveItem} bundle={bundle} calendarEvents={calendarEvents} classes={classes} onAdjust={() => { onClose(); onAdjust(bundle) }} onOpenClassroom={() => { onClose(); onOpenClassroom(bundle) }} onResolveGap={async () => { if (await onResolveGap(bundle)) onClose() }} />
    </Modal>
  )
}

export function AgendaSessionAdjustDialog({
  bundle,
  initialAction = 'session',
  initialItemId = '',
  onBuildRecovery,
  onBuildReplacement,
  onLoadReplacementActivities,
  onBuildContinuation,
  onClose,
  onConfirmRecovery,
  onConfirmReplacement,
  onConfirmContinuation,
  onLoadRecoveryOptions,
  onSaved,
  onStatus,
}) {
  const editableItems = useMemo(() => bundle.items.filter((item) => item.sourceActivityId), [bundle.items])
  const [action, setAction] = useState(initialAction)
  const [replacementActivities, setReplacementActivities] = useState([])
  const [replacementActivitiesLoaded, setReplacementActivitiesLoaded] = useState(false)
  const [replacementActivitiesLoading, setReplacementActivitiesLoading] = useState(false)
  const [replacementSource, setReplacementSource] = useState('planning')
  const [replacementFixed, setReplacementFixed] = useState(false)
  const [replacementText, setReplacementText] = useState('')
  const customReplacement = replacementSource === 'custom'
  const [replacementActivityId, setReplacementActivityId] = useState('')
  const [replacementSearch, setReplacementSearch] = useState('')
  const selectedReplacementActivity = replacementActivities.find((activity) => activity.id === replacementActivityId)
  const matchingReplacementActivities = replacementActivities.filter((activity) =>
    `${activity.code} ${activity.title}`.toLocaleLowerCase('ca').includes(replacementSearch.trim().toLocaleLowerCase('ca')))

  const fixedMinutes = bundle.items.filter((item) => item.type === 'activity' && !item.sourceActivityId && !isBabeliumItem(item) && item.fixedToSession !== false)
    .reduce((total, item) => total + Number(item.plannedMinutes || 0), 0)
  const replacementCapacity = Math.max(0, bundle.session.durationMinutes - 5 - (bundle.session.babeliumEnabled ? BABELIUM_MINUTES : 0) - fixedMinutes)
  const [replacementMinutes, setReplacementMinutes] = useState(
    Math.max(1, replacementCapacity))
  const [disposition, setDisposition] = useState('postpone')
  const [replacementPreview, setReplacementPreview] = useState(null)

  const [itemId, setItemId] = useState(initialItemId || editableItems[0]?.id || '')
  const item = editableItems.find((candidate) => candidate.id === itemId) || editableItems[0] || null
  const [continuationMinutes, setContinuationMinutes] = useState(item?.plannedMinutes || 15)
  const [continuationPreview, setContinuationPreview] = useState(null)
  const [recoveryOptions, setRecoveryOptions] = useState([])
  const [recoveryItemId, setRecoveryItemId] = useState('')
  const [recoveryMinutes, setRecoveryMinutes] = useState(15)
  const [recoveryPreview, setRecoveryPreview] = useState(null)
  const [recoveryLoading, setRecoveryLoading] = useState(false)
  const [dialogOpenedAt] = useState(() => Date.now())
  const canReplace = bundle.session.status === 'planned'
    && new Date(bundle.session.startsAt).getTime() > dialogOpenedAt
    && !bundle.session.classroomOpenedAt && !bundle.session.attendanceConfirmedAt
    && !bundle.session.classroomClosedAt && !(bundle.results || []).length
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const movesFromFutureSession = canReplace
  const recoveryItem = recoveryOptions.find((candidate) => candidate.id === recoveryItemId)
    || recoveryOptions[0]
    || null

  const selectItem = (nextId) => {
    const nextItem = editableItems.find((candidate) => candidate.id === nextId)
    setItemId(nextId)
    setContinuationMinutes(nextItem?.plannedMinutes || 15)
    setContinuationPreview(null)
  }

  const execute = async (operation, successMessage) => {
    setBusy(true)
    setError('')
    try {
      await operation()
      onSaved(successMessage)
      onClose()
    } catch (operationError) {
      if (action === 'replacement') setReplacementPreview(null)
      setError(operationError.message || 'No s’ha pogut aplicar el canvi.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (action !== 'replacement' || replacementActivitiesLoaded) return undefined
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setReplacementActivitiesLoading(true)
      setError('')
    })
    Promise.resolve().then(() => onLoadReplacementActivities(bundle))
      .then((activities) => {
        if (cancelled) return
        setReplacementActivities(activities)
        setReplacementActivitiesLoaded(true)
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message || 'No s’han pogut carregar les activitats de la Programació.')
      })
      .finally(() => { if (!cancelled) setReplacementActivitiesLoading(false) })
    return () => { cancelled = true }
  }, [action, bundle, onLoadReplacementActivities, replacementActivitiesLoaded])
  const selectReplacementActivity = (id) => {
    setReplacementActivityId(id)
    setReplacementPreview(null)
    const activity = replacementActivities.find((candidate) => candidate.id === id)
    if (activity) setReplacementMinutes(Math.min(activity.availableMinutes,
      replacementCapacity))
  }

  const previewReplacement = async () => {
    setBusy(true)
    setError('')
    try {
      setReplacementPreview(await onBuildReplacement(bundle, {
        plannedMinutes: Number(replacementMinutes), disposition, replacementActivityId: customReplacement ? '' : replacementActivityId,
        title: customReplacement ? replacementText : selectedReplacementActivity?.title,
        fixedToSession: customReplacement && replacementFixed,
      }))
    } catch (previewError) {
      setError(previewError.message || 'No s’ha pogut preparar la substitució.')
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
  const selectRecoveryItem = (nextId) => {
    const nextItem = recoveryOptions.find((candidate) => candidate.id === nextId)
    setRecoveryItemId(nextId)
    setRecoveryMinutes(nextItem?.plannedMinutes || 15)
    setRecoveryPreview(null)
  }
  const openRecovery = async () => {
    setAction('recovery')
    if (recoveryOptions.length > 0 || recoveryLoading || !onLoadRecoveryOptions) return
    setRecoveryLoading(true)
    setError('')
    try {
      const options = await onLoadRecoveryOptions(bundle)
      setRecoveryOptions(options)
      const first = options[0]
      if (first) {
        setRecoveryItemId(first.id)
        setRecoveryMinutes(first.plannedMinutes || 15)
      }
    } catch (loadError) {
      setError(loadError.message || 'No s’han pogut carregar les activitats anteriors.')
    } finally {
      setRecoveryLoading(false)
    }
  }
  const previewRecovery = async () => {
    setBusy(true)
    setError('')
    try {
      setRecoveryPreview(await onBuildRecovery(bundle, recoveryItem, Number(recoveryMinutes)))
    } catch (previewError) {
      setError(previewError.message || 'No s’ha pogut preparar el reajustament.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal onClose={onClose} panelClassName="agenda-dialog agenda-adjust-dialog" size="lg" title="Reajustar la sessió">
      <nav aria-label="Tipus de reajustament" className="agenda-adjust-tabs" role="tablist">
        <ContextualTab aria-selected={action === 'session'} className={action === 'session' ? 'active' : ''} help="Anul·la o restaura tota la sessió. Les activitats no fetes es traslladen automàticament a les sessions següents." helpTitle="Reajustar la sessió" onClick={() => setAction('session')} onKeyDown={moveHorizontalTabFocus} role="tab" tabIndex={action === 'session' ? 0 : -1} type="button"><CalendarX2 size={15} />Sessió</ContextualTab>
        <ContextualTab aria-selected={action === 'replacement'} className={action === 'replacement' ? 'active' : ''} disabled={!canReplace || busy} help="Tria una activitat de la Programació per a aquesta sessió i decideix si ajornes o retires les activitats previstes." helpTitle="Substituir sessió" onClick={() => setAction('replacement')} onKeyDown={moveHorizontalTabFocus} role="tab" tabIndex={action === 'replacement' ? 0 : -1} type="button"><Edit3 size={15} />Substituir sessió</ContextualTab>
        <ContextualTab aria-selected={action === 'continuation'} className={action === 'continuation' ? 'active' : ''} disabled={editableItems.length === 0} help={movesFromFutureSession ? 'Trasllada minuts d’aquesta sessió futura a les següents i previsualitza tot l’efecte dominó abans de confirmar-lo.' : 'Afegeix el temps que no has pogut completar a les sessions següents i previsualitza l’efecte dominó.'} helpTitle="Continuar una activitat" onClick={() => setAction('continuation')} onKeyDown={moveHorizontalTabFocus} role="tab" tabIndex={action === 'continuation' ? 0 : -1} type="button"><ArrowRight size={15} />Continuació</ContextualTab>
        <ContextualTab aria-selected={action === 'recovery'} className={action === 'recovery' ? 'active' : ''} help="Recupera una activitat anterior del grup i reorganitza la part futura de l’Agenda sense canviar la programació base." helpTitle="Recuperar una activitat anterior" onClick={openRecovery} onKeyDown={moveHorizontalTabFocus} role="tab" tabIndex={action === 'recovery' ? 0 : -1} type="button"><History size={15} />Recuperar anterior</ContextualTab>
      </nav>

      {action === 'session' && <section className="agenda-adjust-panel" role="tabpanel">
        <div className="agenda-adjust-heading"><CalendarX2 size={21} /><div><strong>{bundle.session.status === 'cancelled' ? 'Restaurar aquesta sessió' : 'Anul·lar aquesta sessió'}</strong><p>{dateLabel(bundle.session.startsAt)} · {String(bundle.session.startsAt).slice(11, 16)} · {bundle.planningUnit.code}</p></div></div>
        {bundle.session.status === 'cancelled' ? <div className="agenda-adjust-preview ready"><CheckCircle2 size={18} /><div><strong>Tornarà a comptar dins la planificació</strong><p>Les activitats ja traslladades es conserven a les sessions següents.</p></div></div> : <div className="agenda-adjust-preview warning"><AlertTriangle size={18} /><div><strong>{bundle.items.length} activitats o fragments es traslladaran automàticament</strong><p>La sessió es conservarà a la cronologia com a anul·lada. Les activitats passaran a les pròximes sessions disponibles i desplaçaran les posteriors.</p></div></div>}
        <button className={bundle.session.status === 'cancelled' ? 'primary-action' : 'danger-action'} disabled={busy} onClick={() => execute(() => onStatus(bundle.session.status === 'cancelled' ? 'planned' : 'cancelled'), bundle.session.status === 'cancelled' ? 'Sessió restaurada.' : 'Sessió anul·lada; les activitats s’han traslladat automàticament.')} type="button">{busy ? <Loader2 className="spin" size={16} /> : bundle.session.status === 'cancelled' ? <RotateCcw size={16} /> : <CalendarX2 size={16} />}{busy ? 'Recalculant la cronologia…' : bundle.session.status === 'cancelled' ? 'Restaurar sessió' : 'Confirmar anul·lació'}</button>
      </section>}

      {action === 'replacement' && <section className="agenda-adjust-panel" role="tabpanel">
        <div className="agenda-adjust-heading"><Edit3 size={21} /><div><strong>Triar una activitat per a aquesta sessió</strong><p>{dateLabel(bundle.session.startsAt)} · {String(bundle.session.startsAt).slice(11, 16)}</p></div></div>
        <label>Tipus d’activitat<select disabled={busy} value={replacementSource} onChange={(event) => { setReplacementSource(event.target.value); setReplacementPreview(null) }}><option value="planning">Activitat de la Programació</option><option value="custom">Activitat pròpia · només en aquesta sessió</option></select></label>
        {customReplacement && <><label>Què faràs a classe?<textarea disabled={busy} value={replacementText} onChange={(event) => { setReplacementText(event.target.value); setReplacementPreview(null) }} /></label><label><input type="checkbox" checked={replacementFixed} disabled={busy} onChange={(event) => { setReplacementFixed(event.target.checked); setReplacementPreview(null) }} />Fixar al dia i l’hora d’aquesta sessió</label><p>Si la fixes, els reajustaments no la traslladaran. No modifica la Programació.</p></>}
        {!customReplacement && (replacementActivitiesLoading ? <p role="status"><Loader2 className="spin" size={16} /> Carregant les activitats de la Programació…</p> : <>
          <label>Cercar per codi o títol<input disabled={busy} placeholder="A13" value={replacementSearch} onChange={(event) => setReplacementSearch(event.target.value)} /></label>
          <label>Activitat de la Programació<select disabled={busy} value={replacementActivityId} onChange={(event) => selectReplacementActivity(event.target.value)}><option value="">Tria una activitat</option>{[...new Map([...(selectedReplacementActivity ? [selectedReplacementActivity] : []), ...matchingReplacementActivities].map((activity) => [activity.id, activity])).values()].map((activity) => <option disabled={activity.availableMinutes <= 0} key={activity.id} value={activity.id}>{activity.code} · {activity.title} · {activity.availableMinutes > 0 ? `${activity.availableMinutes} min disponibles` : 'Sense minuts pendents'}</option>)}</select></label>
          {matchingReplacementActivities.length === 0 && <p>No hi ha activitats que coincideixin amb aquesta cerca.</p>}
          {selectedReplacementActivity && <div className="agenda-adjust-preview"><CheckCircle2 size={18} /><div><strong>{selectedReplacementActivity.code} · {selectedReplacementActivity.title}</strong>{selectedReplacementActivity.description && <FormattedText as="p" text={selectedReplacementActivity.description} />}<p>Conserva els materials i el vincle amb l’activitat original. Si ja estava prevista més endavant, se’n traslladaran els minuts triats per evitar duplicar-la.</p>{Number(replacementMinutes) < selectedReplacementActivity.availableMinutes && <p>Només en faràs {replacementMinutes || '—'} minuts en aquesta sessió. La resta manté la seva previsió o queda pendent de calendaritzar.</p>}</div></div>}
        </>)}
        <label>Minuts previstos<input disabled={busy} min="1" max={Math.min(replacementCapacity, customReplacement ? Infinity : selectedReplacementActivity?.availableMinutes || 0)} type="number" value={replacementMinutes} onChange={(event) => { setReplacementMinutes(event.target.value); setReplacementPreview(null) }} /></label>
        {fixedMinutes > 0 && <p>Les activitats pròpies es mantenen fixades en aquesta sessió ({fixedMinutes} min). Queden {replacementCapacity} min per a la substitució.</p>}
        <label>Què fem amb les activitats previstes?<select disabled={busy} value={disposition} onChange={(event) => { setDisposition(event.target.value); setReplacementPreview(null) }}><option value="postpone">Ajornar-les a les classes següents</option><option value="remove">Retirar-les de la cronologia</option></select></label>
        <div className="agenda-adjust-preview"><ArrowRight size={18} /><div><strong>{disposition === 'postpone' ? 'El contingut passarà a les classes següents' : 'Les sessions següents conservaran la seva distribució'}</strong><p>{disposition === 'postpone' ? 'Les activitats d’aquesta sessió es traslladaran a la següent classe disponible i la resta es reajustarà en cadena.' : 'Es retirarà només el contingut previst d’aquesta sessió.'} L’ajornament reajusta les sessions de la mateixa UP. La Programació original es conserva. Si hi ha Babelium, es manté a la sessió.</p></div></div>
        {replacementPreview && <div className="agenda-continuation-preview"><header><CheckCircle2 size={17} /><strong>{replacementPreview.sessions.length} {replacementPreview.sessions.length === 1 ? 'sessió afectada' : 'sessions afectades'}</strong></header>{replacementPreview.sessions.map((candidate) => <div key={candidate.session.id}><span>{dateLabel(candidate.session.startsAt)} · {String(candidate.session.startsAt).slice(11, 16)}</span><strong>{candidate.items.map((current) => `${current.title} · ${current.plannedMinutes || 0} min`).join(' · ') || 'Sessió sense activitats previstes'}</strong><small>{candidate.isExisting ? 'Sessió reajustada' : 'Nova sessió necessària'}</small></div>)}{replacementPreview.removedSessions.length > 0 && <p>{replacementPreview.removedSessions.length} sessions buides es retiraran de la cronologia.</p>}</div>}
        {replacementPreview ? <button className="primary-action" disabled={busy || !canReplace} onClick={() => execute(() => onConfirmReplacement(replacementPreview), 'Sessió substituïda i cronologia actualitzada.')} type="button">{busy && <Loader2 className="spin" size={16} />}Confirmar substitució</button> : <button className="secondary-action" disabled={busy || (!customReplacement && replacementActivitiesLoading) || !canReplace || (customReplacement ? !replacementText.trim() : (!selectedReplacementActivity || selectedReplacementActivity.availableMinutes <= 0)) || !Number.isFinite(Number(replacementMinutes)) || Number(replacementMinutes) <= 0} onClick={previewReplacement} type="button">{busy ? <Loader2 className="spin" size={16} /> : <ArrowRight size={16} />}Previsualitzar canvi</button>}
      </section>}

      {action === 'continuation' && item && <section className="agenda-adjust-panel" role="tabpanel">
        <label>Activitat<select value={item.id} onChange={(event) => selectItem(event.target.value)}>{editableItems.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}</select></label>
        <label>{movesFromFutureSession ? 'Minuts que vols traslladar' : 'Minuts que cal continuar'}<input max={movesFromFutureSession ? item.plannedMinutes : undefined} min="1" type="number" value={continuationMinutes} onChange={(event) => { setContinuationMinutes(event.target.value); setContinuationPreview(null) }} /></label>
        {!continuationPreview ? <div className="agenda-adjust-preview"><Clock3 size={18} /><div><strong>Primer revisarem tot l’efecte dominó</strong><p>{movesFromFutureSession ? `Els minuts es retiraran de «${item.title}» en aquesta sessió i passaran a la següent. La resta d’activitats es desplaçarà en cadena sense augmentar-ne el temps total.` : 'Agenda afegirà el temps que no has pogut completar a la sessió següent i reajustarà tota la cadena posterior.'}</p></div></div> : <div className="agenda-continuation-preview"><header><CheckCircle2 size={17} /><strong>{continuationPreview.sessions.length} sessions afectades</strong></header>{continuationPreview.sessions.map((candidate) => <div key={candidate.session.id}><span>{dateLabel(candidate.session.startsAt)} · {String(candidate.session.startsAt).slice(11, 16)}</span><strong>{candidate.items.map((current) => `${current.title} · ${current.plannedMinutes || 0} min`).join(' · ')}</strong><small>{candidate.isExisting ? 'Sessió reajustada' : 'Nova sessió necessària per completar l’efecte dominó'}</small></div>)}</div>}
        {continuationPreview ? <button className="primary-action" disabled={busy} onClick={() => execute(() => onConfirmContinuation(continuationPreview), movesFromFutureSession ? 'Minuts traslladats i cronologia futura reajustada.' : 'Continuació afegida a les pròximes sessions.')} type="button">{busy && <Loader2 className="spin" size={16} />}Confirmar continuació</button> : <button className="secondary-action" disabled={busy || Number(continuationMinutes) <= 0 || (movesFromFutureSession && Number(continuationMinutes) > Number(item.plannedMinutes))} onClick={previewContinuation} type="button">{busy ? <Loader2 className="spin" size={16} /> : <ArrowRight size={16} />}Previsualitzar continuació</button>}
      </section>}

      {action === 'recovery' && <section className="agenda-adjust-panel" role="tabpanel">
        {recoveryLoading ? <div className="agenda-adjust-preview"><Loader2 className="spin" size={18} /><div><strong>Carregant la cronologia anterior</strong><p>Busquem les activitats d’aquesta UP que ja havies començat amb el grup.</p></div></div> : recoveryItem ? <>
          <label>Activitat anterior<select value={recoveryItem.id} onChange={(event) => selectRecoveryItem(event.target.value)}>{recoveryOptions.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title} · {candidate.sourcePlanningUnitLabel || 'UP anterior'}{candidate.lastStartsAt ? ` · ${dateLabel(candidate.lastStartsAt)}` : ' · Programació'}{candidate.plannedMinutes ? ` · ${candidate.plannedMinutes} min` : ''}</option>)}</select></label>
          <label>Minuts que hi dedicaràs ara<input min="1" type="number" value={recoveryMinutes} onChange={(event) => { setRecoveryMinutes(event.target.value); setRecoveryPreview(null) }} /></label>
          {!recoveryPreview ? <div className="agenda-adjust-preview"><History size={18} /><div><strong>{bundle.session.status === 'held' ? 'Corregirà l’activitat de la sessió actual' : 'Es posarà abans del que hi havia previst'}</strong><p>{bundle.session.status === 'held' ? `«${recoveryItem.title}» substituirà l’activitat que constava avui. Es conservaran l’assistència, les notes i el seguiment, i el contingut desplaçat passarà a les sessions següents.` : `«${recoveryItem.title}» obrirà aquesta sessió. Si ja estava plena, les activitats actuals avançaran automàticament a les sessions següents.`} La Programació no canviarà.</p></div></div> : <div className="agenda-continuation-preview"><header><CheckCircle2 size={17} /><strong>{recoveryPreview.sessions.length} sessions reajustades</strong></header>{recoveryPreview.sessions.map((candidate) => <div key={candidate.session.id}><span>{dateLabel(candidate.session.startsAt)} · {String(candidate.session.startsAt).slice(11, 16)}</span><strong>{candidate.items.map((current) => current.title).join(' · ')}</strong><small>{candidate.session.id === bundle.session.id && recoveryPreview.correctCurrentSession ? 'Corregeix la sessió actual i conserva les seves dades' : candidate.isExisting ? 'Reutilitza la sessió prevista' : 'Crea la sessió que absorbeix l’efecte dominó'}</small></div>)}</div>}
          {recoveryPreview ? <button className="primary-action" disabled={busy} onClick={() => execute(() => onConfirmRecovery(recoveryPreview), 'Activitat anterior recuperada i cronologia reajustada només a l’Agenda.')} type="button">{busy && <Loader2 className="spin" size={16} />}Confirmar reajustament</button> : <button className="secondary-action" disabled={busy || Number(recoveryMinutes) <= 0} onClick={previewRecovery} type="button">{busy ? <Loader2 className="spin" size={16} /> : <History size={16} />}Previsualitzar l’efecte dominó</button>}
        </> : <div className="agenda-adjust-preview warning"><AlertTriangle size={18} /><div><strong>No hi ha cap activitat anterior disponible</strong><p>Aquesta opció apareixerà quan el grup tingui almenys una activitat prèvia en alguna UP del curs.</p></div></div>}
      </section>}

      {error && <p className="agenda-inline-error" role="alert">{error}</p>}
      <div className="modal-actions"><button className="secondary-action" disabled={busy} onClick={onClose} type="button">Tancar</button></div>
    </Modal>
  )
}
