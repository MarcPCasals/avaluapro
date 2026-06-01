import { useEffect, useMemo, useState } from 'react'
import { BookOpen, FileSpreadsheet, MapPinned, MessageCircle, Users } from 'lucide-react'
import { getDominantDiagnosis } from '../../data/studentAnnotations'
import { getSubjectStructure } from '../../data/subjects'
import { calculateGrade, GRADE_OPTIONS, gradeClassName, gradeTextClassName } from '../../lib/grades'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'
import { ManageStudentsModal } from '../students/ManageStudentsModal'
import { StudentAnnotationsModal } from '../students/StudentAnnotationsModal'
import { StudentProfileModal } from '../students/StudentProfileModal'
import { EditStructureModal } from './EditStructureModal'
import { ImportExcelModal } from './ImportExcelModal'
import { RubricModal } from './RubricModal'
import { SeatingChartsModal } from './SeatingChartsModal'

function useEvaluationModel() {
  const { activeClassId, activeUtId } = useAvaluaproStore((state) => state.ui)
  const allStudents = useAvaluaproStore((state) => state.students)
  const allCompetencies = useAvaluaproStore((state) => state.competencies)
  const allCriteria = useAvaluaproStore((state) => state.criteria)
  const marks = useAvaluaproStore((state) => state.marks)
  const agendaNotes = useAvaluaproStore((state) => state.agendaNotes)

  return useMemo(() => {
    const students = allStudents
      .filter((student) => student.classId === activeClassId)
      .sort((a, b) => a.name.localeCompare(b.name, 'ca', { numeric: true }))
    const competencies = allCompetencies
      .filter((competency) => competency.utId === activeUtId)
      .sort((a, b) => a.order - b.order)
      .map((competency) => {
        const criteria = allCriteria
          .filter((criterion) => criterion.competencyId === competency.id)
          .sort((a, b) => a.order - b.order)
        return { ...competency, criteria }
      })

    return { students, competencies, marks, agendaNotes }
  }, [activeClassId, activeUtId, allStudents, allCompetencies, allCriteria, marks, agendaNotes])
}

function getCriterionMark(marks, studentId, criterionId) {
  return marks.find((mark) => mark.studentId === studentId && mark.criterionId === criterionId)?.value || ''
}

function getCompetencyGrade(marks, studentId, competency) {
  const grades = competency.criteria.map((criterion) => getCriterionMark(marks, studentId, criterion.id))
  return calculateGrade(grades)
}

function getEmptyStateCopy(activeClass, subjectStructure) {
  if (!activeClass?.subject) {
    return {
      title: 'Configura la matèria del grup.',
      body: 'Així Avaluapro podrà carregar automàticament les competències i criteris de cada UT.',
      action: 'Configurar competències',
    }
  }

  if (!subjectStructure) {
    return {
      title: `Encara no hi ha estructura per a ${activeClass.subject}.`,
      body: 'Aquesta assignatura encara no té competències precarregades. De moment pots crear l’estructura manualment.',
      action: 'Crear estructura',
    }
  }

  return {
    title: 'Aquesta UT no té cap competència activa.',
    body: 'Activa les competències que treballaràs en aquesta UT. Els criteris vindran sempre amb la competència.',
    action: 'Activar competències',
  }
}

function getStudentRowClass(dominantDiagnosis) {
  return [dominantDiagnosis ? `student-diagnosis-${dominantDiagnosis.color}` : '']
    .filter(Boolean)
    .join(' ')
}

export function EvaluationView() {
  const { students, competencies, marks, agendaNotes } = useEvaluationModel()
  const activeClassId = useAvaluaproStore((state) => state.ui.activeClassId)
  const activeUtId = useAvaluaproStore((state) => state.ui.activeUtId)
  const activeClass = useAvaluaproStore((state) =>
    state.classes.find((classItem) => classItem.id === state.ui.activeClassId),
  )
  const updateMark = useAvaluaproStore((state) => state.updateMark)
  const updateMarksBulk = useAvaluaproStore((state) => state.updateMarksBulk)
  const seatingCharts = useAvaluaproStore((state) => state.seatingCharts)
  const upsertSeatingChart = useAvaluaproStore((state) => state.upsertSeatingChart)
  const deleteSeatingChart = useAvaluaproStore((state) => state.deleteSeatingChart)
  const [showStudentsModal, setShowStudentsModal] = useState(false)
  const [showStructureModal, setShowStructureModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showSeatingModal, setShowSeatingModal] = useState(false)
  const [rubricCriterionId, setRubricCriterionId] = useState(null)
  const [profileStudentId, setProfileStudentId] = useState(null)
  const [annotationsStudentId, setAnnotationsStudentId] = useState(null)
  const [halfGroupFilter, setHalfGroupFilter] = useState('all')
  const subjectStructure = getSubjectStructure(activeClass?.subject)
  const activeCompetencyCount = competencies.length
  const totalSubjectCompetencies = subjectStructure?.length || activeCompetencyCount
  const competencySummaryIsComplete =
    totalSubjectCompetencies > 0 && activeCompetencyCount === totalSubjectCompetencies
  const emptyStateCopy = getEmptyStateCopy(activeClass, subjectStructure)
  const halfGroups = Array.from(new Set(students.map((student) => student.halfGroup).filter(Boolean))).sort()
  const filteredStudents = students.filter(
    (student) => halfGroupFilter === 'all' || student.halfGroup === halfGroupFilter,
  )
  const studentOrder = new Map(filteredStudents.map((student, index) => [student.id, index]))
  const flatCriteria = competencies.flatMap((competency) => competency.criteria)
  const criterionOrder = new Map(flatCriteria.map((criterion, index) => [criterion.id, index]))
  const classSeatingCharts = seatingCharts.filter((chart) => chart.classId === activeClassId)
  const getEvaluationTabIndex = (studentId, criterionId) => {
    const studentIndex = studentOrder.get(studentId) ?? 0
    const criterionIndex = criterionOrder.get(criterionId) ?? 0

    return studentIndex * flatCriteria.length + criterionIndex + 1
  }
  const focusNextEvaluationSelect = (studentId, criterionId) => {
    const studentIndex = studentOrder.get(studentId) ?? 0
    const criterionIndex = criterionOrder.get(criterionId) ?? 0
    const currentFlatIndex = studentIndex * flatCriteria.length + criterionIndex
    const nextFlatIndex = currentFlatIndex + 1
    const nextStudent = filteredStudents[Math.floor(nextFlatIndex / flatCriteria.length)]
    const nextCriterion = flatCriteria[nextFlatIndex % flatCriteria.length]
    if (!nextStudent || !nextCriterion) return

    const nextSelect = document.querySelector(
      `[data-evaluation-select="${nextStudent.id}_${nextCriterion.id}"]`,
    )
    nextSelect?.focus()
  }

  useEffect(() => {
    const handleOpenFirstAnnotations = () => {
      const student = filteredStudents[0] || students[0]
      if (student) setAnnotationsStudentId(student.id)
    }

    window.addEventListener('avaluapro-open-first-annotations', handleOpenFirstAnnotations)
    return () => window.removeEventListener('avaluapro-open-first-annotations', handleOpenFirstAnnotations)
  }, [filteredStudents, students])

  return (
    <section className="work-surface">
      <div className="toolbar" data-tour="evaluation-toolbar">
        {totalSubjectCompetencies > 0 && (
          <button
            className={`ut-competency-summary ${competencySummaryIsComplete ? 'complete' : 'partial'}`}
            data-tour="ut-competency-toggle"
            onClick={() => setShowStructureModal(true)}
            type="button"
          >
            <strong>
              {activeCompetencyCount}/{totalSubjectCompetencies}
            </strong>
            competències actives
          </button>
        )}
        {halfGroups.length > 0 && (
          <select
            className="half-group-select"
            data-tour="half-group-filter"
            onChange={(event) => setHalfGroupFilter(event.target.value)}
            value={halfGroupFilter}
          >
            <option value="all">Tots els alumnes</option>
            {halfGroups.map((halfGroup) => (
              <option key={halfGroup} value={halfGroup}>
                {halfGroup}
              </option>
            ))}
          </select>
        )}
        <button className="tool-button" data-tour="seating-button" onClick={() => setShowSeatingModal(true)} type="button">
          <MapPinned size={18} />
          Llocs Fixos
        </button>
        <button className="tool-button" data-tour="import-excel-button" onClick={() => setShowImportModal(true)} type="button">
          <FileSpreadsheet size={18} />
          Importar Excel
        </button>
        <button className="tool-button dark" data-tour="manage-students-button" onClick={() => setShowStudentsModal(true)} type="button">
          <Users size={18} />
          Gestió d’Alumnes
        </button>
      </div>
      {showStudentsModal && (
        <ManageStudentsModal classId={activeClassId} onClose={() => setShowStudentsModal(false)} />
      )}
      {showStructureModal && (
        <EditStructureModal activeUtId={activeUtId} onClose={() => setShowStructureModal(false)} />
      )}
      {showImportModal && (
        <ImportExcelModal
          criteria={flatCriteria}
          students={filteredStudents}
          onClose={() => setShowImportModal(false)}
          onSave={updateMarksBulk}
        />
      )}
      {showSeatingModal && (
        <SeatingChartsModal
          charts={classSeatingCharts}
          classId={activeClassId}
          halfGroups={halfGroups}
          onClose={() => setShowSeatingModal(false)}
          onDelete={deleteSeatingChart}
          onSave={upsertSeatingChart}
        />
      )}
      {rubricCriterionId && (
        <RubricModal criterionId={rubricCriterionId} onClose={() => setRubricCriterionId(null)} />
      )}
      {profileStudentId && (
        <StudentProfileModal
          mode="evaluation"
          studentId={profileStudentId}
          onClose={() => setProfileStudentId(null)}
          onOpenAnnotations={(studentId) => {
            setProfileStudentId(null)
            setAnnotationsStudentId(studentId)
          }}
        />
      )}
      {annotationsStudentId && (
        <StudentAnnotationsModal
          studentId={annotationsStudentId}
          onClose={() => setAnnotationsStudentId(null)}
          onOpenProfile={(studentId) => {
            setAnnotationsStudentId(null)
            setProfileStudentId(studentId)
          }}
        />
      )}
      {competencies.length === 0 ? (
        <section className="empty-state">
          <h2>{emptyStateCopy.title}</h2>
          <p>{emptyStateCopy.body}</p>
          <div className="empty-actions">
            <button className="primary-action" onClick={() => setShowStructureModal(true)} type="button">
              {emptyStateCopy.action}
            </button>
            <button className="secondary-action" onClick={() => setShowStudentsModal(true)} type="button">
              Gestionar alumnes
            </button>
          </div>
        </section>
      ) : (
      <div className="grid-scroll" data-tour="evaluation-table">
        <table className="evaluation-table">
          <thead>
            <tr>
              <th className="sticky-student header-student" rowSpan="2">
                <span>
                  <Users size={22} />
                  Alumnes
                </span>
                <MessageCircle size={22} className="note-signal" />
              </th>
              {competencies.map((competency) => {
                const colSpan = competency.criteria.length + 1
                return (
                  <th className={`competency-header ${competency.color}`} colSpan={colSpan} key={competency.id}>
                    {competency.name}
                  </th>
                )
              })}
            </tr>
            <tr>
              {competencies.flatMap((competency) => [
                ...competency.criteria.map((criterion) => (
                  <th className="criterion-header criterion-direct" key={criterion.id}>
                    <button
                      className="criterion-rubric-button"
                      onClick={() => setRubricCriterionId(criterion.id)}
                      title="Veure o editar rúbrica"
                      type="button"
                    >
                      <span>{criterion.name}</span>
                      <BookOpen size={14} />
                    </button>
                  </th>
                )),
                <th className="final-header" key={`${competency.id}_final`}>
                  Nota
                </th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student, index) => {
              const dominantDiagnosis = getDominantDiagnosis(student.diagnoses)
              const studentNotes = agendaNotes.filter(
                (note) => note.studentId === student.id && note.classId === activeClassId,
              )
              const hasTeamNotes = studentNotes.some((note) => note.type === 'team')
              const hasTutoringNotes = studentNotes.some((note) => note.type === 'tutoring')
              const noteState = hasTeamNotes ? 'team' : hasTutoringNotes ? 'tutoring' : 'empty'

              return (
              <tr className={getStudentRowClass(dominantDiagnosis)} key={student.id}>
                <td className="sticky-student student-cell">
                  <span className="student-index">{index + 1}.</span>
                  <button
                    className={`student-note-button ${noteState}`}
                    data-tour={index === 0 ? 'student-comments' : undefined}
                    onClick={() => setAnnotationsStudentId(student.id)}
                    title="Resum i anotacions per reunió"
                    type="button"
                  >
                    <MessageCircle size={17} />
                  </button>
                  <button
                    className="student-name student-profile-trigger"
                    data-tour={index === 0 ? 'student-name-open' : undefined}
                    onClick={() => setProfileStudentId(student.id)}
                    type="button"
                  >
                    {student.name}
                    <small>{student.halfGroup}</small>
                  </button>
                </td>
                {competencies.flatMap((competency) => [
                  ...competency.criteria.map((criterion) => {
                    const value = getCriterionMark(marks, student.id, criterion.id)
                    return (
                      <td className="mark-cell criterion-mark-cell" key={`${student.id}_${criterion.id}`}>
                        <select
                          className={gradeTextClassName(value)}
                          data-evaluation-select={`${student.id}_${criterion.id}`}
                          onChange={(event) => updateMark(student.id, criterion.id, event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key !== 'Tab' || event.shiftKey) return
                            event.preventDefault()
                            focusNextEvaluationSelect(student.id, criterion.id)
                          }}
                          tabIndex={getEvaluationTabIndex(student.id, criterion.id)}
                          value={value}
                        >
                          {GRADE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option || '-'}
                            </option>
                          ))}
                        </select>
                      </td>
                    )
                  }),
                  <td className="aggregate-cell final" key={`${student.id}_${competency.id}_grade`}>
                    <span className={gradeClassName(getCompetencyGrade(marks, student.id, competency))}>
                      {getCompetencyGrade(marks, student.id, competency) || '-'}
                    </span>
                  </td>,
                ])}
              </tr>
            )})}
          </tbody>
        </table>
      </div>
      )}
    </section>
  )
}
