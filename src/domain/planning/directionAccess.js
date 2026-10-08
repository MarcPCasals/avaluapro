export function isEducandEmail(email) {
  return /^[^\s@]+@educand\.ad$/i.test(String(email || '').trim())
}

export function validateDirectionGrant(email, classIds = []) {
  if (!isEducandEmail(email)) throw new Error('L’accés de direcció requereix un correu @educand.ad.')
  if (classIds.length !== 1 || !classIds[0]) throw new Error('Selecciona una sola classe per compartir la seva programació.')
}

export function directionIdentityAllowed(claims = {}) {
  return isEducandEmail(claims.email) && claims.email_verified === true
    && claims.firebase?.sign_in_provider === 'google.com'
}

export function directionGrantAllowsApplication(grant, application) {
  return grant?.role === 'directionReader' && grant.status === 'active'
    && grant.classIds?.length === 1
    && (!application || grant.classIds[0] === application.classId)
}
