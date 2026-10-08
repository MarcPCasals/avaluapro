import { getAuth, getIdTokenResult, getRedirectResult, onIdTokenChanged } from 'firebase/auth'
import { directionIdentityAllowed } from '../../domain/planning/directionAccess.js'
import { canReadStudentOverviewShare } from '../../lib/studentOverviewSharing.js'
import { useEffect, useState } from 'react'
import { signInWithGoogle, signOutFromGoogle } from '../../lib/firebase.js'
import { subscribeStudentOverviewShare } from '../../data/cloud/studentOverviewShares.js'
import { StudentOverviewConsultation } from './StudentOverviewConsultation'
import '../../App.css'

export default function StudentOverviewDirectionPage({ shareId }) {
  const [user, setUser] = useState(undefined)
  const [data, setData] = useState(null)
  const [identityRevision, setIdentityRevision] = useState(0)
  const [error, setError] = useState('')
  useEffect(() => {
    const robots = document.createElement('meta')
    robots.name = 'robots'; robots.content = 'noindex, nofollow, noarchive'
    const referrer = document.createElement('meta')
    referrer.name = 'referrer'; referrer.content = 'no-referrer'
    document.head.append(robots, referrer)
    return () => { robots.remove(); referrer.remove() }
  }, [])
  useEffect(() => {
    let active = true
    getRedirectResult(getAuth()).catch(() => { if (active) setError('No s’ha pogut completar l’entrada amb Google.') })
    const stop = onIdTokenChanged(getAuth(), (value) => {
      setData(null); setError(''); setUser(value)
      setIdentityRevision((revision) => revision + 1)
    })
    return () => { active = false; stop() }
  }, [])
  useEffect(() => {
    if (!user) return
    let stopped = false
    let timer
    let stop = () => {}
    const unavailable = () => {
      stopped = true; clearTimeout(timer); stop(); setData(null)
      setError('Aquest enllaç ha caducat, s’ha retirat o el teu correu no està autoritzat. Demana accés al docent.')
    }
    getIdTokenResult(user).then(({ claims }) => {
      if (stopped) return
      if (!directionIdentityAllowed(claims)) {
        stopped = true
        setError('Cal entrar amb el compte Google verificat @educand.ad que el docent ha autoritzat.')
        return
      }
      stop = subscribeStudentOverviewShare(shareId, (next) => {
        if (stopped) return
        clearTimeout(timer)
        if (!canReadStudentOverviewShare(next, claims)) { unavailable(); return }
        // No mostrar còpies locals sense confirmació del servidor.
        if (next.fromCache) { setData(null); return }
        const check = () => {
          if (next.expiresAtEpochMs <= Date.now()) { unavailable(); return }
          timer = setTimeout(check, Math.min(next.expiresAtEpochMs - Date.now(), 2147483647))
        }
        check(); setError(''); setData(next)
      }, unavailable)
    }).catch(() => { if (!stopped) unavailable() })
    return () => { stopped = true; clearTimeout(timer); stop() }
  }, [shareId, user, identityRevision])
  return <main className="student-direction-page">
    <div className="student-direction-status"><strong>Consulta de direcció · només lectura</strong>
      {user && <button className="secondary-action" type="button" onClick={() => signOutFromGoogle().catch(() => setError('No s’ha pogut tancar la sessió.'))}>Canviar de compte</button>}</div>
    {error && <p role="alert">{error}</p>}
    {user === null && <section><h1>Consulta de l’alumnat</h1><p>Entra amb el compte Google verificat @educand.ad que el docent ha autoritzat.</p><button className="primary-action" type="button" onClick={() => signInWithGoogle({ educandOnly: true }).catch(() => setError('No s’ha pogut entrar amb Google.'))}>Entrar amb Google · educand.ad</button></section>}
    {user && !data && !error && <p>Comprovant l’accés amb el servidor…</p>}
    {data && <StudentOverviewConsultation key={`${data.id}-${data.updatedAt}`} snapshot={data.snapshot} updatedAt={data.updatedAt} expiresAtEpochMs={data.expiresAtEpochMs} />}
  </main>
}
