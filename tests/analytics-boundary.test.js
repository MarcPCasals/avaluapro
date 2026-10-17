import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { getStudentIncompleteActivities } from '../src/lib/analytics.js'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('el detall de constància exclou les activitats fetes i exemptes i respecta alumne i període', () => {
  const tasks = ['done', 'late', 'missing', 'exempt', 'unrecorded'].map(id => ({ id, title: `Tasca ${id}` }))
  const records = [
    ...['DONE', 'LATE', 'MISSING', 'EXEMPT'].map((status, i) => ({ studentId: 's1', taskId: tasks[i].id, status })),
    { studentId: 's2', taskId: 'unrecorded', status: 'DONE' },
    { studentId: 's1', taskId: 'other-period', status: 'MISSING' },
  ]
  const result = getStudentIncompleteActivities('s1', records, tasks)
  assert.deepEqual(result.map(task => task.id), ['late', 'missing', 'unrecorded'])
  assert.deepEqual(result.map(task => task.statusLabel), ['Incompleta', 'No feta', 'Sense registre'])
  assert.deepEqual(getStudentIncompleteActivities('s1', records, tasks.filter(task => ['done', 'exempt'].includes(task.id))), [])
})

async function readProjectFile(relativePath) {
  return readFile(path.join(projectRoot, relativePath), 'utf8')
}

test('l’analítica real prepara les files i delega la taula creuada', async () => {
  const source = await readProjectFile('src/features/analytics/AnalyticsView.jsx')

  assert.match(source, /const crossAnalysisRows = visibleProfiles\.map/)
  assert.match(source, /<CrossAnalysisTable/)
  assert.match(source, /setSelectedAbsence/)
  assert.match(source, /setSelectedTrackingEvidence/)
})

test('assistència utilitza la mateixa taula amb perfils sintètics', async () => {
  const source = await readProjectFile('assistencia/src/AssistanceApp.jsx')

  assert.match(source, /<CrossAnalysisTable/)
  assert.match(source, /getSyntheticDecision/)
  assert.match(source, /formatAbsenceDateTime/)
  assert.match(source, /activeSurface === 'analytics'/)
})

test('la taula creuada compartida només rep dades i accions', async () => {
  const source = await readProjectFile('src/features/analytics/CrossAnalysisTable.jsx')

  assert.doesNotMatch(source, /useAvaluaproStore|firebase|firestore|indexedDB|localStorage|sessionStorage/i)
  for (const heading of ['Rendiment', 'Constància', 'Absències', 'Punts vermells', 'Punts negres', 'Perfil', 'Acció']) {
    assert.match(source, new RegExp(`>${heading}<`))
  }
})
