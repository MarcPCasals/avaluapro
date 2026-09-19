/**
 * Aplica el patró de teclat dels grups de pestanyes: fletxes per recórrer-les
 * i Inici/Fi per saltar als extrems. El clic conserva una única font de canvi
 * d'estat per a ratolí, tacte i teclat.
 */
export function moveHorizontalTabFocus(event) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  const tabList = event.currentTarget.closest('[role="tablist"]')
  const tabs = [...(tabList?.querySelectorAll('[role="tab"]:not(:disabled)') || [])]
  const current = tabs.indexOf(event.currentTarget)
  if (current < 0 || tabs.length === 0) return
  const next = event.key === 'Home' ? tabs[0]
    : event.key === 'End' ? tabs.at(-1)
      : tabs[(current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]
  event.preventDefault()
  next.focus()
  next.click()
}
