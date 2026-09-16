import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertOctagon, Bell, BellRing, CheckCircle2, Clock3, Mail, MessageCircle, Skull } from 'lucide-react'
import { useAvaluaproStore } from '../store/useAvaluaproStore'
import {
  getPendingTutoringReminderAlerts,
  getUnreadTutoringCoordinationItems,
  hasTutoringReminderAcknowledgement,
} from '../lib/tutoringCoordination'

function reminderDateTime(reminder = {}) {
  if (!reminder.date) return null
  return new Date(`${reminder.date}T${reminder.time || '00:00'}`)
}

function formatDue(reminder = {}) {
  const dueAt = reminderDateTime(reminder)
  if (!dueAt) return 'Sense hora definida'
  return dueAt.toLocaleString('ca-ES', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  })
}

function getSnoozeUntilIso(minutes) {
  const date = new Date()
  date.setMinutes(date.getMinutes() + minutes)
  return date.toISOString()
}

function usePendingBrowserBadge(count) {
  const originalTitleRef = useRef('')
  const originalIconRef = useRef('')

  useEffect(() => {
    if (!originalTitleRef.current) originalTitleRef.current = document.title || 'Avaluapro'
    const icon = document.querySelector("link[rel~='icon']")
    if (icon && !originalIconRef.current) originalIconRef.current = icon.href

    const cleanTitle = originalTitleRef.current.replace(/^\(\d+\)\s*/, '') || 'Avaluapro'
    document.title = count > 0 ? `(${count}) ${cleanTitle}` : cleanTitle

    if (!icon) return
    if (count <= 0) {
      if (originalIconRef.current) icon.href = originalIconRef.current
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const context = canvas.getContext('2d')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, 64, 64)
    context.fillStyle = '#ff7a1a'
    context.beginPath()
    context.moveTo(32, 8)
    context.lineTo(54, 44)
    context.lineTo(10, 44)
    context.closePath()
    context.fill()
    context.fillStyle = '#1f2937'
    context.beginPath()
    context.arc(32, 38, 7, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = '#ef4444'
    context.beginPath()
    context.arc(48, 16, 14, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = '#ffffff'
    context.font = 'bold 18px sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(String(Math.min(count, 9)), 48, 16)
    icon.href = canvas.toDataURL('image/png')
  }, [count])
}

export function GlobalReminderLayer() {
  const tasks = useAvaluaproStore((state) => state.tasks)
  const taskRecords = useAvaluaproStore((state) => state.taskRecords)
  const students = useAvaluaproStore((state) => state.students)
  const agendaNotes = useAvaluaproStore((state) => state.agendaNotes)
  const teacherPackages = useAvaluaproStore((state) => state.cloud.teacherPackages || [])
  const tutoringInvitations = useAvaluaproStore((state) => state.cloud.sharedTutoringInvitations || [])
  const tutoringUpdates = useAvaluaproStore((state) => state.cloud.sharedTutoringInvitationUpdates || [])
  const coordinationItems = useAvaluaproStore((state) => state.cloud.tutoringCoordinationItems || [])
  const coordinationMemberStates = useAvaluaproStore(
    (state) => state.cloud.tutoringCoordinationMemberStates || [],
  )
  const cloudUser = useAvaluaproStore((state) => state.cloud.user)
  const classes = useAvaluaproStore((state) => state.classes)
  const updateTask = useAvaluaproStore((state) => state.updateTask)
  const updateTaskRecordMeta = useAvaluaproStore((state) => state.updateTaskRecordMeta)
  const updateAgendaNote = useAvaluaproStore((state) => state.updateAgendaNote)
  const setActiveClass = useAvaluaproStore((state) => state.setActiveClass)
  const setActiveMode = useAvaluaproStore((state) => state.setActiveMode)
  const setActiveTutoringPanel = useAvaluaproStore((state) => state.setActiveTutoringPanel)
  const markTutoringCoordinationRead = useAvaluaproStore((state) => state.markTutoringCoordinationRead)
  const acknowledgeTutoringCoordinationReminder = useAvaluaproStore(
    (state) => state.acknowledgeTutoringCoordinationReminder,
  )
  const [tick, setTick] = useState(() => Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => setTick(Date.now()), 30000)
    return () => window.clearInterval(interval)
  }, [])

  const dueReminders = useMemo(() => {
    const now = new Date(tick)
    const isDue = (reminder = {}) => {
      const dueAt = reminderDateTime(reminder)
      if (!dueAt || reminder.dismissedAt) return false
      if (reminder.snoozeUntil && new Date(reminder.snoozeUntil) > now) return false
      return dueAt <= now
    }

    return [
      ...agendaNotes
        .filter((note) => ['agendaReminder', 'generalReminder'].includes(note.type) && isDue(note.reminder))
        .map((note) => ({
          id: `agenda_${note.id}`,
          kind: note.type === 'agendaReminder' ? 'agenda' : 'general',
          note,
          reminder: note.reminder,
          student: students.find((student) => student.id === note.studentId),
          text: note.reminder?.text || note.text,
          title: note.type === 'agendaReminder' ? 'Nota a l’agenda pendent' : 'Recordatori pendent',
        })),
      ...tasks
        .filter((task) => isDue(task.reminder))
        .map((task) => ({
          id: `task_${task.id}`,
          kind: 'task',
          task,
          reminder: task.reminder,
          text: task.reminder?.text,
          title: task.title,
        })),
      ...taskRecords
        .filter((record) => isDue(record.reminder))
        .map((record) => {
          const task = tasks.find((item) => item.id === record.taskId)
          return {
            id: `record_${record.id}`,
            kind: 'record',
            record,
            reminder: record.reminder,
            student: students.find((student) => student.id === record.studentId),
            task,
            text: record.reminder?.text,
            title: task?.title || 'Recordatori de tasca',
          }
        })
        .filter((reminder) => reminder.task),
    ].sort((a, b) =>
      `${a.reminder?.date || ''}T${a.reminder?.time || '00:00'}`.localeCompare(
        `${b.reminder?.date || ''}T${b.reminder?.time || '00:00'}`,
      ),
    )
  }, [agendaNotes, students, taskRecords, tasks, tick])

  const pendingPackages = teacherPackages.filter((packageItem) => packageItem.status !== 'imported').length
  const pendingTutoringShares = tutoringInvitations.length + tutoringUpdates.length
  const unreadCoordinationItems = useMemo(
    () => getUnreadTutoringCoordinationItems(coordinationItems, coordinationMemberStates, cloudUser?.uid),
    [cloudUser?.uid, coordinationItems, coordinationMemberStates],
  )
  const pendingCoordinationReminders = useMemo(
    () => getPendingTutoringReminderAlerts(
      coordinationItems,
      coordinationMemberStates,
      cloudUser?.uid,
      new Date(tick),
    ),
    [cloudUser?.uid, coordinationItems, coordinationMemberStates, tick],
  )
  const coordinationAttentionItems = useMemo(() => {
    const byId = new Map()
    unreadCoordinationItems
      .filter((item) => (
        item.kind !== 'reminder'
        || !hasTutoringReminderAcknowledgement(item, coordinationMemberStates, cloudUser?.uid)
      ))
      .forEach((item) => byId.set(`${item.spaceId}:${item.id}`, { ...item, attention: 'unread' }))
    pendingCoordinationReminders.forEach((item) => {
      const key = `${item.spaceId}:${item.id}`
      const stage = item.reminderStage
      byId.set(key, { ...item, attention: byId.has(key) ? `unread-${stage}` : stage })
    })
    return Array.from(byId.values()).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
  }, [cloudUser?.uid, coordinationMemberStates, pendingCoordinationReminders, unreadCoordinationItems])
  const totalAttentionCount =
    dueReminders.length + coordinationAttentionItems.length + pendingPackages + pendingTutoringShares
  const visibleAttentionCount = dueReminders.length + coordinationAttentionItems.length
  usePendingBrowserBadge(totalAttentionCount)

  const snoozeReminder = async (reminder) => {
    const snoozeUntil = getSnoozeUntilIso(55)
    const nextReminder = { ...reminder.reminder, snoozeUntil }
    if (reminder.kind === 'agenda' || reminder.kind === 'general') {
      await updateAgendaNote(reminder.note.id, { reminder: nextReminder })
      return
    }
    if (reminder.kind === 'record' && reminder.student) {
      await updateTaskRecordMeta(reminder.student.id, reminder.task.id, { reminder: nextReminder })
      return
    }
    await updateTask(reminder.task.id, { reminder: nextReminder })
  }

  const dismissReminder = async (reminder) => {
    const dismissedAt = new Date().toISOString()
    const nextReminder = { ...reminder.reminder, dismissedAt }
    if (reminder.kind === 'agenda' || reminder.kind === 'general') {
      await updateAgendaNote(reminder.note.id, { reminder: nextReminder })
      return
    }
    if (reminder.kind === 'record' && reminder.student) {
      await updateTaskRecordMeta(reminder.student.id, reminder.task.id, { reminder: nextReminder })
      return
    }
    await updateTask(reminder.task.id, { reminder: nextReminder })
  }

  const openCoordinationItem = async (item) => {
    const classItem = classes.find((candidate) => candidate.sharedTutoringSpaceId === item.spaceId)
    if (classItem) await setActiveClass(classItem.id)
    setActiveMode('tutoring')
    setActiveTutoringPanel('coordination')
    await markTutoringCoordinationRead(item.spaceId)
  }

  const acceptCoordinationReminder = async (item) => {
    await acknowledgeTutoringCoordinationReminder(item.id, item.reminderStage)
  }

  if (visibleAttentionCount === 0) return null

  return (
    <aside className="global-reminder-layer" role="status" aria-live="polite">
      <header>
        <span>
          <Bell size={17} />
          Avisos pendents
        </span>
        <strong>{visibleAttentionCount}</strong>
      </header>
      {coordinationAttentionItems.slice(0, 3).map((item) => {
        const classItem = classes.find((candidate) => candidate.sharedTutoringSpaceId === item.spaceId)
        const isDue = item.attention.includes('due')
        const isPreReminder = item.attention.includes('pre')
        return (
          <article className={`global-reminder-card coordination ${isDue ? 'due' : ''} ${isPreReminder ? 'pre' : ''} ${item.kind === 'urgent' ? 'urgent' : ''}`} key={`coord_${item.spaceId}_${item.id}`}>
            {item.kind === 'reminder'
              ? <BellRing size={19} />
              : item.kind === 'urgent'
                ? <AlertOctagon size={19} />
                : <MessageCircle size={19} />}
            <div>
              <strong>
                {isDue
                  ? 'Recordatori de cotutoria: falten menys de 2 hores'
                  : isPreReminder
                    ? 'Preavís de cotutoria: falta menys d’un dia'
                  : item.kind === 'urgent'
                    ? 'Missatge urgent de cotutoria'
                  : item.kind === 'reminder'
                    ? 'Nou recordatori de cotutoria'
                    : 'Nou missatge de cotutoria'}
              </strong>
              <span>{classItem?.name || 'Tutoria compartida'}</span>
              <small>{item.authorName || item.authorEmail}</small>
            </div>
            <div className="global-reminder-actions">
              <button className="secondary-action compact" onClick={() => openCoordinationItem(item)} type="button">
                Obrir coordinació
              </button>
              {(isDue || isPreReminder) && item.kind === 'reminder' && (
                <button className="primary-action compact" onClick={() => acceptCoordinationReminder(item)} type="button">
                  <CheckCircle2 size={15} /> {isPreReminder ? 'Acceptar preavís' : 'Acceptar recordatori'}
                </button>
              )}
            </div>
          </article>
        )
      })}
      {dueReminders.slice(0, 3).map((reminder) => (
        <article className={`global-reminder-card ${reminder.kind}`} key={reminder.id}>
          {reminder.kind === 'agenda' ? <Skull size={19} /> : <Clock3 size={19} />}
          <div>
            <strong>{reminder.title}</strong>
            {reminder.student && <span>{reminder.student.name}</span>}
            {reminder.kind === 'task' && <span>Recordatori de tota la classe</span>}
            {reminder.kind === 'general' && <span>Recordatori general</span>}
            {reminder.kind === 'agenda' && <span>Recorda registrar la nota a l’agenda.</span>}
            <small>{formatDue(reminder.reminder)}</small>
            {reminder.text && <p>{reminder.text}</p>}
          </div>
          <div className="global-reminder-actions">
            <button className="secondary-action compact" onClick={() => snoozeReminder(reminder)} type="button">
              Ajornar 55 min
            </button>
            <button className="primary-action compact" onClick={() => dismissReminder(reminder)} type="button">
              <CheckCircle2 size={15} />
              Vist
            </button>
          </div>
        </article>
      ))}
      {pendingPackages > 0 && (
        <div className="global-package-pending">
          <Mail size={15} />
          {pendingPackages} paquet/s de notes pendent/s de revisar.
        </div>
      )}
    </aside>
  )
}
