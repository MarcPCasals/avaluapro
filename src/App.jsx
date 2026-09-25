import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, Loader2, PlayCircle, Share2, ShieldCheck, Trash2, XCircle } from 'lucide-react'
import { GlobalReminderLayer } from './components/GlobalReminderLayer'
import { MainNavigation } from './components/MainNavigation'
import { Modal } from './components/Modal'
import { SemesterUtTabs } from './components/SemesterUtTabs'
import { TopBar } from './components/TopBar'
import { GuidedTour } from './features/help/GuidedTour'
import { TeacherProfileModal } from './features/profile/TeacherProfileModal'
import { ReleaseAnnouncementModal } from './features/release/ReleaseAnnouncementModal'
import {
  PRE_UPDATE_RELEASE,
  acknowledgeRelease,
  getPreUpdateReleaseGate,
  isReleaseAcknowledged,
} from './lib/preUpdateRelease'
import { useAvaluaproStore } from './store/useAvaluaproStore'
import './App.css'

const AgendaModule = lazy(() => import('./features/agenda/AgendaModule'))
const AnalyticsView = lazy(() =>
  import('./features/analytics/AnalyticsView').then((module) => ({ default: module.AnalyticsView })),
)
const EvaluationView = lazy(() =>
  import('./features/evaluation/EvaluationView').then((module) => ({ default: module.EvaluationView })),
)
const PlanningModule = lazy(() => import('./features/planning/PlanningModule'))
const SociometricPublicForm = lazy(() =>
  import('./features/tutoring/SociometricPublicForm').then((module) => ({ default: module.SociometricPublicForm })),
)
const StudentOverviewView = lazy(() =>
  import('./features/students/StudentOverviewView').then((module) => ({ default: module.StudentOverviewView })),
)
const StudentProfilePublicForm = lazy(() =>
  import('./features/tutoring/StudentProfilePublicForm').then((module) => ({ default: module.StudentProfilePublicForm })),
)
const TrackingView = lazy(() =>
  import('./features/tracking/TrackingView').then((module) => ({ default: module.TrackingView })),
)
const TutoringView = lazy(() =>
  import('./features/tutoring/TutoringView').then((module) => ({ default: module.TutoringView })),
)

const TIMELINE_MODES = new Set(['evaluation', 'tracking', 'analytics', 'tutoring'])

function ReleaseProtectionBanner({ error = '', onRetry, state }) {
  if (state === 'ready' || state === 'demo') return null

  const isBlocked = state === 'review' || state === 'error'
  const message = state === 'signed-out'
    ? 'Inicia sessió amb Google per crear la còpia de seguretat prèvia al núvol.'
    : state === 'review'
      ? 'Hi ha dues versions diferents de les dades. Resol «Revisió necessària» per completar la còpia prèvia.'
      : state === 'error'
        ? error || 'No s’ha pogut confirmar la còpia al núvol. Pots continuar treballant i tornar-ho a provar.'
        : state === 'saving'
          ? 'Estem creant «Còpia de seguretat pre actualització» al teu compte.'
          : 'Estem esperant que Firebase acabi de confirmar les dades abans de crear la còpia.'

  return (
    <section className={`release-protection-banner ${isBlocked ? 'blocked' : ''}`} role="status">
      <span>{isBlocked ? <AlertTriangle size={20} /> : <ShieldCheck size={20} />}</span>
      <div>
        <strong>{isBlocked ? 'La protecció necessita una revisió' : 'Preparant l’actualització amb seguretat'}</strong>
        <p>{message}</p>
      </div>
      {state === 'error' && (
        <button className="secondary-action compact" onClick={onRetry} type="button">
          Tornar-ho a provar
        </button>
      )}
    </section>
  )
}

function ModuleLoadingFallback({ label = 'Carregant espai...' }) {
  return (
    <div className="module-loading" role="status">
      <Loader2 size={28} />
      <span>{label}</span>
    </div>
  )
}

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
  const studentProfileSurveyId = publicParams.get('student-profile')
  const initialize = useAvaluaproStore((state) => state.initialize)
  const status = useAvaluaproStore((state) => state.status)
  const error = useAvaluaproStore((state) => state.error)
  const cloud = useAvaluaproStore((state) => state.cloud)
  const ensureCloudBackup = useAvaluaproStore((state) => state.ensureCloudBackup)
  const activeMode = useAvaluaproStore((state) => state.ui.activeMode)
  const defaultSubject = useAvaluaproStore((state) => state.profile.defaultSubject)
  const onboarding = useAvaluaproStore((state) => state.onboarding)
  const [releaseBackupState, setReleaseBackupState] = useState('')
  const [releaseBackupError, setReleaseBackupError] = useState('')
  const [releaseBackupCreatedAt, setReleaseBackupCreatedAt] = useState('')
  const [releaseRetryCount, setReleaseRetryCount] = useState(0)
  const [releaseAnnouncementDismissed, setReleaseAnnouncementDismissed] = useState(false)
  const releaseAttemptRef = useRef('')
  const releaseGate = getPreUpdateReleaseGate({
    appStatus: status,
    cloudStatus: cloud.status,
    cloudStartupComplete: cloud.startupComplete,
    isDemo: onboarding.demoMode,
    pendingOperationCount: cloud.pendingOperationCount,
    recentBackups: cloud.recentBackups,
    user: cloud.user,
  })
  const releaseReady = releaseGate === 'demo' || releaseGate === 'ready' || releaseBackupState === 'ready'
  const releaseDisplayState = releaseGate === 'backup-required'
    ? releaseBackupState || 'waiting'
    : releaseGate
  const knownReleaseBackup = cloud.recentBackups.find(
    (item) => item.id === PRE_UPDATE_RELEASE.backupId || item.reason === PRE_UPDATE_RELEASE.backupReason,
  )
  const showReleaseAnnouncement = Boolean(
    releaseReady &&
    releaseGate !== 'demo' &&
    cloud.user?.uid &&
    !releaseAnnouncementDismissed &&
    !isReleaseAcknowledged(cloud.user.uid, window.localStorage),
  )
  // La còpia prèvia protegeix les dades, però no pot bloquejar la feina diària.
  // Agenda i Programació continuen disponibles mentre la còpia s'està preparant.
  const effectiveActiveMode = activeMode

  useEffect(() => {
    if (sociometricSurveyId || studentProfileSurveyId) return
    initialize()
  }, [initialize, sociometricSurveyId, studentProfileSurveyId])

  useEffect(() => {
    if (sociometricSurveyId || studentProfileSurveyId) return

    if (releaseGate !== 'backup-required') return

    const attemptKey = `${cloud.user.uid}:${releaseRetryCount}`
    if (releaseAttemptRef.current === attemptKey) return
    releaseAttemptRef.current = attemptKey
    let cancelled = false

    Promise.resolve()
      .then(() => {
        if (cancelled) return null
        setReleaseBackupState('saving')
        setReleaseBackupError('')
        return ensureCloudBackup({
          backupId: PRE_UPDATE_RELEASE.backupId,
          label: PRE_UPDATE_RELEASE.backupLabel,
          reason: PRE_UPDATE_RELEASE.backupReason,
        })
      })
      .then((backup) => {
        if (cancelled || !backup) return
        setReleaseBackupState('ready')
        setReleaseBackupCreatedAt(backup?.createdAt || '')
      })
      .catch((backupError) => {
        if (cancelled) return
        setReleaseBackupState('error')
        setReleaseBackupError(backupError.message || 'No s’ha pogut crear la còpia al núvol.')
      })

    return () => {
      cancelled = true
    }
  }, [
    cloud.recentBackups,
    cloud.user,
    ensureCloudBackup,
    releaseGate,
    releaseRetryCount,
    sociometricSurveyId,
    studentProfileSurveyId,
  ])

  if (sociometricSurveyId) {
    return (
      <Suspense fallback={<ModuleLoadingFallback label="Carregant qüestionari..." />}>
        <SociometricPublicForm accessToken={sociometricAccessToken} surveyId={sociometricSurveyId} />
      </Suspense>
    )
  }

  if (studentProfileSurveyId) {
    return (
      <Suspense fallback={<ModuleLoadingFallback label="Carregant formulari..." />}>
        <StudentProfilePublicForm surveyId={studentProfileSurveyId} />
      </Suspense>
    )
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
      {!onboarding.demoMode && (
        <ReleaseProtectionBanner
          error={releaseBackupError}
          onRetry={() => {
            releaseAttemptRef.current = ''
            setReleaseBackupState('')
            setReleaseBackupError('')
            setReleaseRetryCount((value) => value + 1)
          }}
          state={releaseDisplayState}
        />
      )}
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
        <div className={`storage-alert ${cloud.status === 'review' ? 'cloud-review' : 'cloud-error'}`}>
          <strong>
            {cloud.status === 'review'
              ? 'Les dades d’aquest dispositiu s’han protegit.'
              : 'No s’ha pogut sincronitzar amb Firebase.'}
          </strong>
          <span>{cloud.error}</span>
        </div>
      )}
      <MainNavigation optionalModulesEnabled />
      {TIMELINE_MODES.has(effectiveActiveMode) && <SemesterUtTabs />}
      <main className="content-area">
        <Suspense fallback={<ModuleLoadingFallback />}>
          {effectiveActiveMode === 'evaluation' && <EvaluationView />}
          {effectiveActiveMode === 'tracking' && <TrackingView />}
          {effectiveActiveMode === 'students' && <StudentOverviewView />}
          {effectiveActiveMode === 'analytics' && <AnalyticsView />}
          {effectiveActiveMode === 'tutoring' && <TutoringView />}
          {effectiveActiveMode === 'planning' && <PlanningModule />}
          {effectiveActiveMode === 'agenda' && <AgendaModule />}
        </Suspense>
      </main>
      <GlobalReminderLayer />
      <TutoringInvitationCenter />
      {!defaultSubject && !onboarding.demoMode && <TeacherProfileModal forceSetup onClose={() => {}} />}
      {showReleaseAnnouncement && cloud.user?.uid && (
        <ReleaseAnnouncementModal
          backupCreatedAt={releaseBackupCreatedAt || knownReleaseBackup?.createdAt || ''}
          onAcknowledge={() => {
            acknowledgeRelease(cloud.user.uid, window.localStorage)
            setReleaseAnnouncementDismissed(true)
          }}
        />
      )}
      <GuidedTour />
    </div>
  )
}

export default App
