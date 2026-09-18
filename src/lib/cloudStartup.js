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
