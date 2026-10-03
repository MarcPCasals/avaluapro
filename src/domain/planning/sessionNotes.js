import { createCalendarSession, createPlanningPrivateNote } from './model.js'

export function getTimetableSessionNoteId(session) {
  if (!session?.timetableSlotId || !session.startsAt) return ''
  return `timetable_${String(session.startsAt).slice(0, 10)}_${session.timetableSlotId}`
}

/** Desar un recordatori personal mai no el publica dins de la UP. */
export function buildSessionNoteChange({ bundle, ownerUid, text, recordInPlanning, now = new Date().toISOString() }) {
  const existing = bundle.privateNotes?.[0]
  const cleanText = String(text || '').trim()
  if (cleanText.length > 4000) throw new Error('La nota pot tenir com a màxim 4.000 caràcters.')
  const registered = !bundle.standalone && Boolean(recordInPlanning ?? existing?.recordInPlanning)
  const note = cleanText ? createPlanningPrivateNote({
    ...existing,
    id: existing?.id || `session_note_${ownerUid}_${bundle.session.id}`,
    ownerUid, planningUnitId: bundle.planningUnit?.id || null,
    applicationId: bundle.standalone ? null : bundle.application?.id,
    sessionId: existing?.sessionId || getTimetableSessionNoteId(bundle.session) || bundle.session.id, text: cleanText, recordInPlanning: registered, updatedAt: now,
  }, { now }) : null
  const noteId = existing?.id || note?.id
  const applicationNotes = (bundle.session.applicationNotes || []).filter((item) => item.id !== noteId)
  if (note && registered) applicationNotes.push({ id: note.id, text: cleanText, authorUid: ownerUid })
  const applicationNotesChanged = JSON.stringify(applicationNotes) !== JSON.stringify(bundle.session.applicationNotes || [])
  const session = bundle.standalone || !applicationNotesChanged ? bundle.session : createCalendarSession({
    ...bundle.session, applicationNotes, updatedAt: now,
  }, { now })
  return { note, existing, session, applicationNotesChanged }
}
