export function getCloudStartupAction({
  cloudWorkspaceExists = false,
  localWorkspaceExists = false,
  localWorkspaceIsDemo = false,
  pendingOperationCount = 0,
  workspacesMatch = false,
} = {}) {
  if (pendingOperationCount > 0) return 'flush-local'
  if (!cloudWorkspaceExists) return 'keep-local'
  if (!localWorkspaceExists || localWorkspaceIsDemo) return 'pull-cloud'
  return workspacesMatch ? 'already-synced' : 'review-conflict'
}

export function getCloudWorkspacePreferences(localPreferences = {}, cloudPreferences = {}) {
  return {
    ...localPreferences,
    ...cloudPreferences,
    demoMode: false,
    guideOpen: false,
    guideMode: 'own',
  }
}

export function getLocalDateKey(value = Date.now()) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function shouldCreateDailyCloudBackup({
  appStatus = 'idle',
  cloudStatus = 'signed-out',
  triggeredByConfirmedChange = false,
  isDemo = false,
  pendingOperationCount = 0,
  recentBackups = [],
  now = Date.now(),
} = {}) {
  if (!triggeredByConfirmedChange || appStatus !== 'ready' || cloudStatus !== 'synced' || isDemo || pendingOperationCount > 0) return false
  const today = getLocalDateKey(now)
  return !recentBackups.some(
    (backup) => backup?.reason === 'auto-daily' && getLocalDateKey(backup.createdAt) === today,
  )
}
