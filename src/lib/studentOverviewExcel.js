import { DIAGNOSIS_OPTIONS, getDominantDiagnosis } from '../data/studentAnnotations'

const HEADER_COLOR = '#1E3A5F'
const HEADER_TEXT_COLOR = '#FFFFFF'
const BORDER_COLOR = '#D9E2EC'
const ALT_ROW_COLOR = '#F7FAFC'

const BASE_COLUMNS = [
  { title: 'Alumne', width: 28 },
  { title: 'Mig grup', width: 14 },
  { title: 'Diagnòstics', width: 28 },
  { title: 'EE', width: 8 },
  { title: 'Anotacions del diagnòstic', width: 34 },
  { title: 'Informació general', width: 42 },
  { title: 'Nota global', width: 13 },
  { title: 'Constància UT', width: 15 },
  { title: 'Tasques no fetes', width: 17 },
  { title: 'Incidències', width: 12 },
  { title: 'Absències (hores)', width: 18 },
  { title: 'Última absència', width: 28 },
  { title: 'Última anotació de seguiment', width: 42 },
]

const TUTORING_COLUMNS = [
  { title: 'Última anotació d’equip educatiu', width: 42 },
  { title: 'Última anotació de tutoria', width: 42 },
  { title: 'Informacions importants', width: 48 },
  { title: 'Seguiments pendents', width: 48 },
  { title: 'Registre tutorial', width: 55 },
  { title: 'Agenda i incidències', width: 55 },
]

const RECORD_TYPE_LABELS = {
  'family-contact': 'Contacte amb la família',
  'student-interview': 'Entrevista amb l’alumne',
  'tutorial-observation': 'Observació tutorial',
  'team-information': 'Informació de l’equip educatiu',
  guidance: 'Orientació',
  agreement: 'Acord o mesura',
  'other-tutorial': 'Altres informacions tutorials',
}

const OTHER_RECORD_TYPE_LABELS = {
  agenda: 'Nota a l’agenda',
  incident: 'Full d’incidents',
  'classroom-expulsion': 'Expulsió d’aula',
  'center-expulsion': 'Expulsió de centre',
  doip: 'DOIP equip educatiu',
}

const DIAGNOSIS_COLORS = {
  blue: { backgroundColor: '#DBEAFE', textColor: '#1E40AF' },
  green: { backgroundColor: '#DCFCE7', textColor: '#166534' },
  yellow: { backgroundColor: '#FEF3C7', textColor: '#92400E' },
  red: { backgroundColor: '#FEE2E2', textColor: '#991B1B' },
  purple: { backgroundColor: '#F3E8FF', textColor: '#6B21A8' },
  orange: { backgroundColor: '#FFEDD5', textColor: '#9A3412' },
}

function cleanText(value) {
  return String(value || '').trim()
}

function formatDate(value) {
  if (!value) return ''
  const [year, month, day] = String(value).slice(0, 10).split('-')
  return year && month && day ? `${day}/${month}/${year}` : String(value)
}

function joinNotes(records, mapper) {
  return records.map(mapper).filter(Boolean).join('\n')
}

function textCell(value, extra = {}) {
  return {
    value: cleanText(value),
    type: String,
    format: '@',
    alignVertical: 'top',
    wrap: true,
    borderColor: BORDER_COLOR,
    borderStyle: 'thin',
    ...extra,
  }
}

function numberCell(value, extra = {}) {
  return {
    value: Number.isFinite(value) ? value : null,
    type: Number,
    align: 'right',
    alignVertical: 'top',
    borderColor: BORDER_COLOR,
    borderStyle: 'thin',
    ...extra,
  }
}

function getDataRow(row, index, showTutoringColumns) {
  const { absenceHours, absenceRecords, importantRecords, latestTeamNote, latestTrackingNote, latestTutoringNote, otherTutorialRecords, pendingRecords, profile, records, student } = row
  const diagnoses = DIAGNOSIS_OPTIONS.filter((option) => (student.diagnoses || []).includes(option.id))
    .map((option) => option.label)
    .join(', ')
  const backgroundColor = index % 2 === 1 ? ALT_ROW_COLOR : undefined
  const baseStyle = backgroundColor ? { backgroundColor } : {}
  const importantText = joinNotes(
    importantRecords,
    (record) => `${formatDate(record.date)} · ${RECORD_TYPE_LABELS[record.type] || 'Registre'} · ${record.note}`,
  )
  const pendingText = joinNotes(
    pendingRecords,
    (record) => `${formatDate(record.followUpDate)} · ${record.note}`,
  )
  const registryText = joinNotes(
    [...records].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))),
    (record) => {
      const followUp = record.followUpDate
        ? ` · seguiment ${formatDate(record.followUpDate)} (${record.followUpStatus === 'done' ? 'completat' : 'pendent'})`
        : ''
      return `${formatDate(record.date)} · ${RECORD_TYPE_LABELS[record.type] || 'Registre'} · ${record.note}${followUp}`
    },
  )
  const otherRecordsText = joinNotes(
    [...otherTutorialRecords].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))),
    (record) => `${formatDate(record.date)} · ${OTHER_RECORD_TYPE_LABELS[record.type] || 'Registre'} · ${record.note || 'Sense comentari'}`,
  )
  const dominantDiagnosis = getDominantDiagnosis(student.diagnoses)
  const studentStyle = dominantDiagnosis ? DIAGNOSIS_COLORS[dominantDiagnosis.color] : {}

  const baseCells = [
    textCell(student.name, { ...baseStyle, ...studentStyle, fontWeight: 'bold' }),
    textCell(student.halfGroup, baseStyle),
    textCell(diagnoses, baseStyle),
    textCell(student.isSkiStudyStudent ? 'Sí' : '', { ...baseStyle, align: 'center' }),
    textCell(student.diagnosisNotes, baseStyle),
    textCell(student.personalNotes, baseStyle),
    textCell(profile?.evaluation.grade, { ...baseStyle, align: 'center', fontWeight: 'bold' }),
    profile?.tracking.hasTrackingData
      ? numberCell(profile.tracking.consistency / 100, { ...baseStyle, format: '0%' })
      : numberCell(null, baseStyle),
    numberCell(profile?.tracking.missing || 0, { ...baseStyle, format: '0' }),
    numberCell(profile?.incidents || 0, { ...baseStyle, format: '0' }),
    numberCell(absenceHours || 0, { ...baseStyle, format: '0.##' }),
    textCell(absenceRecords[0] ? `${formatDate(absenceRecords[0].date)}${absenceRecords[0].time ? ` · ${absenceRecords[0].time}` : ''}` : '', baseStyle),
    textCell(latestTrackingNote?.text, baseStyle),
  ]

  if (!showTutoringColumns) return baseCells

  return [
    ...baseCells,
    textCell(latestTeamNote?.text, baseStyle),
    textCell(latestTutoringNote?.text, baseStyle),
    textCell(importantText, baseStyle),
    textCell(pendingText, baseStyle),
    textCell(registryText, baseStyle),
    textCell(otherRecordsText, baseStyle),
  ]
}

export async function buildStudentOverviewExcel({ activeClass, activeUt, rows, showTutoringColumns = false }) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const columns = showTutoringColumns ? [...BASE_COLUMNS, ...TUTORING_COLUMNS] : BASE_COLUMNS
  const columnCount = columns.length
  const titleRow = [
    {
      value: `AvaluaPro · ${activeClass?.name || 'Classe'}`,
      columnSpan: columnCount,
      fontSize: 16,
      fontWeight: 'bold',
      textColor: '#102A43',
      height: 28,
    },
    ...Array(columnCount - 1).fill(null),
  ]
  const contextParts = [
    activeClass?.subject,
    activeUt?.name ? `UT: ${activeUt.name}` : '',
    `${rows.length} alumnes`,
    `Exportat el ${new Date().toLocaleDateString('ca-ES')}`,
  ].filter(Boolean)
  const contextRow = [
    {
      value: contextParts.join(' · '),
      columnSpan: columnCount,
      fontStyle: 'italic',
      textColor: '#486581',
      height: 22,
    },
    ...Array(columnCount - 1).fill(null),
  ]
  const headerRow = columns.map((column) => ({
    value: column.title,
    type: String,
    fontWeight: 'bold',
    textColor: HEADER_TEXT_COLOR,
    backgroundColor: HEADER_COLOR,
    borderColor: '#FFFFFF',
    borderStyle: 'thin',
    align: 'center',
    alignVertical: 'center',
    wrap: true,
    height: 34,
  }))
  const data = [
    titleRow,
    contextRow,
    Array(columnCount).fill(null),
    headerRow,
    ...rows.map((row, index) => getDataRow(row, index, showTutoringColumns)),
  ]

  return writeXlsxFile(data, {
    columns: columns.map(({ width }) => ({ width })),
    fontFamily: 'Arial',
    fontSize: 10,
    orientation: 'landscape',
    sheet: 'Alumnes',
    showGridLines: false,
    stickyColumnsCount: 1,
    stickyRowsCount: 4,
    zoomScale: 0.8,
  }).toBlob()
}
