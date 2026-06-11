import { useState } from 'react'
import { BookOpen, CheckCircle2, Sparkles } from 'lucide-react'
import { Modal } from '../../components/Modal'
import { DIAGNOSIS_LIBRARY_ITEMS } from '../../data/diagnosisLibrary'

function getSectionId(title) {
  return `diagnosis-section-${title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}`
}

export function DiagnosisLibraryModal({ diagnosisId = 'dyslexia', onClose }) {
  const initialDiagnosis = DIAGNOSIS_LIBRARY_ITEMS.some((diagnosis) => diagnosis.id === diagnosisId)
    ? diagnosisId
    : 'dyslexia'
  const [activeDiagnosisId, setActiveDiagnosisId] = useState(initialDiagnosis)
  const activeDiagnosis =
    DIAGNOSIS_LIBRARY_ITEMS.find((diagnosis) => diagnosis.id === activeDiagnosisId) || DIAGNOSIS_LIBRARY_ITEMS[0]

  return (
    <Modal onClose={onClose} size="xl" title="Biblioteca de diagnòstics i adaptacions">
      <div className="diagnosis-library">
        <aside className="diagnosis-library-sidebar">
          <div className="diagnosis-library-sidebar-heading">
            <BookOpen size={22} />
            <div>
              <h2>Adaptacions disponibles</h2>
              <p>Selecciona un diagnòstic per consultar orientacions útils.</p>
            </div>
          </div>
          {DIAGNOSIS_LIBRARY_ITEMS.map((diagnosis) => (
            <button
              className={`diagnosis-library-tab accent-${diagnosis.accent} ${
                diagnosis.id === activeDiagnosis.id ? 'active' : ''
              }`}
              key={diagnosis.id}
              onClick={() => setActiveDiagnosisId(diagnosis.id)}
              type="button"
            >
              <span>{diagnosis.shortTitle}</span>
              <small>{diagnosis.tag}</small>
            </button>
          ))}
        </aside>

        <section className={`diagnosis-library-content accent-${activeDiagnosis.accent}`}>
          <header className="diagnosis-library-hero">
            <span className="diagnosis-library-kicker">
              <Sparkles size={17} />
              Detalls de l’adaptació
            </span>
            <h2>{activeDiagnosis.title}</h2>
            <p>{activeDiagnosis.description}</p>
            <nav className="diagnosis-library-index" aria-label="Índex del diagnòstic">
              <a href="#diagnosis-summary">Orientacions clau</a>
              {activeDiagnosis.sections.map((section) => (
                <a href={`#${getSectionId(section.title)}`} key={section.title}>
                  {section.title}
                </a>
              ))}
            </nav>
          </header>

          <div className="diagnosis-summary-box" id="diagnosis-summary">
            <strong>
              <CheckCircle2 size={17} />
              Orientacions clau
            </strong>
            <ul>
              {activeDiagnosis.summary.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="diagnosis-library-sections">
            {activeDiagnosis.sections.map((section) => (
              <article className={`tone-${section.tone || 'neutral'}`} id={getSectionId(section.title)} key={section.title}>
                <h3>{section.title}</h3>
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  )
}
