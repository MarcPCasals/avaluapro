export function normalizeClassName(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function findSharedTutoringClassTarget({ classes = [], className = '', spaceId = '' } = {}) {
  const existingLinkedClass = classes.find((classItem) => classItem.sharedTutoringSpaceId === spaceId)
  if (existingLinkedClass) {
    return {
      classItem: existingLinkedClass,
      matchType: 'shared-space',
      needsConfirmation: false,
    }
  }

  const normalizedClassName = normalizeClassName(className)
  if (!normalizedClassName) {
    return {
      classItem: null,
      matchType: '',
      needsConfirmation: false,
    }
  }

  const sameNameClass = classes.find((classItem) => normalizeClassName(classItem.name || '') === normalizedClassName)
  if (!sameNameClass) {
    return {
      classItem: null,
      matchType: '',
      needsConfirmation: false,
    }
  }

  return {
    classItem: sameNameClass,
    matchType: 'name',
    needsConfirmation: true,
  }
}
