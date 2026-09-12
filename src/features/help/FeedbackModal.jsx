import { HelpCircle, Lightbulb, Mail, Send, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Modal } from '../../components/Modal'
import { isFeedbackAdmin, markFeedbackRead, sendFeedback, subscribeFeedback } from '../../lib/firebase'

const CATEGORY_OPTIONS = [
  { id: 'suggeriment', label: 'Suggeriment', icon: Lightbulb },
  { id: 'dubte', label: 'Dubte', icon: HelpCircle },
]

function readDraft(key) {
  try {
    const draft = JSON.parse(sessionStorage.getItem(key))
    return {
      name: typeof draft?.name === 'string' ? draft.name.slice(0, 80) : '',
      message: typeof draft?.message === 'string' ? draft.message.slice(0, 1600) : '',
      category: draft?.category === 'dubte' ? 'dubte' : 'suggeriment',
    }
  } catch {
    return { name: '', message: '', category: 'suggeriment' }
  }
}

function FeedbackInbox() {
  const [messages, setMessages] = useState(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => subscribeFeedback(setMessages, () => {
    setError('No s’ha pogut carregar la bústia. Comprova la connexió i torna-ho a provar.')
  }), [retry])

  async function handleRead(id) {
    setPending(id)
    setError('')
    try {
      await markFeedbackRead(id)
    } catch {
      setError('No s’ha pogut marcar el missatge com a llegit. Torna-ho a provar.')
    } finally {
      setPending('')
    }
  }

  return (
    <section className="feedback-inbox" aria-label="Bústia privada de suggeriments">
      <p>Només tu pots consultar aquesta bústia. {messages && `${messages.filter((item) => item.status === 'new').length} missatges nous.`}</p>
      {error && <div role="alert" className="feedback-status">
        {error} <button type="button" onClick={() => { setError(''); setRetry((value) => value + 1) }}>Tornar-ho a provar</button>
      </div>}
      {!messages && !error && <p role="status">Carregant missatges…</p>}
      {messages?.length === 0 && <p>Encara no has rebut cap missatge.</p>}
      {messages?.map((item) => (
        <article className="feedback-inbox-message" key={item.id}>
          <header>
            <strong>{item.category === 'dubte' ? 'Dubte' : 'Suggeriment'} · {item.status === 'new' ? 'Nou' : 'Llegit'}</strong>
            <span>{item.createdAt?.toDate().toLocaleString('ca-AD') || 'Pendent de confirmar'}</span>
          </header>
          <p><strong>{item.name || 'Nom no indicat'}</strong> · {item.senderEmail}</p>
          <p className="feedback-message-text">{item.message}</p>
          {item.status === 'new' && <button className="secondary-action" type="button" disabled={Boolean(pending)} onClick={() => handleRead(item.id)}>
            {pending === item.id ? 'Desant…' : 'Marcar com a llegit'}
          </button>}
        </article>
      ))}
    </section>
  )
}

function FeedbackForm({ user, onClose, onSendingChange }) {
  const draftKey = `avaluapro-feedback-draft-${user?.uid || 'local'}`
  const [draft, setDraft] = useState(() => readDraft(draftKey))
  const [status, setStatus] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const inFlight = useRef(false)
  const { name, category, message } = draft
  const canSend = Boolean(user?.email) && message.trim().length >= 5 && !sending && !sent

  useEffect(() => {
    try {
      if (sent) sessionStorage.removeItem(draftKey)
      else sessionStorage.setItem(draftKey, JSON.stringify(draft))
    } catch { /* Sending still works when browser storage is unavailable. */ }
  }, [draft, draftKey, sent])

  function change(field, value) {
    setDraft((previous) => ({ ...previous, [field]: value }))
    setStatus('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSend || inFlight.current) return
    inFlight.current = true
    setSending(true)
    onSendingChange(true)
    setStatus('Enviant el missatge…')
    const timer = setTimeout(() => {
      setStatus('Encara esperem la confirmació de recepció. Comprova la connexió i mantén aquesta finestra oberta; no cal tornar-lo a enviar.')
    }, 10000)
    try {
      await sendFeedback(draft)
      setSent(true)
      setStatus('Missatge rebut. Gràcies! En Marc ja el pot consultar a la seva bústia d’AvaluaPro.')
    } catch (error) {
      setStatus(error.code
        ? 'No s’ha pogut enviar el missatge. El text es conserva. Comprova la connexió i torna-ho a provar.'
        : error.message)
    } finally {
      clearTimeout(timer)
      inFlight.current = false
      setSending(false)
      onSendingChange(false)
    }
  }

  return (
    <form className="feedback-modal" onSubmit={handleSubmit} aria-busy={sending}>
      <section className="feedback-intro">
        <span><Lightbulb size={24} /></span>
        <div>
          <strong>Ajuda a millorar AvaluaPro</strong>
          <p>Escriu una idea, problema o pregunta. El missatge s’enviarà directament a la bústia privada d’en Marc dins d’AvaluaPro.</p>
          <p>S’hi inclourà el correu del compte amb què has iniciat sessió perquè et pugui respondre. Evita incloure dades d’alumnes.</p>
        </div>
      </section>
      {!user?.email && <p className="feedback-status">Per enviar el missatge, inicia sessió amb Google des del menú de dades d’AvaluaPro.</p>}
      <label>
        <span><UserRound size={16} />Nom opcional</span>
        <input disabled={sending || sent} maxLength={80} onChange={(event) => change('name', event.target.value)} placeholder="Ex: Marc, Departament de ciències…" value={name} />
      </label>
      <fieldset className="feedback-category-options" disabled={sending || sent}>
        <legend>Categoria</legend>
        {CATEGORY_OPTIONS.map((option) => {
          const Icon = option.icon
          return <button aria-pressed={category === option.id} className={category === option.id ? 'active' : ''} key={option.id} onClick={() => change('category', option.id)} type="button"><Icon size={17} />{option.label}</button>
        })}
      </fieldset>
      <label>
        <span><Mail size={16} />Missatge</span>
        <textarea disabled={sending || sent} minLength={5} maxLength={1600} onChange={(event) => change('message', event.target.value)} placeholder="Escriu aquí el suggeriment o dubte…" required value={message} />
      </label>
      {status && <p className="feedback-status" role="status">{status}</p>}
      <div className="modal-actions">
        <button className="secondary-action" disabled={sending} onClick={onClose} type="button">Tancar</button>
        {!sent && <button className="primary-action" disabled={!canSend} type="submit"><Send size={17} />{sending ? 'Enviant…' : 'Enviar missatge'}</button>}
      </div>
    </form>
  )
}

export function FeedbackModal({ user, onClose }) {
  const [view, setView] = useState('send')
  const [busy, setBusy] = useState(false)
  return (
    <Modal onClose={() => { if (!busy) onClose() }} size="lg" title="Suggeriments i dubtes">
      {isFeedbackAdmin(user) && <div className="feedback-category-options feedback-navigation" aria-label="Suggeriments">
        <button disabled={busy} className={view === 'send' ? 'active' : ''} aria-pressed={view === 'send'} onClick={() => setView('send')} type="button">Enviar missatge</button>
        <button disabled={busy} className={view === 'inbox' ? 'active' : ''} aria-pressed={view === 'inbox'} onClick={() => setView('inbox')} type="button">Bústia rebuda</button>
      </div>}
      <div hidden={view !== 'send'}><FeedbackForm key={user?.uid || 'local'} user={user} onClose={onClose} onSendingChange={setBusy} /></div>
      {view === 'inbox' && isFeedbackAdmin(user) && <FeedbackInbox />}
    </Modal>
  )
}
