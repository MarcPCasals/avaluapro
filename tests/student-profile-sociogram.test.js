import assert from 'node:assert/strict'
import test from 'node:test'
import {
  STUDENT_PROFILE_RELATION_SOURCE,
  buildStudentProfileFriendshipSnapshot,
  hasMatchingStudentProfileRelations,
  reconcileStudentProfileFriendships,
} from '../src/features/tutoring/studentProfileSociogram.js'

const survey = { classId: 'class-1', id: 'profile-1' }
const students = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

test('converteix les amistats de la classe en eleccions sociomètriques dirigides', () => {
  const result = buildStudentProfileFriendshipSnapshot({
    responses: [
      { answers: { classFriendIds: ['b', 'c'] }, studentId: 'a' },
      { answers: { classFriendIds: ['a'] }, studentId: 'b' },
    ],
    students,
    survey,
  })

  assert.equal(result.responseCount, 2)
  assert.equal(result.relationCount, 3)
  assert.deepEqual(
    result.relationDrafts.map((relation) => [relation.sourceStudentId, relation.targetStudentId]),
    [['a', 'b'], ['a', 'c'], ['b', 'a']],
  )
  assert.ok(result.relationDrafts.every((relation) => relation.type === 'friendship'))
  assert.ok(result.relationDrafts.every((relation) => relation.sourceSurveyId === survey.id))
})

test('ignora duplicats, autorelacions i alumnes que no pertanyen a la classe', () => {
  const result = buildStudentProfileFriendshipSnapshot({
    responses: [
      { answers: { classFriendIds: ['a', 'b', 'b', 'outside'] }, studentId: 'a' },
      { answers: { classFriendIds: ['a'] }, studentId: 'outside' },
    ],
    students,
    survey,
  })

  assert.equal(result.responseCount, 1)
  assert.equal(result.relationCount, 1)
  assert.equal(result.skippedCount, 3)
  assert.equal(result.relationDrafts[0].targetStudentId, 'b')
})

test('la signatura és estable encara que Firestore retorni les respostes en un altre ordre', () => {
  const first = buildStudentProfileFriendshipSnapshot({
    responses: [
      { answers: { classFriendIds: ['c', 'b'] }, studentId: 'a' },
      { answers: { classFriendIds: [] }, studentId: 'b' },
    ],
    students,
    survey,
  })
  const second = buildStudentProfileFriendshipSnapshot({
    responses: [
      { answers: { classFriendIds: [] }, studentId: 'b' },
      { answers: { classFriendIds: ['b', 'c'] }, studentId: 'a' },
    ],
    students: [...students].reverse(),
    survey,
  })

  assert.equal(first.signature, second.signature)
})

test('actualitza només els vincles del mateix formulari i conserva els manuals', () => {
  const currentRelations = [
    {
      classId: 'class-1', id: 'old-kept', source: STUDENT_PROFILE_RELATION_SOURCE,
      sourceStudentId: 'a', sourceSurveyId: 'profile-1', targetStudentId: 'b', type: 'friendship',
    },
    {
      classId: 'class-1', id: 'old-removed', source: STUDENT_PROFILE_RELATION_SOURCE,
      sourceStudentId: 'a', sourceSurveyId: 'profile-1', targetStudentId: 'c', type: 'friendship',
    },
    {
      classId: 'class-1', id: 'manual', source: 'manual',
      sourceStudentId: 'b', targetStudentId: 'c', type: 'friendship',
    },
    {
      classId: 'class-1', id: 'other-survey', source: STUDENT_PROFILE_RELATION_SOURCE,
      sourceStudentId: 'c', sourceSurveyId: 'profile-2', targetStudentId: 'a', type: 'friendship',
    },
  ]
  const relationDrafts = buildStudentProfileFriendshipSnapshot({
    responses: [
      { answers: { classFriendIds: ['b'] }, studentId: 'a' },
      { answers: { classFriendIds: ['c'] }, studentId: 'b' },
    ],
    students,
    survey,
  }).relationDrafts
  const result = reconcileStudentProfileFriendships({
    currentRelations,
    idFactory: () => 'new-id',
    now: '2026-09-13T10:00:00.000Z',
    relationDrafts,
    surveyId: survey.id,
  })

  assert.ok(result.nextRelations.some((relation) => relation.id === 'old-kept'))
  assert.ok(result.nextRelations.some((relation) => relation.id === 'manual'))
  assert.ok(result.nextRelations.some((relation) => relation.id === 'other-survey'))
  assert.deepEqual(result.removedRelations.map((relation) => relation.id), ['old-removed'])
  assert.equal(result.skippedExistingCount, 1)
  assert.equal(result.snapshotRelations.length, 2)
  assert.equal(
    hasMatchingStudentProfileRelations({ currentRelations: result.nextRelations, relationDrafts, surveyId: survey.id }),
    true,
  )
})

test('una llista buida elimina els vincles anteriors quan esborrem una resposta', () => {
  const currentRelations = [{
    classId: 'class-1', id: 'old', source: STUDENT_PROFILE_RELATION_SOURCE,
    sourceStudentId: 'a', sourceSurveyId: 'profile-1', targetStudentId: 'b', type: 'friendship',
  }]
  const result = reconcileStudentProfileFriendships({
    currentRelations,
    idFactory: () => 'unused',
    now: '2026-09-13T10:00:00.000Z',
    relationDrafts: [],
    surveyId: survey.id,
  })

  assert.deepEqual(result.nextRelations, [])
  assert.deepEqual(result.removedRelations.map((relation) => relation.id), ['old'])
})
