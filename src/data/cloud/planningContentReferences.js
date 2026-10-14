/** Exhaust every session page, limiting item reads to six at a time. No writes or results. */
export async function readAllPlanningContentReferences({ loadSessionPage, loadItems, pageSize = 250 }) {
  const sessions = []
  let cursor = null
  while (true) {
    const page = await loadSessionPage(cursor, pageSize)
    sessions.push(...page.sessions)
    if (page.sessions.length < pageSize) break
    if (!page.cursor) throw new Error('No s’ha pogut continuar la lectura de totes les sessions.')
    cursor = page.cursor
  }
  const references = []
  for (let offset = 0; offset < sessions.length; offset += 6) {
    references.push(...await Promise.all(sessions.slice(offset, offset + 6).map(async (session) => ({
      session, items: await loadItems(session.id),
    }))))
  }
  return references
}
