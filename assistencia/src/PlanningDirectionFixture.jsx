import { useState } from 'react'
import { PlanningSharedView } from '../../src/features/planning/PlanningSharedView.jsx'
import { PlanningSharingDialog } from '../../src/features/planning/PlanningSharingDialog.jsx'
import '../../src/features/planning/planning.css'

const unit = { id: 'synthetic-direction-up', code: 'UP DEMO', title: 'Investigació de materials', level: '1r', complexSituation: 'Com podem comparar materials?', curriculum: {}, transversalMaterials: [{ kind: 'link', label: 'Recurs de la UP', url: 'https://example.com/up' }] }
const activities = [
  { id: 'a', phaseId: 'p', type: 'activity', title: 'Experiment amb mostres', description: 'Observem i comparem materials ficticis.\n\nCada grup prepara les mostres, descriu les propietats i comparteix les seves conclusions. Aquesta descripció llarga permet comprovar que el temps i l’agrupament mantenen una mida compacta.\n\nPreparem una taula, revisem les mesures i discutim els resultats.', plannedMinutes: 55, grouping: 'Gran grup · Individual/Parelles · Individual', space: 'Pati', diversityMeasures: [], order: 0, studentMaterials: [{ kind: 'link', label: 'Fitxa de les mostres', url: 'https://example.com/fitxa', teacherUrl: 'https://example.com/guia' }] },
  { id: 'f', phaseId: 'p', type: 'activity', title: 'Comparació de conclusions', description: 'Cada grup explica què ha observat i contrasta les conclusions amb les de la resta de la classe.', plannedMinutes: 15, grouping: 'Grups de 4', order: 1, studentMaterials: [{ kind: 'link', label: 'Taula de conclusions', url: 'https://example.com/conclusions' }] },
  { id: 'b', phaseId: 'root', type: 'activity', title: 'Observació programada', plannedMinutes: 20, order: 1 },
  { id: 'c', phaseId: 'r', type: 'activity', title: 'Ampliació sense espai', plannedMinutes: 70, order: 2 },
  { id: 'd', phaseId: 'r', type: 'activity', title: 'Activitat retirada del grup', plannedMinutes: 10, order: 3 },
  { id: 'e', phaseId: 't', type: 'activity', title: 'Conclusió feta sense canvis', plannedMinutes: 30, order: 4 },
]
const phases = [{ id: 'p', title: 'P1 · Motivació', kind: 'preparation', parentPhaseId: 'root', order: 0 }, { id: 'root', title: 'Preparació', kind: 'preparation', order: 0 }, { id: 'r', title: 'Resolució', kind: 'resolution', order: 1 }, { id: 't', title: 'Tancament', kind: 'closing', order: 2 }]
export function PlanningDirectionFixture() {
  const readOnly = new URLSearchParams(location.search).has('read-only')
  const [sharing, setSharing] = useState(false)
  const [grants, setGrants] = useState([])
  const [minutes, setMinutes] = useState(70)
  const applications = [{ application: { id: 'other', classId: 'other-class', classLabel: 'Un altre grup fictici', status: 'active' }, overrides: [{ id: 'other-a', activityId: 'a', changes: { title: 'Programació d’un altre grup', plannedMinutes: 10, studentMaterials: [] } }], sessions: [] }, { application: { id: 'g', classId: 'demo-class', classLabel: 'Grup fictici', status: 'active' }, overrides: [{ activityId: 'a', changes: { plannedMinutes: minutes, diversityMeasures: [{ id: 'm', label: 'Suport visual', studentNames: ['Alumne fictici'] }] } }, { activityId: 'd', changes: { hidden: true } }], sessions: [
    { session: { id: 's', startsAt: '2026-10-08T09:00:00', durationMinutes: 60, status: 'held' }, items: [{ id: 'i', title: 'Experiment amb mostres', plannedMinutes: 55, sourceActivityId: 'a' }, { id: 'extra', title: 'Posada en comú afegida', plannedMinutes: 10 }], results: [{ sessionItemId: 'i', status: 'completed', actualMinutes: 60 }] },
    { session: { id: 'next', startsAt: '2026-10-09T09:00:00', durationMinutes: 60, status: 'planned' }, items: [{ id: 'next-i', title: 'Observació programada', plannedMinutes: 20, sourceActivityId: 'b' }], results: [] },
    { session: { id: 'closing', startsAt: '2026-10-10T09:00:00', durationMinutes: 60, status: 'held' }, items: [{ id: 'closing-i', title: 'Conclusió feta sense canvis', plannedMinutes: 30, sourceActivityId: 'e' }], results: [{ sessionItemId: 'closing-i', status: 'completed', actualMinutes: 30 }] },
  ] }]
  return <main><div className="planning-direction-status"><span>Dades exclusivament fictícies · prova de la vista de direcció</span>{!readOnly && <button type="button" onClick={() => setMinutes((value) => value + 5)}>Simular canvi de minuts</button>}</div><PlanningSharedView unit={unit} activities={activities} phases={phases} initialApplicationId="g" role={readOnly ? 'directionReader' : 'owner'} liveApplications={readOnly ? applications.filter((bundle) => bundle.application.id === 'g') : applications} onShare={readOnly ? undefined : (applicationId) => setSharing(applicationId)} />{sharing && <PlanningSharingDialog applications={applications.map((bundle) => bundle.application)} unit={unit} classes={[]} grants={grants} onClose={() => setSharing(false)} onSave={async (draft) => setGrants((current) => [...current.filter((grant) => grant.granteeEmail !== draft.email), { ...draft, granteeEmail: draft.email }])} onRevoke={async (grant) => setGrants((current) => current.filter((item) => item.granteeEmail !== grant.granteeEmail))} />}</main>
}
