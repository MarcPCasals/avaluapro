import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const viewSource = await readFile(
  new URL('../src/features/students/StudentOverviewView.jsx', import.meta.url),
  'utf8',
)
const tableSource = await readFile(
  new URL('../src/features/students/StudentOverviewTable.jsx', import.meta.url),
  'utf8',
)

test('la vista real delega el bloc visual al component compartit', () => {
  assert.match(viewSource, /import \{ StudentOverviewTable \} from '\.\/StudentOverviewTable'/)
  assert.match(viewSource, /<StudentOverviewTable[\s\S]*rows=\{rows\}[\s\S]*showTutoringColumns=\{showTutoringColumns\}/)
  assert.doesNotMatch(viewSource, /<table className=\{`student-overview-table/)
  assert.doesNotMatch(viewSource, /function SourceEditor/)
})

test('la vista real conserva totes les accions d’origen', () => {
  assert.match(viewSource, /onOpenAnnotations=\{setAnnotationsStudentId\}/)
  assert.match(viewSource, /onOpenOtherRecords=\{setOtherRecordsStudentId\}/)
  assert.match(viewSource, /onOpenProfile=\{setProfileStudentId\}/)
  assert.match(viewSource, /onOpenRegistry=\{setRegistryStudentId\}/)
  assert.match(
    viewSource,
    /onSavePersonalNotes=\{\(studentId, personalNotes\) => updateStudent\(studentId, \{ personalNotes \}\)\}/,
  )
})

test('el component compartit manté les sis columnes base i les tres tutorials', () => {
  const baseHeadings = [
    'Alumne',
    'Perfil',
    'Informació general',
    'Avaluació i seguiment',
    'Absències',
    'Anotacions de seguiment',
  ]
  const tutoringHeadings = ['Anotacions de tutoria', 'Registre tutorial', 'Agenda i incidències']

  baseHeadings.forEach((heading) => assert.match(tableSource, new RegExp(`>${heading}<`)))
  tutoringHeadings.forEach((heading) => {
    assert.match(tableSource, new RegExp(`showTutoringColumns && <th><span>${heading}</span>`))
  })
})

test('el component compartit no coneix la botiga ni cap persistència', () => {
  assert.doesNotMatch(tableSource, /useAvaluaproStore|\/store\//i)
  assert.doesNotMatch(tableSource, /firebase|firestore/i)
  assert.doesNotMatch(tableSource, /indexedDB|\bidb\b/i)
})
