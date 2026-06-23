const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000
const SURVEYS_COLLECTION = 'sociometricSurveys'
const PURGE_RUNS_COLLECTION = 'systemPurgeRuns'

function cleanPositiveInteger(value, fallback) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export function getPurgeCutoff(nowMs, retentionDays) {
  return Number(nowMs) - cleanPositiveInteger(retentionDays, 7) * MILLISECONDS_PER_DAY
}

async function deleteSurveyCopies(db, surveyId, publicSurveyPath, dryRun) {
  const copiesSnapshot = await db.collectionGroup(SURVEYS_COLLECTION).where('id', '==', surveyId).get()
  const copyRefs = copiesSnapshot.docs
    .map((snapshot) => snapshot.ref)
    .filter((ref) => ref.path !== publicSurveyPath)

  if (!dryRun && copyRefs.length > 0) {
    const writer = db.bulkWriter()
    copyRefs.forEach((ref) => writer.delete(ref))
    await writer.close()
  }

  return copyRefs.length
}

async function inspectSurvey(surveySnapshot) {
  const [tokensSnapshot, responsesSnapshot] = await Promise.all([
    surveySnapshot.ref.collection('accessTokens').get(),
    surveySnapshot.ref.collection('responses').get(),
  ])
  const declaredResponseCount = Math.max(0, Number(surveySnapshot.get('responseCount')) || 0)

  return {
    declaredResponseCount,
    responseCount: responsesSnapshot.size,
    tokenCount: tokensSnapshot.size,
    unsyncedResponseCount: Math.max(0, responsesSnapshot.size - declaredResponseCount),
  }
}

export async function runSociometricPurge({
  batchLimit = 200,
  db,
  dryRun = false,
  enabled = true,
  nowMs = Date.now(),
  retentionDays = 7,
} = {}) {
  if (!db) throw new Error('Cal indicar una instància de Firestore.')

  const cleanBatchLimit = cleanPositiveInteger(batchLimit, 200)
  const cleanRetentionDays = cleanPositiveInteger(retentionDays, 7)
  const cutoffEpochMs = getPurgeCutoff(nowMs, cleanRetentionDays)
  const startedAt = new Date(nowMs).toISOString()
  const summary = {
    batchLimit: cleanBatchLimit,
    candidateCount: 0,
    copyCount: 0,
    cutoffEpochMs,
    deletedSurveyCount: 0,
    dryRun: Boolean(dryRun),
    enabled: Boolean(enabled),
    finishedAt: '',
    responseCount: 0,
    retentionDays: cleanRetentionDays,
    startedAt,
    tokenCount: 0,
    unsyncedResponseCount: 0,
  }

  if (!enabled) {
    summary.finishedAt = new Date().toISOString()
    return summary
  }

  const candidates = await db
    .collection(SURVEYS_COLLECTION)
    .where('expiresAtEpochMs', '<=', cutoffEpochMs)
    .limit(cleanBatchLimit)
    .get()

  summary.candidateCount = candidates.size

  for (const surveySnapshot of candidates.docs) {
    const inspection = await inspectSurvey(surveySnapshot)
    const copyCount = await deleteSurveyCopies(
      db,
      surveySnapshot.id,
      surveySnapshot.ref.path,
      dryRun,
    )

    summary.copyCount += copyCount
    summary.responseCount += inspection.responseCount
    summary.tokenCount += inspection.tokenCount
    summary.unsyncedResponseCount += inspection.unsyncedResponseCount

    if (!dryRun) {
      await db.recursiveDelete(surveySnapshot.ref)
      summary.deletedSurveyCount += 1
    }
  }

  summary.finishedAt = new Date().toISOString()

  await db.collection(PURGE_RUNS_COLLECTION).add({
    ...summary,
    type: 'sociometric-survey-purge',
  })

  return summary
}
