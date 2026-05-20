import { useMemo, useState } from 'react'
import { BookOpenCheck, ClipboardCheck, Database, Plus, Trash2, UserRound } from 'lucide-react'
import { CLASS_COLORS } from '../../data/classColors'
import { SUBJECT_AREAS } from '../../data/subjects'
import { Modal } from '../../components/Modal'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'

const initialClassRows = [
  { id: 'initial-class-1', name: '2n B', color: 'green' },
  { id: 'initial-class-2', name: '2n C', color: 'blue' },
]

export function TeacherProfileModal({ forceSetup = false, onClose }) {
  const defaultSubject = useAvaluaproStore((state) => state.profile.defaultSubject)
  const setDefaultSubject = useAvaluaproStore((state) => state.setDefaultSubject)
  const setupInitialWorkspace = useAvaluaproStore((state) => state.setupInitialWorkspace)
  const [setupSubject, setSetupSubject] = useState(defaultSubject)
  const [classRows, setClassRows] = useState(initialClassRows)
  const cleanClassRows = useMemo(
    () => classRows.map((row) => ({ ...row, name: row.name.trim() })).filter((row) => row.name),
    [classRows],
  )

  const handleClose = () => {
    if (!forceSetup || defaultSubject) {
      onClose()
    }
  }

  const updateClassRow = (rowId, patch) => {
    setClassRows((current) => current.map((row) => (row.id === rowId ? { ...row, ...patch } : row)))
  }

  const addClassRow = () => {
    setClassRows((current) => [
      ...current,
      {
        id: `initial-class-${Date.now()}`,
        name: '',
        color: CLASS_COLORS[current.length % CLASS_COLORS.length]?.id || 'blue',
      },
    ])
  }

  const removeClassRow = (rowId) => {
    setClassRows((current) => (current.length <= 1 ? current : current.filter((row) => row.id !== rowId)))
  }

  const handleInitialSetup = async () => {
    const created = await setupInitialWorkspace({ subject: setupSubject, classes: cleanClassRows })
    if (created) onClose()
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
          {forceSetup && (
            <p>
              Ara ja comences amb una base buida. Avaluapro prepararà les classes amb UT1-UT4 i carregarà
              automàticament l’estructura de competències de la matèria triada.
            </p>
          )}
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
            <span>Tot es desa localment i entra a la còpia de seguretat completa.</span>
          </article>
        </section>

        <section className="modal-section">
          <h3>
            <UserRound size={18} />
            {forceSetup ? 'Matèria i classes inicials' : 'Matèria principal'}
          </h3>
          {forceSetup ? (
            <>
              <p>
                Tria la matèria i crea les classes amb què vols començar. Cada classe ja tindrà UT1-UT4
                i les competències/criteris precarregats de la matèria.
              </p>
              <label className="field-label">
                La meva matèria principal
                <select
                  onChange={(event) => setSetupSubject(event.target.value)}
                  value={setupSubject}
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
              <div className="initial-class-list">
                {classRows.map((row, index) => (
                  <div className="initial-class-row" key={row.id}>
                    <span>{index + 1}</span>
                    <input
                      aria-label={`Nom de la classe ${index + 1}`}
                      onChange={(event) => updateClassRow(row.id, { name: event.target.value })}
                      placeholder="Ex: 2n B"
                      value={row.name}
                    />
                    <select
                      aria-label={`Color de la classe ${index + 1}`}
                      onChange={(event) => updateClassRow(row.id, { color: event.target.value })}
                      value={row.color}
                    >
                      {CLASS_COLORS.map((color) => (
                        <option key={color.id} value={color.id}>
                          {color.label}
                        </option>
                      ))}
                    </select>
                    <button
                      className="danger-soft mini"
                      disabled={classRows.length <= 1}
                      onClick={() => removeClassRow(row.id)}
                      title="Eliminar fila"
                      type="button"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <button className="secondary-action compact" onClick={addClassRow} type="button">
                <Plus size={16} />
                Afegir una altra classe
              </button>
              <button
                className="primary-action"
                disabled={!setupSubject || cleanClassRows.length === 0}
                onClick={handleInitialSetup}
                type="button"
              >
                Crear classes i començar
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </section>
      </div>
    </Modal>
  )
}
