import { Shuffle } from 'lucide-react'

export function EvaluationScopeButton({ scope, onChange }) {
  const transversal = scope === 'transversal'
  return <button aria-pressed={transversal}
    className={`other-uts-trigger transversal-scope-trigger ${transversal ? 'active' : ''}`}
    onClick={() => onChange(transversal ? 'specific' : 'transversal')} type="button">
    <Shuffle size={17} />{transversal ? 'Veure específiques' : 'Veure transversals'}
  </button>
}
