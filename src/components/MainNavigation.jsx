import { useMemo, useState } from 'react'
import { AlertTriangle, BarChart3, Brain, CheckCircle2, ClipboardCheck, GraduationCap, TableProperties } from 'lucide-react'
import { Modal } from './Modal'
import { buildStudentProfiles } from '../lib/analytics'
import { useAvaluaproStore } from '../store/useAvaluaproStore'

const modes = [
  { id: 'evaluation', label: 'Avaluació', icon: TableProperties },
  { id: 'tracking', label: 'Seguiment', icon: ClipboardCheck },
]

const insights = [
  { id: 'dashboard', label: 'Estadístiques Globals', icon: BarChart3 },
  { id: 'aiBriefing', label: 'Briefing IA', icon: Brain },
]

function getUrgentProfiles(state) {
  const { activeClassId, activeUtId } = state.ui
  const profiles = buildStudentProfiles(state, activeClassId, activeUtId)

  return profiles
    .map((profile) => {
      const reasons = []
      if (profile.evaluation.score > 0 && profile.evaluation.score <= 1.5) {
        reasons.push(`Rendiment alarmant: ${profile.evaluation.grade} (${profile.evaluation.score.toFixed(2)}).`)
      } else if (profile.evaluation.score > 0 && profile.evaluation.score <= 2) {
        reasons.push(`Rendiment baix: ${profile.evaluation.grade} (${profile.evaluation.score.toFixed(2)}).`)
      }
      if (profile.tracking.hasTrackingData && profile.tracking.consistency < 55) {
        reasons.push(`Constància molt baixa: ${profile.tracking.consistency}% a la UT activa.`)
      }
      if (profile.redPointCount >= 3) {
        reasons.push(`${profile.redPointCount} punts vermells acumulats per tasques.`)
      }
      if (profile.incidents >= 2) {
        reasons.push(`${profile.incidents} incidències de comportament registrades.`)
      }
      if (
        profile.evaluation.score > 0 &&
        profile.evaluation.score <= 2 &&
        profile.tracking.hasTrackingData &&
        profile.tracking.consistency < 70
      ) {
        reasons.push('Combina baix rendiment amb constància irregular: convé mirar-lo primer.')
      }

      return { ...profile, reasons }
    })
    .filter((profile) => profile.reasons.length > 0)
    .sort((a, b) => b.reasons.length - a.reasons.length || a.student.name.localeCompare(b.student.name, 'ca'))
}

function UrgentModal({ profiles, onClose }) {
  return (
    <Modal onClose={onClose} size="lg" title="Alumnes urgents">
      <div className="urgent-modal">
        <p>
          Aquesta llista combina senyals de rendiment, constància i comportament. Serveix per detectar alumnes que
          convé mirar abans que es converteixi en un problema més gran.
        </p>
        {profiles.length === 0 ? (
          <div className="urgent-empty-state">
            <CheckCircle2 size={22} />
            <strong>No hi ha alumnes urgents ara mateix.</strong>
            <span>Quan apareguin notes molt baixes, baixa constància o acumulació de notes a l’agenda, sortiran aquí.</span>
          </div>
        ) : (
          <div className="urgent-student-list">
            {profiles.map((profile) => (
              <article key={profile.student.id}>
                <div>
                  <strong>{profile.student.name}</strong>
                  <span>{profile.student.halfGroup || 'Sense mig grup'}</span>
                </div>
                <ul>
                  {profile.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

export function MainNavigation() {
  const [showUrgent, setShowUrgent] = useState(false)
  const state = useAvaluaproStore()
  const { activeClassId, activeMode, activeInsight } = useAvaluaproStore((state) => state.ui)
  const setActiveMode = useAvaluaproStore((state) => state.setActiveMode)
  const setActiveInsight = useAvaluaproStore((state) => state.setActiveInsight)
  const onboarding = useAvaluaproStore((state) => state.onboarding)
  const activeClass = useAvaluaproStore((state) => state.classes.find((classItem) => classItem.id === activeClassId))
  const urgentProfiles = useMemo(() => getUrgentProfiles(state), [state])
  const hasTutoringMode = Boolean(activeClass?.isTutoringGroup || activeClass?.subject === 'Tutoria')
  const handleOpenTutoring = () => {
    setActiveMode('tutoring')
    if (!onboarding.tutoringGuideSeen) {
      useAvaluaproStore.getState().openGuide('tutoring')
    }
  }

  return (
    <div className="main-navigation" data-tour="main-navigation">
      <div className="mode-tabs">
        {modes.map((mode) => {
          const Icon = mode.icon
          return (
            <button
              className={`mode-tab ${activeMode === mode.id ? 'active' : ''}`}
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              type="button"
            >
              <Icon size={18} />
              {mode.label}
            </button>
          )
        })}
      </div>
      <div className="insight-tabs">
        {insights.map((insight) => {
          const Icon = insight.icon
          return (
            <button
              className={`insight-tab ${activeMode === 'analytics' && activeInsight === insight.id ? 'active' : ''}`}
              key={insight.id}
              onClick={() => {
                setActiveInsight(insight.id)
                setActiveMode('analytics')
              }}
              type="button"
            >
              <Icon size={18} />
              {insight.label}
            </button>
          )
        })}
        {hasTutoringMode && (
          <button
            className={`insight-tab tutoring-tab ${activeMode === 'tutoring' ? 'active' : ''}`}
            data-tour="tutoring-mode-button"
            onClick={handleOpenTutoring}
            type="button"
          >
            <GraduationCap size={18} />
            Mode tutoria
          </button>
        )}
        <button
          className={`urgent-tab ${urgentProfiles.length > 0 ? 'has-items' : ''}`}
          data-tour="urgent-button"
          onClick={() => setShowUrgent(true)}
          type="button"
        >
          <AlertTriangle size={18} />
          Urgent
          <span>{urgentProfiles.length}</span>
        </button>
      </div>
      {showUrgent && <UrgentModal profiles={urgentProfiles} onClose={() => setShowUrgent(false)} />}
    </div>
  )
}
