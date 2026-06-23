import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const PROJECT_ID = 'avaluapro'
const API_KEY = String(process.env.FIREBASE_WEB_API_KEY || '').trim()
const FIRESTORE_ROOT = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`
const CONFIRMATION = String(process.env.CONFIRM_PRODUCTION_SMOKE || '')
const REQUIRED_CONFIRMATION = 'PROVA SOCIOMETRICA FICTICIA'
const suffix = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
const surveyId = `smoke_survey_${suffix}`
const tokenId = crypto.randomBytes(24).toString('hex')
const classId = `smoke_class_${suffix}`
const createdAt = new Date().toISOString()
const expiresAtEpochMs = Date.now() + 60 * 60 * 1000
const expiresAt = new Date(expiresAtEpochMs).toISOString()
const privacyNoticeVersion = '2026-06-20-v1'

function encodeValue(value) {
  if (value === null) return { nullValue: null }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  }
  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, encodeValue(entry)])),
      },
    }
  }
  return { stringValue: String(value) }
}

function encodeDocument(value) {
  return { fields: Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, encodeValue(entry)])) }
}

async function getAccessToken() {
  const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json')
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'))
  if (!config.tokens?.access_token) {
    throw new Error('No hi ha una sessió activa de Firebase CLI. Executa `npx firebase login --reauth`.')
  }
  return config.tokens.access_token
}

function apiUrl(documentPath, query = '') {
  const separator = query ? '&' : '?'
  return `${FIRESTORE_ROOT}/${documentPath}${query}${API_KEY ? `${separator}key=${API_KEY}` : ''}`
}

async function request(url, { body, method = 'GET', token } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const responseBody = response.status === 204 ? null : await response.json().catch(() => null)
  return { body: responseBody, status: response.status }
}

function assertStatus(result, expected, label) {
  if (result.status !== expected) {
    throw new Error(`${label}: s'esperava HTTP ${expected} i s'ha rebut ${result.status}.`)
  }
  console.log(`OK ${label} · HTTP ${result.status}`)
}

const studentOptions = [
  { id: 'student-fictici-a', name: 'Alumna Fictícia A' },
  { id: 'student-fictici-b', name: 'Alumne Fictici B' },
]
const survey = {
  avoidLimit: 1,
  classId,
  className: 'Tutoria Fictícia de Seguretat',
  createdAt,
  expiresAt,
  expiresAtEpochMs,
  id: surveyId,
  importedRelationCount: 0,
  lastSyncedAt: '',
  memberUids: ['smoke-owner'],
  ownerEmailLower: 'smoke-owner@example.invalid',
  ownerUid: 'smoke-owner',
  positiveLimit: 1,
  responseCount: 0,
  status: 'active',
  studentOptionIds: studentOptions.map((student) => student.id),
  studentOptions,
  updatedAt: createdAt,
}
const accessToken = {
  avoidLimit: survey.avoidLimit,
  classId,
  className: survey.className,
  createdAt,
  expiresAt,
  expiresAtEpochMs,
  positiveLimit: survey.positiveLimit,
  privacyNoticeVersion,
  studentId: studentOptions[0].id,
  studentName: studentOptions[0].name,
  studentOptions,
  surveyId,
  tokenId,
}
const response = {
  accessToken: tokenId,
  avoidStudentIds: [],
  classId,
  positiveStudentIds: [studentOptions[1].id],
  privacyNoticeAcknowledged: true,
  privacyNoticeVersion,
  responseId: tokenId,
  studentId: studentOptions[0].id,
  studentName: studentOptions[0].name,
  submittedAt: new Date().toISOString(),
  surveyId,
}

console.log(
  JSON.stringify(
    {
      action: CONFIRMATION === REQUIRED_CONFIRMATION ? 'run' : 'dry-run',
      className: survey.className,
      expiresAt,
      students: studentOptions.map((student) => student.name),
      surveyId,
    },
    null,
    2,
  ),
)

if (CONFIRMATION !== REQUIRED_CONFIRMATION) {
  console.log(
    `\nMode sec. Per executar: FIREBASE_WEB_API_KEY="..." CONFIRM_PRODUCTION_SMOKE="${REQUIRED_CONFIRMATION}"`,
  )
  process.exit(0)
}

if (!API_KEY) {
  throw new Error('Cal indicar `FIREBASE_WEB_API_KEY` per executar la prova pública en producció.')
}

const adminToken = await getAccessToken()
const surveyPath = `sociometricSurveys/${surveyId}`
const tokenPath = `${surveyPath}/accessTokens/${tokenId}`
const responsePath = `${surveyPath}/responses/${tokenId}`

try {
  assertStatus(
    await request(apiUrl(surveyPath, '?currentDocument.exists=false'), {
      body: encodeDocument(survey),
      method: 'PATCH',
      token: adminToken,
    }),
    200,
    'creació administrativa del qüestionari fictici',
  )
  assertStatus(
    await request(apiUrl(tokenPath, '?currentDocument.exists=false'), {
      body: encodeDocument(accessToken),
      method: 'PATCH',
      token: adminToken,
    }),
    200,
    'creació administrativa del token fictici',
  )

  assertStatus(await request(apiUrl(surveyPath)), 403, 'document general no públic')
  assertStatus(await request(apiUrl(`${surveyPath}/accessTokens`, '?pageSize=10')), 403, 'tokens no enumerables')
  assertStatus(await request(apiUrl(tokenPath)), 200, 'token individual consultable')

  assertStatus(
    await request(apiUrl(responsePath, '?currentDocument.exists=false'), {
      body: encodeDocument({ ...response, studentId: studentOptions[1].id, studentName: studentOptions[1].name }),
      method: 'PATCH',
    }),
    403,
    'el token no permet respondre per un altre alumne',
  )
  assertStatus(
    await request(apiUrl(responsePath, '?currentDocument.exists=false'), {
      body: encodeDocument(response),
      method: 'PATCH',
    }),
    200,
    'resposta fictícia vàlida acceptada',
  )
  assertStatus(
    await request(apiUrl(responsePath), {
      body: encodeDocument({ ...response, positiveStudentIds: [], submittedAt: new Date().toISOString() }),
      method: 'PATCH',
    }),
    403,
    'resposta existent no sobreescrivible',
  )

  const expiredAtEpochMs = Date.now() - 1000
  const expiredAt = new Date(expiredAtEpochMs).toISOString()
  assertStatus(
    await request(
      apiUrl(
        surveyPath,
        '?updateMask.fieldPaths=expiresAt&updateMask.fieldPaths=expiresAtEpochMs',
      ),
      {
        body: encodeDocument({ expiresAt: expiredAt, expiresAtEpochMs: expiredAtEpochMs }),
        method: 'PATCH',
        token: adminToken,
      },
    ),
    200,
    'caducitat administrativa del qüestionari fictici',
  )
  assertStatus(
    await request(
      apiUrl(
        tokenPath,
        '?updateMask.fieldPaths=expiresAt&updateMask.fieldPaths=expiresAtEpochMs',
      ),
      {
        body: encodeDocument({ expiresAt: expiredAt, expiresAtEpochMs: expiredAtEpochMs }),
        method: 'PATCH',
        token: adminToken,
      },
    ),
    200,
    'caducitat administrativa del token fictici',
  )
  assertStatus(await request(apiUrl(tokenPath)), 403, 'token caducat no consultable')
  console.log('\nProva sociomètrica fictícia completada correctament.')
} finally {
  await request(apiUrl(responsePath), { method: 'DELETE', token: adminToken })
  await request(apiUrl(tokenPath), { method: 'DELETE', token: adminToken })
  await request(apiUrl(surveyPath), { method: 'DELETE', token: adminToken })
  console.log('Neteja de la prova fictícia completada.')
}
