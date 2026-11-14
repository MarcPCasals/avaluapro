import assert from 'node:assert/strict'
import test from 'node:test'
import { shouldShowCompetencyNote } from '../src/lib/competencyNotes.js'

test('la icona apareix amb D i conserva el recordatori quan encara no hi ha nota', () => {
  assert.equal(shouldShowCompetencyNote('D', false), true)
  assert.equal(shouldShowCompetencyNote('', true), true)
  assert.equal(shouldShowCompetencyNote('', false), false)
  for (const grade of ['A', 'B', 'C', 'NA']) {
    assert.equal(shouldShowCompetencyNote(grade, false), false)
    assert.equal(shouldShowCompetencyNote(grade, true), false)
  }
})
