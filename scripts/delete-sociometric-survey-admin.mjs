import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const PROJECT_ID = 'avaluapro'
const FIRESTORE_ROOT = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`
const TARGET_REF = String(process.env.SURVEY_REF || '').trim()
const CONFIRMATION = String(process.env.CONFIRM_DELETE_SURVEY || '')
const REQUIRED_CONFIRMATION = `ELIMINAR ${TARGET_REF}`

function shortRef(value) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 10)
}

function decodeFirestoreValue(value) {
  if (!value) return null
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return value.doubleValue
  if ('booleanValue' in value) return value.booleanValue
  return null
}

function maskEmail(value) {
  const [localPart = '', domain = ''] = String(value || '').split('@')
  if (!localPart || !domain) return ''
  return `${localPart.slice(0, 1)}***@${domain}`
}

async function getAccessToken() {
  const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json')
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'))
  if (!config.tokens?.access_token) {
    throw new Error('No hi ha una sessió activa de Firebase CLI. Executa `npx firebase login --reauth`.')
  }
  return config.tokens.access_token
}

async function request(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  if (response.status === 401) {
    throw new Error('La sessió de Firebase CLI ha caducat. Executa `npx firebase login --reauth`.')
  }
  if (response.status === 404 && options.allowNotFound) return null
  const body = response.status === 204 ? null : await response.json()
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(body)}`)
  return body
}

async function listDocuments(collectionPath, token) {
  const result = await request(`${FIRESTORE_ROOT}/${collectionPath}?pageSize=300`, token)
  return result.documents || []
}

async function deleteDocument(documentName, token) {
  await request(`https://firestore.googleapis.com/v1/${documentName}`, token, { method: 'DELETE' })
}

if (!TARGET_REF) {
  throw new Error('Cal indicar la referència anonimitzada amb `SURVEY_REF=...`.')
}

const token = await getAccessToken()
const surveys = await listDocuments('sociometricSurveys', token)
const matches = surveys.filter((document) => shortRef(document.name.split('/').pop()) === TARGET_REF)

if (matches.length !== 1) {
  throw new Error(`S'esperava un únic qüestionari per a ${TARGET_REF}, però se n'han trobat ${matches.length}.`)
}

const surveyDocument = matches[0]
const surveyId = surveyDocument.name.split('/').pop()
const fields = Object.fromEntries(
  Object.entries(surveyDocument.fields || {}).map(([key, value]) => [key, decodeFirestoreValue(value)]),
)
const [tokens, responses] = await Promise.all([
  listDocuments(`sociometricSurveys/${encodeURIComponent(surveyId)}/accessTokens`, token),
  listDocuments(`sociometricSurveys/${encodeURIComponent(surveyId)}/responses`, token),
])
const summary = {
  action: CONFIRMATION === REQUIRED_CONFIRMATION ? 'delete' : 'dry-run',
  classLabel: fields.className || '',
  createdAt: fields.createdAt || '',
  importedRelationCount: Number(fields.importedRelationCount) || 0,
  lastSyncedAt: fields.lastSyncedAt || '',
  ownerEmailMasked: maskEmail(fields.ownerEmailLower || fields.ownerEmail),
  privateCopy: Boolean(fields.ownerUid),
  responseCount: responses.length,
  surveyRef: TARGET_REF,
  tokenCount: tokens.length,
}

console.log(JSON.stringify(summary, null, 2))

if (CONFIRMATION !== REQUIRED_CONFIRMATION) {
  console.log(`\nMode sec. Per executar: CONFIRM_DELETE_SURVEY="${REQUIRED_CONFIRMATION}"`)
  process.exit(0)
}

for (const document of [...tokens, ...responses]) {
  await deleteDocument(document.name, token)
}
await deleteDocument(surveyDocument.name, token)

if (fields.ownerUid) {
  const privateDocumentName =
    `projects/${PROJECT_ID}/databases/(default)/documents/users/${fields.ownerUid}` +
    `/sociometricSurveys/${surveyId}`
  await request(`https://firestore.googleapis.com/v1/${privateDocumentName}`, token, {
    allowNotFound: true,
    method: 'DELETE',
  })
}

console.log('\nSupressió administrativa completada.')
