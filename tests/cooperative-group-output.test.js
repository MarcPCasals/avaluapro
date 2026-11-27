import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildStudentCooperativeGroupText,
  buildTeacherCooperativeGroupText,
  findCooperativeStudentMatches,
  formatCooperativeStudentName,
} from '../src/features/tutoring/cooperativeGroupOutputUtils.js'

const groups = [
  {
    alerts: [{ text: 'Alumna A queda sense vincle positiu clar dins del grup.' }],
    analysis: { strengths: ['La mida és coherent amb l’objectiu seleccionat.'] },
    members: [
      {
        pedagogicalLabels: [{ label: 'Seguiment prioritari' }],
        student: { name: 'Alumna A' },
      },
      { student: { name: 'Alumne B' } },
    ],
    name: 'Grup 1',
  },
]

describe('sortides de grups cooperatius', () => {
  it('mostra primer el nom i després els cognoms', () => {
    assert.equal(
      formatCooperativeStudentName('Chamorro De La Cruz, Joao'),
      'Joao Chamorro De La Cruz',
    )
  })

  it('proposa alumnes a partir del nom o cognom sense exigir accents', () => {
    const students = [
      { id: '1', name: 'García, Júlia' },
      { id: '2', name: 'Garcia, Joan' },
      { id: '3', name: 'Pérez, Anna' },
    ]
    assert.deepEqual(findCooperativeStudentMatches(students, 'julia garcia').map((item) => item.id), ['1'])
    assert.deepEqual(findCooperativeStudentMatches(students, 'garcia').map((item) => item.id), ['2', '1'])
    assert.deepEqual(findCooperativeStudentMatches(students, ''), [])
  })

  it('la còpia per alumnat només inclou noms i grups', () => {
    const text = buildStudentCooperativeGroupText(groups, { title: 'Laboratori' })

    assert.match(text, /Laboratori/)
    assert.match(text, /Alumna A/)
    assert.doesNotMatch(text, /Seguiment prioritari/)
    assert.doesNotMatch(text, /vincle positiu/)
    assert.doesNotMatch(text, /Qualitat/)
  })

  it('la còpia docent inclou context pedagògic i observació', () => {
    const text = buildTeacherCooperativeGroupText(groups, {
      observation: 'Revisar després de dues sessions.',
      qualityLabel: 'A revisar',
      score: 68,
      strategyLabel: 'Equilibri general',
      title: 'Laboratori',
    })

    assert.match(text, /Qualitat: 68\/100 · A revisar/)
    assert.match(text, /Observació docent/)
    assert.match(text, /Fortaleses/)
    assert.match(text, /Punts a revisar/)
  })

  it('inclou els rols triats en les dues llistes i ignora valors desconeguts', () => {
    const withRoles = [{
      name: 'Grup 1',
      memberRoles: { 'student-1': 'Coordinador', 'student-2': 'Inventat' },
      members: [
        { student: { id: 'student-1', name: 'Alumna A' } },
        { student: { id: 'student-2', name: 'Alumne B' } },
      ],
    }]
    const studentText = buildStudentCooperativeGroupText(withRoles)
    const teacherText = buildTeacherCooperativeGroupText(withRoles)
    assert.match(studentText, /Alumna A · Coordinador/)
    assert.match(teacherText, /Alumna A · Coordinador/)
    assert.doesNotMatch(studentText, /Inventat/)
  })
})
