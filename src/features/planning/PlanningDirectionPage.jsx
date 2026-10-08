import { useEffect, useState } from 'react'
import { getAuth, getIdTokenResult, onIdTokenChanged } from 'firebase/auth'
import { signInWithGoogle, signOutFromGoogle } from '../../lib/firebase'
import { directionGrantAllowsApplication, directionIdentityAllowed } from '../../domain/planning/directionAccess'
import { isPlanningAccessExpired } from '../../domain/planning/accessExpiry'
import { subscribePlanningDirection } from '../../data/cloud/planningDirectionSubscription'
import { PlanningSharedView } from './PlanningSharedView'
import './planning.css'

export default function PlanningDirectionPage({ unitId, applicationId = '' }) {
  const [user, setUser] = useState(undefined)
  const [identityRevision, setIdentityRevision] = useState(0)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => onIdTokenChanged(getAuth(), (next) => {
    setData(null)
    setError('')
    setUser(next)
    // Firebase pot renovar el token conservant el mateix objecte User.
    setIdentityRevision((revision) => revision + 1)
  }), [])
  useEffect(() => {
    if (!user) return
    let timer
    let stopped = false
    let stop = () => {}
    const expire = () => {
      stopped = true
      stop()
      setData(null)
      setError('L’accés a aquesta programació ha caducat. Demana al docent que ampliï la data de caducitat.')
    }
    getIdTokenResult(user).then(({ claims }) => {
      if (stopped) return
      if (!applicationId) throw new Error('Aquest enllaç no especifica una classe. Demana al docent un nou enllaç amb una classe autoritzada.')
      if (!directionIdentityAllowed(claims)) throw new Error('Cal entrar amb el compte Google verificat @educand.ad que el docent ha autoritzat.')
      stop = subscribePlanningDirection(unitId, (next) => {
        if (stopped) return
        if (!next.unit) return
        clearTimeout(timer)
        const grant = next.unit?.ownerUid === user.uid ? null : next.unit?.accessByEmail?.[String(user.email || '').toLowerCase()]
        const application = next.applications.find((entry) => entry.application.id === applicationId)?.application
        if (next.unit.ownerUid !== user.uid && !directionGrantAllowsApplication(grant, application)) {
          stopped = true
          stop()
          setData(null)
          setError('Aquest compte no té un accés actiu de direcció a la classe de l’enllaç. Demana al docent que revisi el correu i la classe autoritzats.')
          return
        }
        const check = () => {
          if (isPlanningAccessExpired(grant)) { expire(); return }
          if (grant?.expiresAtEpochMs) timer = setTimeout(check, Math.min(grant.expiresAtEpochMs - Date.now(), 2147483647))
        }
        check()
        if (!stopped) { setError(''); setData(next) }
      }, () => {
        stopped = true
        clearTimeout(timer)
        setData(null)
        setError('No tens accés a aquesta programació, o l’accés ha caducat o ha estat retirat. Entra amb el correu que el docent ha autoritzat.')
      }, { applicationId })
    }).catch((operationError) => { if (!stopped) { setData(null); setError(operationError.message) } })
    return () => { stopped = true; clearTimeout(timer); stop() }
  }, [unitId, applicationId, user, identityRevision])
  const login = async () => {
    try { await signInWithGoogle({ educandOnly: true }) } catch (operationError) { setError(operationError.message) }
  }
  return <main className="planning-direction-page">
    <div className="planning-direction-status">
      <span>{!user ? 'Consulta de direcció · només lectura' : error ? 'Accés no disponible' : !data?.unit ? 'Carregant…' : data.fromCache ? 'Sense confirmació del servidor · pendent de connexió' : 'En directe · només lectura'}</span>
      {user && <button className="secondary-action compact" onClick={() => signOutFromGoogle().catch(() => setError('No s’ha pogut tancar la sessió.'))} type="button">Canviar de compte</button>}
    </div>
    {error && <p className="planning-sharing-error" role="alert">{error}</p>}
    {user === null && <div className="planning-shared-empty large"><h1>Programació compartida</h1><p>Entra amb el compte Google @educand.ad exacte que el docent ha autoritzat. Només podràs consultar la programació de la classe compartida.</p><button className="primary-action" onClick={login} type="button">Entrar amb educand</button></div>}
    {data?.unit && <PlanningSharedView key={unitId} initialApplicationId={applicationId} activities={data.activities} phases={data.phases} unit={data.unit} role="directionReader" liveApplications={data.applications} />}
  </main>
}
