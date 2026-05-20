import { useMemo, useState } from 'react'
import { Plus, Settings, Trash2 } from 'lucide-react'
import { useAvaluaproStore } from '../store/useAvaluaproStore'

export function SemesterUtTabs() {
  const { activeClassId, activeSemesterId, activeUtId } = useAvaluaproStore((state) => state.ui)
  const allSemesters = useAvaluaproStore((state) => state.semesters)
  const allUts = useAvaluaproStore((state) => state.uts)
  const setActiveSemester = useAvaluaproStore((state) => state.setActiveSemester)
  const setActiveUt = useAvaluaproStore((state) => state.setActiveUt)
  const addUt = useAvaluaproStore((state) => state.addUt)
  const updateUt = useAvaluaproStore((state) => state.updateUt)
  const deleteUt = useAvaluaproStore((state) => state.deleteUt)
  const [manageUts, setManageUts] = useState(false)
  const semesters = useMemo(
    () =>
      allSemesters
        .filter((semester) => semester.classId === activeClassId)
        .sort((a, b) => a.order - b.order),
    [activeClassId, allSemesters],
  )
  const uts = useMemo(
    () =>
      allUts
        .filter((ut) => ut.semesterId === activeSemesterId)
        .sort((a, b) => a.order - b.order),
    [activeSemesterId, allUts],
  )
  const activeSemester = semesters.find((semester) => semester.id === activeSemesterId)

  return (
    <div className="time-tabs" data-tour="time-tabs">
      <div className="semester-tabs">
        {semesters.map((semester) => (
          <button
            className={`semester-tab ${semester.id === activeSemesterId ? 'active' : ''}`}
            key={semester.id}
            onClick={() => setActiveSemester(semester.id)}
            type="button"
          >
            {semester.name}
          </button>
        ))}
      </div>
      <div className="ut-tabs">
        {uts.map((ut) => (
          <button
            className={`ut-tab ${ut.id === activeUtId ? 'active' : ''}`}
            key={ut.id}
            onClick={() => setActiveUt(ut.id)}
            type="button"
          >
            {ut.name}
          </button>
        ))}
        <button className="ut-tab utility" onClick={() => setManageUts(true)} title="Gestionar UTs" type="button">
          <Settings size={16} />
          UTs
        </button>
      </div>
      {manageUts && (
        <div className="modal-backdrop">
          <div className="modal-panel">
            <header className="modal-header">
              <h2>Gestionar UTs</h2>
              <button className="modal-close" onClick={() => setManageUts(false)} type="button">
                ×
              </button>
            </header>
            <div className="modal-body ut-manager">
              <p>
                Per defecte hi ha UT1, UT2, UT3 i UT4. Pots canviar-ne el nom, eliminar-ne o afegir-ne de noves
                dins del semestre actiu.
              </p>
              <div className="ut-manager-list">
                {uts.map((ut) => (
                  <div className="ut-manager-row" key={ut.id}>
                    <input
                      onChange={(event) => updateUt(ut.id, { name: event.target.value })}
                      value={ut.name}
                    />
                    <button
                      className="danger-soft"
                      disabled={uts.length <= 1}
                      onClick={() => deleteUt(ut.id)}
                      title="Eliminar UT"
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="secondary-action"
                disabled={!activeSemester}
                onClick={() => addUt(activeSemesterId)}
                type="button"
              >
                <Plus size={16} />
                Afegir UT a {activeSemester?.name || 'aquest semestre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
