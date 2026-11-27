import assert from 'node:assert/strict'
import test from 'node:test'
import { buildTeacherRelationshipReport } from '../src/features/tutoring/teacherRelationshipReport.js'

const students = [
  { id: 'a', name: 'Alba' },
  { id: 'b', name: 'Biel' },
  { id: 'c', name: 'Clara' },
]
const relations = [
  { id: '1', sourceStudentId: 'a', targetStudentId: 'b', source: 'teacher-observation', type: 'positive', note: 'nota privada' },
  { id: '2', sourceStudentId: 'b', targetStudentId: 'a', source: 'teacher-observation', type: 'positive' },
  { id: '3', sourceStudentId: 'a', targetStudentId: 'c', source: 'sociometric-public-form', type: 'friendship' },
  { id: '4', sourceStudentId: 'c', targetStudentId: 'b', source: 'teacher-observation', type: 'avoid' },
  { id: '5', sourceStudentId: 'c', targetStudentId: 'missing', source: 'teacher-observation', type: 'avoid' },
]

test('teacher report excludes questionnaire by default and preserves directions', () => {
  const report = buildTeacherRelationshipReport({ students, relations })
  assert.equal(report.relationCount, 3)
  assert.equal(report.questionnaireCount, 0)
  assert.equal(report.rows[0].social.length, 0)
  assert.equal(report.rows[0].work[0].direction, '↔')
  assert.equal(report.rows[1].avoid[0].direction, '←')
  assert.deepEqual(report.pairs.work.map((pair) => pair.label), ['Alba ↔ Biel'])
  assert.deepEqual(report.pairs.avoid.map((pair) => pair.label), ['Clara → Biel'])
  assert.equal(JSON.stringify(report).includes('nota privada'), false)
})

test('teacher report labels optional questionnaire relations', () => {
  const report = buildTeacherRelationshipReport({ students, relations, includeQuestionnaire: true })
  assert.equal(report.relationCount, 4)
  assert.equal(report.questionnaireCount, 1)
  assert.equal(report.rows[0].social[0].source, 'Qüestionari')
  assert.deepEqual(report.pairs.social.map((pair) => pair.label), ['Alba → Clara'])
})
