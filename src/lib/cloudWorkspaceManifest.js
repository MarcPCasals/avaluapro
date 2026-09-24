import { COLLECTIONS } from '../data/seedData.js'

export const CLOUD_WORKSPACE_META_VERSION = 3
export const CLOUD_WORKSPACE_MANIFEST_VERSION = 2
export const CLOUD_WORKSPACE_LEGACY_MANIFEST_VERSION = 1

// El marge evita que una pestanya d'una versió anterior, oberta durant el
// desplegament, pugui validar una revisió que encara no sap mantenir de manera
// atòmica. Les versions antigues rebaixen la versió del manifest i invaliden la
// via ràpida tan bon punt acaben una sincronització.
export const CLOUD_WORKSPACE_FAST_PATH_ENABLE_AT = '2026-09-27T00:00:00+02:00'

export function createCloudWorkspaceRevision() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()
  return `workspace_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

function cleanRevisionMap(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return COLLECTIONS.reduce((result, collectionName) => {
    const revision = String(value[collectionName] || '').trim()
    if (revision) result[collectionName] = revision
    return result
  }, {})
}

export function buildCloudWorkspaceManifestFields({
  revision,
  collectionRevisions,
  state = 'ready',
  updatedAt,
} = {}) {
  return {
    version: CLOUD_WORKSPACE_META_VERSION,
    manifestVersion: CLOUD_WORKSPACE_MANIFEST_VERSION,
    manifestProtocolStartedAt: CLOUD_WORKSPACE_FAST_PATH_ENABLE_AT,
    workspaceRevision: revision || '',
    workspaceState: state,
    workspaceUpdatedAt: updatedAt || new Date().toISOString(),
    ...(collectionRevisions ? { collectionRevisions: cleanRevisionMap(collectionRevisions) } : {}),
  }
}

function hasCurrentManifestProtocol(meta = null) {
  return Boolean(
    Number(meta?.version) === CLOUD_WORKSPACE_META_VERSION &&
    Number(meta?.manifestVersion) === CLOUD_WORKSPACE_MANIFEST_VERSION &&
    meta?.manifestProtocolStartedAt === CLOUD_WORKSPACE_FAST_PATH_ENABLE_AT &&
    meta?.workspaceState === 'ready',
  )
}

export function getCloudWorkspaceRevision(meta = null) {
  if (!hasCurrentManifestProtocol(meta)) return ''
  return String(meta?.workspaceRevision || '').trim()
}

export function getLegacyCloudWorkspaceRevision(meta = null) {
  if (
    Number(meta?.version) !== CLOUD_WORKSPACE_META_VERSION ||
    Number(meta?.manifestVersion) !== CLOUD_WORKSPACE_LEGACY_MANIFEST_VERSION ||
    meta?.manifestProtocolStartedAt !== CLOUD_WORKSPACE_FAST_PATH_ENABLE_AT ||
    meta?.workspaceState !== 'ready'
  ) return ''
  return String(meta?.workspaceRevision || '').trim()
}

export function getCloudCollectionRevisions(meta = null) {
  if (!getCloudWorkspaceRevision(meta)) return null
  const revisions = cleanRevisionMap(meta?.collectionRevisions)
  return COLLECTIONS.every((collectionName) => revisions[collectionName]) ? revisions : null
}

export function getCloudCollectionsToLoad({
  uid = '',
  remoteMeta = null,
  localManifest = null,
  localFingerprints = {},
  now = Date.now(),
} = {}) {
  const enabledAt = new Date(CLOUD_WORKSPACE_FAST_PATH_ENABLE_AT).getTime()
  if (!Number.isFinite(enabledAt) || Number(now) < enabledAt) return null
  if (!uid || localManifest?.uid !== uid) return null
  const remoteRevisions = getCloudCollectionRevisions(remoteMeta)
  if (!remoteRevisions) return null

  return COLLECTIONS.filter((collectionName) => {
    const localRevision = String(localManifest?.collectionRevisions?.[collectionName] || '')
    const storedFingerprint = String(localManifest?.collectionFingerprints?.[collectionName] || '')
    const currentFingerprint = String(localFingerprints?.[collectionName] || '')
    return (
      !localRevision ||
      localRevision !== remoteRevisions[collectionName] ||
      !storedFingerprint ||
      storedFingerprint !== currentFingerprint
    )
  })
}

export function canUseCloudWorkspaceManifest({
  uid = '',
  remoteMeta = null,
  localManifest = null,
  localFingerprint = '',
  localWorkspaceExists = false,
  localWorkspaceIsDemo = false,
  pendingOperationCount = 0,
  now = Date.now(),
} = {}) {
  const enabledAt = new Date(CLOUD_WORKSPACE_FAST_PATH_ENABLE_AT).getTime()
  if (!Number.isFinite(enabledAt) || Number(now) < enabledAt) return false
  if (!uid || !localWorkspaceExists || localWorkspaceIsDemo || pendingOperationCount > 0) return false

  const remoteRevision = getCloudWorkspaceRevision(remoteMeta)
  return Boolean(
    remoteRevision &&
    localManifest?.uid === uid &&
    localManifest?.workspaceRevision === remoteRevision &&
    localManifest?.datasetFingerprint &&
    localManifest.datasetFingerprint === localFingerprint,
  )
}
