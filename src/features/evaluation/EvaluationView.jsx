import { useEffect, useMemo, useState } from 'react'
import { Download, FileSpreadsheet, MapPinned, Users } from 'lucide-react'
import { getSubjectStructure } from '../../data/subjects'
import { downloadBlob, getTodaySlug } from '../../lib/downloads'
import { calculateGrade } from '../../lib/grades'
import { isStudentExemptFromSubject } from '../../lib/tutorialExemptions'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'
import { AbsenceToggle } from '../attendance/AbsenceToggle'
import { ManageStudentsModal } from '../students/ManageStudentsModal'
import { RemindersModal } from '../data/RemindersModal'
import { StudentAnnotationsModal } from '../students/StudentAnnotationsModal'
import { StudentProfileModal } from '../students/StudentProfileModal'
import { EditStructureModal } from './EditStructureModal'
import { EvaluationTable } from './EvaluationTable'
import { ImportExcelModal } from './ImportExcelModal'
import { RubricModal } from './RubricModal'
import { SeatingChartsModal } from './SeatingChartsModal'

function useEvaluationModel() {
  const { activeClassId, activeUtId } = useAvaluaproStore((state) => state.ui)
  const allStudents = useAvaluaproStore((state) => state.students)
  const activeClass = useAvaluaproStore((state) =>
    state.classes.find((classItem) => classItem.id === state.ui.activeClassId),
  )
  const allCompetencies = useAvaluaproStore((state) => state.competencies)
  const allCriteria = useAvaluaproStore((state) => state.criteria)
  const marks = useAvaluaproStore((state) => state.marks)
  const agendaNotes = useAvaluaproStore((state) => state.agendaNotes)

  return useMemo(() => {
    const students = allStudents
      .filter(
        (student) =>
          student.classId === activeClassId && !isStudentExemptFromSubject(student, activeClass?.subject),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'ca', { numeric: true }))
    const competencies = allCompetencies
      .filter((competency) => competency.utId === activeUtId && !competency.inactive)
      .sort((a, b) => a.order - b.order)
      .map((competency) => {
        const criteria = allCriteria
          .filter((criterion) => criterion.competencyId === competency.id)
          .sort((a, b) => a.order - b.order)
        return { ...competency, criteria }
      })

    return { students, competencies, marks, agendaNotes }
  }, [activeClass?.subject, activeClassId, activeUtId, allStudents, allCompetencies, allCriteria, marks, agendaNotes])
}

function getCriterionMark(marks, studentId, criterionId) {
  return marks.find((mark) => mark.studentId === studentId && mark.criterionId === criterionId)?.value || ''
}

function getCompetencyGrade(marks, studentId, competency) {
  const grades = competency.criteria.map((criterion) => getCriterionMark(marks, studentId, criterion.id))
  return calculateGrade(grades)
}

function escapeCell(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
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

export function EvaluationView() {
  const { students, competencies, marks, agendaNotes } = useEvaluationModel()
  const activeClassId = useAvaluaproStore((state) => state.ui.activeClassId)
  const activeUtId = useAvaluaproStore((state) => state.ui.activeUtId)
  const activeClass = useAvaluaproStore((state) =>
    state.classes.find((classItem) => classItem.id === state.ui.activeClassId),
  )
  const activeUt = useAvaluaproStore((state) => state.uts.find((ut) => ut.id === state.ui.activeUtId))
  const updateMark = useAvaluaproStore((state) => state.updateMark)
  const updateMarksBulk = useAvaluaproStore((state) => state.updateMarksBulk)
  const toggleCompetencyModification = useAvaluaproStore((state) => state.toggleCompetencyModification)
  const seatingCharts = useAvaluaproStore((state) => state.seatingCharts)
  const upsertSeatingChart = useAvaluaproStore((state) => state.upsertSeatingChart)
  const deleteSeatingChart = useAvaluaproStore((state) => state.deleteSeatingChart)
  const [showStudentsModal, setShowStudentsModal] = useState(false)
  const [showStructureModal, setShowStructureModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showRemindersModal, setShowRemindersModal] = useState(false)
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
  const flatCriteria = competencies.flatMap((competency) => competency.criteria)
  const classSeatingCharts = seatingCharts.filter((chart) => chart.classId === activeClassId)

  const handleExportActiveUtExcel = () => {
    if (!activeClass || !activeUt || competencies.length === 0) {
      window.alert('Aquesta UT encara no té competències actives per exportar.')
      return
    }

    const headerCells = [
      '<th>Alumne</th>',
      '<th>Mig grup</th>',
      ...competencies.flatMap((competency) => [
        ...competency.criteria.map((criterion) => `<th>${escapeCell(competency.name)} · ${escapeCell(criterion.name)}</th>`),
        `<th>${escapeCell(competency.name)} · Nota competència</th>`,
      ]),
    ].join('')

    const bodyRows = filteredStudents
      .map((student) => {
        const cells = [
          `<td>${escapeCell(student.name)}</td>`,
          `<td>${escapeCell(student.halfGroup || '')}</td>`,
          ...competencies.flatMap((competency) => {
            const criterionGrades = competency.criteria.map((criterion) =>
              getCriterionMark(marks, student.id, criterion.id),
            )
            const competencyGrade = getCompetencyGrade(marks, student.id, competency)
            return [
              ...criterionGrades.map((grade) => `<td>${escapeCell(grade || '-')}</td>`),
              `<td><strong>${escapeCell(competencyGrade || '-')}</strong></td>`,
            ]
          }),
        ].join('')
        return `<tr>${cells}</tr>`
      })
      .join('')

    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            table { border-collapse: collapse; font-family: Arial, sans-serif; }
            th, td { border: 1px solid #d1d5db; padding: 8px 10px; text-align: center; }
            th { background: #f3f4f6; font-weight: 700; }
            td:first-child, th:first-child { text-align: left; min-width: 240px; }
          </style>
        </head>
        <body>
          <h2>${escapeCell(activeClass.name)} · ${escapeCell(activeUt.name)}</h2>
          <table>
            <thead><tr>${headerCells}</tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </body>
      </html>`
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
    downloadBlob(blob, `avaluapro-${activeClass.name}-${activeUt.name}-${getTodaySlug()}.xls`)
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
        <button className="tool-button" onClick={handleExportActiveUtExcel} type="button">
          <Download size={18} />
          Exportar notes UT
        </button>
        <button className="tool-button dark" data-tour="manage-students-button" onClick={() => setShowStudentsModal(true)} type="button">
          <Users size={18} />
          Gestió d’Alumnes
        </button>
      </div>
      {showStudentsModal && (
        <ManageStudentsModal classId={activeClassId} onClose={() => setShowStudentsModal(false)} />
      )}
      {showRemindersModal && <RemindersModal onClose={() => setShowRemindersModal(false)} />}
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
          students={students}
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
      <EvaluationTable
        activeClassId={activeClassId}
        agendaNotes={agendaNotes}
        competencies={competencies}
        marks={marks}
        onOpenAnnotations={setAnnotationsStudentId}
        onOpenProfile={setProfileStudentId}
        onOpenReminders={() => setShowRemindersModal(true)}
        onOpenRubric={setRubricCriterionId}
        onToggleCompetencyModification={toggleCompetencyModification}
        onUpdateMark={updateMark}
        renderAbsenceControl={(student) => (
          <AbsenceToggle classId={activeClassId} studentId={student.id} />
        )}
        students={filteredStudents}
      />
      )}
    </section>
  )
}
