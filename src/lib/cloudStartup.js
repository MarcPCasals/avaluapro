export function getCloudStartupAction({ cloudWorkspaceExists = false, pendingOperationCount = 0 } = {}) {
  if (pendingOperationCount > 0) return 'flush-local'
  return cloudWorkspaceExists ? 'pull-cloud' : 'keep-local'
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
