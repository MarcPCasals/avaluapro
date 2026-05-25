import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  ClipboardList,
  Eye,
  FileDown,
  Filter,
  GraduationCap,
  Layers3,
  TrendingDown,
  UsersRound,
} from 'lucide-react'
import { Modal } from '../../components/Modal'
import { SUBJECT_AREAS, SUBJECT_STRUCTURES } from '../../data/subjects'
import { GRADE_OPTIONS, calculateGrade, getNumericFromGrade, gradeClassName, gradeTextClassName } from '../../lib/grades'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'

const TUTORING_RECORD_TYPES = [
  { id: 'agenda', label: 'Notes a l’agenda', tone: 'amber' },
  { id: 'incident', label: 'Fulls d’incidents', tone: 'red' },
  { id: 'classroom-expulsion', label: 'Expulsions d’aula', tone: 'violet' },
  { id: 'center-expulsion', label: 'Expulsions de centre', tone: 'slate' },
]

function countByType(records, type) {
  return records.filter((record) => record.type === type).length
}

function getSubjectArea(subjectName) {
  return SUBJECT_AREAS.find((area) => area.subjects.includes(subjectName))
}

function getSubjectOptionsForArea(areaFilter) {
  const areas = SUBJECT_AREAS.filter((area) => area.id !== 'tutorial')
  return areas
    .filter((area) => areaFilter === 'all' || area.id === areaFilter)
    .flatMap((area) =>
      area.subjects
        .filter((subject) => SUBJECT_STRUCTURES[subject])
        .map((subject) => ({
          subject,
          areaId: area.id,
          areaName: area.name,
          structure: SUBJECT_STRUCTURES[subject],
        })),
    )
}

function getAllTutorialSubjectOptions() {
  return getSubjectOptionsForArea('all')
}

function buildTutorialCompetencies(subject) {
  const structure = SUBJECT_STRUCTURES[subject] || []
  return structure.map((competency, competencyIndex) => ({
    ...competency,
    key: `${subject}__c${competencyIndex + 1}`,
    subject,
    competencyIndex,
    criteria: competency.criteria.map((criterion, criterionIndex) => ({
      key: `${subject}__c${competencyIndex + 1}__ca${criterionIndex + 1}`,
      name: criterion,
      order: criterionIndex + 1,
    })),
  }))
}

function getTutorialMark(tutorialMarks, classId, studentId, subject, criterionKey) {
  return (
    tutorialMarks.find(
      (mark) =>
        mark.classId === classId &&
        mark.studentId === studentId &&
        mark.subject === subject &&
        mark.criterionKey === criterionKey,
    )?.value || ''
  )
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '-'
  return `${Math.round(value)}%`
}

function isNotDeveloped(grade) {
  return grade === 'D' || grade === 'NA'
}

function average(values) {
  const cleanValues = values.filter((value) => Number.isFinite(value) && value > 0)
  if (cleanValues.length === 0) return 0
  return cleanValues.reduce((total, value) => total + value, 0) / cleanValues.length
}

function summarizeTutorialData({ classId, students, tutorialMarks }) {
  const subjectOptions = getAllTutorialSubjectOptions()
  const areaBuckets = new Map()
  const subjectBuckets = new Map()
  const studentProfiles = students.map((student) => {
    const evaluatedCompetencies = []

    subjectOptions.forEach((subjectOption) => {
      buildTutorialCompetencies(subjectOption.subject).forEach((competency) => {
        const criterionValues = competency.criteria.map((criterion) =>
          getTutorialMark(tutorialMarks, classId, student.id, subjectOption.subject, criterion.key),
        )
        const grade = calculateGrade(criterionValues)
        if (!grade) return

        const score = getNumericFromGrade(grade)
        const row = {
          areaId: subjectOption.areaId,
          areaName: subjectOption.areaName,
          subject: subjectOption.subject,
          competencyName: competency.name,
          grade,
          score,
          notDeveloped: isNotDeveloped(grade),
        }
        evaluatedCompetencies.push(row)

        const areaBucket = areaBuckets.get(subjectOption.areaId) || {
          id: subjectOption.areaId,
          name: subjectOption.areaName,
          scores: [],
          notDeveloped: 0,
          evaluated: 0,
        }
        areaBucket.scores.push(score)
        areaBucket.notDeveloped += row.notDeveloped ? 1 : 0
        areaBucket.evaluated += 1
        areaBuckets.set(subjectOption.areaId, areaBucket)

        const subjectBucket = subjectBuckets.get(subjectOption.subject) || {
          subject: subjectOption.subject,
          areaName: subjectOption.areaName,
          scores: [],
          notDeveloped: 0,
          evaluated: 0,
        }
        subjectBucket.scores.push(score)
        subjectBucket.notDeveloped += row.notDeveloped ? 1 : 0
        subjectBucket.evaluated += 1
        subjectBuckets.set(subjectOption.subject, subjectBucket)
      })
    })

    const notDevelopedCount = evaluatedCompetencies.filter((item) => item.notDeveloped).length
    const averageScore = average(evaluatedCompetencies.map((item) => item.score))
    const notDevelopedPercent =
      evaluatedCompetencies.length > 0 ? (notDevelopedCount / evaluatedCompetencies.length) * 100 : 0
    const weakestAreas = Object.values(
      evaluatedCompetencies.reduce((areas, item) => {
        const current = areas[item.areaId] || { name: item.areaName, scores: [], notDeveloped: 0, evaluated: 0 }
        current.scores.push(item.score)
        current.notDeveloped += item.notDeveloped ? 1 : 0
        current.evaluated += 1
        return { ...areas, [item.areaId]: current }
      }, {}),
    )
      .map((area) => ({ ...area, averageScore: average(area.scores) }))
      .sort((a, b) => a.averageScore - b.averageScore || b.notDeveloped - a.notDeveloped)

    return {
      student,
      evaluatedCompetencies,
      evaluatedCount: evaluatedCompetencies.length,
      notDevelopedCount,
      notDevelopedPercent,
      averageScore,
      weakestArea: weakestAreas[0] || null,
    }
  })

  const evaluatedCount = studentProfiles.reduce((total, profile) => total + profile.evaluatedCount, 0)
  const notDevelopedCount = studentProfiles.reduce((total, profile) => total + profile.notDevelopedCount, 0)
  const riskProfiles = studentProfiles
    .filter(
      (profile) =>
        profile.evaluatedCount > 0 &&
        (profile.notDevelopedPercent >= 30 || profile.notDevelopedCount >= 2 || profile.averageScore <= 2),
    )
    .sort(
      (a, b) =>
        b.notDevelopedPercent - a.notDevelopedPercent ||
        b.notDevelopedCount - a.notDevelopedCount ||
        a.student.name.localeCompare(b.student.name, 'ca'),
    )
  const areaSummaries = [...areaBuckets.values()]
    .map((area) => ({
      ...area,
      averageScore: average(area.scores),
      notDevelopedPercent: area.evaluated > 0 ? (area.notDeveloped / area.evaluated) * 100 : 0,
    }))
    .sort((a, b) => a.averageScore - b.averageScore || b.notDevelopedPercent - a.notDevelopedPercent)
  const subjectSummaries = [...subjectBuckets.values()]
    .map((subject) => ({
      ...subject,
      averageScore: average(subject.scores),
      notDevelopedPercent: subject.evaluated > 0 ? (subject.notDeveloped / subject.evaluated) * 100 : 0,
    }))
    .sort((a, b) => a.averageScore - b.averageScore || b.notDevelopedPercent - a.notDevelopedPercent)

  return {
    evaluatedCount,
    notDevelopedCount,
    notDevelopedPercent: evaluatedCount > 0 ? (notDevelopedCount / evaluatedCount) * 100 : 0,
    studentProfiles,
    riskProfiles,
    areaSummaries,
    subjectSummaries,
    weakestArea: areaSummaries[0] || null,
    weakestSubject: subjectSummaries[0] || null,
  }
}

function SubjectCatalogCard({ item, onSelect }) {
  return (
    <article className="tutorial-subject-card">
      <div>
        <strong>{item.subject}</strong>
        <small>{item.areaName}</small>
      </div>
      <span>{item.structure.length} competències</span>
      <button className="secondary-action compact" onClick={() => onSelect(item.subject)} type="button">
        Treballar
      </button>
    </article>
  )
}

function TutorialStatsCard({ icon: Icon, label, value, detail, tone = 'neutral', onClick }) {
  const Component = onClick ? 'button' : 'article'
  return (
    <Component className={`tutorial-stat-card ${tone}`} onClick={onClick} type={onClick ? 'button' : undefined}>
      <Icon size={20} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
      {onClick && <em>Consultar</em>}
    </Component>
  )
}

function TutorialStudentProfileModal({ profile, onClose }) {
  if (!profile) return null

  const groupedByArea = Object.values(
    profile.evaluatedCompetencies.reduce((areas, item) => {
      const area = areas[item.areaId] || { name: item.areaName, rows: [] }
      area.rows.push(item)
      return { ...areas, [item.areaId]: area }
    }, {}),
  )

  return (
    <Modal onClose={onClose} size="xl" title={`Perfil tutorial: ${profile.student.name}`}>
      <div className="tutorial-profile-modal">
        <section className="tutorial-profile-summary">
          <article>
            <span>Competències avaluades</span>
            <strong>{profile.evaluatedCount}</strong>
          </article>
          <article className={profile.notDevelopedCount > 0 ? 'warning' : 'ok'}>
            <span>No assolides</span>
            <strong>{profile.notDevelopedCount}</strong>
          </article>
          <article>
            <span>% no assolides</span>
            <strong>{formatPercent(profile.notDevelopedPercent)}</strong>
          </article>
          <article>
            <span>Àrea més delicada</span>
            <strong>{profile.weakestArea?.name || '-'}</strong>
          </article>
        </section>

        {profile.evaluatedCount === 0 ? (
          <div className="empty-state compact">Encara no hi ha notes tutorials per aquest alumne.</div>
        ) : (
          <div className="tutorial-profile-area-list">
            {groupedByArea.map((area) => (
              <section key={area.name}>
                <h3>{area.name}</h3>
                {area.rows.map((row) => (
                  <div className={`tutorial-profile-row ${row.notDeveloped ? 'risk' : ''}`} key={`${row.subject}_${row.competencyName}`}>
                    <div>
                      <strong>{row.subject}</strong>
                      <span>{row.competencyName}</span>
                    </div>
                    <span className={gradeClassName(row.grade)}>{row.grade}</span>
                  </div>
                ))}
              </section>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

export function TutoringView() {
  const [activePanel, setActivePanel] = useState('evaluation')
  const [areaFilter, setAreaFilter] = useState('all')
  const [subjectFilter, setSubjectFilter] = useState('auto')
  const [selectedTutorialProfileId, setSelectedTutorialProfileId] = useState('')
  const activeClassId = useAvaluaproStore((state) => state.ui.activeClassId)
  const classes = useAvaluaproStore((state) => state.classes)
  const students = useAvaluaproStore((state) => state.students)
  const tutorialRecords = useAvaluaproStore((state) => state.tutorialRecords)
  const tutorialMarks = useAvaluaproStore((state) => state.tutorialMarks)
  const updateTutorialMark = useAvaluaproStore((state) => state.updateTutorialMark)
  const activeClass = classes.find((classItem) => classItem.id === activeClassId)
  const linkedClassId = activeClass?.tutorialLinkedClassId || activeClass?.id
  const linkedClass = classes.find((classItem) => classItem.id === linkedClassId) || activeClass
  const classStudents = students
    .filter((student) => student.classId === linkedClassId)
    .sort((a, b) => a.name.localeCompare(b.name, 'ca'))
  const classTutorialRecords = tutorialRecords.filter((record) => record.classId === activeClassId)
  const subjectOptions = useMemo(() => getSubjectOptionsForArea(areaFilter), [areaFilter])
  const autoSubject =
    linkedClass?.subject && SUBJECT_STRUCTURES[linkedClass.subject] ? linkedClass.subject : subjectOptions[0]?.subject
  const selectedSubject = subjectFilter === 'auto' ? autoSubject : subjectFilter
  const selectedSubjectArea = getSubjectArea(selectedSubject)
  const selectedCompetencies = useMemo(() => buildTutorialCompetencies(selectedSubject), [selectedSubject])
  const selectedCriteria = selectedCompetencies.flatMap((competency) =>
    competency.criteria.map((criterion) => ({ ...criterion, competency })),
  )
  const tutorialSummary = useMemo(
    () => summarizeTutorialData({ classId: activeClassId, students: classStudents, tutorialMarks }),
    [activeClassId, classStudents, tutorialMarks],
  )
  const selectedTutorialProfile = tutorialSummary.studentProfiles.find(
    (profile) => profile.student.id === selectedTutorialProfileId,
  )

  return (
    <section className="tutoring-view">
      <header className="tutoring-hero">
        <div>
          <span className="section-kicker">
            <GraduationCap size={17} />
            Mode tutoria
          </span>
          <h1>{activeClass?.name || 'Tutoria'}</h1>
          <p>
            Espai per recollir la visió global del grup: dades acadèmiques de totes les assignatures,
            seguiment tutorial i perfil individual de cada alumne.
          </p>
        </div>
        <aside>
          <strong>{classStudents.length}</strong>
          <span>alumnes vinculats</span>
          <small>Dades compartides amb {linkedClass?.name || 'la classe activa'}</small>
        </aside>
      </header>

      <div className="tutoring-panel-tabs" aria-label="Vistes de tutoria">
        <button
          className={activePanel === 'evaluation' ? 'active' : ''}
          onClick={() => setActivePanel('evaluation')}
          type="button"
        >
          <BookOpenCheck size={17} />
          Avaluació tutorial
        </button>
        <button
          className={activePanel === 'tracking' ? 'active' : ''}
          onClick={() => setActivePanel('tracking')}
          type="button"
        >
          <ClipboardList size={17} />
          Seguiment tutorial
        </button>
        <button
          className={activePanel === 'profile' ? 'active' : ''}
          onClick={() => setActivePanel('profile')}
          type="button"
        >
          <UsersRound size={17} />
          Perfil i PDF
        </button>
      </div>

      {activePanel === 'evaluation' && (
        <section className="tutorial-evaluation-panel">
          <div className="tutorial-stats-grid">
            <TutorialStatsCard
              detail={`${tutorialSummary.notDevelopedCount} de ${tutorialSummary.evaluatedCount} competències avaluades`}
              icon={TrendingDown}
              label="Competències no assolides"
              tone={tutorialSummary.notDevelopedPercent >= 30 ? 'risk' : 'neutral'}
              value={tutorialSummary.evaluatedCount > 0 ? formatPercent(tutorialSummary.notDevelopedPercent) : '-'}
            />
            <TutorialStatsCard
              detail={
                tutorialSummary.weakestArea
                  ? `${tutorialSummary.weakestArea.notDeveloped} no assolides · mitjana ${tutorialSummary.weakestArea.averageScore.toFixed(2)}`
                  : 'Encara no hi ha prou dades'
              }
              icon={BarChart3}
              label="Àrea amb més dificultat"
              tone="amber"
              value={tutorialSummary.weakestArea?.name || '-'}
            />
            <TutorialStatsCard
              detail="Baix assoliment o acumulació de competències no assolides"
              icon={AlertTriangle}
              label="Alumnes a mirar"
              onClick={() => setActivePanel('profile')}
              tone={tutorialSummary.riskProfiles.length > 0 ? 'risk' : 'ok'}
              value={tutorialSummary.riskProfiles.length}
            />
            <TutorialStatsCard
              detail="Competències amb alguna nota tutorial registrada"
              icon={Eye}
              label="Cobertura de dades"
              tone="blue"
              value={tutorialSummary.evaluatedCount}
            />
          </div>

          {tutorialSummary.evaluatedCount > 0 && (
            <div className="tutorial-insight-grid">
              <article className="tutoring-card compact">
                <div>
                  <Layers3 size={22} />
                  <h2>Àrees de dificultat</h2>
                </div>
                <div className="tutorial-insight-list">
                  {tutorialSummary.areaSummaries.slice(0, 4).map((area) => (
                    <div className="tutorial-insight-row" key={area.id}>
                      <strong>{area.name}</strong>
                      <span>{formatPercent(area.notDevelopedPercent)} no assolides</span>
                      <small>Mitjana {area.averageScore.toFixed(2)}</small>
                    </div>
                  ))}
                </div>
              </article>

              <article className="tutoring-card compact">
                <div>
                  <BookOpenCheck size={22} />
                  <h2>Assignatures a revisar</h2>
                </div>
                <div className="tutorial-insight-list">
                  {tutorialSummary.subjectSummaries.slice(0, 5).map((subject) => (
                    <div className="tutorial-insight-row" key={subject.subject}>
                      <strong>{subject.subject}</strong>
                      <span>{formatPercent(subject.notDevelopedPercent)} no assolides</span>
                      <small>{subject.areaName}</small>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          )}

          <div className="tutorial-filter-bar">
            <label>
              Àrea
              <select
                onChange={(event) => {
                  setAreaFilter(event.target.value)
                  setSubjectFilter('auto')
                }}
                value={areaFilter}
              >
                <option value="all">Totes les àrees</option>
                {SUBJECT_AREAS.filter((area) => area.id !== 'tutorial').map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Assignatura
              <select onChange={(event) => setSubjectFilter(event.target.value)} value={subjectFilter}>
                <option value="auto">Assignatura vinculada o primera disponible</option>
                {subjectOptions.map((item) => (
                  <option key={item.subject} value={item.subject}>
                    {item.subject}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="tutorial-subject-overview">
            {subjectOptions.map((item) => (
              <SubjectCatalogCard item={item} key={item.subject} onSelect={setSubjectFilter} />
            ))}
          </div>

          <article className="tutorial-mark-grid-card">
            <header>
              <span className="section-kicker">
                <Layers3 size={17} />
                {selectedSubjectArea?.name || 'Àrea'}
              </span>
              <div>
                <h2>{selectedSubject || 'Assignatura'}</h2>
                <p>
                  Posa la nota dels criteris per tenir una visió tutorial de totes les competències de l’alumne.
                  Aquestes notes es guarden separades de l’avaluació ordinària de cada UT.
                </p>
              </div>
            </header>

            {classStudents.length === 0 ? (
              <div className="empty-state compact">Afegeix alumnes a la classe vinculada per començar a posar notes.</div>
            ) : selectedCriteria.length === 0 ? (
              <div className="empty-state compact">Aquesta assignatura encara no té competències configurades.</div>
            ) : (
              <div className="tutorial-mark-table-wrap">
                <table className="tutorial-mark-table">
                  <thead>
                    <tr>
                      <th>Alumne</th>
                      {selectedCriteria.map(({ competency, ...criterion }) => (
                        <th key={criterion.key}>
                          <span>{competency.name}</span>
                          <strong>{criterion.name}</strong>
                        </th>
                      ))}
                      <th>Resultat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.map((student) => {
                      const rowValues = selectedCriteria.map((criterion) =>
                        getTutorialMark(tutorialMarks, activeClassId, student.id, selectedSubject, criterion.key),
                      )
                      const finalGrade = calculateGrade(rowValues)

                      return (
                        <tr key={student.id}>
                          <th>
                            <button
                              className="tutorial-student-link"
                              onClick={() => setSelectedTutorialProfileId(student.id)}
                              type="button"
                            >
                              <span>{student.name}</span>
                              <small>{student.halfGroup || 'Sense mig grup'}</small>
                            </button>
                          </th>
                          {selectedCriteria.map((criterion) => {
                            const value = getTutorialMark(
                              tutorialMarks,
                              activeClassId,
                              student.id,
                              selectedSubject,
                              criterion.key,
                            )
                            return (
                              <td key={`${student.id}_${criterion.key}`}>
                                <select
                                  className={gradeTextClassName(value)}
                                  onChange={(event) =>
                                    updateTutorialMark({
                                      classId: activeClassId,
                                      studentId: student.id,
                                      subject: selectedSubject,
                                      criterionKey: criterion.key,
                                      value: event.target.value,
                                    })
                                  }
                                  value={value}
                                >
                                  {GRADE_OPTIONS.map((option) => (
                                    <option key={option} value={option}>
                                      {option || '-'}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            )
                          })}
                          <td>
                            <span className={gradeClassName(finalGrade)}>{finalGrade || '-'}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </section>
      )}

      {activePanel === 'tracking' && (
        <div className="tutoring-grid">
          <article className="tutoring-card">
          <div>
            <Filter size={24} />
            <h2>Seguiment tutorial</h2>
          </div>
          <p>
            Aquí es registraran notes a l’agenda, fulls d’incidents, expulsions d’aula i expulsions de centre.
          </p>
          <div className="tutorial-record-summary">
            {TUTORING_RECORD_TYPES.map((type) => (
              <span className={`tutorial-record-pill ${type.tone}`} key={type.id}>
                <strong>{countByType(classTutorialRecords, type.id)}</strong>
                {type.label}
              </span>
            ))}
          </div>
        </article>
        </div>
      )}

      {activePanel === 'profile' && (
        <section className="tutorial-profile-panel">
          <article className="tutoring-card">
            <div>
              <UsersRound size={24} />
              <h2>Perfils tutorials</h2>
            </div>
            <p>
              Consulta el resum de cada alumne amb competències no assolides, àrees delicades i evidències
              preparades per al futur PDF.
            </p>
            {tutorialSummary.studentProfiles.length === 0 ? (
              <div className="empty-state compact">Afegeix alumnes per començar a preparar perfils tutorials.</div>
            ) : (
              <div className="tutorial-student-profile-list">
                {tutorialSummary.studentProfiles.map((profile) => (
                  <button
                    className={`tutorial-student-profile-row ${profile.notDevelopedCount > 0 ? 'risk' : ''}`}
                    key={profile.student.id}
                    onClick={() => setSelectedTutorialProfileId(profile.student.id)}
                    type="button"
                  >
                    <div>
                      <strong>{profile.student.name}</strong>
                      <small>{profile.weakestArea?.name || 'Sense àrea delicada detectada'}</small>
                    </div>
                    <span>{profile.evaluatedCount} comp.</span>
                    <span>{profile.notDevelopedCount} no assolides</span>
                    <em>{profile.evaluatedCount > 0 ? formatPercent(profile.notDevelopedPercent) : '-'}</em>
                  </button>
                ))}
              </div>
            )}
          </article>

          <article className="tutoring-card muted">
            <div>
              <FileDown size={24} />
              <h2>PDF de tutoria</h2>
            </div>
            <p>
              El PDF vindrà després, quan tinguem definit exactament quin resum necessita el tutor per alumne i per grup.
            </p>
            <span>Base preparada: notes tutorials, seguiment i perfil individual.</span>
          </article>
        </section>
      )}

      {selectedTutorialProfile && (
        <TutorialStudentProfileModal
          onClose={() => setSelectedTutorialProfileId('')}
          profile={selectedTutorialProfile}
        />
      )}
    </section>
  )
}
