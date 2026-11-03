export const SEATING_SCOPES = [
  { id: 'all', label: 'Grup sencer' },
  { id: 'A', label: 'Mig grup A' },
  { id: 'B', label: 'Mig grup B' },
]

export function getActiveSeatingPlans(plans, classId) {
  const sorted = (plans || []).filter(plan => plan.classId === classId)
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))
  return {
    all: sorted.find(plan => plan.isActive) || sorted[0] || null,
    A: sorted.find(plan => plan.activeHalfGroups?.includes('A')) || null,
    B: sorted.find(plan => plan.activeHalfGroups?.includes('B')) || null,
  }
}

export function assignActiveSeatingPlan(plans, classId, scope, planId, now) {
  if (!SEATING_SCOPES.some(item => item.id === scope)) throw new Error('Grup de disposició no vàlid.')
  if (scope === 'all' && !planId) throw new Error('El grup sencer ha de tenir una disposició activa.')
  if (planId && !plans.some(plan => plan.id === planId && plan.classId === classId)) throw new Error('La disposició no pertany a aquesta classe.')
  const fullPlan = scope === 'all' ? planId : getActiveSeatingPlans(plans, classId).all?.id
  return plans.map(plan => {
    if (plan.classId !== classId) return plan
    const activeHalfGroups = (plan.activeHalfGroups || []).filter(value => value === 'A' || value === 'B')
    const nextHalfGroups = scope === 'all' ? activeHalfGroups : [
      ...activeHalfGroups.filter(value => value !== scope), ...(plan.id === planId ? [scope] : []),
    ]
    return { ...plan, isActive: plan.id === fullPlan, activeHalfGroups: nextHalfGroups, updatedAt: now }
  })
}
