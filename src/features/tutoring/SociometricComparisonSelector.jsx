import { Save, TrendingDown } from 'lucide-react'

export function SociometricComparisonSelector({
  comparisonOptions,
  currentRelationCount,
  detectedMomentsLabel,
  endValue,
  onCaptureMoment,
  onChangeEnd,
  onChangeStart,
  startValue,
}) {
  return (
    <section className="sociometric-comparison-selector">
      <header>
        <div>
          <span className="section-kicker">
            <TrendingDown size={17} />
            Moments comparats
          </span>
          <h3>Tria el punt inicial i final</h3>
        </div>
        <div className="sociometric-comparison-header-actions">
          <small>{detectedMomentsLabel}</small>
          <button className="secondary-action compact" onClick={onCaptureMoment} type="button">
            <Save size={15} />
            Guardar moment actual
          </button>
        </div>
      </header>
      <div>
        <label>
          Moment inicial
          <select onChange={(event) => onChangeStart(event.target.value)} value={startValue}>
            {comparisonOptions.length === 0 ? (
              <option value="current">Sense històric encara</option>
            ) : (
              comparisonOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            )}
          </select>
        </label>
        <label>
          Moment final
          <select onChange={(event) => onChangeEnd(event.target.value)} value={endValue}>
            <option value="current">Estat actual · {currentRelationCount} rel.</option>
            {comparisonOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  )
}
