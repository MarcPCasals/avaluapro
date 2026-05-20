import { X } from 'lucide-react'

export function Modal({ children, onClose, title, size = 'md' }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`modal-panel ${size}`} aria-modal="true" role="dialog">
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" data-tour="modal-close" onClick={onClose} title="Tancar" type="button">
            <X size={22} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  )
}
