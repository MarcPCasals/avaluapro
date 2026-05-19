import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { MainNavigation } from './components/MainNavigation'
import { SemesterUtTabs } from './components/SemesterUtTabs'
import { TopBar } from './components/TopBar'
import { AnalyticsView } from './features/analytics/AnalyticsView'
import { EvaluationView } from './features/evaluation/EvaluationView'
import { TeacherProfileModal } from './features/profile/TeacherProfileModal'
import { TrackingView } from './features/tracking/TrackingView'
import { useAvaluaproStore } from './store/useAvaluaproStore'
import './App.css'

function App() {
  const initialize = useAvaluaproStore((state) => state.initialize)
  const status = useAvaluaproStore((state) => state.status)
  const error = useAvaluaproStore((state) => state.error)
  const cloud = useAvaluaproStore((state) => state.cloud)
  const activeMode = useAvaluaproStore((state) => state.ui.activeMode)
  const defaultSubject = useAvaluaproStore((state) => state.profile.defaultSubject)

  useEffect(() => {
    initialize()
  }, [initialize])

  if (status === 'loading' || status === 'idle') {
    return (
      <main className="loading-screen">
        <Loader2 size={42} />
        <p>Carregant Avaluapro V2...</p>
      </main>
    )
  }

  if (status === 'error') {
    return (
      <main className="loading-screen error">
        <h1>No s’han pogut carregar les dades locals.</h1>
        <p>{error}</p>
      </main>
    )
  }

  return (
    <div className="app-shell">
      <TopBar />
      {error && (
        <div className="storage-alert">
          <strong>{error}</strong>
          <span>
            Recomanació: descarrega una còpia de seguretat, elimina o arxiva dades antigues de
            tasques i seguiment, i torna-ho a provar. Si el problema continua, contacta amb{' '}
            <a href="mailto:mperezc@educand.ad">mperezc@educand.ad</a>.
          </span>
        </div>
      )}
      {cloud.error && (
        <div className="storage-alert cloud-error">
          <strong>No s’ha pogut sincronitzar amb Firebase.</strong>
          <span>{cloud.error}</span>
        </div>
      )}
      <MainNavigation />
      <SemesterUtTabs />
      <main className="content-area">
        {activeMode === 'evaluation' && <EvaluationView />}
        {activeMode === 'tracking' && <TrackingView />}
        {activeMode === 'analytics' && <AnalyticsView />}
      </main>
      {!defaultSubject && <TeacherProfileModal forceSetup onClose={() => {}} />}
    </div>
  )
}

export default App
