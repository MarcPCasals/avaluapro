import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function visibleFocusableElements(panel) {
  return [...panel.querySelectorAll(FOCUSABLE_SELECTOR)]
    .filter((element) => element.getClientRects().length > 0)
}

/**
 * Manté el teclat dins del diàleg, permet tancar-lo amb Esc i retorna el focus
 * al control que l'ha obert. El component visual només ha d'assignar el ref al
 * panell amb `role="dialog"`.
 */
export function useDialogAccessibility(onClose) {
  const panelRef = useRef(null)
  const onCloseRef = useRef(onClose)
  // Es captura durant el primer render, abans que un camp `autoFocus` del
  // diàleg prengui el focus en muntar-se.
  const previousFocusRef = useRef(globalThis.document?.activeElement || null)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return undefined
    const previousFocus = previousFocusRef.current
    const focusable = visibleFocusableElements(panel)
    if (!panel.contains(globalThis.document?.activeElement)) (focusable[0] || panel).focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onCloseRef.current?.()
        return
      }
      if (event.key !== 'Tab') return
      const currentFocusable = visibleFocusableElements(panel)
      if (currentFocusable.length === 0) {
        event.preventDefault()
        panel.focus()
        return
      }
      const first = currentFocusable[0]
      const last = currentFocusable.at(-1)
      if (event.shiftKey && globalThis.document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && globalThis.document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    globalThis.document?.addEventListener('keydown', handleKeyDown, true)
    return () => {
      globalThis.document?.removeEventListener('keydown', handleKeyDown, true)
      if (previousFocus?.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus()
    }
  }, [])

  return panelRef
}
