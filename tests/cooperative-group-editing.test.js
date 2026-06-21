import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  canModifyCooperativeMember,
  createEmptyCooperativeGroup,
  removeEmptyCooperativeGroup,
  renameCooperativeGroup,
  toggleCooperativeGroupLock,
  toggleCooperativeStudentLock,
} from '../src/features/tutoring/cooperativeGroupEditingUtils.js'

const groups = [
  { id: 'group-1', locked: false, members: [{ student: { id: 'student-1' } }], name: 'Grup 1' },
  { id: 'group-2', locked: false, members: [], name: 'Grup 2' },
]

describe('edició estructural de grups cooperatius', () => {
  it('crea, reanomena i elimina només grups buits', () => {
    const created = createEmptyCooperativeGroup(groups, 4)
    assert.equal(created.length, 3)
    assert.equal(created[2].members.length, 0)

    const renamed = renameCooperativeGroup(created, 'group-2', 'Laboratori')
    assert.equal(renamed[1].name, 'Laboratori')

    assert.equal(removeEmptyCooperativeGroup(renamed, 'group-1').length, 3)
    assert.equal(removeEmptyCooperativeGroup(renamed, 'group-2').length, 2)
  })

  it('bloqueja grups i alumnes de manera reversible', () => {
    const lockedGroups = toggleCooperativeGroupLock(groups, 'group-1')
    assert.equal(lockedGroups[0].locked, true)
    assert.equal(toggleCooperativeGroupLock(lockedGroups, 'group-1')[0].locked, false)

    const lockedStudents = toggleCooperativeStudentLock([], 'student-1')
    assert.deepEqual(lockedStudents, ['student-1'])
    assert.deepEqual(toggleCooperativeStudentLock(lockedStudents, 'student-1'), [])
  })

  it('impedeix modificar membres bloquejats o dins d’un grup bloquejat', () => {
    assert.equal(
      canModifyCooperativeMember({ group: groups[0], lockedStudentIds: [], studentId: 'student-1' }),
      true,
    )
    assert.equal(
      canModifyCooperativeMember({
        group: { ...groups[0], locked: true },
        lockedStudentIds: [],
        studentId: 'student-1',
      }),
      false,
    )
    assert.equal(
      canModifyCooperativeMember({
        group: groups[0],
        lockedStudentIds: ['student-1'],
        studentId: 'student-1',
      }),
      false,
    )
  })
})
