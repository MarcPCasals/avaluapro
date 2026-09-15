import { useEffect, useMemo, useState } from 'react'
import {
  BellRing,
  Check,
  ChevronDown,
  Clock3,
  Inbox,
  MessageCircle,
  RefreshCw,
  Send,
  Trash2,
  UserRound,
  UsersRound,
} from 'lucide-react'
import {
  getOpenTutoringReminders,
  groupTutoringCoordinationItemsByStudent,
  sortTutoringCoordinationItems,
} from '../../lib/tutoringCoordination'
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

function CoordinationMessage({ currentUser, item, memberStates, onDelete, onReminderStatus, student, spaceId }) {
  const own = item.authorUid === currentUser?.uid
  const seenByCotutor = own && memberStates.some(
    (state) => state.spaceId === spaceId && state.uid !== currentUser?.uid && state.lastReadAt >= item.createdAt,
  )

  return (
    <article className={`coordination-message ${own ? 'own' : ''} ${item.kind}`}>
      <header>
        <strong>{own ? 'Tu' : item.authorName || item.authorEmail}</strong>
        <time>{formatDateTime(item.createdAt)}</time>
      </header>
      {item.kind === 'reminder' && <span className="coordination-kind"><BellRing size={13} /> Recordatori</span>}
      <p>{item.text}</p>
      {student && <span className="coordination-student">{student.name}</span>}
      <footer>
        {item.status === 'completed' && <span><Check size={13} /> Fet</span>}
        {item.syncStatus === 'pending' && <span>Enviant…</span>}
        {seenByCotutor && item.syncStatus !== 'pending' && <span>Vist pel cotutor</span>}
        <div className="coordination-message-actions">
          {item.kind === 'reminder' && item.status === 'completed' && (
            <button
              className="coordination-reopen"
              disabled={item.syncStatus === 'pending'}
              onClick={() => onReminderStatus(item, false)}
              type="button"
            >
              Reobrir
            </button>
          )}
          {own && (
            <button
              aria-label={item.kind === 'reminder' ? 'Eliminar recordatori' : 'Eliminar missatge'}
              className="coordination-delete"
              disabled={item.syncStatus === 'pending'}
              onClick={() => onDelete(item)}
              title={item.kind === 'reminder' ? 'Eliminar recordatori' : 'Eliminar missatge'}
              type="button"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </footer>
    </article>
  )
}

export function TutoringCoordinationPanel({ activeClass, students = [] }) {
  const cloud = useAvaluaproStore((state) => state.cloud)
  const addItem = useAvaluaproStore((state) => state.addTutoringCoordinationItem)
  const markRead = useAvaluaproStore((state) => state.markTutoringCoordinationRead)
  const retrySync = useAvaluaproStore((state) => state.retryTutoringCoordinationSync)
  const setReminderCompleted = useAvaluaproStore((state) => state.setTutoringCoordinationReminderCompleted)
  const deleteItem = useAvaluaproStore((state) => state.deleteTutoringCoordinationItem)
  const [view, setView] = useState('inbox')
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
  const visibleItems = useMemo(() => items.filter((item) => !item.deletedAt), [items])
  const studentGroups = useMemo(
    () => groupTutoringCoordinationItemsByStudent(visibleItems, students),
    [students, visibleItems],
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

  const handleDelete = async (item) => {
    const itemLabel = item.kind === 'reminder' ? 'aquest recordatori' : 'aquest missatge'
    if (!window.confirm(`Vols eliminar ${itemLabel}? Desapareixerà també per al cotutor.`)) return
    setError('')
    try {
      await deleteItem(item.id)
    } catch (deleteError) {
      setError(deleteError.message || 'No s’ha pogut eliminar el missatge.')
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

      <form className="coordination-composer" onSubmit={handleSubmit}>
        <div className="coordination-composer-heading">
          <strong>Escriu al cotutor</strong>
          <div className="coordination-kind-switch" aria-label="Tipus d’informació">
            <button className={kind === 'message' ? 'active' : ''} onClick={() => setKind('message')} type="button">
              <MessageCircle size={15} /> Missatge
            </button>
            <button className={kind === 'reminder' ? 'active reminder' : ''} onClick={() => setKind('reminder')} type="button">
              <BellRing size={15} /> Recordatori
            </button>
          </div>
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

      <nav className="coordination-view-switch" aria-label="Organització dels missatges">
        <button className={view === 'inbox' ? 'active' : ''} onClick={() => setView('inbox')} type="button">
          <Inbox size={16} /> Safata <span>{visibleItems.length}</span>
        </button>
        <button className={view === 'students' ? 'active' : ''} onClick={() => setView('students')} type="button">
          <UserRound size={16} /> Per alumne <span>{studentGroups.filter((group) => group.studentId).length}</span>
        </button>
      </nav>

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

        <div className={`coordination-conversation ${view === 'students' ? 'student-view' : ''}`}>
          {view === 'inbox' ? (
            <div className="coordination-timeline" aria-live="polite">
              {visibleItems.length === 0 ? (
                <div className="coordination-conversation-empty">
                  <UsersRound size={28} />
                  <strong>Encara no hi ha cap missatge.</strong>
                  <span>Comença deixant una informació o un acord per al cotutor.</span>
                </div>
              ) : (
                visibleItems.slice(-100).map((item) => (
                  <CoordinationMessage
                    currentUser={cloud.user}
                    item={item}
                    key={item.id}
                    memberStates={cloud.tutoringCoordinationMemberStates}
                    onDelete={handleDelete}
                    onReminderStatus={handleReminderStatus}
                    spaceId={spaceId}
                    student={studentById.get(item.studentId)}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="coordination-student-groups" aria-live="polite">
              {studentGroups.length === 0 ? (
                <div className="coordination-conversation-empty">
                  <UserRound size={28} />
                  <strong>Encara no hi ha cap història d’alumne.</strong>
                  <span>Relaciona un missatge amb un alumne i aquí en veuràs tot el fil.</span>
                </div>
              ) : studentGroups.map((group) => (
                <details key={group.studentId || 'general'}>
                  <summary>
                    <span className="coordination-group-icon">{group.student ? <UserRound size={17} /> : <UsersRound size={17} />}</span>
                    <span>
                      <strong>{group.label}</strong>
                      <small>{group.items.length} {group.items.length === 1 ? 'entrada' : 'entrades'} · Darrera: {formatDateTime(group.items.at(-1)?.createdAt)}</small>
                    </span>
                    <ChevronDown size={18} />
                  </summary>
                  <div className="coordination-student-history">
                    {group.items.map((item) => (
                      <CoordinationMessage
                        currentUser={cloud.user}
                        item={item}
                        key={item.id}
                        memberStates={cloud.tutoringCoordinationMemberStates}
                        onDelete={handleDelete}
                        onReminderStatus={handleReminderStatus}
                        spaceId={spaceId}
                        student={null}
                      />
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
