import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildPlanningDocumentExport,
  inferPedagogicalType,
  normalizeResourceSections,
  parsePlanningDocumentExport,
  parsePlanningTableText,
  parsePlanningWordHtml,
} from '../src/domain/planning/documents.js'

test('the versioned JSON preserves the UP but excludes identities and sharing', () => {
  const exported = buildPlanningDocumentExport({
    unit: {
      accessByEmail: { 'direction@example.com': { role: 'directionReader' } },
      code: 'UP 2',
      curriculum: { indicators: [{ id: 'ia-1', label: 'IA 1' }] },
      level: '2n',
      ownerUid: 'private-owner',
      title: 'Els materials',
    },
    phases: [
      { id: 'phase-1', kind: 'preparation', order: 0, parentPhaseId: null, title: 'Preparació' },
      { id: 'phase-2', kind: 'resolution', order: 1, parentPhaseId: null, title: 'Resolució' },
    ],
    activities: [{
      id: 'activity-1',
      indicatorIds: ['ia-1'],
      order: 0,
      phaseId: 'phase-1',
      title: 'Observar materials',
      type: 'activity',
    }, {
      id: 'activity-2',
      indicatorIds: [],
      order: 0,
      phaseId: 'phase-2',
      title: 'Primera activitat de resolució',
      type: 'activity',
    }],
  })
  const parsed = parsePlanningDocumentExport(JSON.stringify(exported))
  assert.equal(parsed.version, 1)
  assert.equal(parsed.activities[0].indicatorLabels[0], 'IA 1')
  assert.equal(parsed.activities[1].order, 0)
  assert.equal('ownerUid' in parsed.unit, false)
  assert.equal('accessByEmail' in parsed.unit, false)
})

test('legacy resource lists migrate to the specific official section', () => {
  const sections = normalizeResourceSections(undefined, {
    attitudesAndValues: ['Cooperació'],
    factsAndConcepts: ['Densitat'],
    procedures: ['Mesurar'],
    specificResources: ['Recurs específic anterior'],
    transversalResources: ['Recurs transversal anterior'],
  })
  assert.deepEqual(sections.specific.factsAndConcepts, ['Recurs específic anterior', 'Densitat'])
  assert.deepEqual(sections.transversal.factsAndConcepts, ['Recurs transversal anterior'])
  assert.deepEqual(sections.transversal.procedures, [])
})

test('Excel and Numbers tabular text is previewed with the official fields', () => {
  const parsed = parsePlanningTableText([
    'Fase\tSubfase\tActivitat\tMinuts\tMaterials\tAgrupament\tEspai\tIA\tDiversitat\tComentaris',
    'Resolució\tAdquisició\tExperiment de densitat\t55\tProveta; Balança\tParelles\tLaboratori\tC2; IA4\tSuport visual\tPreparar el material',
  ].join('\n'))
  assert.equal(parsed.activities.length, 1)
  assert.equal(parsed.activities[0].plannedMinutes, 55)
  assert.equal(parsed.activities[0].teacherMaterials.length, 2)
  assert.deepEqual(parsed.activities[0].indicatorLabels, ['C2', 'IA4'])
  assert.equal(parsed.activities[0].pedagogicalType, 'acquisition')
  assert.equal(parsed.activities[0].description, '')
})

test('the official Word table becomes a safe UP preview before saving', () => {
  const html = `
    <table><tr><td><p><strong>UP3</strong></p><p><strong>1r curs</strong></p></td><td><p>SEQÜÈNCIA</p></td></tr></table>
    <table>
      <tr><td><p>INFORMACIÓ GENERAL</p></td></tr>
      <tr><td><p><strong>Títol:</strong> L’aigua</p></td></tr>
      <tr><td><p><strong>Situació o pregunta complexa (i descriptiu si escau):</strong></p><p>Com la podem separar?</p></td></tr>
      <tr><td><p><strong>Proposta de producció/producte, si escau:</strong> Informe</p></td></tr>
      <tr><td><p><strong>Llengua de vehiculació:</strong> Català</p></td></tr>
    </table>
    <table>
      <tr><td>FASE DE PREPARACIÓ</td></tr>
      <tr><td>Núm</td><td>Subfase</td><td>Descriptiu activitat</td><td>Tps (min)</td><td>Material</td><td>Agrup. / Espai</td><td>IA</td></tr>
      <tr><td>1</td><td>P1</td><td><p>Activitat:</p><p><strong>Activitat motivadora</strong></p><p>Observació inicial.</p><p><strong>Atenció a la diversitat:</strong></p><p>Suport visual</p><p>Comentaris per a l’aplicació, si s’escau:</p><p>Preparar les mostres.</p></td><td>55’</td><td>Mostres</td><td>Parelles</td><td>IA1</td></tr>
      <tr><td>FASE DE TANCAMENT</td></tr>
      <tr><td>2</td><td>Metacognició</td><td><p>Activitat:</p><p>Reflexió final</p></td><td>20</td><td>Quadern</td><td>Individual</td><td></td></tr>
    </table>`
  const parsed = parsePlanningWordHtml(html)
  assert.equal(parsed.unit.title, 'L’aigua')
  assert.equal(parsed.unit.complexSituation, 'Com la podem separar?')
  assert.equal(parsed.activities.length, 2)
  assert.equal(parsed.activities[0].title, 'Activitat motivadora')
  assert.equal(parsed.activities[0].applicationComment, 'Preparar les mostres.')
  assert.equal(parsed.activities[1].pedagogicalType, 'metacognition')
})

test('pedagogical moments prefer metacognition over incidental knowledge words', () => {
  assert.equal(inferPedagogicalType('Metacognició dels coneixements adquirits'), 'metacognition')
})

test('the official Word curriculum and resource blocks are preserved', () => {
  const html = `
    <table><tr><td><p><strong>UP4</strong></p><p><strong>2n curs</strong></p></td><td>SEQÜÈNCIA</td></tr></table>
    <table><tr><td>INFORMACIÓ GENERAL</td></tr><tr><td><p><strong>Títol:</strong> Matèria</p></td></tr></table>
    <table>
      <tr><td>COMPETÈNCIA</td><td>APRENENTATGE ESPERAT</td><td>CRITERI D’AVALUACIÓ</td><td>INDICADOR D’AVALUACIÓ</td></tr>
      <tr><td>C1 Modelitzar</td><td>AE1 Representar</td><td>C1CA1 Rigor</td><td>CFN1 Usa vocabulari científic</td></tr>
    </table>
    <table><tr><td>Recursos de competències específiques:</td></tr><tr><td><p>Fets i conceptes: Densitat</p></td></tr><tr><td><p>Procediments:</p><p>Mesura de la massa</p></td></tr><tr><td>Actituds i valors: Seguretat</td></tr></table>
    <table><tr><td>Recursos de competències transversals:</td></tr><tr><td>Fets i conceptes:</td></tr><tr><td>Procediments: Organització</td></tr><tr><td>Actituds i valors: Constància</td></tr></table>
    <table><tr><td>FASE DE PREPARACIÓ</td></tr><tr><td>1</td><td>Motivació</td><td>Activitat: Observar</td><td>10</td><td>Mostres</td><td>Gran grup</td><td>CFN1 Usa vocabulari científic</td></tr></table>`
  const parsed = parsePlanningWordHtml(html)
  assert.equal(parsed.unit.curriculum.competencies[0].label, 'C1 Modelitzar')
  assert.equal(parsed.unit.curriculum.indicators[0].label, 'CFN1 Usa vocabulari científic')
  assert.deepEqual(parsed.unit.resourceSections.specific.procedures, ['Mesura de la massa'])
  assert.deepEqual(parsed.unit.resourceSections.transversal.attitudesAndValues, ['Constància'])
  assert.equal(parsed.importSummary.warning, '')
})

test('the new Word activity column restores competencies and optional assessment criteria', () => {
  const html = `
    <table><tr><td><p><strong>UP5</strong></p><p><strong>2n curs</strong></p></td><td>SEQÜÈNCIA</td></tr></table>
    <table><tr><td>INFORMACIÓ GENERAL</td></tr><tr><td><p><strong>Títol:</strong> Matèria</p></td></tr></table>
    <table>
      <tr><td>COMPETÈNCIA</td><td>APRENENTATGE ESPERAT</td><td>CRITERI D’AVALUACIÓ</td><td>INDICADOR D’AVALUACIÓ</td></tr>
      <tr><td>C1: Modelització</td><td></td><td>CA1: Rigor</td><td></td></tr>
    </table>
    <table>
      <tr><td>FASE DE PREPARACIÓ</td></tr>
      <tr><td>Núm.</td><td>Subfase</td><td>Descriptiu activitat</td><td>Min.</td><td>Materials</td><td>Agrup. / espai</td><td>Competències / criteris</td></tr>
      <tr><td>1</td><td>Motivació</td><td>Activitat: Observar</td><td>10</td><td>Mostres</td><td>Gran grup</td><td><p>C1: Modelització</p><p>CA1: Rigor</p></td></tr>
    </table>`
  const parsed = parsePlanningWordHtml(html)
  assert.equal(parsed.activities[0].curriculumSelections[0].label, 'C1: Modelització')
  assert.equal(parsed.activities[0].curriculumSelections[0].assessmentCriteria[0].label, 'CA1: Rigor')
  assert.deepEqual(parsed.activities[0].indicatorLabels, [])
})
