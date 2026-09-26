import assert from 'node:assert/strict'
import test from 'node:test'
import { parseInlineFormatting, stripInlineFormatting } from '../src/lib/formattedText.js'

test('manté el text normal sense aplicar-hi negreta per defecte', () => {
  assert.deepEqual(parseInlineFormatting('Text normal'), [
    { text: 'Text normal', type: 'text' },
  ])
})

test('interpreta només els fragments marcats com a negreta o cursiva', () => {
  assert.deepEqual(parseInlineFormatting('Text **important** i *matís*.'), [
    { text: 'Text ', type: 'text' },
    { text: 'important', type: 'bold' },
    { text: ' i ', type: 'text' },
    { text: 'matís', type: 'italic' },
    { text: '.', type: 'text' },
  ])
})

test('conserva com a text pla els marcadors incomplets', () => {
  assert.deepEqual(parseInlineFormatting('Un **fragment inacabat'), [
    { text: 'Un **fragment inacabat', type: 'text' },
  ])
})

test('pot obtenir el text net per a cerques i exportacions planes', () => {
  assert.equal(stripInlineFormatting('Text **important** i *matís*.'), 'Text important i matís.')
})
