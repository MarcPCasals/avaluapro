import { useState } from 'react'
import { CriterionGradeModal } from './CriterionGradeModal'
import { getSelectedCriterionActions } from '../../lib/evaluationActions'
import { getActionGradeSummary, isActionGradedMark } from '../../lib/actionGrades'
import { Bell, BookOpen, MessageCircle, Users } from 'lucide-react'
import { getDominantDiagnosis } from '../../data/studentAnnotations.js'
import { calculateGrade, gradeClassName, gradeTextClassName } from '../../lib/grades.js'

function getCriterionMark(marks, studentId, criterionId) {
  return marks.find((mark) => mark.studentId === studentId && mark.criterionId === criterionId)?.value || ''
}

function getCompetencyGrade(marks, studentId, competency) {
  const grades = competency.criteria.map((criterion) => getCriterionMark(marks, studentId, criterion.id))
  return calculateGrade(grades)
}

function isCompetencyModified(marks, studentId, competencyId) {
  return marks.some(
    (mark) =>
      mark.type === 'competency-modification' &&
      mark.studentId === studentId &&
      mark.competencyId === competencyId,
  )
}

function hasStudentModifiedCompetencies(marks, studentId) {
  return marks.some((mark) => mark.type === 'competency-modification' && mark.studentId === studentId)
}

function getStudentRowClass(dominantDiagnosis) {
  return dominantDiagnosis ? `student-diagnosis-${dominantDiagnosis.color}` : ''
}

export function EvaluationTable({
  activeClassId,
  actionCatalog = {},
  utName,
  onConfigureActions,
  agendaNotes = [],
  competencies = [],
  marks = [],
  onOpenAnnotations = () => {},
  onOpenProfile = () => {},
  onOpenReminders = () => {},
  onOpenRubric = () => {},
  onToggleCompetencyModification = () => {},
  onUpdateMark = () => {},
  onUpdateActionGrades,
  students = [],
}) {
  const [grading, setGrading] = useState(null)
  const flatCriteria = competencies.flatMap((competency) => competency.criteria)
  const studentOrder = new Map(students.map((student, index) => [student.id, index]))
  const criterionOrder = new Map(flatCriteria.map((criterion, index) => [criterion.id, index]))
  const nextGradingStudent = grading ? students[studentOrder.get(grading.student.id) + 1] : null

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
    const nextStudent = students[Math.floor(nextFlatIndex / flatCriteria.length)]
    const nextCriterion = flatCriteria[nextFlatIndex % flatCriteria.length]
    if (!nextStudent || !nextCriterion) return

    document.querySelector(
      `[data-evaluation-select="${nextStudent.id}_${nextCriterion.id}"]`,
    )?.focus()
  }

  return (
    <>
    {grading && <CriterionGradeModal
      key={`${grading.student.id}:${grading.criterion.id}`}
      {...grading} value={getCriterionMark(marks, grading.student.id, grading.criterion.id)}
      mark={marks.find(mark => mark.studentId === grading.student.id && mark.criterionId === grading.criterion.id)}
      actions={getSelectedCriterionActions(actionCatalog, grading.competency, grading.criterion)}
      utName={utName} onClose={() => setGrading(null)}
      nextStudentName={nextGradingStudent?.name}
      onNextStudent={nextGradingStudent ? () => setGrading({ ...grading, student: nextGradingStudent }) : undefined}
      onConfigure={onConfigureActions ? () => { setGrading(null); onConfigureActions() } : undefined}
      onSave={value => onUpdateMark(grading.student.id, grading.criterion.id, value)}
      onSaveActions={onUpdateActionGrades ? grades => onUpdateActionGrades(grading.student.id, grading.criterion.id, grades) : undefined} />}
    <div className="grid-scroll" data-tour="evaluation-table">
      <table className="evaluation-table">
        <thead>
          <tr>
            <th className="sticky-student header-student" rowSpan="2">
              <span>
                <Users size={22} />
                Alumnes
              </span>
              <button
                className="note-signal"
                onClick={onOpenReminders}
                title="Recordatoris del grup"
                type="button"
              >
                <Bell size={20} />
              </button>
            </th>
            {competencies.map((competency) => (
              <th
                className={`competency-header ${competency.color}`}
                colSpan={competency.criteria.length + 1}
                key={competency.id}
              >
                {competency.name}
              </th>
            ))}
          </tr>
          <tr>
            {competencies.flatMap((competency) => [
              ...competency.criteria.map((criterion) => (
                <th className="criterion-header criterion-direct" key={criterion.id}>
                  <button
                    className="criterion-rubric-button"
                    onClick={() => onOpenRubric(criterion.id)}
                    title="Veure o editar rúbrica"
                    type="button"
                  >
                    <span>{criterion.name}</span>
                    <BookOpen size={14} />
                  </button>
                </th>
              )),
              <th className="final-header" key={`${competency.id}_final`}>Nota</th>,
            ])}
          </tr>
        </thead>
        <tbody>
          {students.map((student, index) => {
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
                    onClick={() => onOpenAnnotations(student.id)}
                    title="Resum i anotacions per reunió"
                    type="button"
                  >
                    <MessageCircle size={17} />
                  </button>
                  <button
                    className="student-name student-profile-trigger"
                    data-tour={index === 0 ? 'student-name-open' : undefined}
                    onClick={() => onOpenProfile(student.id)}
                    type="button"
                  >
                    {student.name}
                    <span className="student-list-meta">
                      {student.halfGroup && <small>{student.halfGroup}</small>}
                      {student.isSkiStudyStudent && (
                        <span className="student-ee-badge" title="Esquí Estudi">EE</span>
                      )}
                    </span>
                  </button>
                </td>
                {competencies.flatMap((competency) => [
                  ...competency.criteria.map((criterion) => {
                    const value = getCriterionMark(marks, student.id, criterion.id)
                    const mark = marks.find(item => item.studentId === student.id && item.criterionId === criterion.id)
                    const actionSummary = getActionGradeSummary(criterion, mark)
                    return (
                      <td className="mark-cell criterion-mark-cell" key={`${student.id}_${criterion.id}`}>
                        <button
                          aria-label={`${student.name} · ${competency.name} · ${criterion.name}`}
                          className={gradeTextClassName(value)}
                          data-evaluation-select={`${student.id}_${criterion.id}`}
                          type="button"
                          aria-haspopup="dialog"
                          onClick={() => setGrading({ student, competency, criterion })}
                          onKeyDown={(event) => {
                            if (event.key !== 'Tab' || event.shiftKey) return
                            event.preventDefault()
                            focusNextEvaluationSelect(student.id, criterion.id)
                          }}
                          tabIndex={getEvaluationTabIndex(student.id, criterion.id)}
                          title="Veure les accions de la UT i posar la nota"
                        >
                          {value || '-'}
                          {isActionGradedMark(mark) && actionSummary.provisional && <small className="action-grade-provisional">Provisional · {actionSummary.evaluated}/{actionSummary.total}</small>}
                          {criterion.selectedActionIds?.length > 0 && value && !isActionGradedMark(mark) && <small className="action-grade-provisional">Nota anterior</small>}
                        </button>
                      </td>
                    )
                  }),
                  <td
                    className={`aggregate-cell final ${
                      isCompetencyModified(marks, student.id, competency.id) ? 'modified-competency-cell' : ''
                    }`}
                    key={`${student.id}_${competency.id}_grade`}
                  >
                    {hasStudentModifiedCompetencies(marks, student.id) && (
                      <button
                        className={`modified-competency-toggle ${
                          isCompetencyModified(marks, student.id, competency.id) ? 'active' : ''
                        }`}
                        onClick={() => onToggleCompetencyModification(student.id, competency.id)}
                        title="Marcar competència modificada: el balanç estàndard comptarà com a D"
                        type="button"
                      >
                        M
                      </button>
                    )}
                    <span className={gradeClassName(getCompetencyGrade(marks, student.id, competency))}>
                      {getCompetencyGrade(marks, student.id, competency) || '-'}
                    </span>
                  </td>,
                ])}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
    </>
  )
}
