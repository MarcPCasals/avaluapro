import { Bell, CheckCircle2, Clock3, RotateCcw } from 'lucide-react'
import { useMemo } from 'react'
import { Modal } from '../../components/Modal'
import { getPlanningReminderSummary } from '../../lib/reminders'

function formatDate(dateKey) {
  if (!dateKey) return 'Sense data'
  return new Intl.DateTimeFormat('ca-AD', { day: 'numeric', month: 'short', weekday: 'short' })
    .format(new Date(`${dateKey}T12:00:00`))
}

function statusLabel(status) {
  if (status === 'completed') return 'Fet'
  if (status === 'cancelled') return 'Cancel·lat'
  return 'Pendent'
}

export function PlanningRemindersDialog({ agendaNotes, classes, onClose, onUpdate, unit }) {
  const summary = useMemo(
    () => getPlanningReminderSummary({ agendaNotes, classes, planningUnitId: unit.id }),
    [agendaNotes, classes, unit.id],
  )

  const toggleCompleted = async (item) => {
    if (item.status === 'cancelled') return
    const completedAt = item.status === 'completed' ? '' : new Date().toISOString()
    await onUpdate(item.note.id, {
      preparation: { ...item.note.preparation, completedAt },
      reminder: { ...item.note.reminder, dismissedAt: completedAt },
    })
  }

  return (
    <Modal onClose={onClose} size="lg" title={`Recordatoris · ${unit.code}`}>
      <div className="planning-reminders-dialog">
        <header>
          <span><Bell size={20} /></span>
          <div>
            <strong>{summary.count} preparacions pendents</strong>
            <p>{unit.title}</p>
          </div>
        </header>
        {summary.items.length === 0 ? (
          <div className="planning-reminders-empty">
            <CheckCircle2 size={25} />
            <strong>Aquesta UP no té cap preparació pendent.</strong>
            <p>Els materials marcats com comprar, imprimir, reservar o preparar apareixeran aquí quan tinguin sessió.</p>
          </div>
        ) : (
          <div className="planning-reminders-list">
            {summary.items.map((item) => (
              <article className={item.status} key={item.id}>
                <div className="planning-reminder-date">
                  <Clock3 size={16} />
                  <span>{formatDate(item.reminder?.date)}</span>
                </div>
                <div className="planning-reminder-copy">
                  <strong>{item.title}</strong>
                  <span>
                    {item.classItem?.name || 'Grup'}
                    {item.note.preparation?.sessionStartsAt
                      ? ` · classe ${formatDate(String(item.note.preparation.sessionStartsAt).slice(0, 10))}`
                      : ''}
                  </span>
                </div>
                <span className={`planning-reminder-status ${item.status}`}>{statusLabel(item.status)}</span>
                {item.status !== 'cancelled' && (
                  <button className="secondary-action compact" onClick={() => toggleCompleted(item)} type="button">
                    {item.status === 'completed' ? <RotateCcw size={14} /> : <CheckCircle2 size={14} />}
                    {item.status === 'completed' ? 'Reobrir' : 'Fet'}
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
