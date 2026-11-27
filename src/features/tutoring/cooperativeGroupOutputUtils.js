export function formatCooperativeStudentName(name) {
  const cleanName = String(name || '').trim()
  if (!cleanName.includes(',')) return cleanName

  const [surnames, ...givenNameParts] = cleanName.split(',')
  const givenName = givenNameParts.join(',').trim()
  return [givenName, surnames.trim()].filter(Boolean).join(' ')
}

export const COOPERATIVE_ROLES = ['Coordinador', 'Revisor', 'Comunicador', 'Material']

export function sortCooperativeGroupMembers(members, memberRoles = {}) {
  return [...(members || [])].sort((a, b) => {
    const aRole = memberRoles[a?.student?.id || a?.id]
    const bRole = memberRoles[b?.student?.id || b?.id]
    const aRank = COOPERATIVE_ROLES.indexOf(aRole)
    const bRank = COOPERATIVE_ROLES.indexOf(bRole)
    return (aRank < 0 ? COOPERATIVE_ROLES.length : aRank) -
      (bRank < 0 ? COOPERATIVE_ROLES.length : bRank)
  })
}

export function getExcludedCooperativeStudentIds(excludedStudentIds, unassignedStudents) {
  return [...new Set([
    ...(excludedStudentIds || []),
    ...(unassignedStudents || []).map((student) => student?.id),
  ].filter(Boolean))]
}

const normalizeSearch = (value) => String(value || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('ca')
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

export function findCooperativeStudentMatches(students, query) {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  return (students || [])
    .filter((student) => {
      const name = normalizeSearch(formatCooperativeStudentName(student.name))
      return words.every((word) => name.includes(word))
    })
    .sort((a, b) => {
      const aName = normalizeSearch(formatCooperativeStudentName(a.name))
      const bName = normalizeSearch(formatCooperativeStudentName(b.name))
      return Number(bName.startsWith(words[0])) - Number(aName.startsWith(words[0])) ||
        aName.localeCompare(bName, 'ca')
    })
    .slice(0, 6)
}

function getGroupMemberNames(group) {
  return sortCooperativeGroupMembers(group?.members, group?.memberRoles)
    .map((member) => {
      const name = formatCooperativeStudentName(member?.student?.name || member?.name || '')
      const role = group?.memberRoles?.[member?.student?.id || member?.id]
      return role && COOPERATIVE_ROLES.includes(role) ? `${name} · ${role}` : name
    })
    .filter(Boolean)
}

export function buildStudentCooperativeGroupText(groups, options = {}) {
  const title = String(options.title || 'Grups cooperatius').trim()
  const body = (groups || [])
    .map((group, index) => {
      const name = String(group?.name || `Grup ${index + 1}`).trim()
      const members = getGroupMemberNames(group).map((memberName) => `- ${memberName}`).join('\n')
      return `${name}\n${members}`
    })
    .join('\n\n')

  return `${title}\n\n${body}`.trim()
}

export function buildTeacherCooperativeGroupText(groups, options = {}) {
  const title = String(options.title || 'Grups cooperatius').trim()
  const strategyLabel = String(options.strategyLabel || '').trim()
  const observation = String(options.observation || '').trim()
  const qualityLabel = String(options.qualityLabel || '').trim()
  const score = Number.isFinite(Number(options.score)) ? Number(options.score) : null
  const header = [
    title,
    strategyLabel ? `Criteri: ${strategyLabel}` : '',
    score !== null ? `Qualitat: ${score}/100${qualityLabel ? ` · ${qualityLabel}` : ''}` : '',
    observation ? `Observació docent: ${observation}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const body = (groups || [])
    .map((group, index) => {
      const name = String(group?.name || `Grup ${index + 1}`).trim()
      const members = getGroupMemberNames(group).map((memberName) => `- ${memberName}`).join('\n')
      const strengths = (group?.analysis?.strengths || []).map((strength) => `- ${strength}`).join('\n')
      const alerts = (group?.alerts || []).map((alert) => `- ${alert.text || alert}`).join('\n')
      return [
        name,
        members,
        strengths ? `Fortaleses:\n${strengths}` : '',
        alerts ? `Punts a revisar:\n${alerts}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n\n')

  return `${header}\n\n${body}`.trim()
}
