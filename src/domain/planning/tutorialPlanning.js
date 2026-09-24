function normalizedSubject(value) {
  return String(value || '').trim().toLocaleLowerCase('ca')
}

/**
 * Resol la font compartida de tutoria i la classe privada que cada docent fa
 * servir al seu horari. Són dues identitats diferents: la primera comparteix
 * la UP; la segona manté separades les sessions de cada cotutor.
 */
export function resolveTutorialPlanningContext(classes = [], activeClassId = '') {
  const activeClass = classes.find((item) => item.id === activeClassId) || null
  const canonicalClass = activeClass?.sharedTutoringSpaceId
    ? activeClass
    : classes.find((item) => (
        item.sharedTutoringSpaceId
        && (item.id === activeClass?.tutorialLinkedClassId
          || item.tutorialLinkedClassId === activeClass?.id)
      )) || null
  if (!canonicalClass?.sharedTutoringSpaceId) {
    return { canonicalClass: null, scheduleClass: null, tutoringSpaceId: '' }
  }

  const tutorialClasses = classes.filter((item) => normalizedSubject(item.subject) === 'tutoria')
  const scheduleClass = tutorialClasses.find((item) => (
    item.tutorialLinkedClassId === canonicalClass.id
    || canonicalClass.tutorialLinkedClassId === item.id
  )) || tutorialClasses[0] || canonicalClass

  return {
    canonicalClass,
    scheduleClass,
    tutoringSpaceId: canonicalClass.sharedTutoringSpaceId,
  }
}

export function getTutorialCollaboratorEmails(context, sharedSpace, currentEmail = '') {
  const ownEmail = String(currentEmail || '').trim().toLowerCase()
  return [...new Set([
    ...(sharedSpace?.memberEmails || []),
    ...(context?.canonicalClass?.sharedTutoringMemberEmails || []),
  ].map((email) => String(email || '').trim().toLowerCase())
    .filter((email) => email && email !== ownEmail))]
}
