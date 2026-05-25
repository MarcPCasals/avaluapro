import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  ClipboardList,
  Eye,
  FileDown,
  GraduationCap,
  Layers3,
  Plus,
  Trash2,
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

function getRecordTypeMeta(type) {
  return TUTORING_RECORD_TYPES.find((item) => item.id === type) || TUTORING_RECORD_TYPES[0]
}

function getTodayDateInput() {
  return new Date().toISOString().slice(0, 10)
}

function formatShortDate(value) {
  if (!value) return 'Sense data'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ca-AD', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

function formatLongDate(value) {
  if (!value) return 'Sense data'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ca-AD', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

function printTutorialProfile() {
  document.body.classList.add('tutorial-profile-printing')
  const clearPrintClass = () => document.body.classList.remove('tutorial-profile-printing')
  window.addEventListener('afterprint', clearPrintClass, { once: true })
  window.print()
  window.setTimeout(clearPrintClass, 1200)
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

function summarizeTutorialRecords({ students, records }) {
  const studentsById = new Map(students.map((student) => [student.id, student]))
  const studentRows = students
    .map((student) => {
      const studentRecords = records.filter((record) => record.studentId === student.id)
      return {
        student,
        records: studentRecords,
        total: studentRecords.length,
        agenda: countByType(studentRecords, 'agenda'),
        incident: countByType(studentRecords, 'incident'),
        classroomExpulsion: countByType(studentRecords, 'classroom-expulsion'),
        centerExpulsion: countByType(studentRecords, 'center-expulsion'),
      }
    })
    .sort((a, b) => b.total - a.total || a.student.name.localeCompare(b.student.name, 'ca'))

  const recentRecords = [...records]
    .sort((a, b) => {
      const dateCompare = String(b.date || '').localeCompare(String(a.date || ''))
      if (dateCompare !== 0) return dateCompare
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
    })
    .slice(0, 8)
    .map((record) => ({
      ...record,
      student: studentsById.get(record.studentId),
      typeMeta: getRecordTypeMeta(record.type),
    }))

  return {
    studentRows,
    recentRecords,
    studentsWithRecords: studentRows.filter((row) => row.total > 0),
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

function TutorialStudentProfileModal({ classLabel, onClose, onDeleteRecord, profile, recordRow }) {
  if (!profile) return null

  const records = recordRow?.records || []
  const hasTracking = records.length > 0
  const reportDate = getTodayDateInput()
  const groupedByArea = Object.values(
    profile.evaluatedCompetencies.reduce((areas, item) => {
      const area = areas[item.areaId] || { name: item.areaName, rows: [] }
      area.rows.push(item)
      return { ...areas, [item.areaId]: area }
    }, {}),
  )

  return (
    <Modal
      onClose={onClose}
      panelClassName="tutorial-print-panel"
      size="xl"
      title={`Perfil tutorial: ${profile.student.name}`}
    >
      <div className="tutorial-profile-modal">
        <header className="tutorial-print-header">
          <span>AvaluaPro · Informe tutorial</span>
          <h2>{profile.student.name}</h2>
          <p>
            {classLabel || 'Classe sense nom'} · Generat el {formatLongDate(reportDate)}
          </p>
        </header>

        <div className="tutorial-profile-modal-toolbar">
          <p>
            Resum combinat de rendiment competencial i seguiment tutorial. Aquest és el punt de partida
            per preparar una reunió o guardar el perfil com a PDF.
          </p>
          <button className="secondary-action compact" onClick={printTutorialProfile} type="button">
            <FileDown size={16} />
            Imprimir / desar PDF
          </button>
        </div>

        <section>
          <h3 className="tutorial-profile-section-title">Rendiment competencial</h3>
          <div className="tutorial-profile-summary">
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
          </div>
        </section>

        <section>
          <h3 className="tutorial-profile-section-title">Seguiment tutorial</h3>
          <div className="tutorial-profile-summary tracking">
            {TUTORING_RECORD_TYPES.map((type) => (
              <article className={type.tone} key={type.id}>
                <span>{type.label}</span>
                <strong>{countByType(records, type.id)}</strong>
              </article>
            ))}
          </div>
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

        <section className="tutorial-profile-record-section">
          <h3 className="tutorial-profile-section-title">Evidències de seguiment</h3>
          {!hasTracking ? (
            <div className="empty-state compact">Encara no hi ha registres tutorials vinculats a aquest alumne.</div>
          ) : (
            <div className="tutorial-record-history compact">
              {records
                .slice()
                .sort((a, b) => {
                  const dateCompare = String(b.date || '').localeCompare(String(a.date || ''))
                  if (dateCompare !== 0) return dateCompare
                  return String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
                })
                .map((record) => {
                  const typeMeta = getRecordTypeMeta(record.type)
                  return (
                    <article className={`tutorial-record-entry ${typeMeta.tone}`} key={record.id}>
                      <div>
                        <strong>{typeMeta.label}</strong>
                        <span>{formatShortDate(record.date)}</span>
                        <p>{record.note || 'Sense comentari afegit.'}</p>
                      </div>
                      <button
                        className="icon-button danger subtle"
                        onClick={() => onDeleteRecord(record.id)}
                        title="Eliminar registre"
                        type="button"
                      >
                        <Trash2 size={16} />
                      </button>
                    </article>
                  )
                })}
            </div>
          )}
        </section>

        <footer className="tutorial-print-footer">
          Informe orientatiu generat amb AvaluaPro. Les dades s’han d’interpretar dins del context educatiu de l’alumne.
        </footer>
      </div>
    </Modal>
  )
}

function TutorialRecordStudentModal({ onClose, onDelete, row }) {
  if (!row) return null

  return (
    <Modal onClose={onClose} size="lg" title={`Seguiment tutorial: ${row.student.name}`}>
      <div className="tutorial-record-modal">
        <section className="tutorial-record-modal-summary">
          {TUTORING_RECORD_TYPES.map((type) => (
            <article className={type.tone} key={type.id}>
              <span>{type.label}</span>
              <strong>{countByType(row.records, type.id)}</strong>
            </article>
          ))}
        </section>

        {row.records.length === 0 ? (
          <div className="empty-state compact">Aquest alumne encara no té registres tutorials.</div>
        ) : (
          <div className="tutorial-record-history">
            {row.records
              .slice()
              .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
              .map((record) => {
                const typeMeta = getRecordTypeMeta(record.type)
                return (
                  <article className={`tutorial-record-entry ${typeMeta.tone}`} key={record.id}>
                    <div>
                      <strong>{typeMeta.label}</strong>
                      <span>{formatShortDate(record.date)}</span>
                      <p>{record.note || 'Sense comentari afegit.'}</p>
                    </div>
                    <button
                      className="icon-button danger subtle"
                      onClick={() => onDelete(record.id)}
                      title="Eliminar registre"
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </article>
                )
              })}
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
  const [selectedTutorialRecordStudentId, setSelectedTutorialRecordStudentId] = useState('')
  const [recordForm, setRecordForm] = useState({
    studentId: '',
    type: 'agenda',
    date: getTodayDateInput(),
    note: '',
  })
  const activeClassId = useAvaluaproStore((state) => state.ui.activeClassId)
  const classes = useAvaluaproStore((state) => state.classes)
  const students = useAvaluaproStore((state) => state.students)
  const tutorialRecords = useAvaluaproStore((state) => state.tutorialRecords)
  const tutorialMarks = useAvaluaproStore((state) => state.tutorialMarks)
  const updateTutorialMark = useAvaluaproStore((state) => state.updateTutorialMark)
  const addTutorialRecord = useAvaluaproStore((state) => state.addTutorialRecord)
  const deleteTutorialRecord = useAvaluaproStore((state) => state.deleteTutorialRecord)
  const activeClass = classes.find((classItem) => classItem.id === activeClassId)
  const linkedClassId = activeClass?.tutorialLinkedClassId || activeClass?.id
  const linkedClass = classes.find((classItem) => classItem.id === linkedClassId) || activeClass
  const classStudents = useMemo(
    () => students.filter((student) => student.classId === linkedClassId).sort((a, b) => a.name.localeCompare(b.name, 'ca')),
    [linkedClassId, students],
  )
  const classTutorialRecords = useMemo(
    () => tutorialRecords.filter((record) => record.classId === activeClassId),
    [activeClassId, tutorialRecords],
  )
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
  const tutorialRecordSummary = useMemo(
    () => summarizeTutorialRecords({ students: classStudents, records: classTutorialRecords }),
    [classStudents, classTutorialRecords],
  )
  const tutorialRecordRowsByStudent = useMemo(
    () => new Map(tutorialRecordSummary.studentRows.map((row) => [row.student.id, row])),
    [tutorialRecordSummary.studentRows],
  )
  const selectedTutorialProfile = tutorialSummary.studentProfiles.find(
    (profile) => profile.student.id === selectedTutorialProfileId,
  )
  const selectedTutorialRecordRow = tutorialRecordSummary.studentRows.find(
    (row) => row.student.id === selectedTutorialRecordStudentId,
  )
  const selectedRecordType = getRecordTypeMeta(recordForm.type)

  const handleSubmitTutorialRecord = async (event) => {
    event.preventDefault()
    const studentId = recordForm.studentId || classStudents[0]?.id
    if (!studentId) return

    await addTutorialRecord({
      classId: activeClassId,
      studentId,
      type: recordForm.type,
      date: recordForm.date,
      note: recordForm.note,
    })
    setRecordForm((current) => ({
      ...current,
      studentId,
      date: getTodayDateInput(),
      note: '',
    }))
  }

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
        <section className="tutorial-tracking-panel">
          <div className="tutorial-record-summary">
            {TUTORING_RECORD_TYPES.map((type) => (
              <button
                className={`tutorial-record-pill ${type.tone} ${recordForm.type === type.id ? 'active' : ''}`}
                key={type.id}
                onClick={() => setRecordForm((current) => ({ ...current, type: type.id }))}
                type="button"
              >
                <strong>{countByType(classTutorialRecords, type.id)}</strong>
                {type.label}
              </button>
            ))}
          </div>

          <div className="tutorial-tracking-grid">
            <article className="tutoring-card tutorial-record-form-card">
              <div>
                <Plus size={24} />
                <h2>Nou registre tutorial</h2>
              </div>
              <p>
                Registra notes a l’agenda, incidents o expulsions sense duplicar la classe. Tot queda vinculat al
                perfil tutorial de l’alumne.
              </p>

              <form className="tutorial-record-form" onSubmit={handleSubmitTutorialRecord}>
                <label>
                  Alumne
                  <select
                    onChange={(event) => setRecordForm((current) => ({ ...current, studentId: event.target.value }))}
                    value={recordForm.studentId}
                  >
                    <option value="">Primer alumne de la llista</option>
                    {classStudents.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Tipus
                  <select
                    className={`tutorial-record-type-select ${selectedRecordType.tone}`}
                    onChange={(event) => setRecordForm((current) => ({ ...current, type: event.target.value }))}
                    value={recordForm.type}
                  >
                    {TUTORING_RECORD_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Data
                  <input
                    onChange={(event) => setRecordForm((current) => ({ ...current, date: event.target.value }))}
                    type="date"
                    value={recordForm.date}
                  />
                </label>

                <label className="full">
                  Motiu o observació
                  <textarea
                    onChange={(event) => setRecordForm((current) => ({ ...current, note: event.target.value }))}
                    placeholder="Ex: nota a l’agenda per acumulació de tasques no fetes, incident al passadís, expulsió puntual..."
                    value={recordForm.note}
                  />
                </label>

                <button className="primary-action" disabled={classStudents.length === 0} type="submit">
                  Afegir registre
                </button>
              </form>
            </article>

            <article className="tutoring-card">
              <div>
                <UsersRound size={24} />
                <h2>Alumnes amb seguiment</h2>
              </div>
              {tutorialRecordSummary.studentsWithRecords.length === 0 ? (
                <div className="empty-state compact">Encara no hi ha registres tutorials en aquesta classe.</div>
              ) : (
                <div className="tutorial-tracking-student-list">
                  {tutorialRecordSummary.studentsWithRecords.slice(0, 12).map((row) => (
                    <button
                      className="tutorial-tracking-student-row"
                      key={row.student.id}
                      onClick={() => setSelectedTutorialRecordStudentId(row.student.id)}
                      type="button"
                    >
                      <div>
                        <strong>{row.student.name}</strong>
                        <small>{row.student.halfGroup || 'Sense mig grup'}</small>
                      </div>
                      <span>{row.agenda} agenda</span>
                      <span>{row.incident} incid.</span>
                      <span>{row.classroomExpulsion + row.centerExpulsion} exp.</span>
                    </button>
                  ))}
                </div>
              )}
            </article>
          </div>

          <article className="tutoring-card compact">
            <div>
              <CalendarDays size={22} />
              <h2>Historial recent</h2>
            </div>
            {tutorialRecordSummary.recentRecords.length === 0 ? (
              <div className="empty-state compact">Quan afegeixis registres, apareixeran aquí ordenats per data.</div>
            ) : (
              <div className="tutorial-record-history compact">
                {tutorialRecordSummary.recentRecords.map((record) => (
                  <article className={`tutorial-record-entry ${record.typeMeta.tone}`} key={record.id}>
                    <div>
                      <strong>{record.student?.name || 'Alumne no trobat'}</strong>
                      <span>
                        {record.typeMeta.label} · {formatShortDate(record.date)}
                      </span>
                      <p>{record.note || 'Sense comentari afegit.'}</p>
                    </div>
                    <button
                      className="icon-button danger subtle"
                      onClick={() => deleteTutorialRecord(record.id)}
                      title="Eliminar registre"
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </article>
                ))}
              </div>
            )}
          </article>
        </section>
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
                {tutorialSummary.studentProfiles.map((profile) => {
                  const recordRow = tutorialRecordRowsByStudent.get(profile.student.id)
                  const trackingCount = recordRow?.total || 0
                  return (
                    <button
                      className={`tutorial-student-profile-row ${
                        profile.notDevelopedCount > 0 || trackingCount > 0 ? 'risk' : ''
                      }`}
                      key={profile.student.id}
                      onClick={() => setSelectedTutorialProfileId(profile.student.id)}
                      type="button"
                    >
                      <div>
                        <strong>{profile.student.name}</strong>
                        <small>
                          {profile.weakestArea?.name || 'Sense àrea delicada detectada'} · {trackingCount} registre/s
                        </small>
                      </div>
                      <span>{profile.evaluatedCount} comp.</span>
                      <span>{profile.notDevelopedCount} no assolides</span>
                      <span>{recordRow?.agenda || 0} agenda</span>
                      <em>{profile.evaluatedCount > 0 ? formatPercent(profile.notDevelopedPercent) : '-'}</em>
                    </button>
                  )
                })}
              </div>
            )}
          </article>

          <article className="tutoring-card muted tutorial-profile-pdf-card">
            <div>
              <FileDown size={24} />
              <h2>PDF de tutoria</h2>
            </div>
            <p>
              Obre el perfil d’un alumne per revisar rendiment, registres tutorials i evidències. Des d’allà
              pots imprimir-lo o desar-lo com a PDF.
            </p>
            <div className="tutorial-profile-pdf-stats">
              <span>
                <strong>{tutorialSummary.studentProfiles.length}</strong>
                perfils
              </span>
              <span>
                <strong>{tutorialRecordSummary.studentsWithRecords.length}</strong>
                amb seguiment
              </span>
            </div>
            <button
              className="secondary-action"
              disabled={tutorialSummary.studentProfiles.length === 0}
              onClick={() => setSelectedTutorialProfileId(tutorialSummary.studentProfiles[0]?.student.id || '')}
              type="button"
            >
              Obrir primer perfil
            </button>
          </article>
        </section>
      )}

      {selectedTutorialProfile && (
        <TutorialStudentProfileModal
          classLabel={activeClass?.name}
          onClose={() => setSelectedTutorialProfileId('')}
          onDeleteRecord={deleteTutorialRecord}
          profile={selectedTutorialProfile}
          recordRow={tutorialRecordRowsByStudent.get(selectedTutorialProfile.student.id)}
        />
      )}

      {selectedTutorialRecordRow && (
        <TutorialRecordStudentModal
          onClose={() => setSelectedTutorialRecordStudentId('')}
          onDelete={deleteTutorialRecord}
          row={selectedTutorialRecordRow}
        />
      )}
    </section>
  )
}
