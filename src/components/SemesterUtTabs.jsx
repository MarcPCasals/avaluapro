import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, CalendarClock, ChevronDown, Plus, Settings, Trash2 } from 'lucide-react'
import { loadPlanningAcademicYears, loadPlanningTemporalUnits } from '../data/cloud/planningFirestore'
import { DiagnosisLibraryModal } from '../features/students/DiagnosisLibraryModal'
import {
  findCurrentClassUt,
  getClassUtsInCourseOrder,
  matchClassUtsToTemporalUnits,
} from '../lib/currentTemporalUnit'
import { getLocalToday } from '../lib/reminders'
import { useAvaluaproStore } from '../store/useAvaluaproStore'

function formatUntil(dateKey) {
  if (!dateKey) return ''
  return new Intl.DateTimeFormat('ca-AD', { day: 'numeric', month: 'short' })
    .format(new Date(`${dateKey}T12:00:00`))
}

export function SemesterUtTabs() {
  const { activeClassId, activeSemesterId, activeUtId } = useAvaluaproStore((state) => state.ui)
  const user = useAvaluaproStore((state) => state.cloud.user)
  const allSemesters = useAvaluaproStore((state) => state.semesters)
  const allUts = useAvaluaproStore((state) => state.uts)
  const setActiveUt = useAvaluaproStore((state) => state.setActiveUt)
  const addUt = useAvaluaproStore((state) => state.addUt)
  const updateUt = useAvaluaproStore((state) => state.updateUt)
  const deleteUt = useAvaluaproStore((state) => state.deleteUt)
  const [manageUts, setManageUts] = useState(false)
  const [showOtherUts, setShowOtherUts] = useState(false)
  const [showDiagnosisLibrary, setShowDiagnosisLibrary] = useState(false)
  const [temporalUnits, setTemporalUnits] = useState([])
  const automaticSelectionRef = useRef('')
  const today = getLocalToday()

  const semesters = useMemo(
    () => allSemesters
      .filter((semester) => semester.classId === activeClassId)
      .sort((left, right) => Number(left.order || 0) - Number(right.order || 0)),
    [activeClassId, allSemesters],
  )
  const classUts = useMemo(
    () => getClassUtsInCourseOrder({ classId: activeClassId, semesters: allSemesters, uts: allUts }),
    [activeClassId, allSemesters, allUts],
  )
  const activeSemesterUts = useMemo(
    () => classUts.filter((ut) => ut.semesterId === activeSemesterId),
    [activeSemesterId, classUts],
  )
  const matches = useMemo(
    () => matchClassUtsToTemporalUnits({
      classId: activeClassId,
      semesters: allSemesters,
      temporalUnits,
      uts: allUts,
    }),
    [activeClassId, allSemesters, allUts, temporalUnits],
  )
  const currentMatch = useMemo(
    () => findCurrentClassUt({
      classId: activeClassId,
      semesters: allSemesters,
      temporalUnits,
      uts: allUts,
    }, today),
    [activeClassId, allSemesters, allUts, temporalUnits, today],
  )
  const activeUt = classUts.find((ut) => ut.id === activeUtId) || currentMatch?.ut || classUts[0]
  const activeMatch = matches.find((item) => item.ut.id === activeUt?.id)
  const activeTemporalUnit = activeMatch?.temporalUnit
  const activeSemester = semesters.find((semester) => semester.id === activeUt?.semesterId)
  const isShowingCurrent = Boolean(currentMatch?.ut.id && activeUt?.id === currentMatch.ut.id)

  useEffect(() => {
    let cancelled = false
    if (!user?.uid) {
      queueMicrotask(() => !cancelled && setTemporalUnits([]))
      return () => { cancelled = true }
    }
    Promise.resolve()
      .then(() => loadPlanningAcademicYears(user.uid))
      .then((years) => {
        if (cancelled) return []
        const currentYear = years.find((year) => year.startsOn <= today && year.endsOn >= today) || years[0]
        return currentYear ? loadPlanningTemporalUnits(user.uid, currentYear.id) : []
      })
      .then((units) => !cancelled && setTemporalUnits(units))
      .catch(() => !cancelled && setTemporalUnits([]))
    return () => { cancelled = true }
  }, [today, user?.uid])

  useEffect(() => {
    if (!currentMatch?.ut.id) return
    const selectionKey = `${activeClassId}:${currentMatch.ut.id}`
    if (automaticSelectionRef.current === selectionKey) return
    automaticSelectionRef.current = selectionKey
    if (activeUtId !== currentMatch.ut.id) setActiveUt(currentMatch.ut.id)
  }, [activeClassId, activeUtId, currentMatch?.ut.id, setActiveUt])

  return (
    <div className="time-tabs current-ut-tabs" data-tour="time-tabs">
      <div className="current-ut-primary">
        <span className="current-ut-icon"><CalendarClock size={19} /></span>
        <div>
          <small>{isShowingCurrent ? 'UT actual' : 'UT seleccionada'}</small>
          <strong>{activeUt?.name || 'Sense UT'}</strong>
          {activeTemporalUnit?.endsOn && <span>fins al {formatUntil(activeTemporalUnit.endsOn)}</span>}
        </div>
      </div>
      <button className="other-uts-trigger" onClick={() => setShowOtherUts(true)} type="button">
        Altres UTs <ChevronDown size={16} />
      </button>
      {!isShowingCurrent && currentMatch?.ut && (
        <button className="current-ut-return" onClick={() => setActiveUt(currentMatch.ut.id)} type="button">
          Tornar a {currentMatch.ut.name}
        </button>
      )}
      <button className="ut-manager-trigger" onClick={() => setManageUts(true)} title="Gestionar UTs" type="button">
        <Settings size={16} />
      </button>
      <button
        className="diagnosis-library-trigger"
        data-tour="diagnosis-library-button"
        onClick={() => setShowDiagnosisLibrary(true)}
        title="Biblioteca de diagnòstics"
        type="button"
      >
        <BookOpen size={17} />
      </button>

      {showOtherUts && (
        <div className="modal-backdrop">
          <div className="modal-panel current-ut-modal">
            <header className="modal-header">
              <div><h2>Altres UTs</h2><p>La UT vigent es recupera automàticament quan tornes a entrar.</p></div>
              <button className="modal-close" onClick={() => setShowOtherUts(false)} type="button">×</button>
            </header>
            <div className="modal-body other-uts-list">
              {matches.map(({ temporalUnit, ut }) => {
                const semester = semesters.find((item) => item.id === ut.semesterId)
                const isCurrent = currentMatch?.ut.id === ut.id
                return (
                  <button
                    className={`${ut.id === activeUt?.id ? 'active' : ''} ${isCurrent ? 'current' : ''}`}
                    key={ut.id}
                    onClick={() => { setActiveUt(ut.id); setShowOtherUts(false) }}
                    type="button"
                  >
                    <span><strong>{ut.name}</strong><small>{semester?.name || ''}</small></span>
                    <span>{temporalUnit?.endsOn ? `fins al ${formatUntil(temporalUnit.endsOn)}` : ''}</span>
                    {isCurrent && <em>Actual</em>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
      {showDiagnosisLibrary && <DiagnosisLibraryModal onClose={() => setShowDiagnosisLibrary(false)} />}
      {manageUts && (
        <div className="modal-backdrop">
          <div className="modal-panel">
            <header className="modal-header">
              <h2>Gestionar UTs</h2>
              <button className="modal-close" onClick={() => setManageUts(false)} type="button">×</button>
            </header>
            <div className="modal-body ut-manager">
              <p>
                Aquí pots canviar els noms de les UT d’avaluació. Les dates es gestionen una sola vegada des de Programació.
              </p>
              <div className="ut-manager-list">
                {activeSemesterUts.map((ut) => (
                  <div className="ut-manager-row" key={ut.id}>
                    <input onChange={(event) => updateUt(ut.id, { name: event.target.value })} value={ut.name} />
                    <button className="danger-soft" disabled={activeSemesterUts.length <= 1} onClick={() => deleteUt(ut.id)} title="Eliminar UT" type="button">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button className="secondary-action" disabled={!activeSemester} onClick={() => addUt(activeSemester.id)} type="button">
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
