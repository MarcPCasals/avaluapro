import { PLANNING_SCHEMA_VERSION } from './constants.js'

export const PLANNING_DOCUMENT_FORMAT = 'avaluapro-planning-unit'
export const PLANNING_DOCUMENT_VERSION = 1

export const PEDAGOGICAL_TYPES = Object.freeze([
  'explanation',
  'priorKnowledge',
  'motivation',
  'situation',
  'hypothesis',
  'workPlan',
  'acquisition',
  'metacognition',
  'regulation',
  'mobilization',
  'response',
  'theorization',
  'competencyTest',
  'custom',
])

export const PEDAGOGICAL_TYPE_LABELS = Object.freeze({
  acquisition: 'Adquisició',
  competencyTest: 'Prova competencial',
  custom: 'Altres',
  explanation: 'Explicació',
  hypothesis: 'Hipòtesi',
  metacognition: 'Metacognició',
  mobilization: 'Mobilització',
  motivation: 'Motivació',
  priorKnowledge: 'Coneixements previs',
  regulation: 'Regulació',
  response: 'Resposta a la situació',
  situation: 'Presentació de la situació',
  theorization: 'Teorització',
  workPlan: 'Pla de treball',
})

const PHASE_LABELS = Object.freeze({
  closing: 'Tancament',
  custom: 'Altres',
  preparation: 'Preparació',
  resolution: 'Resolució',
})

const EMPTY_RESOURCE_SECTION = Object.freeze({
  attitudesAndValues: [],
  factsAndConcepts: [],
  procedures: [],
})

function text(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim()
}

function textList(values) {
  return [...new Set((values || []).map(text).filter(Boolean))]
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function numericOrder(value, fallback) {
  const order = Number(value)
  return Number.isFinite(order) && order >= 0 ? order : fallback
}

function normalizeResourceSection(section = {}) {
  const source = section || {}
  return {
    attitudesAndValues: textList(source.attitudesAndValues),
    factsAndConcepts: textList(source.factsAndConcepts),
    procedures: textList(source.procedures),
  }
}

export function normalizeResourceSections(input = {}, legacy = {}) {
  const sections = input || {}
  const previous = legacy || {}
  return {
    specific: normalizeResourceSection(sections.specific || {
      attitudesAndValues: previous.attitudesAndValues,
      factsAndConcepts: [...(previous.specificResources || []), ...(previous.factsAndConcepts || [])],
      procedures: previous.procedures,
    }),
    transversal: normalizeResourceSection(sections.transversal || {
      ...EMPTY_RESOURCE_SECTION,
      factsAndConcepts: previous.transversalResources,
    }),
  }
}

export function inferPedagogicalType(value) {
  const normalized = text(value).toLocaleLowerCase('ca')
  if (!normalized) return 'custom'
  if (/metacogn/.test(normalized)) return 'metacognition'
  if (/coneixement|previ/.test(normalized)) return 'priorKnowledge'
  if (/motiv/.test(normalized)) return 'motivation'
  if (/presentaci[oó].*situaci|situaci[oó] competencial/.test(normalized)) return 'situation'
  if (/hip[oò]tes/.test(normalized)) return 'hypothesis'
  if (/pla de treball|planificaci[oó]/.test(normalized)) return 'workPlan'
  if (/adquisici[oó]/.test(normalized)) return 'acquisition'
  if (/regulaci[oó]/.test(normalized)) return 'regulation'
  if (/mobilitzaci[oó]/.test(normalized)) return 'mobilization'
  if (/resposta|conclusi/.test(normalized)) return 'response'
  if (/teoritz/.test(normalized)) return 'theorization'
  if (/prova competencial/.test(normalized)) return 'competencyTest'
  if (/explicaci[oó]|presentaci[oó]/.test(normalized)) return 'explanation'
  return 'custom'
}

function safeFilenamePart(value) {
  return text(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'up'
}

export function getPlanningDocumentFilename(unit, extension) {
  return `${safeFilenamePart(unit.code)}-${safeFilenamePart(unit.title)}.${extension}`
}

/**
 * Genera una còpia de portabilitat per UP. Exclou propietaris, permisos i
 * identificadors del curs perquè importar-la mai no pugui heretar accessos.
 */
export function buildPlanningDocumentExport({ activities = [], phases = [], unit }) {
  if (!unit?.title) throw new Error('Cal seleccionar una UP per exportar-la.')
  const phaseKeyById = new Map(phases.map((phase, index) => [phase.id, `phase-${index + 1}`]))
  return {
    format: PLANNING_DOCUMENT_FORMAT,
    version: PLANNING_DOCUMENT_VERSION,
    exportedAt: new Date().toISOString(),
    schemaVersion: PLANNING_SCHEMA_VERSION,
    unit: {
      attitudesAndValues: textList(unit.attitudesAndValues),
      code: text(unit.code),
      complexSituation: text(unit.complexSituation),
      curriculum: clone(unit.curriculum || {}),
      expectedProduct: text(unit.expectedProduct),
      factsAndConcepts: textList(unit.factsAndConcepts),
      level: text(unit.level),
      procedures: textList(unit.procedures),
      resourceSections: normalizeResourceSections(unit.resourceSections, unit),
      specificResources: textList(unit.specificResources),
      title: text(unit.title),
      transversalResources: textList(unit.transversalResources),
      vehicularLanguage: text(unit.vehicularLanguage),
      versionNumber: Math.max(1, Number(unit.versionNumber) || 1),
    },
    phases: phases.map((phase, index) => ({
      key: phaseKeyById.get(phase.id),
      kind: phase.kind,
      order: numericOrder(phase.order, index),
      parentKey: phase.parentPhaseId ? phaseKeyById.get(phase.parentPhaseId) || null : null,
      title: text(phase.title),
    })),
    activities: activities.map((activity, index) => ({
      applicationComment: text(activity.applicationComment),
      curriculumSelections: clone(activity.curriculumSelections || []),
      description: text(activity.description),
      diversityMeasures: clone(activity.diversityMeasures || []),
      evidenceMode: activity.evidenceMode || 'none',
      grouping: text(activity.grouping),
      indicatorLabels: (unit.curriculum?.indicators || [])
        .filter((indicator) => (activity.indicatorIds || []).includes(indicator.id))
        .map((indicator) => indicator.label),
      order: numericOrder(activity.order, index),
      pedagogicalType: PEDAGOGICAL_TYPES.includes(activity.pedagogicalType)
        ? activity.pedagogicalType
        : inferPedagogicalType(activity.title),
      phaseKey: phaseKeyById.get(activity.phaseId) || null,
      plannedMinutes: activity.plannedMinutes == null ? null : Number(activity.plannedMinutes),
      space: text(activity.space),
      studentMaterials: clone(activity.studentMaterials || []),
      teacherMaterials: clone(activity.teacherMaterials || []),
      title: text(activity.title),
      type: activity.type || 'activity',
    })),
  }
}

export function parsePlanningDocumentExport(value) {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value
  if (!parsed || parsed.format !== PLANNING_DOCUMENT_FORMAT) {
    throw new Error('Aquest JSON no és una exportació de Programació d’AvaluaPro.')
  }
  if (parsed.version !== PLANNING_DOCUMENT_VERSION) {
    throw new Error(`La versió ${parsed.version ?? 'desconeguda'} del JSON encara no és compatible.`)
  }
  if (!parsed.unit?.title || !Array.isArray(parsed.phases) || !Array.isArray(parsed.activities)) {
    throw new Error('El JSON no conté una UP completa.')
  }
  const phaseKeys = new Set(parsed.phases.map((phase) => phase.key))
  if (phaseKeys.size !== parsed.phases.length || phaseKeys.has(undefined) || phaseKeys.has(null)) {
    throw new Error('El JSON conté fases duplicades o sense identificador.')
  }
  if (parsed.phases.some((phase) => phase.parentKey && !phaseKeys.has(phase.parentKey))) {
    throw new Error('El JSON conté una jerarquia de fases no vàlida.')
  }
  if (parsed.activities.some((activity) => !phaseKeys.has(activity.phaseKey))) {
    throw new Error('El JSON conté activitats sense una fase vàlida.')
  }
  return clone(parsed)
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
}

function htmlToLines(value) {
  return textList(decodeHtml(String(value || '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(?:p|li|h[1-6]|div)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, ''))
    .split(/\n+/))
}

function extractHtmlTables(html) {
  return [...String(html || '').matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map((tableMatch) => (
    [...tableMatch[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((rowMatch) => (
      [...rowMatch[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cellMatch) => ({
        html: cellMatch[1],
        lines: htmlToLines(cellMatch[1]),
        text: htmlToLines(cellMatch[1]).join('\n'),
      }))
    ))
  ))
}

function afterLabel(lines, labelPattern) {
  const index = lines.findIndex((line) => labelPattern.test(line))
  if (index < 0) return ''
  const inline = lines[index].replace(labelPattern, '').replace(/^\s*:\s*/, '').trim()
  return textList([inline, ...lines.slice(index + 1)]).join('\n')
}

function valuesAfterLabel(lines, labelPattern) {
  const index = lines.findIndex((line) => labelPattern.test(line))
  if (index < 0) return []
  const inline = lines[index].replace(labelPattern, '').replace(/^\s*:\s*/, '').trim()
  return textList([inline, ...lines.slice(index + 1)])
}

function parseCurriculum(tables) {
  const table = tables.find((candidate) => candidate.some((row) => {
    const labels = row.map((cell) => normalizedHeader(cell.text))
    return labels.some((label) => label === 'competencia')
      && labels.some((label) => label.includes('aprenentatge esperat'))
      && labels.some((label) => label.includes('criteri d avaluacio'))
      && labels.some((label) => label.includes('indicador d avaluacio'))
  }))
  const empty = { assessmentCriteria: [], competencies: [], expectedLearnings: [], indicators: [] }
  if (!table) return empty
  const headerIndex = table.findIndex((row) => row.some((cell) => normalizedHeader(cell.text) === 'competencia'))
  const header = table[headerIndex] || []
  const columnIndex = (pattern) => header.findIndex((cell) => pattern.test(normalizedHeader(cell.text)))
  const columns = {
    assessmentCriteria: columnIndex(/^criteri d avaluacio$/),
    competencies: columnIndex(/^competencia$/),
    expectedLearnings: columnIndex(/^aprenentatge esperat$/),
    indicators: columnIndex(/^indicador d avaluacio$/),
  }
  return Object.fromEntries(Object.entries(columns).map(([key, index]) => [key, textList(
    table.slice(headerIndex + 1).map((row) => row[index]?.lines?.join('\n') || '').filter(Boolean),
  ).map((label) => ({ label }))]))
}

function parseResourceSection(tables, titlePattern) {
  const table = tables.find((candidate) => candidate.some((row) => row.some((cell) => titlePattern.test(cell.text))))
  if (!table) return normalizeResourceSection()
  const rows = table.map((row) => row.flatMap((cell) => cell.lines))
  const values = (pattern) => {
    const lines = rows.find((row) => row.some((line) => pattern.test(line))) || []
    return valuesAfterLabel(lines, pattern)
  }
  return normalizeResourceSection({
    attitudesAndValues: values(/^actituds i valors\s*:?/i),
    factsAndConcepts: values(/^fets i conceptes\s*:?/i),
    procedures: values(/^procediments\s*:?/i),
  })
}

function parseActivityContent(lines) {
  const cleaned = lines.map(text).filter(Boolean)
  const diversityIndex = cleaned.findIndex((line) => /^atenci[oó] a la diversitat\s*:?$/i.test(line))
  const commentIndex = cleaned.findIndex((line) => /^comentaris? per a l['’]aplicaci[oó](?:, si s['’]escau)?\s*:?$/i.test(line))
  const activityEnd = [diversityIndex, commentIndex].filter((index) => index >= 0).sort((a, b) => a - b)[0] ?? cleaned.length
  const activityLines = cleaned.slice(0, activityEnd)
  const firstLine = activityLines[0] || ''
  const inlineTitle = /^activitat\s*:\s*(.+)$/i.exec(firstLine)?.[1] || ''
  const withoutLabel = /^activitat\s*:?$/i.test(firstLine) || inlineTitle
    ? activityLines.slice(1)
    : activityLines
  const title = text(inlineTitle || withoutLabel[0] || 'Activitat importada')
  const description = withoutLabel.slice(inlineTitle ? 0 : 1).join('\n')
  const diversityStart = diversityIndex >= 0 ? diversityIndex + 1 : -1
  const diversityEnd = commentIndex >= 0 ? commentIndex : cleaned.length
  const diversityText = diversityStart >= 0 ? cleaned.slice(diversityStart, diversityEnd).join('\n') : ''
  const applicationComment = commentIndex >= 0 ? cleaned.slice(commentIndex + 1).join('\n') : ''
  return { applicationComment, description, diversityText, title }
}

function parseMinutes(value) {
  const match = text(value).match(/\d+(?:[.,]\d+)?/)
  return match ? Number(match[0].replace(',', '.')) : null
}

function phaseKindFromLabel(value) {
  const normalized = text(value).toLocaleLowerCase('ca')
  if (normalized.includes('preparaci')) return 'preparation'
  if (normalized.includes('resoluci')) return 'resolution'
  if (normalized.includes('tancament')) return 'closing'
  return 'custom'
}

function importedCurriculumKey(prefix, label, parentKey = '') {
  const normalized = normalizedHeader(label).replace(/\s+/g, '-')
  return [parentKey, prefix, normalized].filter(Boolean).join(':')
}

function parseActivityCurriculum(lines, curriculum) {
  const competenciesByLabel = new Map((curriculum.competencies || [])
    .map((item) => [normalizedHeader(item.label), item.label]))
  const criteriaByLabel = new Map((curriculum.assessmentCriteria || [])
    .map((item) => [normalizedHeader(item.label), item.label]))
  const selections = []
  let current = null
  ;(lines || []).map(text).filter(Boolean).forEach((line) => {
    const normalized = normalizedHeader(line)
    if (competenciesByLabel.has(normalized)) {
      const label = competenciesByLabel.get(normalized)
      current = {
        competencyKey: importedCurriculumKey('competency', label),
        label,
        assessmentCriteria: [],
      }
      selections.push(current)
      return
    }
    if (!current || !criteriaByLabel.has(normalized)) return
    const label = criteriaByLabel.get(normalized)
    current.assessmentCriteria.push({
      criterionKey: importedCurriculumKey('criterion', label, current.competencyKey),
      label,
    })
  })
  return selections
}

function materialFromText(label) {
  return {
    id: null,
    kind: 'physical',
    label,
    preparationKind: 'reference',
    reminderDaysBefore: 0,
    url: null,
  }
}

/**
 * Interpreta l’HTML que Mammoth produeix en llegir una plantilla Word del
 * centre. El resultat encara és una previsualització: no conté IDs ni permisos.
 */
export function parsePlanningWordHtml(html) {
  const tables = extractHtmlTables(html)
  if (tables.length < 2) throw new Error('No s’ha reconegut l’estructura de la plantilla Word.')
  const headerLines = tables[0].flat().flatMap((cell) => cell.lines)
  const code = headerLines[0] || 'UP importada'
  const level = headerLines[1] || 'Nivell pendent'
  const generalRows = tables.find((table) => table.some((row) => row.some((cell) => /informaci[oó] general/i.test(cell.text)))) || []
  const generalLines = generalRows.map((row) => row.flatMap((cell) => cell.lines))
  const field = (pattern) => {
    const row = generalLines.find((lines) => lines.some((line) => pattern.test(line))) || []
    return afterLabel(row, pattern)
  }
  const sequenceTable = tables.find((table) => table.some((row) => row.some((cell) => /fase de (preparaci|resoluci|tancament)/i.test(cell.text))))
  if (!sequenceTable) throw new Error('El Word no conté cap taula de seqüència reconeguda.')

  const phases = []
  const phaseKeyByKind = new Map()
  const subphaseKeyBySignature = new Map()
  const activities = []
  let currentKind = 'custom'
  const ensureRootPhase = (kind) => {
    if (phaseKeyByKind.has(kind)) return phaseKeyByKind.get(kind)
    const key = `phase-${phases.length + 1}`
    phases.push({ key, kind, order: phases.length, parentKey: null, title: PHASE_LABELS[kind] })
    phaseKeyByKind.set(kind, key)
    return key
  }
  const parsedCurriculum = parseCurriculum(tables)
  const sequenceHeader = sequenceTable.find((row) => row.some((cell) => normalizedHeader(cell.text) === 'descriptiu activitat')) || []
  const hasActivityCurriculum = /competencies criteris/.test(normalizedHeader(sequenceHeader[6]?.text))
  sequenceTable.forEach((row) => {
    const rowText = row.map((cell) => cell.text).join(' ')
    if (/fase de (preparaci|resoluci|tancament)/i.test(rowText)) {
      currentKind = phaseKindFromLabel(rowText)
      ensureRootPhase(currentKind)
      return
    }
    if (!/^\d+$/.test(text(row[0]?.text)) || row.length < 3) return
    const subphase = text(row[1]?.text)
    const rootKey = ensureRootPhase(currentKind)
    const signature = `${currentKind}:${subphase || 'sense-subfase'}`
    let phaseKey = rootKey
    if (subphase) {
      if (!subphaseKeyBySignature.has(signature)) {
        const key = `phase-${phases.length + 1}`
        phases.push({
          key,
          kind: currentKind,
          order: phases.filter((phase) => phase.parentKey === rootKey).length,
          parentKey: rootKey,
          title: subphase,
        })
        subphaseKeyBySignature.set(signature, key)
      }
      phaseKey = subphaseKeyBySignature.get(signature)
    }
    const parsedContent = parseActivityContent(row[2]?.lines || [])
    const indicatorLabels = hasActivityCurriculum ? [] : textList((row[6]?.lines || []).flatMap((line) => line.split(/[;,]/)))
    activities.push({
      ...parsedContent,
      curriculumSelections: hasActivityCurriculum ? parseActivityCurriculum(row[6]?.lines || [], parsedCurriculum) : [],
      diversityMeasures: parsedContent.diversityText ? [{ label: parsedContent.diversityText, studentNames: [] }] : [],
      evidenceMode: 'none',
      grouping: text(row[5]?.text),
      indicatorLabels,
      order: activities.filter((activity) => activity.phaseKey === phaseKey).length,
      pedagogicalType: inferPedagogicalType(`${subphase} ${parsedContent.title}`),
      phaseKey,
      plannedMinutes: parseMinutes(row[3]?.text),
      space: '',
      studentMaterials: [],
      teacherMaterials: textList(row[4]?.lines).map(materialFromText),
      type: 'activity',
    })
  })
  if (activities.length === 0) throw new Error('No s’ha trobat cap activitat numerada al Word.')
  const curriculum = {
    ...parsedCurriculum,
    indicators: textList([
      ...parsedCurriculum.indicators.map((item) => item.label),
      ...activities.flatMap((activity) => activity.indicatorLabels),
    ]).map((label) => ({ label })),
  }
  const resourceSections = normalizeResourceSections({
    specific: parseResourceSection(tables, /recursos de compet[eè]ncies espec[ií]fiques/i),
    transversal: parseResourceSection(tables, /recursos de compet[eè]ncies transversals/i),
  })
  const hasCurriculum = Object.values(parsedCurriculum).some((items) => items.length > 0)
  const hasResources = Object.values(resourceSections).some((section) => (
    section.factsAndConcepts.length || section.procedures.length || section.attitudesAndValues.length
  ))
  const title = field(/^t[ií]tol\s*:?/i) || 'UP importada'
  return {
    format: PLANNING_DOCUMENT_FORMAT,
    version: PLANNING_DOCUMENT_VERSION,
    unit: {
      code,
      complexSituation: field(/^situaci[oó] o pregunta complexa(?: \(i descriptiu si escau\))?\s*:?/i),
      curriculum,
      expectedProduct: field(/^proposta de producci[oó]\/producte(?:, si escau)?\s*:?/i),
      level,
      resourceSections,
      title,
      vehicularLanguage: field(/^llengua de vehiculaci[oó]/i),
      versionNumber: 1,
    },
    phases,
    activities,
    importSummary: {
      activityCount: activities.length,
      phaseCount: phases.filter((phase) => !phase.parentKey).length,
      warning: !hasCurriculum || !hasResources
        ? 'Aquest Word no conté els blocs curriculars complets; podràs acabar-los dins de la UP importada.'
        : '',
    },
  }
}

const TABLE_COLUMN_ALIASES = Object.freeze({
  activity: ['activitat', 'titol', 'títol', 'descriptiu activitat', 'descripcio', 'descripció'],
  applicationComment: ['comentaris', 'comentaris aplicacio', 'comentaris aplicació', 'aplicacio', 'aplicació'],
  diversity: ['atencio diversitat', 'atenció diversitat', 'diversitat'],
  grouping: ['agrupament', 'agrup', 'grup'],
  indicators: ['ia', 'indicadors', 'indicador'],
  materials: ['material', 'materials'],
  minutes: ['temps', 'minuts', 'tps min', 'durada'],
  phase: ['fase'],
  space: ['espai', 'aula'],
  subphase: ['subfase'],
})

function normalizedHeader(value) {
  return text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('ca').replace(/[^a-z0-9]+/g, ' ').trim()
}

function findColumn(headers, aliases) {
  return headers.findIndex((header) => aliases.some((alias) => header === normalizedHeader(alias)))
}

export function parsePlanningTableText(rawText) {
  const rows = String(rawText || '').replace(/\r\n/g, '\n').split('\n').filter((row) => row.trim())
    .map((row) => row.split('\t').map(text))
  if (rows.length < 2) throw new Error('Enganxa una taula amb capçalera i almenys una activitat.')
  const headers = rows[0].map(normalizedHeader)
  const indexes = Object.fromEntries(Object.entries(TABLE_COLUMN_ALIASES)
    .map(([key, aliases]) => [key, findColumn(headers, aliases)]))
  if (indexes.activity < 0) throw new Error('No s’ha trobat la columna Activitat o Descriptiu activitat.')
  const activities = rows.slice(1).map((row, index) => {
    const activityLines = String(row[indexes.activity] || '').split(/\n+/).map(text).filter(Boolean)
    const title = activityLines[0] || `Activitat ${index + 1}`
    return ({
    applicationComment: indexes.applicationComment >= 0 ? row[indexes.applicationComment] : '',
    description: activityLines.slice(1).join('\n'),
    diversityMeasures: indexes.diversity >= 0 && row[indexes.diversity]
      ? [{ label: row[indexes.diversity], studentNames: [] }]
      : [],
    evidenceMode: 'none',
    grouping: indexes.grouping >= 0 ? row[indexes.grouping] : '',
    indicatorLabels: indexes.indicators >= 0 ? textList(row[indexes.indicators].split(/[;,]/)) : [],
    order: index,
    pedagogicalType: inferPedagogicalType(`${indexes.subphase >= 0 ? row[indexes.subphase] : ''} ${row[indexes.activity]}`),
    phaseLabel: indexes.phase >= 0 ? row[indexes.phase] : '',
    plannedMinutes: indexes.minutes >= 0 ? parseMinutes(row[indexes.minutes]) : null,
    space: indexes.space >= 0 ? row[indexes.space] : '',
    studentMaterials: [],
    subphaseLabel: indexes.subphase >= 0 ? row[indexes.subphase] : '',
    teacherMaterials: indexes.materials >= 0
      ? textList(row[indexes.materials].split(/[;\n]/)).map(materialFromText)
      : [],
    title,
    type: 'activity',
    })
  }).filter((activity) => activity.title)
  if (activities.length === 0) throw new Error('La taula no conté cap activitat amb text.')
  return { activities, headers: rows[0] }
}
