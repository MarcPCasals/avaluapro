import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  Check,
  Clipboard,
  ClipboardList,
  ExternalLink,
  Eye,
  Loader2,
  MonitorSmartphone,
  Lock,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserRoundCheck,
  UsersRound,
} from 'lucide-react'
import { Modal } from '../../components/Modal'
import {
  createStudentProfileSurveyDocument,
  deleteStudentProfileSurveyDocument,
  deleteStudentProfileSurveyResponse,
  listStudentProfileSurveyResponses,
  listStudentProfileSurveysForUser,
  markStudentProfileResponseReviewed,
  subscribeToStudentProfileSurveyResponses,
  updateStudentProfileSurveyStatus,
} from '../../lib/firebase'
import {
  STUDENT_PROFILE_FORM_VERSION,
  STUDENT_PROFILE_PRIVACY_NOTICE_VERSION,
  buildStudentProfileClassPortrait,
  getStudentProfilePriorityFlags,
} from './studentProfileQuestionnaire'

const SURVEY_DURATION_MS = 7 * 24 * 60 * 60 * 1000

const ANSWER_GROUPS = [
  {
    title: 'Dades personals',
    fields: [
      ['birthDate', 'Data de naixement'], ['birthPlace', 'Lloc de naixement'], ['address', 'Adreça'],
      ['parish', 'Parròquia'], ['parishOther', 'Un altre lloc'], ['homePhone', 'Telèfon de casa'],
    ],
  },
  {
    title: 'Responsables',
    fields: [
      ['guardian1Name', 'Responsable principal'], ['guardian1Relationship', 'Vincle'],
      ['guardian1Phone', 'Telèfon principal'], ['guardian1Profession', 'Professió'],
      ['guardian1Workplace', 'Lloc de treball'], ['guardian2Name', 'Segon responsable'],
      ['guardian2Relationship', 'Vincle del segon responsable'], ['guardian2Phone', 'Segon telèfon'],
      ['guardian2Profession', 'Professió del segon responsable'], ['guardian2Workplace', 'Segon lloc de treball'],
    ],
  },
  {
    title: 'Família i llengües',
    fields: [
      ['siblingCount', 'Nombre de germans/es'], ['siblingsDetails', 'Germans/es'],
      ['householdMembers', 'Amb qui viu'], ['householdOther', 'Altres persones'],
      ['familyLanguages', 'Llengües familiars'], ['familyLanguageOther', 'Una altra llengua'],
      ['familySituation', 'Situació familiar'], ['familySituationDetails', 'Explicació'],
    ],
  },
  {
    title: 'Salut, benestar i seguiments',
    fields: [
      ['healthSituation', 'Situació de salut'], ['healthDetails', 'Detall de salut'],
      ['medicalPlan', 'Pauta, medicació o informe'], ['medicalPlanDetails', 'Detall de la pauta'],
      ['currentSupports', 'Suports o seguiments actuals'], ['currentSupportOther', 'Un altre suport'],
    ],
  },
  {
    title: 'Trajectòria i activitats',
    fields: [
      ['previousSchool', 'Escola anterior'], ['previousSchoolOther', 'Una altra escola'],
      ['repeatedCourse', 'Ha repetit curs'], ['repeatedCourseDetails', 'Curs repetit'],
      ['previousSchoolSupport', 'Ha rebut suport escolar'], ['schoolSupportTypes', 'Tipus de suport'],
      ['schoolSupportOther', 'Un altre suport escolar'], ['extracurricularActivities', 'Activitats extraescolars'],
      ['reinforcementActivities', 'Reforç escolar'], ['breakPreferences', 'Preferències al pati'],
      ['homeDeviceAccess', 'Dispositius per estudiar a casa'], ['homeMobileCount', 'Mòbils disponibles'],
      ['homeTabletCount', 'iPads o tauletes disponibles'], ['homeComputerCount', 'Ordinadors disponibles'],
      ['breakPreferenceOther', 'Una altra preferència'], ['classFriendIds', 'Amistats a classe'],
      ['schoolFriends', 'Amistats en altres classes del centre'],
    ],
  },
  {
    title: 'Aprenentatge i veu de l’alumne',
    fields: [
      ['learningHelps', 'Què l’ajuda a aprendre'], ['learningHelpOther', 'Una altra ajuda'],
      ['workPreferences', 'Com prefereix treballar'], ['helpSeeking', 'Què fa quan no entén alguna cosa'],
      ['learningChallenges', 'Què li costa més'], ['tutorExpectations', 'Què espera del tutor/a'],
      ['studentMessage', 'Missatge per al tutor/a'],
    ],
  },
]

const ANSWER_LABELS = {
  no: 'No',
  yes: 'Sí',
  unknown: 'No ho sap',
  none: 'No indica cap situació',
  explain: 'Vol explicar una situació',
  talk: 'Prefereix parlar-ne personalment',
}

function getAcademicYear(date = new Date()) {
  const year = date.getFullYear()
  const startYear = date.getMonth() >= 7 ? year : year - 1
  return `${startYear}-${startYear + 1}`
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('ca-AD', { dateStyle: 'medium' }).format(date)
}

function formatAnswer(value, studentNamesById = {}) {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'number' && value === 0) return ''
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (entry && typeof entry === 'object') {
          return [entry.activity, entry.hours ? `${entry.hours} h/setmana` : ''].filter(Boolean).join(' · ')
        }
        return studentNamesById[entry] || ANSWER_LABELS[entry] || entry
      })
      .filter(Boolean)
      .join(', ')
  }
  return ANSWER_LABELS[value] || String(value)
}

function formatResponseCount(count) {
  return `${count} ${count === 1 ? 'resposta' : 'respostes'}`
}

function PortraitBarChart({ data, multiple = false, tone = 'teal', title }) {
  const visibleRows = [...data.rows]
    .filter((row) => row.count > 0)
    .sort((first, second) => second.count - first.count || first.label.localeCompare(second.label, 'ca'))

  return (
    <article className={`student-profile-portrait-chart tone-${tone}`}>
      <header>
        <h4>{title}</h4>
        <span>{formatResponseCount(data.answeredCount)}</span>
      </header>
      {visibleRows.length === 0 ? (
        <p className="student-profile-portrait-empty">Encara no hi ha respostes per representar.</p>
      ) : (
        <div className="student-profile-portrait-bars">
          {visibleRows.map((row) => (
            <div className="student-profile-portrait-bar" key={row.value}>
              <div><span>{row.label}</span><strong>{row.count} · {row.percentage} %</strong></div>
              <span aria-label={`${row.label}: ${row.percentage} %`} className="student-profile-portrait-track" role="img">
                <span style={{ width: `${row.percentage}%` }} />
              </span>
            </div>
          ))}
        </div>
      )}
      {multiple && data.answeredCount > 0 && <small>Es podien marcar diverses opcions; els percentatges poden sumar més del 100 %.</small>}
    </article>
  )
}

function StudentProfileClassPortrait({ onOpenResponse, responses, totalStudents }) {
  const portrait = useMemo(
    () => buildStudentProfileClassPortrait(responses, totalStudents),
    [responses, totalStudents],
  )
  const attentionResponses = useMemo(
    () => responses
      .map((response) => ({ ...response, priorityFlags: getStudentProfilePriorityFlags(response.answers || {}) }))
      .filter((response) => response.priorityFlags.length > 0),
    [responses],
  )
  const coverageTone = portrait.coverage.percentage < 50 ? 'low' : portrait.coverage.percentage < 80 ? 'medium' : 'high'

  return (
    <section className="student-profile-portrait">
      <header className="student-profile-portrait-heading">
        <div>
          <span className="section-kicker"><BarChart3 size={17} />Retrat inicial de la tutoria</span>
          <h3>Una primera lectura del grup</h3>
          <p>Preferències i condicions declarades per l’alumnat. Són orientacions inicials, no diagnòstics.</p>
        </div>
        <div className={`student-profile-portrait-coverage ${coverageTone}`}>
          <strong>{portrait.coverage.percentage} %</strong>
          <span>{portrait.coverage.responseCount} de {portrait.coverage.totalStudents} fitxes</span>
        </div>
      </header>

      <div className="student-profile-portrait-progress" aria-label={`${portrait.coverage.percentage} % de fitxes rebudes`}>
        <span style={{ width: `${portrait.coverage.percentage}%` }} />
      </div>

      {portrait.coverage.responseCount === 0 ? (
        <div className="student-profile-portrait-no-data">
          <Sparkles size={22} />
          <div><strong>El retrat apareixerà quan arribi la primera fitxa.</strong><span>Els gràfics s’actualitzaran amb les respostes vigents.</span></div>
        </div>
      ) : (
        <>
          {portrait.coverage.percentage < 50 && (
            <div className="student-profile-portrait-warning"><AlertTriangle size={18} />Lectura provisional: encara ha respost menys de la meitat del grup.</div>
          )}
          <div className="student-profile-portrait-section-title">
            <Sparkles size={19} />
            <div><h4>Com aprèn i treballa el grup</h4><p>Dades per variar les explicacions, la pràctica i l’organització de l’aula.</p></div>
          </div>
          <div className="student-profile-portrait-grid featured">
            <PortraitBarChart data={portrait.learningHelps} multiple title="Què ajuda a aprendre" />
            <PortraitBarChart data={portrait.workPreferences} multiple tone="blue" title="Com prefereixen treballar" />
            <PortraitBarChart data={portrait.helpSeeking} tone="amber" title="Què fan quan no entenen alguna cosa" />
          </div>

          <div className="student-profile-portrait-section-title secondary">
            <MonitorSmartphone size={19} />
            <div><h4>Context inicial del grup</h4><p>Procedència, diversitat lingüística i condicions per fer feina digital.</p></div>
          </div>
          <div className="student-profile-portrait-grid">
            <PortraitBarChart data={portrait.devices} tone="violet" title="Dispositius disponibles per estudiar" />
            <PortraitBarChart data={portrait.previousSchools} tone="rose" title="Escola de procedència" />
            <PortraitBarChart data={portrait.familyLanguages} multiple tone="green" title="Llengües habituals a casa" />
          </div>

          <div className="student-profile-portrait-section-title secondary">
            <CalendarClock size={19} />
            <div><h4>Temps fora de l’aula i interessos</h4><p>Activitats, reforç, hores declarades i preferències durant el pati.</p></div>
          </div>
          <div className="student-profile-portrait-grid extended">
            <PortraitBarChart data={portrait.extracurriculars} tone="blue" title="Fan activitats extraescolars" />
            <PortraitBarChart data={portrait.reinforcement} tone="amber" title="Fan reforç escolar" />
            <PortraitBarChart data={portrait.weeklyCommitment} tone="violet" title="Dedicació setmanal indicada" />
            <PortraitBarChart data={portrait.breakPreferences} multiple tone="teal" title="Què els agrada fer al pati" />
          </div>

          <section className="student-profile-private-actions">
            <header>
              <div><Lock size={20} /><div><h4>Atenció tutorial privada</h4><p>Senyals declarats que convé revisar individualment. No formen part dels gràfics del grup.</p></div></div>
              <strong>{attentionResponses.length} {attentionResponses.length === 1 ? 'alumne' : 'alumnes'}</strong>
            </header>
            {attentionResponses.length === 0 ? (
              <div className="student-profile-private-empty"><Check size={18} />No hi ha cap senyal prioritari declarat a les fitxes rebudes.</div>
            ) : (
              <div className="student-profile-private-list">
                {attentionResponses.map((response) => (
                  <article className={response.reviewedAt ? 'reviewed' : ''} key={response.id || response.studentId}>
                    <div>
                      <strong>{response.studentName || 'Alumne'}</strong>
                      <span>{response.reviewedAt ? 'Fitxa revisada' : 'Pendent de revisar'}</span>
                    </div>
                    <div className="student-profile-private-flags">
                      {response.priorityFlags.map((flag) => <span className={flag.tone} key={flag.id}>{flag.label}</span>)}
                    </div>
                    <button className="secondary-action compact" onClick={() => onOpenResponse(response.id)} type="button"><Eye size={16} />Veure fitxa</button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  )
}

function StudentProfileResponseModal({ onClose, onDelete, onReview, response, studentNamesById }) {
  const answers = response.answers || {}
  const flags = getStudentProfilePriorityFlags(answers)
  const [busy, setBusy] = useState('')

  const handleReview = async () => {
    setBusy('review')
    try {
      await onReview(!response.reviewedAt)
    } finally {
      setBusy('')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Eliminar la resposta de ${response.studentName}? L’alumne podrà tornar a respondre.`)) return
    setBusy('delete')
    try {
      await onDelete()
    } finally {
      setBusy('')
    }
  }

  return (
    <Modal onClose={onClose} panelClassName="student-profile-response-modal" size="xl" title={`Fitxa tutorial: ${response.studentName}`}>
      <div className="student-profile-response-meta">
        <span>Declarada per l’alumne</span>
        <span>Enviada {formatDate(response.submittedAt)}</span>
        <strong className={response.reviewedAt ? 'reviewed' : 'pending'}>
          {response.reviewedAt ? `Revisada ${formatDate(response.reviewedAt)}` : 'Pendent de revisar'}
        </strong>
      </div>

      <section className="student-profile-priority-summary">
        <header><ShieldAlert size={21} /><h3>Resum essencial</h3></header>
        <div className="student-profile-priority-flags">
          {flags.length === 0 ? <span className="ok"><Check size={16} />Sense alertes declarades</span> : flags.map((flag) => <span className={flag.tone} key={flag.id}>{flag.label}</span>)}
        </div>
        <div className="student-profile-priority-grid">
          <article><span>Contacte principal</span><strong>{answers.guardian1Name || 'No indicat'}</strong><small>{[answers.guardian1Relationship, answers.guardian1Phone].filter(Boolean).join(' · ')}</small></article>
          <article><span>Llengües familiars</span><strong>{formatAnswer(answers.familyLanguages) || 'No indicades'}</strong></article>
          <article><span>Suports</span><strong>{formatAnswer(answers.currentSupports) || 'No indicats'}</strong><small>{formatAnswer(answers.schoolSupportTypes)}</small></article>
          <article><span>Veu de l’alumne</span><strong>{answers.studentMessage || answers.tutorExpectations || 'Sense missatge afegit'}</strong></article>
        </div>
      </section>

      <div className="student-profile-response-sections">
        {ANSWER_GROUPS.map((group) => {
          const visibleFields = group.fields
            .map(([key, label]) => ({ key, label, value: formatAnswer(answers[key], studentNamesById) }))
            .filter((field) => field.value)
          if (visibleFields.length === 0) return null
          return (
            <section key={group.title}>
              <h3>{group.title}</h3>
              <div>
                {visibleFields.map((field) => <article key={field.key}><span>{field.label}</span><strong>{field.value}</strong></article>)}
              </div>
            </section>
          )
        })}
      </div>

      <div className="modal-actions student-profile-response-actions">
        <button className="primary-action" disabled={busy === 'review'} onClick={handleReview} type="button">
          {busy === 'review' ? <Loader2 className="spin-icon" size={17} /> : response.reviewedAt ? <RotateCcw size={17} /> : <Check size={17} />}
          {response.reviewedAt ? 'Marcar com a pendent' : 'Marcar com a revisada'}
        </button>
        <button className="danger-action" disabled={busy === 'delete'} onClick={handleDelete} type="button">
          {busy === 'delete' ? <Loader2 className="spin-icon" size={17} /> : <Trash2 size={17} />}
          Eliminar resposta
        </button>
        <small>Només els tutors autoritzats de la tutoria poden veure o gestionar aquesta fitxa.</small>
      </div>
    </Modal>
  )
}

export function StudentProfileSurveyPanel({ activeClass, classStudents, cloud }) {
  const [surveys, setSurveys] = useState([])
  const [selectedSurveyId, setSelectedSurveyId] = useState('')
  const [responses, setResponses] = useState([])
  const [selectedResponseId, setSelectedResponseId] = useState('')
  const [busy, setBusy] = useState('')
  const [confirmDeleteSurvey, setConfirmDeleteSurvey] = useState(false)
  const [message, setMessage] = useState('')
  const [nowEpochMs, setNowEpochMs] = useState(() => Date.now())

  const classSurveys = useMemo(
    () => surveys.filter((survey) => survey.classId === activeClass?.id),
    [activeClass?.id, surveys],
  )
  const selectedSurvey = classSurveys.find((survey) => survey.id === selectedSurveyId) || classSurveys[0] || null
  const surveyStudents = selectedSurvey?.studentOptions?.length ? selectedSurvey.studentOptions : classStudents
  const selectedResponse = responses.find((response) => response.id === selectedResponseId) || null
  const responseByStudentId = useMemo(() => {
    const next = new Map(responses.map((response) => [response.studentId, response]))
    const studentsByName = new Map()
    surveyStudents.forEach((student) => {
      const nameKey = String(student.name || '').trim().toLocaleLowerCase('ca')
      if (!nameKey) return
      studentsByName.set(nameKey, studentsByName.has(nameKey) ? null : student)
    })
    responses.forEach((response) => {
      if (next.has(response.studentId)) return
      const nameKey = String(response.studentName || '').trim().toLocaleLowerCase('ca')
      const matchingStudent = studentsByName.get(nameKey)
      if (matchingStudent && !next.has(matchingStudent.id)) next.set(matchingStudent.id, response)
    })
    return next
  }, [responses, surveyStudents])
  const isExpired = selectedSurvey?.expiresAtEpochMs && nowEpochMs >= selectedSurvey.expiresAtEpochMs
  const publicUrl = selectedSurvey
    ? `${window.location.origin}${import.meta.env.BASE_URL}?student-profile=${selectedSurvey.id}`
    : ''

  const refreshSurveys = async () => {
    if (!cloud.user?.uid) return
    const nextSurveys = await listStudentProfileSurveysForUser(cloud.user.uid)
    setNowEpochMs(Date.now())
    setSurveys(nextSurveys)
    const nextClassSurveys = nextSurveys.filter((survey) => survey.classId === activeClass?.id)
    setSelectedSurveyId((current) => nextClassSurveys.some((survey) => survey.id === current) ? current : nextClassSurveys[0]?.id || '')
  }

  const refreshResponses = async (surveyId = selectedSurvey?.id) => {
    if (!surveyId) {
      setResponses([])
      return
    }
    const nextResponses = await listStudentProfileSurveyResponses(surveyId)
    setResponses(nextResponses)
  }

  useEffect(() => {
    let cancelled = false
    if (!cloud.user?.uid) return undefined
    listStudentProfileSurveysForUser(cloud.user.uid)
      .then((nextSurveys) => {
        if (cancelled) return
        setNowEpochMs(Date.now())
        setSurveys(nextSurveys)
        const nextClassSurveys = nextSurveys.filter((survey) => survey.classId === activeClass?.id)
        setSelectedSurveyId((current) => nextClassSurveys.some((survey) => survey.id === current) ? current : nextClassSurveys[0]?.id || '')
      })
      .catch((error) => {
        if (!cancelled) setMessage(error.message || 'No s’han pogut carregar els formularis tutorials.')
      })
    return () => {
      cancelled = true
    }
  }, [activeClass?.id, cloud.user?.uid])

  useEffect(() => {
    if (!selectedSurvey?.id) return undefined
    return subscribeToStudentProfileSurveyResponses(
      selectedSurvey.id,
      setResponses,
      (error) => setMessage(error.message || 'No s’han pogut carregar les respostes.'),
    )
  }, [selectedSurvey?.id])

  const handleCreate = async () => {
    if (!activeClass || classStudents.length === 0 || !cloud.user) return
    setBusy('create')
    setMessage('')
    try {
      const nowDate = new Date()
      const expiresAtEpochMs = nowDate.getTime() + SURVEY_DURATION_MS
      const survey = await createStudentProfileSurveyDocument({
        survey: {
          academicYear: getAcademicYear(nowDate),
          classId: activeClass.id,
          className: activeClass.name,
          createdAt: nowDate.toISOString(),
          expiresAt: new Date(expiresAtEpochMs).toISOString(),
          expiresAtEpochMs,
          formVersion: STUDENT_PROFILE_FORM_VERSION,
          id: `profile_${crypto.randomUUID()}`,
          memberUids: [cloud.user.uid, ...(activeClass.sharedTutoringMemberUids || [])],
          ownerUid: cloud.user.uid,
          privacyNoticeVersion: STUDENT_PROFILE_PRIVACY_NOTICE_VERSION,
          responseCount: 0,
          status: 'active',
          studentOptions: classStudents.map((student) => ({ id: student.id, name: student.name })),
          updatedAt: nowDate.toISOString(),
        },
        user: cloud.user,
      })
      await refreshSurveys()
      setSelectedSurveyId(survey.id)
      setResponses([])
      setMessage('Formulari creat. L’enllaç compartit estarà actiu durant 7 dies.')
    } catch (error) {
      setMessage(error.message || 'No s’ha pogut crear el formulari tutorial.')
    } finally {
      setBusy('')
    }
  }

  const handleToggleStatus = async () => {
    if (!selectedSurvey) return
    setBusy('status')
    try {
      const nextStatus = selectedSurvey.status === 'active' && !isExpired ? 'closed' : 'active'
      const expiresAtEpochMs = nextStatus === 'active' ? Date.now() + SURVEY_DURATION_MS : selectedSurvey.expiresAtEpochMs
      await updateStudentProfileSurveyStatus({
        expiresAt: new Date(expiresAtEpochMs).toISOString(),
        expiresAtEpochMs,
        status: nextStatus,
        surveyId: selectedSurvey.id,
      })
      await refreshSurveys()
      setMessage(nextStatus === 'active' ? 'Formulari reobert durant 7 dies.' : 'Formulari tancat.')
    } catch (error) {
      setMessage(error.message || 'No s’ha pogut canviar l’estat del formulari.')
    } finally {
      setBusy('')
    }
  }

  const handleCopy = async () => {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setMessage('Enllaç compartit copiat.')
    } catch {
      setMessage('No s’ha pogut copiar automàticament. Pots seleccionar l’enllaç i copiar-lo.')
    }
  }

  const handleDeleteSurvey = async () => {
    if (!selectedSurvey || selectedSurvey.ownerUid !== cloud.user?.uid) return
    setBusy('delete-survey')
    try {
      await deleteStudentProfileSurveyDocument({ surveyId: selectedSurvey.id })
      setResponses([])
      setSelectedSurveyId('')
      await refreshSurveys()
      setMessage('Formulari i respostes eliminats.')
    } catch (error) {
      setMessage(error.message || 'No s’ha pogut eliminar el formulari.')
    } finally {
      setBusy('')
      setConfirmDeleteSurvey(false)
    }
  }

  const handleReviewResponse = async (reviewed) => {
    if (!selectedSurvey || !selectedResponse) return
    await markStudentProfileResponseReviewed({
      reviewed,
      studentId: selectedResponse.studentId,
      surveyId: selectedSurvey.id,
      user: cloud.user,
    })
    await refreshResponses(selectedSurvey.id)
    setSelectedResponseId(selectedResponse.id)
  }

  const handleDeleteResponse = async () => {
    if (!selectedSurvey || !selectedResponse) return
    await deleteStudentProfileSurveyResponse({
      studentId: selectedResponse.studentId,
      surveyId: selectedSurvey.id,
    })
    setSelectedResponseId('')
    await refreshResponses(selectedSurvey.id)
    setMessage(`Resposta de ${selectedResponse.studentName} eliminada. Ja pot tornar a respondre.`)
  }

  return (
    <section className="student-profile-survey-panel">
      <header className="student-profile-manager-header">
        <div>
          <span className="section-kicker"><ClipboardList size={17} />Fitxa personal de l’alumnat</span>
          <h2>Formulari tutorial</h2>
          <p>Crea un únic enllaç per al grup. Cada alumne tria el seu nom i la resposta queda vinculada a la seva fitxa.</p>
        </div>
        <button className="primary-action" disabled={!cloud.user || classStudents.length === 0 || busy === 'create'} onClick={handleCreate} type="button">
          {busy === 'create' ? <Loader2 className="spin-icon" size={17} /> : <Plus size={17} />}Crear formulari
        </button>
      </header>

      {message && <div className="student-profile-manager-message"><AlertTriangle size={18} />{message}</div>}

      {classSurveys.length > 0 && (
        <label className="student-profile-survey-selector">
          Historial de formularis
          <select onChange={(event) => setSelectedSurveyId(event.target.value)} value={selectedSurvey?.id || ''}>
            {classSurveys.map((survey) => <option key={survey.id} value={survey.id}>{survey.academicYear} · {formatDate(survey.createdAt)} · {survey.status === 'active' && nowEpochMs < survey.expiresAtEpochMs ? 'Actiu' : 'Tancat'}</option>)}
          </select>
        </label>
      )}

      {!selectedSurvey ? (
        <div className="empty-state student-profile-manager-empty"><ClipboardList size={30} /><strong>Encara no hi ha cap formulari per aquesta tutoria.</strong><span>Quan el creïs, obtindràs un sol enllaç per compartir amb tot el grup.</span></div>
      ) : (
        <>
          <div className="student-profile-survey-status-grid">
            <article><span>Estat</span><strong className={selectedSurvey.status === 'active' && !isExpired ? 'positive' : ''}>{selectedSurvey.status === 'active' && !isExpired ? 'Actiu' : isExpired ? 'Caducat' : 'Tancat'}</strong></article>
            <article><span>Caducitat</span><strong>{formatDate(selectedSurvey.expiresAt)}</strong></article>
            <article><span>Respostes</span><strong>{responses.length}/{surveyStudents.length}</strong></article>
            <article><span>Revisades</span><strong>{responses.filter((response) => response.reviewedAt).length}/{responses.length}</strong></article>
          </div>

          <label className="student-profile-public-link">Enllaç compartit<input readOnly value={publicUrl} /></label>
          <div className="student-profile-manager-actions">
            <button className="primary-action" disabled={!publicUrl || selectedSurvey.status !== 'active' || isExpired} onClick={handleCopy} type="button"><Clipboard size={17} />Copiar enllaç</button>
            <button className="secondary-action" disabled={!publicUrl} onClick={() => window.open(publicUrl, '_blank', 'noopener,noreferrer')} type="button"><ExternalLink size={17} />Obrir formulari</button>
            <button className="secondary-action" disabled={busy === 'responses'} onClick={async () => { setBusy('responses'); try { await refreshResponses() } finally { setBusy('') } }} type="button">{busy === 'responses' ? <Loader2 className="spin-icon" size={17} /> : <RefreshCw size={17} />}Actualitzar</button>
            <button className="secondary-action" disabled={busy === 'status'} onClick={handleToggleStatus} type="button"><Lock size={17} />{selectedSurvey.status === 'active' && !isExpired ? 'Tancar' : 'Reobrir 7 dies'}</button>
            {selectedSurvey.ownerUid === cloud.user?.uid && <button className="danger-action" disabled={busy === 'delete-survey'} onClick={() => setConfirmDeleteSurvey(true)} type="button"><Trash2 size={17} />Eliminar formulari</button>}
          </div>

          <StudentProfileClassPortrait
            onOpenResponse={setSelectedResponseId}
            responses={responses}
            totalStudents={surveyStudents.length}
          />

          <section className="student-profile-response-roster">
            <header><div><UsersRound size={21} /><h3>Estat de les respostes</h3></div><span>{Math.max(0, surveyStudents.length - responses.length)} pendents</span></header>
            <div>
              {surveyStudents.map((student) => {
                const response = responseByStudentId.get(student.id)
                return (
                  <article className={response ? 'submitted' : 'pending'} key={student.id}>
                    <span className="student-profile-roster-icon">{response ? <UserRoundCheck size={19} /> : <CalendarClock size={19} />}</span>
                    <div><strong>{student.name}</strong><small>{response ? `${response.reviewedAt ? 'Revisada' : 'Pendent de revisar'} · ${formatDate(response.submittedAt)}` : 'Encara no ha respost'}</small></div>
                    {response && <button className="secondary-action compact" onClick={() => setSelectedResponseId(response.id)} type="button"><Eye size={16} />Veure fitxa</button>}
                  </article>
                )
              })}
            </div>
          </section>
        </>
      )}

      {selectedResponse && selectedSurvey && (
        <StudentProfileResponseModal
          onClose={() => setSelectedResponseId('')}
          onDelete={handleDeleteResponse}
          onReview={handleReviewResponse}
          response={selectedResponse}
          studentNamesById={Object.fromEntries(selectedSurvey.studentOptions.map((student) => [student.id, student.name]))}
        />
      )}

      {confirmDeleteSurvey && selectedSurvey && (
        <Modal onClose={() => setConfirmDeleteSurvey(false)} size="sm" title="Eliminar aquest formulari?">
          <p>S’eliminaran el formulari i totes les respostes que contingui. Aquesta acció no es pot desfer.</p>
          <div className="modal-actions">
            <button className="secondary-action" disabled={busy === 'delete-survey'} onClick={() => setConfirmDeleteSurvey(false)} type="button">Cancel·lar</button>
            <button className="danger-action" disabled={busy === 'delete-survey'} onClick={handleDeleteSurvey} type="button">
              {busy === 'delete-survey' ? <Loader2 className="spin-icon" size={17} /> : <Trash2 size={17} />}
              Eliminar definitivament
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}
