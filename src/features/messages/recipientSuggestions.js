function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

export function buildInternalRecipientContacts({ conversations = [], cotutors = [], directory = [], ownEmail = '' } = {}) {
  const normalizedOwnEmail = normalizeEmail(ownEmail)
  const contacts = new Map()
  const add = (candidate, source) => {
    const email = normalizeEmail(candidate?.email || candidate?.emailLower)
    if (!email || email === normalizedOwnEmail) return
    const current = contacts.get(email)
    contacts.set(email, {
      email,
      label: candidate?.label || candidate?.displayName || current?.label || email,
      source: current?.source === 'conversation' ? current.source : source,
    })
  }

  directory.forEach((item) => add(item, 'directory'))
  cotutors.forEach((item) => add(item, 'cotutor'))
  conversations.forEach((item) => add(item, 'conversation'))

  return Array.from(contacts.values()).sort((left, right) => (
    left.label.localeCompare(right.label, 'ca') || left.email.localeCompare(right.email, 'ca')
  ))
}

export function filterInternalRecipientContacts(contacts = [], queryText = '', limit = 8) {
  const query = String(queryText || '').trim().toLocaleLowerCase('ca')
  return contacts
    .filter((contact) => !query
      || contact.label.toLocaleLowerCase('ca').includes(query)
      || contact.email.includes(query))
    .slice(0, Math.max(0, limit))
}
