import assert from 'node:assert/strict'
import test from 'node:test'
import { inlineFormattingToHtml, parseInlineFormatting, stripInlineFormatting } from '../src/lib/formattedText.js'

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

test('recupera una negreta que inclou un salt de línia abans del marcador final', () => {
  assert.deepEqual(parseInlineFormatting('**Primera línia\n**\nText normal'), [
    { text: 'Primera línia\n', type: 'bold' },
    { text: '\nText normal', type: 'text' },
  ])
})

test('genera HTML visual segur sense mostrar els marcadors interns', () => {
  assert.equal(
    inlineFormattingToHtml('**Important** i *matís* <x>'),
    '<strong>Important</strong> i <em>matís</em> &lt;x&gt;',
  )
})

test('permet combinar negreta i cursiva en una mateixa selecció', () => {
  assert.deepEqual(parseInlineFormatting('Text ***molt important***.'), [
    { text: 'Text ', type: 'text' },
    { text: 'molt important', type: 'boldItalic' },
    { text: '.', type: 'text' },
  ])
  assert.equal(inlineFormattingToHtml('***molt important***'), '<strong><em>molt important</em></strong>')
})
