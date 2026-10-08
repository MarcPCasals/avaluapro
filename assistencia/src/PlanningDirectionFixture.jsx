import { useState } from 'react'
import { PlanningSharedView } from '../../src/features/planning/PlanningSharedView.jsx'
import { PlanningSharingDialog } from '../../src/features/planning/PlanningSharingDialog.jsx'
import '../../src/features/planning/planning.css'

const unit = { id: 'synthetic-direction-up', code: 'UP DEMO', title: 'Investigació de materials', level: '1r', complexSituation: 'Com podem comparar materials?', curriculum: {} }
const activities = [{ id: 'a', phaseId: 'p', type: 'activity', title: 'Experiment amb mostres', description: 'Observem i comparem materials ficticis.', plannedMinutes: 55, grouping: 'Gran grup', diversityMeasures: [], order: 0 }]
const phases = [{ id: 'p', title: 'Preparació', order: 0 }]
export function PlanningDirectionFixture() {
  const [sharing, setSharing] = useState(false)
  const [minutes, setMinutes] = useState(70)
  const applications = [{ application: { id: 'g', classLabel: 'Grup fictici', status: 'active' }, overrides: [{ activityId: 'a', changes: { plannedMinutes: minutes, diversityMeasures: [{ id: 'm', label: 'Suport visual', studentNames: ['Alumne fictici'] }] } }], sessions: [{ session: { id: 's', startsAt: '2026-10-08T09:00:00', durationMinutes: 55, status: 'held' }, items: [{ id: 'i', title: 'Experiment amb mostres', plannedMinutes: 55, sourceActivityId: 'a' }, { id: 'extra', title: 'Posada en comú afegida', plannedMinutes: 10 }], results: [{ sessionItemId: 'i', actualMinutes: 60 }] }] }]
  return <main><div className="planning-direction-status"><span>Dades exclusivament fictícies · prova de la vista de direcció</span><button type="button" onClick={() => setMinutes((value) => value + 5)}>Simular canvi de minuts</button></div><PlanningSharedView unit={unit} activities={activities} phases={phases} role="owner" liveApplications={applications} onShare={() => setSharing(true)} />{sharing && <PlanningSharingDialog unit={unit} classes={[]} grants={[]} onClose={() => setSharing(false)} onSave={async () => {}} onRevoke={async () => {}} />}</main>
}
