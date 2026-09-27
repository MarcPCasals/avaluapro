import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AssistanceApp from './src/AssistanceApp.jsx'
import './src/assistance.css'
import { installAssistanceRuntimeBoundary } from './src/secureRuntime.js'

installAssistanceRuntimeBoundary()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AssistanceApp />
  </StrictMode>,
)
