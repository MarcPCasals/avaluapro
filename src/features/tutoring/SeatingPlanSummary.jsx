import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import './SeatingPlanSummary.css'

export function SeatingPlanSummary({ analysis }) {
  return <section className="tutorial-seating-top-summary" aria-label="Resum de relacions i conflictes">
<section className={`tutorial-seating-quality-panel ${analysis.quality.tone}`}>
              <div className="tutorial-seating-quality-score">
                <span>Qualitat global</span>
                <strong>
                  {analysis.score}
                  <small>/100</small>
                </strong>
                <em>{analysis.quality.label}</em>
              </div>

              <div className="tutorial-seating-quality-summary">
                <div>
                  <strong>Lectura de la proposta</strong>
                  <p>{analysis.summary}</p>
                </div>
                {analysis.strengths.length > 0 && (
                  <ul>
                    {analysis.strengths.map((strength) => (
                      <li key={strength}>
                        <CheckCircle2 aria-hidden="true" size={15} />
                        {strength}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="tutorial-seating-quality-conflicts">
                <header>
                  <strong>Conflictes detectats</strong>
                  <span>{analysis.conflicts.length}</span>
                </header>
                {analysis.conflicts.length > 0 ? (
                  <div>
                    {analysis.conflicts.slice(0, 3).map((conflict, index) => (
                      <article className={conflict.severity} key={`${conflict.title}_${conflict.text}_${index}`}>
                        <AlertTriangle aria-hidden="true" size={14} />
                        <p>
                          <strong>{conflict.title}</strong>
                          <span>{conflict.text}</span>
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="empty">
                    <CheckCircle2 aria-hidden="true" size={15} />
                    Cap conflicte rellevant.
                  </p>
                )}
              </div>
            </section>
<div className="tutorial-seating-insight-grid">
              <article>
                <strong>Incompatibilitats a prop</strong>
                <span>{analysis.adjacentAvoidPairs.length}</span>
                <p>Alumnes amb rebuig o tensió que han quedat massa a prop.</p>
              </article>
              <article>
                <strong>Suports clars</strong>
                <span>
                  {Math.max(
                    0,
                    analysis.vulnerablePlacements.length - analysis.vulnerableWithoutSupport.length,
                  )}
                  /{analysis.vulnerablePlacements.length}
                </span>
                <p>Perfils vulnerables que sí que tenen algun suport proper.</p>
              </article>
              <article>
                <strong>Prioritaris davant</strong>
                <span>
                  {analysis.priorityInFront.length}/{analysis.priorityPlacements.length}
                </span>
                <p>Alumnes delicats situats en zones de seguiment més fàcil.</p>
              </article>
              <article>
                <strong>Parelles de treball</strong>
                <span>{analysis.adjacentWorkPairs.length}</span>
                <p>Vincles de treball útils que han quedat a prop dins l’aula.</p>
              </article>
            </div>
  </section>
}
