export const SOCIOMETRIC_PURGE_RETENTION_DAYS = 7
export const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

export function getSociometricPurgeCutoff(
  nowMs = Date.now(),
  retentionDays = SOCIOMETRIC_PURGE_RETENTION_DAYS,
) {
  const cleanRetentionDays = Math.max(0, Number(retentionDays) || 0)
  return Number(nowMs) - cleanRetentionDays * MILLISECONDS_PER_DAY
}

export function shouldPurgeSociometricSurvey(
  survey,
  nowMs = Date.now(),
  retentionDays = SOCIOMETRIC_PURGE_RETENTION_DAYS,
) {
  const expiresAtEpochMs = Number(survey?.expiresAtEpochMs) || 0
  if (expiresAtEpochMs <= 0) return false
  return expiresAtEpochMs <= getSociometricPurgeCutoff(nowMs, retentionDays)
}

export function removeExpiredSociometricSurveys(
  surveys,
  nowMs = Date.now(),
  retentionDays = SOCIOMETRIC_PURGE_RETENTION_DAYS,
) {
  return (Array.isArray(surveys) ? surveys : []).filter(
    (survey) => !shouldPurgeSociometricSurvey(survey, nowMs, retentionDays),
  )
}
