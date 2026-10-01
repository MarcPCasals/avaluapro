import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

import {
  consumeAgendaSchedulingRequest,
  saveAgendaSchedulingRequest,
} from '../src/lib/agendaSchedulingNavigation.js'

function memoryStorage(initialValue = '') {
  const values = new Map(initialValue ? [['avaluapro:open-agenda-scheduling', initialValue]] : [])
  return {
    getItem: (key) => values.get(key) || null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  }
}

test('Programació demana obrir la calendarització completa intel·ligent', () => {
  const storage = memoryStorage()
  saveAgendaSchedulingRequest(storage, { mode: 'smart', planningUnitId: 'up-1' })

  assert.deepEqual(consumeAgendaSchedulingRequest(storage), {
    mode: 'smart',
    planningUnitId: 'up-1',
  })
  assert.deepEqual(consumeAgendaSchedulingRequest(storage), {
    mode: 'progressive',
    planningUnitId: '',
  })
})

test('les peticions antigues continuen obrint la UP en mode progressiu', () => {
  const storage = memoryStorage('up-antiga')

  assert.deepEqual(consumeAgendaSchedulingRequest(storage), {
    mode: 'progressive',
    planningUnitId: 'up-antiga',
  })
})

test('la Cronologia obre les activitats pendents en mode intel·ligent', () => {
  const source = fs.readFileSync(new URL('../src/features/agenda/AgendaModule.jsx', import.meta.url), 'utf8')

  assert.match(source, /const openTimelineScheduling = \(\) => \{/)
  assert.match(source, /setSchedulingMode\('smart'\)/)
  assert.match(source, /onSchedule=\{hasOwnCalendar \? openTimelineScheduling : null\}/)
})
