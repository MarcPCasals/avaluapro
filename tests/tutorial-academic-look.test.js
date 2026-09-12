import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getNumericFromGrade } from '../src/lib/grades.js'
import {
  buildAntecedentAcademicRows,
  resolveEffectiveTutorialAcademicProfile,
} from '../src/features/tutoring/tutorialAcademicLookUtils.js'

const subjectOptions = [
  {
    areaId: 'linguistic',
    areaName: 'Àmbit lingüístic',
    subject: 'Català',
  },
]

function buildCompetencies() {
  return [
    { competencyIndex: 0, key: 'Català__c1', name: 'C1 Comunicació oral' },
    { competencyIndex: 1, key: 'Català__c2', name: 'C2 Comprensió lectora' },
  ]
}

function isNotDeveloped(grade) {
  return grade === 'D' || grade === 'NA'
}

function isSameCompetencyName(a, b) {
  return String(a).toLocaleLowerCase('ca') === String(b).toLocaleLowerCase('ca')
}

describe('mirada acadèmica efectiva de tutoria', () => {
  it('manté les dades actuals per davant dels antecedents', () => {
    const result = resolveEffectiveTutorialAcademicProfile({
      antecedent: {
        competencyGrades: { 'C1 Comunicació oral': 'D' },
        lastLookGrade: 'D',
        profile: 'priority',
      },
      buildCompetencies,
      currentRows: [
        {
          areaId: 'linguistic',
          areaName: 'Àmbit lingüístic',
          competencyName: 'C1 Comunicació oral',
          grade: 'B',
          notDeveloped: false,
          score: 3,
          sourceLabel: 'UT1',
          sourceOrder: 1,
          subject: 'Català',
        },
      ],
      getNumericFromGrade,
      isNotDeveloped,
      isSameCompetencyName,
      preferredSubject: 'Català',
      subjectOptions,
    })

    assert.equal(result.academicSource, 'current')
    assert.equal(result.hasCurrentAcademicData, true)
    assert.equal(result.evaluatedCompetencies[0].grade, 'B')
  })

  it('usa antecedents per competències quan no hi ha notes actuals', () => {
    const rows = buildAntecedentAcademicRows({
      antecedent: {
        competencyGrades: {
          'C1 Comunicació oral': 'D',
          'C2 Comprensió lectora': 'C',
        },
        courseLabel: '2025-2026',
        profile: 'invisible',
      },
      buildCompetencies,
      getNumericFromGrade,
      isNotDeveloped,
      isSameCompetencyName,
      preferredSubject: 'Català',
      subjectOptions,
    })

    assert.equal(rows.length, 2)
    assert.deepEqual(
      rows.map((row) => row.grade),
      ['D', 'C'],
    )
    assert.equal(rows[0].sourceLabel, 'Antecedents · 2025-2026')
  })

  it('usa la nota global d’antecedents com a últim recurs', () => {
    const result = resolveEffectiveTutorialAcademicProfile({
      antecedent: {
        lastLookGrade: 'D',
        profile: 'priority',
      },
      buildCompetencies,
      currentRows: [],
      getNumericFromGrade,
      isNotDeveloped,
      isSameCompetencyName,
      preferredSubject: 'Català',
      subjectOptions,
    })

    assert.equal(result.academicSource, 'antecedent-global')
    assert.equal(result.evaluatedCompetencies.length, 1)
    assert.equal(result.evaluatedCompetencies[0].grade, 'D')
    assert.equal(result.antecedentProfileMeta.priorityBoost, 3)
  })
})
