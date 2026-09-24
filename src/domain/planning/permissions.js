import { ACCESS_ROLES } from './constants.js'

const NO_ACCESS = Object.freeze({
  canReadPlanningUnit: false,
  canEditPlanningUnit: false,
  canReadGroupApplication: false,
  canManageGroupAgenda: false,
  canReadPedagogicalReflections: false,
  canReadPrivateNotes: false,
  canReadIndividualIncidents: false,
  canReadFullDiagnoses: false,
})

/**
 * Calcula només els permisos que arriben des de Programació. Els permisos
 * existents d'AvaluaPro sobre alumnat s'han de verificar a part; una invitació
 * a una UP mai no els amplia de manera implícita.
 */
export function getPlanningPermissions({
  actorUid,
  ownerUid,
  grantRole,
  hasLinkedGroupAccess = false,
}) {
  if (actorUid && actorUid === ownerUid) {
    return {
      canReadPlanningUnit: true,
      canEditPlanningUnit: true,
      canReadGroupApplication: true,
      canManageGroupAgenda: true,
      canReadPedagogicalReflections: true,
      canReadPrivateNotes: true,
      canReadIndividualIncidents: true,
      canReadFullDiagnoses: true,
    }
  }

  if (!ACCESS_ROLES.includes(grantRole) || grantRole === 'owner') return { ...NO_ACCESS }

  if (grantRole === 'directionReader') {
    return {
      ...NO_ACCESS,
      canReadPlanningUnit: true,
      canReadGroupApplication: true,
      canReadPedagogicalReflections: true,
    }
  }

  const canManageGroupAgenda = (
    grantRole === 'planningAgendaEditor'
    || grantRole === 'tutoringCollaborator'
  ) && hasLinkedGroupAccess
  return {
    ...NO_ACCESS,
    canReadPlanningUnit: true,
    canEditPlanningUnit: grantRole === 'planningEditor' || grantRole === 'tutoringCollaborator',
    canReadGroupApplication: hasLinkedGroupAccess,
    canManageGroupAgenda,
    canReadPedagogicalReflections: hasLinkedGroupAccess,
  }
}
