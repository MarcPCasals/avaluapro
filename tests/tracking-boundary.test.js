import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const viewSource = await readFile(
  new URL('../src/features/tracking/TrackingView.jsx', import.meta.url),
  'utf8',
)
const tableSource = await readFile(
  new URL('../src/features/tracking/TrackingTable.jsx', import.meta.url),
  'utf8',
)
const assistanceSource = await readFile(
  new URL('../assistencia/src/AssistanceApp.jsx', import.meta.url),
  'utf8',
)

test('la vista real prepara les files i delega la graella de seguiment', () => {
  assert.match(viewSource, /const trackingRows = filteredStudents\.map/)
  assert.match(viewSource, /<TrackingTable[\s\S]*rows=\{trackingRows\}[\s\S]*tasks=\{visibleTasks\}/)
  assert.doesNotMatch(viewSource, /<table className="tracking-table"/)
})

test('la vista real conserva les accions sensibles fora del component', () => {
  assert.match(viewSource, /onSetTaskStatus=\{handleTaskStatus\}/)
  assert.match(viewSource, /onAddBehavior=\{\(student, type\) => setBehaviorDraft\(\{ student, type \}\)\}/)
  assert.match(viewSource, /onOpenAgendaDetail=\{setAgendaDetailStudentId\}/)
  assert.match(viewSource, /onOpenRedPoints=\{setRedDetailStudentId\}/)
  assert.match(viewSource, /<AbsenceToggle classId=\{activeClassId\} studentId=\{student\.id\} \/>/)
})

test('assistència connecta la mateixa graella a estats sintètics', () => {
  assert.match(assistanceSource, /import \{ TrackingTable \}/)
  assert.match(assistanceSource, /assistanceAdapter\.setTaskStatus\(student\.id, taskId, status\)/)
  assert.match(assistanceSource, /taskRecords=\{dataset\.trackingRecords\}/)
  assert.match(assistanceSource, /tasks=\{trackingTasks\}/)
})

test('la graella compartida no coneix cap botiga o persistència', () => {
  assert.doesNotMatch(tableSource, /useAvaluaproStore|\/store\//i)
  assert.doesNotMatch(tableSource, /firebase|firestore/i)
  assert.doesNotMatch(tableSource, /indexedDB|\bidb\b/i)
  assert.match(tableSource, /onSetTaskStatus\(student, task\.id, status\.id\)/)
})
