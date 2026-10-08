import { isEducandEmail, directionIdentityAllowed } from '../domain/planning/directionAccess.js'
import { planningExpiryFromDate } from '../domain/planning/accessExpiry.js'

function fields(source = {}, keys) {
  return Object.fromEntries(keys.filter((key) => source[key] !== undefined).map((key) => [key, source[key]]))
}
const NOTE_FIELDS = ['id', 'date', 'createdAt', 'type', 'text']
const RECORD_FIELDS = ['id', 'date', 'type', 'note', 'followUpDate', 'followUpStatus', 'isImportant']
const records = (items = []) => items.map((item) => fields(item, RECORD_FIELDS))

/** Només la informació de la vista i els seus detalls, sense dades de compte, fotos ni altres grups. */
export function buildStudentOverviewSnapshot({ activeClass, activeUt, rows, showTutoringColumns }) {
  const snapshot = {
    className: activeClass.name,
    subject: activeClass.subject || '',
    utName: activeUt?.name || '',
    showTutoringColumns: Boolean(showTutoringColumns),
    rows: rows.map((row) => ({
      student: fields(row.student, ['id', 'name', 'halfGroup', 'diagnoses', 'progressReason', 'isSkiStudyStudent', 'diagnosisNotes', 'personalNotes']),
      profile: row.profile ? {
        evaluation: fields(row.profile.evaluation, ['grade']),
        tracking: fields(row.profile.tracking, ['hasTrackingData', 'consistency', 'missing']),
        incidents: row.profile.incidents || 0,
      } : null,
      absenceHours: row.absenceHours || 0,
      absenceRecords: (row.absenceRecords || []).map((item) => fields(item, ['id', 'date', 'time', 'hours'])),
      classroomNotes: (row.classroomNotes || []).map((item) => fields(item, NOTE_FIELDS)),
      trackingNotes: (row.trackingNotes || []).map((item) => fields(item, NOTE_FIELDS)),
      latestTrackingNote: row.latestTrackingNote ? fields(row.latestTrackingNote, NOTE_FIELDS) : null,
      ...(showTutoringColumns ? {
        latestTeamNote: row.latestTeamNote ? fields(row.latestTeamNote, NOTE_FIELDS) : null,
        latestTutoringNote: row.latestTutoringNote ? fields(row.latestTutoringNote, NOTE_FIELDS) : null,
        tutoringNotes: (row.tutoringNotes || []).map((item) => fields(item, NOTE_FIELDS)),
        records: records(row.records),
        importantRecords: records(row.importantRecords),
        pendingRecords: records(row.pendingRecords),
        otherTutorialRecords: records(row.otherTutorialRecords),
      } : {}),
    })),
  }
  if (snapshot.rows.length > 100 || new TextEncoder().encode(JSON.stringify(snapshot)).length > 800_000) {
    throw new Error('Hi ha massa informació per compartir en un sol enllaç. Redueix el volum del grup.')
  }
  return snapshot
}

export function studentOverviewShareAccess(emails, expiresOn, now = Date.now()) {
  const authorizedEmails = [...new Set(String(emails).split(/[\s,;]+/).map((email) => email.trim().toLowerCase()).filter(Boolean))]
  if (!authorizedEmails.length || authorizedEmails.length > 20 || authorizedEmails.some((email) => !isEducandEmail(email))) {
    throw new Error('Indica entre 1 i 20 correus de direcció @educand.ad.')
  }
  const expiresAtEpochMs = planningExpiryFromDate(expiresOn)
  if (!expiresAtEpochMs || expiresAtEpochMs <= now) throw new Error('Tria una data de caducitat d’avui o posterior.')
  return { authorizedEmails, expiresAtEpochMs }
}

export function buildStudentOverviewShareUrl(id, origin = window.location.origin) {
  const url = new URL('/', origin)
  url.searchParams.set('students-view', id)
  return url.href
}

/** El propietari gestiona l'enllaç, però la consulta també exigeix el correu autoritzat. */
export function canReadStudentOverviewShare(share, claims, now = Date.now()) {
  return directionIdentityAllowed(claims) && share?.enabled === true
    && Number.isFinite(share.expiresAtEpochMs) && share.expiresAtEpochMs > now
    && share.authorizedEmails?.includes(String(claims.email).toLowerCase()) === true
}
