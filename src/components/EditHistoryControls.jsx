import { useEffect, useSyncExternalStore } from 'react'
import { RotateCcw, RotateCw } from 'lucide-react'
import { editHistory } from '../lib/editHistory'

export function EditHistoryControls() {
  const history = useSyncExternalStore(editHistory.subscribe, editHistory.getSnapshot)
  useEffect(() => {
    const handleKey = (event) => {
      if (event.target?.closest?.('input, textarea, select, [contenteditable], [role="textbox"]')) return
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.key.toLowerCase() !== 'z') return
      const state = editHistory.getSnapshot()
      if (event.shiftKey ? state.canRedo : state.canUndo) {
        event.preventDefault()
        if (event.shiftKey) editHistory.redo()
        else editHistory.undo()
      }
    }
    globalThis.addEventListener('keydown', handleKey)
    return () => globalThis.removeEventListener('keydown', handleKey)
  }, [])
  return <>
    <button aria-label="Desfer" className={`icon-button${history.canUndo ? '' : ' disabled'}`} disabled={!history.canUndo} data-tour="undo-button" onClick={() => editHistory.undo()} title={history.undoLabel ? `Desfer: ${history.undoLabel}` : 'Cap canvi per desfer en aquesta sessió'} type="button"><RotateCcw size={22} /></button>
    <button aria-label="Refer" className={`icon-button${history.canRedo ? '' : ' disabled'}`} disabled={!history.canRedo} data-tour="redo-button" onClick={() => editHistory.redo()} title={history.redoLabel ? `Refer: ${history.redoLabel}` : 'Cap canvi per refer en aquesta sessió'} type="button"><RotateCw size={22} /></button>
    {history.error && <span role="alert" className="topbar-history-error" title={history.error}>{history.error}</span>}
  </>
}
