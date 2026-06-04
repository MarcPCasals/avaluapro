import { useEffect } from 'react'
import { Info, Loader2, PlayCircle, Trash2 } from 'lucide-react'
import { MainNavigation } from './components/MainNavigation'
import { SemesterUtTabs } from './components/SemesterUtTabs'
import { TopBar } from './components/TopBar'
import { AnalyticsView } from './features/analytics/AnalyticsView'
import { EvaluationView } from './features/evaluation/EvaluationView'
import { GuidedTour } from './features/help/GuidedTour'
import { TeacherProfileModal } from './features/profile/TeacherProfileModal'
import { TrackingView } from './features/tracking/TrackingView'
import { TutoringView } from './features/tutoring/TutoringView'
import { useAvaluaproStore } from './store/useAvaluaproStore'
import './App.css'

function DemoBanner() {
  const openGuide = useAvaluaproStore((state) => state.openGuide)
  const startOwnData = useAvaluaproStore((state) => state.startOwnData)

  return (
    <section className="demo-banner" data-tour="demo-banner">
      <div className="demo-banner-copy">
        <span className="demo-pill">
          <Info size={16} />
          Dades demo
        </span>
        <div>
          <strong>Comences amb una aula inventada perquè vegis com funcionarà Avaluapro amb dades completes.</strong>
          <p>
            Les notes, tasques, comentaris i estadístiques són fictícies. Fes la guia interactiva i, quan estiguis a punt,
            esborra la demo per començar amb la teva matèria, classes i alumnes.
          </p>
        </div>
      </div>
      <div className="demo-banner-actions">
        <button className="secondary-action compact" onClick={() => openGuide('demo')} type="button">
          <PlayCircle size={16} />
          Veure guia
        </button>
        <button className="primary-action compact" data-tour="start-own-data" onClick={startOwnData} type="button">
          <Trash2 size={16} />
          Començar amb les meves dades
        </button>
      </div>
    </section>
  )
}

function App() {
  const initialize = useAvaluaproStore((state) => state.initialize)
  const status = useAvaluaproStore((state) => state.status)
  const error = useAvaluaproStore((state) => state.error)
  const cloud = useAvaluaproStore((state) => state.cloud)
  const activeMode = useAvaluaproStore((state) => state.ui.activeMode)
  const defaultSubject = useAvaluaproStore((state) => state.profile.defaultSubject)
  const onboarding = useAvaluaproStore((state) => state.onboarding)

  useEffect(() => {
    initialize()
  }, [initialize])

  if (status === 'loading' || status === 'idle') {
    return (
      <main className="loading-screen">
        <Loader2 size={42} />
        <p>Carregant Avaluapro...</p>
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
      {onboarding.demoMode && <DemoBanner />}
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
        {activeMode === 'tutoring' && <TutoringView />}
      </main>
      {!defaultSubject && !onboarding.demoMode && <TeacherProfileModal forceSetup onClose={() => {}} />}
      <GuidedTour />
    </div>
  )
}

export default App
