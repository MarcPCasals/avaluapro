import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const PROJECT_ID = 'avaluapro'
const RULES_RELEASE = 'cloud.firestore'
const FIRESTORE_ROOT = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`
const RULES_ROOT = `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}`
const ALLOWED_TUTORING_SUBCOLLECTIONS = new Set([
  'studentAntecedents',
  'students',
  'tutorialGroupSets',
  'tutorialMarks',
  'tutorialRecords',
  'tutorialRelations',
  'tutorialSeatingPlans',
  'tutorialSociogramLayouts',
  'tutorialSociometricMoments',
  'tutorialStudentRoles',
])

function shortRef(value) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 10)
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function maskEmail(value) {
  const [localPart = '', domain = ''] = String(value || '').split('@')
  if (!localPart || !domain) return ''
  return `${localPart.slice(0, 1)}***@${domain}`
}

function decodeFirestoreValue(value) {
  if (!value) return null
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return value.doubleValue
  if ('booleanValue' in value) return value.booleanValue
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeFirestoreValue)
  return null
}

async function getAccessToken() {
  const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json')
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'))
  if (!config.tokens?.access_token) {
    throw new Error('No hi ha una sessió activa de Firebase CLI. Executa `npx firebase login`.')
  }
  return config.tokens.access_token
}

async function requestJson(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const body = await response.json()
  if (response.status === 401) {
    throw new Error(
      'La sessió de Firebase CLI ha caducat o no és vàlida. Executa `npx firebase projects:list` ' +
        'per renovar-la o `npx firebase login --reauth`, i torna a provar l’auditoria.',
    )
  }
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(body)}`)
  return body
}

async function listDocuments(collectionPath, token) {
  const result = await requestJson(`${FIRESTORE_ROOT}/${collectionPath}?pageSize=300`, token)
  return result.documents || []
}

async function getDocument(documentPath, token) {
  const response = await fetch(`${FIRESTORE_ROOT}/${documentPath}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (response.status === 404) return null
  const body = await response.json()
  if (response.status === 401) {
    throw new Error(
      'La sessió de Firebase CLI ha caducat o no és vàlida. Executa `npx firebase projects:list` ' +
        'per renovar-la o `npx firebase login --reauth`, i torna a provar l’auditoria.',
    )
  }
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(body)}`)
  return body
}

async function listCollectionIds(documentPath, token) {
  const result = await requestJson(`${FIRESTORE_ROOT}/${documentPath}:listCollectionIds`, token, {
    method: 'POST',
    body: JSON.stringify({ pageSize: 100 }),
  })
  return result.collectionIds || []
}

async function getDeployedRules(token) {
  const release = await requestJson(`${RULES_ROOT}/releases/${RULES_RELEASE}`, token)
  const ruleset = await requestJson(
    `https://firebaserules.googleapis.com/v1/${release.rulesetName}`,
    token,
  )
  const content =
    ruleset.source?.files?.find((file) => file.name === 'firestore.rules')?.content ||
    ruleset.source?.files?.[0]?.content ||
    ''
  return { content, release }
}

async function auditSurveys(token) {
  const documents = await listDocuments('sociometricSurveys', token)
  const surveys = []

  for (const document of documents) {
    const id = document.name.split('/').pop()
    const fields = Object.fromEntries(
      Object.entries(document.fields || {}).map(([key, value]) => [key, decodeFirestoreValue(value)]),
    )
    const [tokens, responses] = await Promise.all([
      listDocuments(`sociometricSurveys/${encodeURIComponent(id)}/accessTokens`, token),
      listDocuments(`sociometricSurveys/${encodeURIComponent(id)}/responses`, token),
    ])
    const privateDocument = fields.ownerUid
      ? await getDocument(
          `users/${encodeURIComponent(fields.ownerUid)}/sociometricSurveys/${encodeURIComponent(id)}`,
          token,
        )
      : null
    const privateFields = Object.fromEntries(
      Object.entries(privateDocument?.fields || {}).map(([key, value]) => [key, decodeFirestoreValue(value)]),
    )

    surveys.push({
      ref: shortRef(id),
      classRef: fields.classId ? shortRef(fields.classId) : '',
      classLabel: fields.className || '',
      ownerRef: fields.ownerUid ? shortRef(fields.ownerUid) : '',
      ownerEmailMasked: maskEmail(fields.ownerEmailLower || fields.ownerEmail),
      status: fields.status || '',
      createdAt: fields.createdAt || '',
      hasExpiry: Number(fields.expiresAtEpochMs) > 0,
      tokenCount: tokens.length,
      actualResponseCount: responses.length,
      declaredResponseCount: Number(fields.responseCount) || 0,
      importedRelationCount: Number(fields.importedRelationCount) || 0,
      lastSyncedAt: fields.lastSyncedAt || '',
      privateCopyExists: Boolean(privateDocument),
      privateResponseCount: Number(privateFields.responseCount) || 0,
      privateLastSyncedAt: privateFields.lastSyncedAt || '',
    })
  }

  return surveys
}

async function auditTutoringSpaces(token) {
  const documents = await listDocuments('tutoringSpaces', token)
  const spaces = []

  for (const document of documents) {
    const id = document.name.split('/').pop()
    const subcollections = (await listCollectionIds(`tutoringSpaces/${encodeURIComponent(id)}`, token)).sort()
    spaces.push({
      ref: shortRef(id),
      subcollections,
      unexpectedSubcollections: subcollections.filter(
        (collectionName) => !ALLOWED_TUTORING_SUBCOLLECTIONS.has(collectionName),
      ),
    })
  }

  return spaces
}

const token = await getAccessToken()
const [{ content: deployedRules, release }, localRules, surveys, tutoringSpaces] = await Promise.all([
  getDeployedRules(token),
  fs.readFile(new URL('../firestore.rules', import.meta.url), 'utf8'),
  auditSurveys(token),
  auditTutoringSpaces(token),
])

const activeLegacySurveys = surveys.filter(
  (survey) => survey.status === 'active' && (!survey.hasExpiry || survey.tokenCount === 0),
)
const unsyncedResponses = surveys.filter(
  (survey) => survey.actualResponseCount > survey.declaredResponseCount,
)
const unexpectedSubcollections = tutoringSpaces.flatMap((space) =>
  space.unexpectedSubcollections.map((collectionName) => ({
    collectionName,
    spaceRef: space.ref,
  })),
)
const blockers = []
const warnings = []
if (activeLegacySurveys.length > 0) {
  warnings.push(
    `${activeLegacySurveys.length} qüestionaris antics actius quedaran inaccessibles quan es despleguin les regles reforçades`,
  )
}
if (unsyncedResponses.length > 0) blockers.push(`${unsyncedResponses.length} qüestionaris amb respostes no sincronitzades`)
if (unexpectedSubcollections.length > 0) blockers.push('subcol·leccions de cotutoria no previstes')

console.log(
  JSON.stringify(
    {
      project: PROJECT_ID,
      checkedAt: new Date().toISOString(),
      readyToDeploy: blockers.length === 0,
      blockers,
      warnings,
      rules: {
        deployedRuleset: release.rulesetName,
        deployedUpdatedAt: release.updateTime,
        deployedSha256: sha256(deployedRules),
        localSha256: sha256(localRules),
        identical: deployedRules === localRules,
      },
      sociometricSurveys: {
        total: surveys.length,
        activeLegacy: activeLegacySurveys,
        unsyncedResponses,
      },
      tutoringSpaces: {
        total: tutoringSpaces.length,
        unexpectedSubcollections,
      },
    },
    null,
    2,
  ),
)

if (blockers.length > 0) process.exitCode = 2
