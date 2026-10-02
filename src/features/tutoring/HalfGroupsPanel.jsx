import './HalfGroupsPanel.css'
import { useState } from 'react'
import { analyzeHalfGroups, HALF_GROUP_NAMES, proposeHalfGroups } from './halfGroupUtils.js'

export function HalfGroupsPanel({ students, relations, onApply, appliedMessage = 'Mitjos grups aplicats a tota l’aplicació.' }) {
  const [lockedIds, setLockedIds] = useState(() => students.filter((student) => student.halfGroupLocked).map((student) => student.id))
  const [draft, setDraft] = useState(null)
  const [status, setStatus] = useState({ busy: false, message: '' })
  const assignments = draft || Object.fromEntries(students.map((student) => [student.id, student.halfGroup]))
  const analysis = analyzeHalfGroups(students, relations, assignments)
  const sizes = HALF_GROUP_NAMES.map((name) => students.filter((student) => assignments[student.id] === name).length)
  const complete = sizes[0] + sizes[1] === students.length
  const balanced = Math.abs(sizes[0] - sizes[1]) <= 1
  async function apply() {
    setStatus({ busy: true, message: '' })
    try {
      await onApply(assignments, lockedIds)
      setDraft(null)
      setStatus({ busy: false, message: appliedMessage })
    } catch {
      setStatus({ busy: false, message: 'No s’ha pogut completar el desament. Revisa els grups i torna-ho a provar.' })
    }
  }
  return <div className="half-groups-workspace">
    <h3>Mitjos grups A/B</h3>
    <p>Prioritat: relacions de treball → evitar relacions negatives → relacions positives d’afinitat. Dos mitjos grups amb una diferència màxima d’un alumne.</p>
    <p>En aplicar-los, s’actualitza el mig grup de cada alumne per passar llista, la disposició d’aula i les propostes cooperatives.</p>
    <p>Bloqueja un alumne a A o B per mantenir-lo en les noves propostes. Els bloquejos es desen en aplicar els mitjos grups.</p>
    <div className="half-groups-actions">
      <button className="primary-action" disabled={students.length < 2 || status.busy} onClick={() => { try { setDraft(proposeHalfGroups(students, relations, Object.fromEntries(lockedIds.map((id) => [id, assignments[id]])))); setStatus({ busy: false, message: '' }) } catch (error) { setStatus({ busy: false, message: error.message }) } }} type="button">Generar proposta A/B</button>
      <button className="secondary-action" disabled={!draft || !complete || !balanced || status.busy} onClick={apply} type="button">{status.busy ? 'Aplicant…' : 'Aplicar mitjos grups'}</button>
      {draft && <button className="secondary-action" disabled={status.busy} onClick={() => { setDraft(null); setLockedIds(students.filter((student) => student.halfGroupLocked).map((student) => student.id)) }} type="button">Descartar proposta</button>}
    </div>
    {!relations.length && <p>No hi ha relacions registrades: la proposta només equilibra el nombre d’alumnes.</p>}
    {analysis.conflicts.length > 0 && <div role="alert"><strong>Hi ha {analysis.conflicts.length} relacions negatives dins dels mitjos grups.</strong><p>Revisa la proposta abans d’aplicar-la. Les prioritats i l’equilibri poden entrar en conflicte.</p><ul>{analysis.conflicts.map((relation, index) => <li key={index}>{students.find((student) => student.id === relation.sourceStudentId)?.name} → {students.find((student) => student.id === relation.targetStudentId)?.name}</li>)}</ul></div>}
    {draft && !balanced && <p role="alert">Equilibra els dos mitjos grups abans d’aplicar-los.</p>}
    <div className="half-groups-columns">{HALF_GROUP_NAMES.map((name, index) => {
      const groupRelations = analysis.internalRelations.filter((relation) => assignments[relation.sourceStudentId] === name)
      return <section key={name}><h3>{name} · {sizes[index]} alumnes</h3>
        <ul>{students.filter((student) => assignments[student.id] === name).map((student) => <li key={student.id}>
          <span>{student.name}</span><div className="half-group-member-actions">
            <button disabled={status.busy} aria-pressed={lockedIds.includes(student.id)} onClick={() => {
              setDraft({ ...assignments })
              setLockedIds((current) => current.includes(student.id) ? current.filter((id) => id !== student.id) : [...current, student.id])
            }} type="button" aria-label={`${lockedIds.includes(student.id) ? 'Desbloquejar' : 'Bloquejar'} ${student.name} al ${name}`}>{lockedIds.includes(student.id) ? '🔒 Fixat' : 'Bloquejar'}</button>
            <button disabled={status.busy || lockedIds.includes(student.id)} onClick={() => setDraft({ ...assignments, [student.id]: HALF_GROUP_NAMES[index === 0 ? 1 : 0] })} type="button" aria-label={`Moure ${student.name} al ${HALF_GROUP_NAMES[index === 0 ? 1 : 0]}`}>→ {index === 0 ? 'B' : 'A'}</button>
          </div>
        </li>)}</ul>
        <details className="half-group-relations"><summary>Relacions internes · {groupRelations.length}</summary>
          <p>Cada fletxa indica el sentit de la relació registrada.</p>
          {[[ 'positive', 'Relacions de treball' ], [ 'avoid', 'Relacions negatives' ], [ 'friendship', 'Afinitats positives' ]].map(([type, label]) => {
            const rows = groupRelations.filter((relation) => relation.type === type)
            return <div key={type}><h4>{label} · {rows.length}</h4>{rows.length ? <ul>{rows.map((relation, relationIndex) => <li key={relation.id || relationIndex}>
              {students.find((student) => student.id === relation.sourceStudentId)?.name} → {students.find((student) => student.id === relation.targetStudentId)?.name}
              {relation.strength && <small>Intensitat: {relation.strength}/5</small>}
            </li>)}</ul> : <p>Cap relació registrada d’aquest tipus dins del mig grup.</p>}</div>
          })}
        </details>
      </section>
    })}</div>
    {!complete && <p>{students.length - sizes[0] - sizes[1]} alumnes sense assignació A/B. Genera una proposta per incloure tot el grup.</p>}
    <p role="status">{status.message}</p>
  </div>
}
