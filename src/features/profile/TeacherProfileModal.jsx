import { BookOpenCheck, ClipboardCheck, Database, UserRound } from 'lucide-react'
import { SUBJECT_AREAS } from '../../data/subjects'
import { Modal } from '../../components/Modal'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'

export function TeacherProfileModal({ forceSetup = false, onClose }) {
  const defaultSubject = useAvaluaproStore((state) => state.profile.defaultSubject)
  const setDefaultSubject = useAvaluaproStore((state) => state.setDefaultSubject)

  const handleClose = () => {
    if (!forceSetup || defaultSubject) {
      onClose()
    }
  }

  return (
    <Modal onClose={handleClose} size="lg" title={forceSetup ? 'Benvingut a Avaluapro' : 'Perfil docent'}>
      <div className="teacher-profile-setup">
        <section className="setup-intro">
          <span>
            <UserRound size={18} />
            Configuració inicial
          </span>
          <strong>Primer triem la matèria principal.</strong>
          <p>
            Això permet que les classes noves surtin preparades amb l’estructura de competències de la matèria.
            Si una classe és Projecte Integrador, Tutoria o un cas especial, la podràs canviar després.
          </p>
        </section>

        <section className="setup-benefits">
          <article>
            <BookOpenCheck size={18} />
            <strong>Avaluació</strong>
            <span>Competències i criteris de la matèria carregats d’entrada.</span>
          </article>
          <article>
            <ClipboardCheck size={18} />
            <strong>Seguiment</strong>
            <span>Tasques i comportament connectats als mateixos alumnes.</span>
          </article>
          <article>
            <Database size={18} />
            <strong>Dades</strong>
            <span>Tot es desa localment i entra al backup complet.</span>
          </article>
        </section>

        <section className="modal-section">
          <h3>
            <UserRound size={18} />
            Matèria principal
          </h3>
          <label className="field-label">
            La meva matèria principal
            <select
              onChange={(event) => setDefaultSubject(event.target.value)}
              value={defaultSubject}
            >
              <option value="">Selecciona matèria</option>
              {SUBJECT_AREAS.map((area) => (
                <optgroup key={area.id} label={area.name}>
                  {area.subjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <button
            className="primary-action"
            disabled={!defaultSubject}
            onClick={handleClose}
            type="button"
          >
            Continuar
          </button>
        </section>
      </div>
    </Modal>
  )
}
