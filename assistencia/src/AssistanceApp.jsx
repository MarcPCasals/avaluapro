import { GroupToolsMenu } from '../../src/features/tutoring/GroupToolsMenu.jsx'
import { TaskDateField } from '../../src/features/tracking/TaskDateField.jsx'
import { getTaskSessionKey } from '../../src/features/tracking/taskSessionChoices.js'
import { HalfGroupsPanel } from '../../src/features/tutoring/HalfGroupsPanel.jsx'
import { useMemo, useState } from 'react'
import { DatabaseZap, LockKeyhole, RotateCcw, Search, ShieldCheck, WifiOff } from 'lucide-react'
import { createMemoryDataAdapter } from '../../src/data/adapters/createMemoryDataAdapter.js'
import { useDataAdapter } from '../../src/data/adapters/useDataAdapter.js'
import { CrossAnalysisTable } from '../../src/features/analytics/CrossAnalysisTable.jsx'
import { AbsenceControl } from '../../src/features/attendance/AbsenceControl.jsx'
import { EvaluationTable } from '../../src/features/evaluation/EvaluationTable.jsx'
import { SafeAssistanceExportPanel } from '../../src/features/data/SafeAssistanceExportPanel.jsx'
import { StudentOverviewTable } from '../../src/features/students/StudentOverviewTable.jsx'
import { TrackingTable } from '../../src/features/tracking/TrackingTable.jsx'
import { SociometricSummaryPanel } from '../../src/features/tutoring/SociometricSummaryPanel.jsx'
import { SeatingPlanBoard } from '../../src/features/tutoring/SeatingPlanBoard.jsx'
import { CooperativeGroupGrid } from '../../src/features/tutoring/CooperativeGroupGrid.jsx'
import { TutorialProfileList } from '../../src/features/tutoring/TutorialProfileList.jsx'
import { getStudentTrackingStats } from '../../src/lib/analytics.js'
import {
  findAbsenceInSlot,
  formatAbsenceDateTime,
  getAbsenceTimeParts,
  getStudentAbsenceHours,
  getStudentAbsenceRecords,
} from '../../src/lib/attendance.js'
import { assistanceDataset } from './assistanceDataset.js'
import { SafeAssistancePackageImportPanel } from './SafeAssistancePackageImportPanel.jsx'

const LEVEL_SEQUENCE = ['A', 'B', 'C', 'D']
const assistanceAdapter = createMemoryDataAdapter(assistanceDataset)

function buildSyntheticSociometricSummary(students, relations) {
  const studentIds = new Set(students.map((student) => student.id))
  const visibleRelations = relations.filter(
    (relation) => studentIds.has(relation.sourceStudentId) && studentIds.has(relation.targetStudentId),
  )
  const positiveRelations = visibleRelations.filter((relation) => relation.type === 'positive')
  const relationKeys = new Set(positiveRelations.map(
    (relation) => `${relation.sourceStudentId}:${relation.targetStudentId}`,
  ))
  const reciprocalPairKeys = new Set()
  positiveRelations.forEach((relation) => {
    if (!relationKeys.has(`${relation.targetStudentId}:${relation.sourceStudentId}`)) return
    reciprocalPairKeys.add([relation.sourceStudentId, relation.targetStudentId].sort().join(':'))
  })

  const studentRows = students.map((student) => {
    const positiveReceived = positiveRelations.filter((relation) => relation.targetStudentId === student.id).length
    const avoidReceived = visibleRelations.filter(
      (relation) => relation.type === 'avoid' && relation.targetStudentId === student.id,
    ).length
    const category = avoidReceived >= 2
      ? 'Rebutjat'
      : positiveReceived >= 4
        ? 'Líder'
        : positiveReceived === 0
          ? 'Aïllat'
          : 'Acceptat'
    return { avoidReceived, category, positiveReceived, student }
  })
  const categories = ['Líder', 'Acceptat', 'Aïllat', 'Rebutjat']
  const possibleRelations = students.length * Math.max(0, students.length - 1)
  const includedStudents = studentRows.filter((row) => row.positiveReceived > 0).length

  return {
    categoryRows: categories.map((category) => ({
      category,
      count: studentRows.filter((row) => row.category === category).length,
    })),
    metrics: {
      density: possibleRelations > 0 ? Math.round((visibleRelations.length / possibleRelations) * 100) : 0,
      inclusion: students.length > 0 ? Math.round((includedStudents / students.length) * 100) : 0,
      moreno: positiveRelations.length > 0
        ? Math.round(((reciprocalPairKeys.size * 2) / positiveRelations.length) * 100)
        : 0,
      positivity: visibleRelations.length > 0
        ? Math.round((positiveRelations.length / visibleRelations.length) * 100)
        : 0,
    },
    relationCount: visibleRelations.length,
    reciprocalPairCount: reciprocalPairKeys.size,
    studentRows,
  }
}

function getSyntheticDecision(student, tracking) {
  if (student.evaluation === 'D' && tracking.consistency < 60) {
    return { label: 'Risc combinat', text: 'Prioritzar rendiment i hàbits de treball.', tone: 'danger' }
  }
  if (student.evaluation === 'C' || student.evaluation === 'D') {
    return { label: 'Reforç acadèmic', text: 'Revisar les evidències d’avaluació fictícies.', tone: 'warning' }
  }
  if (tracking.consistency < 60) {
    return { label: 'Hàbit fràgil', text: 'Consolidar la constància abans que baixi el rendiment.', tone: 'habit' }
  }
  return { label: 'Seguiment ordinari', text: 'Sense senyals combinats importants.', tone: 'stable' }
}

function SecurityBadge({ icon: Icon, children }) {
  return (
    <span className="assistance-security-badge">
      <Icon aria-hidden="true" size={16} />
      {children}
    </span>
  )
}

const syntheticTaskSessions = [
  { date: '2026-10-02', startsAt: '2026-10-02T09:30:00', subgroupId: 'Grup A', timetableSlotId: 'synthetic-a' },
  { date: '2026-10-02', startsAt: '2026-10-02T10:30:00', subgroupId: 'Grup B', timetableSlotId: 'synthetic-b' },
  { date: '2026-10-05', startsAt: '2026-10-05T09:30:00', subgroupId: null, timetableSlotId: 'synthetic-all' },
]

function AssistanceApp() {
  const [taskDemoDate, setTaskDemoDate] = useState('2026-10-02')
  const [taskDemoKey, setTaskDemoKey] = useState('')
  const dataset = useDataAdapter(assistanceAdapter)
  const [syntheticHalfGroups, setSyntheticHalfGroups] = useState({})
  const [activeClassId, setActiveClassId] = useState(dataset.classes[0].id)
  const [activeSurface, setActiveSurface] = useState('overview')
  const [groupTool, setGroupTool] = useState('')
  const [analysisSortMode, setAnalysisSortMode] = useState('intervention')
  const [tutorialProfileFilter, setTutorialProfileFilter] = useState('priority')
  const [selectedTutorialStudentId, setSelectedTutorialStudentId] = useState('')
  const [selectedSociometricStudentId, setSelectedSociometricStudentId] = useState('')
  const [selectedSeatingStudentId, setSelectedSeatingStudentId] = useState('')
  const [seatingVariant, setSeatingVariant] = useState(0)
  const [cooperativeVariant, setCooperativeVariant] = useState(0)
  const [selectedCooperativeGroupId, setSelectedCooperativeGroupId] = useState('')
  const [search, setSearch] = useState('')
  const [simulatedAction, setSimulatedAction] = useState('')
  const activeClass = dataset.classes.find((classItem) => classItem.id === activeClassId) || dataset.classes[0]
  const activeClassStudents = useMemo(() => dataset.students
    .filter((student) => student.classId === activeClassId)
    .map((student) => ({ ...student, halfGroup: syntheticHalfGroups[student.id] || student.halfGroup, diagnoses: [], name: student.displayName })),
  [activeClassId, dataset.students, syntheticHalfGroups])
  const visibleStudents = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('ca')
    return dataset.students.filter((student) => (
      student.classId === activeClassId &&
      (!query || student.displayName.toLocaleLowerCase('ca').includes(query))
    ))
  }, [activeClassId, dataset.students, search])
  const overviewRows = useMemo(() => visibleStudents.map((student) => ({
    absenceHours: student.absenceHours,
    absenceRecords: [],
    importantRecords: [],
    latestTeamNote: null,
    latestTrackingNote: student.completedTasks < student.totalTasks
      ? { text: 'Anotació de seguiment completament fictícia.' }
      : null,
    latestTutoringNote: null,
    otherTutorialRecords: [],
    pendingRecords: [],
    profile: {
      evaluation: { grade: student.evaluation },
      incidents: 0,
      tracking: {
        consistency: student.totalTasks > 0
          ? Math.round((student.completedTasks / student.totalTasks) * 100)
          : 0,
        hasTrackingData: student.totalTasks > 0,
        missing: Math.max(0, student.totalTasks - student.completedTasks),
      },
    },
    records: [],
    student: {
      ...student,
      diagnoses: [],
      name: student.displayName,
    },
  })), [visibleStudents])
  const firstVisibleStudent = visibleStudents[0]
  const evaluationStudents = useMemo(() => visibleStudents.map((student) => ({
    ...student,
    diagnoses: [],
    name: student.displayName,
  })), [visibleStudents])
  const trackingTasks = useMemo(
    () => dataset.trackingTasks.filter((task) => task.classId === activeClassId),
    [activeClassId, dataset.trackingTasks],
  )
  const trackingRows = useMemo(() => evaluationStudents.map((student) => {
    const stats = getStudentTrackingStats(student.id, dataset.trackingRecords, trackingTasks)
    return {
      incidentsCount: 0,
      interventionInsight: null,
      noteState: 'empty',
      positivesCount: 0,
      redPointCount: stats.missing,
      stats,
      student,
      trackingAgendaNotesCount: 0,
    }
  }), [dataset.trackingRecords, evaluationStudents, trackingTasks])
  const currentAbsenceSlot = getAbsenceTimeParts()
  const crossAnalysisRows = useMemo(() => {
    const rows = evaluationStudents.map((student) => {
      const tracking = getStudentTrackingStats(student.id, dataset.trackingRecords, trackingTasks)
      const absenceRecords = getStudentAbsenceRecords(dataset.absenceRecords, student.id, activeClassId)
      const decision = getSyntheticDecision(student, tracking)
      return {
        absenceHours: getStudentAbsenceHours(dataset.absenceRecords, student.id, activeClassId),
        absenceRecords,
        decision,
        evaluationGrade: student.evaluation,
        incidents: student.incidents || 0,
        lowConsistency: tracking.hasTrackingData && tracking.consistency < 60,
        redPointCount: tracking.missing,
        rowTone: decision.tone === 'danger' || decision.tone === 'warning' ? 'risk' : 'stable',
        student,
        tracking,
      }
    })
    return rows.sort((a, b) => analysisSortMode === 'alphabetical'
      ? a.student.name.localeCompare(b.student.name, 'ca', { numeric: true })
      : Number(b.decision.tone === 'danger') - Number(a.decision.tone === 'danger') ||
        b.redPointCount - a.redPointCount ||
        a.tracking.consistency - b.tracking.consistency)
  }, [activeClassId, analysisSortMode, dataset.absenceRecords, dataset.trackingRecords, evaluationStudents, trackingTasks])
  const tutorialProfileRows = useMemo(() => evaluationStudents
    .map((student) => {
      const notDevelopedCount = student.evaluation === 'D' ? 3 : student.evaluation === 'C' ? 1 : 0
      const trackingCount = student.tutorialRecordCount || 0
      const priority = notDevelopedCount * 3 + trackingCount
      return {
        academicSourceLabel: 'Mirada acadèmica fictícia',
        notDevelopedCount,
        priority,
        reportStatus: priority > 0 ? 'Cal revisar' : 'No iniciat',
        student,
        trackingCount,
      }
    })
    .filter((row) => tutorialProfileFilter === 'all' || row.priority > 0)
    .sort((a, b) => b.priority - a.priority || a.student.name.localeCompare(b.student.name, 'ca', { numeric: true })),
  [evaluationStudents, tutorialProfileFilter])
  const selectedTutorialProfile = tutorialProfileRows.find(
    (row) => row.student.id === selectedTutorialStudentId,
  )
  const sociometricSummary = useMemo(
    () => buildSyntheticSociometricSummary(activeClassStudents, dataset.sociometricRelations || []),
    [activeClassStudents, dataset.sociometricRelations],
  )
  const selectedSociometricStudent = sociometricSummary.studentRows.find(
    (row) => row.student.id === selectedSociometricStudentId,
  )
  const seatingSeats = useMemo(() => {
    const orderedRows = [...sociometricSummary.studentRows].sort((a, b) => {
      const categoryOrder = { Rebutjat: 0, Aïllat: 1, Líder: 2, Acceptat: 3 }
      return categoryOrder[a.category] - categoryOrder[b.category] ||
        a.student.name.localeCompare(b.student.name, 'ca', { numeric: true })
    })
    const offset = orderedRows.length > 0 ? seatingVariant % orderedRows.length : 0
    const rotatedRows = [...orderedRows.slice(offset), ...orderedRows.slice(0, offset)]
    return Array.from({ length: 20 }, (_, index) => ({
      category: rotatedRows[index]?.category || '',
      column: (index % 5) + 1,
      id: `synthetic-seat-${index + 1}`,
      row: Math.floor(index / 5) + 1,
      student: rotatedRows[index]?.student || null,
    }))
  }, [seatingVariant, sociometricSummary.studentRows])
  const selectedSeatingSeat = seatingSeats.find((seat) => seat.student?.id === selectedSeatingStudentId)
  const cooperativeGroups = useMemo(() => {
    const categoryOrder = { Rebutjat: 0, Aïllat: 1, Líder: 2, Acceptat: 3 }
    const orderedRows = [...sociometricSummary.studentRows].sort((a, b) =>
      categoryOrder[a.category] - categoryOrder[b.category] ||
      a.student.name.localeCompare(b.student.name, 'ca', { numeric: true }),
    )
    const offset = orderedRows.length > 0 ? cooperativeVariant % orderedRows.length : 0
    const rotatedRows = [...orderedRows.slice(offset), ...orderedRows.slice(0, offset)]
    const groups = Array.from({ length: 5 }, (_, index) => ({
      id: `synthetic-cooperative-group-${index + 1}`,
      members: [],
      name: `Grup fictici ${index + 1}`,
    }))
    rotatedRows.forEach((row, index) => groups[index % groups.length].members.push(row))
    return groups.map((group) => {
      const priorityCount = group.members.filter((member) => ['Rebutjat', 'Aïllat'].includes(member.category)).length
      const hasPositiveReference = group.members.some((member) => member.category === 'Líder')
      return {
        ...group,
        status: priorityCount <= 1 ? 'Equilibrat' : 'A revisar',
        tone: priorityCount <= 1 ? 'positive' : 'warning',
        summary: priorityCount === 0
          ? 'Sense alertes sociomètriques simulades.'
          : `${priorityCount} perfil prioritari fictici${priorityCount === 1 ? '' : 's'}.`,
        hasPositiveReference,
        priorityCount,
      }
    })
  }, [cooperativeVariant, sociometricSummary.studentRows])
  const selectedCooperativeGroup = cooperativeGroups.find((group) => group.id === selectedCooperativeGroupId)
  const safeExportDemoState = useMemo(() => ({
    classes: dataset.classes,
    competencies: dataset.evaluationCompetencies.map((competency) => ({ id: competency.id })),
    criteria: dataset.evaluationCompetencies.flatMap((competency) => competency.criteria.map((criterion) => ({
      competencyId: competency.id,
      id: criterion.id,
    }))),
    students: dataset.students,
    tasks: dataset.trackingTasks,
  }), [dataset.classes, dataset.evaluationCompetencies, dataset.students, dataset.trackingTasks])

  function renderSyntheticAbsenceControl(student) {
    const activeRecord = findAbsenceInSlot(
      dataset.absenceRecords,
      student.id,
      activeClassId,
      currentAbsenceSlot.slotKey,
    )
    const totalHours = getStudentAbsenceHours(dataset.absenceRecords, student.id, activeClassId)
    return (
      <AbsenceControl
        activeRecord={activeRecord}
        onToggle={() => {
          assistanceAdapter.toggleAbsence(student.id, activeClassId, currentAbsenceSlot)
          simulateAction('Absència fictícia modificada només a la memòria temporal.')
        }}
        totalHours={totalHours}
      />
    )
  }

  function cycleEvaluation(student) {
    const currentIndex = LEVEL_SEQUENCE.indexOf(student.evaluation)
    assistanceAdapter.setStudentEvaluation(
      student.id,
      LEVEL_SEQUENCE[(currentIndex + 1) % LEVEL_SEQUENCE.length],
    )
  }

  function simulateAction(message) {
    setSimulatedAction(message)
  }

  function loadSafePackage(candidate) {
    const loadedSnapshot = assistanceAdapter.loadSafePackage(candidate)
    setActiveClassId(loadedSnapshot.classes[0].id)
    setSearch('')
    setSelectedTutorialStudentId('')
    setSelectedSociometricStudentId('')
    setSelectedSeatingStudentId('')
    setSelectedCooperativeGroupId('')
    setSimulatedAction('')
  }

  return (
    <main className="assistance-app" data-assistance-environment="synthetic">
      <section className="assistance-lock-banner" aria-label="Entorn d’assistència segur">
        <div className="assistance-lock-copy">
          <span className="assistance-lock-icon" aria-hidden="true">
            <ShieldCheck size={28} />
          </span>
          <div>
            <strong>Entorn d’assistència</strong>
            <span>Dades fictícies · Sense connexió amb el compte real</span>
          </div>
        </div>
        <div className="assistance-security-badges" aria-label="Proteccions actives">
          <SecurityBadge icon={WifiOff}>Xarxa externa bloquejada</SecurityBadge>
          <SecurityBadge icon={DatabaseZap}>Sense IndexedDB real</SecurityBadge>
          <SecurityBadge icon={LockKeyhole}>Canvis temporals</SecurityBadge>
        </div>
      </section>

      <header className="assistance-header">
        <div>
          <p className="assistance-eyebrow">AvaluaPro Assistència</p>
          <h1>Espai segur de comprovació</h1>
          <p>
            Aquesta primera versió demostra l’arrencada aïllada. No importa la botiga real,
            no recupera cap sessió i només utilitza un conjunt sintètic integrat al paquet.
          </p>
        </div>
        <aside className="assistance-dataset-card">
          <span>Origen de les dades</span>
          <strong>{dataset.metadata.label}</strong>
          <small>
            {dataset.students.length} {dataset.students.length === 1 ? 'alumne fictici' : 'alumnes ficticis'} en total
          </small>
          <small>
            {dataset.dirty
              ? `${dataset.pendingChangeCount} ${dataset.pendingChangeCount === 1 ? 'canvi temporal' : 'canvis temporals'}`
              : 'Sense canvis temporals'}
          </small>
          <button
            className="assistance-reset-button"
            disabled={!dataset.dirty}
            onClick={() => {
              assistanceAdapter.reset()
              setSimulatedAction('')
            }}
            type="button"
          >
            <RotateCcw aria-hidden="true" size={15} />
            Restableix la demostració
          </button>
        </aside>
      </header>

      <section className="assistance-toolbar" aria-label="Controls de la demostració">
        <div className="assistance-toolbar-groups">
          <div className="assistance-view-tabs" role="tablist" aria-label="Pantalles segures">
            <button
              aria-selected={activeSurface === 'overview'}
              className={activeSurface === 'overview' ? 'active' : ''}
              onClick={() => {
                setActiveSurface('overview')
                setSimulatedAction('')
              }}
              role="tab"
              type="button"
            >
              Vista integrada
            </button>
            <button
              aria-selected={activeSurface === 'evaluation'}
              className={activeSurface === 'evaluation' ? 'active' : ''}
              onClick={() => {
                setActiveSurface('evaluation')
                setSimulatedAction('')
              }}
              role="tab"
              type="button"
            >
              Avaluació
            </button>
            <button
              aria-selected={activeSurface === 'tracking'}
              className={activeSurface === 'tracking' ? 'active' : ''}
              onClick={() => {
                setActiveSurface('tracking')
                setSimulatedAction('')
              }}
              role="tab"
              type="button"
            >
              Seguiment
            </button>
            <button
              aria-selected={activeSurface === 'analytics'}
              className={activeSurface === 'analytics' ? 'active' : ''}
              onClick={() => {
                setActiveSurface('analytics')
                setSimulatedAction('')
              }}
              role="tab"
              type="button"
            >
              Analítica
            </button>
            <button
              aria-selected={activeSurface === 'tutoring'}
              className={activeSurface === 'tutoring' ? 'active' : ''}
              onClick={() => {
                const tutoringClass = dataset.classes.find((classItem) => classItem.isTutoringGroup)
                if (tutoringClass) setActiveClassId(tutoringClass.id)
                setActiveSurface('tutoring')
                setSelectedTutorialStudentId('')
                setSimulatedAction('')
              }}
              role="tab"
              type="button"
            >
              Tutoria
            </button>
            <button
              aria-selected={activeSurface === 'sociometry'}
              className={activeSurface === 'sociometry' ? 'active' : ''}
              onClick={() => {
                const tutoringClass = dataset.classes.find((classItem) => classItem.isTutoringGroup)
                if (tutoringClass) setActiveClassId(tutoringClass.id)
                setActiveSurface('sociometry')
                setSelectedSociometricStudentId('')
                setSimulatedAction('')
              }}
              role="tab"
              type="button"
            >
              Sociometria
            </button>
            <button
              aria-selected={activeSurface === 'classroom'}
              className={activeSurface === 'classroom' ? 'active' : ''}
              onClick={() => {
                const tutoringClass = dataset.classes.find((classItem) => classItem.isTutoringGroup)
                if (tutoringClass) setActiveClassId(tutoringClass.id)
                setActiveSurface('classroom')
                setSelectedSeatingStudentId('')
                setSimulatedAction('')
              }}
              role="tab"
              type="button"
            >
              Aula
            </button>
            <button
              aria-selected={activeSurface === 'groups'}
              className={activeSurface === 'groups' ? 'active' : ''}
              onClick={() => {
                const tutoringClass = dataset.classes.find((classItem) => classItem.isTutoringGroup)
                if (tutoringClass) setActiveClassId(tutoringClass.id)
                setActiveSurface('groups')
                setGroupTool('')
                setSelectedCooperativeGroupId('')
                setSimulatedAction('')
              }}
              role="tab"
              type="button"
            >
              Grups
            </button>
            <button
              aria-selected={activeSurface === 'safe-package'}
              className={activeSurface === 'safe-package' ? 'active' : ''}
              onClick={() => {
                setActiveSurface('safe-package')
                setSimulatedAction('')
              }}
              role="tab"
              type="button"
            >
              Paquet
            </button>
          </div>
          {activeSurface !== 'safe-package' && <div className="assistance-class-tabs" role="tablist" aria-label="Grups ficticis">
            {dataset.classes.map((classItem) => (
              <button
                aria-selected={classItem.id === activeClassId}
                className={classItem.id === activeClassId ? 'active' : ''}
                key={classItem.id}
                  onClick={() => {
                  setActiveClassId(classItem.id)
                  setSelectedTutorialStudentId('')
                  setSelectedSociometricStudentId('')
                  setSelectedSeatingStudentId('')
                  setSelectedCooperativeGroupId('')
                  setSimulatedAction('')
                }}
                role="tab"
                type="button"
              >
                {classItem.name}
              </button>
            ))}
          </div>}
        </div>
        {activeSurface !== 'safe-package' && <label className="assistance-search">
          <Search aria-hidden="true" size={18} />
          <span className="sr-only">Cerca un alumne fictici</span>
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cerca Alumne 01…"
            type="search"
            value={search}
          />
        </label>}
      </section>

      <section className="assistance-panel" aria-labelledby="assistance-class-title">
        <div className="assistance-panel-heading">
          <div>
            <span>{activeSurface === 'safe-package' ? 'Tots els grups sintètics' : activeClass.subject}</span>
            <h2 id="assistance-class-title">
              {activeSurface === 'evaluation'
                ? `Avaluació · ${activeClass.name}`
                : activeSurface === 'tracking'
                  ? `Seguiment · ${activeClass.name}`
                  : activeSurface === 'analytics'
                    ? `Analítica · ${activeClass.name}`
                    : activeSurface === 'tutoring'
                      ? `Tutoria · ${activeClass.name}`
                      : activeSurface === 'sociometry'
                        ? `Sociometria · ${activeClass.name}`
                        : activeSurface === 'classroom'
                          ? `Aula · ${activeClass.name}`
                          : activeSurface === 'groups'
                            ? `Grups cooperatius · ${activeClass.name}`
                            : activeSurface === 'safe-package'
                              ? 'Paquet segur fictici'
                  : activeClass.name}
            </h2>
          </div>
          <strong>
            {activeSurface === 'safe-package'
              ? `${dataset.students.length} ${dataset.students.length === 1 ? 'perfil sintètic' : 'perfils sintètics'}`
              : `${visibleStudents.length} files fictícies`}
          </strong>
        </div>

        {activeSurface === 'overview' && <div className="assistance-quick-actions" aria-label="Canvis sintètics ràpids">
          <span>Prova segura sobre la primera fila visible:</span>
          <button
            disabled={!firstVisibleStudent}
            onClick={() => firstVisibleStudent && cycleEvaluation(firstVisibleStudent)}
            type="button"
          >
            Canvia l’avaluació
          </button>
          <button
            disabled={!firstVisibleStudent}
            onClick={() => firstVisibleStudent && assistanceAdapter.setCompletedTasks(
              firstVisibleStudent.id,
              firstVisibleStudent.completedTasks === firstVisibleStudent.totalTasks
                ? 0
                : firstVisibleStudent.completedTasks + 1,
            )}
            type="button"
          >
            Afegeix una tasca feta
          </button>
          <button
            disabled={!firstVisibleStudent}
            onClick={() => firstVisibleStudent && assistanceAdapter.toggleAbsence(
              firstVisibleStudent.id,
              activeClassId,
              currentAbsenceSlot,
            )}
            type="button"
          >
            Alterna l’absència actual
          </button>
        </div>}

        {simulatedAction && (
          <p className="assistance-simulated-action" role="status">{simulatedAction}</p>
        )}

        {activeSurface === 'safe-package' ? <div className="assistance-safe-package-layout">
          <SafeAssistancePackageImportPanel onLoadPackage={loadSafePackage} />
          <SafeAssistanceExportPanel state={safeExportDemoState} />
        </div> : activeSurface === 'overview' ? <StudentOverviewTable
          onOpenAnnotations={(studentId) => simulateAction(`S’obririen les fonts fictícies de ${studentId}.`)}
          onOpenOtherRecords={(studentId) => simulateAction(`S’obririen els altres registres ficticis de ${studentId}.`)}
          onOpenProfile={(studentId) => simulateAction(`S’obriria el perfil fictici de ${studentId}.`)}
          onOpenRegistry={(studentId) => simulateAction(`S’obriria el registre tutorial fictici de ${studentId}.`)}
          onSavePersonalNotes={(studentId, personalNotes) => {
            assistanceAdapter.setStudentPersonalNotes(studentId, personalNotes)
            simulateAction('Informació general desada només a la memòria temporal.')
          }}
          rows={overviewRows}
          showTutoringColumns={activeClass.isTutoringGroup}
        /> : activeSurface === 'evaluation' ? <EvaluationTable
          activeClassId={activeClassId}
          competencies={dataset.evaluationCompetencies}
          marks={dataset.evaluationMarks}
          onOpenAnnotations={(studentId) => simulateAction(`S’obririen les anotacions fictícies de ${studentId}.`)}
          onOpenProfile={(studentId) => simulateAction(`S’obriria el perfil fictici de ${studentId}.`)}
          onOpenReminders={() => simulateAction('S’obririen els recordatoris completament ficticis del grup.')}
          onOpenRubric={(criterionId) => simulateAction(`S’obriria la rúbrica fictícia de ${criterionId}.`)}
          onToggleCompetencyModification={(studentId, competencyId) => simulateAction(
            `Es canviaria la competència fictícia ${competencyId} de ${studentId}.`,
          )}
          onUpdateMark={(studentId, criterionId, value) => {
            assistanceAdapter.setEvaluationMark(studentId, criterionId, value)
            simulateAction('Nota fictícia desada només a la memòria temporal.')
          }}
          renderAbsenceControl={renderSyntheticAbsenceControl}
          students={evaluationStudents}
        /> : activeSurface === 'tracking' ? <><details><summary>Data d’una tasca · sessions fictícies</summary>
          <TaskDateField date={taskDemoDate} label="Demostració" sessionKey={taskDemoKey} sessions={syntheticTaskSessions}
            onChangeDate={(value) => { setTaskDemoDate(value); setTaskDemoKey('') }}
            onSelectSession={(session) => { setTaskDemoKey(session ? getTaskSessionKey(session) : ''); if (session) setTaskDemoDate(session.date) }} />
        </details><TrackingTable classSessionChoices={syntheticTaskSessions}
          onAddBehavior={(student, type) => simulateAction(`S’afegiria ${type} fictici a ${student.id}.`)}
          onChangeTaskDate={(taskId) => simulateAction(`Es canviaria la data fictícia de ${taskId}.`)}
          onChangeTaskTitle={(taskId) => simulateAction(`Es canviaria el nom fictici de ${taskId}.`)}
          onDeleteTask={(task) => simulateAction(`S’eliminaria la tasca fictícia ${task.id}.`)}
          onMarkVisibleStudentsDone={(taskId) => {
            evaluationStudents.forEach((student) => assistanceAdapter.setTaskStatus(student.id, taskId, 'DONE'))
            simulateAction('Tots els alumnes visibles han quedat com a fets només en memòria.')
          }}
          onOpenAgendaDetail={(studentId) => simulateAction(`S’obriria l’agenda fictícia de ${studentId}.`)}
          onOpenAnnotations={(studentId) => simulateAction(`S’obririen les anotacions fictícies de ${studentId}.`)}
          onOpenProfile={(studentId) => simulateAction(`S’obriria el perfil fictici de ${studentId}.`)}
          onOpenRecordNote={({ student, task }) => simulateAction(`S’editaria la nota fictícia de ${student.id} a ${task.id}.`)}
          onOpenRecordReminder={({ student, task }) => simulateAction(`S’obriria el recordatori fictici de ${student.id} a ${task.id}.`)}
          onOpenRedPoints={(studentId) => simulateAction(`S’obririen els punts vermells ficticis de ${studentId}.`)}
          onOpenReminders={() => simulateAction('S’obririen els recordatoris ficticis del grup.')}
          onOpenTaskNote={(task) => simulateAction(`S’editaria la informació fictícia de ${task.id}.`)}
          onOpenTaskReminder={(task) => simulateAction(`S’obriria el recordatori fictici de ${task.id}.`)}
          onSetTaskStatus={(student, taskId, status) => {
            assistanceAdapter.setTaskStatus(student.id, taskId, status)
            simulateAction('Estat de seguiment desat només a la memòria temporal.')
          }}
          renderAbsenceControl={renderSyntheticAbsenceControl}
          rows={trackingRows}
          taskRecords={dataset.trackingRecords}
          tasks={trackingTasks}
        /></> : activeSurface === 'analytics' ? <CrossAnalysisTable
          onOpenAbsences={(row) => simulateAction(
            row.absenceRecords.length > 0
              ? `${row.student.name}: ${row.absenceRecords.map(formatAbsenceDateTime).join(' · ')}`
              : `${row.student.name}: cap absència fictícia.`,
          )}
          onOpenEvolution={(row) => simulateAction(`S’obriria l’evolució fictícia de ${row.student.id}.`)}
          onOpenInfo={() => simulateAction('La taula creua rendiment, constància, absències i incidències fictícies.')}
          onOpenTrackingEvidence={(row) => simulateAction(`S’obririen les evidències fictícies de ${row.student.id}.`)}
          onSortModeChange={setAnalysisSortMode}
          rows={crossAnalysisRows}
          sortMode={analysisSortMode}
        /> : activeSurface === 'groups' && !groupTool ? <GroupToolsMenu onOpenCooperative={() => setGroupTool('cooperative')} onOpenHalfGroups={() => setGroupTool('half-groups')} />
        : activeSurface === 'groups' && groupTool === 'half-groups' ? <><button onClick={() => setGroupTool('')} type="button">Tornar a grups</button>
              <HalfGroupsPanel key={activeClass?.id} students={activeClassStudents}
                relations={dataset.sociometricRelations || []}
                appliedMessage="Mitjos grups ficticis aplicats només en memòria."
                onApply={async (assignments) => { setSyntheticHalfGroups((current) => ({ ...current, ...assignments })); simulateAction('Proposta A/B comprovada només en memòria amb alumnat fictici.') }} />

</>
        : activeSurface === 'groups' ? <div className="assistance-cooperative-layout">
          <button onClick={() => setGroupTool('')} type="button">Tornar a grups</button>
          <section className="assistance-cooperative-main">
            <header className="assistance-cooperative-heading">
              <div>
                <span>Agrupament completament fictici</span>
                <h3>Proposta de cinc grups</h3>
              </div>
              <button
                onClick={() => {
                  setCooperativeVariant((current) => current + 2)
                  setSelectedCooperativeGroupId('')
                  simulateAction('Nova proposta cooperativa fictícia generada només en memòria.')
                }}
                type="button"
              >
                Nova proposta fictícia
              </button>
            </header>
            <CooperativeGroupGrid
              groups={cooperativeGroups}
              onSelectGroup={(group) => {
                setSelectedCooperativeGroupId(group.id)
                simulateAction(`Grup cooperatiu fictici seleccionat: ${group.name}.`)
              }}
              selectedGroupId={selectedCooperativeGroupId}
            />
          </section>
          <aside className="assistance-cooperative-preview" aria-live="polite">
            <span>Detall fictici del grup</span>
            {selectedCooperativeGroup ? (
              <>
                <h3>{selectedCooperativeGroup.name}</h3>
                <dl>
                  <div><dt>Membres</dt><dd>{selectedCooperativeGroup.members.length}</dd></div>
                  <div><dt>Estat simulat</dt><dd>{selectedCooperativeGroup.status}</dd></div>
                  <div><dt>Perfils prioritaris ficticis</dt><dd>{selectedCooperativeGroup.priorityCount}</dd></div>
                  <div><dt>Referència positiva simulada</dt><dd>{selectedCooperativeGroup.hasPositiveReference ? 'Sí' : 'No'}</dd></div>
                </dl>
                <p>{selectedCooperativeGroup.summary}</p>
              </>
            ) : <h3>Selecciona un grup fictici</h3>}
            <p>Sense rols, observacions, restriccions, historial, còpia, compartició ni versions desades reals.</p>
          </aside>
        </div> : activeSurface === 'classroom' ? <div className="assistance-seating-layout">
          <section className="assistance-seating-main">
            <header className="assistance-seating-heading">
              <div>
                <span>Disposició completament fictícia</span>
                <h3>Plànol de l’aula</h3>
              </div>
              <button
                onClick={() => {
                  setSeatingVariant((current) => current + 3)
                  setSelectedSeatingStudentId('')
                  simulateAction('Alternativa fictícia generada només en memòria.')
                }}
                type="button"
              >
                Genera una alternativa fictícia
              </button>
            </header>
            <SeatingPlanBoard
              columns={5}
              onSelectSeat={(seat) => {
                setSelectedSeatingStudentId(seat.student?.id || '')
                if (seat.student) simulateAction(`Lloc fictici seleccionat: ${seat.student.name}.`)
              }}
              seats={seatingSeats}
              selectedStudentId={selectedSeatingStudentId}
            />
          </section>
          <aside className="assistance-seating-preview" aria-live="polite">
            <span>Detall del lloc fictici</span>
            {selectedSeatingSeat ? (
              <>
                <h3>{selectedSeatingSeat.student.name}</h3>
                <dl>
                  <div><dt>Posició simulada</dt><dd>Fila {selectedSeatingSeat.row}, taula {selectedSeatingSeat.column}</dd></div>
                  <div><dt>Mig grup</dt><dd>{selectedSeatingSeat.student.halfGroup}</dd></div>
                  <div><dt>Categoria fictícia</dt><dd>{selectedSeatingSeat.category}</dd></div>
                  <div><dt>Suport simulat</dt><dd>{selectedSeatingSeat.student.support}</dd></div>
                </dl>
              </>
            ) : <h3>Selecciona una taula ocupada</h3>}
            <p>Sense fotografies, observacions, restriccions, historial, exportació ni versions desades reals.</p>
          </aside>
        </div> : activeSurface === 'sociometry' ? <div className="assistance-sociometry-layout">
          <section className="assistance-sociometry-main">
            <SociometricSummaryPanel
              categoryRows={sociometricSummary.categoryRows}
              eyebrow="Lectura sintètica"
              metrics={sociometricSummary.metrics}
              notice="Totes les relacions d’aquesta lectura són inventades i només formen part del paquet de demostració."
              title="Indicadors sociomètrics ficticis"
            />
            <article className="assistance-sociometry-table-card">
              <header>
                <div>
                  <span>Mapa fictici del grup</span>
                  <h3>Lectura per alumne</h3>
                </div>
                <strong>{sociometricSummary.relationCount} relacions inventades</strong>
              </header>
              <div className="assistance-sociometry-table" role="list">
                {sociometricSummary.studentRows.map((row) => (
                  <button
                    aria-pressed={row.student.id === selectedSociometricStudentId}
                    className={row.student.id === selectedSociometricStudentId ? 'selected' : ''}
                    data-sociometric-student-row={row.student.id}
                    key={row.student.id}
                    onClick={() => {
                      setSelectedSociometricStudentId(row.student.id)
                      simulateAction(`Lectura sociomètrica fictícia seleccionada: ${row.student.name}.`)
                    }}
                    role="listitem"
                    type="button"
                  >
                    <strong>{row.student.name}</strong>
                    <span>{row.category}</span>
                    <small>{row.positiveReceived} eleccions · {row.avoidReceived} rebuigs</small>
                  </button>
                ))}
              </div>
            </article>
          </section>
          <aside className="assistance-sociometry-preview" aria-live="polite">
            <span>Detall fictici</span>
            {selectedSociometricStudent ? (
              <>
                <h3>{selectedSociometricStudent.student.name}</h3>
                <dl>
                  <div><dt>Categoria simulada</dt><dd>{selectedSociometricStudent.category}</dd></div>
                  <div><dt>Eleccions rebudes</dt><dd>{selectedSociometricStudent.positiveReceived}</dd></div>
                  <div><dt>Rebuigs rebuts</dt><dd>{selectedSociometricStudent.avoidReceived}</dd></div>
                  <div><dt>Parelles recíproques del grup</dt><dd>{sociometricSummary.reciprocalPairCount}</dd></div>
                </dl>
              </>
            ) : <h3>Selecciona un alumne fictici</h3>}
            <p>Sense qüestionaris públics, enllaços, respostes reals, notes lliures ni sincronització.</p>
          </aside>
        </div> : <div className="assistance-tutoring-layout">
          <article className="assistance-tutoring-card">
            <div className="assistance-tutoring-heading">
              <div>
                <span>Informes tutorials ficticis</span>
                <h3>Perfils per preparar</h3>
              </div>
              <div className="tutorial-profile-filter-tabs" aria-label="Filtre d’informes tutorials ficticis">
                <button
                  className={tutorialProfileFilter === 'priority' ? 'active' : ''}
                  onClick={() => setTutorialProfileFilter('priority')}
                  type="button"
                >
                  Prioritaris
                </button>
                <button
                  className={tutorialProfileFilter === 'all' ? 'active' : ''}
                  onClick={() => setTutorialProfileFilter('all')}
                  type="button"
                >
                  Tots
                </button>
              </div>
            </div>
            <TutorialProfileList
              emptyText="Aquest filtre no té cap alumne fictici."
              onSelectProfile={(row) => {
                setSelectedTutorialStudentId(row.student.id)
                simulateAction(`Perfil tutorial fictici seleccionat: ${row.student.name}.`)
              }}
              rows={tutorialProfileRows}
              selectedStudentId={selectedTutorialStudentId}
            />
          </article>
          <aside className="assistance-tutoring-preview" aria-live="polite">
            {selectedTutorialProfile ? (
              <>
                <span>Vista prèvia fictícia</span>
                <h3>{selectedTutorialProfile.student.name}</h3>
                <dl>
                  <div><dt>Suport simulat</dt><dd>{selectedTutorialProfile.student.support}</dd></div>
                  <div><dt>Competències no assolides</dt><dd>{selectedTutorialProfile.notDevelopedCount}</dd></div>
                  <div><dt>Registres tutorials</dt><dd>{selectedTutorialProfile.trackingCount}</dd></div>
                  <div><dt>Estat</dt><dd>{selectedTutorialProfile.reportStatus}</dd></div>
                </dl>
                <p>No conté diagnòstics, comentaris familiars ni informació personal real.</p>
              </>
            ) : (
              <>
                <span>Vista prèvia fictícia</span>
                <h3>Selecciona un alumne</h3>
                <p>Aquí només apareixerà una síntesi generada amb dades integrades de demostració.</p>
              </>
            )}
          </aside>
        </div>}
      </section>
    </main>
  )
}

export default AssistanceApp
