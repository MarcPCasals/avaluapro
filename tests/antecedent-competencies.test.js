import assert from 'node:assert/strict'
import { test } from 'node:test'
import { antecedentCompetencyKey, normalizeAntecedentCompetencies } from '../src/lib/antecedentCompetencies.js'

test('mostra les notes importades per codi en els camps amb nom complet', () => {
 const grades = normalizeAntecedentCompetencies({ C1: 'A', C2: 'B', C3: 'C' })
 for (const [name, expected] of [['C1: Modelització', 'A'], ['C2: Indagació', 'B'], ['C3: Argumentació', 'C']]) {
  assert.equal(grades[antecedentCompetencyKey(name)], expected)
 }
})
test('conserva dades anteriors amb noms complets i evita duplicar notes després d’editar', () => {
 const grades = normalizeAntecedentCompetencies({ C1: 'D', 'C1: Modelització': 'A', 'C2: Indagació': 'B' })
 assert.deepEqual(grades, { C1: 'A', C2: 'B' })
 grades[antecedentCompetencyKey('C1: Modelització')] = ''
 assert.deepEqual(normalizeAntecedentCompetencies(grades), { C1: '', C2: 'B' })
 assert.equal(antecedentCompetencyKey('TRANS C1: Emprendre projectes'), 'TRANS C1')
})
