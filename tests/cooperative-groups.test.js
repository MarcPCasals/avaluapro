import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createCooperativeSociometricHelpers } from '../src/features/tutoring/cooperativeGroupSociometricUtils.js'

const helpers = createCooperativeSociometricHelpers({
  getRelationInfluence: (relation) => Number(relation.strength) || 1,
  getRelationTypeMeta: (type) => ({
    shortLabel: type === 'positive' ? 'Positiva' : type === 'friendship' ? 'Afinitat' : 'Incompatibilitat',
  }),
})

function createProfile({
  averageScore = 2.7,
  id,
  name,
  notDevelopedCount = 0,
  notDevelopedPercent = 0,
}) {
  return {
    averageScore,
    evaluatedCount: 4,
    notDevelopedCount,
    notDevelopedPercent,
    student: { halfGroup: 'Grup A', id, name },
  }
}

function createMember({
  averageScore = 2.7,
  id,
  isInfluential = false,
  isSociometricVulnerable = false,
  isSupportiveReference = false,
  name,
  performanceLevel = 'mitjà',
  priorityScore = 0,
  sociometricCategory = 'Promig',
}) {
  return {
    isInfluential,
    isSociometricVulnerable,
    isSupportiveReference,
    performanceLevel,
    priorityScore,
    socialPositiveCount: 0,
    sociometricCategory,
    student: { id, name },
    tutorialProfile: { averageScore },
    workPositiveCount: 0,
  }
}

describe('anàlisi explicable de grups cooperatius', () => {
  it('redistribueix el grup sobrant perquè mai quedi un alumne sol', () => {
    const profiles = Array.from({ length: 9 }, (_, index) =>
      createProfile({
        averageScore: 1.8 + (index % 4) * 0.5,
        id: `student-${index + 1}`,
        name: `Alumne ${index + 1}`,
      }),
    )
    const groups = helpers.buildCooperativeGroups({
      groupSize: 4,
      prioritizeHalfGroups: true,
      profiles,
      recordRowsByStudent: new Map(),
      relationRowsByStudent: new Map(),
      relations: [],
      roleRowsByStudent: new Map(),
      sociometricRowsByStudentId: new Map(),
      strategy: 'balanced',
    })

    assert.equal(
      groups.reduce((total, group) => total + group.members.length, 0),
      9,
    )
    assert.ok(groups.every((group) => group.members.length !== 1))
  })

  it('tradueix el perfil calculat a etiquetes pedagògiques', () => {
    const result = helpers.buildStudentCooperativeProfile({
      profile: createProfile({
        averageScore: 1.8,
        id: 'student-1',
        name: 'Alumna Prioritària',
        notDevelopedCount: 2,
        notDevelopedPercent: 40,
      }),
      recordRow: { incident: 1 },
      relationRow: { socialPositiveCount: 0, supportiveCount: 0, total: 0, workPositiveCount: 0 },
      roleRow: {},
      sociometricRow: { category: 'Aïllat' },
    })

    assert.equal(result.performanceLevel, 'baix')
    assert.ok(result.pedagogicalLabels.some((label) => label.label === 'Necessita reforç'))
    assert.ok(result.pedagogicalLabels.some((label) => label.label === 'Seguiment prioritari'))
    assert.ok(result.pedagogicalLabels.some((label) => label.label === 'Vulnerabilitat relacional'))
  })

  it('resumeix la composició i identifica un grup sòlid amb suport', () => {
    const groups = helpers.enrichCooperativeGroups(
      [
        {
          id: 'group-1',
          members: [
            createMember({
              averageScore: 3.6,
              id: 'student-1',
              isSupportiveReference: true,
              name: 'Alumna Referent',
              performanceLevel: 'alt',
            }),
            createMember({
              averageScore: 1.8,
              id: 'student-2',
              isSociometricVulnerable: true,
              name: 'Alumne amb suport',
              performanceLevel: 'baix',
              priorityScore: 5,
            }),
          ],
          name: 'Grup 1',
          targetGroupSize: 2,
        },
      ],
      [
        {
          sourceStudentId: 'student-1',
          strength: 2,
          targetStudentId: 'student-2',
          type: 'positive',
        },
      ],
    )

    assert.equal(groups[0].analysis.quality.label, 'Sòlid')
    assert.equal(groups[0].analysis.composition.highPerformanceCount, 1)
    assert.equal(groups[0].analysis.composition.lowPerformanceCount, 1)
    assert.match(groups[0].analysis.summary, /rendiment alt/)
    assert.ok(groups[0].analysis.strengths.some((strength) => strength.includes('combina rendiment alt')))
  })

  it('marca com a crític un grup amb incompatibilitat i alumnat sense suport', () => {
    const groups = helpers.enrichCooperativeGroups(
      [
        {
          id: 'group-1',
          members: [
            createMember({
              id: 'student-1',
              isSociometricVulnerable: true,
              name: 'Alumna Aïllada',
              priorityScore: 5,
              sociometricCategory: 'Aïllat',
            }),
            createMember({ id: 'student-2', name: 'Alumne Incompatible' }),
          ],
          name: 'Grup 1',
          targetGroupSize: 2,
        },
      ],
      [
        {
          sourceStudentId: 'student-1',
          strength: 2,
          targetStudentId: 'student-2',
          type: 'avoid',
        },
      ],
    )
    const analysis = helpers.analyzeCooperativeGroupSet(groups, {
      groupSize: 2,
      strategy: 'supportive',
    })

    assert.equal(groups[0].analysis.quality.label, 'Crític')
    assert.equal(analysis.criticalGroupCount, 1)
    assert.equal(analysis.incompatibilityCount, 1)
    assert.equal(analysis.unsupportedStudentCount, 2)
    assert.match(analysis.summary, /necessita canvis/)
  })

  it('explica el criteri i la limitació dels mig grups', () => {
    const analysis = helpers.analyzeCooperativeGroupSet([], {
      groupSize: 4,
      prioritizeHalfGroups: true,
      strategy: 'balanced',
    })

    assert.equal(analysis.methodology.strategyLabel, 'Equilibri general')
    assert.equal(analysis.methodology.groupSize, 4)
    assert.equal(analysis.methodology.halfGroups, 'Prioritzats')
    assert.ok(analysis.limitations.some((limitation) => limitation.includes('mig grup')))
  })

  it('intercanvia dos alumnes sense alterar la mida dels grups', () => {
    const groups = helpers.enrichCooperativeGroups(
      [
        {
          id: 'group-1',
          members: [
            createMember({ id: 'student-1', name: 'Alumna 1' }),
            createMember({ id: 'student-2', name: 'Alumne 2' }),
          ],
          name: 'Grup 1',
          targetGroupSize: 2,
        },
        {
          id: 'group-2',
          members: [
            createMember({ id: 'student-3', name: 'Alumna 3' }),
            createMember({ id: 'student-4', name: 'Alumne 4' }),
          ],
          name: 'Grup 2',
          targetGroupSize: 2,
        },
      ],
      [],
    )

    const swapped = helpers.swapCooperativeMembers(groups, 'student-1', 'student-3', [])

    assert.deepEqual(
      swapped[0].members.map((member) => member.student.id),
      ['student-3', 'student-2'],
    )
    assert.deepEqual(
      swapped[1].members.map((member) => member.student.id),
      ['student-1', 'student-4'],
    )
    assert.deepEqual(
      swapped.map((group) => group.members.length),
      [2, 2],
    )
  })

  it('aplica el format de nom compacte als conflictes de disposició', () => {
    const seatingHelpers = createCooperativeSociometricHelpers({
      formatSeatingStudentName: (name) => `Curt:${name.split(' ')[0]}`,
      getRelationInfluence: (relation) => Number(relation.strength) || 1,
      getRelationTypeMeta: () => ({ shortLabel: 'Incompatibilitat' }),
    })
    const createPlacement = (id, name, x) => ({
      seat: { x, y: 0 },
      student: {
        isSociometricVulnerable: false,
        priorityScore: 0,
        sociometricCategory: 'Promig',
        student: { id, name },
      },
      studentId: id,
    })
    const analysis = seatingHelpers.analyzeTutorialSeatingPlan({
      getSeatDistance: (left, right) => Math.abs(left.x - right.x) + Math.abs(left.y - right.y),
      plan: {
        placements: [
          createPlacement('student-1', 'Nom Primer', 0),
          createPlacement('student-2', 'Nom Segon', 1),
        ],
        rows: 5,
      },
      relations: [
        {
          sourceStudentId: 'student-1',
          strength: 2,
          targetStudentId: 'student-2',
          type: 'avoid',
        },
      ],
    })

    assert.match(analysis.conflicts[0].text, /Curt:Nom/)
    assert.doesNotMatch(analysis.conflicts[0].text, /Primer|Segon/)
  })
})
