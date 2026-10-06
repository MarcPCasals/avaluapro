// Both the UP editor and its activity dialogs read the same pending changes.
// Untouched fields continue to follow the latest synchronized unit.
export function getPlanningUnitDraftValues(unit, draft, key) {
  if (!unit) return null
  return draft?.key === key ? { ...unit, ...draft.changes } : unit
}

export function updatePlanningUnitDraft(draft, key, field, value) {
  return { key, changes: { ...(draft?.key === key ? draft.changes : {}), [field]: value } }
}

export function acknowledgePlanningUnitDraft(draft, key, savedValues) {
  if (draft?.key !== key) return draft
  // Keep any edit made while the save was in flight, as well as fields not saved.
  return { key, changes: Object.fromEntries(Object.entries(draft.changes)
    .filter(([field, value]) => !Object.hasOwn(savedValues, field) || value !== savedValues[field])) }
}
