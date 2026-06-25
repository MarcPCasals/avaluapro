import { HelpCircle, Lightbulb, Mail, Send, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Modal } from '../../components/Modal'

const FEEDBACK_EMAIL = 'mperezc@educand.ad'
const CATEGORY_OPTIONS = [
  { id: 'suggeriment', label: 'Suggeriment', icon: Lightbulb },
  { id: 'dubte', label: 'Dubte', icon: HelpCircle },
]

function buildFeedbackMailto({ category, message, name }) {
  const cleanName = name.trim()
  const cleanCategory = CATEGORY_OPTIONS.find((option) => option.id === category)?.label || 'Suggeriment'
  const subjectCategory = category === 'dubte' ? 'Dubte' : 'Suggerència'
  const subjectName = cleanName || 'Usuari'
  const subject = `${subjectCategory} AvaluaPro_${subjectName}`
  const body = [
    `Categoria: ${cleanCategory}`,
    `Nom: ${cleanName || 'No indicat'}`,
    '',
    'Missatge:',
    message.trim(),
    '',
    '---',
    `Enviat des d'AvaluaPro el ${new Date().toLocaleString('ca-ES')}`,
    `Navegador: ${navigator.userAgent}`,
  ].join('\n')

  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export function FeedbackModal({ onClose }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('suggeriment')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('')
  const canSend = message.trim().length >= 5
  const selectedCategory = useMemo(
    () => CATEGORY_OPTIONS.find((option) => option.id === category) || CATEGORY_OPTIONS[0],
    [category],
  )
  const SelectedIcon = selectedCategory.icon

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!canSend) {
      setStatus('Escriu un missatge una mica més complet abans de preparar el correu.')
      return
    }

    window.location.href = buildFeedbackMailto({ category, message, name })
    setStatus('S’ha obert el teu correu amb el missatge preparat. Revisa’l i prem enviar.')
  }

  return (
    <Modal onClose={onClose} size="lg" title="Enviar suggeriment o dubte">
      <form className="feedback-modal" onSubmit={handleSubmit}>
        <section className="feedback-intro">
          <span>
            <SelectedIcon size={24} />
          </span>
          <div>
            <strong>Ajuda a millorar AvaluaPro</strong>
            <p>
              Escriu una idea, problema o pregunta. Prepararé un correu a {FEEDBACK_EMAIL} amb l’assumpte i el
              missatge ja omplerts.
            </p>
          </div>
        </section>

        <label>
          <span>
            <UserRound size={16} />
            Nom opcional
          </span>
          <input
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex: Marc, Departament de ciències..."
            value={name}
          />
        </label>

        <fieldset className="feedback-category-options">
          <legend>Categoria</legend>
          {CATEGORY_OPTIONS.map((option) => {
            const Icon = option.icon
            return (
              <button
                className={category === option.id ? 'active' : ''}
                key={option.id}
                onClick={() => setCategory(option.id)}
                type="button"
              >
                <Icon size={17} />
                {option.label}
              </button>
            )
          })}
        </fieldset>

        <label>
          <span>
            <Mail size={16} />
            Missatge
          </span>
          <textarea
            maxLength={1600}
            onChange={(event) => {
              setMessage(event.target.value)
              setStatus('')
            }}
            placeholder="Escriu aquí el suggeriment o dubte..."
            required
            value={message}
          />
        </label>

        {status && <p className="feedback-status">{status}</p>}

        <div className="modal-actions">
          <button className="secondary-action" onClick={onClose} type="button">
            Tancar
          </button>
          <button className="primary-action" disabled={!canSend} type="submit">
            <Send size={17} />
            Preparar correu
          </button>
        </div>
      </form>
    </Modal>
  )
}
