import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BellRing,
  BookOpenCheck,
  Check,
  ChevronDown,
  Clock3,
  Inbox,
  MessageCircle,
  Pencil,
  RefreshCw,
  Save,
  Send,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'
import {
  getOpenTutoringReminders,
  getUrgentTutoringMessages,
  groupTutoringCoordinationItemsByStudent,
  isCoordinationItemInTutorialRecords,
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

function StudentAutocomplete({ inputId, onChange, students, value }) {
  const selectedStudent = students.find((student) => student.id === value)
  const [query, setQuery] = useState(selectedStudent?.name || '')

  const handleChange = (event) => {
    const nextQuery = event.target.value
    const normalizedQuery = nextQuery.trim().toLocaleLowerCase('ca')
    const match = students.find(
      (student) => student.name.trim().toLocaleLowerCase('ca') === normalizedQuery,
    )
    setQuery(nextQuery)
    onChange(match?.id || '')
  }

  return (
    <label>
      Alumne relacionat
      <input
        autoComplete="off"
        list={`${inputId}-students`}
        onChange={handleChange}
        placeholder="Escriu el nom de l’alumne…"
        value={query}
      />
      <datalist id={`${inputId}-students`}>
        {students.map((student) => <option key={student.id} value={student.name} />)}
      </datalist>
    </label>
  )
}

function CoordinationMessage({
  currentUser,
  isInTracking,
  item,
  memberStates,
  onDelete,
  onEdit,
  onReminderStatus,
  onSendToTracking,
  student,
  students,
  spaceId,
  trackingBusy,
}) {
  const own = item.authorUid === currentUser?.uid
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(item.text)
  const [editStudentId, setEditStudentId] = useState(item.studentId || '')
  const [saving, setSaving] = useState(false)
  const seenByCotutor = own && memberStates.some(
    (state) => state.spaceId === spaceId && state.uid !== currentUser?.uid && state.lastReadAt >= item.createdAt,
  )

  const startEditing = () => {
    setEditText(item.text)
    setEditStudentId(item.studentId || '')
    setEditing(true)
  }

  const saveEdit = async (event) => {
    event.preventDefault()
    setSaving(true)
    const saved = await onEdit(item, { studentId: editStudentId, text: editText })
    setSaving(false)
    if (saved) setEditing(false)
  }

  return (
    <article className={`coordination-message ${own ? 'own' : ''} ${item.kind}`}>
      <header>
        <span className="coordination-message-author">
          <strong>{own ? 'Tu' : item.authorName || item.authorEmail}</strong>
          {!editing && student && <span className="coordination-student">{student.name}</span>}
        </span>
        <time>{formatDateTime(item.createdAt)}</time>
      </header>
      {item.kind === 'reminder' && <span className="coordination-kind"><BellRing size={13} /> Recordatori</span>}
      {item.kind === 'urgent' && <span className="coordination-kind urgent"><AlertTriangle size={13} /> Urgent</span>}
      {editing ? (
        <form className="coordination-edit-form" onSubmit={saveEdit}>
          <textarea
            autoFocus
            maxLength={1600}
            onChange={(event) => setEditText(event.target.value)}
            rows={3}
            value={editText}
          />
          <StudentAutocomplete
            inputId={`coordination-edit-${item.id}`}
            key={editStudentId || 'empty'}
            onChange={setEditStudentId}
            students={students}
            value={editStudentId}
          />
          <div>
            <button className="secondary-action compact" onClick={() => setEditing(false)} type="button">
              <X size={14} /> Cancel·lar
            </button>
            <button className="primary-action compact" disabled={saving || !editText.trim()} type="submit">
              <Save size={14} /> {saving ? 'Guardant…' : 'Desar canvis'}
            </button>
          </div>
        </form>
      ) : (
        <>
          <p>{item.text}</p>
        </>
      )}
      <footer>
        {item.status === 'completed' && <span><Check size={13} /> Fet</span>}
        {item.syncStatus === 'pending' && <span>Enviant…</span>}
        {seenByCotutor && item.syncStatus !== 'pending' && <span>Vist pel cotutor</span>}
        <div className="coordination-message-actions">
          {item.studentId && (
            <button
              className={`coordination-tracking ${isInTracking ? 'saved' : ''}`}
              disabled={item.syncStatus === 'pending' || trackingBusy || isInTracking}
              onClick={() => onSendToTracking(item)}
              title={isInTracking ? 'Ja és al seguiment tutorial' : 'Desar aquest missatge al registre de seguiment tutorial'}
              type="button"
            >
              <BookOpenCheck size={14} /> {isInTracking ? 'Al seguiment' : trackingBusy ? 'Desant…' : 'Enviar a seguiment'}
            </button>
          )}
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
          <button
            aria-label={item.kind === 'reminder' ? 'Editar recordatori' : 'Editar missatge'}
            className="coordination-edit"
            disabled={item.syncStatus === 'pending' || editing}
            onClick={startEditing}
            title={item.kind === 'reminder' ? 'Editar recordatori' : 'Editar missatge'}
            type="button"
          >
            <Pencil size={14} />
          </button>
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
  const editItem = useAvaluaproStore((state) => state.editTutoringCoordinationItem)
  const sendItemToTracking = useAvaluaproStore((state) => state.sendTutoringCoordinationItemToTracking)
  const tutorialRecords = useAvaluaproStore((state) => state.tutorialRecords)
  const [view, setView] = useState('inbox')
  const [kind, setKind] = useState('message')
  const [text, setText] = useState('')
  const [studentId, setStudentId] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [assigneeUid, setAssigneeUid] = useState('all')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [trackingBusyId, setTrackingBusyId] = useState('')
  const spaceId = activeClass?.sharedTutoringSpaceId || ''
  const activeSpace = cloud.sharedTutoringSpaces.find((space) => space.id === spaceId)
  const members = (activeSpace?.members || []).filter((member) => member.uid)
  const items = useMemo(
    () => sortTutoringCoordinationItems(cloud.tutoringCoordinationItems.filter((item) => item.spaceId === spaceId)),
    [cloud.tutoringCoordinationItems, spaceId],
  )
  const visibleItems = useMemo(() => items.filter((item) => !item.deletedAt), [items])
  const messageItems = useMemo(() => visibleItems.filter((item) => item.kind !== 'reminder'), [visibleItems])
  const urgentItems = useMemo(() => getUrgentTutoringMessages(messageItems), [messageItems])
  const studentGroups = useMemo(
    () => groupTutoringCoordinationItemsByStudent(messageItems, students),
    [messageItems, students],
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
    const shouldRegister = event.nativeEvent.submitter?.value === 'send-and-register'
    setBusy(true)
    setError('')
    try {
      const item = await addItem({
        assigneeUid,
        classId: activeClass.id,
        dueAt: toIsoDateTime(dueAt),
        kind,
        studentId,
        text,
      })
      if (shouldRegister) await sendItemToTracking(item.id, activeClass.id)
      setText('')
      setStudentId('')
      setDueAt('')
      setAssigneeUid('all')
      if (shouldRegister) setNotice('Missatge enviat i desat al registre de seguiment tutorial.')
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

  const handleEdit = async (item, changes) => {
    setError('')
    setNotice('')
    try {
      await editItem(item.id, changes)
      return true
    } catch (editError) {
      setError(editError.message || 'No s’ha pogut editar el missatge.')
      return false
    }
  }

  const handleSendToTracking = async (item) => {
    setError('')
    setNotice('')
    setTrackingBusyId(item.id)
    try {
      const result = await sendItemToTracking(item.id, activeClass.id)
      setNotice(result?.created
        ? 'Missatge desat al registre de seguiment tutorial.'
        : 'Aquest missatge ja era al registre de seguiment tutorial.')
    } catch (trackingError) {
      setError(trackingError.message || 'No s’ha pogut desar al seguiment tutorial.')
    } finally {
      setTrackingBusyId('')
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
      {(error || cloud.tutoringCoordinationError) && (
        <div className="coordination-error" role="alert">
          <span>{error || cloud.tutoringCoordinationError}</span>
          <button className="secondary-action compact" onClick={retrySync} type="button">
            <RefreshCw size={15} /> Tornar-ho a provar
          </button>
        </div>
      )}
      {notice && <div className="coordination-notice" role="status"><Check size={16} /> {notice}</div>}

      <form className="coordination-composer" onSubmit={handleSubmit}>
        <div className="coordination-composer-heading">
          <strong>Escriu al cotutor</strong>
          <div className="coordination-kind-switch" aria-label="Tipus d’informació">
            <button className={kind === 'message' ? 'active' : ''} onClick={() => setKind('message')} type="button">
              <MessageCircle size={15} /> Missatge
            </button>
            <button className={kind === 'urgent' ? 'active urgent' : ''} onClick={() => setKind('urgent')} type="button">
              <AlertTriangle size={15} /> Urgent
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
          <StudentAutocomplete
            inputId="coordination-composer"
            key={studentId || 'empty'}
            onChange={setStudentId}
            students={students}
            value={studentId}
          />
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
                Data i hora compartida
                <input onChange={(event) => setDueAt(event.target.value)} type="datetime-local" value={dueAt} />
                <small>Apareixerà al calendari dels dos tutors.</small>
              </label>
            </>
          )}
          <button className="primary-action coordination-send" disabled={busy || !text.trim()} type="submit" value="send">
            <Send size={16} /> {busy ? 'Guardant…' : kind === 'reminder' ? 'Afegir recordatori' : 'Enviar'}
          </button>
          {kind !== 'reminder' && (
            <button
              className="secondary-action coordination-send-register"
              disabled={busy || !text.trim() || !studentId}
              title={!studentId ? 'Selecciona primer un alumne de les propostes' : 'Enviar i desar al seguiment tutorial'}
              type="submit"
              value="send-and-register"
            >
              <BookOpenCheck size={16} /> Enviar i registrar
            </button>
          )}
        </div>
      </form>

      <nav className="coordination-view-switch" aria-label="Organització dels missatges">
        <button className={view === 'inbox' ? 'active' : ''} onClick={() => setView('inbox')} type="button">
          <Inbox size={16} /> Safata <span>{messageItems.length}</span>
        </button>
        <button className={view === 'students' ? 'active' : ''} onClick={() => setView('students')} type="button">
          <UserRound size={16} /> Per alumne <span>{studentGroups.filter((group) => group.studentId).length}</span>
        </button>
        <button
          className={`urgent ${view === 'urgent' ? 'active' : ''}`}
          onClick={() => setView('urgent')}
          type="button"
        >
          <AlertTriangle size={16} /> Missatges urgents <span>{urgentItems.length}</span>
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
              {messageItems.length === 0 ? (
                <div className="coordination-conversation-empty">
                  <UsersRound size={28} />
                  <strong>Encara no hi ha cap missatge.</strong>
                  <span>Comença deixant una informació o un acord per al cotutor.</span>
                </div>
              ) : (
                [...messageItems].reverse().slice(0, 100).map((item) => (
                  <CoordinationMessage
                    currentUser={cloud.user}
                    isInTracking={isCoordinationItemInTutorialRecords(item.id, tutorialRecords)}
                    item={item}
                    key={item.id}
                    memberStates={cloud.tutoringCoordinationMemberStates}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    onReminderStatus={handleReminderStatus}
                    onSendToTracking={handleSendToTracking}
                    spaceId={spaceId}
                    student={studentById.get(item.studentId)}
                    students={students}
                    trackingBusy={trackingBusyId === item.id}
                  />
                ))
              )}
            </div>
          ) : view === 'students' ? (
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
                        isInTracking={isCoordinationItemInTutorialRecords(item.id, tutorialRecords)}
                        item={item}
                        key={item.id}
                        memberStates={cloud.tutoringCoordinationMemberStates}
                        onDelete={handleDelete}
                        onEdit={handleEdit}
                        onReminderStatus={handleReminderStatus}
                        onSendToTracking={handleSendToTracking}
                        spaceId={spaceId}
                        student={studentById.get(item.studentId)}
                        students={students}
                        trackingBusy={trackingBusyId === item.id}
                      />
                    ))}
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <div className="coordination-timeline urgent-view" aria-live="polite">
              {urgentItems.length === 0 ? (
                <div className="coordination-conversation-empty urgent-empty">
                  <Check size={28} />
                  <strong>No hi ha cap missatge urgent.</strong>
                  <span>Els missatges marcats com a urgents quedaran reunits aquí.</span>
                </div>
              ) : urgentItems.map((item) => (
                <CoordinationMessage
                  currentUser={cloud.user}
                  isInTracking={isCoordinationItemInTutorialRecords(item.id, tutorialRecords)}
                  item={item}
                  key={item.id}
                  memberStates={cloud.tutoringCoordinationMemberStates}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  onReminderStatus={handleReminderStatus}
                  onSendToTracking={handleSendToTracking}
                  spaceId={spaceId}
                  student={studentById.get(item.studentId)}
                  students={students}
                  trackingBusy={trackingBusyId === item.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
