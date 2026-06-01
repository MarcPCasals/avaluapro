import { useMemo, useState } from 'react'
import { CheckCircle2, Copy, Plus, Power, Trash2 } from 'lucide-react'
import { getSubjectOption, getSubjectStructure } from '../../data/subjects'
import { Modal } from '../../components/Modal'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'

const COMPETENCY_COLORS = [
  { id: 'orange', label: 'Taronja' },
  { id: 'green', label: 'Verd' },
  { id: 'purple', label: 'Lila' },
  { id: 'blue', label: 'Blau' },
  { id: 'yellow', label: 'Groc' },
  { id: 'red', label: 'Vermell' },
  { id: 'gray', label: 'Gris' },
]

export function EditStructureModal({ activeUtId, onClose }) {
  const state = useAvaluaproStore()
  const addCompetency = useAvaluaproStore((store) => store.addCompetency)
  const updateCompetency = useAvaluaproStore((store) => store.updateCompetency)
  const deleteCompetency = useAvaluaproStore((store) => store.deleteCompetency)
  const addCriterion = useAvaluaproStore((store) => store.addCriterion)
  const updateCriterion = useAvaluaproStore((store) => store.updateCriterion)
  const deleteCriterion = useAvaluaproStore((store) => store.deleteCriterion)
  const copyCompetenciesToUt = useAvaluaproStore((store) => store.copyCompetenciesToUt)
  const setUtCompetencyActive = useAvaluaproStore((store) => store.setUtCompetencyActive)
  const [selectedCompetencies, setSelectedCompetencies] = useState([])
  const [targetClassId, setTargetClassId] = useState(state.ui.activeClassId)
  const targetSemesters = state.semesters.filter((semester) => semester.classId === targetClassId)
  const [targetUtId, setTargetUtId] = useState(
    state.uts.find((ut) => ut.classId === targetClassId)?.id || '',
  )
  const orderedClasses = [...state.classes].sort((a, b) => (a.order || 0) - (b.order || 0))

  const activeUt = state.uts.find((ut) => ut.id === activeUtId)
  const activeClass = state.classes.find((classItem) => classItem.id === state.ui.activeClassId)
  const activeSubject = getSubjectOption(activeClass?.subject)
  const subjectStructure = getSubjectStructure(activeSubject?.name)
  const utCompetencies = useMemo(
    () =>
      state.competencies
        .filter((competency) => competency.utId === activeUtId)
        .sort((a, b) => a.order - b.order)
        .map((competency) => ({
          ...competency,
          criteria: state.criteria
            .filter((criterion) => criterion.competencyId === competency.id)
            .sort((a, b) => a.order - b.order),
        })),
    [activeUtId, state.competencies, state.criteria],
  )
  const activeCompetencies = useMemo(
    () => utCompetencies.filter((competency) => !competency.inactive),
    [utCompetencies],
  )

  const targetUts = state.uts.filter((ut) =>
    targetSemesters.some((semester) => semester.id === ut.semesterId),
  )
  const activeCompetencyNames = new Set(activeCompetencies.map((competency) => competency.name))
  const activeCompetencyByName = new Map(
    activeCompetencies.map((competency) => [competency.name, competency]),
  )

  const handleTargetClassChange = (classId) => {
    const firstUt = state.uts.find((ut) => ut.classId === classId)
    setTargetClassId(classId)
    setTargetUtId(firstUt?.id || '')
  }

  const toggleSelected = (competencyId) => {
    setSelectedCompetencies((current) =>
      current.includes(competencyId)
        ? current.filter((id) => id !== competencyId)
        : [...current, competencyId],
    )
  }

  const handleSubjectCompetencyToggle = async (competencyName, isActive) => {
    const activeCompetency = activeCompetencyByName.get(competencyName)
    if (isActive) {
      await setUtCompetencyActive(activeUtId, competencyName, false)
      setSelectedCompetencies((current) => current.filter((id) => id !== activeCompetency?.id))
      return
    }

    await setUtCompetencyActive(activeUtId, competencyName, true)
  }

  const handleCopy = async () => {
    await copyCompetenciesToUt({
      competencyIds: selectedCompetencies,
      targetClassId,
      targetUtId,
    })
    setSelectedCompetencies([])
  }

  if (subjectStructure) {
    return (
      <Modal onClose={onClose} size="lg" title={`Competències per ${activeUt?.name || 'UT'}`}>
        <div className="ut-competency-config">
          <section className="ut-config-intro">
            <div>
              <strong>{activeSubject.name}</strong>
              <span>
                Activa les competències que treballaràs en aquesta UT. Quan una competència està
                activa, els seus criteris s’avaluen sempre junts.
              </span>
            </div>
            <small>{activeCompetencies.length} de {subjectStructure.length} competències actives</small>
          </section>

          <div className="ut-competency-switch-list">
            {subjectStructure.map((competency) => {
              const isActive = activeCompetencyNames.has(competency.name)
              return (
                <article className={`ut-competency-switch ${isActive ? 'active' : ''}`} key={competency.name}>
                  <button
                    className="competency-toggle"
                    onClick={() => handleSubjectCompetencyToggle(competency.name, isActive)}
                    type="button"
                  >
                    {isActive ? <CheckCircle2 size={20} /> : <Power size={20} />}
                    <span>{isActive ? 'Activa' : 'Inactiva'}</span>
                  </button>
                  <div>
                    <strong>{competency.name}</strong>
                    <ul>
                      {competency.criteria.map((criterion) => (
                        <li key={criterion}>{criterion}</li>
                      ))}
                    </ul>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose} size="xl" title={`Competències de la UT · ${activeUt?.name || 'UT'}`}>
      <div className="structure-editor">
        <section className="modal-section">
          <div className="section-title-row">
            <h3>Competències i criteris</h3>
            <div className="inline-actions">
              {!subjectStructure && (
                <button className="primary-action compact" onClick={() => addCompetency(activeUtId)} type="button">
                  <Plus size={17} />
                  Competència
                </button>
              )}
            </div>
          </div>
          <p>
            Model del curs vinent: el docent posa la nota del criteri i Avaluapro calcula la competència. La
            taula té sempre UT1, UT2, UT3 i UT4; aquí només actives o desactives competències senceres per UT.
            {activeSubject
              ? ` Matèria activa: ${activeSubject.name}.`
              : ' Tria una assignatura a la configuració del grup per activar CFN.'}
          </p>

          {subjectStructure && (
            <div className="subject-structure-picker">
              <div>
                <strong>Competències de {activeSubject.name}</strong>
                <span>Per defecte estan totes activades. Desmarca només les que no treballaràs en aquesta UT.</span>
              </div>
              <div className="subject-competency-list">
                {subjectStructure.map((competency) => {
                  const isActive = activeCompetencyNames.has(competency.name)
                  return (
                    <label className={`subject-competency-option ${isActive ? 'active' : ''}`} key={competency.name}>
                      <input
                        checked={isActive}
                        onChange={() => handleSubjectCompetencyToggle(competency.name, isActive)}
                        type="checkbox"
                      />
                      <span>
                        <strong>{competency.name}</strong>
                        <small>{competency.criteria.join(' · ')}</small>
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          <div className="competency-editor-list">
            {activeCompetencies.map((competency) => (
              <article className="competency-editor-card" key={competency.id}>
                <div className="competency-editor-header">
                  <label className="copy-check">
                    <input
                      checked={selectedCompetencies.includes(competency.id)}
                      onChange={() => toggleSelected(competency.id)}
                      type="checkbox"
                    />
                  </label>
                  <input
                    aria-label={`Nom de ${competency.name}`}
                    readOnly={Boolean(subjectStructure)}
                    onChange={(event) => updateCompetency(competency.id, { name: event.target.value })}
                    value={competency.name}
                  />
                  <select
                    aria-label={`Color de ${competency.name}`}
                    onChange={(event) => updateCompetency(competency.id, { color: event.target.value })}
                    value={competency.color}
                  >
                    {COMPETENCY_COLORS.map((color) => (
                      <option key={color.id} value={color.id}>
                        {color.label}
                      </option>
                    ))}
                  </select>
                  <button
                    className="danger-soft"
                    onClick={() => deleteCompetency(competency.id)}
                    title={subjectStructure ? 'Desactivar competència en aquesta UT' : 'Eliminar competència'}
                    type="button"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>

                <div className="criteria-editor-list">
                  {competency.criteria.map((criterion) => (
                    <div
                      className={`criterion-editor-row ${subjectStructure ? 'locked' : ''}`}
                      key={criterion.id}
                    >
                      <input
                        aria-label={`Nom de ${criterion.name}`}
                        readOnly={Boolean(subjectStructure)}
                        onChange={(event) => updateCriterion(criterion.id, { name: event.target.value })}
                        value={criterion.name}
                      />
                      {!subjectStructure && (
                        <button
                          className="danger-soft"
                          onClick={() => deleteCriterion(criterion.id)}
                          title="Eliminar criteri"
                          type="button"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  {!subjectStructure && (
                    <button className="secondary-action" onClick={() => addCriterion(competency.id)} type="button">
                      <Plus size={16} />
                      Afegir criteri
                    </button>
                  )}
                </div>
              </article>
            ))}
            {activeCompetencies.length === 0 && (
              <p className="empty-list">Aquesta UT encara no té competències.</p>
            )}
          </div>
        </section>

        <section className="modal-section copy-panel">
          <h3>
            <Copy size={18} />
            Copiar estructura
          </h3>
          <p>Selecciona competències de l’esquerra i envia-les a una UT d’una altra classe o de la mateixa.</p>
          <label className="field-label">
            Classe destí
            <select onChange={(event) => handleTargetClassChange(event.target.value)} value={targetClassId}>
              {orderedClasses.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            UT destí
            <select onChange={(event) => setTargetUtId(event.target.value)} value={targetUtId}>
              {targetUts.map((ut) => {
                const semester = state.semesters.find((item) => item.id === ut.semesterId)
                return (
                  <option key={ut.id} value={ut.id}>
                    {semester?.name} · {ut.name}
                  </option>
                )
              })}
            </select>
          </label>
          <button
            className="primary-action"
            disabled={selectedCompetencies.length === 0 || !targetUtId}
            onClick={handleCopy}
            type="button"
          >
            Copiar {selectedCompetencies.length} competència/es
          </button>
        </section>
      </div>
    </Modal>
  )
}
