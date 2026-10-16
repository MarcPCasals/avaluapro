import { selectEvaluationCompetencies } from '../../src/lib/transversalEvaluation'
import { buildActionGradeMark, recalculateActionCriteria } from '../../src/lib/actionGrades'
import { ActionProgressStats } from '../../src/features/analytics/ActionProgressStats'
import { useState } from 'react'
import { getSubjectStructure } from '../../src/data/subjects'
import { buildEvaluationActionsPatch, getEvaluationActionCatalog } from '../../src/lib/evaluationActions'
import { EvaluationActionsModal } from '../../src/features/evaluation/EvaluationActionsModal'
import { EvaluationTable } from '../../src/features/evaluation/EvaluationTable'

const subjects = ['Ciències Físiques i de la Natura', 'Català']
function initialState() {
  const classes = subjects.map((subject, index) => ({ id: `action-class-${index}`, subject }))
  const uts = classes.flatMap(item => [1, 2].map(n => ({ id: `${item.id}-ut-${n}`, classId: item.id, name: `UT${n}`, order: n })))
  const competencies = uts.flatMap(ut => getSubjectStructure(classes.find(item => item.id === ut.classId).subject).map((comp, index) => ({
    ...comp, id: `${ut.id}-c${index}`, classId: ut.classId, utId: ut.id,
  })))
  const criteria = competencies.flatMap(comp => comp.criteria.map((name, index) => ({ id: `${comp.id}-ca${index}`, competencyId: comp.id, name })))
  return { classes, uts, semesters: [], competencies, criteria, marks: [] }
}

export function EvaluationActionsDemo({ students }) {
  const [state, setState] = useState(initialState)
  const [classId, setClassId] = useState('action-class-0')
  const [utNumber, setUtNumber] = useState(1)
  const [selectedStudent, setSelectedStudent] = useState('')
  const [open, setOpen] = useState(false)
  const utId = `${classId}-ut-${utNumber}`
  const classItem = state.classes.find(item => item.id === classId)
  const competencies = selectEvaluationCompetencies(state, classItem, utId, 'specific')
  const catalog = getEvaluationActionCatalog(classItem)
  const progressState = { ...state, students: students.slice(0, 4).map(student => ({ ...student, classId })) }
  return <section>
    <div className="toolbar">
      <label>Matèria <select value={classId} onChange={event => setClassId(event.target.value)}>{state.classes.map(item => <option key={item.id} value={item.id}>{item.subject}</option>)}</select></label>
      <label>UT <select value={utNumber} onChange={event => setUtNumber(Number(event.target.value))}><option value={1}>UT1</option><option value={2}>UT2</option></select></label>
      <button type="button" className="tool-button" onClick={() => setOpen(true)}>Accions de la UT</button>
    </div>
    <fieldset className="evaluation-actions-fields"><legend>Competències actives de la UT fictícia</legend>
      {state.competencies.filter(comp => comp.utId === utId).map(comp => <label key={comp.id} style={{ display: 'block', margin: '8px 0' }}>
        <input type="checkbox" checked={!comp.inactive} onChange={event => {
          const active = event.target.checked
          setState(current => ({ ...current, competencies: current.competencies.map(item => item.id === comp.id ? { ...item, inactive: !active } : item) }))
        }} /> {comp.name}
      </label>)}
    </fieldset>
    {open && <EvaluationActionsModal key={`actions:${utId}`} competencies={competencies} catalog={catalog} utName={`UT${utNumber}`}
      onClose={() => setOpen(false)} onSave={configuration => setState(current => {
        const patch = buildEvaluationActionsPatch(current, { classId, utId, ...configuration })
        return { ...current, ...patch, marks: recalculateActionCriteria(current.marks, patch.criteria) }
      })} />}
    <EvaluationTable key={`table:${utId}`} activeClassId={classId} competencies={competencies} students={students.slice(0, 4)}
      onUpdateActionGrades={(studentId, criterionId, grades) => setState(current => {
        const existing = current.marks.find(mark => mark.studentId === studentId && mark.criterionId === criterionId)
        const mark = buildActionGradeMark({ existing, criterion: current.criteria.find(item => item.id === criterionId), studentId, grades,
          createId: () => `synthetic-mark-${studentId}-${criterionId}` })
        return { ...current, marks: existing ? current.marks.map(item => item.id === existing.id ? mark : item) : [...current.marks, mark] }
      })}
      marks={state.marks} actionCatalog={catalog} utName={`UT${utNumber}`} onConfigureActions={() => setOpen(true)}
      onUpdateMark={(studentId, criterionId, value) => setState(current => ({ ...current,
        marks: [...current.marks.filter(mark => mark.studentId !== studentId || mark.criterionId !== criterionId), { studentId, criterionId, value }],
      }))} />
    <label>Vista de les estadístiques<select value={selectedStudent} onChange={event => setSelectedStudent(event.target.value)}>
      <option value="">Classe</option>{progressState.students.map(student => <option key={student.id} value={student.id}>{student.name}</option>)}
    </select></label>
    <ActionProgressStats key={`${classId}:${selectedStudent}`} state={progressState} classId={classId} studentId={selectedStudent || undefined} />
  </section>
}
