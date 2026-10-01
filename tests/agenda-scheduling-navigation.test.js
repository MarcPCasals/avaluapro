import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

import {
  consumeAgendaSchedulingRequest,
  saveAgendaSchedulingRequest,
} from '../src/lib/agendaSchedulingNavigation.js'
import { selectCurrentPlanningApplicationRecords } from '../src/features/agenda/agendaSchedulingPersistence.js'

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

test('la càrrega curta d’Avui no pot substituir la Cronologia', () => {
  const moduleSource = fs.readFileSync(new URL('../src/features/agenda/AgendaModule.jsx', import.meta.url), 'utf8')
  const workspaceSource = fs.readFileSync(new URL('../src/features/agenda/useAgendaWorkspace.js', import.meta.url), 'utf8')

  assert.match(moduleSource, /if \(view !== 'today' \|\| !hasAgendaWorkspace\) return undefined/)
  assert.doesNotMatch(workspaceSource, /loadTodaySessions\(\)\.catch/)
})

test('la Cronologia mostra només l’aplicació vigent de cada UP i grup', () => {
  const planningUnit = { id: 'up-1' }
  const records = [
    { application: { id: 'app-old', classId: 'class-1', updatedAt: '2026-10-01T10:00:00.000Z' }, planningUnit },
    { application: { id: 'app-current', classId: 'class-1', updatedAt: '2026-10-01T12:00:00.000Z' }, planningUnit },
    { application: { id: 'app-other-class', classId: 'class-2', updatedAt: '2026-10-01T11:00:00.000Z' }, planningUnit },
  ]

  assert.deepEqual(
    selectCurrentPlanningApplicationRecords(records).map((record) => record.application.id).sort(),
    ['app-current', 'app-other-class'],
  )
})

test('les aplicacions de tutors diferents continuen separades', () => {
  const planningUnit = { id: 'up-tutoria', tutoringSpaceId: 'space-1' }
  const records = [
    { application: { id: 'app-a', classId: 'class-1', managerUid: 'teacher-a', updatedAt: '2026-10-01T10:00:00.000Z' }, planningUnit },
    { application: { id: 'app-b', classId: 'class-1', managerUid: 'teacher-b', updatedAt: '2026-10-01T11:00:00.000Z' }, planningUnit },
  ]

  assert.equal(selectCurrentPlanningApplicationRecords(records).length, 2)
})
