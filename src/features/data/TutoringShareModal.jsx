import { CheckCircle2, Inbox, Loader2, RefreshCw, Share2, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../../components/Modal'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'

function formatDateTime(value) {
  if (!value) return 'Sense data'
  return new Date(value).toLocaleString('ca-ES', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  })
}

export function TutoringShareModal({ onClose }) {
  const cloud = useAvaluaproStore((state) => state.cloud)
  const loadSharedTutoringInvitations = useAvaluaproStore((state) => state.loadSharedTutoringInvitations)
  const acceptSharedTutoringInvitation = useAvaluaproStore((state) => state.acceptSharedTutoringInvitation)
  const rejectSharedTutoringInvitation = useAvaluaproStore((state) => state.rejectSharedTutoringInvitation)
  const acknowledgeSharedTutoringInvitationUpdate = useAvaluaproStore(
    (state) => state.acknowledgeSharedTutoringInvitationUpdate,
  )
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')

  const received = cloud.sharedTutoringInvitations || []
  const sentUpdates = cloud.sharedTutoringInvitationUpdates || []
  const pendingCount = received.length + sentUpdates.length

  const sortedSpaces = useMemo(
    () =>
      [...(cloud.sharedTutoringSpaces || [])].sort((a, b) =>
        String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')),
      ),
    [cloud.sharedTutoringSpaces],
  )

  useEffect(() => {
    loadSharedTutoringInvitations()
  }, [loadSharedTutoringInvitations])

  async function runAction(actionKey, action) {
    setBusy(actionKey)
    setMessage('')
    try {
      await action()
      setMessage('Procés fet correctament.')
    } catch (error) {
      setMessage(error.message || 'No s’ha pogut completar l’acció.')
    } finally {
      setBusy('')
    }
  }

  return (
    <Modal onClose={onClose} size="lg" title="Compartir tutoria">
      <div className="tutoring-share-modal">
        <section className="teacher-package-intro">
          <Share2 size={22} />
          <div>
            <strong>Safata de cotutories compartides</strong>
            <p>
              Aquí pots acceptar o rebutjar sol·licituds de cotutoria, i veure si els cotutors han respost a les
              invitacions que has enviat.
            </p>
          </div>
        </section>

        <div className="tutoring-share-status">
          <span className={pendingCount > 0 ? 'active' : ''}>{pendingCount}</span>
          <div>
            <strong>{pendingCount === 1 ? 'avís pendent' : 'avisos pendents'}</strong>
            <small>Sol·licituds rebudes i respostes dels cotutors.</small>
          </div>
          <button
            className="secondary-action compact"
            disabled={busy === 'refresh'}
            onClick={() => runAction('refresh', loadSharedTutoringInvitations)}
            type="button"
          >
            {busy === 'refresh' ? <Loader2 size={16} /> : <RefreshCw size={16} />}
            Actualitzar
          </button>
        </div>

        {message && (
          <p className={`teacher-package-message ${message.includes('correctament') ? 'ok' : 'risk'}`}>{message}</p>
        )}
        {cloud.sharedTutoringInvitationError && (
          <p className="teacher-package-message risk">{cloud.sharedTutoringInvitationError}</p>
        )}

        <div className="tutoring-share-grid">
          <section className="teacher-package-inbox">
            <header>
              <Inbox size={20} />
              <div>
                <strong>Sol·licituds rebudes</strong>
                <span>{received.length} pendents</span>
              </div>
            </header>
            <div className="tutoring-share-list">
              {received.length === 0 && (
                <p className="teacher-package-inbox-empty">No tens cap sol·licitud de cotutoria pendent.</p>
              )}
              {received.map((invitation) => {
                const id = invitation.spaceId || invitation.id
                return (
                  <article key={id}>
                    <div>
                      <strong>{invitation.className || 'Tutoria compartida'}</strong>
                      <small>
                        {invitation.senderEmail || invitation.senderEmailLower} · {formatDateTime(invitation.createdAt)}
                      </small>
                    </div>
                    <div className="tutoring-share-actions">
                      <button
                        className="secondary-action compact"
                        disabled={Boolean(busy)}
                        onClick={() => runAction(`reject-${id}`, () => rejectSharedTutoringInvitation(id))}
                        type="button"
                      >
                        {busy === `reject-${id}` ? <Loader2 size={15} /> : <XCircle size={15} />}
                        Rebutjar
                      </button>
                      <button
                        className="primary-action compact"
                        disabled={Boolean(busy)}
                        onClick={() => runAction(`accept-${id}`, () => acceptSharedTutoringInvitation(id))}
                        type="button"
                      >
                        {busy === `accept-${id}` ? <Loader2 size={15} /> : <CheckCircle2 size={15} />}
                        Acceptar
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>

          <section className="teacher-package-sent-log">
            <header>
              <Share2 size={20} />
              <div>
                <strong>Respostes rebudes</strong>
                <span>{sentUpdates.length} sense revisar</span>
              </div>
            </header>
            <div className="tutoring-share-list">
              {sentUpdates.length === 0 && (
                <p className="teacher-package-inbox-empty">No hi ha cap resposta nova dels cotutors.</p>
              )}
              {sentUpdates.map((update) => {
                const id = update.spaceId || update.id
                const accepted = update.status === 'accepted'
                return (
                  <article className={accepted ? 'accepted' : 'rejected'} key={`${id}-${update.recipientEmailLower}`}>
                    <div>
                      <strong>{update.className || 'Tutoria compartida'}</strong>
                      <small>
                        {update.responseByEmail || update.recipientEmailLower} ·{' '}
                        {accepted ? 'acceptada' : 'rebutjada'} · {formatDateTime(update.respondedAt)}
                      </small>
                    </div>
                    <button
                      className="secondary-action compact"
                      disabled={Boolean(busy)}
                      onClick={() => runAction(`ack-${id}`, () => acknowledgeSharedTutoringInvitationUpdate(id))}
                      type="button"
                    >
                      Entesos
                    </button>
                  </article>
                )
              })}
            </div>
          </section>
        </div>

        <section className="teacher-package-sent-log">
          <header>
            <CheckCircle2 size={20} />
            <div>
              <strong>Tutories vinculades</strong>
              <span>{sortedSpaces.length} espais compartits</span>
            </div>
          </header>
          <div className="tutoring-share-linked-list">
            {sortedSpaces.length === 0 && (
              <p className="teacher-package-inbox-empty">Encara no tens cap tutoria compartida vinculada.</p>
            )}
            {sortedSpaces.map((space) => (
              <article key={space.id}>
                <strong>{space.className || 'Tutoria compartida'}</strong>
                <small>
                  {(space.memberEmails || []).join(' · ') || 'Sense membres visibles'} · actualitzada{' '}
                  {formatDateTime(space.updatedAt)}
                </small>
              </article>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  )
}
