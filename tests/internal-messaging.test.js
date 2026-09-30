import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildInternalRecipientContacts,
  filterInternalRecipientContacts,
} from '../src/features/messages/recipientSuggestions.js'

test('combina directori, cotutors i converses sense repetir correus ni mostrar el propi', () => {
  const contacts = buildInternalRecipientContacts({
    ownEmail: 'jo@educand.ad',
    directory: [
      { displayName: 'Anna Docent', emailLower: 'anna@educand.ad' },
      { displayName: 'Jo', emailLower: 'jo@educand.ad' },
    ],
    cotutors: [{ email: 'anna@educand.ad', label: 'Anna Cotutora' }],
    conversations: [{ email: 'berta@educand.ad' }],
  })

  assert.deepEqual(contacts.map(({ email }) => email), ['anna@educand.ad', 'berta@educand.ad'])
  assert.equal(contacts[0].label, 'Anna Cotutora')
})

test('filtra suggeriments indistintament pel nom o pel correu', () => {
  const contacts = [
    { email: 'anna@educand.ad', label: 'Anna Docent' },
    { email: 'berta@educand.ad', label: 'Berta Professora' },
  ]

  assert.deepEqual(filterInternalRecipientContacts(contacts, 'prof').map((item) => item.email), ['berta@educand.ad'])
  assert.deepEqual(filterInternalRecipientContacts(contacts, 'anna@').map((item) => item.email), ['anna@educand.ad'])
})
