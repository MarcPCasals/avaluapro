const LEVELS = ['A', 'B', 'C', 'D']
const SUPPORT_CASES = ['Cap suport', 'Cas fictici 1', 'Cas fictici 2', 'Cas fictici 3']

function buildStudents(classId, amount, offset = 0) {
  return Array.from({ length: amount }, (_, index) => {
    const number = index + 1 + offset
    return {
      id: `synthetic-student-${number}`,
      classId,
      displayName: `Alumne ${String(number).padStart(2, '0')}`,
      halfGroup: index % 2 === 0 ? 'Grup A' : 'Grup B',
      evaluation: LEVELS[index % LEVELS.length],
      completedTasks: 6 + (index % 5),
      totalTasks: 10,
      absenceHours: index % 4,
      incidents: index % 7 === 6 ? 1 : 0,
      tutorialRecordCount: index % 4,
      support: SUPPORT_CASES[index % SUPPORT_CASES.length],
      personalNotes: index % 3 === 0 ? 'Observació pedagògica completament fictícia.' : '',
    }
  })
}

const STUDENTS = [
  ...buildStudents('synthetic-class-science', 24),
  ...buildStudents('synthetic-class-tutoring', 18, 24),
]

function buildAbsenceRecords(students) {
  return students.flatMap((student, studentIndex) => Array.from(
    { length: student.absenceHours },
    (_, absenceIndex) => {
      const day = String(3 + ((studentIndex + absenceIndex * 4) % 20)).padStart(2, '0')
      const hour = String(9 + (absenceIndex % 4)).padStart(2, '0')
      return {
        id: `synthetic-absence-${student.id}-${absenceIndex + 1}`,
        classId: student.classId,
        studentId: student.id,
        date: `2026-09-${day}`,
        time: `${hour}:00`,
        slotKey: `2026-09-${day}T${hour}`,
        hours: 1,
        recordedAt: `2026-09-${day}T${hour}:00:00`,
      }
    },
  ))
}

const EVALUATION_COMPETENCIES = [
  {
    id: 'synthetic-competency-1',
    name: 'Competència fictícia 1',
    color: 'blue',
    criteria: [
      { id: 'synthetic-criterion-1', name: 'Criteri fictici 1' },
      { id: 'synthetic-criterion-2', name: 'Criteri fictici 2' },
    ],
  },
  {
    id: 'synthetic-competency-2',
    name: 'Competència fictícia 2',
    color: 'green',
    criteria: [
      { id: 'synthetic-criterion-3', name: 'Criteri fictici 3' },
    ],
  },
]

function buildEvaluationMarks(students) {
  const criteria = EVALUATION_COMPETENCIES.flatMap((competency) => competency.criteria)
  return students.flatMap((student, studentIndex) => criteria.map((criterion, criterionIndex) => ({
    id: `synthetic-mark-${student.id}-${criterion.id}`,
    criterionId: criterion.id,
    studentId: student.id,
    value: LEVELS[(studentIndex + criterionIndex) % LEVELS.length],
  })))
}

const TRACKING_TASKS = [
  ...['synthetic-class-science', 'synthetic-class-tutoring'].flatMap((classId, classIndex) => [
    { id: `synthetic-task-${classIndex + 1}-1`, classId, title: 'Tasca fictícia 1', date: '2026-10-01' },
    { id: `synthetic-task-${classIndex + 1}-2`, classId, title: 'Tasca fictícia 2', date: '2026-10-08' },
    { id: `synthetic-task-${classIndex + 1}-3`, classId, title: 'Tasca fictícia 3', date: '2026-10-15' },
  ]),
]

function buildTrackingRecords(students) {
  const statuses = ['DONE', 'LATE', 'MISSING', 'EXEMPT']
  return students.flatMap((student, studentIndex) => TRACKING_TASKS
    .filter((task) => task.classId === student.classId)
    .map((task, taskIndex) => ({
      id: `synthetic-record-${student.id}-${task.id}`,
      classId: task.classId,
      studentId: student.id,
      taskId: task.id,
      status: statuses[(studentIndex + taskIndex) % statuses.length],
    })))
}

function buildSociometricRelations(students) {
  const tutoringStudents = students.filter((student) => student.classId === 'synthetic-class-tutoring')
  const ordinaryTargets = tutoringStudents.slice(1, -1)

  return tutoringStudents.flatMap((student, index) => {
    const leader = tutoringStudents[0]
    const rotatingTarget = ordinaryTargets[(index + 3) % ordinaryTargets.length]
    const positiveTargets = [
      student.id === leader.id ? tutoringStudents[1] : leader,
      rotatingTarget.id === student.id ? ordinaryTargets[(index + 4) % ordinaryTargets.length] : rotatingTarget,
    ]
    const positiveRelations = positiveTargets.map((target, relationIndex) => ({
      id: `synthetic-relation-positive-${student.id}-${relationIndex + 1}`,
      classId: student.classId,
      sourceStudentId: student.id,
      targetStudentId: target.id,
      type: 'positive',
    }))
    const avoidRelations = index % 3 === 0
      ? [{
          id: `synthetic-relation-avoid-${student.id}`,
          classId: student.classId,
          sourceStudentId: student.id,
          targetStudentId: tutoringStudents[index % 2 === 0 ? 5 : 10].id,
          type: 'avoid',
        }]
      : []

    return [...positiveRelations, ...avoidRelations]
  })
}

export const assistanceDataset = {
  metadata: {
    kind: 'synthetic',
    label: 'Conjunt sintètic integrat',
    containsRealData: false,
    persistent: false,
  },
  classes: [
    {
      id: 'synthetic-class-science',
      name: 'Grup fictici A',
      subject: 'Ciències — demostració',
      isTutoringGroup: false,
    },
    {
      id: 'synthetic-class-tutoring',
      name: 'Tutoria fictícia B',
      subject: 'Tutoria — demostració',
      isTutoringGroup: true,
    },
  ],
  students: STUDENTS,
  evaluationCompetencies: EVALUATION_COMPETENCIES,
  evaluationMarks: buildEvaluationMarks(STUDENTS),
  trackingTasks: TRACKING_TASKS,
  trackingRecords: buildTrackingRecords(STUDENTS),
  absenceRecords: buildAbsenceRecords(STUDENTS),
  sociometricRelations: buildSociometricRelations(STUDENTS),
}
