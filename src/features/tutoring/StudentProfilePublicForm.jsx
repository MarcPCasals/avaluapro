import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  HeartHandshake,
  Info,
  Loader2,
  LockKeyhole,
  Plus,
  Send,
  Trash2,
  UserRoundCheck,
} from 'lucide-react'
import {
  loadPublicStudentProfileSurvey,
  submitStudentProfileSurveyResponse,
} from '../../lib/firebase'
import {
  BREAK_PREFERENCE_OPTIONS,
  CURRENT_SUPPORT_OPTIONS,
  FAMILY_LANGUAGE_OPTIONS,
  HELP_SEEKING_OPTIONS,
  HOUSEHOLD_OPTIONS,
  LEARNING_HELP_OPTIONS,
  PARISH_OPTIONS,
  RELATIONSHIP_OPTIONS,
  SCHOOL_OPTIONS,
  SCHOOL_SUPPORT_OPTIONS,
  WORK_PREFERENCE_OPTIONS,
  createEmptyStudentProfileAnswers,
  getStudentProfilePersonalStepError,
  normalizeStudentProfileAnswers,
} from './studentProfileQuestionnaire'

const STEPS = [
  { id: 'identity', label: 'Qui soc' },
  { id: 'personal', label: 'Dades personals' },
  { id: 'family', label: 'Família' },
  { id: 'wellbeing', label: 'Salut i benestar' },
  { id: 'school', label: 'Trajectòria' },
  { id: 'learning', label: 'Aprenentatge' },
  { id: 'review', label: 'Revisió' },
]

const DRAFT_STORAGE_PREFIX = 'avaluapro:student-profile-draft:'

function getDraftStorageKey(surveyId) {
  return `${DRAFT_STORAGE_PREFIX}${surveyId}`
}

function removeStoredDraft(surveyId) {
  try {
    window.localStorage.removeItem(getDraftStorageKey(surveyId))
  } catch {
    // El formulari continua funcionant encara que el navegador bloquegi l'emmagatzematge local.
  }
}

function readStoredDraft(loadedSurvey) {
  try {
    const value = JSON.parse(window.localStorage.getItem(getDraftStorageKey(loadedSurvey.id)) || 'null')
    const studentExists = loadedSurvey.studentOptions?.some((student) => student.id === value?.studentId)
    if (
      !value ||
      value.surveyId !== loadedSurvey.id ||
      value.formVersion !== loadedSurvey.formVersion ||
      !studentExists ||
      !value.answers ||
      Date.now() >= Number(value.expiresAtEpochMs || 0)
    ) {
      if (value) removeStoredDraft(loadedSurvey.id)
      return null
    }
    return value
  } catch {
    removeStoredDraft(loadedSurvey.id)
    return null
  }
}

function getInitials(name = '') {
  return String(name)
    .replace(',', ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function ChoiceCards({ name, onChange, options, value }) {
  return (
    <div className="student-profile-choice-grid">
      {options.map((option) => {
        const optionValue = typeof option === 'string' ? option : option.value
        const label = typeof option === 'string' ? option : option.label
        return (
          <label className={value === optionValue ? 'selected' : ''} key={optionValue}>
            <input
              checked={value === optionValue}
              name={name}
              onChange={() => onChange(optionValue)}
              type="radio"
              value={optionValue}
            />
            <span>{label}</span>
          </label>
        )
      })}
    </div>
  )
}

function CheckboxCards({ exclusive = [], onChange, options, value = [] }) {
  const toggle = (optionValue) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((item) => item !== optionValue))
      return
    }
    if (exclusive.includes(optionValue)) {
      onChange([optionValue])
      return
    }
    onChange([...value.filter((item) => !exclusive.includes(item)), optionValue])
  }

  return (
    <div className="student-profile-choice-grid checkboxes">
      {options.map((option) => {
        const optionValue = typeof option === 'string' ? option : option.value
        const label = typeof option === 'string' ? option : option.label
        return (
          <label className={value.includes(optionValue) ? 'selected' : ''} key={optionValue}>
            <input checked={value.includes(optionValue)} onChange={() => toggle(optionValue)} type="checkbox" />
            <span>{label}</span>
          </label>
        )
      })}
    </div>
  )
}

function ActivityRows({ addLabel, onChange, value = [] }) {
  const addRow = () => {
    if (value.length >= 12) return
    onChange([...value, { activity: '', hours: '' }])
  }
  const updateRow = (index, key, nextValue) => {
    onChange(value.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: nextValue } : row)))
  }

  return (
    <div className="student-profile-activity-editor">
      {value.map((row, index) => (
        <div className="student-profile-activity-row" key={`activity-${index + 1}`}>
          <label>
            Activitat o reforç
            <input
              maxLength={160}
              onChange={(event) => updateRow(index, 'activity', event.target.value)}
              value={row.activity}
            />
          </label>
          <label>
            Hores per setmana
            <input
              inputMode="decimal"
              max="40"
              min="0"
              onChange={(event) => updateRow(index, 'hours', event.target.value)}
              step="0.5"
              type="number"
              value={row.hours}
            />
          </label>
          <button
            aria-label="Eliminar fila"
            className="icon-button danger subtle"
            onClick={() => onChange(value.filter((_, rowIndex) => rowIndex !== index))}
            type="button"
          >
            <Trash2 size={17} />
          </button>
        </div>
      ))}
      <button className="secondary-action compact" onClick={addRow} type="button">
        <Plus size={16} />
        {addLabel}
      </button>
    </div>
  )
}

const HOME_DEVICE_TYPES = [
  { countKey: 'homeMobileCount', label: 'Mòbil' },
  { countKey: 'homeTabletCount', label: 'iPad o tauleta' },
  { countKey: 'homeComputerCount', label: 'Ordinador' },
]

function HomeDeviceRows({ answers, onChange }) {
  return (
    <div className="student-profile-device-grid">
      {HOME_DEVICE_TYPES.map(({ countKey, label }) => {
        const count = Number(answers[countKey] || 0)
        const selected = count > 0
        return (
          <article className={selected ? 'selected' : ''} key={countKey}>
            <label className="student-profile-device-toggle">
              <input
                checked={selected}
                onChange={(event) => onChange(countKey, event.target.checked ? 1 : 0)}
                type="checkbox"
              />
              <span>{label}</span>
            </label>
            {selected && (
              <label className="student-profile-device-count">
                Quants?
                <input
                  inputMode="numeric"
                  max="20"
                  min="1"
                  onChange={(event) => onChange(countKey, Number(event.target.value))}
                  type="number"
                  value={count}
                />
              </label>
            )}
          </article>
        )
      })}
    </div>
  )
}

function formatHomeDevices(answers) {
  if (answers.homeDeviceAccess === 'no') return 'No en disposo'
  return HOME_DEVICE_TYPES
    .map(({ countKey, label }) => Number(answers[countKey] || 0) > 0 ? `${label}: ${answers[countKey]}` : '')
    .filter(Boolean)
    .join(' · ')
}

function Question({ children, hint, required, title }) {
  return (
    <section className="student-profile-question">
      <header>
        <h3>
          {title} {required && <span aria-label="Pregunta obligatòria">*</span>}
        </h3>
        {hint && <p>{hint}</p>}
      </header>
      {children}
    </section>
  )
}

function ReviewValue({ label, value }) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null
  return (
    <article>
      <span>{label}</span>
      <strong>{Array.isArray(value) ? value.join(', ') : value}</strong>
    </article>
  )
}

function getStepError(step, answers, selectedStudentId, identityConfirmed) {
  if (step === 0 && (!selectedStudentId || !identityConfirmed)) return 'Confirma quin alumne ets per continuar.'
  if (step === 1) return getStudentProfilePersonalStepError(answers)
  if (
    step === 2 &&
    (answers.householdMembers.length === 0 ||
      answers.familyLanguages.length === 0 ||
      !answers.familySituation)
  ) {
    return 'Completa les preguntes principals sobre la família i les llengües.'
  }
  if (
    step === 3 &&
    (!answers.healthSituation || !answers.medicalPlan || answers.currentSupports.length === 0)
  ) {
    return 'Completa les tres preguntes principals de salut i seguiments.'
  }
  if (
    step === 4 &&
    (!answers.previousSchool ||
      !answers.repeatedCourse ||
      !answers.previousSchoolSupport ||
      !answers.hasExtracurriculars ||
      !answers.hasReinforcement ||
      !answers.homeDeviceAccess ||
      (answers.homeDeviceAccess === 'yes' &&
        answers.homeMobileCount + answers.homeTabletCount + answers.homeComputerCount < 1))
  ) {
    return 'Completa les preguntes principals sobre la trajectòria i les activitats.'
  }
  if (
    step === 5 &&
    (answers.learningHelps.length === 0 || !answers.helpSeeking || answers.workPreferences.length === 0)
  ) {
    return 'Completa les preguntes principals sobre com aprens i treballes.'
  }
  return ''
}

export function StudentProfilePublicForm({ editResponse = null, editSurvey = null, onCancelEdit, onSaveEdit, surveyId }) {
  const isTutorEdit = Boolean(editResponse && editSurvey && onSaveEdit)
  const screenRef = useRef(null)
  const [survey, setSurvey] = useState(editSurvey)
  const [status, setStatus] = useState(isTutorEdit ? 'ready' : 'loading')
  const [message, setMessage] = useState('')
  const [step, setStep] = useState(isTutorEdit ? 1 : 0)
  const [selectedStudentId, setSelectedStudentId] = useState(editResponse?.studentId || '')
  const [identityConfirmed, setIdentityConfirmed] = useState(isTutorEdit)
  const [privacyNoticeRead, setPrivacyNoticeRead] = useState(isTutorEdit)
  const [answers, setAnswers] = useState(() =>
    isTutorEdit ? normalizeStudentProfileAnswers(editResponse.answers) : createEmptyStudentProfileAnswers(),
  )
  const [pendingDraft, setPendingDraft] = useState(null)

  useEffect(() => {
    if (isTutorEdit) return undefined
    let cancelled = false
    loadPublicStudentProfileSurvey(surveyId)
      .then((loadedSurvey) => {
        if (cancelled) return
        setSurvey(loadedSurvey)
        setPendingDraft(readStoredDraft(loadedSurvey))
        setStatus('ready')
      })
      .catch((error) => {
        if (cancelled) return
        setMessage(error.message || 'No s’ha pogut carregar el formulari tutorial.')
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [isTutorEdit, surveyId])

  const selectedStudent = useMemo(
    () => survey?.studentOptions?.find((student) => student.id === selectedStudentId),
    [selectedStudentId, survey],
  )
  const setAnswer = (key, value) => setAnswers((current) => ({ ...current, [key]: value }))
  const scrollToFormTop = () => {
    const modalBody = screenRef.current?.closest('.modal-body')
    if (modalBody) modalBody.scrollTo({ behavior: 'smooth', top: 0 })
    else window.scrollTo({ behavior: 'smooth', top: 0 })
  }

  useEffect(() => {
    if (isTutorEdit || status !== 'ready' || !survey || !selectedStudentId || !identityConfirmed) return undefined
    const timeoutId = window.setTimeout(() => {
      try {
        window.localStorage.setItem(getDraftStorageKey(survey.id), JSON.stringify({
          answers,
          expiresAtEpochMs: survey.expiresAtEpochMs,
          formVersion: survey.formVersion,
          savedAt: new Date().toISOString(),
          step,
          studentId: selectedStudentId,
          surveyId: survey.id,
        }))
      } catch {
        // No bloquegem l'alumne si el navegador no permet desar l'esborrany.
      }
    }, 350)
    return () => window.clearTimeout(timeoutId)
  }, [answers, identityConfirmed, isTutorEdit, selectedStudentId, status, step, survey])

  const handleResumeDraft = () => {
    if (!pendingDraft) return
    setAnswers(normalizeStudentProfileAnswers(pendingDraft.answers))
    setSelectedStudentId(pendingDraft.studentId)
    setIdentityConfirmed(true)
    setPrivacyNoticeRead(false)
    setStep(Math.max(0, Math.min(STEPS.length - 1, Number(pendingDraft.step) || 0)))
    setMessage('Esborrany recuperat. Revisa les dades abans d’enviar.')
    setPendingDraft(null)
    scrollToFormTop()
  }

  const handleDiscardDraft = () => {
    removeStoredDraft(surveyId)
    setPendingDraft(null)
    setMessage('Esborrany eliminat d’aquest dispositiu.')
  }

  const handleNext = () => {
    const error = getStepError(step, answers, selectedStudentId, identityConfirmed)
    if (error) {
      setMessage(error)
      return
    }
    setMessage('')
    setStep((current) => Math.min(STEPS.length - 1, current + 1))
    scrollToFormTop()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!selectedStudent || (!isTutorEdit && !privacyNoticeRead)) {
      setMessage('Confirma que has llegit com s’utilitzaran les dades abans d’enviar.')
      return
    }
    if (!window.confirm(isTutorEdit ? `Desar els canvis de la fitxa de ${selectedStudent.name}?` : `Enviar aquesta fitxa com a ${selectedStudent.name}?`)) return

    setStatus('submitting')
    setMessage('')
    try {
      if (isTutorEdit) {
        await onSaveEdit(normalizeStudentProfileAnswers(answers))
        setStatus('ready')
        return
      }
      await submitStudentProfileSurveyResponse({
        answers: normalizeStudentProfileAnswers(answers),
        privacyNoticeAcknowledged: privacyNoticeRead,
        studentId: selectedStudent.id,
        surveyId,
      })
      removeStoredDraft(surveyId)
      setPendingDraft(null)
      setStatus('submitted')
    } catch (error) {
      const text = String(error.message || '')
      if (isTutorEdit) {
        setMessage(text || 'No s’han pogut desar els canvis.')
        setStatus('ready')
        return
      }
      if (text.includes('resource-exhausted') || text.toLowerCase().includes('quota')) {
        setMessage('Firebase ha arribat al límit diari d’escriptures i ara no pot registrar cap resposta. L’esborrany continua desat en aquest dispositiu; torna-ho a provar quan es reiniciï la quota.')
      } else if (text.includes('permission') || text.includes('already-exists')) {
        try {
          await loadPublicStudentProfileSurvey(surveyId)
          setMessage('No s’ha pogut registrar la resposta. L’esborrany continua desat en aquest dispositiu; actualitza la pàgina i torna-ho a provar una vegada.')
        } catch {
          setMessage('El formulari s’ha tancat abans de poder enviar la resposta. L’esborrany continua desat en aquest dispositiu; demana al tutor o tutora que el reobri.')
        }
      } else {
        setMessage(text || 'No s’ha pogut enviar la resposta. Torna-ho a provar.')
      }
      setStatus('ready')
    }
  }

  if (status === 'loading') {
    return (
      <main className="public-student-profile-screen">
        <section className="public-student-profile-state">
          <Loader2 className="spin-icon" size={36} />
          <p>Carregant la fitxa tutorial...</p>
        </section>
      </main>
    )
  }

  if (status === 'error') {
    return (
      <main className="public-student-profile-screen">
        <section className="public-student-profile-state error">
          <AlertCircle size={36} />
          <h1>Formulari no disponible</h1>
          <p>{message}</p>
        </section>
      </main>
    )
  }

  if (status === 'submitted') {
    return (
      <main className="public-student-profile-screen">
        <section className="public-student-profile-state success">
          <CheckCircle2 size={40} />
          <h1>Fitxa enviada</h1>
          <p>La teva resposta ha quedat registrada. Gràcies, {selectedStudent?.name}.</p>
        </section>
      </main>
    )
  }

  return (
    <main className={`public-student-profile-screen${isTutorEdit ? ' tutor-edit' : ''}`} ref={screenRef}>
      <form className="public-student-profile-form" onSubmit={handleSubmit}>
        <header className="public-student-profile-header">
          <span><ClipboardList size={29} /></span>
          <div>
            <p>{isTutorEdit ? 'Edició tutorial autoritzada' : 'Avaluapro · fitxa tutorial'}</p>
            <h1>{isTutorEdit ? editResponse.studentName : survey?.className || 'Grup classe'}</h1>
            <small>{isTutorEdit ? 'En desar, la fitxa tornarà a quedar pendent de revisió.' : 'La informació servirà perquè els tutors et puguin acompanyar millor.'}</small>
          </div>
        </header>

        <nav aria-label="Progrés del formulari" className="student-profile-progress">
          {STEPS.map((item, index) => (isTutorEdit && index === 0 ? null : (
            <span className={index === step ? 'active' : index < step ? 'complete' : ''} key={item.id}>
              <b>{isTutorEdit ? index : index + 1}</b>
              {item.label}
            </span>
          )))}
        </nav>

        {step === 0 && (
          <section className="student-profile-step identity-step">
            <div className="student-profile-step-heading">
              <UserRoundCheck size={27} />
              <div>
                <h2>Qui ets?</h2>
                <p>Busca el teu nom i clica-hi. Revisa’l bé abans de continuar.</p>
              </div>
            </div>
            {pendingDraft && (
              <aside className="student-profile-draft-recovery">
                <div>
                  <strong>Hi ha una fitxa començada en aquest dispositiu</strong>
                  <span>Correspon a {survey.studentOptions.find((student) => student.id === pendingDraft.studentId)?.name}. Només continua si ets aquesta persona.</span>
                </div>
                <div>
                  <button className="primary-action compact" onClick={handleResumeDraft} type="button">Continuar l’esborrany</button>
                  <button className="secondary-action compact" onClick={handleDiscardDraft} type="button">Eliminar-lo</button>
                </div>
              </aside>
            )}
            <div className="student-profile-name-grid">
              {survey.studentOptions.map((student, index) => (
                <button
                  className={selectedStudentId === student.id ? 'selected' : ''}
                  key={student.id}
                  onClick={() => {
                    setSelectedStudentId(student.id)
                    setIdentityConfirmed(false)
                    setMessage('')
                  }}
                  type="button"
                >
                  <span className={`tone-${index % 6}`}>{getInitials(student.name)}</span>
                  <strong>{student.name}</strong>
                </button>
              ))}
            </div>
            {selectedStudent && (
              <label className="student-profile-identity-confirmation">
                <input
                  checked={identityConfirmed}
                  onChange={(event) => setIdentityConfirmed(event.target.checked)}
                  type="checkbox"
                />
                <span>Confirmo que soc <strong>{selectedStudent.name}</strong>.</span>
              </label>
            )}
          </section>
        )}

        {step === 1 && (
          <section className="student-profile-step">
            <div className="student-profile-step-heading">
              <UserRoundCheck size={27} />
              <div><h2>Dades personals i responsables</h2><p>Els camps amb * són necessaris.</p></div>
            </div>
            <div className="student-profile-fields two-columns">
              <label>Data de naixement *<input onChange={(e) => setAnswer('birthDate', e.target.value)} type="date" value={answers.birthDate} /></label>
              <label>Lloc de naixement *<input maxLength={160} onChange={(e) => setAnswer('birthPlace', e.target.value)} value={answers.birthPlace} /></label>
              <label className="full-width">Adreça *<input maxLength={240} onChange={(e) => setAnswer('address', e.target.value)} value={answers.address} /></label>
              <label className="full-width">Segona adreça, si en tens<input maxLength={240} onChange={(e) => setAnswer('address2', e.target.value)} value={answers.address2} /></label>
              <label>Parròquia *<select onChange={(e) => setAnswer('parish', e.target.value)} value={answers.parish}><option value="">Tria una opció</option>{PARISH_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></label>
              {answers.parish === 'Altres' && <label>Una altra parròquia o lloc<input maxLength={120} onChange={(e) => setAnswer('parishOther', e.target.value)} value={answers.parishOther} /></label>}
              <label>Telèfon de casa, si en tens<input maxLength={40} onChange={(e) => setAnswer('homePhone', e.target.value)} value={answers.homePhone} /></label>
            </div>

            <div className="student-profile-guardian-grid">
              {[1, 2].map((number) => {
                const prefix = `guardian${number}`
                return (
                  <article key={prefix}>
                    <h3>{number === 1 ? 'Primer responsable *' : 'Segon responsable, si n’hi ha'}</h3>
                    {number === 2 && <p>Si l’afegeixes, completa els camps amb *.</p>}
                    <label>Nom i cognoms *<input maxLength={160} onChange={(e) => setAnswer(`${prefix}Name`, e.target.value)} value={answers[`${prefix}Name`]} /></label>
                    <label>Vincle amb tu *<select onChange={(e) => setAnswer(`${prefix}Relationship`, e.target.value)} value={answers[`${prefix}Relationship`]}><option value="">Tria una opció</option>{RELATIONSHIP_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></label>
                    <label>Telèfon *<input maxLength={40} onChange={(e) => setAnswer(`${prefix}Phone`, e.target.value)} value={answers[`${prefix}Phone`]} /></label>
                    <label>Professió *<input maxLength={160} onChange={(e) => setAnswer(`${prefix}Profession`, e.target.value)} value={answers[`${prefix}Profession`]} /></label>
                    <label>Lloc de treball, opcional<input maxLength={160} onChange={(e) => setAnswer(`${prefix}Workplace`, e.target.value)} value={answers[`${prefix}Workplace`]} /></label>
                  </article>
                )
              })}
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="student-profile-step">
            <div className="student-profile-step-heading"><HeartHandshake size={27} /><div><h2>Família i llengües</h2><p>Pots indicar que prefereixes parlar d’un tema personalment.</p></div></div>
            <Question title="Quants germans o germanes tens?" required>
              <select onChange={(e) => setAnswer('siblingCount', e.target.value)} value={answers.siblingCount}>{['0','1','2','3','4','5','6','7','8 o més'].map((option) => <option key={option}>{option}</option>)}</select>
            </Question>
            {answers.siblingCount !== '0' && <Question title="Si vols, indica el nom i l’edat dels teus germans o germanes"><textarea maxLength={600} onChange={(e) => setAnswer('siblingsDetails', e.target.value)} value={answers.siblingsDetails} /></Question>}
            <Question title="Amb quines persones vius habitualment?" required><CheckboxCards onChange={(value) => setAnswer('householdMembers', value)} options={HOUSEHOLD_OPTIONS} value={answers.householdMembers} /></Question>
            {answers.householdMembers.includes('Altres persones') && <label className="student-profile-inline-detail">Vols concretar-ho?<input maxLength={240} onChange={(e) => setAnswer('householdOther', e.target.value)} value={answers.householdOther} /></label>}
            <Question title="Quines llengües utilitzeu habitualment a casa?" required><CheckboxCards onChange={(value) => setAnswer('familyLanguages', value)} options={FAMILY_LANGUAGE_OPTIONS} value={answers.familyLanguages} /></Question>
            {answers.familyLanguages.includes('Altres') && <label className="student-profile-inline-detail">Quina altra llengua?<input maxLength={160} onChange={(e) => setAnswer('familyLanguageOther', e.target.value)} value={answers.familyLanguageOther} /></label>}
            <Question title="Hi ha alguna situació familiar que consideris important que el tutor o tutora conegui?" required>
              <ChoiceCards name="familySituation" onChange={(value) => setAnswer('familySituation', value)} options={[{value:'none',label:'No'},{value:'explain',label:'Sí, ho explicaré aquí'},{value:'talk',label:'Prefereixo parlar-ne personalment'}]} value={answers.familySituation} />
            </Question>
            {answers.familySituation === 'explain' && <label className="student-profile-inline-detail">Què voldries explicar?<textarea maxLength={1200} onChange={(e) => setAnswer('familySituationDetails', e.target.value)} value={answers.familySituationDetails} /></label>}
          </section>
        )}

        {step === 3 && (
          <section className="student-profile-step">
            <div className="student-profile-step-heading"><LockKeyhole size={27} /><div><h2>Salut, benestar i seguiments</h2><p>Aquesta informació només serà visible per als tutors autoritzats.</p></div></div>
            <Question title="Tens alguna al·lèrgia o situació de salut que el centre hagi de tenir en compte?" required><ChoiceCards name="healthSituation" onChange={(value) => setAnswer('healthSituation', value)} options={[{value:'no',label:'No'},{value:'yes',label:'Sí'},{value:'talk',label:'Prefereixo parlar-ne personalment'}]} value={answers.healthSituation} /></Question>
            {answers.healthSituation === 'yes' && <label className="student-profile-inline-detail">Explica breument què hauríem de tenir en compte<textarea maxLength={1200} onChange={(e) => setAnswer('healthDetails', e.target.value)} value={answers.healthDetails} /></label>}
            <Question title="Tens alguna pauta mèdica, medicació o informe vigent que el centre hagi de conèixer?" required><ChoiceCards name="medicalPlan" onChange={(value) => setAnswer('medicalPlan', value)} options={[{value:'no',label:'No'},{value:'yes',label:'Sí'},{value:'unknown',label:'No ho sé'}]} value={answers.medicalPlan} /></Question>
            {answers.medicalPlan === 'yes' && <label className="student-profile-inline-detail">Què hauria de saber el tutor o tutora?<textarea maxLength={1200} onChange={(e) => setAnswer('medicalPlanDetails', e.target.value)} value={answers.medicalPlanDetails} /></label>}
            <Question title="Actualment reps algun suport o seguiment dins o fora de l’escola?" required><CheckboxCards exclusive={['Cap','Prefereixo no respondre']} onChange={(value) => setAnswer('currentSupports', value)} options={CURRENT_SUPPORT_OPTIONS} value={answers.currentSupports} /></Question>
            {answers.currentSupports.includes('Un altre suport') && <label className="student-profile-inline-detail">Quin altre suport?<input maxLength={300} onChange={(e) => setAnswer('currentSupportOther', e.target.value)} value={answers.currentSupportOther} /></label>}
          </section>
        )}

        {step === 4 && (
          <section className="student-profile-step">
            <div className="student-profile-step-heading"><ClipboardList size={27} /><div><h2>Trajectòria i activitats</h2><p>Ens ajuda a entendre la teva experiència escolar i la dedicació setmanal.</p></div></div>
            <Question title="A quina escola estudiaves abans d’arribar aquí?" required><ChoiceCards name="previousSchool" onChange={(value) => setAnswer('previousSchool', value)} options={SCHOOL_OPTIONS} value={answers.previousSchool} /></Question>
            {answers.previousSchool === 'Una altra escola' && <label className="student-profile-inline-detail">Quina escola?<input maxLength={240} onChange={(e) => setAnswer('previousSchoolOther', e.target.value)} value={answers.previousSchoolOther} /></label>}
            <Question title="Has repetit algun curs?" required><ChoiceCards name="repeatedCourse" onChange={(value) => setAnswer('repeatedCourse', value)} options={[{value:'no',label:'No'},{value:'yes',label:'Sí'}]} value={answers.repeatedCourse} /></Question>
            {answers.repeatedCourse === 'yes' && <label className="student-profile-inline-detail">Quin curs o cursos?<input maxLength={240} onChange={(e) => setAnswer('repeatedCourseDetails', e.target.value)} value={answers.repeatedCourseDetails} /></label>}
            <Question title="Has rebut algun tipus de suport a l’escola?" required><ChoiceCards name="previousSchoolSupport" onChange={(value) => setAnswer('previousSchoolSupport', value)} options={[{value:'no',label:'No'},{value:'yes',label:'Sí'},{value:'unknown',label:'No ho sé'}]} value={answers.previousSchoolSupport} /></Question>
            {answers.previousSchoolSupport === 'yes' && <><CheckboxCards onChange={(value) => setAnswer('schoolSupportTypes', value)} options={SCHOOL_SUPPORT_OPTIONS} value={answers.schoolSupportTypes} />{answers.schoolSupportTypes.includes('Un altre suport') && <label className="student-profile-inline-detail">Quin altre suport?<input maxLength={300} onChange={(e) => setAnswer('schoolSupportOther', e.target.value)} value={answers.schoolSupportOther} /></label>}</>}
            <Question title="Fas alguna activitat extraescolar?" required><ChoiceCards name="hasExtracurriculars" onChange={(value) => { setAnswer('hasExtracurriculars', value); if (value === 'no') setAnswer('extracurricularActivities', []) }} options={[{value:'no',label:'No'},{value:'yes',label:'Sí'}]} value={answers.hasExtracurriculars} /></Question>
            {answers.hasExtracurriculars === 'yes' && <ActivityRows addLabel="Afegir una activitat" onChange={(value) => setAnswer('extracurricularActivities', value)} value={answers.extracurricularActivities} />}
            <Question title="Fas reforç escolar?" required><ChoiceCards name="hasReinforcement" onChange={(value) => { setAnswer('hasReinforcement', value); if (value === 'no') setAnswer('reinforcementActivities', []) }} options={[{value:'no',label:'No'},{value:'yes',label:'Sí'}]} value={answers.hasReinforcement} /></Question>
            {answers.hasReinforcement === 'yes' && <ActivityRows addLabel="Afegir un reforç" onChange={(value) => setAnswer('reinforcementActivities', value)} value={answers.reinforcementActivities} />}
            <Question hint="Marca els tipus que pots utilitzar i indica quants n’hi ha de cada tipus." required title="Tens a casa algun dispositiu electrònic que puguis utilitzar per estudiar, fer deures o fer feina de l’escola?">
              <ChoiceCards
                name="homeDeviceAccess"
                onChange={(value) => {
                  setAnswer('homeDeviceAccess', value)
                  if (value === 'no') {
                    setAnswer('homeMobileCount', 0)
                    setAnswer('homeTabletCount', 0)
                    setAnswer('homeComputerCount', 0)
                  }
                }}
                options={[{value:'no',label:'No'},{value:'yes',label:'Sí'}]}
                value={answers.homeDeviceAccess}
              />
              {answers.homeDeviceAccess === 'yes' && <HomeDeviceRows answers={answers} onChange={setAnswer} />}
            </Question>
            <Question title="A l’hora del pati, què t’agrada fer?"><CheckboxCards onChange={(value) => setAnswer('breakPreferences', value)} options={BREAK_PREFERENCE_OPTIONS} value={answers.breakPreferences} /></Question>
            {answers.breakPreferences.includes('Una altra activitat') && <label className="student-profile-inline-detail">Què més t’agrada fer?<input maxLength={240} onChange={(e) => setAnswer('breakPreferenceOther', e.target.value)} value={answers.breakPreferenceOther} /></label>}
            <Question hint="Pots marcar més d’una persona. Aquesta resposta només la veuran els tutors autoritzats." title="Amb quins companys o companyes de la classe tens més amistat o confiança?">
              <CheckboxCards
                onChange={(value) => setAnswer('classFriendIds', value)}
                options={survey.studentOptions.filter((student) => student.id !== selectedStudentId).map((student) => ({ label: student.name, value: student.id }))}
                value={answers.classFriendIds}
              />
            </Question>
            <Question hint="Pots posar noms i, si ho saps, el curs o la classe. També pots deixar-ho en blanc." title="Tens amics o amigues en altres classes del centre? Qui són?">
              <textarea maxLength={1000} onChange={(e) => setAnswer('schoolFriends', e.target.value)} value={answers.schoolFriends} />
            </Question>
          </section>
        )}

        {step === 5 && (
          <section className="student-profile-step">
            <div className="student-profile-step-heading"><Info size={27} /><div><h2>Com aprenc i què necessito</h2><p>No hi ha respostes bones o dolentes: tria el que et representa.</p></div></div>
            <Question title="Quines coses t’ajuden a aprendre?" required><CheckboxCards onChange={(value) => setAnswer('learningHelps', value)} options={LEARNING_HELP_OPTIONS} value={answers.learningHelps} /></Question>
            {answers.learningHelps.includes('Una altra cosa') && <label className="student-profile-inline-detail">Quina altra cosa t’ajuda?<input maxLength={400} onChange={(e) => setAnswer('learningHelpOther', e.target.value)} value={answers.learningHelpOther} /></label>}
            <Question title="Com prefereixes treballar?" required><CheckboxCards onChange={(value) => setAnswer('workPreferences', value)} options={WORK_PREFERENCE_OPTIONS} value={answers.workPreferences} /></Question>
            <Question title="Quan no entens alguna cosa, què acostumes a fer?" required><ChoiceCards name="helpSeeking" onChange={(value) => setAnswer('helpSeeking', value)} options={HELP_SEEKING_OPTIONS} value={answers.helpSeeking} /></Question>
            <Question title="Què acostuma a costar-te més quan aprens?"><textarea maxLength={1200} onChange={(e) => setAnswer('learningChallenges', e.target.value)} value={answers.learningChallenges} /></Question>
            <Question title="Què esperes del teu tutor o tutora aquest curs?"><textarea maxLength={1200} onChange={(e) => setAnswer('tutorExpectations', e.target.value)} value={answers.tutorExpectations} /></Question>
            <Question title="Hi ha alguna cosa més que t’agradaria que el tutor o tutora sabés de tu?"><textarea maxLength={1600} onChange={(e) => setAnswer('studentMessage', e.target.value)} value={answers.studentMessage} /></Question>
          </section>
        )}

        {step === 6 && (
          <section className="student-profile-step review-step">
            <div className="student-profile-step-heading"><CheckCircle2 size={27} /><div><h2>Revisa abans d’enviar</h2><p>La resposta quedarà assignada a {selectedStudent?.name}.</p></div></div>
            <div className="student-profile-review-grid">
              <ReviewValue label="Alumne" value={selectedStudent?.name} />
              <ReviewValue label="Primer responsable" value={[answers.guardian1Name, answers.guardian1Phone].filter(Boolean).join(' · ')} />
              <ReviewValue label="Segon responsable" value={[answers.guardian2Name, answers.guardian2Phone].filter(Boolean).join(' · ')} />
              <ReviewValue label="Llengües familiars" value={answers.familyLanguages} />
              <ReviewValue label="Escola anterior" value={answers.previousSchoolOther || answers.previousSchool} />
              <ReviewValue label="Dispositius per estudiar a casa" value={formatHomeDevices(answers)} />
              <ReviewValue label="Amistats a classe" value={answers.classFriendIds.map((friendId) => survey.studentOptions.find((student) => student.id === friendId)?.name).filter(Boolean)} />
              <ReviewValue label="Amistats al centre" value={answers.schoolFriends} />
              <ReviewValue label="Què m’ajuda a aprendre" value={answers.learningHelps} />
              <ReviewValue label="Missatge per al tutor" value={answers.studentMessage} />
            </div>
            {!isTutorEdit && <section className="student-profile-privacy-notice">
              <LockKeyhole size={23} />
              <div>
                <h3>Com s’utilitzarà aquesta informació?</h3>
                <p>La veuran els tutors autoritzats d’aquesta tutoria per conèixer-te millor i fer el seguiment educatiu. No es mostrarà als companys ni s’utilitzarà per posar-te una nota.</p>
                <label><input checked={privacyNoticeRead} onChange={(e) => setPrivacyNoticeRead(e.target.checked)} type="checkbox" /><span>He llegit i entenc com s’utilitzarà aquesta informació.</span></label>
              </div>
            </section>}
          </section>
        )}

        {message && <div className="student-profile-form-message"><AlertCircle size={18} />{message}</div>}

        {!isTutorEdit && selectedStudentId && identityConfirmed && status === 'ready' && (
          <div className="student-profile-draft-status">
            <CheckCircle2 size={17} />
            <span>Les respostes es desen automàticament en aquest dispositiu fins que enviïs la fitxa.</span>
            <button onClick={handleDiscardDraft} type="button">Esborrar l’esborrany</button>
          </div>
        )}

        <footer className="student-profile-form-actions">
          {isTutorEdit && <button className="secondary-action" onClick={onCancelEdit} type="button">Cancel·lar</button>}
          {step > (isTutorEdit ? 1 : 0) && <button className="secondary-action" onClick={() => { setStep((current) => current - 1); setMessage(''); scrollToFormTop() }} type="button"><ArrowLeft size={17} />Anterior</button>}
          {step < STEPS.length - 1 ? <button className="primary-action" onClick={handleNext} type="button">Continuar<ArrowRight size={17} /></button> : <button className="primary-action" disabled={status === 'submitting'} type="submit">{status === 'submitting' ? <Loader2 className="spin-icon" size={17} /> : <Send size={17} />}{isTutorEdit ? 'Desar els canvis' : 'Enviar la fitxa'}</button>}
        </footer>
      </form>
    </main>
  )
}
