import 'fake-indexeddb/auto'
import React, { Component, StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import '../../src/App.css'
const memory = new Map()
Object.defineProperty(window, 'localStorage', { configurable: true, value: { getItem: key => memory.get(key) || null, setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key) } })
const { useAvaluaproStore } = await import('../../src/store/useAvaluaproStore.js')
const { seedDataset } = await import('../../src/data/seedData.js')
const { TopBar } = await import('../../src/components/TopBar.jsx')
const { MainNavigation } = await import('../../src/components/MainNavigation.jsx')
const { SemesterUtTabs } = await import('../../src/components/SemesterUtTabs.jsx')
const Tutoring = lazy(() => import('../../src/features/tutoring/TutoringView.jsx').then(m => ({ default: m.TutoringView })))
const Students = lazy(() => import('../../src/features/students/StudentOverviewView.jsx').then(m => ({ default: m.StudentOverviewView })))
const Evaluation = lazy(() => import('../../src/features/evaluation/EvaluationView.jsx').then(m => ({ default: m.EvaluationView })))
const Tracking = lazy(() => import('../../src/features/tracking/TrackingView.jsx').then(m => ({ default: m.TrackingView })))
const Analytics = lazy(() => import('../../src/features/analytics/AnalyticsView.jsx').then(m => ({ default: m.AnalyticsView })))
const Planning = lazy(() => import('../../src/features/planning/PlanningModule.jsx'))
const Agenda = lazy(() => import('../../src/features/agenda/AgendaModule.jsx'))
const data = structuredClone(seedDataset)
data.classes[0] = { ...data.classes[0], name: 'Grup A · Fictici', isTutoringGroup: true }
data.classes.push({ id: 'synthetic-b', name: 'Grup B · Fictici', subject: 'Tutoria', isTutoringGroup: true, color: 'green', order: 2 })
data.students = data.students.slice(0, 3).map((item, i) => ({ ...item, name: ['Maria Exemple', 'Àlex Prova', 'Júlia Fictícia'][i] }))
data.students.push({ id: 'synthetic-maria-b', classId: 'synthetic-b', name: 'Maria Exemple', halfGroup: 'Grup A', diagnoses: [] })
data.tutorialRecords = [
  { id: 'synthetic-doip-a', classId: data.classes[0].id, studentId: data.students[0].id, type: 'doip', date: '2026-10-20', note: 'Preguntes:\nCom va el treball de laboratori?\n\nRespostes:\nMostra autonomia en la pràctica de fotosíntesi.' },
  { id: 'synthetic-doip-b', classId: 'synthetic-b', studentId: 'synthetic-maria-b', type: 'doip', date: '2026-10-21', note: 'Preguntes:\nCom organitza el material?\n\nRespostes:\nPorta el quadern de camp preparat.' },
  { id: 'synthetic-interview', classId: data.classes[0].id, studentId: data.students[1].id, type: 'family-contact', date: '2026-10-19', note: 'Entrevista fictícia: hem acordat revisar el dossier de geologia cada divendres.' },
]
const previous = useAvaluaproStore.getState()
useAvaluaproStore.setState({ ...data, status: 'ready', ui: { ...previous.ui, activeClassId: data.classes[0].id, activeSemesterId: data.semesters[0]?.id, activeUtId: data.uts[0]?.id, activeMode: 'evaluation' }, cloud: { ...previous.cloud, user: null }, onboarding: { ...previous.onboarding, guideOpen: false } })
class Boundary extends Component {
  state = { error: '' }
  static getDerivedStateFromError(error) { return { error: error.stack || error.message } }
  render() { return this.state.error ? <pre role="alert">{this.state.error}</pre> : this.props.children }
}
function Preview() {
  const mode = useAvaluaproStore(state => state.ui.activeMode)
  const View = { tutoring: Tutoring, students: Students, evaluation: Evaluation, tracking: Tracking, analytics: Analytics, planning: Planning, agenda: Agenda }[mode] || Evaluation
  return <><div style={{ background: '#fef3c7', color: '#713f12', padding: '6px 16px', fontSize: 12 }}>PROVA SINTÈTICA · Sense connexió al núvol · Dades en memòria</div><TopBar /><MainNavigation /><SemesterUtTabs /><Boundary key={mode}><Suspense fallback={<p>Carregant pantalla…</p>}><View /></Suspense></Boundary></>
}
createRoot(document.getElementById('root')).render(<StrictMode><Boundary><Preview /></Boundary></StrictMode>)
