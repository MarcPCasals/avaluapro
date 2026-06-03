import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Modal } from '../../components/Modal'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'
import { ClassFormFields } from './ClassFormFields'

export function NewClassModal({ onClose }) {
  const addClass = useAvaluaproStore((state) => state.addClass)
  const defaultSubject = useAvaluaproStore((state) => state.profile.defaultSubject)
  const [form, setForm] = useState({ name: '', subject: defaultSubject, color: 'blue', tutors: '' })

  const updateForm = (patch) => setForm((current) => ({ ...current, ...patch }))

  const handleSubmit = async () => {
    await addClass(form)
    onClose()
  }

  return (
    <Modal onClose={onClose} title="Nova classe">
      <div className="modal-section">
        <h3>
          <Plus size={18} />
          Configuració inicial
        </h3>
        <p>
          La classe hereta la teva matèria principal. Canvia-la només si aquest grup és d’una
          altra assignatura, Projecte Integrador o Tutoria.
        </p>
        <ClassFormFields onChange={updateForm} value={form} />
        <button className="primary-action" disabled={!form.name.trim()} onClick={handleSubmit} type="button">
          Crear classe
        </button>
      </div>
    </Modal>
  )
}
