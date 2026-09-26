import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  PageBreak,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx'
import {
  normalizeResourceSections,
  parsePlanningWordHtml,
  PEDAGOGICAL_TYPE_LABELS,
} from '../../domain/planning/documents'
import { stripInlineFormatting } from '../../lib/formattedText'

const PURPLE = '7C3AED'
const PURPLE_DARK = '4C1D95'
const PURPLE_SOFT = 'F5F3FF'
const ORANGE = 'F59E0B'
const SLATE = '334155'
const MUTED = '64748B'
const WHITE = 'FFFFFF'
const LINE = 'D8DEE9'

const borders = {
  bottom: { color: LINE, size: 4, style: BorderStyle.SINGLE },
  left: { color: LINE, size: 4, style: BorderStyle.SINGLE },
  right: { color: LINE, size: 4, style: BorderStyle.SINGLE },
  top: { color: LINE, size: 4, style: BorderStyle.SINGLE },
}

function run(value, options = {}) {
  return new TextRun({
    color: options.color || SLATE,
    font: 'Aptos',
    size: options.size || 18,
    text: String(value || ''),
    ...options,
  })
}

function paragraph(value, options = {}) {
  const lines = String(value || '').split('\n')
  return new Paragraph({
    alignment: options.alignment,
    children: lines.flatMap((line, index) => [
      ...(index ? [new TextRun({ break: 1 })] : []),
      run(line, options.run),
    ]),
    keepNext: options.keepNext,
    spacing: options.spacing || { after: 80, line: 240 },
  })
}

function labelValue(label, value) {
  return new Paragraph({
    children: [run(`${label}: `, { bold: true, color: PURPLE_DARK }), run(value || '—')],
    spacing: { after: 80, line: 240 },
  })
}

function cell(children, options = {}) {
  const normalizedChildren = Array.isArray(children)
    ? children
    : (typeof children === 'string' || typeof children === 'number'
        ? [paragraph(children)]
        : [children])
  return new TableCell({
    borders,
    children: normalizedChildren,
    columnSpan: options.columnSpan,
    margins: { bottom: 100, left: 110, right: 110, top: 100 },
    shading: options.fill ? { fill: options.fill, type: ShadingType.CLEAR } : undefined,
    verticalAlign: options.verticalAlign || VerticalAlign.TOP,
    width: options.width ? { size: options.width, type: WidthType.PERCENTAGE } : undefined,
  })
}

function banner(title, subtitle = '') {
  return new Table({
    columnWidths: [10000],
    rows: [new TableRow({
      children: [cell([
        paragraph(title.toUpperCase(), {
          alignment: AlignmentType.CENTER,
          run: { bold: true, color: WHITE, size: 22 },
          spacing: { after: subtitle ? 35 : 0 },
        }),
        ...(subtitle ? [paragraph(subtitle, {
          alignment: AlignmentType.CENTER,
          run: { color: 'EDE9FE', size: 16 },
          spacing: { after: 0 },
        })] : []),
      ], { fill: PURPLE })],
    })],
    width: { size: 100, type: WidthType.PERCENTAGE },
  })
}

function heading(title, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    children: [run(title, { bold: true, color: PURPLE_DARK, size: level === HeadingLevel.HEADING_1 ? 26 : 21 })],
    heading: level,
    keepNext: true,
    spacing: { after: 120, before: 180 },
  })
}

function curriculumTable(curriculum = {}) {
  const fields = [
    ['Competència', curriculum.competencies],
    ['Aprenentatge esperat', curriculum.expectedLearnings],
    ['Criteri d’avaluació', curriculum.assessmentCriteria],
    ['Indicador d’avaluació', curriculum.indicators],
  ]
  const maxRows = Math.max(1, ...fields.map(([, items]) => items?.length || 0))
  return new Table({
    columnWidths: [2500, 2500, 2500, 2500],
    rows: [
      new TableRow({
        children: fields.map(([label]) => cell(paragraph(label, {
          run: { bold: true, color: WHITE, size: 16 },
          spacing: { after: 0 },
        }), { fill: PURPLE })),
        tableHeader: true,
      }),
      ...Array.from({ length: maxRows }, (_, rowIndex) => new TableRow({
        children: fields.map(([, items]) => cell(paragraph(items?.[rowIndex]?.label || '', {
          run: { size: 16 }, spacing: { after: 0 },
        }))),
      })),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  })
}

function resourceTable(title, section) {
  const normalized = normalizeResourceSections({ specific: section }).specific
  const rows = [
    ['Fets i conceptes', normalized.factsAndConcepts],
    ['Procediments', normalized.procedures],
    ['Actituds i valors', normalized.attitudesAndValues],
  ]
  return [
    banner(title),
    new Table({
      columnWidths: [2400, 7600],
      rows: rows.map(([label, items]) => new TableRow({
        children: [
          cell(paragraph(label, { run: { bold: true, color: PURPLE_DARK, size: 16 }, spacing: { after: 0 } }), { fill: PURPLE_SOFT }),
          cell((items?.length ? items : ['']).map((item) => paragraph(item, { run: { size: 16 } }))),
        ],
      })),
      width: { size: 100, type: WidthType.PERCENTAGE },
    }),
  ]
}

function materialText(materials = []) {
  return materials.map((material) => material.url ? `${material.label} — ${material.url}` : material.label).filter(Boolean).join('\n')
}

function diversityText(measures = []) {
  return measures.map((measure) => [
    measure.label,
    measure.studentNames?.length ? `Alumnat: ${measure.studentNames.join(', ')}` : '',
  ].filter(Boolean).join(' — ')).join('\n')
}

function activityDescription(activity) {
  return [
    activity.description ? `Activitat\n${stripInlineFormatting(activity.description)}` : `Activitat\n${activity.title}`,
    `Atenció a la diversitat\n${diversityText(activity.diversityMeasures) || '—'}`,
    `Comentaris per a l’aplicació\n${activity.applicationComment || '—'}`,
  ].join('\n\n')
}

function activityTable({ activities, phase, unit }) {
  const headerLabels = ['Núm.', 'Subfase', 'Descriptiu activitat', 'Min.', 'Materials', 'Agrup. / espai', 'IA']
  const allIndicators = new Map((unit.curriculum?.indicators || []).map((indicator) => [indicator.id, indicator.label]))
  return new Table({
    columnWidths: [550, 1000, 4250, 650, 1500, 1200, 850],
    rows: [
      new TableRow({
        children: [cell(paragraph(`FASE DE ${phase.title.toUpperCase()}`, {
          alignment: AlignmentType.CENTER,
          run: { bold: true, color: WHITE, size: 19 },
          spacing: { after: 0 },
        }), { columnSpan: 7, fill: PURPLE })],
        tableHeader: true,
      }),
      new TableRow({
        children: headerLabels.map((label) => cell(paragraph(label, {
          alignment: AlignmentType.CENTER,
          run: { bold: true, color: PURPLE_DARK, size: 14 },
          spacing: { after: 0 },
        }), { fill: PURPLE_SOFT })),
        tableHeader: true,
      }),
      ...activities.map((activity) => new TableRow({
        children: [
          cell(paragraph(activity.sequenceNumber, { alignment: AlignmentType.CENTER, run: { bold: true, size: 15 } })),
          cell([
            paragraph('Imatge pedagògica pendent', { run: { color: '8B5CF6', italics: true, size: 12 } }),
            paragraph(activity.subphaseLabel || '—', { run: { bold: true, size: 15 } }),
            paragraph(PEDAGOGICAL_TYPE_LABELS[activity.pedagogicalType] || 'Altres', { run: { color: MUTED, italics: true, size: 13 } }),
          ]),
          cell([paragraph(activity.title, { run: { bold: true, color: PURPLE_DARK, size: 16 } }), paragraph(activityDescription(activity), { run: { size: 15 } })]),
          cell(paragraph(activity.plannedMinutes == null ? '—' : activity.plannedMinutes, { alignment: AlignmentType.CENTER, run: { size: 15 } })),
          cell(paragraph([
            materialText(activity.teacherMaterials),
            materialText(activity.studentMaterials),
          ].filter(Boolean).join('\n'), { run: { size: 14 } })),
          cell(paragraph([activity.grouping, activity.space].filter(Boolean).join('\n'), { run: { size: 14 } })),
          cell(paragraph((activity.indicatorIds || []).map((id) => allIndicators.get(id)).filter(Boolean).join('\n'), { run: { size: 14 } })),
        ],
      })),
      new TableRow({
        children: [
          cell(paragraph(`Total fase de ${phase.title.toLocaleLowerCase('ca')}`, { run: { bold: true, size: 15 }, spacing: { after: 0 } }), { columnSpan: 3, fill: 'FAFAFA' }),
          cell(paragraph(activities.reduce((sum, activity) => sum + (Number(activity.plannedMinutes) || 0), 0), { alignment: AlignmentType.CENTER, run: { bold: true, color: PURPLE_DARK, size: 15 }, spacing: { after: 0 } }), { columnSpan: 4, fill: 'FAFAFA' }),
        ],
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  })
}

function orderedDocumentActivities(phases, activities) {
  const phaseById = new Map(phases.map((phase) => [phase.id, phase]))
  const roots = phases.filter((phase) => !phase.parentPhaseId).sort((a, b) => a.order - b.order)
  const phaseOrder = new Map()
  roots.forEach((root, rootIndex) => {
    phaseOrder.set(root.id, rootIndex * 1000)
    phases.filter((phase) => phase.parentPhaseId === root.id)
      .sort((a, b) => a.order - b.order)
      .forEach((child, childIndex) => phaseOrder.set(child.id, rootIndex * 1000 + childIndex + 1))
  })
  return [...activities].sort((a, b) => (phaseOrder.get(a.phaseId) ?? 99999) - (phaseOrder.get(b.phaseId) ?? 99999) || a.order - b.order)
    .map((activity, index) => ({
      ...activity,
      rootPhaseId: phaseById.get(activity.phaseId)?.parentPhaseId || activity.phaseId,
      sequenceNumber: index + 1,
      subphaseLabel: phaseById.get(activity.phaseId)?.parentPhaseId ? phaseById.get(activity.phaseId)?.title : '',
    }))
}

/** Crea un Word editable, en horitzontal, amb els mateixos blocs oficials. */
export async function buildPlanningWordBlob({ activities = [], phases = [], unit }) {
  const resources = normalizeResourceSections(unit.resourceSections, unit)
  const orderedActivities = orderedDocumentActivities(phases, activities)
  const rootPhases = phases.filter((phase) => !phase.parentPhaseId).sort((a, b) => a.order - b.order)
  const sequenceChildren = rootPhases.flatMap((phase) => [
    activityTable({
      activities: orderedActivities.filter((activity) => activity.rootPhaseId === phase.id),
      phase,
      unit,
    }),
    paragraph('', { spacing: { after: 120 } }),
  ])
  const totalMinutes = activities.reduce((sum, activity) => sum + (Number(activity.plannedMinutes) || 0), 0)
  const document = new Document({
    creator: 'AvaluaPro',
    description: 'Unitat de programació editable',
    sections: [{
      children: [
        new Paragraph({
          children: [run('AVALUAPRO', { bold: true, color: PURPLE, size: 18 }), run('  ·  Programació docent', { color: MUTED, size: 16 })],
          spacing: { after: 140 },
        }),
        banner('Seqüència d’ensenyament / aprenentatge', `${unit.code} · ${unit.level}`),
        heading(unit.title),
        labelValue('Situació o pregunta complexa', unit.complexSituation),
        labelValue('Proposta de producció o producte', unit.expectedProduct),
        labelValue('Llengua de vehiculació', unit.vehicularLanguage),
        heading('Currículum i avaluació', HeadingLevel.HEADING_2),
        curriculumTable(unit.curriculum),
        ...resourceTable('Recursos de competències específiques', resources.specific),
        ...resourceTable('Recursos de competències transversals', resources.transversal),
        new Paragraph({ children: [new PageBreak()] }),
        ...sequenceChildren,
        new Paragraph({
          children: [run('Total de temps de les tres fases: ', { bold: true, color: PURPLE_DARK, size: 19 }), run(`${totalMinutes} minuts`, { bold: true, color: ORANGE, size: 19 })],
          spacing: { before: 160 },
        }),
      ],
      properties: {
        page: {
          margin: { bottom: 650, left: 650, right: 650, top: 650 },
          size: { height: 11906, orientation: PageOrientation.LANDSCAPE, width: 16838 },
        },
      },
    }],
    styles: {
      default: {
        document: { run: { font: 'Aptos', size: 18 }, paragraph: { spacing: { line: 240 } } },
      },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { bold: true, color: PURPLE_DARK, font: 'Aptos Display', size: 28 }, paragraph: { keepNext: true, spacing: { after: 120, before: 200 } } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { bold: true, color: PURPLE_DARK, font: 'Aptos Display', size: 22 }, paragraph: { keepNext: true, spacing: { after: 100, before: 160 } } },
      ],
    },
    title: `${unit.code} · ${unit.title}`,
  })
  return Packer.toBlob(document)
}

/** Llegeix un Word local sense pujar-lo a cap servidor. */
export async function parsePlanningWordFile(file) {
  const mammoth = await import('mammoth/mammoth.browser')
  const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() })
  return {
    bundle: parsePlanningWordHtml(result.value),
    messages: result.messages || [],
  }
}
