import { normalizeEducandEmail } from '../../lib/email.js'

export function getSharedTutoringCotutorLabel(memberEmails = [], currentUserEmail = '', sharedSpace = null) {
  const normalizedCurrentUserEmail = normalizeEducandEmail(currentUserEmail)
  const candidateEmails = [
    ...memberEmails,
    ...(sharedSpace?.memberEmails || []),
    ...(sharedSpace?.sharedTutoringMemberEmails || []),
  ]
  const cotutorEmails = candidateEmails
    .map((email) => normalizeEducandEmail(email))
    .filter((email) => email && email !== normalizedCurrentUserEmail)

  const uniqueCotutorEmails = Array.from(new Set(cotutorEmails))

  return uniqueCotutorEmails.length > 0 ? uniqueCotutorEmails.join(' · ') : 'pendent de vinculació'
}
