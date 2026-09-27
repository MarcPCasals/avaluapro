import { CircleHelp, LineChart, ListFilter } from 'lucide-react'
import { formatAbsenceHours } from '../../lib/attendance'

function getConsistencyLabel(tracking) {
  return tracking?.hasTrackingData ? `${tracking.consistency}%` : 'Sense dades'
}

function getToneClassName(tone) {
  return tone === 'invisible' ? 'student-invisible' : tone
}

export function CrossAnalysisTable({
  onOpenAbsences,
  onOpenEvolution,
  onOpenInfo,
  onOpenTrackingEvidence,
  onSortModeChange,
  rows,
  sortMode,
}) {
  return (
    <div className="profile-table-wrap full-width-analysis" data-tour="stats-cross">
      <div className="section-heading">
        <LineChart size={20} />
        <div>
          <h3>Anàlisi creuada</h3>
          <p>Rendiment acadèmic, hàbits de treball, absències i comportament vistos conjuntament.</p>
        </div>
        <div className="profile-sort-toggle" aria-label="Ordenar alumnes">
          <ListFilter size={16} />
          <button
            className={sortMode === 'intervention' ? 'active' : ''}
            onClick={() => onSortModeChange('intervention')}
            type="button"
          >
            Intervenció
          </button>
          <button
            className={sortMode === 'alphabetical' ? 'active' : ''}
            onClick={() => onSortModeChange('alphabetical')}
            type="button"
          >
            A-Z
          </button>
        </div>
        <button
          aria-label="Explicació: Anàlisi creuada"
          className="info-help-button"
          onClick={onOpenInfo}
          title="Què explica: Anàlisi creuada"
          type="button"
        >
          <CircleHelp size={16} />
        </button>
      </div>
      <table className="profile-table">
        <thead>
          <tr>
            <th>Alumne</th>
            <th>Rendiment</th>
            <th>Constància</th>
            <th>Absències</th>
            <th>Punts vermells</th>
            <th>Punts negres</th>
            <th>Perfil</th>
            <th>Acció</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              className={`profile-analysis-row ${row.rowTone}`}
              data-analysis-student-row={row.student.id}
              key={row.student.id}
            >
              <td>
                <strong>{row.student.name}</strong>
                <small>{row.student.halfGroup}</small>
              </td>
              <td>
                <div className="evaluation-cell-actions">
                  <span className={`grade grade-${row.evaluationGrade || 'empty'}`}>
                    {row.evaluationGrade || '-'}
                  </span>
                  <button
                    className="mini-detail-button"
                    data-tour={index === 0 ? 'stats-performance-detail' : undefined}
                    onClick={() => onOpenEvolution(row)}
                    title="Veure evolució individual"
                    type="button"
                  >
                    <LineChart size={15} />
                  </button>
                </div>
              </td>
              <td>
                <div className={`progress-line compact ${row.lowConsistency ? 'low' : ''}`}>
                  <span style={{ width: `${row.tracking.hasTrackingData ? row.tracking.consistency : 0}%` }} />
                </div>
                <b className={`consistency-badge ${row.tracking.hasTrackingData ? '' : 'empty'}`}>
                  {getConsistencyLabel(row.tracking)}
                </b>
              </td>
              <td>
                <button
                  className={`data-pill clickable absence ${row.absenceHours > 0 ? 'has-absence' : 'ok'}`}
                  onClick={() => onOpenAbsences(row)}
                  title={`Veure les dates exactes de les absències de ${row.student.name}`}
                  type="button"
                >
                  {formatAbsenceHours(row.absenceHours)}
                </button>
              </td>
              <td>
                <button
                  className={`data-pill clickable ${row.redPointCount > 0 ? 'danger' : 'ok'}`}
                  onClick={() => onOpenTrackingEvidence(row)}
                  type="button"
                >
                  {row.redPointCount}
                </button>
              </td>
              <td>
                <button
                  className={`data-pill clickable ${row.incidents > 0 ? 'dark' : 'ok'}`}
                  onClick={() => onOpenTrackingEvidence(row)}
                  type="button"
                >
                  {row.incidents}
                </button>
              </td>
              <td>
                <span className={`decision-pill ${getToneClassName(row.decision.tone)}`}>
                  {row.decision.label}
                </span>
              </td>
              <td>
                <span className="decision-text">{row.decision.text}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
