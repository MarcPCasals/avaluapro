import { DIAGNOSIS_OPTIONS } from '../data/studentAnnotations'

const HEADER_COLOR = '#1E3A5F'
const HEADER_TEXT_COLOR = '#FFFFFF'
const BORDER_COLOR = '#D9E2EC'
const ALT_ROW_COLOR = '#F7FAFC'

const COLUMNS = [
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
  { title: 'Última anotació d’equip', width: 42 },
  { title: 'Última anotació de tutoria', width: 42 },
  { title: 'Última anotació de seguiment', width: 42 },
  { title: 'Informacions importants', width: 48 },
  { title: 'Seguiments pendents', width: 48 },
  { title: 'Registre tutorial', width: 55 },
  { title: 'Curs dels antecedents', width: 20 },
  { title: 'Nota antecedent', width: 16 },
  { title: 'Perfil antecedent', width: 24 },
  { title: 'Competències antecedents', width: 36 },
  { title: 'Observacions dels antecedents', width: 48 },
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

const ANTECEDENT_PROFILE_LABELS = {
  invisible: 'Alumne invisible',
  priority: 'Intervenció prioritària',
  ordinary: 'Seguiment ordinari',
  stable: 'Hàbit estable',
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

function formatCompetencyGrades(antecedent) {
  return Object.entries(antecedent?.competencyGrades || {})
    .filter(([, grade]) => grade)
    .map(([competency, grade]) => `${competency}: ${grade}`)
    .join(' · ')
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

function getDataRow(row, index) {
  const { antecedent, importantRecords, latestTeamNote, latestTrackingNote, latestTutoringNote, pendingRecords, profile, records, student } = row
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

  return [
    textCell(student.name, { ...baseStyle, fontWeight: 'bold' }),
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
    textCell(latestTeamNote?.text, baseStyle),
    textCell(latestTutoringNote?.text, baseStyle),
    textCell(latestTrackingNote?.text, baseStyle),
    textCell(importantText, baseStyle),
    textCell(pendingText, baseStyle),
    textCell(registryText, baseStyle),
    textCell(antecedent?.courseLabel, baseStyle),
    textCell(antecedent?.lastLookGrade, { ...baseStyle, align: 'center', fontWeight: 'bold' }),
    textCell(ANTECEDENT_PROFILE_LABELS[antecedent?.profile] || antecedent?.profile, baseStyle),
    textCell(formatCompetencyGrades(antecedent), baseStyle),
    textCell(antecedent?.qualitativeNotes, baseStyle),
  ]
}

export async function buildStudentOverviewExcel({ activeClass, activeUt, rows }) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const columnCount = COLUMNS.length
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
  const headerRow = COLUMNS.map((column) => ({
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
  const data = [titleRow, contextRow, Array(columnCount).fill(null), headerRow, ...rows.map(getDataRow)]

  return writeXlsxFile(data, {
    columns: COLUMNS.map(({ width }) => ({ width })),
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
