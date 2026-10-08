import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { StudentOverviewTable } from './StudentOverviewTable'
import { getDiagnosisLabels } from '../../data/studentAnnotations.js'
import { formatAbsenceDateTime, formatAbsenceHours } from '../../lib/attendance.js'
import { formatClassroomNoteDate } from '../../lib/studentClassroomNotes.js'
import './StudentOverviewSharing.css'

const TYPES = {
  'family-contact': 'Contacte amb la família', 'student-interview': 'Entrevista amb l’alumne',
  'tutorial-observation': 'Observació tutorial', 'team-information': 'Informació de l’equip educatiu',
  guidance: 'Orientació', agreement: 'Acord o mesura', 'other-tutorial': 'Altres informacions tutorials',
  agenda: 'Nota a l’agenda', incident: 'Full d’incidents', 'classroom-expulsion': 'Expulsió d’aula',
  'center-expulsion': 'Expulsió de centre', doip: 'DOIP equip educatiu',
  tracking: 'Seguiment', team: 'Equip educatiu', tutoring: 'Tutoria',
}

function History({ items = [] }) {
  return items.length ? <div className="student-consultation-history">{[...items].sort((a, b) => String(b.date || b.createdAt || '').localeCompare(String(a.date || a.createdAt || ''))).map((item) => <article key={item.id}>
    <strong>{item.type === 'incident' && item.text ? 'Negativa · incidència' : TYPES[item.type] || (item.type === 'positive' ? 'Positiva' : 'Anotació')}</strong>
    <small>{formatClassroomNoteDate(item)}{item.isImportant ? ' · Important' : ''}</small>
    <p>{item.note || item.text || 'Sense comentari'}</p>
    {item.followUpDate && <small>Seguiment: {formatClassroomNoteDate({ date: item.followUpDate })} · {item.followUpStatus === 'done' ? 'Completat' : 'Pendent'}</small>}
  </article>)}</div> : <p>Sense entrades.</p>
}

/** Component pur: consulta interactiva, sense botiga ni accions d'edició. */
export function StudentOverviewConsultation({ snapshot, updatedAt, expiresAtEpochMs }) {
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState(null)
  const rows = snapshot.rows.filter((row) => row.student.name.toLocaleLowerCase('ca').includes(search.trim().toLocaleLowerCase('ca')))
  const selected = snapshot.rows.find((row) => row.student.id === detail?.id)
  const open = (type) => (id) => setDetail({ type, id })
  return <section className="student-consultation">
    <header><h1>Alumnes · {snapshot.className}</h1><p>{snapshot.subject}{snapshot.utName ? ` · ${snapshot.utName}` : ''} · Només consulta</p>
      <p>Informació actualitzada el {new Date(updatedAt).toLocaleString('ca-AD', { timeZone: 'Europe/Andorra' })} · Accés fins al {new Date(expiresAtEpochMs - 1).toLocaleDateString('ca-AD', { timeZone: 'Europe/Andorra' })}</p></header>
    <label>Cercar alumne<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
    <StudentOverviewTable rows={rows} showTutoringColumns={snapshot.showTutoringColumns} readOnly
      onOpenProfile={open('profile')} onOpenAnnotations={open('annotations')} onOpenRegistry={open('registry')}
      onOpenOtherRecords={open('other')} onOpenAbsences={open('absences')} />
    {selected && <Modal title={`${selected.student.name} · ${detail.type === 'registry' ? 'Registre tutorial' : detail.type === 'absences' ? 'Absències' : detail.type === 'other' ? 'Agenda i incidències' : detail.type === 'profile' ? 'Perfil' : 'Avaluació i anotacions'}`} onClose={() => setDetail(null)} size="lg">
      {detail.type === 'profile' && <div className="student-consultation-profile">
        <h3>Perfil</h3><p>{getDiagnosisLabels(selected.student.diagnoses, selected.student.progressReason).join(', ') || 'Sense diagnòstics marcats'}</p>
        {selected.student.isSkiStudyStudent && <p>Esquí estudi</p>}
        <p>{selected.student.diagnosisNotes || 'Sense anotacions del perfil'}</p><h3>Informació general</h3><p>{selected.student.personalNotes || 'Sense informació general'}</p>
      </div>}
      {detail.type === 'registry' && <History items={selected.records} />}
      {detail.type === 'other' && <History items={selected.otherTutorialRecords} />}
      {detail.type === 'absences' && <div><h3>{formatAbsenceHours(selected.absenceHours)}</h3>{selected.absenceRecords.length ? selected.absenceRecords.map((record) => <p key={record.id}>{formatAbsenceDateTime(record)} · {formatAbsenceHours(record.hours)}</p>) : <p>Sense absències</p>}</div>}
      {detail.type === 'annotations' && <div>
        <h3>Avaluació i seguiment</h3><p>Nota global: {selected.profile?.evaluation.grade || '—'} · Constància: {selected.profile?.tracking.hasTrackingData ? `${selected.profile.tracking.consistency}%` : '—'} · No fetes: {selected.profile?.tracking.missing || 0} · Incidències: {selected.profile?.incidents || 0}</p>
        <h3>Anotacions de seguiment</h3><History items={selected.trackingNotes} />
        <h3>Notes del Mode aula</h3><History items={selected.classroomNotes} />
        {snapshot.showTutoringColumns && <><h3>Equip educatiu i tutoria</h3><History items={selected.tutoringNotes} /></>}
      </div>}
    </Modal>}
  </section>
}
