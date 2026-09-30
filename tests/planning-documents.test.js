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

test('Word import preserves repeated subphase blocks and inherits blank subphase cells', () => {
  const html = `
    <table><tr><td><p><strong>UP1.1</strong></p><p><strong>1r curs</strong></p></td><td>SEQÜÈNCIA</td></tr></table>
    <table><tr><td>INFORMACIÓ GENERAL</td></tr><tr><td><strong>Títol:</strong> La fórmula secreta</td></tr></table>
    <table>
      <tr><td>FASE DE RESOLUCIÓ</td></tr>
      <tr><td>Núm</td><td>Subfase</td><td>Descriptiu activitat</td><td>Tps (min)</td><td>Material</td><td>Agrup. / Espai</td><td>IA</td></tr>
      <tr><td>1.</td><td>R1</td><td>Activitat: Primera hipòtesi</td><td>30</td><td>Quadern</td><td>Individual</td><td></td></tr>
      <tr><td>2</td><td></td><td>Activitat: Informe de la primera hipòtesi</td><td>20</td><td>Dossier</td><td>Parelles</td><td></td></tr>
      <tr><td>3</td><td>R2</td><td>Activitat: Posada en comú</td><td>10</td><td>Pissarra</td><td>Gran grup</td><td></td></tr>
      <tr><td>4</td><td>R1</td><td>Activitat: Segona hipòtesi</td><td>15</td><td>Quadern</td><td>Individual</td><td></td></tr>
    </table>
    <p>Total Temps (minuts) de les tres fases: 80</p>`
  const parsed = parsePlanningWordHtml(html)
  assert.deepEqual(parsed.phases.filter((phase) => phase.parentKey).map((phase) => phase.title), ['R1', 'R2', 'R1 (2)'])
  assert.equal(parsed.activities[0].phaseKey, parsed.activities[1].phaseKey)
  assert.notEqual(parsed.activities[0].phaseKey, parsed.activities[3].phaseKey)
  assert.deepEqual(parsed.activities.map((activity) => activity.title), [
    'Primera hipòtesi',
    'Informe de la primera hipòtesi',
    'Posada en comú',
    'Segona hipòtesi',
  ])
  assert.equal(parsed.importSummary.calculatedTotalMinutes, 75)
  assert.equal(parsed.importSummary.declaredTotalMinutes, 80)
  assert.match(parsed.importSummary.warning, /declara 80 minuts.*sumen 75/)
})

test('Word import keeps only the final application comment after duplicated template labels', () => {
  const html = `
    <table><tr><td><p><strong>UP2</strong></p><p><strong>2n curs</strong></p></td><td>SEQÜÈNCIA</td></tr></table>
    <table><tr><td>INFORMACIÓ GENERAL</td></tr><tr><td><strong>Títol:</strong> Matèria</td></tr></table>
    <table>
      <tr><td>FASE DE RESOLUCIÓ</td></tr>
      <tr><td>1</td><td>R4</td><td><p>Activitat: Mesurar</p><p>Comentaris per a l'aplicació:</p><p>Atenció a la diversitat:</p><p>Suport visual</p><p>Comentaris per a l'aplicació, si s'escau:</p><p>Preparar la proveta</p></td><td>30</td><td>Proveta</td><td>Parelles</td><td></td></tr>
    </table>`
  const parsed = parsePlanningWordHtml(html)
  assert.equal(parsed.activities[0].applicationComment, 'Preparar la proveta')
  assert.equal(parsed.activities[0].diversityMeasures[0].label, 'Suport visual')
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

test('older SG Word variants keep merged curriculum cells and every phase table', () => {
  const html = `
    <table><tr><td><p><strong>UP1.1</strong></p><p><strong>1r curs</strong></p></td><td>SEQÜÈNCIA</td></tr></table>
    <table><tr><td>INFORMACIÓ GENERAL</td></tr><tr><td><strong>Títol:</strong> Itinerari de natura</td></tr></table>
    <table>
      <tr><td>ÀREA</td><td>COMPETÈNCIA</td><td>APRENENTATGE ESPERAT</td><td>CRITERI D’AVALUACIÓ</td><td>INDICADOR D’AVALUACIÓ</td><td>ACTIVITAT</td></tr>
      <tr><td rowspan="2">CAT</td><td rowspan="2">C3 Escriure textos</td><td rowspan="2">Elabora textos instructius</td><td>C3CA1 Adequació</td><td>CAT14 Adequa el text</td><td>2</td></tr>
      <tr><td>C3CA2 Coherència</td><td>CAT16 Estructura el text</td><td>2,3</td></tr>
    </table>
    <table><tr><td>Recursos de competències específiques:</td></tr><tr><td>Fets i conceptes: Text instructiu</td></tr></table>
    <table>
      <tr><td colspan="8">FASE DE PREPARACIÓ</td></tr>
      <tr><td>Núm.</td><td>Subfase</td><td>Descriptiu activitat</td><td>Recursos</td><td>Tps (min)</td><td>Material</td><td>Agrup. / Espai</td><td>IA</td></tr>
      <tr><td>1</td><td>P1 Presentació</td><td>Activitat: Presentar els aprenentatges</td><td>TC2 Autoconeixement</td><td>20’</td><td>Portafolis</td><td>Gran grup</td><td></td></tr>
    </table>
    <table>
      <tr><td colspan="8">FASE DE RESOLUCIÓ</td></tr>
      <tr><td>Núm.</td><td>Subfase</td><td>Descriptiu activitat</td><td>Recursos</td><td>Tps (min)</td><td>Material</td><td>Agrup. / Espai</td><td>IA</td></tr>
      <tr><td>2</td><td>R1 Propostes</td><td>Activitat: Formular propostes</td><td>TC1 Definició del problema</td><td>30</td><td>Quadern</td><td>Parelles</td><td>CAT14</td></tr>
    </table>
    <table>
      <tr><td colspan="8">FASE D’INTEGRACIÓ</td></tr>
      <tr><td>Núm.</td><td>Subfase</td><td>Descriptiu activitat</td><td>Recursos</td><td>Tps (min)</td><td>Material</td><td>Agrup. / Espai</td><td>IA</td></tr>
      <tr><td>3</td><td>I1 Conclusions</td><td>Activitat: Revisar els aprenentatges</td><td>TC2 Metacognició</td><td>15</td><td>Portafolis</td><td>Individual</td><td>CAT16</td></tr>
    </table>
    <p>Total Temps (minuts) de les tres fases 65’</p>`
  const parsed = parsePlanningWordHtml(html)
  assert.equal(parsed.activities.length, 3)
  assert.deepEqual(parsed.phases.filter((phase) => !phase.parentKey).map((phase) => phase.title), ['Preparació', 'Resolució', 'Integració'])
  assert.deepEqual(parsed.activities.map((activity) => activity.plannedMinutes), [20, 30, 15])
  assert.deepEqual(parsed.activities.map((activity) => activity.grouping), ['Gran grup', 'Parelles', 'Individual'])
  assert.deepEqual(parsed.activities.map((activity) => activity.teacherMaterials[0].label), ['Portafolis', 'Quadern', 'Portafolis'])
  assert.match(parsed.activities[0].description, /Recursos vinculats al document:\nTC2 Autoconeixement/)
  assert.deepEqual(parsed.unit.curriculum.expectedLearnings.map((item) => item.label), ['Elabora textos instructius'])
  assert.deepEqual(parsed.unit.curriculum.assessmentCriteria.map((item) => item.label), ['C3CA1 Adequació', 'C3CA2 Coherència'])
  assert.deepEqual(parsed.unit.curriculum.indicators.map((item) => item.label), ['CAT14 Adequa el text', 'CAT16 Estructura el text', 'CAT14', 'CAT16'])
  assert.equal(parsed.unit.curriculum.expectedLearnings.some((item) => /^\d/.test(item.label)), false)
  assert.equal(parsed.importSummary.warning, '')
})
