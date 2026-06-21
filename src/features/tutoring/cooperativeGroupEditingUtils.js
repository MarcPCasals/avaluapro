export function createEmptyCooperativeGroup(groups, targetGroupSize = 4) {
  const nextIndex = (groups || []).length + 1
  return [
    ...(groups || []),
    {
      id: `manual_group_${Date.now()}_${nextIndex}`,
      locked: false,
      members: [],
      name: `Grup ${nextIndex}`,
      targetGroupSize: Number(targetGroupSize) || 4,
    },
  ]
}

export function renameCooperativeGroup(groups, groupId, name) {
  const cleanName = String(name || '').trim()
  if (!groupId || !cleanName) return groups
  return (groups || []).map((group) => (group.id === groupId ? { ...group, name: cleanName } : group))
}

export function removeEmptyCooperativeGroup(groups, groupId) {
  const targetGroup = (groups || []).find((group) => group.id === groupId)
  if (!targetGroup || targetGroup.members.length > 0) return groups
  return groups.filter((group) => group.id !== groupId)
}

export function toggleCooperativeGroupLock(groups, groupId) {
  return (groups || []).map((group) =>
    group.id === groupId ? { ...group, locked: !group.locked } : group,
  )
}

export function toggleCooperativeStudentLock(lockedStudentIds, studentId) {
  if (!studentId) return lockedStudentIds || []
  const current = new Set(lockedStudentIds || [])
  if (current.has(studentId)) current.delete(studentId)
  else current.add(studentId)
  return [...current]
}

export function canModifyCooperativeMember({ group, lockedStudentIds, studentId }) {
  if (!group || !studentId) return false
  return !group.locked && !(lockedStudentIds || []).includes(studentId)
}
