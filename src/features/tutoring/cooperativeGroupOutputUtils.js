export function formatCooperativeStudentName(name) {
  const cleanName = String(name || '').trim()
  if (!cleanName.includes(',')) return cleanName

  const [surnames, ...givenNameParts] = cleanName.split(',')
  const givenName = givenNameParts.join(',').trim()
  return [givenName, surnames.trim()].filter(Boolean).join(' ')
}

function getGroupMemberNames(group) {
  return (group?.members || [])
    .map((member) => member?.student?.name || member?.name || '')
    .map(formatCooperativeStudentName)
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
