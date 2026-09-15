import { useEffect, useMemo, useState } from 'react'
import { BellRing, Check, Clock3, MessageCircle, RefreshCw, Send, UsersRound } from 'lucide-react'
import { getOpenTutoringReminders, sortTutoringCoordinationItems } from '../../lib/tutoringCoordination'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'

function formatDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('ca-ES', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  })
}

function toIsoDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

function getMemberLabel(member, currentUser) {
  if (member.uid === currentUser?.uid) return 'Jo'
  return member.name || member.displayName || member.emailLower || member.email || 'Cotutor'
}

export function TutoringCoordinationPanel({ activeClass, students = [] }) {
  const cloud = useAvaluaproStore((state) => state.cloud)
  const addItem = useAvaluaproStore((state) => state.addTutoringCoordinationItem)
  const markRead = useAvaluaproStore((state) => state.markTutoringCoordinationRead)
  const retrySync = useAvaluaproStore((state) => state.retryTutoringCoordinationSync)
  const setReminderCompleted = useAvaluaproStore((state) => state.setTutoringCoordinationReminderCompleted)
  const [kind, setKind] = useState('message')
  const [text, setText] = useState('')
  const [studentId, setStudentId] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [assigneeUid, setAssigneeUid] = useState('all')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const spaceId = activeClass?.sharedTutoringSpaceId || ''
  const activeSpace = cloud.sharedTutoringSpaces.find((space) => space.id === spaceId)
  const members = (activeSpace?.members || []).filter((member) => member.uid)
  const items = useMemo(
    () => sortTutoringCoordinationItems(cloud.tutoringCoordinationItems.filter((item) => item.spaceId === spaceId)),
    [cloud.tutoringCoordinationItems, spaceId],
  )
  const openReminders = useMemo(
    () =>
      getOpenTutoringReminders(items, cloud.user?.uid).sort((a, b) =>
        String(a.dueAt || '9999').localeCompare(String(b.dueAt || '9999')),
      ),
    [cloud.user?.uid, items],
  )
  const studentById = useMemo(() => new Map(students.map((student) => [student.id, student])), [students])

  useEffect(() => {
    if (!spaceId || items.length === 0) return
    markRead(spaceId)
  }, [items.length, markRead, spaceId])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await addItem({
        assigneeUid,
        classId: activeClass.id,
        dueAt: toIsoDateTime(dueAt),
        kind,
        studentId,
        text,
      })
      setText('')
      setStudentId('')
      setDueAt('')
      setAssigneeUid('all')
    } catch (submitError) {
      setError(submitError.message || 'No s’ha pogut guardar aquesta informació.')
    } finally {
      setBusy(false)
    }
  }

  const handleReminderStatus = async (item, completed) => {
    setError('')
    try {
      await setReminderCompleted(item.id, completed)
    } catch (updateError) {
      setError(updateError.message || 'No s’ha pogut actualitzar el recordatori.')
    }
  }

  if (!spaceId) {
    return (
      <section className="tutoring-coordination-empty">
        <MessageCircle size={30} />
        <h2>Coordinació amb el cotutor</h2>
        <p>Comparteix primer aquesta tutoria amb el cotutor. Quan accepti, aquí tindreu la conversa i els pendents comuns.</p>
      </section>
    )
  }

  return (
    <section className="tutoring-coordination-panel" data-tour="tutoring-coordination-panel">
      <header className="tutoring-coordination-heading">
        <div>
          <span className="section-kicker"><MessageCircle size={17} /> Coordinació de cotutoria</span>
          <h2>Conversa i pendents compartits</h2>
          <p>Tot el que escriviu queda dins d’aquesta tutoria i només és visible per als seus membres.</p>
        </div>
        <div className={`coordination-live-state ${cloud.tutoringCoordinationStatus}`}>
          <span />
          {cloud.tutoringCoordinationStatus === 'pending' ? 'Canvis pendents' : 'Recepció automàtica activa'}
        </div>
      </header>

      {(error || cloud.tutoringCoordinationError) && (
        <div className="coordination-error" role="alert">
          <span>{error || cloud.tutoringCoordinationError}</span>
          <button className="secondary-action compact" onClick={retrySync} type="button">
            <RefreshCw size={15} /> Tornar-ho a provar
          </button>
        </div>
      )}

      <div className="tutoring-coordination-layout">
        <aside className="coordination-reminders">
          <header>
            <div>
              <BellRing size={18} />
              <strong>Per a la pròxima tutoria</strong>
            </div>
            <span>{openReminders.length}</span>
          </header>
          {openReminders.length === 0 ? (
            <div className="coordination-empty-state">
              <Check size={20} />
              <span>No hi ha cap recordatori pendent.</span>
            </div>
          ) : (
            <div className="coordination-reminder-list">
              {openReminders.map((item) => {
                const student = studentById.get(item.studentId)
                const assignee = members.find((member) => member.uid === item.assigneeUid)
                return (
                  <article key={item.id}>
                    <button
                      aria-label="Marcar el recordatori com a fet"
                      disabled={item.syncStatus === 'pending'}
                      onClick={() => handleReminderStatus(item, true)}
                      type="button"
                    >
                      <Check size={16} />
                    </button>
                    <div>
                      <strong>{item.text}</strong>
                      {student && <span>{student.name}</span>}
                      <small>
                        {item.dueAt ? <><Clock3 size={13} /> {formatDateTime(item.dueAt)}</> : 'Sense data'}
                        {' · '}{item.assigneeUid === 'all' ? 'Tots dos' : getMemberLabel(assignee || {}, cloud.user)}
                      </small>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </aside>

        <div className="coordination-conversation">
          <div className="coordination-timeline" aria-live="polite">
            {items.length === 0 ? (
              <div className="coordination-conversation-empty">
                <UsersRound size={28} />
                <strong>Encara no hi ha cap missatge.</strong>
                <span>Comença deixant una informació o un acord per al cotutor.</span>
              </div>
            ) : (
              items.slice(-100).map((item) => {
                const own = item.authorUid === cloud.user?.uid
                const student = studentById.get(item.studentId)
                const otherReadStates = cloud.tutoringCoordinationMemberStates.filter(
                  (state) => state.spaceId === spaceId && state.uid !== cloud.user?.uid,
                )
                const seenByCotutor = own && otherReadStates.some((state) => state.lastReadAt >= item.createdAt)
                return (
                  <article className={`coordination-message ${own ? 'own' : ''} ${item.kind}`} key={item.id}>
                    <header>
                      <strong>{own ? 'Tu' : item.authorName || item.authorEmail}</strong>
                      <time>{formatDateTime(item.createdAt)}</time>
                    </header>
                    {item.kind === 'reminder' && <span className="coordination-kind"><BellRing size={13} /> Recordatori</span>}
                    <p>{item.deletedAt ? 'Missatge suprimit' : item.text}</p>
                    {student && <span className="coordination-student">{student.name}</span>}
                    <footer>
                      {item.status === 'completed' && <span><Check size={13} /> Fet</span>}
                      {item.syncStatus === 'pending' && <span>Enviant…</span>}
                      {seenByCotutor && item.syncStatus !== 'pending' && <span>Vist pel cotutor</span>}
                      {item.kind === 'reminder' && item.status === 'completed' && (
                        <button
                          className="coordination-reopen"
                          disabled={item.syncStatus === 'pending'}
                          onClick={() => handleReminderStatus(item, false)}
                          type="button"
                        >
                          Reobrir
                        </button>
                      )}
                    </footer>
                  </article>
                )
              })
            )}
          </div>

          <form className="coordination-composer" onSubmit={handleSubmit}>
            <div className="coordination-kind-switch" aria-label="Tipus d’informació">
              <button className={kind === 'message' ? 'active' : ''} onClick={() => setKind('message')} type="button">
                <MessageCircle size={15} /> Missatge
              </button>
              <button className={kind === 'reminder' ? 'active reminder' : ''} onClick={() => setKind('reminder')} type="button">
                <BellRing size={15} /> Recordatori
              </button>
            </div>
            <textarea
              maxLength={1600}
              onChange={(event) => setText(event.target.value)}
              placeholder={kind === 'reminder' ? 'Què heu de tenir present o fer?' : 'Escriu una informació per al cotutor…'}
              rows={3}
              value={text}
            />
            <div className="coordination-composer-options">
              <label>
                Alumne relacionat
                <select onChange={(event) => setStudentId(event.target.value)} value={studentId}>
                  <option value="">Cap alumne concret</option>
                  {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
                </select>
              </label>
              {kind === 'reminder' && (
                <>
                  <label>
                    Responsable
                    <select onChange={(event) => setAssigneeUid(event.target.value)} value={assigneeUid}>
                      <option value="all">Tots dos</option>
                      {members.map((member) => (
                        <option key={member.uid} value={member.uid}>{getMemberLabel(member, cloud.user)}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Quan ha d’avisar
                    <input onChange={(event) => setDueAt(event.target.value)} type="datetime-local" value={dueAt} />
                  </label>
                </>
              )}
              <button className="primary-action coordination-send" disabled={busy || !text.trim()} type="submit">
                <Send size={16} /> {busy ? 'Guardant…' : kind === 'reminder' ? 'Afegir recordatori' : 'Enviar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}
