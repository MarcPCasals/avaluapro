import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function readProjectFile(relativePath) {
  return readFile(path.join(projectRoot, relativePath), 'utf8')
}

test('el control real d’absència delega la part visual al component compartit', async () => {
  const source = await readProjectFile('src/features/attendance/AbsenceToggle.jsx')

  assert.match(source, /<AbsenceControl/)
  assert.match(source, /toggleStudentAbsence\(studentId\)/)
  assert.match(source, /findAbsenceInSlot/)
  assert.match(source, /getStudentAbsenceHours/)
})

test('assistència conserva el registre d’absències només en memòria', async () => {
  const source = await readProjectFile('assistencia/src/AssistanceApp.jsx')

  assert.match(source, /assistanceAdapter\.toggleAbsence/)
  assert.match(source, /dataset\.absenceRecords/)
  assert.doesNotMatch(source, /renderAbsenceControl/)
})

test('el control visual no coneix botigues ni persistència', async () => {
  const source = await readProjectFile('src/features/attendance/AbsenceControl.jsx')

  assert.doesNotMatch(source, /useAvaluaproStore|firebase|firestore|indexedDB|localStorage|sessionStorage/i)
  assert.match(source, /aria-pressed=\{Boolean\(activeRecord\)\}/)
})
