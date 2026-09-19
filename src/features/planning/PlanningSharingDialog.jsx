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
import { useDialogAccessibility } from '../../lib/useDialogAccessibility'

const ROLE_OPTIONS = [
  {
    description: 'Pot consultar la UP i l’aplicació real, sense editar res.',
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
]

function emptyDraft() {
  return { classIds: [], email: '', role: 'directionReader' }
}

function roleLabel(role) {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label || role
}

/**
 * La gestió d'accessos es fa sobre una sola UP i amb un correu exacte. Desar i
 * revocar són operacions atòmiques al núvol perquè el document de la concessió
 * i la llista autoritzada de la UP no puguin quedar desalineats.
 */
export function PlanningSharingDialog({ classes, grants, onClose, onRevoke, onSave, unit }) {
  const dialogRef = useDialogAccessibility(onClose)
  const [draft, setDraft] = useState(emptyDraft)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const classById = useMemo(() => new Map(classes.map((item) => [item.id, item])), [classes])

  const edit = (grant) => setDraft({
    classIds: grant.classIds || [],
    email: grant.granteeEmail,
    role: grant.role,
  })

  const save = async (event) => {
    event.preventDefault()
    setBusy('save')
    setError('')
    try {
      await onSave(draft)
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
    } catch (operationError) {
      setError(operationError.message || 'No s’ha pogut retirar l’accés.')
    } finally {
      setBusy('')
    }
  }

  const toggleClass = (classId) => setDraft((current) => ({
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
          L’accés queda vinculat al correu exacte. AvaluaPro no envia cap missatge: la persona veurà aquesta UP quan entri amb aquest compte.
        </p>

        <form onSubmit={save}>
          <label>
            Correu de la persona convidada
            <input
              autoComplete="email"
              onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
              placeholder="nom@centre.ad"
              required
              type="email"
              value={draft.email}
            />
          </label>
          <fieldset>
            <legend>Què podrà fer?</legend>
            <div className="planning-sharing-roles">
              {ROLE_OPTIONS.map((option) => (
                <label className={draft.role === option.value ? 'active' : ''} key={option.value}>
                  <input
                    checked={draft.role === option.value}
                    name="sharing-role"
                    onChange={() => setDraft((current) => ({
                      ...current,
                      classIds: option.value === 'planningAgendaEditor' ? current.classIds : [],
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
            <button className="primary-action" disabled={Boolean(busy) || !draft.email.trim()} type="submit">
              {busy === 'save' ? <Loader2 className="spin" size={16} /> : <UserRoundPlus size={16} />}
              Desar accés
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
                {grant.role === 'planningAgendaEditor' && (
                  <small>{grant.classIds.map((classId) => classById.get(classId)?.name || 'Grup autoritzat').join(' · ')}</small>
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
