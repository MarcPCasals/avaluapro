const DEFAULT_READING_BY_CATEGORY = {
  Acceptat: 'No presenta senyals de rebuig destacat, però tampoc concentra molta afinitat explícita.',
  Aïllat: 'Queda poc connectat al mapa social; convé crear vincles segurs i observables.',
  Controvertit: 'Combina força acceptació i rebuig; és un perfil polaritzat que necessita lectura fina.',
  Líder: 'Rep eleccions positives i pot actuar com a suport social si es gestiona amb discreció.',
  Promig: 'Mostra una integració general adequada i sense senyals sociomètriques extremes.',
  Rebutjat: 'Rep més rebuigs que suport positiu; cal contrastar la situació abans de prendre decisions de grup.',
}

const TEACHER_OBSERVATION_RELATION_SOURCE = 'teacher-observation'
const SOCIOMETRIC_PUBLIC_FORM_SOURCE = 'sociometric-public-form'

export const SOCIOMETRIC_CATEGORY_META = {
  Líder: { id: 'leader', label: 'Líder', tone: 'green', description: 'Molta elecció positiva i poc rebuig.' },
  Promig: { id: 'average', label: 'Promig', tone: 'blue', description: 'Bona acceptació general i relació fluida amb el grup.' },
  Acceptat: { id: 'accepted', label: 'Acceptat', tone: 'cyan', description: 'Poca afinitat explícita, però sense rebuig significatiu.' },
  Controvertit: { id: 'controversial', label: 'Controvertit', tone: 'orange', description: 'Rep eleccions positives i també rebuigs; perfil polaritzat.' },
  Aïllat: { id: 'isolated', label: 'Aïllat', tone: 'gray', description: 'Poques connexions registrades.' },
  Rebutjat: { id: 'rejected', label: 'Rebutjat', tone: 'red', description: 'Rep rebuigs alts i el balanç social és clarament negatiu.' },
}

function getSociometricCategory({
  avoidReceived,
  p15,
  p40,
  p60Avoid,
  p75Avoid,
  p85,
  positiveGiven,
  positiveReceived,
}) {
  const highPositive = positiveReceived >= Math.max(1, p40)
  const veryHighPositive = positiveReceived >= Math.max(1, p85)
  const moderateAvoid = avoidReceived >= Math.max(1, p60Avoid)
  const highAvoid = avoidReceived >= Math.max(1, p75Avoid)
  const lowPositive = positiveReceived <= p15
  const positiveBalance = positiveReceived - avoidReceived
  const clearlyRejected = highAvoid && (positiveReceived === 0 || positiveBalance <= -1 || (lowPositive && avoidReceived >= 2))

  if (veryHighPositive && avoidReceived <= p60Avoid) return 'Líder'
  if (highAvoid && highPositive && positiveBalance >= 0) return 'Controvertit'
  if (highAvoid && highPositive && positiveReceived >= Math.max(1, avoidReceived - 1)) return 'Controvertit'
  if (clearlyRejected) return 'Rebutjat'
  if (highPositive && moderateAvoid) return 'Controvertit'
  if (lowPositive && positiveGiven <= 1 && avoidReceived <= p60Avoid) return 'Aïllat'
  if (highPositive && avoidReceived <= p60Avoid) return 'Promig'
  return 'Acceptat'
}

function getRelationPedagogicalWeight(relation) {
  if (relation?.source === SOCIOMETRIC_PUBLIC_FORM_SOURCE) return 1
  if (relation?.source === 'sociometric-questionnaire') return 1
  if (!relation?.source || relation?.source === TEACHER_OBSERVATION_RELATION_SOURCE) return 2
  return 1
}

function getWeightedRelationCount(relations) {
  return (relations || []).reduce((total, relation) => total + getRelationPedagogicalWeight(relation), 0)
}

function isSociometricSocialRelation(relation) {
  return (
    relation?.type === 'friendship' ||
    relation?.source === SOCIOMETRIC_PUBLIC_FORM_SOURCE ||
    relation?.source === 'sociometric-questionnaire'
  )
}

function getPercentile(sortedValues, ratio) {
  if (!sortedValues.length) return 0
  const index = Math.min(sortedValues.length - 1, Math.max(0, Math.ceil(sortedValues.length * ratio) - 1))
  return sortedValues[index]
}

function buildTutorialRelationRowsByStudent(students, relations) {
  return new Map(
    (students || [])
      .map((student) => {
        const outgoing = (relations || []).filter((relation) => relation.sourceStudentId === student.id)
        const incoming = (relations || []).filter((relation) => relation.targetStudentId === student.id)
        const bidirectional = [...outgoing, ...incoming]

        return [
          student.id,
          {
            student,
            socialPositiveCount: getWeightedRelationCount(
              bidirectional.filter((relation) => relation.type === 'friendship'),
            ),
            supportiveCount: getWeightedRelationCount(
              bidirectional.filter((relation) => relation.type === 'positive' || relation.type === 'friendship'),
            ),
            workPositiveCount: getWeightedRelationCount(
              bidirectional.filter((relation) => relation.type === 'positive'),
            ),
            avoidCount: getWeightedRelationCount(
              bidirectional.filter((relation) => relation.type === 'avoid'),
            ),
            total: outgoing.length + incoming.length,
          },
        ]
      })
      .sort((a, b) => a[1].student.name.localeCompare(b[1].student.name, 'ca')),
  )
}

function buildSociometricRows(students, relations, categoryMetaByName = SOCIOMETRIC_CATEGORY_META) {
  const positiveRelations = (relations || []).filter((relation) => relation.type === 'friendship')
  const avoidRelations = (relations || []).filter(
    (relation) => relation.type === 'avoid' && isSociometricSocialRelation(relation),
  )
  const reciprocalPairs = new Set()

  positiveRelations.forEach((relation) => {
    const hasReverse = positiveRelations.some(
      (candidate) =>
        candidate.sourceStudentId === relation.targetStudentId && candidate.targetStudentId === relation.sourceStudentId,
    )
    if (hasReverse) reciprocalPairs.add([relation.sourceStudentId, relation.targetStudentId].sort().join('__'))
  })

  const rows = (students || []).map((student) => {
    const positiveReceived = getWeightedRelationCount(
      positiveRelations.filter((relation) => relation.targetStudentId === student.id),
    )
    const positiveGiven = getWeightedRelationCount(
      positiveRelations.filter((relation) => relation.sourceStudentId === student.id),
    )
    const avoidReceived = getWeightedRelationCount(
      avoidRelations.filter((relation) => relation.targetStudentId === student.id),
    )
    const avoidGiven = getWeightedRelationCount(
      avoidRelations.filter((relation) => relation.sourceStudentId === student.id),
    )
    return { avoidGiven, avoidReceived, positiveGiven, positiveReceived, student }
  })

  const positiveReceivedValues = rows.map((row) => row.positiveReceived).sort((a, b) => a - b)
  const avoidReceivedValues = rows.map((row) => row.avoidReceived).sort((a, b) => a - b)
  const p15 = getPercentile(positiveReceivedValues, 0.15)
  const p40 = getPercentile(positiveReceivedValues, 0.4)
  const p60Avoid = getPercentile(avoidReceivedValues, 0.6)
  const p75Avoid = getPercentile(avoidReceivedValues, 0.75)
  const p85 = getPercentile(positiveReceivedValues, 0.85)

  return rows.map((row) => {
    const { avoidGiven, avoidReceived, positiveGiven, positiveReceived, student } = row
    const category = getSociometricCategory({
      avoidReceived,
      p15,
      p40,
      p60Avoid,
      p75Avoid,
      p85,
      positiveGiven,
      positiveReceived,
    })

    const categoryMeta = categoryMetaByName[category] || categoryMetaByName.Promig
    const nodeSizeClass =
      positiveReceived >= Math.max(1, p85)
        ? 'node-large'
        : positiveReceived >= Math.max(1, p40)
          ? 'node-medium'
          : 'node-small'

    return { avoidGiven, avoidReceived, category, categoryMeta, nodeSizeClass, positiveGiven, positiveReceived, student }
  })
}

function getSociogramInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return 'AL'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

function getSociogramShortCode(name) {
  const cleanName = String(name || '').trim()
  if (!cleanName) return 'AL'
  const parts = cleanName
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Za-zÀ-ÿ]/g, ''))
    .filter(Boolean)
  if (parts.length === 0) return getSociogramInitials(name)
  const firstName = parts.at(-1) || parts[0]
  const surname = parts[0]
  const code = `${firstName.slice(0, 3)}${surname.slice(0, 1)}`.toLowerCase()
  return code ? `${code.slice(0, 1).toUpperCase()}${code.slice(1)}` : getSociogramInitials(name)
}

function getUniqueCounterpartNames(items, studentId) {
  return [
    ...new Set(
      items
        .map((relation) => (relation.sourceStudentId === studentId ? relation.targetStudent?.name : relation.sourceStudent?.name))
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, 'ca'))
}

function getWorkCategory(workPositiveCount) {
  if (workPositiveCount >= 3) return 'Bon suport de treball'
  if (workPositiveCount > 0) return 'Amb vincles de treball'
  return 'Sense dades de treball'
}

export function getSociometricRuntimeMeta({
  academicRisk = false,
  isStar = false,
  priorityScore = 0,
  socialPositiveCount = 0,
  sociometricCategory = 'Promig',
  workPositiveCount = 0,
}) {
  const isSociometricPriority =
    priorityScore >= 4 || academicRisk || ['Aïllat', 'Rebutjat'].includes(sociometricCategory)
  const isSupportiveReference =
    isStar || sociometricCategory === 'Líder' || workPositiveCount >= 2 || socialPositiveCount >= 3
  const isInfluential =
    isStar || sociometricCategory === 'Líder' || sociometricCategory === 'Controvertit' || socialPositiveCount >= 4

  const supportLabel = isSociometricPriority
    ? 'seguiment'
    : isSupportiveReference
      ? 'suport'
      : isInfluential
        ? 'influència'
        : 'estàndard'

  return {
    isInfluential,
    isSociometricPriority,
    isSupportiveReference,
    isSociometricVulnerable: isSociometricPriority,
    supportLabel,
  }
}

function getActions({ avoidNames, category, workNames }) {
  const actions = []

  if (category === 'Rebutjat') {
    actions.push('Contrastar la situació amb observacions d’aula i evitar exposar-lo en agrupaments forçats.')
  } else if (category === 'Aïllat') {
    actions.push('Assignar una parella pont en una tasca curta i molt estructurada.')
  } else if (category === 'Líder') {
    actions.push('Donar-li una responsabilitat positiva sense convertir-lo en ajudant permanent.')
  } else if (category === 'Controvertit') {
    actions.push('Observar en quins contextos genera adhesió i en quins apareix tensió.')
  } else {
    actions.push('Mantenir seguiment ordinari i revisar si apareixen canvis en properes respostes.')
  }

  if (workNames.length === 0) {
    actions.push('Afegir criteri docent de treball per saber amb qui funciona millor a classe.')
  } else {
    actions.push(`Prioritzar com a suport de treball: ${workNames.slice(0, 2).join(', ')}.`)
  }

  if (avoidNames.length > 0) {
    actions.push(`Evitar de moment combinacions amb ${avoidNames.slice(0, 2).join(', ')}.`)
  } else {
    actions.push('No hi ha incompatibilitats registrades; es pot provar en agrupaments diversos.')
  }

  return actions.slice(0, 3)
}

export function buildSociometricStudentReports({
  categoryMetaByName,
  relations,
  sociometricRows,
  students,
  tutorialRelationRowsByStudent,
}) {
  const rowsByStudentId = new Map((sociometricRows || []).map((row) => [row.student.id, row]))
  const enrichedRelations = relations || []

  return (students || []).map((student) => {
    const sociometricRow = rowsByStudentId.get(student.id)
    const relationRow = tutorialRelationRowsByStudent.get(student.id)
    const relatedRelations = enrichedRelations.filter(
      (relation) => relation.sourceStudentId === student.id || relation.targetStudentId === student.id,
    )
    const socialPositiveRelations = relatedRelations.filter((relation) => relation.type === 'friendship')
    const workPositiveRelations = relatedRelations.filter((relation) => relation.type === 'positive')
    const avoidRelations = relatedRelations.filter((relation) => relation.type === 'avoid')
    const socialNames = getUniqueCounterpartNames(socialPositiveRelations, student.id)
    const workNames = getUniqueCounterpartNames(workPositiveRelations, student.id)
    const avoidNames = getUniqueCounterpartNames(avoidRelations, student.id)
    const category = sociometricRow?.category || 'Promig'
    const categoryMeta = sociometricRow?.categoryMeta || categoryMetaByName?.[category] || categoryMetaByName?.Promig
    const runtimeMeta = getSociometricRuntimeMeta({
      isStar: false,
      priorityScore: 0,
      socialPositiveCount: relationRow?.socialPositiveCount || 0,
      sociometricCategory: category,
      workPositiveCount: relationRow?.workPositiveCount || 0,
    })

    return {
      actions: getActions({ avoidNames, category, workNames }),
      avoidNames,
      category,
      categoryMeta,
      ...runtimeMeta,
      reading: DEFAULT_READING_BY_CATEGORY[category] || DEFAULT_READING_BY_CATEGORY.Promig,
      relationRow,
      socialNames,
      sociometricRow,
      student,
      studentCode: getSociogramShortCode(student.name),
      workCategory: getWorkCategory(relationRow?.workPositiveCount || 0),
      workNames,
    }
  })
}

export function buildSociometricStudentReportsFromRelations({
  categoryMetaByName = SOCIOMETRIC_CATEGORY_META,
  relations,
  students,
}) {
  const tutorialRelationRowsByStudent = buildTutorialRelationRowsByStudent(students || [], relations || [])
  const sociometricRows = buildSociometricRows(students || [], relations || [], categoryMetaByName)

  return buildSociometricStudentReports({
    categoryMetaByName,
    relations: relations || [],
    sociometricRows,
    students: students || [],
    tutorialRelationRowsByStudent,
  })
}
