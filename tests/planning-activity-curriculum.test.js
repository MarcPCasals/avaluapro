import assert from 'node:assert/strict'
import test from 'node:test'
import {
  activityCurriculumText,
  buildActivityCurriculumOptions,
} from '../src/domain/planning/activityCurriculum.js'

test('agrupa les competències i els criteris repetits de les diferents UT', () => {
  const options = buildActivityCurriculumOptions({
    classId: 'class-cfn',
    uts: [
      { id: 'ut-1', classId: 'class-cfn' },
      { id: 'ut-2', classId: 'class-cfn' },
    ],
    competencies: [
      { id: 'c1-ut1', utId: 'ut-1', name: 'C1: Modelització', order: 1 },
      { id: 'c2-ut1', utId: 'ut-1', name: 'C2: Indagació', order: 2 },
      { id: 'c1-ut2', utId: 'ut-2', name: 'C1: Modelització', order: 1 },
      { id: 'other', classId: 'another-class', name: 'No ha de sortir', order: 1 },
    ],
    criteria: [
      { id: 'ca1-ut1', competencyId: 'c1-ut1', name: 'CA1: Rigor', order: 1 },
      { id: 'ca1-ut2', competencyId: 'c1-ut2', name: 'CA1: Rigor', order: 1 },
      { id: 'ca2-ut2', competencyId: 'c1-ut2', name: 'CA2: Precisió', order: 2 },
    ],
  })

  assert.deepEqual(options.map((option) => option.label), ['C1: Modelització', 'C2: Indagació'])
  assert.deepEqual(options[0].criteria.map((criterion) => criterion.label), ['CA1: Rigor', 'CA2: Precisió'])
})

test('usa les tres competències oficials de CFN si encara no hi ha cap UT d’avaluació', () => {
  const options = buildActivityCurriculumOptions({
    classId: 'class-cfn',
    subjectName: 'Ciències Físiques i de la Natura',
  })

  assert.equal(options.length, 3)
  assert.deepEqual(options.map((option) => option.label), [
    'C1: Modelització',
    'C2: Indagació',
    'C3: Argumentació',
  ])
  assert.deepEqual(options[0].criteria.map((criterion) => criterion.label), ['CA1: Rigor', 'CA2: Precisió'])
})

test('genera una còpia llegible de les competències i criteris seleccionats', () => {
  const text = activityCurriculumText({
    curriculumSelections: [{
      competencyKey: 'competency:c1',
      label: 'C1: Modelització',
      assessmentCriteria: [{ criterionKey: 'criterion:ca1', label: 'CA1: Rigor' }],
    }],
  })

  assert.equal(text, 'C1: Modelització\nCA1: Rigor')
})
