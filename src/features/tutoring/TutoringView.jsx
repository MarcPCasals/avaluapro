import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clipboard,
  ClipboardList,
  Eye,
  FileDown,
  FileSpreadsheet,
  GraduationCap,
  Layers3,
  Plus,
  Trash2,
  TrendingDown,
  UsersRound,
} from 'lucide-react'
import { Modal } from '../../components/Modal'
import { SUBJECT_AREAS, SUBJECT_STRUCTURES } from '../../data/subjects'
import { downloadBlob, getTodaySlug } from '../../lib/downloads'
import { GRADE_OPTIONS, calculateGrade, getNumericFromGrade, gradeClassName, gradeTextClassName } from '../../lib/grades'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'

const TUTORING_RECORD_TYPES = [
  { id: 'agenda', label: 'Notes a l’agenda', tone: 'amber' },
  { id: 'incident', label: 'Fulls d’incidents', tone: 'red' },
  { id: 'classroom-expulsion', label: 'Expulsions d’aula', tone: 'violet' },
  { id: 'center-expulsion', label: 'Expulsions de centre', tone: 'slate' },
]
const VALID_IMPORT_GRADES = new Set(['A', 'B', 'C', 'D', 'NA'])
const EMPTY_IMPORT_MARKS = new Set(['', '-', '—', '.'])

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

function getStoredTutorialCompetencyGrade(tutorialMarks, classId, studentId, subject, competency) {
  const directGrade = tutorialMarks.find(
    (mark) =>
      mark.classId === classId &&
      mark.studentId === studentId &&
      mark.subject === subject &&
      mark.competencyKey === competency.key,
  )?.value
  if (directGrade) return directGrade

  const legacyCriterionGrades = competency.criteria
    .map(
      (criterion) =>
        tutorialMarks.find(
          (mark) =>
            mark.classId === classId &&
            mark.studentId === studentId &&
            mark.subject === subject &&
            mark.criterionKey === criterion.key,
        )?.value,
    )
    .filter(Boolean)

  return calculateGrade(legacyCriterionGrades)
}

function getLinkedEvaluationCompetencyGrade({ competency, evaluationContext, studentId, subject }) {
  if (!evaluationContext || subject !== evaluationContext.linkedSubject) return ''

  const classUtIds = new Set(
    evaluationContext.uts.filter((ut) => ut.classId === evaluationContext.linkedClassId).map((ut) => ut.id),
  )
  const matchingCompetencies = evaluationContext.competencies.filter(
    (item) => classUtIds.has(item.utId) && item.name === competency.name,
  )
  const competencyGrades = matchingCompetencies
    .map((item) => {
      const competencyCriteria = evaluationContext.criteria.filter((criterion) => criterion.competencyId === item.id)
      const criterionGrades = competencyCriteria
        .map(
          (criterion) =>
            evaluationContext.marks.find(
              (mark) => mark.studentId === studentId && mark.criterionId === criterion.id,
            )?.value,
        )
        .filter(Boolean)

      return calculateGrade(criterionGrades)
    })
    .filter(Boolean)

  return calculateGrade(competencyGrades)
}

function getTutorialCompetencyGrade({
  classId,
  competency,
  evaluationContext,
  studentId,
  subject,
  tutorialMarks,
}) {
  return (
    getStoredTutorialCompetencyGrade(tutorialMarks, classId, studentId, subject, competency) ||
    getLinkedEvaluationCompetencyGrade({ competency, evaluationContext, studentId, subject }) ||
    ''
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

function summarizeTutorialData({ classId, evaluationContext, students, tutorialMarks }) {
  const subjectOptions = getAllTutorialSubjectOptions()
  const areaBuckets = new Map()
  const subjectBuckets = new Map()
  const studentProfiles = students.map((student) => {
    const evaluatedCompetencies = []

    subjectOptions.forEach((subjectOption) => {
      buildTutorialCompetencies(subjectOption.subject).forEach((competency) => {
        const grade = getTutorialCompetencyGrade({
          classId,
          competency,
          evaluationContext,
          studentId: student.id,
          subject: subjectOption.subject,
          tutorialMarks,
        })
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

function summarizeTutorialGroup({ recordRowsByStudent, tutorialRecordSummary, tutorialSummary }) {
  const academicProfiles = tutorialSummary.studentProfiles.filter((profile) => profile.evaluatedCount > 0)
  const priorityStudents = tutorialSummary.studentProfiles
    .map((profile) => {
      const recordRow = recordRowsByStudent.get(profile.student.id)
      const recordSeverity =
        (recordRow?.agenda || 0) +
        (recordRow?.incident || 0) * 2 +
        (recordRow?.classroomExpulsion || 0) * 3 +
        (recordRow?.centerExpulsion || 0) * 4
      const academicSeverity =
        profile.notDevelopedCount * 2 +
        (profile.notDevelopedPercent >= 30 ? 2 : 0) +
        (profile.evaluatedCount > 0 && profile.averageScore <= 2 ? 2 : 0)
      const score = academicSeverity + recordSeverity
      const reasons = []
      if (profile.notDevelopedCount > 0) reasons.push(`${profile.notDevelopedCount} competència/es no assolides`)
      if (profile.notDevelopedPercent >= 30) reasons.push(`${formatPercent(profile.notDevelopedPercent)} no assolides`)
      if (recordRow?.agenda) reasons.push(`${recordRow.agenda} nota/es a l’agenda`)
      if (recordRow?.incident) reasons.push(`${recordRow.incident} incident/s`)
      if ((recordRow?.classroomExpulsion || 0) + (recordRow?.centerExpulsion || 0) > 0) {
        reasons.push(`${(recordRow?.classroomExpulsion || 0) + (recordRow?.centerExpulsion || 0)} expulsió/ns`)
      }

      return {
        academicSeverity,
        profile,
        reasons,
        recordRow,
        recordSeverity,
        score,
      }
    })
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.academicSeverity - a.academicSeverity ||
        b.recordSeverity - a.recordSeverity ||
        a.profile.student.name.localeCompare(b.profile.student.name, 'ca'),
    )

  const totalRecords = tutorialRecordSummary.studentRows.reduce((total, row) => total + row.total, 0)
  const studentsWithData = new Set([
    ...academicProfiles.map((profile) => profile.student.id),
    ...tutorialRecordSummary.studentsWithRecords.map((row) => row.student.id),
  ])

  return {
    academicCoveragePercent:
      tutorialSummary.studentProfiles.length > 0
        ? (academicProfiles.length / tutorialSummary.studentProfiles.length) * 100
        : 0,
    priorityStudents,
    studentsWithData: studentsWithData.size,
    totalRecords,
  }
}

function getTutorialProfilePriority(profile, recordRow) {
  return (
    profile.notDevelopedCount * 3 +
    (profile.notDevelopedPercent >= 30 ? 2 : 0) +
    (profile.averageScore > 0 && profile.averageScore <= 2 ? 2 : 0) +
    (recordRow?.agenda || 0) +
    (recordRow?.incident || 0) * 2 +
    (recordRow?.classroomExpulsion || 0) * 3 +
    (recordRow?.centerExpulsion || 0) * 4
  )
}

function getProfileExecutiveSummary(profile, records) {
  const notDevelopedText =
    profile.notDevelopedCount > 0
      ? `${profile.notDevelopedCount} competència/es no assolides (${formatPercent(profile.notDevelopedPercent)}).`
      : 'No hi ha competències no assolides registrades.'
  const recordCounts = TUTORING_RECORD_TYPES.map((type) => ({
    ...type,
    count: countByType(records, type.id),
  }))
  const relevantRecords = recordCounts.filter((item) => item.count > 0)
  const weakestEvidence = profile.weakestArea
    ? `L’àrea més delicada és ${profile.weakestArea.name}.`
    : 'Encara no hi ha una àrea delicada clara.'
  const trackingEvidence =
    relevantRecords.length > 0
      ? relevantRecords.map((item) => `${item.count} ${item.label.toLowerCase()}`).join(' · ')
      : 'Sense registres tutorials específics.'

  let title = 'Seguiment ordinari'
  let tone = 'ok'
  let action = 'Mantenir observació ordinària i actualitzar el perfil quan entrin noves dades.'

  if (profile.notDevelopedCount >= 2 || profile.notDevelopedPercent >= 30) {
    title = 'Prioritat acadèmica'
    tone = 'warning'
    action = 'Revisar amb l’alumne quines competències pesen més i pactar una acció concreta de millora.'
  }
  if (relevantRecords.some((item) => ['incident', 'classroom-expulsion', 'center-expulsion'].includes(item.id))) {
    title = 'Prioritat tutorial'
    tone = 'risk'
    action = 'Contrastar amb l’equip educatiu si els registres tutorial expliquen o agreugen el rendiment.'
  }
  if ((profile.notDevelopedCount >= 2 || profile.averageScore <= 2) && relevantRecords.length > 0) {
    title = 'Prioritat combinada'
    tone = 'risk'
    action = 'Preparar una intervenció conjunta: tutor, docent de referència i família si escau.'
  }

  return {
    action,
    bullets: [notDevelopedText, weakestEvidence, trackingEvidence],
    title,
    tone,
  }
}

function SubjectCatalogCard({ completion, item, onSelect }) {
  const isComplete = completion?.total > 0 && completion.completed === completion.total

  return (
    <article className={`tutorial-subject-card ${isComplete ? 'complete' : ''}`}>
      <div>
        <strong>{item.subject}</strong>
        <small>{item.areaName}</small>
      </div>
      <span>
        {item.structure.length} competències
        {completion?.total ? ` · ${completion.completed}/${completion.total}` : ''}
      </span>
      <button className="secondary-action compact" onClick={() => onSelect(item.subject)} type="button">
        {isComplete ? 'Omplert' : 'Omplir'}
      </button>
    </article>
  )
}

function normalizeImportGrade(value) {
  const cleanValue = String(value || '').trim().toUpperCase()
  if (EMPTY_IMPORT_MARKS.has(cleanValue)) return { invalid: false, raw: String(value || '').trim(), value: '' }
  if (VALID_IMPORT_GRADES.has(cleanValue)) return { invalid: false, raw: cleanValue, value: cleanValue }
  return { invalid: Boolean(cleanValue), raw: String(value || '').trim(), value: '' }
}

function buildTutorialImportColumns(subjectOptions) {
  return subjectOptions.flatMap((subjectOption) =>
    buildTutorialCompetencies(subjectOption.subject).map((competency) => ({
      areaName: subjectOption.areaName,
      competency,
      id: `${subjectOption.subject}_${competency.key}`,
      label: competency.name,
      subject: subjectOption.subject,
    })),
  )
}

function createTutorialImportMatrix({ classId, columns, evaluationContext, students, tutorialMarks }) {
  return students.map((student) =>
    columns.map((column) => {
      const value = getTutorialCompetencyGrade({
        classId,
        competency: column.competency,
        evaluationContext,
        studentId: student.id,
        subject: column.subject,
        tutorialMarks,
      })

      return { invalid: false, raw: value, touched: false, value }
    }),
  )
}

function detectImportSeparator(text) {
  const firstLine = String(text || '').split(/\r?\n/).find((line) => line.trim()) || ''
  if (firstLine.includes('\t')) return '\t'
  if (firstLine.includes(';')) return ';'
  return ','
}

function splitImportRows(rawText) {
  const separator = detectImportSeparator(rawText)
  return String(rawText || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((row) => row.trim())
    .map((row) => row.split(separator).map((cell) => cell.trim()))
}

function rowLooksLikeTutorialHeader(row) {
  const firstCell = String(row[0] || '').toLowerCase()
  return firstCell.includes('alumne') || row.some((cell) => String(cell || '').includes(' · C'))
}

function removeLeadingStudentName(row, columnCount) {
  if (row.length !== columnCount + 1) return row
  return normalizeImportGrade(row[0]).invalid ? row.slice(1) : row
}

function buildTutorialMatrixFromText(rawText, currentMatrix, columns, students) {
  const matrix = currentMatrix.map((row) => row.map((cell) => ({ ...cell, raw: '', touched: false, value: '' })))
  const rawRows = splitImportRows(rawText)
  const rows = rawRows[0] && rowLooksLikeTutorialHeader(rawRows[0]) ? rawRows.slice(1) : rawRows

  rows.slice(0, students.length).forEach((row, rowIndex) => {
    const cells = removeLeadingStudentName(row, columns.length)
    cells.slice(0, columns.length).forEach((cell, columnIndex) => {
      matrix[rowIndex][columnIndex] = {
        ...normalizeImportGrade(cell),
        touched: Boolean(String(cell || '').trim()),
      }
    })
  })

  return { ignoredRows: Math.max(0, rows.length - students.length), matrix }
}

function buildTutorialTemplateText({ classId, columns, evaluationContext, students, tutorialMarks }) {
  const header = ['Alumne', ...columns.map((column) => `${column.subject} · ${column.label}`)]
  const rows = students.map((student) => [
    student.name,
    ...columns.map((column) =>
      getTutorialCompetencyGrade({
        classId,
        competency: column.competency,
        evaluationContext,
        studentId: student.id,
        subject: column.subject,
        tutorialMarks,
      }),
    ),
  ])

  return [header, ...rows].map((row) => row.join('\t')).join('\n')
}

function countImportValues(matrix) {
  return matrix.flat().filter((cell) => cell.value).length
}

function countImportInvalids(matrix) {
  return matrix.flat().filter((cell) => cell.invalid).length
}

function TutoringBulkImportModal({
  activeClass,
  classId,
  columns,
  evaluationContext,
  onClose,
  onSave,
  students,
  tutorialMarks,
}) {
  const [{ ignoredRows, matrix }, setImportState] = useState(() => ({
    ignoredRows: 0,
    matrix: createTutorialImportMatrix({ classId, columns, evaluationContext, students, tutorialMarks }),
  }))
  const importedValues = useMemo(() => countImportValues(matrix), [matrix])
  const invalidValues = useMemo(() => countImportInvalids(matrix), [matrix])
  const updates = useMemo(
    () =>
      students.flatMap((student, rowIndex) =>
        columns
          .map((column, columnIndex) => ({
            classId,
            competencyKey: column.competency.key,
            studentId: student.id,
            subject: column.subject,
            touched: matrix[rowIndex]?.[columnIndex]?.touched,
            value: matrix[rowIndex]?.[columnIndex]?.value || '',
          }))
          .filter((update) => update.touched && update.value),
      ),
    [classId, columns, matrix, students],
  )

  const applyText = (text) => {
    setImportState((current) => buildTutorialMatrixFromText(text, current.matrix, columns, students))
  }

  const updateCell = (rowIndex, columnIndex, value) => {
    setImportState((current) => {
      const nextMatrix = current.matrix.map((row) => row.map((cell) => ({ ...cell })))
      nextMatrix[rowIndex][columnIndex] = {
        ...normalizeImportGrade(value),
        touched: Boolean(String(value || '').trim()),
      }
      return { ...current, matrix: nextMatrix }
    })
  }

  const handlePaste = (event) => {
    const text = event.clipboardData.getData('text/plain')
    if (!text.includes('\t') && !text.includes('\n') && !text.includes(';')) return

    event.preventDefault()
    applyText(text)
  }

  const downloadTemplate = () => {
    const templateText = buildTutorialTemplateText({
      classId,
      columns,
      evaluationContext,
      students,
      tutorialMarks,
    })
    const blob = new Blob([templateText], { type: 'text/tab-separated-values;charset=utf-8' })
    downloadBlob(blob, `avaluapro-tutoria-${activeClass?.name || 'classe'}-${getTodaySlug()}.tsv`)
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    applyText(await file.text())
    event.target.value = ''
  }

  const handleSave = async () => {
    await onSave(updates)
    onClose()
  }

  return (
    <Modal onClose={onClose} size="xl" title="Importació massiva de tutoria">
      <div className="tutorial-bulk-import-panel">
        <section className="excel-import-help">
          <FileSpreadsheet size={22} />
          <div>
            <strong>Una plantilla per a totes les matèries</strong>
            <p>
              Descarrega la plantilla, omple les notes A/B/C/D/NA a Excel i torna-la a carregar. Les columnes estan
              agrupades per matèria i competència.
            </p>
          </div>
        </section>

        <div className="tutorial-bulk-import-actions">
          <button className="secondary-action" onClick={downloadTemplate} type="button">
            <FileDown size={17} />
            Descarregar plantilla Excel
          </button>
          <label className="secondary-action file-action">
            <FileSpreadsheet size={17} />
            Carregar plantilla omplerta
            <input accept=".csv,.tsv,.txt" onChange={handleFileUpload} type="file" />
          </label>
          <button
            className="secondary-action"
            onClick={async () => navigator.clipboard.writeText(buildTutorialTemplateText({
              classId,
              columns,
              evaluationContext,
              students,
              tutorialMarks,
            }))}
            type="button"
          >
            <Clipboard size={17} />
            Copiar plantilla
          </button>
        </div>

        <div className="excel-import-status">
          <span className="ok">
            <CheckCircle2 size={16} />
            {importedValues} notes vàlides
          </span>
          {invalidValues > 0 && (
            <span className="warning">
              <AlertTriangle size={16} />
              {invalidValues} cel·les ignorades perquè no són A/B/C/D/NA
            </span>
          )}
          {ignoredRows > 0 && (
            <span className="warning">
              <AlertTriangle size={16} />
              {ignoredRows} files sobrants ignorades
            </span>
          )}
        </div>

        <div className="tutorial-bulk-preview-wrap">
          <table className="tutorial-bulk-preview-table">
            <thead>
              <tr>
                <th rowSpan="2">Alumne</th>
                {columns.map((column) => (
                  <th className="subject-header" key={`${column.id}_subject`}>
                    {column.subject}
                  </th>
                ))}
              </tr>
              <tr>
                {columns.map((column) => (
                  <th key={column.id}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student, rowIndex) => (
                <tr key={student.id}>
                  <th>{student.name}</th>
                  {columns.map((column, columnIndex) => {
                    const cell = matrix[rowIndex]?.[columnIndex] || { invalid: false, raw: '', value: '' }
                    return (
                      <td className={cell.invalid ? 'invalid-import-cell' : gradeTextClassName(cell.value)} key={column.id}>
                        <input
                          aria-label={`${student.name} ${column.subject} ${column.label}`}
                          className={cell.invalid ? 'invalid' : gradeTextClassName(cell.value)}
                          onChange={(event) => updateCell(rowIndex, columnIndex, event.target.value)}
                          onPaste={rowIndex === 0 && columnIndex === 0 ? handlePaste : undefined}
                          placeholder="-"
                          value={cell.raw || cell.value}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="excel-import-actions">
          <span>{updates.length} canvis preparats</span>
          <button className="primary-action" disabled={updates.length === 0 || invalidValues > 0} onClick={handleSave} type="button">
            <CheckCircle2 size={17} />
            Importar totes les notes
          </button>
        </footer>
      </div>
    </Modal>
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
  const [tutorComment, setTutorComment] = useState('')
  const [reportAreaFilter, setReportAreaFilter] = useState('all')
  const [reportSubjectFilter, setReportSubjectFilter] = useState('all')
  const [printSections, setPrintSections] = useState({
    executiveSummary: true,
    performanceSummary: true,
    competencyDetail: true,
    trackingSummary: true,
    trackingEvidence: true,
    tutorComment: true,
  })
  if (!profile) return null

  const records = recordRow?.records || []
  const hasTracking = records.length > 0
  const reportDate = getTodayDateInput()
  const executiveSummary = getProfileExecutiveSummary(profile, records)
  const reportAreaOptions = Object.values(
    profile.evaluatedCompetencies.reduce(
      (areas, item) => ({ ...areas, [item.areaId]: { id: item.areaId, name: item.areaName } }),
      {},
    ),
  ).sort((a, b) => a.name.localeCompare(b.name, 'ca'))
  const reportSubjectOptions = Array.from(new Set(profile.evaluatedCompetencies.map((item) => item.subject))).sort(
    (a, b) => a.localeCompare(b, 'ca'),
  )
  const filteredCompetencies = profile.evaluatedCompetencies.filter(
    (item) =>
      (reportAreaFilter === 'all' || item.areaId === reportAreaFilter) &&
      (reportSubjectFilter === 'all' || item.subject === reportSubjectFilter),
  )
  const groupedByArea = Object.values(
    filteredCompetencies.reduce((areas, item) => {
      const area = areas[item.areaId] || { name: item.areaName, rows: [] }
      area.rows.push(item)
      return { ...areas, [item.areaId]: area }
    }, {}),
  )
  const selectedPrintSections = Object.values(printSections).filter(Boolean).length
  const togglePrintSection = (section) => {
    setPrintSections((current) => ({ ...current, [section]: !current[section] }))
  }

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

        <section className="tutorial-print-options">
          <div>
            <h3 className="tutorial-profile-section-title">Seccions de l’informe</h3>
            <p>Activa només allò que vols incloure quan imprimeixis o desis el perfil com a PDF.</p>
          </div>
          <div className="tutorial-print-option-grid">
            <label>
              <input
                checked={printSections.executiveSummary}
                onChange={() => togglePrintSection('executiveSummary')}
                type="checkbox"
              />
              Resum executiu
            </label>
            <label>
              <input
                checked={printSections.performanceSummary}
                onChange={() => togglePrintSection('performanceSummary')}
                type="checkbox"
              />
              Resum de rendiment
            </label>
            <label>
              <input
                checked={printSections.competencyDetail}
                onChange={() => togglePrintSection('competencyDetail')}
                type="checkbox"
              />
              Detall de competències
            </label>
            <label>
              <input
                checked={printSections.trackingSummary}
                onChange={() => togglePrintSection('trackingSummary')}
                type="checkbox"
              />
              Resum de seguiment
            </label>
            <label>
              <input
                checked={printSections.trackingEvidence}
                onChange={() => togglePrintSection('trackingEvidence')}
                type="checkbox"
              />
              Evidències de seguiment
            </label>
            <label>
              <input
                checked={printSections.tutorComment}
                onChange={() => togglePrintSection('tutorComment')}
                type="checkbox"
              />
              Comentari del tutor
            </label>
          </div>
          <div className="tutorial-report-filter-grid">
            <label>
              Àrea del detall
              <select
                onChange={(event) => {
                  setReportAreaFilter(event.target.value)
                  setReportSubjectFilter('all')
                }}
                value={reportAreaFilter}
              >
                <option value="all">Totes les àrees</option>
                {reportAreaOptions.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Assignatura del detall
              <select onChange={(event) => setReportSubjectFilter(event.target.value)} value={reportSubjectFilter}>
                <option value="all">Totes les assignatures</option>
                {reportSubjectOptions.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {selectedPrintSections === 0 && (
            <strong className="tutorial-print-warning">Selecciona almenys una secció abans d’imprimir.</strong>
          )}
        </section>

        {printSections.executiveSummary && (
          <section className={`tutorial-executive-summary ${executiveSummary.tone}`}>
            <h3 className="tutorial-profile-section-title">Resum executiu</h3>
            <strong>{executiveSummary.title}</strong>
            <ul>
              {executiveSummary.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
            <p>{executiveSummary.action}</p>
          </section>
        )}

        {printSections.tutorComment && (
          <section className="tutorial-tutor-comment-section">
            <h3 className="tutorial-profile-section-title">Comentari del tutor</h3>
            <textarea
              className="tutorial-tutor-comment-editor"
              onChange={(event) => setTutorComment(event.target.value)}
              placeholder="Escriu aquí la síntesi docent: què preocupa, què ha millorat, quin acord proposem o quin seguiment cal fer..."
              value={tutorComment}
            />
            <div className={`tutorial-tutor-comment-print ${tutorComment.trim() ? '' : 'empty'}`}>
              {tutorComment.trim() || 'Sense comentari del tutor afegit.'}
            </div>
          </section>
        )}

        {printSections.performanceSummary && (
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
        )}

        {printSections.trackingSummary && (
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
        )}

        {printSections.competencyDetail && (
          <section>
            <h3 className="tutorial-profile-section-title">Detall de competències</h3>
            {profile.evaluatedCount === 0 ? (
              <div className="empty-state compact">Encara no hi ha notes tutorials per aquest alumne.</div>
            ) : (
              <div className="tutorial-profile-area-list">
                {groupedByArea.map((area) => (
                  <section key={area.name}>
                    <h3>{area.name}</h3>
                    {area.rows.map((row) => (
                      <div
                        className={`tutorial-profile-row ${row.notDeveloped ? 'risk' : ''}`}
                        key={`${row.subject}_${row.competencyName}`}
                      >
                        <div>
                          <strong>{row.subject}</strong>
                          <span>{row.competencyName}</span>
                        </div>
                        <span className={gradeClassName(row.grade)}>{row.grade}</span>
                      </div>
                    ))}
                  </section>
                ))}
                {filteredCompetencies.length === 0 && (
                  <div className="empty-state compact">Aquest filtre no té competències registrades.</div>
                )}
              </div>
            )}
          </section>
        )}

        {printSections.trackingEvidence && (
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
        )}

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
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [profileFilter, setProfileFilter] = useState('priority')
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
  const marks = useAvaluaproStore((state) => state.marks)
  const competencies = useAvaluaproStore((state) => state.competencies)
  const criteria = useAvaluaproStore((state) => state.criteria)
  const uts = useAvaluaproStore((state) => state.uts)
  const tutorialRecords = useAvaluaproStore((state) => state.tutorialRecords)
  const tutorialMarks = useAvaluaproStore((state) => state.tutorialMarks)
  const updateTutorialMark = useAvaluaproStore((state) => state.updateTutorialMark)
  const importTutorialMarks = useAvaluaproStore((state) => state.importTutorialMarks)
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
  const allSubjectOptions = useMemo(() => getAllTutorialSubjectOptions(), [])
  const bulkImportColumns = useMemo(() => buildTutorialImportColumns(allSubjectOptions), [allSubjectOptions])
  const autoSubject =
    linkedClass?.subject && SUBJECT_STRUCTURES[linkedClass.subject] ? linkedClass.subject : subjectOptions[0]?.subject
  const selectedSubject = subjectFilter === 'auto' ? autoSubject : subjectFilter
  const selectedSubjectArea = getSubjectArea(selectedSubject)
  const selectedCompetencies = useMemo(() => buildTutorialCompetencies(selectedSubject), [selectedSubject])
  const evaluationContext = useMemo(
    () => ({
      criteria,
      competencies,
      linkedClassId,
      linkedSubject: linkedClass?.subject,
      marks,
      uts,
    }),
    [criteria, competencies, linkedClass?.subject, linkedClassId, marks, uts],
  )
  const tutorialSummary = useMemo(
    () =>
      summarizeTutorialData({
        classId: activeClassId,
        evaluationContext,
        students: classStudents,
        tutorialMarks,
      }),
    [activeClassId, classStudents, evaluationContext, tutorialMarks],
  )
  const subjectCompletion = useMemo(() => {
    const entries = subjectOptions.map((item) => {
      const subjectCompetencies = buildTutorialCompetencies(item.subject)
      const total = classStudents.length * subjectCompetencies.length
      const completed = classStudents.reduce(
        (studentTotal, student) =>
          studentTotal +
          subjectCompetencies.filter((competency) =>
            getTutorialCompetencyGrade({
              classId: activeClassId,
              competency,
              evaluationContext,
              studentId: student.id,
              subject: item.subject,
              tutorialMarks,
            }),
          ).length,
        0,
      )

      return [item.subject, { completed, total }]
    })

    return new Map(entries)
  }, [activeClassId, classStudents, evaluationContext, subjectOptions, tutorialMarks])
  const tutorialRecordSummary = useMemo(
    () => summarizeTutorialRecords({ students: classStudents, records: classTutorialRecords }),
    [classStudents, classTutorialRecords],
  )
  const tutorialRecordRowsByStudent = useMemo(
    () => new Map(tutorialRecordSummary.studentRows.map((row) => [row.student.id, row])),
    [tutorialRecordSummary.studentRows],
  )
  const tutorialGroupSummary = useMemo(
    () =>
      summarizeTutorialGroup({
        recordRowsByStudent: tutorialRecordRowsByStudent,
        tutorialRecordSummary,
        tutorialSummary,
      }),
    [tutorialRecordRowsByStudent, tutorialRecordSummary, tutorialSummary],
  )
  const selectedTutorialProfile = tutorialSummary.studentProfiles.find(
    (profile) => profile.student.id === selectedTutorialProfileId,
  )
  const selectedTutorialRecordRow = tutorialRecordSummary.studentRows.find(
    (row) => row.student.id === selectedTutorialRecordStudentId,
  )
  const filteredTutorialProfiles = useMemo(
    () =>
      tutorialSummary.studentProfiles
        .filter((profile) => {
          const recordRow = tutorialRecordRowsByStudent.get(profile.student.id)
          if (profileFilter === 'all') return true
          if (profileFilter === 'priority') return getTutorialProfilePriority(profile, recordRow) > 0
          if (profileFilter === 'not-developed') return profile.notDevelopedCount > 0
          if (profileFilter === 'tracking') return (recordRow?.total || 0) > 0
          return true
        })
        .sort((a, b) => {
          const priorityA = getTutorialProfilePriority(a, tutorialRecordRowsByStudent.get(a.student.id))
          const priorityB = getTutorialProfilePriority(b, tutorialRecordRowsByStudent.get(b.student.id))
          if (priorityA !== priorityB) return priorityB - priorityA
          return a.student.name.localeCompare(b.student.name, 'ca')
        }),
    [profileFilter, tutorialRecordRowsByStudent, tutorialSummary.studentProfiles],
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
          <section className="tutorial-group-diagnosis">
            <header>
              <div>
                <span className="section-kicker">
                  <BarChart3 size={17} />
                  Diagnòstic tutorial del grup
                </span>
                <h2>Visió de tutor</h2>
                <p>
                  Lectura global del grup combinant competències de totes les assignatures i registres tutorials.
                </p>
              </div>
              <button className="secondary-action compact" onClick={() => setActivePanel('profile')} type="button">
                Veure perfils
              </button>
            </header>

            <div className="tutorial-group-diagnosis-grid">
              <article>
                <span>Competències no assolides</span>
                <strong>{tutorialSummary.evaluatedCount > 0 ? formatPercent(tutorialSummary.notDevelopedPercent) : '-'}</strong>
                <small>
                  {tutorialSummary.notDevelopedCount} de {tutorialSummary.evaluatedCount} competències avaluades
                </small>
              </article>
              <article>
                <span>Cobertura tutorial</span>
                <strong>{formatPercent(tutorialGroupSummary.academicCoveragePercent)}</strong>
                <small>{tutorialGroupSummary.studentsWithData} alumnes amb dades acadèmiques o de seguiment</small>
              </article>
              <article>
                <span>Àrea prioritària</span>
                <strong>{tutorialSummary.weakestArea?.name || '-'}</strong>
                <small>
                  {tutorialSummary.weakestArea
                    ? `${formatPercent(tutorialSummary.weakestArea.notDevelopedPercent)} no assolides`
                    : 'Encara no hi ha prou dades'}
                </small>
              </article>
              <article className={tutorialGroupSummary.priorityStudents.length > 0 ? 'risk' : 'ok'}>
                <span>Alumnes prioritaris</span>
                <strong>{tutorialGroupSummary.priorityStudents.length}</strong>
                <small>Rendiment baix, registres tutorials o acumulació combinada</small>
              </article>
            </div>

            {tutorialGroupSummary.priorityStudents.length > 0 ? (
              <div className="tutorial-group-priority-list">
                {tutorialGroupSummary.priorityStudents.slice(0, 6).map((item) => (
                  <button
                    className="tutorial-group-priority-row"
                    key={item.profile.student.id}
                    onClick={() => setSelectedTutorialProfileId(item.profile.student.id)}
                    type="button"
                  >
                    <div>
                      <strong>{item.profile.student.name}</strong>
                      <span>{item.reasons.slice(0, 3).join(' · ')}</span>
                    </div>
                    <em>{item.score}</em>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state compact">
                Quan hi hagi notes tutorials o registres de seguiment, aquí apareixeran els alumnes que cal mirar abans.
              </div>
            )}
          </section>

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
            <button className="secondary-action tutorial-import-all-button" onClick={() => setShowBulkImport(true)} type="button">
              <FileSpreadsheet size={17} />
              Importar totes les matèries
            </button>
          </div>

          <div className="tutorial-subject-overview">
            {subjectOptions.map((item) => (
              <SubjectCatalogCard
                completion={subjectCompletion.get(item.subject)}
                item={item}
                key={item.subject}
                onSelect={setSubjectFilter}
              />
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
                  Posa o revisa la nota de cada competència. Si aquesta classe està vinculada amb una assignatura
                  que ja té notes a Avaluapro, les competències apareixen carregades automàticament.
                </p>
              </div>
            </header>

            {classStudents.length === 0 ? (
              <div className="empty-state compact">Afegeix alumnes a la classe vinculada per començar a posar notes.</div>
            ) : selectedCompetencies.length === 0 ? (
              <div className="empty-state compact">Aquesta assignatura encara no té competències configurades.</div>
            ) : (
              <div className="tutorial-mark-table-wrap">
                <table className="tutorial-mark-table">
                  <thead>
                    <tr>
                      <th>Alumne</th>
                      {selectedCompetencies.map((competency) => (
                        <th key={competency.key}>
                          <span>{selectedSubject}</span>
                          <strong>{competency.name}</strong>
                        </th>
                      ))}
                      <th>Resultat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.map((student) => {
                      const rowValues = selectedCompetencies.map((competency) =>
                        getTutorialCompetencyGrade({
                          classId: activeClassId,
                          competency,
                          evaluationContext,
                          studentId: student.id,
                          subject: selectedSubject,
                          tutorialMarks,
                        }),
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
                          {selectedCompetencies.map((competency) => {
                            const value = getTutorialCompetencyGrade({
                              classId: activeClassId,
                              competency,
                              evaluationContext,
                              studentId: student.id,
                              subject: selectedSubject,
                              tutorialMarks,
                            })
                            return (
                              <td key={`${student.id}_${competency.key}`}>
                                <select
                                  className={gradeTextClassName(value)}
                                  onChange={(event) =>
                                    updateTutorialMark({
                                      classId: activeClassId,
                                      studentId: student.id,
                                      subject: selectedSubject,
                                      competencyKey: competency.key,
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
            <div className="tutorial-profile-filter-tabs" aria-label="Filtre de perfils tutorials">
              <button
                className={profileFilter === 'priority' ? 'active' : ''}
                onClick={() => setProfileFilter('priority')}
                type="button"
              >
                Prioritaris
              </button>
              <button
                className={profileFilter === 'not-developed' ? 'active' : ''}
                onClick={() => setProfileFilter('not-developed')}
                type="button"
              >
                No assolides
              </button>
              <button
                className={profileFilter === 'tracking' ? 'active' : ''}
                onClick={() => setProfileFilter('tracking')}
                type="button"
              >
                Seguiment
              </button>
              <button
                className={profileFilter === 'all' ? 'active' : ''}
                onClick={() => setProfileFilter('all')}
                type="button"
              >
                Tots
              </button>
            </div>
            {tutorialSummary.studentProfiles.length === 0 ? (
              <div className="empty-state compact">Afegeix alumnes per començar a preparar perfils tutorials.</div>
            ) : filteredTutorialProfiles.length === 0 ? (
              <div className="empty-state compact">Aquest filtre no té cap alumne ara mateix.</div>
            ) : (
              <div className="tutorial-student-profile-list">
                {filteredTutorialProfiles.map((profile) => {
                  const recordRow = tutorialRecordRowsByStudent.get(profile.student.id)
                  const trackingCount = recordRow?.total || 0
                  const priority = getTutorialProfilePriority(profile, recordRow)
                  return (
                    <button
                      className={`tutorial-student-profile-row ${
                        priority > 0 ? 'risk' : ''
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
                      <span>{priority > 0 ? `P${priority}` : 'OK'}</span>
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
      {showBulkImport && (
        <TutoringBulkImportModal
          activeClass={activeClass}
          classId={activeClassId}
          columns={bulkImportColumns}
          evaluationContext={evaluationContext}
          onClose={() => setShowBulkImport(false)}
          onSave={importTutorialMarks}
          students={classStudents}
          tutorialMarks={tutorialMarks}
        />
      )}
    </section>
  )
}
