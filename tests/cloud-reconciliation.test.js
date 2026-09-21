import test from 'node:test'
import assert from 'node:assert/strict'
import { reconcileCloudDatasets } from '../src/lib/cloudReconciliation.js'

const COLLECTIONS = ['classes', 'semesters', 'uts']

test('recupera automàticament una classe Tutoria que només existeix a Firebase', () => {
  const local = {
    classes: [{ id: 'class-1', name: '1rC' }],
    semesters: [],
    uts: [],
  }
  const cloud = {
    classes: [
      { id: 'class-1', name: '1rC' },
      { id: 'class-tutoria', name: 'Tutoria', subject: 'Tutoria' },
    ],
    semesters: [{ id: 'semester-tutoria', classId: 'class-tutoria', name: '1r semestre' }],
    uts: [{ id: 'ut-tutoria', classId: 'class-tutoria', semesterId: 'semester-tutoria', name: 'UT1' }],
  }

  const result = reconcileCloudDatasets(local, cloud, COLLECTIONS)

  assert.equal(result.canReconcile, true)
  assert.deepEqual(result.dataset.classes.map((item) => item.name), ['1rC', 'Tutoria'])
  assert.equal(result.dataset.semesters[0].classId, 'class-tutoria')
  assert.equal(result.dataset.uts[0].semesterId, 'semester-tutoria')
  assert.equal(result.stats.cloudOnly, 3)
})

test('conserva també els registres que només existeixen al dispositiu', () => {
  const result = reconcileCloudDatasets(
    { classes: [{ id: 'local', name: 'Classe local' }], semesters: [], uts: [] },
    { classes: [{ id: 'cloud', name: 'Classe Firebase' }], semesters: [], uts: [] },
    COLLECTIONS,
  )

  assert.equal(result.canReconcile, true)
  assert.deepEqual(result.dataset.classes.map((item) => item.id), ['local', 'cloud'])
  assert.equal(result.stats.localOnly, 1)
  assert.equal(result.stats.cloudOnly, 1)
})

test('tria la versió datada més recent i conserva camps antics que hi faltin', () => {
  const result = reconcileCloudDatasets(
    {
      classes: [{ id: 'class-1', name: 'Nom local', tutors: 'Anna', updatedAt: '2026-09-21T08:00:00Z' }],
    },
    {
      classes: [{ id: 'class-1', name: 'Nom Firebase', updatedAt: '2026-09-21T09:00:00Z' }],
    },
    ['classes'],
  )

  assert.equal(result.canReconcile, true)
  assert.equal(result.dataset.classes[0].name, 'Nom Firebase')
  assert.equal(result.dataset.classes[0].tutors, 'Anna')
  assert.equal(result.stats.cloudNewer, 1)
})

test('no endevina entre dues edicions incompatibles sense data', () => {
  const result = reconcileCloudDatasets(
    { classes: [{ id: 'class-1', name: 'Nom local' }] },
    { classes: [{ id: 'class-1', name: 'Nom Firebase' }] },
    ['classes'],
  )

  assert.equal(result.canReconcile, false)
  assert.deepEqual(result.conflicts, [
    { collection: 'classes', id: 'class-1', label: 'Nom local' },
  ])
})
