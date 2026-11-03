import { useEffect, useEffectEvent } from 'react'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'

export function focusSearchDestination(target) {
  if (!target.anchor && !target.recordId) return () => {}
  let timeout, observer, frame
  const focus = () => {
    const element = target.recordId
      ? document.querySelector(`[data-search-record="${CSS.escape(target.recordId)}"]`)
      : document.querySelector(`[data-tour="${CSS.escape(target.anchor)}"]`)
    if (!element) return false
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    element.classList.add('search-destination-highlight')
    timeout = window.setTimeout(() => element.classList.remove('search-destination-highlight'), 2500)
    observer?.disconnect()
    return true
  }
  frame = requestAnimationFrame(() => {
    if (focus()) return
    observer = new MutationObserver(() => focus())
    observer.observe(document.body, { childList: true, subtree: true })
    timeout = window.setTimeout(() => observer.disconnect(), 4000)
  })
  return () => { cancelAnimationFrame(frame); observer?.disconnect(); clearTimeout(timeout) }
}

/** La petició transitària sobreviu a la càrrega lazy del mòdul, però no es desa ni es torna a executar. */
export function useSearchNavigation(mode, onNavigate, readyKey = true) {
  const request = useAvaluaproStore(state => state.searchNavigation)
  const ownerUid = useAvaluaproStore(state => state.cloud.user?.uid || '')
  const activeMode = useAvaluaproStore(state => state.ui.activeMode)
  const activeClassId = useAvaluaproStore(state => state.ui.activeClassId)
  const handle = useEffectEvent(onNavigate)
  useEffect(() => {
    if (!request || request.ownerUid !== ownerUid || activeMode !== mode || request.target.mode !== mode) return
    if (request.target.classId && request.target.classId !== activeClassId) return
    if (handle(request.target) === false) return
    useAvaluaproStore.getState().clearSearchNavigation(request.id)
    if (!request.target.previewOnly) focusSearchDestination(request.target)
  }, [request, ownerUid, activeMode, activeClassId, mode, readyKey])
}
