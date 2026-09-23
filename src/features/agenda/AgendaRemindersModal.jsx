import { useMemo } from 'react'
import { RemindersModal } from '../data/RemindersModal'
import { buildReminderSessionOptions, mergeAgendaClassCatalog } from '../../lib/agendaToday'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'
import { useAgendaWorkspace } from './useAgendaWorkspace'

/**
 * Dona a la campana global el mateix context d'horari i sessions que té
 * l'Agenda. Així els dos accessos a Recordatoris ofereixen les mateixes
 * pròximes classes, incloses les que encara no tenen cap UP vinculada.
 */
export function AgendaRemindersModal({ onClose }) {
  const user = useAvaluaproStore((state) => state.cloud.user)
  const classes = useAvaluaproStore((state) => state.classes)
  const workspace = useAgendaWorkspace(user, classes)
  const agendaClasses = useMemo(() => mergeAgendaClassCatalog({
    bundles: workspace.sessionBundles,
    classes,
    sharedClasses: workspace.sharedClasses,
  }), [classes, workspace.sessionBundles, workspace.sharedClasses])
  const sessionOptions = useMemo(() => buildReminderSessionOptions({
    bundles: workspace.sessionBundles,
    calendarEvents: workspace.calendarEvents,
    classes: agendaClasses,
    slots: workspace.slots,
    timetable: workspace.activeTimetable,
    today: workspace.today,
  }), [
    agendaClasses,
    workspace.activeTimetable,
    workspace.calendarEvents,
    workspace.sessionBundles,
    workspace.slots,
    workspace.today,
  ])

  return (
    <RemindersModal
      onClose={onClose}
      sessionOptions={sessionOptions}
      sessionOptionsLoading={workspace.loading || workspace.sessionsLoading}
    />
  )
}
