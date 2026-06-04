import {
  Camera,
  FileClock,
  MessageCircle,
  MessageSquareText,
  Save,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { DIAGNOSIS_LIBRARY } from '../../data/diagnosisLibrary'
import { DIAGNOSIS_OPTIONS } from '../../data/studentAnnotations'
import { getSubjectStructure } from '../../data/subjects'
import {
  getStudentEvaluationScore,
  getStudentRedPointCount,
  getStudentTrackingStats,
} from '../../lib/analytics'
import { calculateGrade, getNumericFromGrade, gradeClassName } from '../../lib/grades'
import { imageFileToCompressedDataUrl } from '../../lib/imageFiles'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'

function formatDate(date) {
  return new Date(date).toLocaleDateString('ca-ES')
}

const antecedentProfiles = [
  { id: 'invisible', label: 'Alumne invisible', description: 'Treballa, però no acaba d’assolir.' },
  { id: 'priority', label: 'Intervenció prioritària', description: 'Cal una mirada inicial clara.' },
  { id: 'ordinary', label: 'Seguiment ordinari', description: 'Sense alarma principal de partida.' },
  { id: 'stable', label: 'Hàbit estable', description: 'Constància i autonomia consolidades.' },
]

const gradeOptions = ['', 'A', 'B', 'C', 'D', 'NA']

const TEXT_LIMITS = {
  diagnosisNotes: 500,
  personalNotes: 700,
  antecedentNotes: 700,
}

const modificationTriggerDiagnoses = new Set(['qi-tdl', 'progress'])

const antecedentProfileLabels = {
  invisible: 'Alumne invisible',
  priority: 'Intervenció prioritària',
  ordinary: 'Seguiment ordinari',
  stable: 'Hàbit estable',
}

function getAntecedentGrade(antecedent) {
  const competencyGrades = Object.values(antecedent?.competencyGrades || {}).filter(Boolean)
  const grades = competencyGrades.length > 0 ? competencyGrades : [antecedent?.lastLookGrade].filter(Boolean)
  return calculateGrade(grades)
}

function getCurrentProfileSnapshot({ evaluation, incidents, redPointCount, tracking }) {
  const riskScore =
    (evaluation.score > 0 && evaluation.score <= 2 ? 1 : 0) +
    (tracking.hasTrackingData && tracking.consistency < 60 ? 1 : 0) +
    (incidents >= 2 || redPointCount >= 3 ? 1 : 0)

  if (evaluation.score > 0 && evaluation.score <= 2 && tracking.hasTrackingData && tracking.consistency >= 60) {
    return {
      id: 'invisible',
      label: 'Alumne invisible',
      text: 'Treballa de manera constant, però el rendiment continua baix.',
      tone: 'student-invisible',
    }
  }

  if (riskScore >= 2) {
    return {
      id: 'priority',
      label: 'Intervenció prioritària',
      text: 'Acumula senyals combinades de risc.',
      tone: 'danger',
    }
  }

  if (tracking.hasTrackingData && tracking.consistency >= 75) {
    return {
      id: 'stable',
      label: 'Hàbit estable',
      text: 'Manté un patró de treball estable.',
      tone: 'stable',
    }
  }

  return {
    id: 'ordinary',
    label: 'Seguiment ordinari',
    text: 'Sense senyals combinades importants.',
    tone: 'neutral',
  }
}

function getAntecedentReading({ currentGrade, currentProfile, previousGrade, previousProfile }) {
  const previousScore = getNumericFromGrade(previousGrade)
  const currentScore = getNumericFromGrade(currentGrade)
  const gradeText =
    previousGrade && currentGrade
      ? currentScore > previousScore
        ? `Venia amb ${previousGrade} i ara està en ${currentGrade}: ha millorat.`
        : currentScore < previousScore
          ? `Venia amb ${previousGrade} i ara està en ${currentGrade}: cal mirar què ha passat.`
          : `Venia amb ${previousGrade} i continua en ${currentGrade}.`
      : previousGrade
        ? `Venia amb ${previousGrade}; encara falta prou informació actual per comparar.`
        : 'Encara no hi ha nota anterior per comparar.'

  const profileText =
    previousProfile && currentProfile
      ? previousProfile === currentProfile.id
        ? `Venia com ${antecedentProfileLabels[previousProfile]} i continua amb el mateix perfil.`
        : `Venia com ${antecedentProfileLabels[previousProfile]} i ara apareix com ${currentProfile.label}.`
      : ''

  return [gradeText, profileText].filter(Boolean).join(' ')
}

function createAntecedentDraft(antecedent) {
  return {
    courseLabel: antecedent?.courseLabel || '',
    lastLookGrade: antecedent?.lastLookGrade || '',
    competencyGrades: antecedent?.competencyGrades || {},
    profile: antecedent?.profile || '',
    qualitativeNotes: antecedent?.qualitativeNotes || '',
    diagnosisSnapshot: antecedent?.diagnosisSnapshot || [],
  }
}

function getCompetencyCode(name = '', fallback = '') {
  const match = String(name).match(/\bC\d+\b/i)
  return match ? match[0].toLocaleUpperCase('ca') : fallback
}

function isCompetencyModified(marks, studentId, competencyId) {
  return marks.some(
    (mark) =>
      mark.type === 'competency-modification' &&
      mark.studentId === studentId &&
      mark.competencyId === competencyId,
  )
}

export function StudentProfileModal({ studentId, mode = 'evaluation', onClose, onOpenAnnotations }) {
  const state = useAvaluaproStore()
  const { activeClassId } = state.ui
  const student = state.students.find((item) => item.id === studentId)
  const antecedent = state.studentAntecedents.find((item) => item.studentId === studentId)
  const studentClass = state.classes.find((classItem) => classItem.id === student?.classId) ||
    state.classes.find((classItem) => classItem.id === activeClassId)
  const subjectCompetencies = getSubjectStructure(studentClass?.subject || state.profile.defaultSubject) || []
  const classTasks = state.tasks.filter((task) => task.classId === student?.classId)
  const classBehaviorEvents = state.behaviorEvents.filter((event) => event.classId === student?.classId)
  const currentEvaluation = student
    ? getStudentEvaluationScore(student.id, state)
    : { grade: '', score: 0 }
  const currentTracking = student
    ? getStudentTrackingStats(student.id, state.taskRecords, classTasks)
    : { hasTrackingData: false, consistency: 0, total: 0 }
  const currentRedPointCount = student
    ? getStudentRedPointCount(student, currentTracking)
    : 0
  const currentIncidents = student
    ? classBehaviorEvents.filter((event) => event.studentId === student.id && event.type === 'incident').length
    : 0
  const previousGrade = getAntecedentGrade(antecedent)
  const currentProfileSnapshot = getCurrentProfileSnapshot({
    evaluation: currentEvaluation,
    tracking: currentTracking,
    redPointCount: currentRedPointCount,
    incidents: currentIncidents,
  })
  const antecedentReading = antecedent
    ? getAntecedentReading({
        previousGrade,
        currentGrade: currentEvaluation.grade,
        previousProfile: antecedent.profile,
        currentProfile: currentProfileSnapshot,
      })
    : ''
  const agendaNotes = state.agendaNotes
    .filter((note) => note.classId === activeClassId && note.studentId === studentId)
    .sort((a, b) => b.date.localeCompare(a.date))
  const teamNote = agendaNotes.find((note) => note.type === 'team')
  const tutoringNote = agendaNotes.find((note) => note.type === 'tutoring')
  const diagnoses = student?.diagnoses || []
  const activeDiagnoses = DIAGNOSIS_OPTIONS.filter((diagnosis) => diagnoses.includes(diagnosis.id))
  const classUtIds = new Set(state.uts.filter((ut) => ut.classId === student?.classId).map((ut) => ut.id))
  const classCompetencies = state.competencies.filter((competency) => classUtIds.has(competency.utId))
  const subjectModifiedCompetencies = subjectCompetencies.map((competency, index) => {
    const code = getCompetencyCode(competency.name, `C${index + 1}`)
    const matchingCompetencies = classCompetencies.filter((classCompetency) => {
      const classCode = getCompetencyCode(classCompetency.name)
      return classCode === code || classCompetency.name === competency.name
    })
    return {
      code,
      color: competency.color || 'blue',
      matchingCompetencies,
      name: competency.name,
      modified: matchingCompetencies.some((classCompetency) =>
        isCompetencyModified(state.marks, studentId, classCompetency.id),
      ),
    }
  })
  const hasModificationTriggerDiagnosis = diagnoses.some((diagnosisId) => modificationTriggerDiagnoses.has(diagnosisId))
  const hasModifiedCompetencies = subjectModifiedCompetencies.some((competency) => competency.modified)
  const showModifiedCompetenciesPanel =
    subjectModifiedCompetencies.length > 0 && (hasModificationTriggerDiagnosis || hasModifiedCompetencies)
  const updateStudent = state.updateStudent
  const setCompetencyModification = state.setCompetencyModification
  const upsertStudentAntecedent = state.upsertStudentAntecedent
  const deleteStudentAntecedent = state.deleteStudentAntecedent
  const [antecedentDraft, setAntecedentDraft] = useState(() => createAntecedentDraft(antecedent))
  const [antecedentState, setAntecedentState] = useState('idle')
  const [diagnosisInfoId, setDiagnosisInfoId] = useState(null)
  const [showPtiLinkModal, setShowPtiLinkModal] = useState(false)
  const [ptiLinkDraft, setPtiLinkDraft] = useState(student?.ptiUrl || '')

  if (!student) return null

  const updateAntecedentDraft = (patch) => {
    setAntecedentState('dirty')
    setAntecedentDraft((current) => ({ ...current, ...patch }))
  }

  const saveAntecedent = async () => {
    await upsertStudentAntecedent(studentId, antecedentDraft)
    setAntecedentState('saved')
    window.setTimeout(() => setAntecedentState('idle'), 1800)
  }

  const removeAntecedent = async () => {
    if (!window.confirm('Vols eliminar els antecedents acadèmics d’aquest alumne?')) return
    await deleteStudentAntecedent(studentId)
    setAntecedentDraft(createAntecedentDraft(null))
    setAntecedentState('idle')
  }

  const captureCurrentDiagnoses = () => {
    updateAntecedentDraft({ diagnosisSnapshot: diagnoses })
  }

  const updateAntecedentCompetencyGrade = (competencyName, grade) => {
    updateAntecedentDraft({
      competencyGrades: {
        ...(antecedentDraft.competencyGrades || {}),
        [competencyName]: grade,
      },
    })
  }

  const toggleDiagnosis = (diagnosisId) => {
    const nextDiagnoses = diagnoses.includes(diagnosisId)
      ? diagnoses.filter((id) => id !== diagnosisId)
      : [...diagnoses, diagnosisId]
    updateStudent(studentId, { diagnoses: nextDiagnoses })
  }

  const handleDiagnosisInfoClick = (diagnosisId) => {
    if (diagnosisId === 'progress') {
      if (student.ptiUrl) {
        window.open(student.ptiUrl, '_blank', 'noopener,noreferrer')
        return
      }
      setPtiLinkDraft('')
      setShowPtiLinkModal(true)
      return
    }

    setDiagnosisInfoId(diagnosisId)
  }

  const savePtiLink = async () => {
    const trimmedLink = ptiLinkDraft.trim()
    if (!trimmedLink) return
    const normalizedLink = /^https?:\/\//i.test(trimmedLink) ? trimmedLink : `https://${trimmedLink}`
    await updateStudent(studentId, { ptiUrl: normalizedLink })
    setShowPtiLinkModal(false)
  }

  const toggleSubjectCompetencyModification = async (competencyOption) => {
    const nextModified = !competencyOption.modified
    await Promise.all(
      competencyOption.matchingCompetencies.map((competency) =>
        setCompetencyModification(studentId, competency.id, nextModified),
      ),
    )
  }

  const handlePhotoUpload = async (file) => {
    if (!file) return

    try {
      const photoUrl = await imageFileToCompressedDataUrl(file, { maxSize: 480, maxOutputBytes: 180 * 1024 })
      await updateStudent(studentId, { photoUrl })
    } catch (error) {
      window.alert(error.message)
    }
  }

  return (
    <Modal onClose={onClose} size="xl" title={`Perfil de l’alumne: ${student.name}`}>
      <div className="annotations-panel profile-personal-panel" data-tour="annotation-panel">
        <section className="annotation-hero">
          <div className="annotation-photo-card">
            {student.photoUrl ? (
              <img alt={student.name} src={student.photoUrl} />
            ) : (
              <div className="photo-placeholder">
                <Camera size={34} />
              </div>
            )}
            <label>
              Foto de l’alumne
              <input
                accept="image/*"
                onChange={(event) => handlePhotoUpload(event.target.files?.[0])}
                type="file"
              />
            </label>
            {student.photoUrl && (
              <button className="secondary-action compact" onClick={() => updateStudent(studentId, { photoUrl: '' })} type="button">
                <X size={15} />
                Treure foto
              </button>
            )}
          </div>
          <div className="annotation-quick-status">
            <article className={activeDiagnoses.length > 0 ? 'active' : ''}>
              <strong>{activeDiagnoses.length}</strong>
              <span>diagnòstics marcats</span>
            </article>
            <article className={teamNote ? 'team' : ''}>
              <strong>{teamNote ? 'Sí' : '-'}</strong>
              <span>equip educatiu</span>
            </article>
            <article className={tutoringNote && !teamNote ? 'tutoring' : ''}>
              <strong>{tutoringNote ? 'Sí' : '-'}</strong>
              <span>tutoria</span>
            </article>
          </div>
        </section>

        <section className="annotation-tools-row">
          <div>
            <span>{student.halfGroup || 'Sense mig grup assignat'}</span>
            <small>{mode === 'tracking' ? 'Perfil personal des del seguiment' : 'Perfil personal des de l’avaluació'}</small>
          </div>
          {onOpenAnnotations && (
            <button className="secondary-action" onClick={() => onOpenAnnotations(studentId)} type="button">
              <MessageCircle size={16} />
              Obrir resum i anotacions
            </button>
          )}
        </section>

        <section className="annotation-section" data-tour="annotation-diagnosis">
          <h3>
            <UserRound size={18} />
            Diagnòstics
          </h3>
          <div className="diagnosis-chip-list">
            {DIAGNOSIS_OPTIONS.map((diagnosis) => {
              const libraryEntry = DIAGNOSIS_LIBRARY[diagnosis.id]
              const hasInfoAction = libraryEntry || diagnosis.id === 'progress'
              return (
                <div
                  className={`diagnosis-chip-shell ${diagnosis.color} ${
                    diagnoses.includes(diagnosis.id) ? 'active' : ''
                  }`}
                  key={diagnosis.id}
                >
                  <button
                    className="diagnosis-chip"
                    onClick={() => toggleDiagnosis(diagnosis.id)}
                    type="button"
                  >
                    {diagnosis.label}
                  </button>
                  {hasInfoAction && (
                    <button
                      className="diagnosis-chip-info"
                      onClick={() => handleDiagnosisInfoClick(diagnosis.id)}
                      title={
                        diagnosis.id === 'progress'
                          ? student.ptiUrl
                            ? 'Obrir document PTI'
                            : 'Configurar enllaç PTI'
                          : `Veure resum de ${diagnosis.label}`
                      }
                      type="button"
                    >
                      i
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          {showModifiedCompetenciesPanel && (
            <div className="modified-competency-profile-panel">
              <div>
                <strong>Competències modificades</strong>
                <span>
                  Marca les competències amb balanç de progrés. A la taula veuràs la nota calculada encerclada; quan
                  s’enviï al tutor comptarà com a D en balanç estàndard.
                </span>
              </div>
              <div className="modified-competency-profile-grid">
                {subjectModifiedCompetencies.map((competency) => (
                  <button
                    className={`modified-competency-profile-chip ${competency.color} ${
                      competency.modified ? 'active' : ''
                    }`}
                    disabled={competency.matchingCompetencies.length === 0}
                    key={competency.name}
                    onClick={() => toggleSubjectCompetencyModification(competency)}
                    type="button"
                  >
                    <b>{competency.code}</b>
                    <span>{competency.name.replace(`${competency.code}:`, '').trim()}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <textarea
            maxLength={TEXT_LIMITS.diagnosisNotes}
            onChange={(event) => updateStudent(studentId, { diagnosisNotes: event.target.value })}
            placeholder="Anotacions addicionals sobre diagnòstics..."
            value={student.diagnosisNotes || ''}
          />
          <p className="sensitive-field-hint">
            Dada sensible: prioritza etiquetes i evita detalls mèdics o familiars. Escriu només allò que ajuda a
            adaptar la feina docent. Màxim {TEXT_LIMITS.diagnosisNotes} caràcters.
          </p>
        </section>
        {diagnosisInfoId && DIAGNOSIS_LIBRARY[diagnosisInfoId] && (
          <Modal onClose={() => setDiagnosisInfoId(null)} size="md" title={DIAGNOSIS_LIBRARY[diagnosisInfoId].title}>
            <div className="diagnosis-info-modal">
              <strong>Necessitats específiques</strong>
              <ul>
                {DIAGNOSIS_LIBRARY[diagnosisInfoId].summary.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </Modal>
        )}
        {showPtiLinkModal && (
          <Modal onClose={() => setShowPtiLinkModal(false)} size="md" title="Enllaç del PTI">
            <div className="pti-link-modal">
              <p>
                Aquest botó serveix per desar l’enllaç directe al document de Google del PTI d’aquest alumne. Un cop
                guardat, quan cliquis la <strong>i</strong> d’“Alumne de progrés” s’obrirà directament el document.
              </p>
              <label>
                Enllaç del document PTI
                <input
                  autoFocus
                  onChange={(event) => setPtiLinkDraft(event.target.value)}
                  placeholder="https://docs.google.com/..."
                  type="url"
                  value={ptiLinkDraft}
                />
              </label>
              <div className="pti-link-actions">
                <button className="secondary-action" onClick={() => setShowPtiLinkModal(false)} type="button">
                  Cancel·lar
                </button>
                <button className="primary-action" disabled={!ptiLinkDraft.trim()} onClick={savePtiLink} type="button">
                  Guardar enllaç
                </button>
              </div>
            </div>
          </Modal>
        )}

        <section className="annotation-section compact">
          <h3>Informació general</h3>
          <textarea
            maxLength={TEXT_LIMITS.personalNotes}
            onChange={(event) => updateStudent(studentId, { personalNotes: event.target.value })}
            placeholder="Informació personal rellevant per al seguiment docent..."
            value={student.personalNotes || ''}
          />
          <p className="sensitive-field-hint">
            Mantén aquesta informació curta, pedagògica i necessària. No hi escriguis dades personals que no aportin valor
            docent. Màxim {TEXT_LIMITS.personalNotes} caràcters.
          </p>
        </section>

        <section className="profile-section">
          <div className="profile-section-title">
            <h3>
              <MessageSquareText size={18} />
              Últimes anotacions
            </h3>
          </div>
          <div className="profile-alert-grid">
            <article className={`profile-alert-card ${teamNote ? 'team' : ''}`}>
              <div>
                <strong>Últim equip educatiu</strong>
                <span>{teamNote ? teamNote.text : 'Sense entrades d’equip educatiu'}</span>
                {teamNote && <small>{formatDate(teamNote.date)}</small>}
              </div>
            </article>
            <article className={`profile-alert-card ${tutoringNote ? 'tutoring' : ''}`}>
              <div>
                <strong>Última tutoria</strong>
                <span>{tutoringNote ? tutoringNote.text : 'Sense comentaris de tutoria'}</span>
                {tutoringNote && <small>{formatDate(tutoringNote.date)}</small>}
              </div>
            </article>
          </div>
        </section>

        <section className="profile-section student-antecedents-section">
          <div className="profile-section-title">
            <div>
              <h3>
                <FileClock size={18} />
                Antecedents acadèmics
              </h3>
              <span>Opcional i pensat per al començament de curs. Ho deixem al final perquè no molesti en el dia a dia.</span>
            </div>
            {antecedentState === 'saved' && <small className="antecedent-save-state">Desat</small>}
          </div>

          <div className="antecedent-form-grid">
            <label>
              Curs o origen
              <input
                onChange={(event) => updateAntecedentDraft({ courseLabel: event.target.value })}
                placeholder="Ex: Curs 2025-2026, informe final, traspàs..."
                value={antecedentDraft.courseLabel}
              />
            </label>
            <label>
              Resum global del curs anterior
              <select
                onChange={(event) => updateAntecedentDraft({ lastLookGrade: event.target.value })}
                value={antecedentDraft.lastLookGrade}
              >
                {gradeOptions.map((grade) => (
                  <option key={grade || 'empty'} value={grade}>
                    {grade || 'Sense nota'}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {antecedent && (
            <div className="antecedent-comparison-card">
              <div>
                <span>Rendiment</span>
                <strong>
                  <b className={gradeClassName(previousGrade)}>{previousGrade || '-'}</b>
                  <em>→</em>
                  <b className={gradeClassName(currentEvaluation.grade)}>{currentEvaluation.grade || '-'}</b>
                </strong>
              </div>
              <div>
                <span>Perfil</span>
                <strong>
                  <b>{antecedentProfileLabels[antecedent.profile] || 'Sense perfil'}</b>
                  <em>→</em>
                  <b className={`profile-tone ${currentProfileSnapshot.tone}`}>{currentProfileSnapshot.label}</b>
                </strong>
              </div>
              <p>{antecedentReading}</p>
            </div>
          )}

          <div className="antecedent-competencies-card">
            <div>
              <strong>Última mirada per competències</strong>
              <span>
                {subjectCompetencies.length > 0
                  ? `Matèria: ${studentClass?.subject || state.profile.defaultSubject || 'sense matèria'}`
                  : 'Aquesta matèria encara no té competències preconfigurades.'}
              </span>
            </div>
            {subjectCompetencies.length > 0 && (
              <div className="antecedent-competency-grid">
                {subjectCompetencies.map((competency) => (
                  <label className="antecedent-competency-row" key={competency.name}>
                    <span>{competency.name}</span>
                    <select
                      onChange={(event) => updateAntecedentCompetencyGrade(competency.name, event.target.value)}
                      value={antecedentDraft.competencyGrades?.[competency.name] || ''}
                    >
                      {gradeOptions.map((grade) => (
                        <option key={`${competency.name}-${grade || 'empty'}`} value={grade}>
                          {grade || '-'}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="antecedent-profile-grid">
            {antecedentProfiles.map((profile) => (
              <button
                className={`antecedent-profile-button ${profile.id} ${
                  antecedentDraft.profile === profile.id ? 'active' : ''
                }`}
                key={profile.id}
                onClick={() => updateAntecedentDraft({ profile: profile.id })}
                type="button"
              >
                <strong>{profile.label}</strong>
                <span>{profile.description}</span>
              </button>
            ))}
          </div>

          <label className="antecedent-notes-field">
            Valoració qualitativa inicial
            <textarea
              maxLength={TEXT_LIMITS.antecedentNotes}
              onChange={(event) => updateAntecedentDraft({ qualitativeNotes: event.target.value })}
              placeholder="Què convé saber abans de començar el curs? Fortaleses, dificultats, hàbits, recomanacions..."
              value={antecedentDraft.qualitativeNotes}
            />
            <span className="sensitive-field-hint">
              Resumeix només antecedents útils per començar el curs. Evita copiar informes complets si amb una síntesi
              n’hi ha prou. Màxim {TEXT_LIMITS.antecedentNotes} caràcters.
            </span>
          </label>

          <div className="antecedent-diagnosis-row">
            <div>
              <strong>Diagnòstics conservats als antecedents</strong>
              <span>
                {antecedentDraft.diagnosisSnapshot.length > 0
                  ? DIAGNOSIS_OPTIONS.filter((diagnosis) =>
                      antecedentDraft.diagnosisSnapshot.includes(diagnosis.id),
                    )
                      .map((diagnosis) => diagnosis.label)
                      .join(' · ')
                  : 'Sense diagnòstics guardats als antecedents.'}
              </span>
            </div>
            <button className="secondary-action compact" onClick={captureCurrentDiagnoses} type="button">
              Capturar diagnòstics actuals
            </button>
          </div>

          <div className="antecedent-actions">
            {antecedent && (
              <button className="danger-action compact" onClick={removeAntecedent} type="button">
                <Trash2 size={15} />
                Eliminar
              </button>
            )}
            <button className="primary-action compact" onClick={saveAntecedent} type="button">
              <Save size={15} />
              Desar antecedents
            </button>
          </div>
        </section>
      </div>
    </Modal>
  )
}
