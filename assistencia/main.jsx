import { EditHistoryFixture } from './src/EditHistoryFixture.jsx'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PlanningDirectionFixture } from './src/PlanningDirectionFixture.jsx'
import AssistanceApp from './src/AssistanceApp.jsx'
import './src/assistance.css'
import { installAssistanceRuntimeBoundary } from './src/secureRuntime.js'

installAssistanceRuntimeBoundary()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {new URLSearchParams(window.location.search).has('edit-history-demo') ? <EditHistoryFixture /> : new URLSearchParams(window.location.search).has('planning-direction-demo') ? <PlanningDirectionFixture /> : <AssistanceApp />}
  </StrictMode>,
)
