export function SociometricStudentInsightCard({
  emptyMessage = 'Encara no hi ha dades sociomètriques per aquest alumne.',
  report,
  showSupportLabel = false,
}) {
  if (!report) {
    return <div className="empty-state compact">{emptyMessage}</div>
  }

  return (
    <>
      <div className="tutorial-profile-sociometric-head">
        <span className={`sociometric-report-avatar ${report.categoryMeta.tone}`}>{report.studentCode}</span>
        <div>
          <strong>{report.reading}</strong>
          <div className="sociometric-student-badges">
            <span className={`sociometric-category-pill ${report.categoryMeta.tone}`}>Social: {report.category}</span>
            <span>Treball: {report.workCategory}</span>
            {showSupportLabel && report.supportLabel ? <span>{report.supportLabel}</span> : null}
          </div>
        </div>
      </div>

      <dl className="sociometric-student-stats">
        <div>
          <dt>Eleccions rebudes</dt>
          <dd>{report.sociometricRow?.positiveReceived || 0}</dd>
        </div>
        <div>
          <dt>Eleccions fetes</dt>
          <dd>{report.sociometricRow?.positiveGiven || 0}</dd>
        </div>
        <div>
          <dt>Rebuigs rebuts</dt>
          <dd>{report.sociometricRow?.avoidReceived || 0}</dd>
        </div>
        <div>
          <dt>Rebuigs fets</dt>
          <dd>{report.sociometricRow?.avoidGiven || 0}</dd>
        </div>
      </dl>

      <div className="sociometric-student-relations">
        <section>
          <strong>Relacions positives</strong>
          <p>
            Social:{' '}
            {report.socialNames.length > 0
              ? report.socialNames.slice(0, 4).join(', ')
              : 'sense afinitats socials registrades'}
          </p>
          <p>
            Treball:{' '}
            {report.workNames.length > 0
              ? report.workNames.slice(0, 4).join(', ')
              : 'sense relacions de treball registrades'}
          </p>
        </section>
        <section>
          <strong>Relacions a vigilar</strong>
          <p>
            {report.avoidNames.length > 0
              ? report.avoidNames.slice(0, 5).join(', ')
              : 'no hi ha incompatibilitats registrades'}
          </p>
        </section>
      </div>

      <section className="sociometric-student-actions">
        <strong>Recomanacions breus</strong>
        <ol>
          {report.actions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ol>
      </section>
    </>
  )
}
