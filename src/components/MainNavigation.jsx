import { BarChart3, ClipboardCheck, TableProperties } from 'lucide-react'
import { useAvaluaproStore } from '../store/useAvaluaproStore'

const modes = [
  { id: 'evaluation', label: 'Avaluació', icon: TableProperties },
  { id: 'tracking', label: 'Seguiment', icon: ClipboardCheck },
]

const insights = [
  { id: 'dashboard', label: 'Stats Globals', icon: BarChart3 },
  { id: 'utStats', label: 'Stats UT', icon: BarChart3 },
  { id: 'trackingStats', label: 'Stats Seguiment', icon: ClipboardCheck },
]

export function MainNavigation() {
  const { activeMode, activeInsight } = useAvaluaproStore((state) => state.ui)
  const setActiveMode = useAvaluaproStore((state) => state.setActiveMode)
  const setActiveInsight = useAvaluaproStore((state) => state.setActiveInsight)

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
      </div>
    </div>
  )
}
