import { useState } from 'react'
import { Info } from 'lucide-react'
import { Modal } from './Modal'

/**
 * Ajuda breu sota demanda. Evita ocupar espai permanent amb explicacions,
 * però les manté disponibles per a ratolí, teclat i pantalles tàctils.
 */
export function ContextualHelp({ children, className = '', title }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        aria-label={`Informació sobre ${title}`}
        className={`contextual-help-button ${className}`.trim()}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setOpen(true)
        }}
        title={`Informació sobre ${title}`}
        type="button"
      >
        <Info aria-hidden="true" size={15} strokeWidth={2.5} />
      </button>
      {open && (
        <Modal onClose={() => setOpen(false)} size="sm" title={title}>
          <div className="contextual-help-content">
            <span><Info aria-hidden="true" size={20} /></span>
            <div>{typeof children === 'string' ? <p>{children}</p> : children}</div>
          </div>
        </Modal>
      )}
    </>
  )
}

export function ContextualTab({ children, help, helpTitle, wrapperClassName = '', ...buttonProps }) {
  return (
    <div className={`contextual-tab ${wrapperClassName}`.trim()}>
      <button {...buttonProps}>{children}</button>
      <ContextualHelp className="contextual-tab-help" title={helpTitle}>{help}</ContextualHelp>
    </div>
  )
}
