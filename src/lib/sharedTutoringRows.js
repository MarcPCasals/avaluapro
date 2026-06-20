export function getSharedRowVersion(row = {}) {
  return [row.sharedDeletedAt, row.sharedUpdatedAt, row.updatedAt, row.createdAt]
    .map((value) => String(value || ''))
    .filter(Boolean)
    .sort()
    .at(-1) || ''
}

export function mergeSharedRows(localRows = [], incomingRows = []) {
  const rowsById = new Map()

  localRows.forEach((row) => {
    if (!row?.id) return
    rowsById.set(row.id, row)
  })

  incomingRows.forEach((row) => {
    if (!row?.id) return
    const current = rowsById.get(row.id)
    const currentVersion = getSharedRowVersion(current || {})
    const incomingVersion = getSharedRowVersion(row)
    const incomingWins = !current || (incomingVersion && (!currentVersion || incomingVersion >= currentVersion))

    if (row.sharedDeletedAt) {
      if (incomingWins) rowsById.delete(row.id)
      return
    }

    if (!current) {
      rowsById.set(row.id, row)
      return
    }

    rowsById.set(
      row.id,
      incomingWins
        ? { ...current, ...row }
        : { ...row, ...current },
    )
  })

  return Array.from(rowsById.values()).filter((row) => !row.sharedDeletedAt)
}
