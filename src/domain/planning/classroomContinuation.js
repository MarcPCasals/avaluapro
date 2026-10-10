/** Aplica al Mode aula la mateixa continuació que ja s’ha desat a l’Agenda. */
export function applyClassroomContinuationPreview(bundle, preview) {
  const sourceItem = (preview.changedLockedItems || []).find(item => item.id === preview.item.id) || preview.item
  const sourceResult = (preview.changedTargetResults || []).find(result => result.sessionItemId === preview.item.id)
  const updatedBundle = !bundle || !sourceResult ? bundle : {
    ...bundle,
    results: [...(bundle.results || []).filter(result => result.sessionItemId !== sourceResult.sessionItemId), sourceResult],
  }
  return { sourceItem, bundle: updatedBundle }
}
