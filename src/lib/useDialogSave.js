import { useEffect, useState } from 'react'

export function createDialogSaveLifecycle({ onClose, onState, errorMessage }) {
  let closed = false
  let pending = false
  let handleClose = onClose
  const close = () => {
    if (closed) return
    closed = true
    handleClose()
  }
  const save = async (action, { closeOnSuccess = true, successMessage } = {}) => {
    if (closed || pending) return
    pending = true
    onState({ busy: true, error: '' })
    try {
      const result = await action()
      if (!closed) {
        if (closeOnSuccess) close()
        else onState({ busy: false, error: '', notice: successMessage?.(result) || '' })
      }
    } catch (cause) {
      if (!closed) onState({ busy: false, error: cause?.message || errorMessage })
    } finally { pending = false }
  }
  return { close, save, setOnClose: callback => { handleClose = callback },
    activate: () => { closed = false }, dispose: () => { closed = true } }
}

export function useDialogSave(onClose, errorMessage) {
  const [state, setState] = useState({ busy: false, error: '' })
  const [lifecycle] = useState(() => createDialogSaveLifecycle({ onClose, onState: setState, errorMessage }))
  useEffect(() => { lifecycle.setOnClose(onClose) }, [lifecycle, onClose])
  useEffect(() => {
    lifecycle.activate()
    return () => lifecycle.dispose()
  }, [lifecycle])
  return { ...state, close: lifecycle.close, save: lifecycle.save }
}
