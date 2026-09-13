export const STUDENT_PROFILE_RELATION_SOURCE = 'student-profile-form'
export const STUDENT_PROFILE_MOMENT_SOURCE = 'student-profile-sync'

function relationKey(relation) {
  return [
    relation.classId,
    relation.sourceStudentId,
    relation.targetStudentId,
    relation.type,
  ].join('_')
}

export function buildStudentProfileFriendshipSnapshot({ responses = [], students = [], survey } = {}) {
  const classId = String(survey?.classId || '').trim()
  const surveyId = String(survey?.id || '').trim()
  const studentIds = new Set((students || []).map((student) => String(student?.id || '').trim()).filter(Boolean))
  const respondentIds = new Set()
  const nominations = new Set()
  let skippedCount = 0

  ;(responses || []).forEach((response) => {
    const sourceStudentId = String(response?.studentId || '').trim()
    if (!sourceStudentId || !studentIds.has(sourceStudentId)) {
      skippedCount += 1
      return
    }

    respondentIds.add(sourceStudentId)
    const selectedIds = Array.isArray(response?.answers?.classFriendIds)
      ? response.answers.classFriendIds
      : []

    selectedIds.forEach((value) => {
      const targetStudentId = String(value || '').trim()
      if (!targetStudentId || targetStudentId === sourceStudentId || !studentIds.has(targetStudentId)) {
        skippedCount += 1
        return
      }
      nominations.add(`${sourceStudentId}\u0000${targetStudentId}`)
    })
  })

  const sortedNominations = [...nominations].sort()
  const relationDrafts = sortedNominations.map((nomination) => {
    const [sourceStudentId, targetStudentId] = nomination.split('\u0000')
    return {
      classId,
      source: STUDENT_PROFILE_RELATION_SOURCE,
      sourceLabel: 'Fitxa inicial de tutoria',
      sourceStudentId,
      sourceSurveyId: surveyId,
      strength: 2,
      targetStudentId,
      type: 'friendship',
    }
  })
  const sortedStudentIds = [...studentIds].sort()
  const sortedRespondentIds = [...respondentIds].sort()

  return {
    relationDrafts,
    relationCount: relationDrafts.length,
    responseCount: sortedRespondentIds.length,
    signature: JSON.stringify({
      classId,
      nominations: sortedNominations,
      respondentIds: sortedRespondentIds,
      studentIds: sortedStudentIds,
      surveyId,
    }),
    skippedCount,
  }
}

export function reconcileStudentProfileFriendships({
  currentRelations = [],
  idFactory,
  now,
  relationDrafts = [],
  surveyId,
} = {}) {
  const cleanSurveyId = String(surveyId || '').trim()
  const ownedRelations = currentRelations.filter(
    (relation) =>
      relation.source === STUDENT_PROFILE_RELATION_SOURCE &&
      relation.sourceSurveyId === cleanSurveyId,
  )
  const ownedByKey = new Map(ownedRelations.map((relation) => [relationKey(relation), relation]))
  const nextRelations = currentRelations.filter(
    (relation) =>
      !(relation.source === STUDENT_PROFILE_RELATION_SOURCE && relation.sourceSurveyId === cleanSurveyId),
  )
  const nextByKey = new Map(nextRelations.map((relation, index) => [relationKey(relation), index]))
  const reusedIds = new Set()
  const snapshotRelations = []
  let createdCount = 0
  let skippedExistingCount = 0
  let updatedCount = 0

  relationDrafts.forEach((draft) => {
    const key = relationKey(draft)
    const existingIndex = nextByKey.get(key)
    if (existingIndex !== undefined) {
      snapshotRelations.push(nextRelations[existingIndex])
      skippedExistingCount += 1
      return
    }

    const ownedRelation = ownedByKey.get(key)
    const nextRelation = {
      ...(ownedRelation || {}),
      ...draft,
      createdAt: ownedRelation?.createdAt || now,
      id: ownedRelation?.id || idFactory(),
      importedAt: ownedRelation?.importedAt || now,
      updatedAt: now,
    }
    nextByKey.set(key, nextRelations.length)
    nextRelations.push(nextRelation)
    snapshotRelations.push(nextRelation)
    if (ownedRelation) {
      reusedIds.add(ownedRelation.id)
      updatedCount += 1
    } else {
      createdCount += 1
    }
  })

  return {
    createdCount,
    nextRelations,
    removedRelations: ownedRelations.filter((relation) => !reusedIds.has(relation.id)),
    skippedExistingCount,
    snapshotRelations,
    updatedCount,
  }
}

export function hasMatchingStudentProfileRelations({ currentRelations = [], relationDrafts = [], surveyId } = {}) {
  const cleanSurveyId = String(surveyId || '').trim()
  const nonOwnedKeys = new Set(
    currentRelations
      .filter(
        (relation) =>
          !(relation.source === STUDENT_PROFILE_RELATION_SOURCE && relation.sourceSurveyId === cleanSurveyId),
      )
      .map(relationKey),
  )
  const expectedOwnedKeys = new Set(
    relationDrafts.map(relationKey).filter((key) => !nonOwnedKeys.has(key)),
  )
  const actualOwnedKeys = new Set(
    currentRelations
      .filter(
        (relation) =>
          relation.source === STUDENT_PROFILE_RELATION_SOURCE &&
          relation.sourceSurveyId === cleanSurveyId,
      )
      .map(relationKey),
  )

  return (
    expectedOwnedKeys.size === actualOwnedKeys.size &&
    [...expectedOwnedKeys].every((key) => actualOwnedKeys.has(key))
  )
}
