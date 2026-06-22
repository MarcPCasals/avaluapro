import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildSociometricStudentReportsFromRelations } from '../src/features/tutoring/sociometricStudentProfileUtils.js'

const students = ['A', 'B', 'C', 'D', 'E', 'F'].map((name) => ({ id: name, name }))

function relation(sourceStudentId, targetStudentId, type) {
  return {
    source: 'sociometric-public-form',
    sourceStudentId,
    targetStudentId,
    type,
  }
}

describe('classificacio dels perfils sociometrics', () => {
  it('separa un perfil polaritzat d un perfil clarament rebutjat', () => {
    const reports = buildSociometricStudentReportsFromRelations({
      students,
      relations: [
        relation('C', 'A', 'friendship'),
        relation('D', 'A', 'friendship'),
        relation('E', 'A', 'friendship'),
        relation('C', 'D', 'friendship'),
        relation('C', 'E', 'friendship'),
        relation('D', 'E', 'friendship'),
        relation('C', 'A', 'avoid'),
        relation('D', 'A', 'avoid'),
        relation('E', 'A', 'avoid'),
        relation('C', 'B', 'avoid'),
        relation('D', 'B', 'avoid'),
        relation('E', 'B', 'avoid'),
      ],
    })

    const byId = new Map(reports.map((report) => [report.student.id, report]))

    assert.equal(byId.get('A').category, 'Controvertit')
    assert.equal(byId.get('A').categoryMeta.tone, 'orange')
    assert.equal(byId.get('B').category, 'Rebutjat')
    assert.equal(byId.get('B').categoryMeta.tone, 'red')
  })
})
