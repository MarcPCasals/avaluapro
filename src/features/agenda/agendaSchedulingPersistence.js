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
