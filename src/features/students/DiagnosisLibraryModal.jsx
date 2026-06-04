import { BookOpen, Sparkles } from 'lucide-react'
import { Modal } from '../../components/Modal'
import { DIAGNOSIS_LIBRARY_ITEMS } from '../../data/diagnosisLibrary'

export function DiagnosisLibraryModal({ diagnosisId = 'dyslexia', onClose }) {
  const activeDiagnosis =
    DIAGNOSIS_LIBRARY_ITEMS.find((diagnosis) => diagnosis.id === diagnosisId) || DIAGNOSIS_LIBRARY_ITEMS[0]

  return (
    <Modal onClose={onClose} size="xl" title="Biblioteca de diagnòstics">
      <div className="diagnosis-library">
        <aside className="diagnosis-library-sidebar">
          <div>
            <BookOpen size={20} />
            <span>Consulta ràpida</span>
          </div>
          {DIAGNOSIS_LIBRARY_ITEMS.map((diagnosis) => (
            <button
              className={`diagnosis-library-tab ${diagnosis.id === activeDiagnosis.id ? 'active' : ''}`}
              key={diagnosis.id}
              type="button"
            >
              {diagnosis.shortTitle}
            </button>
          ))}
        </aside>

        <section className="diagnosis-library-content">
          <header>
            <span>
              <Sparkles size={17} />
              Detalls de l’adaptació
            </span>
            <h2>{activeDiagnosis.shortTitle}</h2>
            <p>{activeDiagnosis.description}</p>
          </header>

          <div className="diagnosis-summary-box">
            <strong>Necessitats específiques principals</strong>
            <ul>
              {activeDiagnosis.summary.slice(0, 5).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="diagnosis-library-sections">
            {activeDiagnosis.sections.map((section) => (
              <article key={section.title}>
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
