import assert from 'node:assert/strict'
import test from 'node:test'
import { buildStudentOverviewSnapshot, studentOverviewShareAccess, buildStudentOverviewShareUrl } from '../src/lib/studentOverviewSharing.js'
const row = {
  student: { id: 's1', name: 'Alumne fictici', photo: 'private-photo', classId: 'c1', personalNotes: 'Fictici' },
  profile: { evaluation: { grade: 'B' }, tracking: { consistency: 70 }, student: { secret: 'private' } },
  records: [{ id: 'r1', date: '2026-10-08', type: 'agreement', note: 'Acord fictici', ownerUid: 'private' }],
  trackingNotes: [{ id: 'n1', text: 'Nota fictícia', date: '2026-10-08', type: 'tracking', privateAccount: 'secret' }],
}
const input = { activeClass: { name: 'Grup fictici', ownerUid: 'private' }, rows: [row], showTutoringColumns: true }
test('comparteix només dades visibles i els detalls, sense fotos, compte ni fonts externes', () => {
  const original = structuredClone(input)
  const snapshot = buildStudentOverviewSnapshot(input)
  assert.equal(snapshot.rows[0].student.name, 'Alumne fictici')
  assert.equal(snapshot.rows[0].records[0].note, 'Acord fictici')
  assert.equal(snapshot.rows[0].trackingNotes[0].text, 'Nota fictícia')
  assert.doesNotMatch(JSON.stringify(snapshot), /private|secret|ownerUid|photo/)
  assert.deepEqual(input, original)
  const ordinary = buildStudentOverviewSnapshot({ ...input, showTutoringColumns: false })
  assert.equal('records' in ordinary.rows[0], false)
  assert.throws(() => buildStudentOverviewSnapshot({ ...input, rows: Array(101).fill(row) }))
})
test('normalitza correus, exigeix caducitat futura i forma un enllaç independent', () => {
  const access = studentOverviewShareAccess('DIRECTION@educand.ad; direction@educand.ad, second@educand.ad', '2026-10-08', Date.parse('2026-10-08T10:00:00Z'))
  assert.deepEqual(access.authorizedEmails, ['direction@educand.ad', 'second@educand.ad'])
  assert.equal(new Date(access.expiresAtEpochMs).toISOString(), '2026-10-08T22:00:00.000Z')
  for (const [emails, date] of [['', '2026-10-08'], ['wrong', '2026-10-08'], ['direction@educand.ad', ''], ['direction@educand.ad', '2020-01-01']]) assert.throws(() => studentOverviewShareAccess(emails, date))
  assert.equal(buildStudentOverviewShareUrl('opaque-id', 'https://avaluapro.web.app'), 'https://avaluapro.web.app/?students-view=opaque-id')
})
