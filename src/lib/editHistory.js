import { createEditHistoryBudget } from './editHistoryBudget.js'
// Historial de la sessió: conserva només els documents modificats, mai tot el compte.
export const EDIT_HISTORY_REFRESH_EVENT = 'avaluapro:edit-history-refresh'
const LIMIT = 20
const clone = (value) => value == null ? null : structuredClone(value)
function comparable(value) {
  if (!value) return null
  const { updatedAt: _updatedAt, ...rest } = value
  void _updatedAt
  return rest
}
export const historyValuesEqual = (a, b) => JSON.stringify(comparable(a)) === JSON.stringify(comparable(b))

export function createEditHistory({ budget = createEditHistoryBudget() } = {}) {
  const listeners = new Set()
  let past = [], future = [], active = null, running = 0, replaying = false, recording = true
  let snapshot = { canUndo: false, canRedo: false, busy: false, error: '', undoLabel: '', redoLabel: '' }
  function publish(error = '') {
    const allowance = budget?.check() || { allowed: true, retryAt: 0, message: '' }
    snapshot = { canUndo: past.length > 0 && !running && !replaying && allowance.allowed, canRedo: future.length > 0 && !running && !replaying && allowance.allowed,
      busy: Boolean(running || replaying), error, limitMessage: allowance.message, retryAt: allowance.retryAt, undoLabel: past.at(-1)?.label || '', redoLabel: future.at(-1)?.label || '' }
    listeners.forEach(listener => listener())
  }
  function record(adapter, key, before, after, metadata) {
    if (!active || !recording || replaying || historyValuesEqual(before, after)) return
    const id = `${adapter.id}:${key}`
    const previous = active.changes.get(id)
    active.changes.set(id, { adapter, key, before: previous ? previous.before : clone(before), after: clone(after), expected: clone(after), metadata })
  }
  async function run(label, action) {
    if (replaying) throw new Error('Espera que acabi de desfer o refer el canvi.')
    if (!active) { active = { label, changes: new Map() }; recording = true }
    running += 1
    publish()
    try { return await action() } finally {
      running -= 1
      if (!running) {
        const changes = [...active.changes.values()].filter(change => !historyValuesEqual(change.before, change.after))
        if (changes.length) { past.push({ label: active.label, changes }); past = past.slice(-LIMIT); future = [] }
        active = null
      }
      publish()
    }
  }
  async function replay(direction) {
    if (running || replaying) return false
    const source = direction === 'undo' ? past : future
    const target = direction === 'undo' ? future : past
    const entry = source.at(-1)
    if (!entry) return false
    const allowance = budget?.consume(entry.changes.length)
    if (allowance && !allowance.allowed) { publish(allowance.message); return false }
    replaying = true
    publish()
    const completed = []
    try {
      const groups = new Map()
      for (const change of entry.changes) {
        if (!groups.has(change.adapter)) groups.set(change.adapter, [])
        groups.get(change.adapter).push(change)
      }
      // Comprova tots els documents abans d'escriure: un canvi extern no es trepitja.
      for (const [adapter, changes] of groups) {
        const values = await adapter.readMany(changes)
        if (changes.some((change, index) => !historyValuesEqual(values[index], change.expected))) {
          throw new Error('Aquestes dades han canviat després. No s’ha desfet ni refet el canvi per evitar sobreescriure-les.')
        }
      }
      for (const [adapter, changes] of groups) {
        const previousValues = changes.map(change => clone(change.expected))
        await adapter.writeMany(changes, direction === 'undo' ? 'before' : 'after')
        completed.push({ adapter, changes, previousValues })
        const values = await adapter.readMany(changes)
        changes.forEach((change, index) => { change.expected = clone(values[index]) })
      }
      source.pop(); target.push(entry)
      for (const adapter of groups.keys()) {
        try { await adapter.refresh?.() } catch { /* La còpia local i la cua ja estan desades. */ }
      }
      globalThis.dispatchEvent?.(new CustomEvent(EDIT_HISTORY_REFRESH_EVENT, { detail: { planning: [...groups.keys()].some(adapter => adapter.id.startsWith('planning:')) } }))
      return true
    } catch (error) {
      // Els blocs que ja s'han desat es compensen si falla una altra base local.
      try {
        for (const { adapter, changes, previousValues } of completed.reverse()) {
          const current = await adapter.readMany(changes)
          await adapter.writeMany(changes.map((change, index) => ({ ...change, expected: current[index], rollback: previousValues[index] })), 'rollback')
          const restored = await adapter.readMany(changes)
          changes.forEach((change, index) => { change.expected = clone(restored[index]) })
        }
      } catch {
        past = []; future = []
        publish('No s’ha pogut completar la recuperació. Revisa les dades i l’estat de sincronització abans de continuar.')
        return false
      }
      publish(error.message || 'No s’ha pogut recuperar el canvi.')
      return false
    }
    finally { replaying = false; publish(snapshot.error) }
  }
  return { record, run, refreshLimits: () => publish(), undo: () => replay('undo'), redo: () => replay('redo'),
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
    getSnapshot: () => snapshot,
    clear: () => { past = []; future = []; if (active) active.changes.clear(); recording = false; active = running ? active : null; publish() },
  }
}
export const editHistory = createEditHistory()
