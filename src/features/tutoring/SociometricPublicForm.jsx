import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Info,
  Loader2,
  LockKeyhole,
  Minus,
  Plus,
  Send,
  UsersRound,
} from 'lucide-react'
import {
  SOCIOMETRIC_PRIVACY_NOTICE_VERSION,
  loadPublicSociometricSurvey,
  submitSociometricSurveyResponse,
} from '../../lib/firebase'

function getStudentName(survey, studentId) {
  return survey.studentOptions.find((student) => student.id === studentId)?.name || ''
}

function getInitials(name = '') {
  const cleanParts = String(name)
    .replace(',', ' ')
    .split(/\s+/)
    .filter(Boolean)
  return cleanParts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export function SociometricPublicForm({ accessToken, surveyId }) {
  const [survey, setSurvey] = useState(null)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [positiveStudentIds, setPositiveStudentIds] = useState([])
  const [avoidStudentIds, setAvoidStudentIds] = useState([])
  const [privacyNoticeRead, setPrivacyNoticeRead] = useState(false)
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadSurvey() {
      setStatus('loading')
      setMessage('')
      try {
        const loadedSurvey = await loadPublicSociometricSurvey(surveyId, accessToken)
        if (cancelled) return
        setSurvey(loadedSurvey)
        setSelectedStudentId(loadedSurvey.respondent.studentId)
        setPositiveStudentIds([])
        setAvoidStudentIds([])
        setPrivacyNoticeRead(false)
        setStatus('ready')
      } catch (error) {
        if (cancelled) return
        setStatus('error')
        setMessage(
          String(error.message || '').includes('permission')
            ? 'Aquest qüestionari no està disponible o ja s’ha tancat.'
            : error.message || 'No s’ha pogut carregar aquest qüestionari.',
        )
      }
    }

    loadSurvey()
    return () => {
      cancelled = true
    }
  }, [accessToken, surveyId])

  const studentOptions = useMemo(
    () =>
      [...(survey?.studentOptions || [])]
        .filter((student) => student.id !== selectedStudentId)
        .sort((a, b) => a.name.localeCompare(b.name, 'ca')),
    [selectedStudentId, survey],
  )
  const selectedStudentName = survey ? getStudentName(survey, selectedStudentId) : ''
  const positiveLimit = survey?.positiveLimit || 4
  const avoidLimit = survey?.avoidLimit || 3
  const hasAnyInteraction = positiveStudentIds.length + avoidStudentIds.length > 0
  const canSubmit =
    status === 'ready' &&
    selectedStudentId &&
    hasAnyInteraction &&
    privacyNoticeRead

  const handleTogglePositive = (studentId) => {
    setMessage('')
    setPositiveStudentIds((current) => {
      if (current.includes(studentId)) return current.filter((id) => id !== studentId)
      if (current.length >= positiveLimit) {
        setMessage(`Ja has triat ${positiveLimit} companys/companyes.`)
        return current
      }
      return [...current, studentId]
    })
    setAvoidStudentIds((current) => current.filter((id) => id !== studentId))
  }

  const handleToggleAvoid = (studentId) => {
    setMessage('')
    setAvoidStudentIds((current) => {
      if (current.includes(studentId)) return current.filter((id) => id !== studentId)
      if (current.length >= avoidLimit) {
        setMessage(`Ja has marcat ${avoidLimit} companys/companyes.`)
        return current
      }
      return [...current, studentId]
    })
    setPositiveStudentIds((current) => current.filter((id) => id !== studentId))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!survey || !canSubmit) return

    const confirmed = window.confirm(
      [
        'Revisa abans d’enviar:',
        '',
        `Alumne: ${selectedStudentName}`,
        `Eleccions positives: ${positiveStudentIds.map((studentId) => getStudentName(survey, studentId)).join(', ')}`,
        `Companys/companyes amb qui costa més: ${avoidStudentIds
          .map((studentId) => getStudentName(survey, studentId))
          .join(', ')}`,
        '',
        'Vols registrar aquesta resposta?',
      ].join('\n'),
    )
    if (!confirmed) return

    setStatus('submitting')
    setMessage('')
    try {
      await submitSociometricSurveyResponse({
        accessToken,
        surveyId: survey.id,
        response: {
          classId: survey.classId,
          studentId: selectedStudentId,
          studentName: selectedStudentName,
          positiveStudentIds,
          avoidStudentIds,
          privacyNoticeAcknowledged: privacyNoticeRead,
          privacyNoticeVersion: SOCIOMETRIC_PRIVACY_NOTICE_VERSION,
        },
      })
      setStatus('submitted')
      setMessage('Resposta registrada. Gràcies per ajudar a entendre millor el grup.')
    } catch (error) {
      setStatus('ready')
      setMessage(error.message || 'No s’ha pogut enviar la resposta. Torna-ho a provar.')
    }
  }

  if (status === 'loading') {
    return (
      <main className="public-sociometric-screen">
        <section className="public-sociometric-panel loading">
          <Loader2 className="spin-icon" size={34} />
          <p>Carregant qüestionari...</p>
        </section>
      </main>
    )
  }

  if (status === 'error') {
    return (
      <main className="public-sociometric-screen">
        <section className="public-sociometric-panel">
          <span className="public-sociometric-icon error">
            <AlertCircle size={30} />
          </span>
          <h1>Qüestionari no disponible</h1>
          <p>{message}</p>
        </section>
      </main>
    )
  }

  if (status === 'submitted') {
    return (
      <main className="public-sociometric-screen">
        <section className="public-sociometric-panel submitted">
          <span className="public-sociometric-icon success">
            <CheckCircle2 size={32} />
          </span>
          <h1>Resposta registrada</h1>
          <p>{message}</p>
        </section>
      </main>
    )
  }

  return (
    <main className="public-sociometric-screen">
      <form className="public-sociometric-panel" onSubmit={handleSubmit}>
        <header className="public-sociometric-header">
          <span className="public-sociometric-icon">
            <UsersRound size={30} />
          </span>
          <div>
            <p>Avaluapro · qüestionari sociomètric</p>
            <h1>{survey?.className || 'Grup classe'}</h1>
          </div>
        </header>

        <section className="public-sociometric-intro">
          <p>
            Aquest qüestionari ajuda el tutor/a a entendre millor les relacions del grup. Respon amb sinceritat i
            respecte.
          </p>
        </section>

        <section aria-labelledby="privacy-notice-title" className="public-sociometric-privacy">
          <div className="public-sociometric-privacy-heading">
            <span>
              <LockKeyhole size={20} />
            </span>
            <div>
              <h2 id="privacy-notice-title">Abans de respondre</h2>
              <p>Aquesta activitat no és anònima.</p>
            </div>
          </div>

          <div className="public-sociometric-privacy-grid">
            <article>
              <Info size={18} />
              <div>
                <strong>Per a què serveix?</strong>
                <p>Per ajudar els docents autoritzats de la tutoria a entendre les relacions del grup i organitzar millor l’acompanyament.</p>
              </div>
            </article>
            <article>
              <UsersRound size={18} />
              <div>
                <strong>Qui ho veurà?</strong>
                <p>El tutor/a i, si escau, altres docents autoritzats de la mateixa tutoria. Les respostes no es mostraran als companys.</p>
              </div>
            </article>
            <article>
              <Clock3 size={18} />
              <div>
                <strong>Quant temps?</strong>
                <p>L’enllaç caduca en 24 hores. La resposta bruta només es necessita temporalment i el docent l’ha d’eliminar després d’incorporar-la al sociograma; el resultat pedagògic pot conservar-se segons la política educativa aplicable.</p>
              </div>
            </article>
          </div>

          <details>
            <summary>Més informació sobre les teves dades</summary>
            <div>
              <p>
                Es registra qui respon i quins companys o companyes selecciona. No s’utilitza per prendre decisions
                automàtiques ni per posar una nota.
              </p>
              <p>
                L’enllaç és personal i només permet una resposta. No el comparteixis. Si t’has equivocat o vols
                preguntar com s’utilitzarà la informació, parla amb el tutor/a que te l’ha facilitat.
              </p>
              <p>
                El centre o l’administració educativa haurà d’identificar formalment el responsable del tractament,
                la base jurídica i els canals per exercir els drets abans d’un ús institucional.
              </p>
            </div>
          </details>

          <label className="public-sociometric-privacy-check">
            <input
              checked={privacyNoticeRead}
              onChange={(event) => setPrivacyNoticeRead(event.target.checked)}
              type="checkbox"
            />
            <span>He llegit i entenc com s’utilitzarà aquesta resposta.</span>
          </label>
        </section>

        <div className="public-sociometric-student">
          <span>Respon com</span>
          <strong>{selectedStudentName}</strong>
        </div>

        <section className="public-sociometric-question">
          <div className="public-sociometric-question-header">
            <h2>
              Amb qui t’agrada jugar <em>sempre</em> al pati i amb qui no estàs o no t’agrada relacionar-te al pati?
            </h2>
            <div className="public-sociometric-counters">
              <strong className={positiveStudentIds.length === positiveLimit ? 'complete' : ''}>
                Eleccions: {positiveStudentIds.length}/{positiveLimit} màx.
              </strong>
              <strong className={avoidStudentIds.length === avoidLimit ? 'complete danger' : 'danger'}>
                Rebuigs: {avoidStudentIds.length}/{avoidLimit} màx.
              </strong>
            </div>
          </div>

          <div className="public-sociometric-student-grid">
            {studentOptions.map((student, index) => (
              <article
                className={`public-sociometric-student-card ${
                  positiveStudentIds.includes(student.id)
                    ? 'selected-positive'
                    : avoidStudentIds.includes(student.id)
                      ? 'selected-avoid'
                      : ''
                }`}
                key={student.id}
              >
                <span className={`public-sociometric-avatar tone-${index % 6}`}>{getInitials(student.name)}</span>
                <strong>{student.name}</strong>
                <div>
                  <button
                    className="public-sociometric-choice-button positive"
                    onClick={() => handleTogglePositive(student.id)}
                    type="button"
                  >
                    <Plus size={17} />
                    Triar
                  </button>
                  <button
                    className="public-sociometric-choice-button avoid"
                    onClick={() => handleToggleAvoid(student.id)}
                    type="button"
                  >
                    <Minus size={17} />
                    Rebutjar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {message && (
          <div className="public-sociometric-warning">
            <AlertCircle size={18} />
            <span>{message}</span>
          </div>
        )}

        <button className="public-sociometric-submit" disabled={!canSubmit} type="submit">
          {status === 'submitting' ? <Loader2 className="spin-icon" size={18} /> : <Send size={18} />}
          {!privacyNoticeRead
            ? 'Llegeix la informació abans d’enviar'
            : selectedStudentId && !hasAnyInteraction
              ? 'Marca almenys una opció'
              : 'Enviar resposta'}
        </button>
      </form>
    </main>
  )
}
