import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildStudentCooperativeGroupText,
  buildTeacherCooperativeGroupText,
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
})
