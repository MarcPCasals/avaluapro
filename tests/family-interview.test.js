import assert from 'node:assert/strict'
import test from 'node:test'

import { buildFamilyInterviewNote, createFamilyInterviewDraft } from '../src/lib/familyInterview.js'

test('crea una anotació estructurada només amb els apartats emplenats', () => {
  const note = buildFamilyInterviewNote({
    ...createFamilyInterviewDraft(),
    objective: 'Compartir com ha començat el curs.',
    strengths: 'Participa i demana ajuda.',
    topics: ['learning', 'wellbeing'],
    familyCommitments: 'Revisar l’agenda dos cops per setmana.',
  })

  assert.equal(note, [
    'TEMES TRACTATS\nAprenentatge · Benestar',
    'MOTIU I OBJECTIU\nCompartir com ha començat el curs.',
    'FORTALESES I EVOLUCIÓ POSITIVA\nParticipa i demana ajuda.',
    'ACORDS DE LA FAMÍLIA\nRevisar l’agenda dos cops per setmana.',
  ].join('\n\n'))
  assert.equal(note.includes('VEU DE L’ALUMNE'), false)
})

test('una plantilla buida no crea una anotació artificial', () => {
  assert.equal(buildFamilyInterviewNote(createFamilyInterviewDraft()), '')
})

