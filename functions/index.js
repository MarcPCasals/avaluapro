import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions'
import { defineBoolean, defineInt } from 'firebase-functions/params'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { runSociometricPurge } from './src/sociometricPurge.js'

initializeApp()

const purgeEnabled = defineBoolean('SOCIOMETRIC_PURGE_ENABLED', {
  default: false,
  description: 'Activa la supressió real dels qüestionaris sociomètrics caducats.',
})
const purgeRetentionDays = defineInt('SOCIOMETRIC_PURGE_RETENTION_DAYS', {
  default: 7,
  description: 'Dies de marge després de la caducitat abans de purgar.',
})
const purgeBatchLimit = defineInt('SOCIOMETRIC_PURGE_BATCH_LIMIT', {
  default: 200,
  description: 'Nombre màxim de qüestionaris processats en cada execució.',
})

export const purgeExpiredSociometricSurveys = onSchedule(
  {
    maxInstances: 1,
    memory: '256MiB',
    region: 'europe-southwest1',
    schedule: '15 3 * * *',
    timeZone: 'Europe/Andorra',
    timeoutSeconds: 540,
  },
  async () => {
    const enabled = purgeEnabled.value()
    const summary = await runSociometricPurge({
      batchLimit: purgeBatchLimit.value(),
      db: getFirestore(),
      dryRun: !enabled,
      enabled: true,
      retentionDays: purgeRetentionDays.value(),
    })

    logger.info('Purga sociomètrica completada.', summary)
  },
)
