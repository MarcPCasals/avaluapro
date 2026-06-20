import { getSociometricRuntimeMeta } from './sociometricStudentProfileUtils'

function average(values) {
  const cleanValues = values.filter((value) => Number.isFinite(value) && value > 0)
  if (cleanValues.length === 0) return 0
  return cleanValues.reduce((total, value) => total + value, 0) / cleanValues.length
}

export function createCooperativeSociometricHelpers({ getRelationInfluence, getRelationTypeMeta }) {
  function buildStudentCooperativeProfile({ profile, recordRow, relationRow, roleRow, sociometricRow }) {
    const recordSeverity =
      (recordRow?.agenda || 0) +
      (recordRow?.incident || 0) * 2 +
      (recordRow?.classroomExpulsion || 0) * 3 +
      (recordRow?.centerExpulsion || 0) * 4
    const academicRisk =
      profile.evaluatedCount > 0 && (profile.averageScore <= 2 || profile.notDevelopedPercent >= 30)
    const priorityScore =
      profile.notDevelopedCount * 2 +
      (profile.notDevelopedPercent >= 30 ? 2 : 0) +
      (profile.averageScore > 0 && profile.averageScore <= 2 ? 2 : 0) +
      recordSeverity
    const performanceLevel =
      profile.averageScore >= 3.25
        ? 'alt'
        : profile.averageScore > 0 && profile.averageScore <= 2
          ? 'baix'
          : 'mitjà'
    const runtimeMeta = getSociometricRuntimeMeta({
      academicRisk,
      isStar: Boolean(roleRow?.star),
      priorityScore,
      socialPositiveCount: relationRow?.socialPositiveCount || 0,
      sociometricCategory: sociometricRow?.category || 'Promig',
      workPositiveCount: relationRow?.workPositiveCount || 0,
    })

    return {
      academicRisk,
      avoidCount: relationRow?.avoidCount || 0,
      halfGroup: profile.student.halfGroup || 'Sense mig grup',
      isConflict: Boolean(roleRow?.conflict),
      isStar: Boolean(roleRow?.star),
      ...runtimeMeta,
      performanceLevel,
      priorityScore,
      recordSeverity,
      relationCount: relationRow?.total || 0,
      socialPositiveCount: relationRow?.socialPositiveCount || 0,
      sociometricCategory: sociometricRow?.category || 'Promig',
      student: profile.student,
      supportiveCount: relationRow?.supportiveCount || 0,
      tutorialProfile: profile,
      workPositiveCount: relationRow?.workPositiveCount || 0,
    }
  }

  function relationBetween(relations, studentIdA, studentIdB) {
    return relations.find(
      (relation) =>
        (relation.sourceStudentId === studentIdA && relation.targetStudentId === studentIdB) ||
        (relation.sourceStudentId === studentIdB && relation.targetStudentId === studentIdA),
    )
  }

  function getRelationsBetween(relations, studentIdA, studentIdB) {
    return relations.filter(
      (relation) =>
        (relation.sourceStudentId === studentIdA && relation.targetStudentId === studentIdB) ||
        (relation.sourceStudentId === studentIdB && relation.targetStudentId === studentIdA),
    )
  }

  function summarizeCooperativePair(relations, studentIdA, studentIdB) {
    const pairRelations = getRelationsBetween(relations, studentIdA, studentIdB)
    const summary = {
      avoidInfluence: 0,
      hasAvoid: false,
      notes: [],
      socialInfluence: 0,
      supportiveInfluence: 0,
      workInfluence: 0,
    }

    pairRelations.forEach((relation) => {
      const influence = getRelationInfluence(relation)
      if (relation.type === 'avoid') {
        summary.avoidInfluence += influence
        summary.hasAvoid = true
      }
      if (relation.type === 'friendship') {
        summary.socialInfluence += influence
        summary.supportiveInfluence += influence
      }
      if (relation.type === 'positive') {
        summary.workInfluence += influence
        summary.supportiveInfluence += influence
      }
      if (relation.note) summary.notes.push(relation.note)
    })

    return summary
  }

  function isVulnerableSeatingProfile(profile) {
    if (!profile) return false
    return Boolean(profile.isSociometricVulnerable)
  }

  function isSupportiveSeatingProfile(profile) {
    if (!profile) return false
    return Boolean(profile.isSupportiveReference)
  }

  function isInfluentialSeatingProfile(profile) {
    if (!profile) return false
    return Boolean(profile.isInfluential)
  }

  function getTeacherZoneLabel(seat, rows) {
    if (!seat) return 'centre'
    const frontBand = Math.max(1, Math.ceil(rows / 3) - 1)
    const backStart = Math.max(frontBand + 1, rows - 2)
    if (seat.y <= frontBand) return 'davant'
    if (seat.y >= backStart) return 'darrere'
    return 'centre'
  }

  function getCooperativePlacementScore({ candidate, group, groupSize, prioritizeHalfGroups, relations, strategy }) {
    const normalizedStrategy = strategy === 'calm' ? 'work' : strategy
    if (group.members.length >= groupSize) return Number.POSITIVE_INFINITY
    if (candidate.isConflict && group.members.some((member) => member.isConflict)) return Number.POSITIVE_INFINITY
    if (
      prioritizeHalfGroups &&
      group.members.some((member) => member.halfGroup && member.halfGroup !== candidate.halfGroup)
    ) {
      return Number.POSITIVE_INFINITY
    }

    let score = group.members.length * 8
    const nextMembers = [...group.members, candidate]
    const averagePerformance =
      nextMembers.reduce((total, member) => total + (member.tutorialProfile.averageScore || 2.5), 0) / nextMembers.length
    score += Math.abs(averagePerformance - 2.7) * 10

    const riskCount = group.members.filter((member) => member.priorityScore >= 4).length
    if (candidate.priorityScore >= 4) score += riskCount * 18

    const sameHalfGroupCount = group.members.filter((member) => member.halfGroup === candidate.halfGroup).length
    const differentHalfGroupCount = group.members.filter((member) => member.halfGroup !== candidate.halfGroup).length
    if (prioritizeHalfGroups) {
      score += differentHalfGroupCount * 28
      score -= sameHalfGroupCount * 8
    } else {
      score += sameHalfGroupCount * 2
    }

    group.members.forEach((member) => {
      const pairSummary = summarizeCooperativePair(relations, candidate.student.id, member.student.id)
      if (pairSummary.hasAvoid) {
        score += (normalizedStrategy === 'work' ? 110 : normalizedStrategy === 'supportive' ? 95 : 90) * pairSummary.avoidInfluence
      }
      if (pairSummary.workInfluence > 0) {
        score -= (normalizedStrategy === 'work' ? 26 : normalizedStrategy === 'supportive' ? 18 : 14) * pairSummary.workInfluence
      }
      if (pairSummary.socialInfluence > 0) {
        score -= (normalizedStrategy === 'supportive' ? 14 : normalizedStrategy === 'balanced' ? 8 : 4) * pairSummary.socialInfluence
      }
    })

    const hasAcademicRisk = group.members.some((member) => member.academicRisk)
    const hasStarPeer = group.members.some((member) => member.isStar)
    if (candidate.academicRisk && hasStarPeer) score -= normalizedStrategy === 'supportive' ? 34 : 22
    if (candidate.isStar && hasAcademicRisk) score -= normalizedStrategy === 'supportive' ? 34 : 22

    if (normalizedStrategy === 'work') {
      score -= candidate.workPositiveCount * 5
      score += candidate.avoidCount * 2
      if (candidate.socialPositiveCount > candidate.workPositiveCount) score += 4
    }

    if (normalizedStrategy === 'supportive' && candidate.academicRisk) {
      const hasStrongPeer = group.members.some((member) => member.performanceLevel === 'alt' && member.priorityScore <= 2)
      score += hasStrongPeer ? -16 : 8
    }

    if (normalizedStrategy === 'supportive' && ['Aïllat', 'Rebutjat'].includes(candidate.sociometricCategory)) {
      const hasSafeBridge = group.members.some(
        (member) => member.workPositiveCount > 0 || member.socialPositiveCount > 0 || member.isStar,
      )
      score += hasSafeBridge ? -22 : 12
    }

    if (normalizedStrategy === 'balanced') {
      score -= Math.min(18, candidate.supportiveCount * 2)
    }

    return score
  }

  function enrichCooperativeGroups(groups, relations) {
    return groups.map((group) => {
      const avoidRelations = []
      const socialRelations = []
      const supportiveRelations = []
      const workRelations = []
      group.members.forEach((member, memberIndex) => {
        group.members.slice(memberIndex + 1).forEach((otherMember) => {
          const pairRelations = getRelationsBetween(relations, member.student.id, otherMember.student.id)
          pairRelations.forEach((relation) => {
            const typeMeta = getRelationTypeMeta(relation.type)
            const row = {
              label: `${member.student.name} / ${otherMember.student.name}`,
              note: relation.note,
              type: relation.type,
              typeMeta,
            }
            if (relation.type === 'avoid') avoidRelations.push(row)
            if (relation.type === 'positive' || relation.type === 'friendship') supportiveRelations.push(row)
            if (relation.type === 'positive') workRelations.push(row)
            if (relation.type === 'friendship') socialRelations.push(row)
          })
        })
      })
      const averageScore = average(group.members.map((member) => member.tutorialProfile.averageScore || 0))
      const priorityMembers = group.members.filter((member) => member.priorityScore >= 4)
      const highPerformanceCount = group.members.filter((member) => member.performanceLevel === 'alt').length
      const lowPerformanceCount = group.members.filter((member) => member.performanceLevel === 'baix').length
      const starMembers = group.members.filter((member) => member.isStar || member.sociometricCategory === 'Líder')
      const alerts = []

      if (avoidRelations.length > 0) {
        alerts.push({
          tone: 'danger',
          text: `${avoidRelations.length} incompatibilitat/s dins del grup.`,
        })
      }

      if (starMembers.length >= 3) {
        alerts.push({
          tone: 'warning',
          text: `${starMembers.length} alumnes amb molt lideratge o influència en el mateix grup.`,
        })
      }

      if (priorityMembers.length >= 3) {
        alerts.push({
          tone: 'warning',
          text: `${priorityMembers.length} alumnes prioritaris concentrats al mateix grup.`,
        })
      }

      group.members.forEach((member) => {
        const hasPositivePeer = group.members.some((otherMember) => {
          if (otherMember.student.id === member.student.id) return false
          const pairSummary = summarizeCooperativePair(relations, member.student.id, otherMember.student.id)
          return pairSummary.supportiveInfluence > 0
        })
        if (!hasPositivePeer) {
          alerts.push({
            tone: ['Aïllat', 'Rebutjat'].includes(member.sociometricCategory) ? 'danger' : 'warning',
            text: `${member.student.name} queda sense vincle positiu clar dins del grup.`,
          })
        }
        if (
          member.sociometricCategory === 'Aïllat' &&
          !group.members.some(
            (otherMember) =>
              otherMember.student.id !== member.student.id &&
              (otherMember.workPositiveCount > 0 || otherMember.socialPositiveCount > 0 || otherMember.isStar),
          )
        ) {
          alerts.push({
            tone: 'warning',
            text: `${member.student.name} és un perfil aïllat i no té un suport clar dins del grup.`,
          })
        }
      })

      return {
        ...group,
        alerts,
        alertTone: alerts.some((alert) => alert.tone === 'danger') ? 'danger' : alerts.length > 0 ? 'warning' : null,
        averageScore,
        avoidRelations,
        highPerformanceCount,
        lowPerformanceCount,
        priorityMembers,
        socialRelations,
        supportiveRelations,
        workRelations,
      }
    })
  }

  function moveCooperativeMemberToGroup(groups, studentId, targetGroupId, relations) {
    if (!studentId || !targetGroupId) return groups
    let movingMember = null
    const nextGroups = groups.map((group) => {
      const remainingMembers = group.members.filter((member) => {
        const isMoving = member.student.id === studentId
        if (isMoving) movingMember = member
        return !isMoving
      })
      return { ...group, members: remainingMembers }
    })

    if (!movingMember) return groups

    return enrichCooperativeGroups(
      nextGroups.map((group) =>
        group.id === targetGroupId ? { ...group, members: [...group.members, movingMember] } : group,
      ),
      relations,
    )
  }

  function buildCooperativeGroups({
    groupSize,
    prioritizeHalfGroups,
    profiles,
    recordRowsByStudent,
    relationRowsByStudent,
    relations,
    roleRowsByStudent,
    sociometricRowsByStudentId,
    strategy,
  }) {
    const cleanGroupSize = Math.min(6, Math.max(2, Number(groupSize) || 4))
    const students = profiles
      .map((profile) =>
        buildStudentCooperativeProfile({
          profile,
          recordRow: recordRowsByStudent.get(profile.student.id),
          relationRow: relationRowsByStudent.get(profile.student.id),
          roleRow: roleRowsByStudent?.get(profile.student.id),
          sociometricRow: sociometricRowsByStudentId?.get(profile.student.id),
        }),
      )
      .sort((a, b) => {
        if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore
        if ((b.tutorialProfile.averageScore || 0) !== (a.tutorialProfile.averageScore || 0)) {
          return (a.tutorialProfile.averageScore || 0) - (b.tutorialProfile.averageScore || 0)
        }
        return a.student.name.localeCompare(b.student.name, 'ca')
      })

    if (prioritizeHalfGroups) {
      const studentsByHalfGroup = new Map()
      students.forEach((student) => {
        const key = student.halfGroup || 'Sense mig grup'
        studentsByHalfGroup.set(key, [...(studentsByHalfGroup.get(key) || []), student])
      })

      let globalIndex = 0
      const halfGroupGroups = []
      studentsByHalfGroup.forEach((halfGroupStudents, halfGroupName) => {
        const localGroupCount = Math.max(1, Math.ceil(halfGroupStudents.length / cleanGroupSize))
        const localGroups = Array.from({ length: localGroupCount }, () => {
          globalIndex += 1
          return {
            halfGroupName,
            id: `group_${globalIndex}`,
            members: [],
            name: `Grup ${globalIndex} · ${halfGroupName}`,
          }
        })

        halfGroupStudents.forEach((student) => {
          const bestGroup = localGroups
            .map((group) => ({
              group,
              score: getCooperativePlacementScore({
                candidate: student,
                group,
                groupSize: cleanGroupSize,
                prioritizeHalfGroups: false,
                relations,
                strategy,
              }),
            }))
            .sort((a, b) => a.score - b.score || a.group.members.length - b.group.members.length)[0]?.group

          bestGroup?.members.push(student)
        })
        halfGroupGroups.push(...localGroups)
      })

      return enrichCooperativeGroups(halfGroupGroups, relations)
    }

    const groupCount = Math.max(1, Math.ceil(students.length / cleanGroupSize))
    const groups = Array.from({ length: groupCount }, (_, index) => ({
      id: `group_${index + 1}`,
      members: [],
      name: `Grup ${index + 1}`,
    }))

    students.forEach((student) => {
      const bestGroup = groups
        .map((group) => ({
          group,
          score: getCooperativePlacementScore({
            candidate: student,
            group,
            groupSize: cleanGroupSize,
            prioritizeHalfGroups,
            relations,
            strategy,
          }),
        }))
        .sort((a, b) => a.score - b.score || a.group.members.length - b.group.members.length)[0]?.group

      bestGroup?.members.push(student)
    })

    return enrichCooperativeGroups(groups, relations)
  }

  function analyzeTutorialSeatingPlan({ plan, relations, restrictions = {}, getSeatDistance }) {
    const placements = plan?.placements || []
    const rows = plan?.rows || 5
    const adjacentAvoidPairs = []
    const adjacentWorkPairs = []
    const adjacentFriendshipPairs = []
    const adjacentLeaderPairs = []
    const neverNearConflicts = []
    const preferNearMisses = []
    const preferredZoneMisses = []
    const avoidedZoneConflicts = []
    const vulnerablePlacements = placements.filter((placement) => isVulnerableSeatingProfile(placement.student))
    const placementByStudentId = new Map(placements.map((placement) => [placement.studentId, placement]))
    const getRestrictionZone = (seat) => {
      const zone = getTeacherZoneLabel(seat, rows)
      if (zone === 'davant') return 'front'
      if (zone === 'darrere') return 'back'
      return 'center'
    }

    placements.forEach((placement, index) => {
      placements.slice(index + 1).forEach((otherPlacement) => {
        const distance = getSeatDistance(placement.seat, otherPlacement.seat)
        if (distance > 2) return
        const pairSummary = summarizeCooperativePair(relations, placement.studentId, otherPlacement.studentId)
        const adjacent = distance <= 1

        if (adjacent && pairSummary.hasAvoid) {
          adjacentAvoidPairs.push({
            pair: [placement, otherPlacement],
            severity: pairSummary.avoidInfluence >= 2 ? 'danger' : 'warning',
          })
        }
        if (adjacent && pairSummary.workInfluence > 0) adjacentWorkPairs.push({ pair: [placement, otherPlacement] })
        if (adjacent && pairSummary.socialInfluence > 0) adjacentFriendshipPairs.push({ pair: [placement, otherPlacement] })
        if (
          distance <= 2 &&
          isInfluentialSeatingProfile(placement.student) &&
          isInfluentialSeatingProfile(otherPlacement.student)
        ) {
          adjacentLeaderPairs.push({ pair: [placement, otherPlacement] })
        }
      })
    })

    const vulnerableWithoutSupport = vulnerablePlacements.filter((placement) => {
      const nearbySupport = placements.some((otherPlacement) => {
        if (otherPlacement.studentId === placement.studentId) return false
        if (!isSupportiveSeatingProfile(otherPlacement.student)) return false
        if (getSeatDistance(placement.seat, otherPlacement.seat) > 2) return false
        const pairSummary = summarizeCooperativePair(relations, placement.studentId, otherPlacement.studentId)
        return pairSummary.supportiveInfluence > 0 || pairSummary.workInfluence > 0
      })
      return !nearbySupport
    })

    ;(restrictions.neverNearPairs || []).forEach((pair) => {
      const left = placementByStudentId.get(pair.studentId)
      const right = placementByStudentId.get(pair.targetStudentId)
      if (left && right && getSeatDistance(left.seat, right.seat) <= 2) {
        neverNearConflicts.push({ pair: [left, right] })
      }
    })
    ;(restrictions.preferNearPairs || []).forEach((pair) => {
      const left = placementByStudentId.get(pair.studentId)
      const right = placementByStudentId.get(pair.targetStudentId)
      if (left && right && getSeatDistance(left.seat, right.seat) > 2) {
        preferNearMisses.push({ pair: [left, right] })
      }
    })
    Object.entries(restrictions.preferredZoneByStudentId || {}).forEach(([studentId, zone]) => {
      const placement = placementByStudentId.get(studentId)
      if (placement && getRestrictionZone(placement.seat) !== zone) {
        preferredZoneMisses.push({ placement, zone })
      }
    })
    Object.entries(restrictions.avoidedZoneByStudentId || {}).forEach(([studentId, zone]) => {
      const placement = placementByStudentId.get(studentId)
      if (placement && getRestrictionZone(placement.seat) === zone) {
        avoidedZoneConflicts.push({ placement, zone })
      }
    })

    const priorityPlacements = placements.filter(
      (placement) =>
        placement.student.priorityScore >= 4 || ['Aïllat', 'Rebutjat'].includes(placement.student.sociometricCategory),
    )
    const priorityInFront = priorityPlacements.filter((placement) => getTeacherZoneLabel(placement.seat, rows) === 'davant')
    const priorityInBack = priorityPlacements.filter(
      (placement) =>
        getTeacherZoneLabel(placement.seat, rows) === 'darrere' &&
        restrictions.preferredZoneByStudentId?.[placement.studentId] !== 'back',
    )

    const recommendations = []
    if (adjacentAvoidPairs.length > 0) {
      const [left, right] = adjacentAvoidPairs[0].pair
      recommendations.push(`Separa ${left.student.student.name} i ${right.student.student.name}: ara queden massa a prop.`)
    }
    if (vulnerableWithoutSupport.length > 0) {
      const target = vulnerableWithoutSupport[0]
      const candidateSupport = placements
        .filter((placement) => placement.studentId !== target.studentId && isSupportiveSeatingProfile(placement.student))
        .map((placement) => ({
          name: placement.student.student.name,
          relation: summarizeCooperativePair(relations, target.studentId, placement.studentId),
        }))
        .sort(
          (a, b) =>
            b.relation.supportiveInfluence - a.relation.supportiveInfluence ||
            b.relation.workInfluence - a.relation.workInfluence ||
            a.name.localeCompare(b.name, 'ca'),
        )[0]

      recommendations.push(
        candidateSupport
          ? `Acosta ${target.student.student.name} a ${candidateSupport.name} per donar-li un suport més clar.`
          : `Busca un lloc amb més suport proper per a ${target.student.student.name}.`,
      )
    }
    if (priorityInBack.length > 0) {
      recommendations.push(`Porta ${priorityInBack[0].student.student.name} a una zona més propera al docent.`)
    }
    if (adjacentLeaderPairs.length >= 2) {
      recommendations.push('Reparteix una mica més els lideratges perquè no monopolitzin la mateixa zona.')
    }
    if (adjacentFriendshipPairs.length >= 4) {
      recommendations.push('Trenca algun bloc d’amistat contínua per afavorir una xarxa més oberta i funcional.')
    }
    if (adjacentWorkPairs.length === 0 && placements.length >= 4) {
      recommendations.push('Procura deixar almenys una parella de treball fiable relativament a prop.')
    }

    const unplacedCount = plan?.unplacedProfiles?.length || 0
    const restrictionCount =
      (restrictions.neverNearPairs || []).length +
      (restrictions.preferNearPairs || []).length +
      Object.keys(restrictions.preferredZoneByStudentId || {}).length +
      Object.keys(restrictions.avoidedZoneByStudentId || {}).length
    const restrictionConflictCount =
      neverNearConflicts.length +
      preferNearMisses.length +
      preferredZoneMisses.length +
      avoidedZoneConflicts.length
    const dangerAvoidCount = adjacentAvoidPairs.filter((item) => item.severity === 'danger').length
    const warningAvoidCount = adjacentAvoidPairs.length - dangerAvoidCount
    const scorePenalty =
      dangerAvoidCount * 18 +
      warningAvoidCount * 12 +
      neverNearConflicts.length * 18 +
      avoidedZoneConflicts.length * 12 +
      preferredZoneMisses.length * 6 +
      preferNearMisses.length * 5 +
      Math.min(18, vulnerableWithoutSupport.length * 6) +
      Math.min(15, priorityInBack.length * 5) +
      Math.min(9, Math.max(0, adjacentLeaderPairs.length - 1) * 3) +
      unplacedCount * 12 +
      (adjacentWorkPairs.length === 0 && placements.length >= 4 ? 5 : 0)
    const rawScore = Math.max(0, Math.min(100, 100 - scorePenalty))
    const hasCriticalConflict = dangerAvoidCount > 0 || neverNearConflicts.length > 0 || unplacedCount > 0
    const score = hasCriticalConflict ? Math.min(54, rawScore) : rawScore
    const quality =
      score >= 85
        ? { label: 'Molt sòlida', tone: 'positive' }
        : score >= 70
          ? { label: 'Bona', tone: 'good' }
          : score >= 55
            ? { label: 'Acceptable amb revisions', tone: 'warning' }
            : { label: 'Riscosa', tone: 'danger' }
    const conflicts = [
      ...adjacentAvoidPairs.map(({ pair, severity }) => ({
        severity,
        text: `${pair[0].student.student.name} i ${pair[1].student.student.name} tenen tensió o rebuig i són massa a prop.`,
        title: 'Relació incompatible',
      })),
      ...neverNearConflicts.map(({ pair }) => ({
        severity: 'danger',
        text: `${pair[0].student.student.name} i ${pair[1].student.student.name} incompleixen la restricció “mai a prop”.`,
        title: 'Restricció incomplerta',
      })),
      ...avoidedZoneConflicts.map(({ placement }) => ({
        severity: 'warning',
        text: `${placement.student.student.name} ha quedat en una zona marcada per evitar.`,
        title: 'Zona a evitar',
      })),
      ...preferredZoneMisses.map(({ placement }) => ({
        severity: 'warning',
        text: `${placement.student.student.name} no ha quedat a la zona preferent.`,
        title: 'Zona preferent pendent',
      })),
      ...preferNearMisses.map(({ pair }) => ({
        severity: 'warning',
        text: `${pair[0].student.student.name} i ${pair[1].student.student.name} haurien d’estar més a prop.`,
        title: 'Suport massa lluny',
      })),
      ...vulnerableWithoutSupport.map((placement) => ({
        severity: 'warning',
        text: `${placement.student.student.name} no té cap suport relacional o de treball clar a prop.`,
        title: 'Perfil vulnerable sense suport',
      })),
      ...priorityInBack.map((placement) => ({
        severity: 'warning',
        text: `${placement.student.student.name} és prioritari i queda lluny de la supervisió docent.`,
        title: 'Seguiment difícil',
      })),
    ]
    const strengths = []
    if (adjacentAvoidPairs.length === 0 && neverNearConflicts.length === 0) {
      strengths.push('No hi ha incompatibilitats crítiques a prop.')
    }
    if (vulnerablePlacements.length > 0 && vulnerableWithoutSupport.length === 0) {
      strengths.push('Tots els perfils vulnerables tenen suport proper.')
    }
    if (priorityPlacements.length > 0 && priorityInBack.length === 0) {
      strengths.push('Els alumnes prioritaris són en zones de seguiment adequades.')
    }
    if (adjacentWorkPairs.length > 0) {
      strengths.push(`${adjacentWorkPairs.length} parella/es de treball útil/s queden a prop.`)
    }
    if (restrictionCount > 0 && restrictionConflictCount === 0) {
      strengths.push('Es respecten totes les restriccions docents configurades.')
    }
    if (unplacedCount === 0 && placements.length > 0) {
      strengths.push('Tots els alumnes tenen un lloc assignat.')
    }
    const summary =
      conflicts.length === 0
        ? 'La proposta respecta els criteris principals i no presenta conflictes pedagògics rellevants.'
        : score >= 70
          ? `La proposta és funcional, però convé revisar ${conflicts.length} punt${conflicts.length === 1 ? '' : 's'} abans de donar-la per bona.`
          : `La proposta necessita canvis: hi ha ${conflicts.length} conflicte${conflicts.length === 1 ? '' : 's'} amb impacte pedagògic.`

    return {
      adjacentAvoidPairs,
      adjacentFriendshipPairs,
      adjacentLeaderPairs,
      adjacentWorkPairs,
      avoidedZoneConflicts,
      conflicts,
      quality,
      priorityInBack,
      priorityInFront,
      priorityPlacements,
      preferredZoneMisses,
      preferNearMisses,
      recommendations: recommendations.slice(0, 4),
      restrictionConflictCount,
      score,
      strengths: strengths.slice(0, 4),
      summary,
      neverNearConflicts,
      unplacedCount,
      vulnerablePlacements,
      vulnerableWithoutSupport,
    }
  }

  return {
    analyzeTutorialSeatingPlan,
    buildCooperativeGroups,
    buildStudentCooperativeProfile,
    enrichCooperativeGroups,
    getCooperativePlacementScore,
    getRelationsBetween,
    getTeacherZoneLabel,
    isInfluentialSeatingProfile,
    isSupportiveSeatingProfile,
    isVulnerableSeatingProfile,
    moveCooperativeMemberToGroup,
    relationBetween,
    summarizeCooperativePair,
  }
}
