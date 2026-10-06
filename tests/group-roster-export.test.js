import assert from 'node:assert/strict'
import test from 'node:test'
import { buildGroupRosterHtml, halfGroupRoster, openGroupRosterExport } from '../src/features/tutoring/groupRosterExport.js'

const photo = 'data:image/png;base64,iVBORw0KGgo='
const students = [{ id: 'fictici-1', name: 'Alumne fictici 1', photoUrl: photo, gender: 'SECRET_GENDER', notes: 'SECRET_NOTE', halfGroup: 'Grup A', halfGroupLocked: true }, { id: 'fictici-2', name: 'Alumne fictici 2', halfGroup: 'Grup B' }]

test('export includes current displayed proposal and photos, excludes all private fields', () => {
  const assignments = { 'fictici-1': 'Grup B', 'fictici-2': 'Grup A' }
  const groups = halfGroupRoster(students, assignments)
  assert.equal(groups[0].students[0].name, students[1].name)
  const html = buildGroupRosterHtml(groups.map((group) => ({ ...group, relations: 'SECRET_RELATION', analysis: 'SECRET_ANALYSIS' })))
  for (const value of ['SECRET_GENDER', 'SECRET_NOTE', 'SECRET_RELATION', 'SECRET_ANALYSIS', 'halfGroupLocked', 'fictici-1']) assert.equal(html.includes(value), false)
  assert.equal(html.includes(photo), true)
  assert.equal((html.match(/<img /g) || []).length, 1)
  assert.equal(html.includes(students[1].name), true)
  assert.equal(students[0].halfGroup, 'Grup A')
})

test('names and titles are escaped, unsafe image sources cannot inject markup', () => {
  const html = buildGroupRosterHtml([{ name: '<script>secret()</script>', students: [{ name: '<b>Fictici</b>', photoUrl: 'javascript:alert(1)' }, { name: 'Foto', photoUrl: 'https://example.test/photo?x=" onerror="alert(1)' }] }], { title: '<img>', className: 'A & B' })
  assert.ok(html.includes('&lt;b&gt;Fictici&lt;/b&gt;'))
  assert.ok(html.includes('A &amp; B'))
  assert.ok(html.includes('&quot; onerror=&quot;'))
  assert.equal(html.includes('<script>'), false)
  assert.equal(html.includes('javascript:'), false)
})

test('blocked popup gives actionable feedback', () => {
  globalThis.window = { open: () => null }
  try { assert.throws(() => openGroupRosterExport([]), /Permet obrir/) } finally { delete globalThis.window }
})

test('printing waits for photos and reports a failed image without losing the name', async () => {
  let ready
  let printed = false
  let fallback
  let markup
  const button = {}
  const output = {
    focus() {},
    print() { printed = true },
    document: {
      open() {}, close() {},
      write(html) { markup = html },
      getElementById() { return button },
      createElement() { return {} },
      images: [
        { decode: () => new Promise((resolve) => { ready = resolve }) },
        { decode: async () => { throw new Error('Unavailable') }, replaceWith(value) { fallback = value } },
      ],
    },
  }
  globalThis.window = { open: () => output }
  try {
    openGroupRosterExport(halfGroupRoster(students, Object.fromEntries(students.map((student) => [student.id, student.halfGroup]))))
    const printing = button.onclick()
    assert.equal(printed, false)
    assert.equal(button.disabled, true)
    ready()
    await printing
    assert.equal(printed, true)
    assert.equal(button.disabled, false)
    assert.equal(fallback.textContent, 'Foto no disponible')
    assert.ok(markup.includes(students[0].name))
    assert.equal(output.opener, null)
  } finally { delete globalThis.window }
})
