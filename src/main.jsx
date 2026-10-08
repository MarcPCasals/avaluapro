import { lazy, Suspense, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { installModuleLoadRecovery } from './lib/moduleLoadRecovery.js'

// eslint-disable-next-line react-refresh/only-export-components
const PlanningDirectionPage = lazy(() => import('./features/planning/PlanningDirectionPage.jsx'))
// eslint-disable-next-line react-refresh/only-export-components
const StudentOverviewDirectionPage = lazy(() => import('./features/students/StudentOverviewDirectionPage.jsx'))
const studentShareId = new URLSearchParams(window.location.search).get('students-view')
const directionApplicationId = new URLSearchParams(window.location.search).get('planning-group')
const directionUnitId = new URLSearchParams(window.location.search).get('planning-view')

// Si hi ha una publicació nova mentre la pestanya continua oberta, recupera
// automàticament els mòduls d'Agenda, Programació i la resta de pantalles.
installModuleLoadRecovery()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={<p>Carregant…</p>}>{studentShareId ? <StudentOverviewDirectionPage shareId={studentShareId} /> : directionUnitId ? <PlanningDirectionPage applicationId={directionApplicationId} unitId={directionUnitId} /> : <App />}</Suspense>
  </StrictMode>,
)
