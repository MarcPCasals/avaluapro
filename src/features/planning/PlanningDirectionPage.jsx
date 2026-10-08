import { useEffect, useState } from 'react'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { signInWithGoogle, signOutFromGoogle } from '../../lib/firebase'
import { isPlanningAccessExpired } from '../../domain/planning/accessExpiry'
import { subscribePlanningDirection } from '../../data/cloud/planningDirectionSubscription'
import { PlanningSharedView } from './PlanningSharedView'
import './planning.css'

export default function PlanningDirectionPage({ unitId, applicationId = '' }) {
  const [user, setUser] = useState(undefined)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => onAuthStateChanged(getAuth(), (next) => { setData(null); setError(''); setUser(next) }), [])
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
    stop = subscribePlanningDirection(unitId, (next) => {
      if (stopped) return
      clearTimeout(timer)
      const grant = next.unit?.ownerUid === user.uid ? null : next.unit?.accessByEmail?.[String(user.email || '').toLowerCase()]
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
    })
    return () => { stopped = true; clearTimeout(timer); stop() }
  }, [unitId, user])
  const login = async () => {
    try { await signInWithGoogle() } catch (operationError) { setError(operationError.message) }
  }
  return <main className="planning-direction-page">
    <div className="planning-direction-status">
      <span>{!user ? 'Consulta de direcció · només lectura' : error ? 'Accés no disponible' : !data?.unit ? 'Carregant…' : data.fromCache ? 'Sense confirmació del servidor · pendent de connexió' : 'En directe · només lectura'}</span>
      {user && <button className="secondary-action compact" onClick={() => signOutFromGoogle().catch(() => setError('No s’ha pogut tancar la sessió.'))} type="button">Canviar de compte</button>}
    </div>
    {error && <p className="planning-sharing-error" role="alert">{error}</p>}
    {user === null && <div className="planning-shared-empty large"><h1>Programació compartida</h1><p>Entra amb el compte Google autoritzat pel docent per consultar aquesta pantalla.</p><button className="primary-action" onClick={login} type="button">Entrar amb Google</button></div>}
    {data?.unit && <PlanningSharedView key={unitId} initialApplicationId={applicationId} activities={data.activities} phases={data.phases} unit={data.unit} role="directionReader" liveApplications={data.applications} />}
  </main>
}
