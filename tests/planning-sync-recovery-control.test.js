import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const planningSource = fs.readFileSync(new URL('../src/features/planning/PlanningModule.jsx', import.meta.url), 'utf8')
const agendaSource = fs.readFileSync(new URL('../src/features/agenda/AgendaModule.jsx', import.meta.url), 'utf8')

test('Programació només mostra el reintent quan la sincronització falla', () => {
  assert.equal(planningSource.match(/workspace\.sync\.state === 'error' && \(/g)?.length, 2)
  assert.equal(planningSource.match(/>Reintentar sincronització<\/button>/g)?.length, 2)
  assert.doesNotMatch(planningSource, />Actualitzar<\/button>/)
})

test('Agenda només mostra el reintent quan la sincronització falla', () => {
  assert.equal(agendaSource.match(/workspace\.sync\.state === 'error' && \(/g)?.length, 2)
  assert.equal(agendaSource.match(/>Reintentar sincronització<\/button>/g)?.length, 2)
  assert.doesNotMatch(agendaSource, /aria-label="Actualitzar Agenda"/)
})
