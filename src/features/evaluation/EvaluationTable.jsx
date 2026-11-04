import { getPreviousClassActionResults } from '../../lib/actionProgress'
import { getPreviousActionOrientations } from '../../lib/actionNotes'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CriterionGradeModal } from './CriterionGradeModal'
import { getCriterionActionKey, getSelectedCriterionActions } from '../../lib/evaluationActions'
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
  onUpdateActionNote,
  actionNoteContext,
  utId,
  evaluationScope = 'specific',
  students = [],
}) {
  const [grading, setGrading] = useState(null)
  const gradingCriterionKey = grading ? getCriterionActionKey(grading.competency, grading.criterion) : ''
  const previousClassResults = useMemo(() => gradingCriterionKey
    ? getPreviousClassActionResults(actionNoteContext, activeClassId, utId, evaluationScope, gradingCriterionKey)
    : {}, [actionNoteContext, activeClassId, utId, evaluationScope, gradingCriterionKey])
  const [studentQuery, setStudentQuery] = useState('')
  const searchRef = useRef(null)
  const normalizeName = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('ca').trim()
  const queryWords = normalizeName(studentQuery).split(/\s+/).filter(Boolean)
  const visibleStudents = students.filter((student) => queryWords.every((word) => normalizeName(student.name).includes(word)))
  useEffect(() => {
    const focusSearch = (event) => {
      if (!event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || event.code !== 'KeyJ') return
      if (document.querySelector('[role="dialog"], dialog[open]')) return
      event.preventDefault()
      searchRef.current?.focus()
      searchRef.current?.select()
    }
    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [])
  const flatCriteria = competencies.flatMap((competency) => competency.criteria)
  const studentOrder = new Map(visibleStudents.map((student, index) => [student.id, index]))
  const criterionOrder = new Map(flatCriteria.map((criterion, index) => [criterion.id, index]))

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
    const nextStudent = visibleStudents[Math.floor(nextFlatIndex / flatCriteria.length)]
    const nextCriterion = flatCriteria[nextFlatIndex % flatCriteria.length]
    if (!nextStudent || !nextCriterion) return

    document.querySelector(
      `[data-evaluation-select="${nextStudent.id}_${nextCriterion.id}"]`,
    )?.focus()
  }
  const nextGradingStudent = grading && visibleStudents[(studentOrder.get(grading.student.id) ?? -1) + 1]

  return (
    <>
    {grading && <CriterionGradeModal
      key={`${grading.student.id}:${grading.criterion.id}`}
      {...grading} value={getCriterionMark(marks, grading.student.id, grading.criterion.id)}
      mark={marks.find(mark => mark.studentId === grading.student.id && mark.criterionId === grading.criterion.id)}
      actions={getSelectedCriterionActions(actionCatalog, grading.competency, grading.criterion)}
      previousClassResults={previousClassResults}
      previousOrientations={getPreviousActionOrientations(actionNoteContext, grading.student.id, grading.competency, grading.criterion, utId)}
      onSaveActionNote={onUpdateActionNote ? (action, note) => onUpdateActionNote(grading.student.id, grading.criterion.id, action, note) : undefined}
      utName={utName} onClose={() => setGrading(null)}
      onConfigure={onConfigureActions ? () => { setGrading(null); onConfigureActions() } : undefined}
      onSave={value => onUpdateMark(grading.student.id, grading.criterion.id, value)}
      onNextStudent={nextGradingStudent ? () => setGrading({ ...grading, student: nextGradingStudent }) : undefined}
      onSaveActions={onUpdateActionGrades ? grades => onUpdateActionGrades(grading.student.id, grading.criterion.id, grades) : undefined} />}
    <div className="grid-scroll" data-tour="evaluation-table">
      <table className="evaluation-table">
        <thead>
          <tr>
            <th className="sticky-student header-student" rowSpan="2">
              <div className="student-header-tools">
              <span>
                <Users size={22} />
                Alumnes
              </span>
              <input
                ref={searchRef}
                className="student-name-search"
                type="search"
                aria-label="Cercar alumnes pel nom"
                aria-keyshortcuts="Meta+J"
                placeholder="Cerca… ⌘ J"
                title="Cercar alumnes (⌘ + J)"
                value={studentQuery}
                onChange={(event) => setStudentQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    event.stopPropagation()
                    setStudentQuery('')
                  }
                }}
              />
              <button
                className="note-signal"
                onClick={onOpenReminders}
                title="Recordatoris del grup"
                type="button"
              >
                <Bell size={20} />
              </button>
              </div>
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
          {visibleStudents.length === 0 && (
            <tr><td colSpan={1 + flatCriteria.length + competencies.length} className="student-search-empty" role="status">
              {studentQuery.trim() ? 'Cap alumne coincideix amb la cerca.' : 'No hi ha alumnes en aquest grup.'}
            </td></tr>
          )}
          {visibleStudents.map((student, index) => {
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
                  <span className="student-index">{students.indexOf(student) + 1}.</span>
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
