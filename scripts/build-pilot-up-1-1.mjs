import fs from 'node:fs/promises'
import path from 'node:path'
import mammoth from 'mammoth'
import { parsePlanningDocumentExport, parsePlanningWordHtml } from '../src/domain/planning/documents.js'

const [, , sourcePath, destinationPath] = process.argv
if (!sourcePath || !destinationPath) {
  throw new Error('Ús: node scripts/build-pilot-up-1-1.mjs <origen.docx> <destinació.json>')
}

const { value: html } = await mammoth.convertToHtml({ path: sourcePath })
const source = parsePlanningWordHtml(html)
if (source.activities.length !== 22) {
  throw new Error(`S’esperaven 22 activitats al document original i se n’han trobat ${source.activities.length}.`)
}

// Cada bloc correspon a un tram contigu del Word. Això conserva l'ordre 1–22
// encara que els codis P1, R1 o R2 es repeteixin més endavant al document.
const phaseSections = [
  { key: 'preparation', kind: 'preparation', order: 0, parentKey: null, title: 'Preparació' },
  { key: 'prep-motivation', kind: 'preparation', order: 0, parentKey: 'preparation', title: 'P1 · Motivació' },
  { key: 'prep-prior', kind: 'preparation', order: 1, parentKey: 'preparation', title: 'P2 · Coneixements previs' },
  { key: 'prep-presentation', kind: 'preparation', order: 2, parentKey: 'preparation', title: 'P1 · Presentació de la unitat' },
  { key: 'prep-situation', kind: 'preparation', order: 3, parentKey: 'preparation', title: 'P4 · Situació competencial' },
  { key: 'prep-questions', kind: 'preparation', order: 4, parentKey: 'preparation', title: 'P5 · Formulació de preguntes' },
  { key: 'resolution', kind: 'resolution', order: 1, parentKey: null, title: 'Resolució' },
  { key: 'res-question-1', kind: 'resolution', order: 0, parentKey: 'resolution', title: 'R1 · Primera pregunta' },
  { key: 'res-hypothesis-1', kind: 'resolution', order: 1, parentKey: 'resolution', title: 'R2 · Hipòtesis sobre els components' },
  { key: 'res-corpuscular', kind: 'resolution', order: 2, parentKey: 'resolution', title: 'R3 · Teoria corpuscular' },
  { key: 'res-mixtures-lab', kind: 'resolution', order: 3, parentKey: 'resolution', title: 'R4 · Mescles al laboratori' },
  { key: 'res-elements', kind: 'resolution', order: 4, parentKey: 'resolution', title: 'R5 · Elements i compostos' },
  { key: 'res-map-1', kind: 'resolution', order: 5, parentKey: 'resolution', title: 'R6 · Mapa conceptual' },
  { key: 'res-conclusion-1', kind: 'resolution', order: 6, parentKey: 'resolution', title: 'R7 · Conclusions de la primera pregunta' },
  { key: 'res-question-2', kind: 'resolution', order: 7, parentKey: 'resolution', title: 'R1 · Segona pregunta' },
  { key: 'res-hypothesis-2', kind: 'resolution', order: 8, parentKey: 'resolution', title: 'R2 · Hipòtesis sobre la flotabilitat' },
  { key: 'res-density-lab', kind: 'resolution', order: 9, parentKey: 'resolution', title: 'R3 · Densitat al laboratori' },
  { key: 'res-magnitudes', kind: 'resolution', order: 10, parentKey: 'resolution', title: 'R4 · Massa, volum i densitat' },
  { key: 'res-mixtures', kind: 'resolution', order: 11, parentKey: 'resolution', title: 'Mescles' },
  { key: 'closing', kind: 'closing', order: 2, parentKey: null, title: 'Tancament' },
  { key: 'close-theorization', kind: 'closing', order: 0, parentKey: 'closing', title: 'Teorització i síntesi' },
  { key: 'close-test', kind: 'closing', order: 1, parentKey: 'closing', title: 'Prova competencial' },
  { key: 'close-metacognition', kind: 'closing', order: 2, parentKey: 'closing', title: 'Metacognició' },
]

const activityPhaseKeys = [
  'prep-motivation', 'prep-prior', 'prep-presentation', 'prep-situation', 'prep-questions',
  'res-question-1', 'res-hypothesis-1', 'res-corpuscular', 'res-mixtures-lab', 'res-mixtures-lab',
  'res-elements', 'res-map-1', 'res-conclusion-1', 'res-question-2', 'res-hypothesis-2',
  'res-density-lab', 'res-density-lab', 'res-magnitudes', 'res-mixtures',
  'close-theorization', 'close-test', 'close-metacognition',
]

const activityTitles = [
  'Tast de Coca-Cola i definició inicial',
  'Què sabem sobre els ingredients?',
  'Presentació dels aprenentatges i l’avaluació',
  'La fórmula secreta: situació competencial',
  'Què necessitem investigar?',
  'Evaporació de la Coca-Cola i primera hipòtesi',
  'Posada en comú de les hipòtesis sobre els components',
  'Teoria corpuscular de la matèria',
  'Mescles homogènies i heterogènies al laboratori',
  'Informe de la pràctica de mescles',
  'Elements, compostos i substàncies pures',
  'Mapa conceptual de la primera pregunta',
  'Resposta a la primera pregunta i enciclopèdia',
  'Flotabilitat de les llaunes i segona hipòtesi',
  'Posada en comú de la segona hipòtesi',
  'Massa, volum i densitat al laboratori',
  'Informe de la pràctica de densitat',
  'Magnituds: massa, volum i densitat',
  'Mescles i mètodes de separació',
  'Kahoot i mapa mental de síntesi',
  'Prova competencial',
  'Metacognició i correcció de la prova',
]

const pedagogicalTypes = [
  'motivation', 'priorKnowledge', 'explanation', 'situation', 'workPlan',
  'hypothesis', 'hypothesis', 'acquisition', 'acquisition', 'acquisition',
  'acquisition', 'mobilization', 'response', 'hypothesis', 'hypothesis',
  'acquisition', 'acquisition', 'acquisition', 'acquisition',
  'theorization', 'competencyTest', 'metacognition',
]

const evidenceActivities = new Set([10, 11, 12, 13, 17, 19, 20, 21, 22])

function adaptMaterial(material, applicationComment) {
  const label = String(material.label || '')
  const normalized = label.toLocaleLowerCase('ca')
  let preparationKind = 'reference'
  if (/quadern|llibreta|dossier|mapa conceptual|enciclopèdia|ipad/.test(normalized)) preparationKind = 'student'
  if (/coca.?cola|got/.test(normalized)) preparationKind = 'buy'
  if (/material laboratori/.test(normalized)) preparationKind = 'reserve'
  if (/vas de precipitats|vareta|placa calefactora|galleda/.test(normalized)) preparationKind = 'teacher'
  if (/imprès|paper/.test(applicationComment) && /^ut/i.test(label)) preparationKind = 'print'
  if (/vídeo|video/.test(normalized)) preparationKind = 'teacher'
  return {
    ...material,
    preparationKind,
    reminderDaysBefore: preparationKind === 'reference' ? 0 : 1,
  }
}

const activities = source.activities.map((activity, index) => {
  const activityNumber = index + 1
  return {
    ...activity,
    evidenceMode: evidenceActivities.has(activityNumber) ? 'final' : 'none',
    order: activityPhaseKeys[index] === activityPhaseKeys[index - 1] ? 1 : 0,
    pedagogicalType: pedagogicalTypes[index],
    phaseKey: activityPhaseKeys[index],
    space: [9, 16].includes(activityNumber) ? 'Laboratori 2' : activity.space,
    teacherMaterials: activity.teacherMaterials.map((material) =>
      adaptMaterial(material, activity.applicationComment)),
    title: activityTitles[index],
  }
})

const bundle = {
  format: 'avaluapro-planning-unit',
  version: 1,
  exportedAt: new Date().toISOString(),
  schemaVersion: 1,
  unit: {
    ...source.unit,
    code: 'UP 1.1',
    curriculum: {
      assessmentCriteria: [],
      competencies: [],
      expectedLearnings: [
        { label: 'Representar models senzills d’estructures moleculars per explicar les diferències entre substàncies elementals i compostos químics i els canvis d’una reacció química.' },
        { label: 'Iniciar-se en l’ús del llenguatge científic bàsic.' },
        { label: 'Validar hipòtesis sobre les estructures moleculars seguint els passos d’una investigació científica.' },
        { label: 'Analitzar críticament el propi procés d’aprenentatge.' },
        { label: 'Aplicar tècniques d’estudi senzilles: subratllat, mots clau i mapa conceptual.' },
        { label: 'Comunicar amb precisió, amb el suport i el llenguatge adequats a la intencionalitat.' },
      ],
      indicators: [{ label: 'C2' }],
    },
    level: '1r d’ESO',
    resourceSections: {
      specific: {
        attitudesAndValues: ['Rigor en la formulació i la validació d’hipòtesis', 'Treball segur i responsable al laboratori'],
        factsAndConcepts: ['Teoria corpuscular de la matèria', 'Àtoms, elements i compostos', 'Substàncies pures i mescles', 'Massa, volum i densitat'],
        procedures: ['Aplicació del mètode científic', 'Mesura de massa i volum', 'Càlcul de la densitat', 'Elaboració d’informes de laboratori'],
      },
      transversal: {
        attitudesAndValues: ['Cooperació', 'Autonomia', 'Revisió crítica del propi aprenentatge'],
        factsAndConcepts: ['Vocabulari científic bàsic'],
        procedures: ['Lectura i subratllat d’idees principals', 'Elaboració de mapes conceptuals', 'Comunicació oral i escrita de conclusions'],
      },
    },
    title: 'La fórmula secreta',
  },
  phases: phaseSections,
  activities,
  importSummary: {
    activityCount: activities.length,
    phaseCount: 3,
    warning: 'Adaptació revisada del Taller 1.1 CFN. El Word indica 1.330 minuts, però les 22 files sumen 1.300 minuts.',
  },
}

// La mateixa validació que usa la interfície garanteix que el fitxer generat
// es podrà previsualitzar abans de crear la còpia dins del curs acadèmic.
parsePlanningDocumentExport(bundle)
await fs.mkdir(path.dirname(destinationPath), { recursive: true })
await fs.writeFile(destinationPath, `${JSON.stringify(bundle, null, 2)}\n`)

const totalMinutes = activities.reduce((total, activity) => total + (Number(activity.plannedMinutes) || 0), 0)
console.log(JSON.stringify({ activities: activities.length, phases: phaseSections.length, totalMinutes }))
