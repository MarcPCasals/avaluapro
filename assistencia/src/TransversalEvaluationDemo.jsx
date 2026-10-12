import { useState } from 'react'
import { Modal } from '../../src/components/Modal.jsx'
import { EvaluationScopeButton } from '../../src/features/evaluation/EvaluationScopeButton.jsx'
import { EvaluationTable } from '../../src/features/evaluation/EvaluationTable.jsx'
import { TransversalSelector } from '../../src/features/evaluation/TransversalSelector.jsx'
import { buildTransversalStructure, getTransversalNames, selectEvaluationCompetencies } from '../../src/lib/transversalEvaluation.js'

export function TransversalEvaluationDemo({ students }) {
  const [scope, setScope] = useState('specific')
  const [classId, setClassId] = useState('synthetic-transversal-class')
  const [utNumber, setUtNumber] = useState(1)
  const [showSelector, setShowSelector] = useState(false)
  const [state, setState] = useState(() => ({
    classes: [{ id: 'synthetic-transversal-class', name: 'Classe fictícia · Ciències' },
      { id: 'synthetic-transversal-other', name: 'Classe fictícia · Català' }],
    uts: ['synthetic-transversal-class', 'synthetic-transversal-other'].flatMap(classId => [1, 2].map(n => ({ id: `${classId}-${n}`, classId }))),
    competencies: [], criteria: [], marks: [],
  }))
  const classItem = state.classes.find(item => item.id === classId)
  const names = getTransversalNames(classItem)
  const competencies = selectEvaluationCompetencies(state, classItem, `${classId}-${utNumber}`, scope)
  return <section>
    <p>Prova sintètica de competències transversals</p>
    <div className="time-tabs current-ut-tabs">
      <strong>UT{utNumber}</strong>
      <button className="other-uts-trigger" onClick={() => setUtNumber(utNumber === 1 ? 2 : 1)}>Altres UTs</button>
      <EvaluationScopeButton scope={scope} onChange={setScope} />
      <button className="other-uts-trigger" onClick={() => setClassId(classId === state.classes[0].id ? state.classes[1].id : state.classes[0].id)}>Canviar classe fictícia</button>
    </div>
    {scope === 'transversal' && <>
      <button className="ut-competency-summary partial" onClick={() => setShowSelector(true)}>{names.length}/4 transversals actives</button>
      {competencies.length === 0 ? <p>Encara no has activat competències transversals.</p> :
        <EvaluationTable activeClassId={classId} competencies={competencies} marks={state.marks} students={students}
          onUpdateMark={(studentId, criterionId, value) => setState(current => ({ ...current,
            marks: [...current.marks.filter(mark => mark.studentId !== studentId || mark.criterionId !== criterionId),
              ...(value ? [{ studentId, criterionId, value }] : [])],
          }))} />}
    </>}
    {showSelector && <Modal onClose={() => setShowSelector(false)} size="lg" title="Competències transversals">
      <TransversalSelector className={classItem.name} selectedNames={names} onToggle={(name, active) =>
        setState(current => ({ ...current, ...buildTransversalStructure(current, classId,
          active ? [...names, name] : names.filter(item => item !== name), prefix => `${prefix}_${crypto.randomUUID()}`) }))} />
    </Modal>}
  </section>
}
