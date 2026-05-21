import { ArrowDown, ArrowUp, Settings, Trash2 } from 'lucide-react'
import { Modal } from '../../components/Modal'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'
import { ClassFormFields } from './ClassFormFields'

export function ClassSettingsModal({ classId, onClose }) {
  const classes = useAvaluaproStore((state) => state.classes)
  const updateClass = useAvaluaproStore((state) => state.updateClass)
  const reorderClass = useAvaluaproStore((state) => state.reorderClass)
  const deleteClass = useAvaluaproStore((state) => state.deleteClass)
  const currentClass = classes.find((item) => item.id === classId)
  const orderedClasses = [...classes].sort((a, b) => (a.order || 0) - (b.order || 0))

  if (!currentClass) return null

  return (
    <Modal onClose={onClose} size="lg" title="Configuració del grup">
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
      <div className="modal-section">
        <h3>
          <ArrowUp size={18} />
          Ordre de les classes
        </h3>
        <p>
          Mou les classes amunt o avall per decidir com apareixen a la barra superior.
          Això no canvia cap dada dels alumnes.
        </p>
        <div className="class-order-list">
          {orderedClasses.map((classItem, index) => (
            <div className={`class-order-row ${classItem.id === classId ? 'active' : ''}`} key={classItem.id}>
              <span>{index + 1}</span>
              <strong>{classItem.name}</strong>
              <small>{classItem.subject || 'Sense assignatura'}</small>
              <div>
                <button
                  className="secondary-action compact"
                  disabled={index === 0}
                  onClick={() => reorderClass(classItem.id, -1)}
                  title="Moure amunt"
                  type="button"
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  className="secondary-action compact"
                  disabled={index === orderedClasses.length - 1}
                  onClick={() => reorderClass(classItem.id, 1)}
                  title="Moure avall"
                  type="button"
                >
                  <ArrowDown size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="modal-section danger-zone">
        <h3>
          <Trash2 size={18} />
          Eliminar classe
        </h3>
        <p>
          Aquesta acció eliminarà la classe, alumnes, notes, tasques, comentaris i llocs fixos associats.
          Abans de fer-ho, descarrega una còpia de seguretat si vols conservar l’estat actual.
        </p>
        <button
          className="danger-action"
          onClick={async () => {
            const answer = window.prompt(
              [
                `Vols eliminar la classe "${currentClass.name}" i totes les seves dades?`,
                '',
                'Aquesta acció no es pot desfer des d’Avaluapro.',
                '',
                'Per confirmar, escriu ELIMINA.',
              ].join('\n'),
            )
            if (answer !== 'ELIMINA') return
            await deleteClass(classId)
            onClose()
          }}
          type="button"
        >
          <Trash2 size={16} />
          Eliminar aquesta classe
        </button>
      </div>
    </Modal>
  )
}
