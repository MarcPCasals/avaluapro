import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { installModuleLoadRecovery } from './lib/moduleLoadRecovery.js'

// Si hi ha una publicació nova mentre la pestanya continua oberta, recupera
// automàticament els mòduls d'Agenda, Programació i la resta de pantalles.
installModuleLoadRecovery()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
