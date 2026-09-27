import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const viewSource = await readFile(
  new URL('../src/features/evaluation/EvaluationView.jsx', import.meta.url),
  'utf8',
)
const tableSource = await readFile(
  new URL('../src/features/evaluation/EvaluationTable.jsx', import.meta.url),
  'utf8',
)
const assistanceSource = await readFile(
  new URL('../assistencia/src/AssistanceApp.jsx', import.meta.url),
  'utf8',
)

test('la vista real delega la graella al component compartit', () => {
  assert.match(viewSource, /import \{ EvaluationTable \} from '\.\/EvaluationTable'/)
  assert.match(viewSource, /<EvaluationTable[\s\S]*students=\{filteredStudents\}/)
  assert.doesNotMatch(viewSource, /<table className="evaluation-table"/)
})

test('la vista real conserva totes les accions de la graella', () => {
  assert.match(viewSource, /onOpenAnnotations=\{setAnnotationsStudentId\}/)
  assert.match(viewSource, /onOpenProfile=\{setProfileStudentId\}/)
  assert.match(viewSource, /onOpenReminders=\{\(\) => setShowRemindersModal\(true\)\}/)
  assert.match(viewSource, /onOpenRubric=\{setRubricCriterionId\}/)
  assert.match(viewSource, /onToggleCompetencyModification=\{toggleCompetencyModification\}/)
  assert.match(viewSource, /onUpdateMark=\{updateMark\}/)
  assert.match(viewSource, /<AbsenceToggle classId=\{activeClassId\} studentId=\{student\.id\} \/>/)
})

test('la mateixa graella rep l’adaptador sintètic a assistència', () => {
  assert.match(assistanceSource, /import \{ EvaluationTable \}/)
  assert.match(assistanceSource, /assistanceAdapter\.setEvaluationMark\(studentId, criterionId, value\)/)
  assert.match(assistanceSource, /competencies=\{dataset\.evaluationCompetencies\}/)
  assert.match(assistanceSource, /marks=\{dataset\.evaluationMarks\}/)
})

test('la graella compartida no coneix cap botiga o persistència', () => {
  assert.doesNotMatch(tableSource, /useAvaluaproStore|\/store\//i)
  assert.doesNotMatch(tableSource, /firebase|firestore/i)
  assert.doesNotMatch(tableSource, /indexedDB|\bidb\b/i)
  assert.match(tableSource, /onUpdateMark\(student\.id, criterion\.id, event\.target\.value\)/)
})
