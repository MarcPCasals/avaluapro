import { useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  Brain,
  CheckCircle2,
  CircleHelp,
  ListFilter,
  LineChart,
  MessageSquareText,
  Radar,
  Target,
  TrendingUp,
} from 'lucide-react'
import { Modal } from '../../components/Modal'
import {
  buildStudentProfiles,
  buildTrackingInterventions,
  getStudentRedPointCount,
  getStudentTrackingStats,
} from '../../lib/analytics'
import { calculateGrade, getNumericFromGrade } from '../../lib/grades'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'

const insightCopy = {
  dashboard: {
    title: 'Stats Globals',
    description: 'Lectura ràpida del grup amb rendiment, constància, comportament i anàlisi creuada.',
    icon: BarChart3,
  },
  utStats: {
    title: 'Stats UT',
    description: 'Focus en la UT activa per veure com progressen criteris, competències i tasques associades.',
    icon: Target,
  },
  trackingStats: {
    title: 'Stats Seguiment',
    description: 'Constància, tasques no fetes i incidències per detectar hàbits de treball.',
    icon: Radar,
  },
}

const gradeOrder = ['A', 'B', 'C', 'D']
const gradeLabels = {
  A: 'Alt assoliment',
  B: 'Assoliment correcte',
  C: 'Assoliment fràgil',
  D: 'Risc',
}

const chartHelp = {
  globalSummary:
    'Resumeix el grup combinant rendiment, constància i seguiment. Serveix per situar-te abans d’entrar al detall.',
  gradeUtMatrix:
    'Mostra quants alumnes tenen A, B, C o D a cada UT i competència. Ajuda a comparar si una mateixa competència millora, empitjora o queda sense evidències entre UTs.',
  competencyBalance:
    'Mesura si el grup està equilibrat entre competències. Una diferència gran indica que hi ha una competència forta i una altra que necessita reforç.',
  globalTrend:
    'Mostra l’evolució de la mitjana del grup al llarg de les UTs. Permet veure si el grup progressa, queda estable o baixa.',
  achievementLevels:
    'Resumeix quants alumnes estan en assoliment alt, risc o sense dades. És una lectura ràpida del nivell general del grup.',
  priorityCompetency:
    'Identifica la competència amb mitjana més baixa. És una pista directa sobre on centrar reforç pedagògic.',
  riskStudents:
    'Agrupa alumnes amb senyals combinades de risc: rendiment baix, baixa constància o incidències. Clica la targeta per veure qui són i què fer.',
  conceptStudents:
    'Detecta alumnes que fan les tasques però no assoleixen. Sol indicar dificultat conceptual, no només falta de feina.',
  habitStudents:
    'Detecta alumnes amb bon rendiment però poca constància. Ajuda a prevenir que els hàbits fràgils acabin afectant l’aprenentatge.',
  crossAnalysis:
    'Creua rendiment, constància, tasques no fetes i comportament en una sola taula per decidir prioritats docents.',
  pedagogicalAnalysis:
    'Converteix les dades en conclusions docents: millor competència, dificultat principal i recomanació de reforç.',
  scatter:
    'Situa cada alumne segons constància i rendiment. Els extrems ajuden a veure perfils: treballa però no assoleix, assoleix però no és constant, o risc combinat.',
  actionLists:
    'Llistes accionables per començar a intervenir sense haver de llegir tota la taula.',
  criterionDistribution:
    'Mostra la distribució A/B/C/D per criteri. És útil per detectar criteris amb molts suspesos o amb poca evidència.',
  utSummary:
    'Resumeix només la UT activa: mitjana, evidències, competències, criteris i constància.',
  utCompetencies:
    'Mostra el comportament de cada competència dins la UT activa: mitjana, A/B/C/D i alumnes amb C/D.',
  utCriteria:
    'Ordena els criteris de la UT per dificultat. Ajuda a decidir quin criteri convé reforçar primer.',
  utReinforcement:
    'Transforma les dades de la UT en una proposta pràctica de reforç per a la propera sessió.',
  utStudents:
    'Ordena alumnes de la UT segons rendiment, constància, tasques no fetes i incidències.',
  utTasks:
    'Mostra l’estat de les tasques associades a la UT: fetes, incompletes i no fetes.',
  trackingSummary:
    'Resumeix només el seguiment: constància, punts vermells, punts negres i intervencions. No inclou notes.',
  trackingPulse:
    'Mostra el pols del grup segons hàbits de treball: estables, en seguiment o sense dades.',
  trackingReminders:
    'Compta recordatoris actius, de classe o individuals, per evitar que quedin tasques pendents sense seguiment.',
  trackingIncomplete:
    'Mostra tasques incompletes. Si s’acumulen, poden acabar convertint-se en punts vermells.',
  trackingVolume:
    'Indica quantes tasques hi ha a la UT activa. Ajuda a interpretar si les estadístiques són robustes o encara tenen poca mostra.',
  trackingIntervention:
    'Detecta patrons de baixa constància, tasques no fetes o incidències recents per prioritzar alumnes.',
  trackingTaskMap:
    'Mostra quines tasques han generat més no fetes o incompletes.',
  trackingStudents:
    'Ordena alumnes per constància, punts vermells, incompletes i punts negres.',
  trackingBehavior:
    'Resumeix punts negres i entrades de diari sense barrejar-ho amb rendiment acadèmic.',
  trackingAgenda:
    'Mostra alumnes que ja tenen un avís d’agenda registrat o que acumulen prou punts vermells/negres per valorar-lo.',
}

function InfoButton({ label, onOpen }) {
  return (
    <button
      aria-label={`Explicació: ${label}`}
      className="info-help-button"
      onClick={(event) => {
        event.stopPropagation()
        onOpen?.()
      }}
      title={`Què explica: ${label}`}
      type="button"
    >
      <CircleHelp size={16} />
    </button>
  )
}

function InfoModal({ info, onClose }) {
  if (!info) return null

  return (
    <Modal onClose={onClose} size="md" title={info.title}>
      <div className="chart-info-modal">
        <CircleHelp size={28} />
        <p>{info.text}</p>
      </div>
    </Modal>
  )
}

function MetricCard({ className = '', help, label, onClick, setInfo, value, helper }) {
  const content = (
    <>
      {help && setInfo ? (
        <InfoButton label={label} onOpen={() => setInfo({ title: label, text: help })} />
      ) : null}
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </>
  )

  if (onClick) {
    return (
      <button className={`metric-card ${className} clickable`} onClick={onClick} type="button">
        {content}
      </button>
    )
  }

  return <article className={`metric-card ${className}`}>{content}</article>
}

function HelpSectionHeading({ description, helpKey, icon: Icon, setInfo, title }) {
  return (
    <div className="section-heading compact">
      <Icon size={20} />
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {helpKey && setInfo ? (
        <InfoButton label={title} onOpen={() => setInfo({ title, text: chartHelp[helpKey] })} />
      ) : null}
    </div>
  )
}

function getClassUts(state, classId) {
  return state.uts
    .filter((ut) => ut.classId === classId)
    .sort((a, b) => {
      const semesterA = state.semesters.find((semester) => semester.id === a.semesterId)?.order || 0
      const semesterB = state.semesters.find((semester) => semester.id === b.semesterId)?.order || 0
      if (semesterA !== semesterB) return semesterA - semesterB
      return a.order - b.order
    })
}

function getUtCompetencies(state, utId) {
  return state.competencies
    .filter((competency) => competency.utId === utId)
    .sort((a, b) => a.order - b.order)
    .map((competency) => ({
      ...competency,
      criteria: state.criteria
        .filter((criterion) => criterion.competencyId === competency.id)
        .sort((a, b) => a.order - b.order),
    }))
}

function getStudentUtGrade(state, studentId, utId) {
  const grades = getUtCompetencies(state, utId)
    .map((competency) => getStudentCompetencyGrade(state, studentId, competency))
    .filter(Boolean)
  const scores = grades.map(getNumericFromGrade).filter((score) => score > 0)
  const averageScore =
    scores.length === 0 ? 0 : Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2))

  return { grade: getGradeFromAverage(averageScore), score: averageScore }
}

function getStudentCompetencyGrade(state, studentId, competency) {
  const marks = competency.criteria
    .map((criterion) =>
      state.marks.find((mark) => mark.studentId === studentId && mark.criterionId === criterion.id)?.value,
    )
    .filter(Boolean)

  return calculateGrade(marks)
}

function getCriterionMark(state, studentId, criterionId) {
  return state.marks.find((mark) => mark.studentId === studentId && mark.criterionId === criterionId)?.value || ''
}

function getGradeAverage(grades) {
  const scores = grades.map(getNumericFromGrade).filter((score) => score > 0)
  if (scores.length === 0) return 0
  return Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2))
}

function getCompetencyCode(name) {
  return name.match(/^C\d+/)?.[0] || name
}

function getCompetencyNumber(name) {
  const number = Number(name.match(/^C(\d+)/)?.[1])
  return Number.isFinite(number) ? number : 999
}

function buildCanonicalCompetencies(state, uts) {
  const byName = new Map()

  uts.forEach((ut) => {
    getUtCompetencies(state, ut.id).forEach((competency) => {
      const key = competency.name
      if (!byName.has(key)) {
        byName.set(key, {
          key,
          code: getCompetencyCode(competency.name),
          name: competency.name,
          order: getCompetencyNumber(competency.name),
        })
      }
    })
  })

  return Array.from(byName.values()).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
}

function buildGradeUtMatrix(state, students, uts, canonicalCompetencies) {
  return gradeOrder.map((grade) => ({
    grade,
    total: 0,
    uts: uts.map((ut) => {
      const competencies = getUtCompetencies(state, ut.id)
      const competenciesByName = new Map(competencies.map((competency) => [competency.name, competency]))
      const competencyRows = canonicalCompetencies.map((canonicalCompetency) => {
        const competency = competenciesByName.get(canonicalCompetency.name)
        const count = competency
          ? students.filter((student) => getStudentCompetencyGrade(state, student.id, competency) === grade).length
          : 0
        return {
          id: `${ut.id}_${canonicalCompetency.key}`,
          code: canonicalCompetency.code,
          name: canonicalCompetency.name,
          count,
          hasCompetency: Boolean(competency),
        }
      })
      const count = students.filter((student) => getStudentUtGrade(state, student.id, ut.id).grade === grade).length

      return { id: ut.id, name: ut.name, count, competencyRows }
    }),
  })).map((row) => ({
    ...row,
    total: row.uts.reduce((sum, ut) => sum + ut.count, 0),
  }))
}

function buildUtTrend(state, students, uts) {
  return uts.map((ut) => {
    const scores = students
      .map((student) => getStudentUtGrade(state, student.id, ut.id).score)
      .filter((score) => score > 0)
    const average = scores.length === 0 ? 0 : scores.reduce((sum, score) => sum + score, 0) / scores.length
    return { ut, average: Number(average.toFixed(2)), count: scores.length }
  })
}

function buildCompetencyBalance(state, students, uts) {
  const byName = new Map()

  uts.forEach((ut) => {
    getUtCompetencies(state, ut.id).forEach((competency) => {
      const scores = students
        .map((student) => getNumericFromGrade(getStudentCompetencyGrade(state, student.id, competency)))
        .filter((score) => score > 0)
      if (scores.length === 0) return
      const current = byName.get(competency.name) || { name: competency.name, total: 0, count: 0 }
      byName.set(competency.name, {
        ...current,
        total: current.total + scores.reduce((sum, score) => sum + score, 0),
        count: current.count + scores.length,
      })
    })
  })

  const rows = Array.from(byName.values()).map((item) => ({
    name: item.name,
    average: item.count === 0 ? 0 : Number((item.total / item.count).toFixed(2)),
  }))
  const best = [...rows].sort((a, b) => b.average - a.average)[0]
  const weakest = [...rows].sort((a, b) => a.average - b.average)[0]
  const spread = best && weakest ? Number((best.average - weakest.average).toFixed(2)) : 0

  return { rows, best, weakest, spread }
}

function buildCriterionDistributions(state, students, uts) {
  const byCompetency = new Map()

  uts.forEach((ut) => {
    getUtCompetencies(state, ut.id).forEach((competency) => {
      const competencyRow = byCompetency.get(competency.name) || {
        id: competency.name,
        name: competency.name,
        color: competency.color || 'blue',
        uts: [],
      }
      competencyRow.uts.push({
        ut,
        criteria: competency.criteria.map((criterion) => {
          const counts = gradeOrder.reduce((acc, grade) => ({ ...acc, [grade]: 0 }), {})
          students.forEach((student) => {
            const value = state.marks.find(
              (mark) => mark.studentId === student.id && mark.criterionId === criterion.id,
            )?.value
            if (counts[value] !== undefined) counts[value] += 1
          })
          return { criterion, counts }
        }),
      })
      byCompetency.set(competency.name, competencyRow)
    })
  })

  return Array.from(byCompetency.values())
}

function getCurrentTasks(state, classId, utId) {
  return state.tasks
    .filter((task) => task.classId === classId && task.utId === utId)
    .sort((a, b) => a.order - b.order)
}

function buildUtCriterionRows(state, students, competencies) {
  return competencies.flatMap((competency) =>
    competency.criteria.map((criterion) => {
      const grades = students.map((student) => getCriterionMark(state, student.id, criterion.id)).filter(Boolean)
      const counts = gradeOrder.reduce((acc, grade) => ({ ...acc, [grade]: 0 }), {})
      grades.forEach((grade) => {
        if (counts[grade] !== undefined) counts[grade] += 1
      })
      const riskStudents = students
        .map((student) => ({
          student,
          grade: getCriterionMark(state, student.id, criterion.id),
        }))
        .filter((item) => ['C', 'D'].includes(item.grade))

      return {
        id: criterion.id,
        competency,
        criterion,
        counts,
        average: getGradeAverage(grades),
        riskStudents,
        total: grades.length,
      }
    }),
  )
}

function buildUtCompetencyRows(state, students, competencies) {
  return competencies.map((competency) => {
    const grades = students.map((student) => getStudentCompetencyGrade(state, student.id, competency)).filter(Boolean)
    const counts = gradeOrder.reduce((acc, grade) => ({ ...acc, [grade]: 0 }), {})
    grades.forEach((grade) => {
      if (counts[grade] !== undefined) counts[grade] += 1
    })
    const riskStudents = students
      .map((student) => ({
        student,
        grade: getStudentCompetencyGrade(state, student.id, competency),
      }))
      .filter((item) => ['C', 'D'].includes(item.grade))

    return {
      ...competency,
      counts,
      average: getGradeAverage(grades),
      riskStudents,
      total: grades.length,
    }
  })
}

function getInitials(name) {
  const [surnameBlock = '', firstNameBlock = ''] = name.split(',')
  const firstName = firstNameBlock.trim().split(/\s+/).filter(Boolean)[0]
  const firstSurname = surnameBlock.trim().split(/\s+/).filter(Boolean)[0]
  const fallback = name
    .split(/[,\s]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')

  return `${firstName?.[0] || ''}${firstSurname?.[0] || ''}`.toUpperCase() || fallback
}

function buildStudentChangeRows(state, students, uts) {
  return students
    .map((student) => {
      const validScores = uts
        .map((ut) => ({ ut, ...getStudentUtGrade(state, student.id, ut.id) }))
        .filter((item) => item.score > 0)
      const first = validScores[0]
      const last = validScores.at(-1)
      const delta = first && last ? Number((last.score - first.score).toFixed(2)) : 0

      return { student, first, last, delta, validScores }
    })
    .filter((row) => row.validScores.length >= 2 && row.delta !== 0)
}

function buildTrackingEvidence(profile, state, tasks, behaviorEvents) {
  const redRows = tasks
    .map((task) => {
      const record = state.taskRecords.find((item) => item.taskId === task.id && item.studentId === profile.student.id)
      return record?.status === 'MISSING' ? { title: task.title, detail: task.date || 'Sense data' } : null
    })
    .filter(Boolean)
  const missingDifference = Math.max(profile.redPointCount - redRows.length, 0)
  const blackRows = behaviorEvents
    .filter((event) => event.studentId === profile.student.id && event.type === 'incident')
    .map((event) => ({
      title: event.description || 'Incidència de comportament',
      detail: event.date || 'Sense data',
    }))

  return {
    redRows: [
      ...redRows,
      ...(missingDifference > 0
        ? [{ title: `${missingDifference} punts vermells importats del Seguidor V1`, detail: 'Sense tasca concreta al backup' }]
        : []),
    ],
    blackRows,
  }
}

function buildPedagogicalSummary({ atRisk, balance, hardworkingLowAchievement, lowConsistencyGoodAchievement }) {
  const focus = balance.weakest?.name || 'cap competència amb dades suficients'
  const best = balance.best?.name || 'cap competència destacada'

  return {
    best: `La competència més forta ara mateix és ${best}.`,
    difficulty: `La prioritat de reforç és ${focus}.`,
    recommendation:
      atRisk.length > 0
        ? `Convé revisar ${atRisk.length} alumnes amb senyals combinades de risc abans de continuar avançant contingut.`
        : 'El grup no mostra risc combinat destacat; es pot fer seguiment ordinari i mirar casos puntuals.',
    hiddenNeed:
      hardworkingLowAchievement.length > 0
        ? `${hardworkingLowAchievement.length} alumnes treballen però no acaben d’assolir: aquí cal suport conceptual.`
        : 'No apareix un grup clar d’alumnes constants amb rendiment baix.',
    habitWarning:
      lowConsistencyGoodAchievement.length > 0
        ? `${lowConsistencyGoodAchievement.length} alumnes assoleixen però tenen hàbits fràgils: seguiment preventiu.`
        : 'No hi ha un patró clar d’alumnes amb bon rendiment però poca constància.',
  }
}

function getGlobalDecision(profile) {
  if (!profile.evaluation.score && profile.tracking.total === 0 && profile.incidents === 0 && profile.redPointCount === 0) {
    return {
      label: 'Sense dades',
      text: 'Encara no hi ha prou informació per interpretar aquest alumne.',
      tone: 'neutral',
    }
  }

  if (profile.riskScore >= 2 && profile.redPointCount >= 3) {
    return {
      label: 'Intervenció + agenda',
      text: 'Combina risc acadèmic o hàbits baixos amb punts vermells acumulats.',
      tone: 'danger',
    }
  }

  if (profile.riskScore >= 2) {
    return {
      label: 'Intervenció prioritària',
      text: 'Revisar evidències, tasques i incidències abans de continuar avançant.',
      tone: 'danger',
    }
  }

  if (profile.evaluation.score > 0 && profile.evaluation.score <= 2 && profile.tracking.consistency >= 75) {
    return {
      label: 'Reforç conceptual',
      text: 'Treballa de manera constant, però necessita ajuda sobre els criteris o competències.',
      tone: 'concept',
    }
  }

  if (profile.evaluation.score >= 3 && profile.tracking.consistency < 60) {
    return {
      label: 'Hàbit preventiu',
      text: 'El rendiment és bo, però la constància és fràgil i convé prevenir.',
      tone: 'habit',
    }
  }

  if (profile.redPointCount >= 3) {
    return {
      label: 'Valorar agenda',
      text: 'Acumula punts vermells suficients per revisar si cal avís d’agenda.',
      tone: 'warning',
    }
  }

  if (profile.incidents >= 2) {
    return {
      label: 'Comportament',
      text: 'Hi ha incidències repetides que poden afectar la dinàmica de classe.',
      tone: 'dark',
    }
  }

  return {
    label: profile.tracking.consistency >= 75 ? 'Hàbit estable' : 'Seguiment ordinari',
    text: profile.tracking.consistency >= 75 ? 'Manté un patró de treball estable.' : 'Sense senyals combinades importants.',
    tone: profile.tracking.consistency >= 75 ? 'stable' : 'neutral',
  }
}

function getDecisionPriority(profile) {
  const decision = getGlobalDecision(profile)
  const toneOrder = {
    danger: 0,
    warning: 1,
    concept: 2,
    habit: 3,
    dark: 4,
    neutral: 5,
    stable: 6,
  }
  return toneOrder[decision.tone] ?? 5
}

function sortProfilesByTeachingPriority(profiles) {
  return [...profiles].sort((a, b) => {
    const priorityDiff = getDecisionPriority(a) - getDecisionPriority(b)
    if (priorityDiff !== 0) return priorityDiff
    if (a.riskScore !== b.riskScore) return b.riskScore - a.riskScore
    if (a.redPointCount !== b.redPointCount) return b.redPointCount - a.redPointCount
    if (a.incidents !== b.incidents) return b.incidents - a.incidents
    return a.tracking.consistency - b.tracking.consistency
  })
}

function GradeUtMatrix({ matrix, setInfo }) {
  return (
    <section className="grade-ut-matrix">
      <HelpSectionHeading
        description="Distribució A/B/C/D per veure ràpidament on s’acumula assoliment o risc."
        helpKey="gradeUtMatrix"
        icon={BarChart3}
        setInfo={setInfo}
        title="Comparativa de notes per UT"
      />
      <div className="grade-card-grid">
        {matrix.map((row) => (
          <article className={`grade-distribution-card grade-${row.grade}`} key={row.grade}>
            <header>
              <strong>{row.grade}</strong>
              <span>{gradeLabels[row.grade]}</span>
            </header>
            <div className="grade-ut-columns">
              {row.uts.map((ut) => (
                <div className="grade-ut-column" key={ut.id}>
                  <strong>
                    {ut.name} ({ut.count})
                  </strong>
                  {ut.competencyRows.length === 0 ? (
                    <span className="empty-dash">-</span>
                  ) : (
                    ut.competencyRows.map((competency) => (
                      <small className={!competency.hasCompetency ? 'muted' : ''} key={competency.id}>
                        <span>{competency.name}</span>
                        <b className={`grade-count-badge grade-${competency.hasCompetency ? row.grade : 'empty'}`}>
                          {competency.hasCompetency ? competency.count : '-'}
                        </b>
                      </small>
                    ))
                  )}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function BalanceBar({ balance, setInfo }) {
  const spreadPercent = Math.min(100, Math.round((balance.spread / 3) * 100))
  const level = balance.spread >= 1.5 ? 'important' : balance.spread >= 0.75 ? 'moderate' : 'stable'

  return (
    <article className={`diagnosis-card balance ${level}`}>
      <InfoButton
        label="Equilibri competencial"
        onOpen={() => setInfo({ title: 'Equilibri competencial', text: chartHelp.competencyBalance })}
      />
      <header>
        <span>Equilibri competencial</span>
      </header>
      <strong>{level === 'stable' ? 'Equilibri correcte' : level === 'moderate' ? 'Desequilibri moderat' : 'Desequilibri important'}</strong>
      <div className="balance-meter">
        <span style={{ width: `${spreadPercent}%` }} />
      </div>
      <p>
        Diferència de {balance.spread} punts entre la més alta ({balance.best?.name || '-'}:{' '}
        {balance.best?.average || '-'}) i la més baixa ({balance.weakest?.name || '-'}:{' '}
        {balance.weakest?.average || '-'}).
      </p>
    </article>
  )
}

function TrendCard({ trend, setInfo }) {
  const plottedTrend = trend
    .map((item, index) => {
      const x = trend.length <= 1 ? 50 : (index / (trend.length - 1)) * 100
      const y = 90 - (item.average / 4) * 72
      return { ...item, x, y }
    })
    .filter((item) => item.count > 0)
  const points = plottedTrend.map((item) => `${item.x},${item.y}`)
  const hasData = plottedTrend.length > 0
  const first = plottedTrend[0]?.average || 0
  const last = plottedTrend.at(-1)?.average || 0
  const direction = last > first ? 'Progrés sostingut' : last < first ? 'Tendència a revisar' : 'Estable'
  const trendSummary = plottedTrend
    .map((item) => `${item.ut.name}: ${getGradeFromAverage(item.average) || '-'} (${item.average})`)
    .join(' · ')

  return (
    <article className="diagnosis-card trend">
      <InfoButton
        label="Tendència global"
        onOpen={() => setInfo({ title: 'Tendència global', text: chartHelp.globalTrend })}
      />
      <header>
        <span>Tendència global</span>
        <TrendingUp size={16} />
      </header>
      <svg viewBox="0 0 100 100" role="img" aria-label="Tendència global de notes">
        <polyline className="trend-grid" points="0,82 100,82" />
        {hasData && <polyline className="trend-line" points={points.join(' ')} />}
        {plottedTrend.map((item) => (
          <circle
            className={`trend-point grade-${getGradeFromAverage(item.average) || 'empty'}`}
            cx={item.x}
            cy={item.y}
            key={item.ut.id}
            r="2.8"
          />
        ))}
      </svg>
      <strong>{hasData ? direction : 'Sense dades'}</strong>
      {hasData ? <p>{trendSummary}</p> : <p>Encara no hi ha cap UT amb evidències.</p>}
    </article>
  )
}

function DonutCard({ profiles, setInfo }) {
  const high = profiles.filter((profile) => profile.evaluation.score >= 3).length
  const risk = profiles.filter((profile) => profile.evaluation.score > 0 && profile.evaluation.score <= 2).length
  const withoutData = Math.max(profiles.length - high - risk, 0)
  const total = Math.max(profiles.length, 1)
  const highPercent = Math.round((high / total) * 100)
  const riskPercent = Math.round((risk / total) * 100)

  return (
    <article className="diagnosis-card donut-card">
      <InfoButton
        label="Nivells d’assoliment"
        onOpen={() => setInfo({ title: 'Nivells d’assoliment', text: chartHelp.achievementLevels })}
      />
      <header>
        <span>Nivells d’assoliment</span>
        <BarChart3 size={16} />
      </header>
      <div className="donut-wrap">
        <div
          className="donut"
          style={{
            background: `conic-gradient(#22c55e 0 ${highPercent}%, #f43f5e ${highPercent}% ${
              highPercent + riskPercent
            }%, #e5e7eb ${highPercent + riskPercent}% 100%)`,
          }}
        >
          <strong>{profiles.length}</strong>
          <span>Total</span>
        </div>
        <div className="donut-legend">
          <span className="good">Alt: {high}</span>
          <span className="risk">Risc: {risk}</span>
          <span>Sense dades: {withoutData}</span>
        </div>
      </div>
    </article>
  )
}

function PriorityCard({ balance, setInfo }) {
  return (
    <article className="diagnosis-card priority">
      <InfoButton
        label="Intervenció prioritària"
        onOpen={() => setInfo({ title: 'Intervenció prioritària', text: chartHelp.priorityCompetency })}
      />
      <AlertTriangle size={28} />
      <span>Intervenció prioritària</span>
      <strong>{balance.weakest?.name || 'Sense dades suficients'}</strong>
      <div className="priority-bar">
        <span style={{ width: `${Math.min(100, ((balance.weakest?.average || 0) / 4) * 100)}%` }} />
      </div>
      <small>Mitjana: {balance.weakest?.average || '-'}</small>
    </article>
  )
}

function ScatterCard({ onSelectProfile, profiles, setInfo }) {
  return (
    <article className="visual-card scatter-card">
      <HelpSectionHeading
        description="Detecta ràpidament alumnes constants amb dificultat i alumnes bons però poc constants."
        helpKey="scatter"
        icon={Target}
        setInfo={setInfo}
        title="Constància ↔ rendiment"
      />
      <div className="scatter-plot" aria-label="Relació entre constància i rendiment">
        <span className="axis x">Constància</span>
        <span className="axis y">Rendiment</span>
        {profiles.map((profile) => {
          const x = Math.min(96, Math.max(4, profile.tracking.consistency))
          const y = 96 - Math.min(92, Math.max(8, profile.evaluation.score * 23))
          return (
            <button
              className={`scatter-dot ${profile.riskScore >= 2 ? 'risk' : ''}`}
              key={profile.student.id}
              onClick={() => onSelectProfile(profile)}
              style={{ left: `${x}%`, top: `${y}%` }}
              title={`${profile.student.name}: ${profile.evaluation.grade || '-'} · ${profile.tracking.consistency}%`}
              type="button"
            >
              {getInitials(profile.student.name)}
            </button>
          )
        })}
      </div>
    </article>
  )
}

function getGradeFromAverage(score) {
  if (!score) return ''
  if (score >= 3.5) return 'A'
  if (score >= 2.5) return 'B'
  if (score >= 1.5) return 'C'
  return 'D'
}

function buildStudentEvolution(state, studentId, uts, canonicalCompetencies) {
  const utScores = uts.map((ut) => ({ ut, ...getStudentUtGrade(state, studentId, ut.id) }))
  const validScores = utScores.filter((item) => item.score > 0)
  const average =
    validScores.length === 0
      ? 0
      : Number((validScores.reduce((sum, item) => sum + item.score, 0) / validScores.length).toFixed(2))
  const first = validScores[0]?.score || 0
  const last = validScores.at(-1)?.score || 0
  const rhythm = validScores.length < 2 ? 'Sense prou dades' : last > first ? 'Millora' : last < first ? 'Regressió' : 'Estable'
  const matrix = canonicalCompetencies
    .map((canonicalCompetency) => {
      const grades = uts.map((ut) => {
        const competency = getUtCompetencies(state, ut.id).find((item) => item.name === canonicalCompetency.name)
        return competency ? getStudentCompetencyGrade(state, studentId, competency) : ''
      })
      const firstEvidenceIndex = grades.findIndex(Boolean)

      return {
        competency: canonicalCompetency,
        grades,
        firstEvidenceIndex: firstEvidenceIndex === -1 ? 999 : firstEvidenceIndex,
      }
    })
    .sort(
      (a, b) =>
        a.firstEvidenceIndex - b.firstEvidenceIndex ||
        getCompetencyNumber(a.competency.name) - getCompetencyNumber(b.competency.name),
    )

  return { average, grade: getGradeFromAverage(average), matrix, rhythm, utScores, validScores }
}

function buildSmoothPath(points) {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  const path = [`M ${points[0].x} ${points[0].y}`]
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[Math.max(0, index - 1)]
    const p1 = points[index]
    const p2 = points[index + 1]
    const p3 = points[Math.min(points.length - 1, index + 2)]
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    path.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`)
  }

  return path.join(' ')
}

function StudentEvolutionModal({ canonicalCompetencies, onClose, state, student, uts }) {
  if (!student) return null

  const evolution = buildStudentEvolution(state, student.id, uts, canonicalCompetencies)
  const lineChart = {
    left: 14,
    right: 96,
    top: 16,
    bottom: 88,
    xLabelY: 102,
  }
  const points = evolution.validScores.map((item, index) => {
    const x =
      evolution.validScores.length <= 1
        ? 50
        : lineChart.left +
          (index / (evolution.validScores.length - 1)) *
            (lineChart.right - lineChart.left)
    const y = lineChart.bottom - ((item.score - 1) / 3) * (lineChart.bottom - lineChart.top)
    return { ...item, x, y }
  })
  const linePath = buildSmoothPath(points)
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points.at(-1).x} ${lineChart.bottom} L ${points[0].x} ${lineChart.bottom} Z`
      : ''
  const radarRows = evolution.matrix.map((row, index) => {
    const angle = -90 + (index / Math.max(evolution.matrix.length, 1)) * 360
    const radians = (angle * Math.PI) / 180
    const first = getNumericFromGrade(row.grades.find(Boolean))
    const last = getNumericFromGrade([...row.grades].reverse().find(Boolean))
    const axisX = 50 + Math.cos(radians) * 34
    const axisY = 50 + Math.sin(radians) * 34
    const firstX = 50 + Math.cos(radians) * ((first / 4) * 34)
    const firstY = 50 + Math.sin(radians) * ((first / 4) * 34)
    const lastX = 50 + Math.cos(radians) * ((last / 4) * 34)
    const lastY = 50 + Math.sin(radians) * ((last / 4) * 34)

    return { row, axisX, axisY, firstX, firstY, lastX, lastY }
  })
  const firstPolygon = radarRows.map((item) => `${item.firstX},${item.firstY}`).join(' ')
  const lastPolygon = radarRows.map((item) => `${item.lastX},${item.lastY}`).join(' ')

  return (
    <Modal onClose={onClose} size="xl" title={`Evolució individual: ${student.name}`}>
      <div className="student-evolution-detail">
        <section className="student-evolution-summary">
          <div>
            <span>Ritme de millora</span>
            <strong className={`evolution-rhythm ${evolution.rhythm === 'Regressió' ? 'down' : evolution.rhythm === 'Millora' ? 'up' : ''}`}>
              {evolution.rhythm}
            </strong>
          </div>
          <div>
            <span>Nota mitjana actual</span>
            <strong>
              {evolution.grade || '-'} {evolution.average ? <small>({evolution.average.toFixed(2)})</small> : null}
            </strong>
          </div>
        </section>

        <section className="student-evolution-card full">
          <h3>Resum de notes per competències</h3>
          <table className="student-evolution-matrix">
            <thead>
              <tr>
                <th>Competència</th>
                {uts.map((ut) => <th key={ut.id}>{ut.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {evolution.matrix.map((row) => (
                <tr key={row.competency.key}>
                  <td>{row.competency.name}</td>
                  {row.grades.map((grade, index) => (
                    <td key={`${row.competency.key}_${uts[index]?.id}`}>
                      <span className={`grade grade-${grade || 'empty'}`}>{grade || '-'}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="student-evolution-charts">
          <section className="student-evolution-card">
            <h3>Trajectòria temporal</h3>
            <svg className="student-line-chart" viewBox="0 0 100 108" role="img" aria-label="Trajectòria temporal">
              {[0, 1, 2, 3, 4, 5, 6].map((index) => {
                const y =
                  lineChart.top +
                  (index / 6) *
                    (lineChart.bottom - lineChart.top)
                return (
                <g key={y}>
                  <line className="chart-grid-line" x1={lineChart.left} x2={lineChart.right} y1={y} y2={y} />
                  <text className="chart-axis-label" x="10" y={y + 1.5}>
                    {(4 - index * 0.5).toFixed(1).replace('.', ',')}
                  </text>
                </g>
                )
              })}
              {points.map((point, index) => (
                <text
                  className={`chart-axis-label x ${
                    index === 0
                      ? 'x-start'
                      : index === points.length - 1
                        ? 'x-end'
                        : ''
                  }`}
                  key={point.ut.id}
                  x={point.x}
                  y={lineChart.xLabelY}
                >
                  Moment {index + 1}
                </text>
              ))}
              {areaPath && <path className="student-line-area" d={areaPath} />}
              {linePath && <path className="student-line" d={linePath} />}
              {points.map((point, index) => {
                return <circle className="student-line-point" cx={point.x} cy={point.y} key={index} r="1.45" />
              })}
            </svg>
          </section>

          <section className="student-evolution-card">
            <h3>Inici vs final</h3>
            <svg className="student-radar-chart" viewBox="0 0 100 100" role="img" aria-label="Inici vs final">
              {[1, 2, 3, 4].map((level) => {
                const radius = (level / 4) * 34
                const ring = radarRows
                  .map((item) => {
                    const angle = Math.atan2(item.axisY - 50, item.axisX - 50)
                    return `${50 + Math.cos(angle) * radius},${50 + Math.sin(angle) * radius}`
                  })
                  .join(' ')
                return <polygon className="radar-ring" key={level} points={ring} />
              })}
              {radarRows.map((item) => (
                <g key={item.row.competency.key}>
                  <line className="radar-axis" x1="50" x2={item.axisX} y1="50" y2={item.axisY} />
                  <text className="radar-label" x={item.axisX} y={item.axisY}>
                    {item.row.competency.code}
                  </text>
                </g>
              ))}
              {firstPolygon && <polygon className="radar-first" points={firstPolygon} />}
              {lastPolygon && <polygon className="radar-last" points={lastPolygon} />}
              {radarRows.map((item) => (
                <circle className="radar-last-point" cx={item.lastX} cy={item.lastY} key={item.row.competency.key} r="1.05" />
              ))}
            </svg>
            <div className="student-radar-legend">
              <span>Primera evidència</span>
              <strong>Darrera evidència</strong>
            </div>
          </section>
        </div>
      </div>
    </Modal>
  )
}

function ScatterStudentModal({ onClose, profile, state, tasks }) {
  if (!profile) return null

  const competencies = getUtCompetencies(state, state.ui.activeUtId)
  const taskRows = tasks.map((task) => {
    const record = state.taskRecords.find((item) => item.taskId === task.id && item.studentId === profile.student.id)
    return { task, status: record?.status || '' }
  })

  return (
    <Modal onClose={onClose} size="lg" title={`Constància ↔ rendiment: ${profile.student.name}`}>
      <div className="scatter-detail">
        <div className="scatter-detail-grid">
          <article className="scatter-detail-card evaluation">
            <span>Rendiment</span>
            <strong>{profile.evaluation.grade || '-'}</strong>
            <small>Nota mitjana: {profile.evaluation.score || '-'}</small>
          </article>
          <article className="scatter-detail-card tracking">
            <span>Constància</span>
            <strong>{profile.tracking.consistency}%</strong>
            <small>{profile.tracking.done}/{profile.tracking.total} tasques fetes</small>
          </article>
        </div>
        <p className="scatter-detail-reading">
          {profile.tracking.consistency >= 75 && profile.evaluation.score <= 2
            ? 'Lectura: treballa amb constància, però el rendiment indica que necessita suport conceptual.'
            : profile.tracking.consistency < 60 && profile.evaluation.score >= 3
              ? 'Lectura: assoleix, però els hàbits són fràgils. Convé fer seguiment preventiu.'
              : profile.riskScore >= 2
                ? 'Lectura: combina senyals de risc. Cal mirar evidències recents i marcar una acció curta.'
                : 'Lectura: situació ordinària. Mantén seguiment i observa si el patró canvia.'}
        </p>
        <div className="scatter-detail-lists">
          <section>
            <h3>Notes que defineixen el rendiment</h3>
            {competencies.length > 0 ? (
              competencies.map((competency) => {
                const grade = getStudentCompetencyGrade(state, profile.student.id, competency)
                return (
                <div className="scatter-detail-row" key={competency.id}>
                  <span>{competency.name}</span>
                  <strong className={`grade grade-${grade || 'empty'}`}>{grade || '-'}</strong>
                </div>
                )
              })
            ) : (
              <p className="empty-list">Encara no hi ha notes suficients.</p>
            )}
          </section>
          <section>
            <h3>Tasques que defineixen la constància</h3>
            {taskRows.length > 0 ? (
              taskRows.map(({ task, status }) => (
                <div className={`scatter-detail-row task-${status.toLowerCase() || 'empty'}`} key={task.id}>
                  <span>{task.title}</span>
                  <strong>{status || '-'}</strong>
                </div>
              ))
            ) : (
              <p className="empty-list">Aquesta UT encara no té tasques.</p>
            )}
          </section>
        </div>
      </div>
    </Modal>
  )
}

function CriterionDistribution({ distributions, students, setInfo }) {
  return (
    <section className="visual-card criterion-distribution">
      <HelpSectionHeading
        description="El que ja aportava la V1: veure on es concentren A/B/C/D per criteri i UT."
        helpKey="criterionDistribution"
        icon={BarChart3}
        setInfo={setInfo}
        title="Distribució per criteris d’avaluació"
      />
      <div className="criterion-accordion-list">
        {distributions.map((competency) => (
          <article className="criterion-accordion" key={competency.id}>
            <header>
              <span className={`competency-dot ${competency.color}`} />
              <strong>{competency.name}</strong>
            </header>
            <div className="criterion-distribution-grid">
              {competency.uts.map((utRow) => (
                <div className="criterion-ut-row" key={utRow.ut.id}>
                  <strong>{utRow.ut.name}</strong>
                  {utRow.criteria.map((criterion) => {
                    const total = Math.max(students.length, 1)
                    return (
                      <div className="criterion-bar-card" key={criterion.criterion.id}>
                        <span>{criterion.criterion.name}</span>
                        <div className="stacked-bar">
                          {gradeOrder.map((grade) => (
                            <i
                              className={`segment ${grade}`}
                              key={grade}
                              style={{ width: `${(criterion.counts[grade] / total) * 100}%` }}
                            />
                          ))}
                        </div>
                        <small>
                          Exc: {criterion.counts.A} · Risc: {criterion.counts.D}
                        </small>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function ActionList({ title, icon: Icon, profiles, emptyText, helpKey, setInfo }) {
  return (
    <article className="action-list-card">
      {helpKey && setInfo ? (
        <InfoButton label={title} onOpen={() => setInfo({ title, text: chartHelp[helpKey] })} />
      ) : null}
      <header>
        <Icon size={18} />
        <strong>{title}</strong>
      </header>
      {profiles.length === 0 ? (
        <p>{emptyText}</p>
      ) : (
        profiles.slice(0, 6).map((profile) => (
          <div className="action-student-row" key={profile.student.id}>
            <span>{profile.student.name}</span>
            <small>
              {profile.evaluation.grade || '-'} · {profile.tracking.consistency}% · {profile.incidents} incid.
            </small>
          </div>
        ))
      )}
    </article>
  )
}

function getStudentActionReason(profile, kind) {
  if (kind === 'risk') {
    const reasons = []
    if (profile.evaluation.score > 0 && profile.evaluation.score <= 2) reasons.push('rendiment baix')
    if (profile.tracking.consistency < 60) reasons.push('constància baixa')
    if (profile.incidents >= 2) reasons.push('incidències repetides')
    return reasons.length > 0 ? reasons.join(' · ') : 'senyals combinades de risc'
  }
  if (kind === 'concept') return 'fa les tasques, però el rendiment indica dificultat conceptual'
  if (kind === 'habit') return 'té bon rendiment, però els hàbits de treball són fràgils'
  return 'seguiment docent recomanat'
}

function getActionRecommendation(kind) {
  if (kind === 'first') {
    return 'Acció recomanada: començar per aquests alumnes perquè acumulen els senyals més urgents.'
  }
  if (kind === 'agenda') {
    return 'Acció recomanada: revisar quines tasques o incidències expliquen l’avís i decidir si toca agenda, entrevista breu o darrera oportunitat.'
  }
  if (kind === 'progress-up') {
    return 'Acció recomanada: felicitar explícitament el progrés i reforçar què ha fet bé perquè el mantingui.'
  }
  if (kind === 'progress-down') {
    return 'Acció recomanada: fer un toc d’atenció breu i revisar quina competència o UT explica la baixada.'
  }
  if (kind === 'risk') {
    return 'Acció recomanada: entrevista breu, revisar les últimes evidències i marcar una mesura concreta per a la propera UT.'
  }
  if (kind === 'concept') {
    return 'Acció recomanada: no insistir només en “treballar més”; cal reforç conceptual, exemples guiats i comprovació curta de comprensió.'
  }
  if (kind === 'habit') {
    return 'Acció recomanada: pactar rutina de lliurament i fer seguiment preventiu abans que el bon rendiment amagui un hàbit feble.'
  }
  return 'Acció recomanada: revisar el cas i decidir una intervenció breu.'
}

function StudentInsightModal({ insight, onClose }) {
  if (!insight) return null
  const Icon = insight.icon

  return (
    <Modal onClose={onClose} size="lg" title={insight.title}>
      <div className="student-insight-modal">
        <section className={`insight-modal-intro ${insight.kind}`}>
          <Icon size={24} />
          <div>
            <strong>{insight.profiles.length} alumnes detectats</strong>
            <p>{insight.description}</p>
          </div>
        </section>
        <section className="insight-recommendation">
          <strong>Què fer?</strong>
          <p>{getActionRecommendation(insight.kind)}</p>
        </section>
        <div className="insight-student-list">
          {insight.profiles.length === 0 ? (
            <p className="empty-list">Ara mateix no hi ha alumnes en aquesta situació.</p>
          ) : (
            insight.profiles.map((profile) => (
              <article className="insight-student-card" key={profile.student.id}>
                <div>
                  <strong>{profile.student.name}</strong>
                  <span>{getStudentActionReason(profile, insight.kind)}</span>
                </div>
                <div className="insight-student-metrics">
                  <b>{profile.evaluation.grade || '-'}</b>
                  <small>{profile.tracking.consistency}% const.</small>
                  <small>{profile.redPointCount} punts vermells</small>
                  <small>{profile.incidents} incid.</small>
                </div>
                <p className="insight-evidence">
                  Dades: rendiment {profile.evaluation.grade || 'sense dades'} ({profile.evaluation.score || '-'}),
                  constància {profile.tracking.consistency}%, {profile.tracking.missing} no fetes visibles,{' '}
                  {profile.tracking.late} incompletes, {profile.redPointCount} punts vermells i {profile.incidents}{' '}
                  punts negres.
                </p>
              </article>
            ))
          )}
        </div>
      </div>
    </Modal>
  )
}

function TrackingEvidenceModal({ evidence, onClose }) {
  if (!evidence) return null

  return (
    <Modal onClose={onClose} size="lg" title={`Punts de seguiment: ${evidence.profile.student.name}`}>
      <div className="tracking-evidence-modal">
        <section>
          <h3>Punts vermells</h3>
          {evidence.redRows.length === 0 ? (
            <p className="empty-list">No hi ha cap punt vermell registrat per les tasques visibles.</p>
          ) : (
            evidence.redRows.map((row, index) => (
              <article className="evidence-row red" key={`${row.title}_${index}`}>
                <strong>{row.title}</strong>
                <span>{row.detail}</span>
              </article>
            ))
          )}
        </section>
        <section>
          <h3>Punts negres</h3>
          {evidence.blackRows.length === 0 ? (
            <p className="empty-list">No hi ha incidències de comportament registrades.</p>
          ) : (
            evidence.blackRows.map((row, index) => (
              <article className="evidence-row black" key={`${row.title}_${index}`}>
                <strong>{row.title}</strong>
                <span>{row.detail}</span>
              </article>
            ))
          )}
        </section>
      </div>
    </Modal>
  )
}

function ProgressChangePanel({ declinedRows, improvedRows, onSelectStudent, setInfo }) {
  return (
    <section className="visual-card progress-change-panel">
      <HelpSectionHeading
        description="Només notes: detecta qui puja i qui baixa entre la primera i la darrera evidència."
        helpKey="globalTrend"
        icon={TrendingUp}
        setInfo={setInfo}
        title="Alumnes que pugen o baixen"
      />
      <div className="progress-change-grid">
        <article className="progress-change-card down">
          <header>
            <AlertTriangle size={18} />
            <strong>Han baixat</strong>
          </header>
          {declinedRows.length === 0 ? (
            <p>No hi ha baixades clares amb prou evidències.</p>
          ) : (
            declinedRows.slice(0, 6).map((row) => (
              <button className="progress-change-row" key={row.student.id} onClick={() => onSelectStudent(row.student)} type="button">
                <span>{row.student.name}</span>
                <small>
                  {row.first.ut.name} {row.first.grade} → {row.last.ut.name} {row.last.grade}
                </small>
                <b>{row.delta}</b>
              </button>
            ))
          )}
        </article>
        <article className="progress-change-card up">
          <header>
            <CheckCircle2 size={18} />
            <strong>Han pujat</strong>
          </header>
          {improvedRows.length === 0 ? (
            <p>No hi ha pujades clares amb prou evidències.</p>
          ) : (
            improvedRows.slice(0, 6).map((row) => (
              <button className="progress-change-row" key={row.student.id} onClick={() => onSelectStudent(row.student)} type="button">
                <span>{row.student.name}</span>
                <small>
                  {row.first.ut.name} {row.first.grade} → {row.last.ut.name} {row.last.grade}
                </small>
                <b>+{row.delta}</b>
              </button>
            ))
          )}
        </article>
      </div>
    </section>
  )
}

function UtCompetencyOverview({ competencies, setInfo }) {
  return (
    <section className="ut-competency-overview">
      {competencies.map((competency) => (
        <article className="ut-competency-card" key={competency.id}>
          <InfoButton
            label={competency.name}
            onOpen={() => setInfo({ title: competency.name, text: chartHelp.utCompetencies })}
          />
          <header>
            <span className={`competency-dot ${competency.color}`} />
            <strong>{competency.name}</strong>
          </header>
          <div className="ut-competency-score">
            <b>{competency.average || '-'}</b>
            <span>mitjana</span>
          </div>
          <div className="mini-grade-strip">
            {gradeOrder.map((grade) => (
              <span className={`grade-${grade}`} key={grade}>
                {grade}
                <b>{competency.counts[grade]}</b>
              </span>
            ))}
          </div>
          <small>{competency.riskStudents.length} alumnes amb C/D</small>
        </article>
      ))}
    </section>
  )
}

function UtCriterionFocus({ criterionRows, students, setInfo }) {
  const orderedRows = [...criterionRows].sort((a, b) => a.average - b.average)

  return (
    <section className="visual-card ut-criterion-focus">
      <HelpSectionHeading
        description="Ordenats per dificultat per decidir on convé reforçar primer."
        helpKey="utCriteria"
        icon={Target}
        setInfo={setInfo}
        title="Criteris de la UT"
      />
      <div className="ut-criterion-list">
        {orderedRows.map((row) => {
          const total = Math.max(students.length, 1)
          return (
            <article className="ut-criterion-row" key={row.id}>
              <div>
                <span>{row.competency.name}</span>
                <strong>{row.criterion.name}</strong>
              </div>
              <div className="ut-criterion-bar-wrap">
                <div className="stacked-bar">
                  {gradeOrder.map((grade) => (
                    <i
                      className={`segment ${grade}`}
                      key={grade}
                      style={{ width: `${(row.counts[grade] / total) * 100}%` }}
                    />
                  ))}
                </div>
                <small>
                  A:{row.counts.A} · B:{row.counts.B} · C:{row.counts.C} · D:{row.counts.D}
                </small>
              </div>
              <div className="ut-criterion-risk">
                <strong>{row.average || '-'}</strong>
                <span>{row.riskStudents.length} alumnes C/D</span>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function UtStudentFocus({ profiles, setInfo }) {
  const orderedProfiles = [...profiles].sort((a, b) => {
    if (a.evaluation.score !== b.evaluation.score) return a.evaluation.score - b.evaluation.score
    return a.tracking.consistency - b.tracking.consistency
  })

  return (
    <section className="visual-card ut-student-focus">
      <HelpSectionHeading
        description="Prioritza qui té rendiment baix, poca constància o acumulació de tasques no fetes."
        helpKey="utStudents"
        icon={AlertTriangle}
        setInfo={setInfo}
        title="Alumnes a revisar dins la UT"
      />
      <div className="ut-student-focus-list">
        {orderedProfiles.slice(0, 8).map((profile) => (
          <article className={`ut-student-focus-row ${profile.riskScore >= 2 ? 'risk' : ''}`} key={profile.student.id}>
            <div>
              <strong>{profile.student.name}</strong>
              <span>{profile.student.halfGroup || 'Sense mig grup'}</span>
            </div>
            <div className="ut-student-focus-metrics">
              <b>{profile.evaluation.grade || '-'}</b>
              <small>{profile.tracking.consistency}% const.</small>
              <small>{profile.tracking.missing} no fetes</small>
              <small>{profile.incidents} incid.</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function UtTasksSummary({ tasks, taskRecords, students, setInfo }) {
  return (
    <section className="visual-card ut-task-summary">
      <HelpSectionHeading
        description="Seguiment ràpid de les evidències associades a aquesta unitat."
        helpKey="utTasks"
        icon={CheckCircle2}
        setInfo={setInfo}
        title="Tasques de la UT"
      />
      <div className="ut-task-list">
        {tasks.length === 0 ? (
          <p className="empty-list">Aquesta UT encara no té tasques associades.</p>
        ) : (
          tasks.map((task) => {
            const scopedRecords = taskRecords.filter((record) => record.taskId === task.id)
            const done = scopedRecords.filter((record) => record.status === 'DONE').length
            const late = scopedRecords.filter((record) => record.status === 'LATE').length
            const missing = scopedRecords.filter((record) => record.status === 'MISSING').length
            const total = Math.max(students.length, 1)
            return (
              <article className="ut-task-row" key={task.id}>
                <div>
                  <strong>{task.title}</strong>
                  <span>{new Date(task.date).toLocaleDateString('ca-ES')}</span>
                </div>
                <div className="ut-task-progress">
                  <div className="stacked-bar">
                    <i className="segment A" style={{ width: `${(done / total) * 100}%` }} />
                    <i className="segment C" style={{ width: `${(late / total) * 100}%` }} />
                    <i className="segment D" style={{ width: `${(missing / total) * 100}%` }} />
                  </div>
                  <small>{done} fetes · {late} incompletes · {missing} no fetes</small>
                </div>
              </article>
            )
          })
        )}
      </div>
    </section>
  )
}

function UtStatsView({
  activeUt,
  averageConsistency,
  competencies,
  criterionRows,
  info,
  onCloseInfo,
  profiles,
  setInfo,
  students,
  taskRecords,
  tasks,
}) {
  const evaluatedProfiles = profiles.filter((profile) => profile.evaluation.score > 0)
  const averageScore =
    evaluatedProfiles.length === 0
      ? 0
      : Number(
          (
            evaluatedProfiles.reduce((sum, profile) => sum + profile.evaluation.score, 0) / evaluatedProfiles.length
          ).toFixed(2),
        )
  const priorityCriterion = [...criterionRows].filter((row) => row.total > 0).sort((a, b) => a.average - b.average)[0]
  const priorityStudents = profiles.filter(
    (profile) => profile.evaluation.score > 0 && profile.evaluation.score <= 2,
  )
  const highStudents = profiles.filter((profile) => profile.evaluation.score >= 3)

  return (
    <section className="analytics-view">
      <InfoModal info={info} onClose={onCloseInfo} />
      <div className="analytics-hero executive ut-hero">
        <div>
          <Target size={30} />
          <h2>Stats UT · {activeUt?.name || 'UT activa'}</h2>
          <p>Lectura operativa de la unitat: criteris, competències, tasques i alumnes que necessiten reforç.</p>
        </div>
        <MetricCard
          className="highlight"
          help={chartHelp.utSummary}
          label="Mitjana de la UT"
          setInfo={setInfo}
          value={averageScore || '-'}
          helper={`${evaluatedProfiles.length} alumnes amb evidències`}
        />
      </div>

      <div className="analytics-grid">
        <MetricCard
          className="concept"
          help={chartHelp.utCompetencies}
          label="Competències treballades"
          setInfo={setInfo}
          value={competencies.length}
          helper={`${criterionRows.length} criteris actius en aquesta UT.`}
        />
        <MetricCard
          className="danger"
          help={chartHelp.utStudents}
          label="Alumnes a reforçar"
          setInfo={setInfo}
          value={priorityStudents.length}
          helper="Alumnes amb C/D global a la UT."
        />
        <MetricCard
          className="habit"
          help={chartHelp.trackingPulse}
          label="Constància mitjana"
          setInfo={setInfo}
          value={`${averageConsistency}%`}
          helper={`${tasks.length} tasques associades a la UT.`}
        />
      </div>

      <UtCompetencyOverview competencies={competencies} setInfo={setInfo} />

      <div className="analytics-two-column">
        <UtCriterionFocus criterionRows={criterionRows} setInfo={setInfo} students={students} />
        <div className="pedagogical-panel">
          <HelpSectionHeading
            description="Una lectura concreta per decidir què fer a la propera sessió."
            helpKey="utReinforcement"
            icon={Brain}
            setInfo={setInfo}
            title="Proposta de reforç de la UT"
          />
          <div className="pedagogy-cards">
            <article className="pedagogy-card hard">
              <AlertTriangle size={18} />
              <span>Criteri prioritari</span>
              <strong>{priorityCriterion?.criterion.name || '-'}</strong>
            </article>
            <article className="pedagogy-card best">
              <CheckCircle2 size={18} />
              <span>Alumnes amb bon assoliment</span>
              <strong>{highStudents.length}</strong>
            </article>
          </div>
          <p className="recommendation-text">
            {priorityCriterion
              ? `Reforça ${priorityCriterion.criterion.name} dins de ${priorityCriterion.competency.name}. Hi ha ${priorityCriterion.riskStudents.length} alumnes amb C/D en aquest criteri.`
              : 'Encara no hi ha prou evidències per proposar un reforç concret.'}
          </p>
          <p className="recommendation-text soft">
            Combina una activitat curta de recuperació amb una evidència nova i senzilla; així la millora queda registrada dins la mateixa UT.
          </p>
        </div>
      </div>

      <div className="analytics-two-column lower">
        <UtStudentFocus profiles={profiles} setInfo={setInfo} />
        <UtTasksSummary setInfo={setInfo} taskRecords={taskRecords} tasks={tasks} students={students} />
      </div>
    </section>
  )
}

function buildTrackingRows(students, tasks, taskRecords, behaviorEvents) {
  const interventions = buildTrackingInterventions(students, taskRecords, tasks, behaviorEvents)
  const interventionByStudentId = new Map(interventions.map((intervention) => [intervention.student.id, intervention]))

  return students.map((student) => {
    const stats = getStudentTrackingStats(student.id, taskRecords, tasks)
    const redPointCount = getStudentRedPointCount(student, stats)
    const incidents = behaviorEvents.filter((event) => event.studentId === student.id && event.type === 'incident')
    const positives = behaviorEvents.filter((event) => event.studentId === student.id && event.type === 'positive')

    return {
      student,
      stats,
      redPointCount,
      incidents,
      positives,
      intervention: interventionByStudentId.get(student.id),
    }
  })
}

function TrackingPulseCard({ rows, setInfo }) {
  const stable = rows.filter((row) => row.stats.consistency >= 80).length
  const monitor = rows.filter((row) => row.stats.consistency > 0 && row.stats.consistency < 80).length
  const withoutData = rows.filter((row) => row.stats.total === 0).length
  const total = Math.max(rows.length, 1)

  return (
    <article className="diagnosis-card donut-card tracking-pulse-card">
      <InfoButton
        label="Pols del seguiment"
        onOpen={() => setInfo({ title: 'Pols del seguiment', text: chartHelp.trackingPulse })}
      />
      <header>
        <span>Pols del seguiment</span>
        <Radar size={16} />
      </header>
      <div className="donut-wrap">
        <div
          className="donut"
          style={{
            background: `conic-gradient(#22c55e 0 ${(stable / total) * 100}%, #f59e0b ${(stable / total) * 100}% ${
              ((stable + monitor) / total) * 100
            }%, #e5e7eb ${((stable + monitor) / total) * 100}% 100%)`,
          }}
        >
          <strong>{rows.length}</strong>
          <span>Alumnes</span>
        </div>
        <div className="donut-legend">
          <span className="good">Estables: {stable}</span>
          <span className="risk">Seguiment: {monitor}</span>
          <span>Sense dades: {withoutData}</span>
        </div>
      </div>
    </article>
  )
}

function TrackingInterventionPanel({ interventions, setInfo }) {
  const focus = interventions.filter((intervention) => intervention.level !== 'stable').slice(0, 6)

  return (
    <section className="visual-card tracking-action-panel">
      <HelpSectionHeading
        description="Patrons de tasques i comportament, sense barrejar notes d’avaluació."
        helpKey="trackingIntervention"
        icon={Target}
        setInfo={setInfo}
        title="Intervenció de seguiment"
      />
      <div className="tracking-action-list">
        {focus.length === 0 ? (
          <p className="empty-list">Cap alumne necessita intervenció de seguiment destacada ara mateix.</p>
        ) : (
          focus.map((intervention) => (
            <article className={`tracking-action-row ${intervention.level}`} key={intervention.student.id}>
              <div>
                <strong>{intervention.student.name}</strong>
                <span>{intervention.label}</span>
              </div>
              <p>{intervention.reason}</p>
              <small>
                Recent: {intervention.recent.consistency}% · {intervention.redPointCount} vermells ·{' '}
                {intervention.recentIncidents} incidències
              </small>
            </article>
          ))
        )}
      </div>
    </section>
  )
}

function TrackingTaskHeatmap({ tasks, taskRecords, students, setInfo }) {
  return (
    <section className="visual-card tracking-task-heatmap">
      <HelpSectionHeading
        description="Quines tasques han generat més no fetes o incompletes."
        helpKey="trackingTaskMap"
        icon={CheckCircle2}
        setInfo={setInfo}
        title="Mapa de tasques"
      />
      <div className="tracking-task-list">
        {tasks.length === 0 ? (
          <p className="empty-list">Aquesta UT encara no té tasques de seguiment.</p>
        ) : (
          tasks.map((task) => {
            const records = taskRecords.filter((record) => record.taskId === task.id)
            const done = records.filter((record) => record.status === 'DONE').length
            const late = records.filter((record) => record.status === 'LATE').length
            const missing = records.filter((record) => record.status === 'MISSING').length
            const exempt = records.filter((record) => record.status === 'EXEMPT').length
            const total = Math.max(students.length, 1)

            return (
              <article className="tracking-task-card" key={task.id}>
                <div>
                  <strong>{task.title}</strong>
                  <span>{new Date(task.date).toLocaleDateString('ca-ES')}</span>
                </div>
                <div className="tracking-task-bars">
                  <div className="stacked-bar">
                    <i className="segment A" style={{ width: `${(done / total) * 100}%` }} />
                    <i className="segment C" style={{ width: `${(late / total) * 100}%` }} />
                    <i className="segment D" style={{ width: `${(missing / total) * 100}%` }} />
                  </div>
                  <small>
                    {done} fetes · {late} incompletes · {missing} no fetes · {exempt} exempts
                  </small>
                </div>
              </article>
            )
          })
        )}
      </div>
    </section>
  )
}

function TrackingStudentList({ rows, setInfo }) {
  const orderedRows = [...rows].sort((a, b) => {
    if (a.stats.consistency !== b.stats.consistency) return a.stats.consistency - b.stats.consistency
    if (a.redPointCount !== b.redPointCount) return b.redPointCount - a.redPointCount
    return b.incidents.length - a.incidents.length
  })

  return (
    <section className="visual-card tracking-student-ranking">
      <HelpSectionHeading
        description="Ordenats per constància, no fetes i incidències."
        helpKey="trackingStudents"
        icon={AlertTriangle}
        setInfo={setInfo}
        title="Alumnes a mirar primer"
      />
      <div className="tracking-ranking-list">
        {orderedRows.map((row) => (
          <article className={`tracking-ranking-row ${row.intervention?.level || 'stable'}`} key={row.student.id}>
            <div>
              <strong>{row.student.name}</strong>
              <span>{row.student.halfGroup || 'Sense mig grup'} · {row.intervention?.label || 'Estable'}</span>
            </div>
            <div className="tracking-ranking-metrics">
              <b>{row.stats.consistency}%</b>
              <small className={row.redPointCount >= 3 ? 'danger' : ''}>{row.redPointCount} vermells</small>
              <small>{row.stats.late} incompletes</small>
              <small>{row.incidents.length} negres</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function TrackingBehaviorPanel({ rows, setInfo }) {
  const rowsWithEvents = rows.filter((row) => row.incidents.length > 0 || row.positives.length > 0)

  return (
    <section className="visual-card tracking-behavior-panel">
      <HelpSectionHeading
        description="Punts negres i entrades de diari del seguiment."
        helpKey="trackingBehavior"
        icon={Brain}
        setInfo={setInfo}
        title="Comportament i diari"
      />
      <div className="tracking-behavior-list">
        {rowsWithEvents.length === 0 ? (
          <p className="empty-list">Encara no hi ha incidències ni entrades de diari en aquesta UT.</p>
        ) : (
          rowsWithEvents.map((row) => (
            <article className="tracking-behavior-row" key={row.student.id}>
              <strong>{row.student.name}</strong>
              <div>
                <span className="black">{row.incidents.length} punts negres</span>
                <span className="diary">{row.positives.length} diari</span>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}

function TrackingAgendaPanel({ agendaNotes, rows, setInfo }) {
  const trackingNotes = agendaNotes.filter((note) => note.type === 'tracking')
  const noteByStudentId = new Map(trackingNotes.map((note) => [note.studentId, note]))
  const candidates = rows
    .filter(
      (row) =>
        row.redPointCount >= 3 || row.redPointCount + row.incidents.length >= 3 || noteByStudentId.has(row.student.id),
    )
    .sort((a, b) => {
      const noteDiff = Number(noteByStudentId.has(b.student.id)) - Number(noteByStudentId.has(a.student.id))
      if (noteDiff) return noteDiff
      return b.redPointCount + b.incidents.length - (a.redPointCount + a.incidents.length)
    })

  return (
    <section className="visual-card tracking-agenda-panel">
      <HelpSectionHeading
        description="Qui ja té avís d’agenda o està a prop de necessitar-lo."
        helpKey="trackingAgenda"
        icon={MessageSquareText}
        setInfo={setInfo}
        title="Agenda i avisos"
      />
      <div className="tracking-agenda-list">
        {candidates.length === 0 ? (
          <p className="empty-list">Cap alumne acumula prou senyals per valorar avís d’agenda.</p>
        ) : (
          candidates.map((row) => {
            const note = noteByStudentId.get(row.student.id)
            const shouldWarn = row.redPointCount >= 3 || row.redPointCount + row.incidents.length >= 3
            return (
              <article
                className={`tracking-agenda-row ${note ? 'registered' : shouldWarn ? 'warning' : ''}`}
                key={row.student.id}
              >
                <div>
                  <strong>{row.student.name}</strong>
                  <span>{note ? 'Avís registrat' : shouldWarn ? 'Valorar avís' : 'Seguiment preventiu'}</span>
                  {note && <p>{note.text}</p>}
                </div>
                <div className="tracking-ranking-metrics">
                  <small className="danger">{row.redPointCount} vermells</small>
                  <small>{row.incidents.length} negres</small>
                  <small>{row.stats.late} incompletes</small>
                </div>
              </article>
            )
          })
        )}
      </div>
    </section>
  )
}

function TrackingStatsView({ agendaNotes, behaviorEvents, info, onCloseInfo, rows, setInfo, students, taskRecords, tasks }) {
  const averageConsistency =
    rows.length === 0 ? 0 : Math.round(rows.reduce((sum, row) => sum + row.stats.consistency, 0) / rows.length)
  const redPointTotal = rows.reduce((sum, row) => sum + row.redPointCount, 0)
  const missingTotal = rows.reduce((sum, row) => sum + row.stats.missing, 0)
  const lateTotal = rows.reduce((sum, row) => sum + row.stats.late, 0)
  const incidentsTotal = rows.reduce((sum, row) => sum + row.incidents.length, 0)
  const remindersTotal =
    tasks.filter((task) => task.reminder).length + taskRecords.filter((record) => record.reminder).length
  const interventions = buildTrackingInterventions(students, taskRecords, tasks, behaviorEvents)
  const priority = interventions.filter((intervention) => intervention.level === 'priority').length
  const agendaNotesTotal = agendaNotes.filter((note) => note.type === 'tracking').length
  const agendaCandidates = rows.filter((row) => row.redPointCount >= 3 || row.redPointCount + row.incidents.length >= 3).length

  return (
    <section className="analytics-view">
      <InfoModal info={info} onClose={onCloseInfo} />
      <div className="analytics-hero executive tracking-hero">
        <div>
          <Radar size={30} />
          <h2>Stats Seguiment</h2>
          <p>Lectura de constància, tasques, punts vermells, punts negres i intervencions de seguiment.</p>
        </div>
        <MetricCard
          className="highlight"
          help={chartHelp.trackingSummary}
          label="Constància mitjana"
          setInfo={setInfo}
          value={`${averageConsistency}%`}
          helper={`${redPointTotal} punts vermells · ${lateTotal} incompletes`}
        />
      </div>

      <div className="analytics-grid">
        <MetricCard
          className="danger"
          help={chartHelp.trackingTaskMap}
          label="Punts vermells"
          setInfo={setInfo}
          value={redPointTotal}
          helper={`${missingTotal} venen de tasques no fetes visibles.`}
        />
        <MetricCard
          className="habit"
          help={chartHelp.trackingBehavior}
          label="Punts negres"
          setInfo={setInfo}
          value={incidentsTotal}
          helper="Incidències de comportament registrades."
        />
        <MetricCard
          className="concept"
          help={chartHelp.trackingIntervention}
          label="Intervenció prioritària"
          setInfo={setInfo}
          value={priority}
          helper="Alumnes amb patró recent preocupant."
        />
        <MetricCard
          className="warning"
          help={chartHelp.trackingAgenda}
          label="Agenda"
          setInfo={setInfo}
          value={agendaCandidates}
          helper={`${agendaNotesTotal} avisos ja registrats.`}
        />
      </div>

      <section className="global-diagnosis tracking-diagnosis">
        <div className="global-diagnosis-title">
          <Radar size={24} />
          <div>
            <h3>Diagnòstic de seguiment</h3>
            <p>Quins hàbits necessiten intervenció abans que afectin l’aprenentatge?</p>
          </div>
          <InfoButton
            label="Diagnòstic de seguiment"
            onOpen={() => setInfo({ title: 'Diagnòstic de seguiment', text: chartHelp.trackingSummary })}
          />
        </div>
        <div className="diagnosis-grid">
          <TrackingPulseCard rows={rows} setInfo={setInfo} />
          <article className="diagnosis-card priority">
            <InfoButton
              label="Recordatoris actius"
              onOpen={() => setInfo({ title: 'Recordatoris actius', text: chartHelp.trackingReminders })}
            />
            <AlertTriangle size={28} />
            <span>Recordatoris actius</span>
            <strong>{remindersTotal}</strong>
            <small>De classe o individuals</small>
          </article>
          <article className="diagnosis-card balance stable">
            <InfoButton
              label="Tasques incompletes"
              onOpen={() => setInfo({ title: 'Tasques incompletes', text: chartHelp.trackingIncomplete })}
            />
            <header>
              <span>Tasques incompletes</span>
            </header>
            <strong>{lateTotal}</strong>
            <div className="balance-meter">
              <span style={{ width: `${Math.min(100, lateTotal * 12)}%` }} />
            </div>
            <p>Si s’acumulen, poden convertir-se en negatius vermells.</p>
          </article>
          <article className="diagnosis-card trend">
            <InfoButton
              label="Volum de tasques"
              onOpen={() => setInfo({ title: 'Volum de tasques', text: chartHelp.trackingVolume })}
            />
            <header>
              <span>Volum de tasques</span>
              <CheckCircle2 size={16} />
            </header>
            <strong>{tasks.length}</strong>
            <p>Tasques creades a la UT activa.</p>
          </article>
        </div>
      </section>

      <div className="analytics-two-column">
        <TrackingInterventionPanel interventions={interventions} setInfo={setInfo} />
        <TrackingAgendaPanel agendaNotes={agendaNotes} rows={rows} setInfo={setInfo} />
      </div>

      <div className="analytics-two-column">
        <TrackingTaskHeatmap setInfo={setInfo} taskRecords={taskRecords} tasks={tasks} students={students} />
        <TrackingStudentList rows={rows} setInfo={setInfo} />
      </div>

      <div className="analytics-two-column lower">
        <TrackingBehaviorPanel rows={rows} setInfo={setInfo} />
      </div>
    </section>
  )
}

export function AnalyticsView() {
  const state = useAvaluaproStore()
  const [selectedInsight, setSelectedInsight] = useState(null)
  const [selectedInfo, setSelectedInfo] = useState(null)
  const [selectedScatterProfile, setSelectedScatterProfile] = useState(null)
  const [selectedEvolutionStudent, setSelectedEvolutionStudent] = useState(null)
  const [selectedTrackingEvidence, setSelectedTrackingEvidence] = useState(null)
  const [profileSortMode, setProfileSortMode] = useState('intervention')
  const { activeClassId, activeUtId, activeInsight } = state.ui
  const profiles = buildStudentProfiles(state, activeClassId, activeUtId)
  const students = state.students.filter((student) => student.classId === activeClassId)
  const classUts = getClassUts(state, activeClassId)
  const currentTasks = getCurrentTasks(state, activeClassId, activeUtId)
  const currentInsight = insightCopy[activeInsight] || insightCopy.dashboard
  const Icon = currentInsight.icon
  const canonicalCompetencies = buildCanonicalCompetencies(state, classUts)
  const gradeMatrix = buildGradeUtMatrix(state, students, classUts, canonicalCompetencies)
  const trend = buildUtTrend(state, students, classUts)
  const balance = buildCompetencyBalance(state, students, classUts)
  const criterionDistributions = buildCriterionDistributions(state, students, classUts)
  const activeUt = state.uts.find((ut) => ut.id === activeUtId)
  const activeUtCompetencies = getUtCompetencies(state, activeUtId)
  const activeUtCompetencyRows = buildUtCompetencyRows(state, students, activeUtCompetencies)
  const activeUtCriterionRows = buildUtCriterionRows(state, students, activeUtCompetencies)
  const activeBehaviorEvents = state.behaviorEvents.filter((event) => event.classId === activeClassId)
  const trackingRows = buildTrackingRows(students, currentTasks, state.taskRecords, activeBehaviorEvents)
  const atRisk = profiles.filter((profile) => profile.riskScore >= 2)
  const hardworkingLowAchievement = profiles.filter(
    (profile) => profile.tracking.consistency >= 75 && profile.evaluation.score > 0 && profile.evaluation.score <= 2,
  )
  const lowConsistencyGoodAchievement = profiles.filter(
    (profile) => profile.tracking.consistency < 60 && profile.evaluation.score >= 3,
  )
  const averageConsistency =
    profiles.length === 0
      ? 0
      : Math.round(
          profiles.reduce((total, profile) => total + profile.tracking.consistency, 0) / profiles.length,
        )
  const activeUtTracking = students.map((student) =>
    getStudentTrackingStats(student.id, state.taskRecords, currentTasks),
  )
  const lateTotal = activeUtTracking.reduce((sum, item) => sum + item.late, 0)
  const redPointTotal = profiles.reduce((sum, profile) => sum + profile.redPointCount, 0)
  const agendaCandidates = profiles.filter(
    (profile) => profile.redPointCount >= 3 || profile.redPointCount + profile.incidents >= 3,
  )
  const priorityProfiles = sortProfilesByTeachingPriority(profiles)
  const alphabeticalProfiles = [...profiles].sort((a, b) => a.student.name.localeCompare(b.student.name))
  const visibleProfiles = profileSortMode === 'alphabetical' ? alphabeticalProfiles : priorityProfiles
  const topPriority = priorityProfiles.find((profile) => getDecisionPriority(profile) <= 1)
  const topPriorityDecision = topPriority ? getGlobalDecision(topPriority) : null
  const changeRows = buildStudentChangeRows(state, students, classUts)
  const improvedRows = [...changeRows].filter((row) => row.delta > 0).sort((a, b) => b.delta - a.delta)
  const declinedRows = [...changeRows].filter((row) => row.delta < 0).sort((a, b) => a.delta - b.delta)
  const pedagogicalSummary = buildPedagogicalSummary({
    atRisk,
    balance,
    hardworkingLowAchievement,
    lowConsistencyGoodAchievement,
  })
  const insightCards = [
    {
      kind: 'risk',
      title: 'Alumnes en risc',
      description: 'Alumnes amb senyals combinades de baix rendiment, baixa constància o incidències.',
      icon: AlertTriangle,
      profiles: atRisk,
      className: 'danger',
      label: 'Alumnes en risc',
      helper: 'Baix rendiment, baixa constància o incidències acumulades.',
      helpKey: 'riskStudents',
    },
    {
      kind: 'concept',
      title: 'Treballen però no assoleixen',
      description: 'Alumnes constants que necessiten una ajuda més conceptual, no només recordatoris de feina.',
      icon: Brain,
      profiles: hardworkingLowAchievement,
      className: 'concept',
      label: 'Treballen però no assoleixen',
      helper: 'Bon hàbit de tasques amb rendiment baix: ajuda conceptual.',
      helpKey: 'conceptStudents',
    },
    {
      kind: 'habit',
      title: 'Assoleixen però són poc constants',
      description: 'Alumnes amb bon rendiment però hàbits fràgils que poden generar problemes més endavant.',
      icon: TrendingUp,
      profiles: lowConsistencyGoodAchievement,
      className: 'habit',
      label: 'Assoleixen però són poc constants',
      helper: 'Bon resultat amb hàbits fràgils: seguiment preventiu.',
      helpKey: 'habitStudents',
    },
  ]

  if (activeInsight === 'utStats') {
    return (
      <UtStatsView
        activeUt={activeUt}
        averageConsistency={averageConsistency}
        competencies={activeUtCompetencyRows}
        criterionRows={activeUtCriterionRows}
        info={selectedInfo}
        onCloseInfo={() => setSelectedInfo(null)}
        profiles={profiles}
        setInfo={setSelectedInfo}
        students={students}
        taskRecords={state.taskRecords}
        tasks={currentTasks}
      />
    )
  }

  if (activeInsight === 'trackingStats') {
    return (
      <TrackingStatsView
        agendaNotes={state.agendaNotes.filter((note) => note.classId === activeClassId)}
        behaviorEvents={activeBehaviorEvents}
        info={selectedInfo}
        onCloseInfo={() => setSelectedInfo(null)}
        rows={trackingRows}
        setInfo={setSelectedInfo}
        students={students}
        taskRecords={state.taskRecords}
        tasks={currentTasks}
      />
    )
  }

  return (
    <section className="analytics-view">
      <StudentInsightModal insight={selectedInsight} onClose={() => setSelectedInsight(null)} />
      <InfoModal info={selectedInfo} onClose={() => setSelectedInfo(null)} />
      <TrackingEvidenceModal evidence={selectedTrackingEvidence} onClose={() => setSelectedTrackingEvidence(null)} />
      <ScatterStudentModal
        onClose={() => setSelectedScatterProfile(null)}
        profile={selectedScatterProfile}
        state={state}
        tasks={currentTasks}
      />
      <StudentEvolutionModal
        canonicalCompetencies={canonicalCompetencies}
        onClose={() => setSelectedEvolutionStudent(null)}
        state={state}
        student={selectedEvolutionStudent}
        uts={classUts}
      />
      <div className="analytics-hero executive">
        <div>
          <Icon size={30} />
          <h2>{currentInsight.title}</h2>
          <p>{currentInsight.description}</p>
        </div>
        <MetricCard
          className="highlight"
          help={chartHelp.globalSummary}
          label="Constància mitjana"
          setInfo={setSelectedInfo}
          value={`${averageConsistency}%`}
          helper={`${redPointTotal} punts vermells · ${lateTotal} incompletes a la UT activa`}
        />
      </div>

      <GradeUtMatrix matrix={gradeMatrix} setInfo={setSelectedInfo} />

      <section className="global-diagnosis">
        <div className="global-diagnosis-title">
          <Brain size={24} />
          <div>
            <h3>Diagnòstic global de classe</h3>
            <p>En què he d’intervenir? El grup avança equilibradament?</p>
          </div>
          <InfoButton
            label="Diagnòstic global de classe"
            onOpen={() => setSelectedInfo({ title: 'Diagnòstic global de classe', text: chartHelp.globalSummary })}
          />
        </div>
        <div className="diagnosis-grid">
          <BalanceBar balance={balance} setInfo={setSelectedInfo} />
          <TrendCard setInfo={setSelectedInfo} trend={trend} />
          <DonutCard profiles={profiles} setInfo={setSelectedInfo} />
          <PriorityCard balance={balance} setInfo={setSelectedInfo} />
        </div>
      </section>

      <div className="analytics-grid">
        {insightCards.map((card) => (
          <MetricCard
            className={card.className}
            help={chartHelp[card.helpKey]}
            key={card.kind}
            onClick={() => setSelectedInsight(card)}
            setInfo={setSelectedInfo}
            label={card.label}
            value={card.profiles.length}
            helper={card.helper}
          />
        ))}
      </div>

      <section className="global-action-strip" aria-label="Decisions ràpides de Stats Globals">
        <button
          className={`global-action-card ${topPriorityDecision?.tone || 'stable'}`}
          onClick={() =>
            setSelectedInsight({
              kind: 'first',
              title: 'Mirar primer',
              description: 'Alumnes amb més prioritat segons la combinació de rendiment, hàbits i incidències.',
              icon: AlertTriangle,
              profiles: priorityProfiles.filter((profile) => getDecisionPriority(profile) <= 1).slice(0, 8),
            })
          }
          type="button"
        >
          <span>Mirar primer</span>
          <strong>{topPriority?.student.name || 'Cap prioritat crítica'}</strong>
          <small>{topPriorityDecision?.text || 'El grup no mostra cap senyal urgent combinat.'}</small>
        </button>
        <button
          className="global-action-card warning"
          onClick={() =>
            setSelectedInsight({
              kind: 'agenda',
              title: 'Agenda / seguiment',
              description: 'Alumnes amb punts vermells o combinació de punts vermells i incidències.',
              icon: MessageSquareText,
              profiles: agendaCandidates,
            })
          }
          type="button"
        >
          <span>Agenda / seguiment</span>
          <strong>{agendaCandidates.length}</strong>
          <small>
            {agendaCandidates.length > 0
              ? 'Alumnes amb prou punts vermells o combinació de vermells i incidències.'
              : 'Sense alumnes que demanin agenda ara mateix.'}
          </small>
        </button>
        <button
          className="global-action-card concept"
          onClick={() =>
            setSelectedInsight({
              kind: 'concept',
              title: 'Reforç més probable',
              description: 'Alumnes constants que, tot i treballar, no acaben d’assolir.',
              icon: Brain,
              profiles: hardworkingLowAchievement,
            })
          }
          type="button"
        >
          <span>Reforç més probable</span>
          <strong>{balance.weakest?.name || '-'}</strong>
          <small>{hardworkingLowAchievement.length} alumnes constants amb rendiment baix.</small>
        </button>
        <button
          className="global-action-card habit"
          onClick={() =>
            setSelectedInsight({
              kind: 'habit',
              title: 'Prevenció d’hàbits',
              description: 'Alumnes amb bon rendiment però constància fràgil.',
              icon: TrendingUp,
              profiles: lowConsistencyGoodAchievement,
            })
          }
          type="button"
        >
          <span>Prevenció d’hàbits</span>
          <strong>{lowConsistencyGoodAchievement.length}</strong>
          <small>Alumnes que assoleixen però no consoliden constància.</small>
        </button>
      </section>

      <div className="profile-table-wrap full-width-analysis">
          <div className="section-heading">
            <LineChart size={20} />
            <div>
              <h3>Anàlisi creuada</h3>
              <p>Rendiment acadèmic, hàbits de treball i comportament vistos conjuntament.</p>
            </div>
            <div className="profile-sort-toggle" aria-label="Ordenar alumnes">
              <ListFilter size={16} />
              <button
                className={profileSortMode === 'intervention' ? 'active' : ''}
                onClick={() => setProfileSortMode('intervention')}
                type="button"
              >
                Intervenció
              </button>
              <button
                className={profileSortMode === 'alphabetical' ? 'active' : ''}
                onClick={() => setProfileSortMode('alphabetical')}
                type="button"
              >
                A-Z
              </button>
            </div>
            <InfoButton
              label="Anàlisi creuada"
              onOpen={() => setSelectedInfo({ title: 'Anàlisi creuada', text: chartHelp.crossAnalysis })}
            />
          </div>
          <table className="profile-table">
            <thead>
              <tr>
                <th>Alumne</th>
                <th>Rendiment</th>
                <th>Constància</th>
                <th>Punts vermells</th>
                <th>Punts negres</th>
                <th>Perfil</th>
                <th>Acció</th>
              </tr>
            </thead>
            <tbody>
              {visibleProfiles.map((profile) => {
                const decision = getGlobalDecision(profile)
                const evidence = buildTrackingEvidence(profile, state, currentTasks, activeBehaviorEvents)
                return (
                  <tr
                    className={`profile-analysis-row ${
                      decision.tone === 'danger' || decision.tone === 'warning'
                        ? 'risk'
                        : decision.tone === 'stable'
                          ? 'stable'
                          : 'monitor'
                    }`}
                    key={profile.student.id}
                  >
                    <td>
                      <strong>{profile.student.name}</strong>
                      <small>{profile.student.halfGroup}</small>
                    </td>
                    <td>
                      <div className="evaluation-cell-actions">
                        <span className={`grade grade-${profile.evaluation.grade || 'empty'}`}>
                          {profile.evaluation.grade || '-'}
                        </span>
                        <button
                          className="mini-detail-button"
                          onClick={() => setSelectedEvolutionStudent(profile.student)}
                          title="Veure evolució individual"
                          type="button"
                        >
                          <LineChart size={15} />
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className={`progress-line compact ${profile.tracking.consistency < 60 ? 'low' : ''}`}>
                        <span style={{ width: `${profile.tracking.consistency}%` }} />
                      </div>
                      <b className="consistency-badge">{profile.tracking.consistency}%</b>
                    </td>
                    <td>
                      <button
                        className={`data-pill clickable ${profile.redPointCount > 0 ? 'danger' : 'ok'}`}
                        onClick={() => setSelectedTrackingEvidence({ profile, ...evidence })}
                        type="button"
                      >
                        {profile.redPointCount}
                      </button>
                    </td>
                    <td>
                      <button
                        className={`data-pill clickable ${profile.incidents > 0 ? 'dark' : 'ok'}`}
                        onClick={() => setSelectedTrackingEvidence({ profile, ...evidence })}
                        type="button"
                      >
                        {profile.incidents}
                      </button>
                    </td>
                    <td>
                      <span className={`decision-pill ${decision.tone}`}>{decision.label}</span>
                    </td>
                    <td>
                      <span className="decision-text">{decision.text}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
      </div>

      <div className="pedagogical-panel full-width-analysis">
          <HelpSectionHeading
            description="Conclusions i recomanacions accionables."
            helpKey="pedagogicalAnalysis"
            icon={Brain}
            setInfo={setSelectedInfo}
            title="Anàlisi pedagògica"
          />
          <div className="pedagogy-cards">
            <article className="pedagogy-card best">
              <CheckCircle2 size={18} />
              <span>Millor competència</span>
              <strong>{balance.best?.name || '-'}</strong>
            </article>
            <article className="pedagogy-card hard">
              <AlertTriangle size={18} />
              <span>Més dificultat</span>
              <strong>{balance.weakest?.name || '-'}</strong>
            </article>
          </div>
          <button
            className="recommendation-text clickable"
            onClick={() =>
              setSelectedInsight({
                kind: 'risk',
                title: 'Risc combinat',
                description: pedagogicalSummary.recommendation,
                icon: AlertTriangle,
                profiles: atRisk,
              })
            }
            type="button"
          >
            {pedagogicalSummary.recommendation}
          </button>
          <button
            className="recommendation-text soft clickable"
            onClick={() =>
              setSelectedInsight({
                kind: 'concept',
                title: 'Suport conceptual',
                description: pedagogicalSummary.hiddenNeed,
                icon: Brain,
                profiles: hardworkingLowAchievement,
              })
            }
            type="button"
          >
            {pedagogicalSummary.hiddenNeed}
          </button>
          <button
            className="recommendation-text soft clickable"
            onClick={() =>
              setSelectedInsight({
                kind: 'habit',
                title: 'Hàbits fràgils',
                description: pedagogicalSummary.habitWarning,
                icon: TrendingUp,
                profiles: lowConsistencyGoodAchievement,
              })
            }
            type="button"
          >
            {pedagogicalSummary.habitWarning}
          </button>
      </div>

      <div className="analytics-two-column lower">
        <ScatterCard
          onSelectProfile={setSelectedScatterProfile}
          profiles={profiles}
          setInfo={setSelectedInfo}
        />
        <ProgressChangePanel
          declinedRows={declinedRows}
          improvedRows={improvedRows}
          onSelectStudent={setSelectedEvolutionStudent}
          setInfo={setSelectedInfo}
        />
      </div>

      <div className="analytics-two-column lower">
        <div className="action-list-grid">
          <ActionList
            emptyText="Cap alumne combina prou senyals de risc."
            helpKey="actionLists"
            icon={AlertTriangle}
            profiles={atRisk}
            setInfo={setSelectedInfo}
            title="Qui necessita ajuda?"
          />
          <ActionList
            emptyText="Cap cas clar de constància alta amb rendiment baix."
            helpKey="actionLists"
            icon={Brain}
            profiles={hardworkingLowAchievement}
            setInfo={setSelectedInfo}
            title="Qui treballa però no assoleix?"
          />
          <ActionList
            emptyText="Cap cas clar de bon rendiment amb baixa constància."
            helpKey="actionLists"
            icon={TrendingUp}
            profiles={lowConsistencyGoodAchievement}
            setInfo={setSelectedInfo}
            title="Qui assoleix però és poc constant?"
          />
        </div>
      </div>

      <CriterionDistribution distributions={criterionDistributions} setInfo={setSelectedInfo} students={students} />
    </section>
  )
}
