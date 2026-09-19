import { X } from 'lucide-react'
import { useId } from 'react'
import { useDialogAccessibility } from '../lib/useDialogAccessibility'

export function Modal({ children, onClose, panelClassName = '', title, size = 'md' }) {
  const titleId = useId()
  const panelRef = useDialogAccessibility(onClose)
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section aria-labelledby={titleId} aria-modal="true" className={`modal-panel ${size} ${panelClassName}`.trim()} ref={panelRef} role="dialog" tabIndex="-1">
        <header className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <button aria-label="Tancar" className="modal-close" data-tour="modal-close" onClick={onClose} title="Tancar" type="button">
            <X size={22} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  )
}
