import { useEffect, useState } from 'react'
import { CheckCircle2, Info, Loader2, PlayCircle, Share2, Trash2, XCircle } from 'lucide-react'
import { GlobalReminderLayer } from './components/GlobalReminderLayer'
import { MainNavigation } from './components/MainNavigation'
import { Modal } from './components/Modal'
import { SemesterUtTabs } from './components/SemesterUtTabs'
import { TopBar } from './components/TopBar'
import { AnalyticsView } from './features/analytics/AnalyticsView'
import { EvaluationView } from './features/evaluation/EvaluationView'
import { GuidedTour } from './features/help/GuidedTour'
import { TeacherProfileModal } from './features/profile/TeacherProfileModal'
import { TrackingView } from './features/tracking/TrackingView'
import { SociometricPublicForm } from './features/tutoring/SociometricPublicForm'
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

function TutoringInvitationCenter() {
  const cloud = useAvaluaproStore((state) => state.cloud)
  const acceptSharedTutoringInvitation = useAvaluaproStore((state) => state.acceptSharedTutoringInvitation)
  const rejectSharedTutoringInvitation = useAvaluaproStore((state) => state.rejectSharedTutoringInvitation)
  const acknowledgeSharedTutoringInvitationUpdate = useAvaluaproStore(
    (state) => state.acknowledgeSharedTutoringInvitationUpdate,
  )
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const invitation = cloud.sharedTutoringInvitations?.[0]
  const update = !invitation ? cloud.sharedTutoringInvitationUpdates?.[0] : null

  if (!cloud.user?.email || (!invitation && !update)) return null

  const handleAccept = async () => {
    setBusy('accept')
    setMessage('')
    try {
      await acceptSharedTutoringInvitation(invitation.spaceId || invitation.id)
    } catch (error) {
      setMessage(error.message || 'No s’ha pogut acceptar aquesta cotutoria.')
    } finally {
      setBusy('')
    }
  }

  const handleReject = async () => {
    setBusy('reject')
    setMessage('')
    try {
      await rejectSharedTutoringInvitation(invitation.spaceId || invitation.id)
    } catch (error) {
      setMessage(error.message || 'No s’ha pogut rebutjar aquesta cotutoria.')
    } finally {
      setBusy('')
    }
  }

  const handleAcknowledge = async () => {
    setBusy('ack')
    await acknowledgeSharedTutoringInvitationUpdate(update.spaceId || update.id)
    setBusy('')
  }

  if (invitation) {
    return (
      <Modal onClose={() => {}} panelClassName="tutoring-invitation-modal" title="Sol·licitud de cotutoria">
        <div className="tutoring-invitation-card">
          <span className="tutoring-invitation-icon">
            <Share2 size={28} />
          </span>
          <div>
            <h3>{invitation.className || 'Tutoria compartida'}</h3>
            <p>
              <strong>{invitation.senderEmail || invitation.senderEmailLower}</strong> t’ha convidat a compartir
              aquesta tutoria. Si acceptes, Avaluapro obrirà directament aquesta classe en mode tutoria.
            </p>
          </div>
        </div>
        {message && <p className="inline-error">{message}</p>}
        <div className="modal-actions">
          <button className="secondary-action" disabled={Boolean(busy)} onClick={handleReject} type="button">
            <XCircle size={17} />
            Rebutjar
          </button>
          <button className="primary-action" disabled={Boolean(busy)} onClick={handleAccept} type="button">
            {busy === 'accept' ? <Loader2 size={17} /> : <CheckCircle2 size={17} />}
            Acceptar i obrir
          </button>
        </div>
      </Modal>
    )
  }

  const accepted = update.status === 'accepted'
  return (
    <Modal onClose={handleAcknowledge} panelClassName="tutoring-invitation-modal" title="Resposta de cotutoria">
      <div className={`tutoring-invitation-card ${accepted ? 'accepted' : 'rejected'}`}>
        <span className="tutoring-invitation-icon">
          {accepted ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
        </span>
        <div>
          <h3>{update.className || 'Tutoria compartida'}</h3>
          <p>
            <strong>{update.responseByEmail || update.recipientEmailLower}</strong>{' '}
            {accepted ? 'ha acceptat' : 'ha rebutjat'} la sol·licitud de cotutoria.
          </p>
        </div>
      </div>
      <div className="modal-actions">
        <button className="primary-action" disabled={busy === 'ack'} onClick={handleAcknowledge} type="button">
          Entesos
        </button>
      </div>
    </Modal>
  )
}

function App() {
  const publicParams = new URLSearchParams(window.location.search)
  const sociometricSurveyId = publicParams.get('sociometric')
  const sociometricAccessToken = publicParams.get('token')
  const initialize = useAvaluaproStore((state) => state.initialize)
  const status = useAvaluaproStore((state) => state.status)
  const error = useAvaluaproStore((state) => state.error)
  const cloud = useAvaluaproStore((state) => state.cloud)
  const activeMode = useAvaluaproStore((state) => state.ui.activeMode)
  const defaultSubject = useAvaluaproStore((state) => state.profile.defaultSubject)
  const onboarding = useAvaluaproStore((state) => state.onboarding)

  useEffect(() => {
    if (sociometricSurveyId) return
    initialize()
  }, [initialize, sociometricSurveyId])

  if (sociometricSurveyId) {
    return <SociometricPublicForm accessToken={sociometricAccessToken} surveyId={sociometricSurveyId} />
  }

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
      <GlobalReminderLayer />
      <TutoringInvitationCenter />
      {!defaultSubject && !onboarding.demoMode && <TeacherProfileModal forceSetup onClose={() => {}} />}
      <GuidedTour />
    </div>
  )
}

export default App
