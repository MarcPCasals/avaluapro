export function SociometricSummaryPanel({
  categoryRows = [],
  eyebrow = 'Lectura ràpida',
  metrics,
  notice = '',
  title = 'Indicadors sociomètrics actuals',
}) {
  const metricRows = [
    ['Densitat', metrics?.density ?? 0, '%'],
    ['Inclusió', metrics?.inclusion ?? 0, '%'],
    ['Positivitat', metrics?.positivity ?? 0, '%'],
    ['Moreno', metrics?.moreno ?? 0, '%'],
  ]

  return (
    <div className="sociometric-results-preview" data-sociometric-summary>
      <header>
        <div>
          <span className="section-kicker">{eyebrow}</span>
          <h3>{title}</h3>
        </div>
        <div className="sociometric-metric-strip">
          {metricRows.map(([label, value, suffix]) => (
            <span key={label}>{label} {value}{suffix}</span>
          ))}
        </div>
      </header>
      <div className="sociometric-classification-grid">
        {categoryRows.map((item) => (
          <article key={item.category}>
            <span>{item.category}</span>
            <strong>{item.count}</strong>
          </article>
        ))}
      </div>
      {notice && <p className="sociometric-summary-notice">{notice}</p>}
    </div>
  )
}
