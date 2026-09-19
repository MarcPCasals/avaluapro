const PREPARATION_KINDS = new Set(['student', 'teacher', 'print', 'buy', 'reserve'])

export function getStudentFirstName(student = {}) {
  const preferred = String(student.preferredName || student.usualName || '').trim()
  if (preferred) return preferred.split(/\s+/)[0]
  const fullName = String(student.name || '').trim()
  if (!fullName) return 'alumne'
  const givenName = fullName.includes(',') ? fullName.split(',').slice(1).join(',').trim() : fullName
  return givenName.split(/\s+/)[0] || 'alumne'
}

export function getRecoverableClassroomItems(items = []) {
  return items.filter((item) => item.type === 'activity' && item.sourceActivityId)
}

function externalMaterials(items = []) {
  const materials = items.flatMap((item) => [
    ...(item.sourceActivity?.teacherMaterials || []),
    ...(item.sourceActivity?.studentMaterials || []),
  ]).filter((material) => material?.url)
  return [...new Map(materials.map((material) => [material.url, material])).values()]
}

function formatDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('ca-AD', { day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(`${String(value).slice(0, 10)}T12:00:00`))
}

/**
 * Prepara només el cos del missatge. L'aplicació no gestiona destinataris ni
 * envia res; el docent conserva sempre l'última edició abans de copiar-la.
 */
export function buildRecoveryEmail({
  items = [],
  kind = 'absence',
  nextSessionStartsAt = '',
  sessionStartsAt = '',
  student,
  subject = '',
}) {
  const firstName = getStudentFirstName(student)
  const activityLines = items.map((item) => `- ${item.title}`)
  const evidenceLines = items
    .filter((item) => item.sourceActivity?.evidenceMode && item.sourceActivity.evidenceMode !== 'none')
    .map((item) => `- ${item.title}`)
  const materials = externalMaterials(items)
  const intro = kind === 'earlyDeparture'
    ? `Avui, ${formatDate(sessionStartsAt)}, has marxat abans d'acabar la sessió de ${subject || 'classe'}.`
    : `Avui, ${formatDate(sessionStartsAt)}, no has pogut assistir a la sessió de ${subject || 'classe'}.`
  const parts = [
    `Hola, ${firstName},`,
    '',
    intro,
    '',
    'Les activitats que t’has perdut són:',
    ...(activityLines.length ? activityLines : ['- No hi ha cap activitat pendent de recuperar.']),
  ]
  if (evidenceLines.length) parts.push('', 'Tasques que cal completar o entregar:', ...evidenceLines)
  if (materials.length) parts.push('', 'Materials vinculats:', ...materials.map((material) => `- ${material.label}: ${material.url}`))
  if (nextSessionStartsAt) parts.push('', `Ho revisarem a la pròxima sessió, el ${formatDate(nextSessionStartsAt)}.`)
  parts.push('', 'Si tens algun dubte, en parlem a classe.', '', 'Gràcies.')
  return parts.join('\n')
}

export function getPreparationReminderDate(startsAt, daysBefore = 1) {
  const date = new Date(`${String(startsAt).slice(0, 10)}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) return ''
  date.setUTCDate(date.getUTCDate() - Math.max(0, Math.round(Number(daysBefore) || 0)))
  return date.toISOString().slice(0, 10)
}

export function getPreparationMaterials(item = {}) {
  return [
    ...(item.sourceActivity?.teacherMaterials || []).map((material) => ({ ...material, audience: 'teacher' })),
    ...(item.sourceActivity?.studentMaterials || []).map((material) => ({ ...material, audience: 'students' })),
  ].filter((material) => PREPARATION_KINDS.has(material.preparationKind))
}

export function getMaterialPreparationKey(sessionId, item, material) {
  return [sessionId, item.sourceActivityId || item.id, material.audience, material.id || material.label].join(':')
}

export function buildMaterialPreparationReminder({ bundle, item, material }, idFactory, now = new Date().toISOString()) {
  const preparationKey = getMaterialPreparationKey(bundle.session.id, item, material)
  const labelByKind = {
    buy: 'Comprar',
    print: 'Imprimir',
    reserve: 'Reservar',
    student: 'Recordar a l’alumnat',
    teacher: 'Preparar',
  }
  const action = labelByKind[material.preparationKind] || 'Preparar'
  const text = `${action}: ${material.label}`
  return {
    id: idFactory('note'),
    applicationId: bundle.application.id,
    classId: bundle.session.classId,
    createdAt: now,
    date: now.slice(0, 10),
    materialPreparationKey: preparationKey,
    planningUnitId: bundle.planningUnit.id,
    preparation: {
      completedAt: '',
      itemId: item.id,
      kind: material.preparationKind,
      label: material.label,
      materialId: material.id || '',
      sessionId: bundle.session.id,
      sessionStartsAt: bundle.session.startsAt,
      sourceActivityId: item.sourceActivityId,
      url: material.url || '',
    },
    reminder: {
      date: getPreparationReminderDate(bundle.session.startsAt, material.reminderDaysBefore ?? 1),
      dismissedAt: '',
      snoozeUntil: '',
      text,
      time: '',
    },
    sessionId: bundle.session.id,
    source: 'planning-material',
    studentId: null,
    text,
    type: 'materialPreparation',
    updatedAt: now,
  }
}

/**
 * Manté alineats els recordatoris amb els materials de les sessions carregades.
 * Els materials eliminats es cancel·len sense esborrar l'historial i es poden
 * reactivar si tornen a marcar-se com a preparables.
 */
export function reconcileMaterialPreparationReminders(agendaNotes = [], bundles = [], idFactory, now = new Date().toISOString()) {
  const existingByKey = new Map(agendaNotes
    .filter((note) => note.materialPreparationKey)
    .map((note) => [note.materialPreparationKey, note]))
  const scopedSessionIds = new Set(bundles.map((bundle) => bundle.session?.id).filter(Boolean))
  const desiredKeys = new Set()
  const notes = [...agendaNotes]
  let changed = false

  for (const bundle of bundles) {
    for (const item of bundle.items || []) {
      for (const material of getPreparationMaterials(item)) {
        const candidate = buildMaterialPreparationReminder({ bundle, item, material }, idFactory, now)
        desiredKeys.add(candidate.materialPreparationKey)
        const existing = existingByKey.get(candidate.materialPreparationKey)
        if (!existing) {
          notes.push(candidate)
          existingByKey.set(candidate.materialPreparationKey, candidate)
          changed = true
          continue
        }
        if (existing.preparation?.completedAt) continue
        const reminderChanged = existing.reminder?.date !== candidate.reminder.date
          || existing.reminder?.text !== candidate.reminder.text
          || existing.preparation?.sessionStartsAt !== candidate.preparation.sessionStartsAt
          || Boolean(existing.preparation?.cancelledAt)
        if (!reminderChanged) continue
        const updated = {
          ...existing,
          preparation: { ...candidate.preparation, completedAt: existing.preparation?.completedAt || '' },
          reminder: {
            ...candidate.reminder,
            dismissedAt: existing.preparation?.cancelledAt ? '' : existing.reminder?.dismissedAt || '',
          },
          text: candidate.text,
          updatedAt: now,
        }
        const index = notes.findIndex((note) => note.id === existing.id)
        notes[index] = updated
        existingByKey.set(candidate.materialPreparationKey, updated)
        changed = true
      }
    }
  }

  for (let index = 0; index < notes.length; index += 1) {
    const note = notes[index]
    if (note.type !== 'materialPreparation'
      || !scopedSessionIds.has(note.sessionId)
      || desiredKeys.has(note.materialPreparationKey)
      || note.preparation?.completedAt
      || note.preparation?.cancelledAt) continue
    notes[index] = {
      ...note,
      preparation: { ...note.preparation, cancelledAt: now },
      reminder: note.reminder ? { ...note.reminder, dismissedAt: now } : null,
      updatedAt: now,
    }
    changed = true
  }

  return {
    changed,
    materialNotes: notes.filter((note) => note.type === 'materialPreparation'),
    notes,
  }
}

export function linkRecoveryToTaskRecords({ taskRecords = [], tasks = [] }, {
  activities = [], applicationId, classId, noteId, sessionId, studentId,
}, idFactory) {
  const activityIds = activities.map((activity) => activity.sourceActivityId).filter(Boolean)
  const selectedTasks = tasks.filter((task) => task.classId === classId
    && activityIds.includes(task.sourceActivityId)
    && (!task.applicationId || task.applicationId === applicationId)
    && (task.evidenceMode !== 'perSession' || task.sessionId === sessionId))
  const records = [...taskRecords]
  for (const task of selectedTasks) {
    const index = records.findIndex((record) => record.taskId === task.id && record.studentId === studentId)
    const current = index >= 0 ? records[index] : null
    const record = {
      ...(current || {}),
      classId,
      id: current?.id || idFactory('rec'),
      recoveredAt: '',
      recoveryNoteId: noteId,
      recoveryPending: true,
      sessionId,
      status: 'EXEMPT',
      studentId,
      taskId: task.id,
      utId: task.utId,
    }
    if (index >= 0) records[index] = record
    else records.push(record)
  }
  return { linkedCount: selectedTasks.length, records }
}

/**
 * Desvincula els registres creats per una selecció anterior abans de tornar-la
 * a aplicar. Manté l'absència com a exempta, però deixa de mostrar una
 * recuperació que el docent ja ha desmarcat.
 */
export function clearRecoveryTaskLinks(taskRecords = [], noteId, status = '') {
  return taskRecords.map((record) => record.recoveryNoteId === noteId
    ? {
        ...record,
        recoveredAt: '',
        recoveryNoteId: '',
        recoveryPending: false,
        ...(status ? { status } : {}),
      }
    : record)
}

export function completeRecoveryTaskRecords(taskRecords = [], noteId, completedAt) {
  return taskRecords.map((record) => record.recoveryNoteId === noteId
    ? { ...record, recoveredAt: completedAt, recoveryPending: false, status: 'DONE' }
    : record)
}
