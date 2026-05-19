import { BookOpen } from 'lucide-react'
import { Modal } from '../../components/Modal'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'

const RUBRIC_GRADES = ['A', 'B', 'C', 'D']

export function RubricModal({ criterionId, onClose }) {
  const criterion = useAvaluaproStore((state) =>
    state.criteria.find((item) => item.id === criterionId),
  )
  const updateCriterion = useAvaluaproStore((state) => state.updateCriterion)

  if (!criterion) return null

  const rubric = criterion.rubric || {}

  return (
    <Modal onClose={onClose} size="lg" title={`Rúbrica · ${criterion.name}`}>
      <div className="modal-section">
        <h3>
          <BookOpen size={18} />
          Descriptors del criteri
        </h3>
        <p>Aquest text és personalitzable per cada docent i queda vinculat al criteri.</p>
        <div className="rubric-grid">
          {RUBRIC_GRADES.map((grade) => (
            <label className={`rubric-column rubric-${grade}`} key={grade}>
              <strong>{grade}</strong>
              <textarea
                onChange={(event) =>
                  updateCriterion(criterionId, {
                    rubric: { ...rubric, [grade]: event.target.value },
                  })
                }
                placeholder={`Descriptor per a ${grade}`}
                value={rubric[grade] || ''}
              />
            </label>
          ))}
        </div>
      </div>
    </Modal>
  )
}
