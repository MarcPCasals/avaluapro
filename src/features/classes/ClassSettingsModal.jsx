import { Settings } from 'lucide-react'
import { Modal } from '../../components/Modal'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'
import { ClassFormFields } from './ClassFormFields'

export function ClassSettingsModal({ classId, onClose }) {
  const classes = useAvaluaproStore((state) => state.classes)
  const updateClass = useAvaluaproStore((state) => state.updateClass)
  const currentClass = classes.find((item) => item.id === classId)

  if (!currentClass) return null

  return (
    <Modal onClose={onClose} title="Configuració del grup">
      <div className="modal-section">
        <h3>
          <Settings size={18} />
          Matèria i identificació
        </h3>
        <p>
          Aquesta configuració només cal tocar-la si la classe no segueix la teva matèria principal.
          El botó CFN crearà estructura quan aquesta assignatura tingui competències precarregades.
        </p>
        <ClassFormFields
          onChange={(patch) => updateClass(classId, patch)}
          value={{
            name: currentClass.name,
            subject: currentClass.subject || '',
            color: currentClass.color || 'blue',
          }}
        />
      </div>
    </Modal>
  )
}
