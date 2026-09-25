export const PRE_UPDATE_RELEASE = Object.freeze({
  id: '2026-09-agenda-planning',
  backupId: 'backup_pre_update_2026_09_agenda_planning',
  backupReason: 'pre-update-2026-09-agenda-planning',
  backupLabel: 'Còpia de seguretat pre actualització',
})

export function hasPreUpdateReleaseBackup(backups = []) {
  return backups.some(
    (backup) =>
      backup?.id === PRE_UPDATE_RELEASE.backupId || backup?.reason === PRE_UPDATE_RELEASE.backupReason,
  )
}

export function getPreUpdateReleaseGate({
  appStatus = 'idle',
  cloudStatus = 'signed-out',
  cloudStartupComplete = false,
  isDemo = false,
  pendingOperationCount = 0,
  recentBackups = [],
  user = null,
} = {}) {
  if (isDemo) return 'demo'
  if (!user?.uid) return 'signed-out'
  if (hasPreUpdateReleaseBackup(recentBackups)) return 'ready'
  if (appStatus !== 'ready' || !cloudStartupComplete) return 'waiting'
  if (cloudStatus === 'review') return 'review'
  if (cloudStatus === 'error') return 'error'
  if (pendingOperationCount > 0 || cloudStatus === 'pending' || cloudStatus === 'syncing') return 'waiting'
  if (cloudStatus === 'synced' || cloudStatus === 'signed-in') return 'backup-required'
  return 'waiting'
}

export function getReleaseAcknowledgementKey(uid = '') {
  return `avaluapro-release-ack:${PRE_UPDATE_RELEASE.id}:${uid || 'anonymous'}`
}

export function isReleaseAcknowledged(uid, storage) {
  if (!uid || !storage) return false
  try {
    return storage.getItem(getReleaseAcknowledgementKey(uid)) === 'acknowledged'
  } catch {
    return false
  }
}

export function acknowledgeRelease(uid, storage) {
  if (!uid || !storage) return false
  try {
    storage.setItem(getReleaseAcknowledgementKey(uid), 'acknowledged')
    return true
  } catch {
    return false
  }
}
