import { useEffect, useState } from 'react'
import { Modal } from '../../components/Modal'
import { buildStudentOverviewShareUrl, studentOverviewShareAccess } from '../../lib/studentOverviewSharing.js'
import { planningExpiryDate } from '../../domain/planning/accessExpiry.js'
import './StudentOverviewSharing.css'

export function StudentOverviewSharingDialog({ classId, className, onClose, getSnapshot, service }) {
  const [shares, setShares] = useState([])
  const [now, setNow] = useState(Date.now)
  const [draft, setDraft] = useState({ id: '', emails: '', expiresOn: '' })
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [selectedLink, setSelectedLink] = useState('')
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    let active = true
    service.listStudentOverviewShares(classId).then((value) => { if (active) setShares(value) })
      .catch(() => { if (active) setError('No s’han pogut carregar els enllaços. Comprova la connexió.') })
      .finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [classId, service])
  const save = async (event) => {
    event.preventDefault()
    setBusy(true); setError(''); setCopied(false)
    try {
      const access = studentOverviewShareAccess(draft.emails, new FormData(event.currentTarget).get('expiresOn'))
      const share = await service.saveStudentOverviewShare({ ...access, id: draft.id, classId, snapshot: getSnapshot() })
      setShares((current) => [share, ...current.filter((item) => item.id !== share.id)])
      setSelectedLink(buildStudentOverviewShareUrl(share.id))
      setDraft({ id: '', emails: '', expiresOn: '' })
    } catch (operationError) { setError(operationError.message || 'No s’ha pogut desar l’enllaç.') }
    finally { setBusy(false) }
  }
  const revoke = async (id) => {
    setBusy(true); setError('')
    try {
      await service.revokeStudentOverviewShare(id)
      setShares((current) => current.map((share) => share.id === id ? { ...share, enabled: false } : share))
      setSelectedLink('')
      if (draft.id === id) setDraft({ id: '', emails: '', expiresOn: '' })
    } catch { setError('No s’ha pogut retirar l’accés. Comprova la connexió.') }
    finally { setBusy(false) }
  }
  const edit = (share) => {
    setDraft({ id: share.id, emails: share.authorizedEmails.join(', '), expiresOn: planningExpiryDate(share.expiresAtEpochMs) })
    setSelectedLink(buildStudentOverviewShareUrl(share.id)); setCopied(false)
  }
  return <div className="student-sharing-shell"><Modal title={`Compartir consulta · ${className}`} onClose={onClose} size="lg">
    <div className="student-sharing-dialog">
      <p>Direcció podrà consultar aquest grup i obrir els detalls, sense editar ni entrar al teu quadern. Només hi podran entrar amb un compte Google verificat @educand.ad que coincideixi amb un dels correus que autoritzis.</p>
      <p>Es comparteix la informació actual de tots els alumnes del grup. Per incorporar canvis posteriors, prem «Actualitzar informació i accés» en un enllaç existent. La caducitat s’aplica al final del dia triat, en hora d’Andorra.</p>
      <form onSubmit={save}>
        <label>Correus autoritzats de direcció<input required type="text" value={draft.emails} onChange={(event) => setDraft({ ...draft, emails: event.target.value })} placeholder="Correus @educand.ad separats amb comes" /></label>
        <label>Caduca el<input required name="expiresOn" type="date" value={draft.expiresOn} onChange={(event) => setDraft({ ...draft, expiresOn: event.target.value })} /></label>
        <button className="primary-action" disabled={busy} type="submit">{busy ? 'Desant…' : draft.id ? 'Actualitzar informació i accés' : 'Crear enllaç de consulta'}</button>
        {draft.id && <button type="button" className="secondary-action" onClick={() => setDraft({ id: '', emails: '', expiresOn: '' })}>Preparar un altre enllaç</button>}
      </form>
      {error && <p role="alert">{error}</p>}
      {selectedLink && <div className="student-sharing-link"><input aria-label="Enllaç de consulta" readOnly value={selectedLink} onFocus={(event) => event.target.select()} /><button type="button" className="secondary-action" onClick={async () => {
        try { await navigator.clipboard.writeText(selectedLink); setCopied(true) } catch { setError('Selecciona i copia el text de l’enllaç.') }
      }}>{copied ? 'Enllaç copiat' : 'Copiar enllaç'}</button></div>}
      <h3>Enllaços d’aquest grup · 20 més recents</h3>
      {!busy && !shares.length && <p>Encara no hi ha cap enllaç.</p>}
      {shares.map((share) => <article key={share.id}>
        <strong>{share.authorizedEmails.join(', ')}</strong>
        <small>{!share.enabled ? 'Accés retirat' : share.expiresAtEpochMs <= now ? 'Caducat' : 'Actiu'} · {planningExpiryDate(share.expiresAtEpochMs)} · Informació del {new Date(share.updatedAt).toLocaleString('ca-AD', { timeZone: 'Europe/Andorra' })}</small>
        <div><button disabled={busy} type="button" className="secondary-action" onClick={() => edit(share)}>Actualitzar informació i accés</button>
          <button disabled={busy || !share.enabled} type="button" className="secondary-action" onClick={() => revoke(share.id)}>Retirar accés</button></div>
      </article>)}
    </div>
  </Modal></div>
}
