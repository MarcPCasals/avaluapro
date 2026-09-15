import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BellRing,
  CheckCheck,
  Loader2,
  MailPlus,
  Megaphone,
  MessageCircle,
  Send,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { Modal } from '../../components/Modal'
import {
  markInternalAnnouncementsRead,
  markInternalMessagesRead,
  sendInternalAnnouncement,
  sendInternalMessage,
} from '../../lib/firebase'

const ADMIN_EMAIL = 'mperezc@educand.ad'
const ANNOUNCEMENTS_KEY = '__announcements__'
const NEW_MESSAGE_KEY = '__new__'

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

function timestampToMillis(value) {
  if (!value) return 0
  if (typeof value.toMillis === 'function') return value.toMillis()
  if (typeof value.seconds === 'number') return value.seconds * 1000
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

function formatMessageTime(value) {
  const millis = timestampToMillis(value)
  if (!millis) return 'Ara'
  return new Date(millis).toLocaleString('ca-ES', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  })
}

function getOtherEmail(message, ownEmail) {
  if (message.senderEmailLower === ownEmail) return message.recipientEmailLower
  return message.senderEmailLower
}

function getCotutorContacts(sharedTutoringSpaces, ownEmail) {
  const contacts = new Map()
  ;(sharedTutoringSpaces || []).forEach((space) => {
    const candidates = [
      ...(space.memberEmails || []),
      ...(space.members || []).map((member) => member.emailLower || member.email),
      space.ownerEmailLower,
    ]
    candidates.forEach((candidate) => {
      const email = normalizeEmail(candidate)
      if (!email || email === ownEmail) return
      const member = (space.members || []).find(
        (item) => normalizeEmail(item.emailLower || item.email) === email,
      )
      contacts.set(email, {
        email,
        label: member?.name || member?.displayName || email,
      })
    })
  })
  return Array.from(contacts.values()).sort((a, b) => a.label.localeCompare(b.label, 'ca'))
}

export function InternalMessagingModal({
  announcements,
  messageState,
  messages,
  onClose,
  sharedTutoringSpaces,
  subscriptionError,
  user,
}) {
  const ownEmail = normalizeEmail(user?.email)
  const isAdmin = ownEmail === ADMIN_EMAIL
  const cotutors = useMemo(
    () => getCotutorContacts(sharedTutoringSpaces, ownEmail),
    [ownEmail, sharedTutoringSpaces],
  )
  const conversations = useMemo(() => {
    const byEmail = new Map()
    ;(messages || []).forEach((message) => {
      const email = getOtherEmail(message, ownEmail)
      if (!email) return
      const current = byEmail.get(email) || { email, messages: [], unread: 0 }
      current.messages.push(message)
      if (message.recipientEmailLower === ownEmail && message.status === 'unread') current.unread += 1
      byEmail.set(email, current)
    })
    return Array.from(byEmail.values())
      .map((conversation) => ({
        ...conversation,
        messages: conversation.messages.sort(
          (a, b) => timestampToMillis(a.createdAt) - timestampToMillis(b.createdAt),
        ),
        latestAt: Math.max(...conversation.messages.map((item) => timestampToMillis(item.createdAt))),
      }))
      .sort((a, b) => b.latestAt - a.latestAt)
  }, [messages, ownEmail])
  const announcementsReadAt = timestampToMillis(messageState?.announcementsReadAt)
  const sortedAnnouncements = useMemo(
    () => [...(announcements || [])].sort(
      (a, b) => timestampToMillis(a.createdAt) - timestampToMillis(b.createdAt),
    ),
    [announcements],
  )
  const unreadAnnouncements = sortedAnnouncements.filter(
    (item) => timestampToMillis(item.createdAt) > announcementsReadAt,
  ).length
  const firstUnread = conversations.find((item) => item.unread > 0)?.email
  const [activeKey, setActiveKey] = useState(
    firstUnread || (unreadAnnouncements > 0 ? ANNOUNCEMENTS_KEY : conversations[0]?.email || ANNOUNCEMENTS_KEY),
  )
  const [recipientEmail, setRecipientEmail] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState('')
  const messageEndRef = useRef(null)
  const activeConversation = conversations.find((item) => item.email === activeKey)
  const isAnnouncements = activeKey === ANNOUNCEMENTS_KEY
  const isNew = activeKey === NEW_MESSAGE_KEY
  const targetEmail = isNew ? normalizeEmail(recipientEmail) : activeConversation?.email || activeKey

  useEffect(() => {
    if (!user?.uid) return
    if (isAnnouncements) {
      markInternalAnnouncementsRead(user).catch(() => {})
      return
    }
    if (activeConversation?.unread) {
      markInternalMessagesRead(activeConversation.messages, user).catch(() => {})
    }
  }, [activeConversation, isAnnouncements, user])

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ block: 'nearest' })
  }, [activeKey, activeConversation?.messages.length, sortedAnnouncements.length])

  function selectRecipient(email) {
    setActiveKey(email)
    setStatus('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSending(true)
    setStatus('')
    try {
      if (isAnnouncements) {
        await sendInternalAnnouncement({ message: draft, user })
      } else {
        await sendInternalMessage({ message: draft, recipientEmail: targetEmail, user })
        setActiveKey(targetEmail)
      }
      setDraft('')
    } catch (error) {
      setStatus(error.message || 'No s’ha pogut enviar el missatge.')
    } finally {
      setSending(false)
    }
  }

  if (!user?.email) {
    return (
      <Modal onClose={onClose} size="md" title="Missatgeria interna">
        <div className="internal-messaging-signin">
          <MessageCircle size={34} />
          <strong>Inicia sessió per consultar els missatges</strong>
          <p>La missatgeria interna només està disponible per als comptes connectats a AvaluaPro.</p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose} size="xl" title="Missatgeria interna">
      <div className="internal-messaging-layout">
        <aside className="internal-message-sidebar">
          <button
            className={`internal-new-message ${isNew ? 'active' : ''}`}
            onClick={() => {
              setRecipientEmail('')
              setActiveKey(NEW_MESSAGE_KEY)
              setStatus('')
            }}
            type="button"
          >
            <MailPlus size={18} />
            Nou missatge
          </button>

          {cotutors.length > 0 && (
            <section className="internal-cotutor-shortcuts">
              <span><UsersRound size={15} /> Cotutors</span>
              <div>
                {cotutors.map((cotutor) => (
                  <button key={cotutor.email} onClick={() => selectRecipient(cotutor.email)} type="button">
                    {cotutor.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="internal-conversation-list">
            <button
              className={isAnnouncements ? 'active announcement' : 'announcement'}
              onClick={() => {
                setActiveKey(ANNOUNCEMENTS_KEY)
                setStatus('')
              }}
              type="button"
            >
              <Megaphone size={18} />
              <span>
                <strong>Novetats d’AvaluaPro</strong>
                <small>Avisos generals</small>
              </span>
              {unreadAnnouncements > 0 && <em>{unreadAnnouncements}</em>}
            </button>
            {conversations.map((conversation) => (
              <button
                className={activeKey === conversation.email ? 'active' : ''}
                key={conversation.email}
                onClick={() => {
                  setActiveKey(conversation.email)
                  setStatus('')
                }}
                type="button"
              >
                <UserRound size={18} />
                <span>
                  <strong>{conversation.email}</strong>
                  <small>{conversation.messages.at(-1)?.body || ''}</small>
                </span>
                {conversation.unread > 0 && <em>{conversation.unread}</em>}
              </button>
            ))}
          </div>
        </aside>

        <section className="internal-chat-panel">
          <header>
            <div>
              {isAnnouncements ? <Megaphone size={20} /> : <UserRound size={20} />}
              <span>
                <strong>{isAnnouncements ? 'Novetats d’AvaluaPro' : isNew ? 'Nova conversa' : targetEmail}</strong>
                <small>
                  {isAnnouncements
                    ? 'Informacions generals dins de l’aplicació'
                    : 'Conversa privada entre dos usuaris'}
                </small>
              </span>
            </div>
          </header>

          {isNew && (
            <label className="internal-recipient-field">
              Correu del destinatari
              <input
                autoComplete="email"
                onChange={(event) => setRecipientEmail(event.target.value)}
                placeholder="usuari@educand.ad"
                type="email"
                value={recipientEmail}
              />
            </label>
          )}

          <div className="internal-message-stream" aria-live="polite">
            {subscriptionError && <p className="internal-message-notice error">{subscriptionError}</p>}
            {isAnnouncements ? (
              sortedAnnouncements.length > 0 ? sortedAnnouncements.map((item) => (
                <article className="internal-message-bubble announcement" key={item.id}>
                  <span><BellRing size={14} /> {item.senderName || 'AvaluaPro'}</span>
                  <p>{item.body}</p>
                  <small>{formatMessageTime(item.createdAt)}</small>
                </article>
              )) : <p className="internal-message-empty">Encara no hi ha cap novetat publicada.</p>
            ) : activeConversation?.messages.length > 0 ? (
              activeConversation.messages.map((item) => {
                const isOwn = item.senderEmailLower === ownEmail
                return (
                  <article className={`internal-message-bubble ${isOwn ? 'own' : ''}`} key={item.id}>
                    <p>{item.body}</p>
                    <small>
                      {formatMessageTime(item.createdAt)}
                      {isOwn && item.status === 'read' && <CheckCheck aria-label="Llegit" size={14} />}
                    </small>
                  </article>
                )
              })
            ) : (
              <p className="internal-message-empty">Escriu el primer missatge d’aquesta conversa.</p>
            )}
            <div ref={messageEndRef} />
          </div>

          {(!isAnnouncements || isAdmin) && (
            <form className="internal-message-composer" onSubmit={handleSubmit}>
              <textarea
                disabled={sending}
                maxLength={2000}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={isAnnouncements ? 'Explica la novetat a tots els usuaris…' : 'Escriu un missatge…'}
                rows={2}
                value={draft}
              />
              <button disabled={sending || !draft.trim() || (!isAnnouncements && !targetEmail)} type="submit">
                {sending ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
                <span>{isAnnouncements ? 'Publicar' : 'Enviar'}</span>
              </button>
            </form>
          )}
          {isAnnouncements && !isAdmin && (
            <p className="internal-message-notice">Aquest espai és informatiu. Només l’administrador d’AvaluaPro hi pot publicar.</p>
          )}
          {status && <p className="internal-message-notice error" role="alert">{status}</p>}
          <p className="internal-message-privacy">No hi incloguis dades sensibles d’alumnes. Per al seguiment tutorial, utilitza l’espai de cotutoria.</p>
        </section>
      </div>
    </Modal>
  )
}
