import {
  Check,
  Loader2,
  Pencil,
  ShieldCheck,
  Trash2,
  UserRoundPlus,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { planningExpiryDate, planningExpiryFromDate, isPlanningAccessExpired } from '../../domain/planning/accessExpiry'
import { validateDirectionGrant } from '../../domain/planning/directionAccess'
import { buildPlanningDirectionUrl } from '../../domain/planning/directionView'
import { useDialogAccessibility } from '../../lib/useDialogAccessibility'

const ROLE_OPTIONS = [
  {
    description: 'Només pot consultar la programació i les sessions de la classe escollida, amb el seu compte verificat @educand.ad.',
    label: 'Direcció · lectura',
    value: 'directionReader',
  },
  {
    description: 'Pot editar el contingut pedagògic de la UP, sense accedir als grups.',
    label: 'Coedició de la UP',
    value: 'planningEditor',
  },
  {
    description: 'Pot treballar a l’Agenda només amb els grups que seleccionis.',
    label: 'Agenda per grups',
    value: 'planningAgendaEditor',
  },
  {
    description: 'Pot coeditar la UP de tutoria i calendaritzar-la només al seu propi horari.',
    label: 'Cotutoria · UP i agenda pròpia',
    value: 'tutoringCollaborator',
  },
]

function emptyDraft() {
  return { classIds: [], email: '', role: 'directionReader', expiresOn: '' }
}

function roleLabel(role) {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label || role
}

/**
 * La gestió d'accessos es fa sobre una sola UP i amb un correu exacte. Desar i
 * revocar són operacions atòmiques al núvol perquè el document de la concessió
 * i la llista autoritzada de la UP no puguin quedar desalineats.
 */
export function PlanningSharingDialog({ classes, grants, onClose, onRevoke, onSave, unit, applications = [] }) {
  const dialogRef = useDialogAccessibility(onClose)
  const [draft, setDraft] = useState(emptyDraft)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [createdLink, setCreatedLink] = useState(null)
  const connectedClasses = [...new Map(applications.map((application) => [application.classId, application])).values()]
  const updateDraft = (update) => { setCreatedLink(null); setCopied(false); setDraft(update) }
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(createdLink.url); setCopied(true) }
    catch { setError('Copia l’enllaç seleccionant el text del camp.') }
  }
  const classById = useMemo(() => new Map(classes.map((item) => [item.id, item])), [classes])

  const edit = (grant) => updateDraft({
    classIds: grant.classIds || [],
    email: grant.granteeEmail,
    expiresOn: planningExpiryDate(grant.expiresAtEpochMs),
    role: grant.role,
  })

  const save = async (event) => {
    event.preventDefault()
    const selectedExpiryDate = new FormData(event.currentTarget).get('expiresOn') || ''
    setBusy('save')
    setError('')
    try {
      const expiresAtEpochMs = planningExpiryFromDate(selectedExpiryDate)
      if (expiresAtEpochMs != null && expiresAtEpochMs <= Date.now()) throw new Error('Tria una data de caducitat d’avui o posterior.')
      const email = draft.email.trim().toLowerCase()
      const selectedClassIds = draft.classIds
      const application = connectedClasses.find((entry) => entry.classId === selectedClassIds[0])
      if (draft.role === 'directionReader') {
        validateDirectionGrant(email, selectedClassIds)
        if (!application) throw new Error('Selecciona una classe connectada amb aquesta UP.')
      }
      await onSave({ ...draft, email, expiresAtEpochMs })
      if (draft.role === 'directionReader') setCreatedLink({ url: buildPlanningDirectionUrl(unit.id, undefined, application.id), email, className: application.classLabel || classById.get(application.classId)?.name || 'Classe autoritzada' })
      setDraft(emptyDraft())
    } catch (operationError) {
      setError(operationError.message || 'No s’ha pogut desar l’accés.')
    } finally {
      setBusy('')
    }
  }

  const revoke = async (grant) => {
    setBusy(grant.granteeEmail)
    setError('')
    try {
      await onRevoke(grant)
      if (draft.email === grant.granteeEmail) setDraft(emptyDraft())
      if (createdLink?.email === grant.granteeEmail) setCreatedLink(null)
    } catch (operationError) {
      setError(operationError.message || 'No s’ha pogut retirar l’accés.')
    } finally {
      setBusy('')
    }
  }

  const toggleClass = (classId) => updateDraft((current) => ({
    ...current,
    classIds: current.classIds.includes(classId)
      ? current.classIds.filter((id) => id !== classId)
      : [...current.classIds, classId],
  }))

  return (
    <div className="planning-dialog-backdrop">
      <section
        aria-labelledby="planning-sharing-title"
        aria-modal="true"
        className="planning-sharing-dialog"
        ref={dialogRef}
        role="dialog"
        tabIndex="-1"
      >
        <header>
          <span><ShieldCheck size={21} /></span>
          <div>
            <small>Accés a una programació concreta</small>
            <h2 id="planning-sharing-title">Compartir {unit.code} · {unit.title}</h2>
          </div>
        </header>
        <p className="planning-sharing-intro">
          Tria la classe i autoritza el correu exacte. La consulta de direcció requereix un compte Google verificat @educand.ad. AvaluaPro no envia cap missatge.
        </p>

        {createdLink && <section className="planning-direction-link">
          <strong>Enllaç de consulta · {createdLink.className}</strong>
          <p>Accés autoritzat a {createdLink.email} amb el seu compte Google d’educand verificat, per consultar aquesta classe. Els canvis desats hi apareixeran en directe.</p>
          <input aria-label="Enllaç de direcció" readOnly value={createdLink.url} onFocus={(event) => event.target.select()} />
          <button className="secondary-action" onClick={copyLink} type="button">{copied ? 'Enllaç copiat' : 'Copiar enllaç'}</button>
        </section>}
        <form onSubmit={save}>
          {draft.role === 'directionReader' && <label>
            Classe que vols compartir
            <select aria-label="Classe que vols compartir" required value={draft.classIds[0] || ''} onChange={(event) => { const classId = event.target.value; updateDraft((current) => ({ ...current, classIds: classId ? [classId] : [] })) }}>
              <option value="">Tria una classe</option>
              {connectedClasses.map((application) => <option key={application.classId} value={application.classId}>{application.classLabel || classById.get(application.classId)?.name || 'Classe connectada'}</option>)}
            </select>
            <small>{connectedClasses.length ? 'L’enllaç i l’accés quedaran limitats a la programació d’aquesta classe dins d’aquesta UP.' : 'No hi ha cap classe connectada amb aquesta UP.'}</small>
          </label>}
          <label>
            Correu de la persona convidada
            <input
              autoComplete="email"
              onChange={(event) => { const email = event.currentTarget.value; updateDraft((current) => ({ ...current, email })) }}
              placeholder={draft.role === 'directionReader' ? 'nom@educand.ad' : 'nom@centre.ad'}
              required
              type="email"
              value={draft.email}
            />
          </label>
          <label>
            Data de caducitat de l’accés (opcional)
            <input name="expiresOn" type="date" value={draft.expiresOn} onChange={(event) => { const value = event.currentTarget.value; updateDraft((current) => ({ ...current, expiresOn: value })) }} onInput={(event) => { const value = event.currentTarget.value; updateDraft((current) => ({ ...current, expiresOn: value })) }} />
            <small>L’enllaç funcionarà per a aquest correu fins al final del dia indicat, en hora d’Andorra. Sense data, l’accés no caduca.</small>
          </label>
          <fieldset>
            <legend>Què podrà fer?</legend>
            <div className="planning-sharing-roles">
              {ROLE_OPTIONS.map((option) => (
                <label className={draft.role === option.value ? 'active' : ''} key={option.value}>
                  <input
                    checked={draft.role === option.value}
                    name="sharing-role"
                    onChange={() => updateDraft((current) => ({
                      ...current,
                      classIds: [],
                      role: option.value,
                    }))}
                    type="radio"
                  />
                  <span><strong>{option.label}</strong><small>{option.description}</small></span>
                  {draft.role === option.value && <Check size={17} />}
                </label>
              ))}
            </div>
          </fieldset>
          {draft.role === 'planningAgendaEditor' && (
            <fieldset>
              <legend>Grups autoritzats</legend>
              <div className="planning-sharing-classes">
                {classes.map((classItem) => (
                  <label className={draft.classIds.includes(classItem.id) ? 'active' : ''} key={classItem.id}>
                    <input
                      checked={draft.classIds.includes(classItem.id)}
                      onChange={() => toggleClass(classItem.id)}
                      type="checkbox"
                    />
                    <Users size={15} />
                    <span>{classItem.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {error && <p className="planning-sharing-error" role="alert">{error}</p>}
          <div className="planning-dialog-actions">
            <button className="secondary-action" disabled={Boolean(busy)} onClick={onClose} type="button">Tancar</button>
            <button className="primary-action" disabled={Boolean(busy) || !draft.email.trim() || (draft.role === 'directionReader' && draft.classIds.length !== 1)} type="submit">
              {busy === 'save' ? <Loader2 className="spin" size={16} /> : <UserRoundPlus size={16} />}
              {draft.role === 'directionReader' ? 'Crear enllaç i autoritzar accés' : 'Desar accés'}
            </button>
          </div>
        </form>

        <section className="planning-sharing-current">
          <header><div><strong>Accessos actuals</strong><span>{grants.length}</span></div></header>
          {grants.length === 0 ? (
            <p>Encara no has compartit aquesta UP.</p>
          ) : grants.map((grant) => (
            <article key={grant.granteeEmail}>
              <div>
                <strong>{grant.granteeEmail}</strong>
                <span>{roleLabel(grant.role)}</span>
                {grant.role === 'directionReader' && grant.classIds?.length !== 1 && <small>Accés antic bloquejat: edita’l i selecciona una classe.</small>}
                <small>{grant.expiresAtEpochMs ? `${isPlanningAccessExpired(grant) ? 'Accés caducat' : 'Caduca'} · ${new Date(grant.expiresAtEpochMs - 1).toLocaleDateString('ca-AD', { timeZone: 'Europe/Andorra' })}` : 'Sense caducitat'}</small>
                {['planningAgendaEditor', 'directionReader'].includes(grant.role) && (
                  <small>{(grant.classIds || []).map((classId) => classById.get(classId)?.name || connectedClasses.find((application) => application.classId === classId)?.classLabel || 'Classe autoritzada').join(' · ')}</small>
                )}
              </div>
              <button
                aria-label={`Editar accés de ${grant.granteeEmail}`}
                disabled={Boolean(busy)}
                onClick={() => edit(grant)}
                type="button"
              >
                <Pencil size={15} />
              </button>
              <button
                aria-label={`Retirar accés de ${grant.granteeEmail}`}
                className="danger"
                disabled={Boolean(busy)}
                onClick={() => revoke(grant)}
                type="button"
              >
                {busy === grant.granteeEmail ? <Loader2 className="spin" size={15} /> : <Trash2 size={15} />}
              </button>
            </article>
          ))}
        </section>
      </section>
    </div>
  )
}
