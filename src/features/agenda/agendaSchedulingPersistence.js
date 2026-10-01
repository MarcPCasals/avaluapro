import {
  createCalendarSession,
  createGroupApplication,
  createSessionItem,
} from '../../domain/planning/index.js'

/**
 * La UP és la font d'autoritat del propietari dels documents compartits.
 * Una aplicació antiga o carregada per un col·laborador pot dur el seu uid com
 * a gestor; això és correcte a managerUid, però no a ownerUid. Abans d'enviar
 * sessions noves a Firebase reconstruïm tota la proposta amb el propietari de
 * la UP perquè les regles no acceptin només les sessions que ja existien.
 */
export function buildSchedulingPersistenceEntries(preview, now = new Date().toISOString()) {
  if (!preview?.setup?.planningUnit?.id) throw new Error('La proposta no és vàlida.')
  const ownerUid = preview.setup.planningUnit.ownerUid || preview.setup.application?.ownerUid
  const application = createGroupApplication({
    ...preview.setup.application,
    ownerUid,
    status: 'active',
    updatedAt: now,
  }, { now })
  const entries = [{ entity: application }]

  for (const bundle of preview.sessions || []) {
    const session = createCalendarSession({
      ...bundle.session,
      applicationId: application.id,
      classId: application.classId,
      ownerUid,
      updatedAt: now,
    }, { now })
    entries.push({ entity: session, context: { planningUnitId: preview.setup.planningUnit.id } })
    for (const item of bundle.items || []) {
      entries.push({
        entity: createSessionItem({
          ...item,
          applicationId: application.id,
          ownerUid,
          sessionId: session.id,
          updatedAt: now,
        }, { now }),
        context: {
          applicationId: application.id,
          planningUnitId: preview.setup.planningUnit.id,
          sessionId: session.id,
        },
      })
    }
  }

  return { application, entries }
}

export function requireConfirmedSchedulingSync(summary) {
  if (summary?.state === 'saved') return summary
  throw new Error(
    'Les sessions s’han desat en aquest dispositiu, però Firebase encara no les ha confirmat totes. '
    + 'La finestra es manté oberta perquè no sembli que la sincronització ha acabat.',
  )
}

/**
 * Una UP només té una aplicació vigent per grup. Els intents antics podien
 * deixar més d'una aplicació activa amb sessions equivalents; la més recent
 * és la que conté la reordenació confirmada i és l'única que s'ha de mostrar.
 * En tutoria, cada gestor conserva la seva aplicació independent.
 */
export function selectCurrentPlanningApplicationRecords(records = []) {
  const selected = new Map()
  for (const record of records) {
    const application = record?.application
    const planningUnit = record?.planningUnit
    if (!application?.id || !planningUnit?.id) continue
    const managerKey = planningUnit.tutoringSpaceId ? application.managerUid || '' : ''
    const key = `${planningUnit.id}:${application.classId || ''}:${managerKey}`
    const current = selected.get(key)
    const version = `${application.updatedAt || application.createdAt || ''}:${application.id}`
    const currentVersion = current
      ? `${current.application.updatedAt || current.application.createdAt || ''}:${current.application.id}`
      : ''
    if (!current || version > currentVersion) selected.set(key, record)
  }
  return [...selected.values()]
}
