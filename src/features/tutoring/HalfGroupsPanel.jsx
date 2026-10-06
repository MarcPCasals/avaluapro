import { hasCurrentHalfGroupRoster } from './halfGroupProposalUtils.js'
import { countStudentGenders, studentRelationWarning } from './genderBalanceUtils.js'
import './HalfGroupsPanel.css'
import { useState } from 'react'
import { analyzeHalfGroups, HALF_GROUP_NAMES, proposeHalfGroups } from './halfGroupUtils.js'

export function HalfGroupsPanel({ students, relations, onApply, savedProposals = [], onSave, onDelete, appliedMessage = 'Mitjos grups aplicats a tota l’aplicació.' }) {
  const [lockedIds, setLockedIds] = useState(() => students.filter((student) => student.halfGroupLocked).map((student) => student.id))
  const [draft, setDraft] = useState(null)
  const [proposalName, setProposalName] = useState('')
  const [selectedProposalId, setSelectedProposalId] = useState('')
  const [generated, setGenerated] = useState([])
  const [status, setStatus] = useState({ busy: false, message: '' })
  const assignments = draft || Object.fromEntries(students.map((student) => [student.id, student.halfGroup]))
  const classGenders = countStudentGenders(students)
  const gendersByGroup = HALF_GROUP_NAMES.map((name) => countStudentGenders(students.filter((student) => assignments[student.id] === name)))
  const genderImbalance = ['boy', 'girl'].some((gender) => Math.abs(gendersByGroup[0][gender] - gendersByGroup[1][gender]) > 1)
  const analysis = analyzeHalfGroups(students, relations, assignments)
  const sizes = HALF_GROUP_NAMES.map((name) => students.filter((student) => assignments[student.id] === name).length)
  const complete = sizes[0] + sizes[1] === students.length
  const balanced = Math.abs(sizes[0] - sizes[1]) <= 1
  const currentRoster = !draft || hasCurrentHalfGroupRoster(students, draft)
  function generate() {
    try {
      const next = proposeHalfGroups(students, relations, Object.fromEntries(lockedIds.map((id) => [id, assignments[id]])), {
        excludedProposals: [...generated, ...savedProposals.map((proposal) => proposal.assignments), ...(draft ? [draft] : [])],
        variant: generated.length,
      })
      setDraft(next)
      setGenerated((current) => [...current, next])
      setProposalName(`Proposta ${Math.max(savedProposals.length + 1, generated.length + 1)}`)
      setSelectedProposalId('')
      setStatus({ busy: false, message: 'Nova proposta preparada. Encara no s’ha aplicat.' })
    } catch (error) { setStatus({ busy: false, message: error.message }) }
  }
  async function save() {
    setStatus({ busy: true, message: '' })
    try {
      const saved = await onSave({ name: proposalName, assignments, lockedIds })
      setSelectedProposalId(saved.id)
      setStatus({ busy: false, message: 'Proposta desada sense aplicar-la. La pots recuperar més endavant.' })
    } catch (error) { setStatus({ busy: false, message: error.message || 'No s’ha pogut desar la proposta.' }) }
  }
  function load(proposal) {
    setDraft({ ...proposal.assignments })
    setLockedIds((proposal.lockedIds || []).filter((id) => students.some((student) => student.id === id)))
    setProposalName(proposal.name)
    setSelectedProposalId(proposal.id)
    setStatus({ busy: false, message: 'Proposta recuperada per revisar-la. Encara no s’ha aplicat.' })
  }
  async function remove(id) {
    setStatus({ busy: true, message: '' })
    try {
      await onDelete(id)
      if (selectedProposalId === id) setSelectedProposalId('')
      setStatus({ busy: false, message: 'Proposta eliminada. Els mitjos grups aplicats no han canviat.' })
    } catch { setStatus({ busy: false, message: 'No s’ha pogut eliminar la proposta.' }) }
  }
  async function apply() {
    setStatus({ busy: true, message: '' })
    try {
      await onApply(assignments, lockedIds)
      setDraft(null)
      setSelectedProposalId('')
      setProposalName('')
      setStatus({ busy: false, message: appliedMessage })
    } catch {
      setStatus({ busy: false, message: 'No s’ha pogut completar el desament. Revisa els grups i torna-ho a provar.' })
    }
  }
  return <div className="half-groups-workspace">
    <h3>Mitjos grups A/B</h3>
    <p>Equilibrem el nombre d’alumnes i el repartiment de nois i noies, respectant els bloquejos. Després, prioritat: relacions de treball → evitar relacions negatives → relacions positives d’afinitat. Dos mitjos grups amb una diferència màxima d’un alumne.</p>
    <p>En aplicar-los, s’actualitza el mig grup de cada alumne per passar llista, la disposició d’aula i les propostes cooperatives.</p>
    <p>Bloqueja un alumne a A o B per mantenir-lo en les noves propostes. Els bloquejos es desen en aplicar els mitjos grups.</p>
    <p className="half-group-legend"><span className="relation-warning">Groc: vincles negatius amb l’altre mig grup.</span> <span className="relation-danger">Vermell: vincles negatius dins del mig grup.</span> Són avisos sobre les relacions registrades, no etiquetes personals.</p>
    {classGenders.unknown > 0 && <p>{classGenders.unknown} alumne{classGenders.unknown === 1 ? '' : 's'} sense dada de noi/noia. Completa-la al perfil de l’alumne per millorar l’equilibri.</p>}
    <div className="half-groups-actions">
      <button className="primary-action" disabled={students.length < 2 || status.busy} onClick={generate} type="button">{generated.length || draft ? 'Generar una altra proposta' : 'Generar proposta A/B'}</button>
      <button className="secondary-action" disabled={!draft || !complete || !balanced || !currentRoster || status.busy} onClick={apply} type="button">{status.busy ? 'Aplicant…' : 'Aplicar mitjos grups'}</button>
      {draft && <button className="secondary-action" disabled={status.busy} onClick={() => { setDraft(null); setSelectedProposalId(''); setProposalName(''); setLockedIds(students.filter((student) => student.halfGroupLocked).map((student) => student.id)) }} type="button">Descartar proposta</button>}
    </div>
    {draft && <div className="half-group-save-row"><label>Nom de la proposta<input maxLength={100} value={proposalName} onChange={(event) => setProposalName(event.target.value)} placeholder="Posa un nom a aquesta proposta" /></label>
      <button type="button" disabled={!onSave || !complete || !balanced || !currentRoster || !proposalName.trim() || status.busy} onClick={save}>Desar sense aplicar</button>
      <span>Desa les propostes que vulguis conservar abans de generar-ne una altra. Els grups aplicats continuen igual fins que premis «Aplicar mitjos grups».</span>
    </div>}
    {!currentRoster && <p role="alert">L’alumnat ha canviat des que es va preparar aquesta proposta. Genera una nova proposta abans de desar-la o aplicar-la.</p>}
    <details className="half-group-saved-proposals" open={savedProposals.length > 0}>
      <summary>Propostes desades · {savedProposals.length}</summary>
      <p>Obre-les per comparar les llistes i els avisos. Les relacions i el gènere es revisen amb les dades actuals.</p>
      {!savedProposals.length && <p>Encara no has desat cap proposta.</p>}
      <div className="half-group-proposal-cards">{savedProposals.map((proposal) => {
        const score = analyzeHalfGroups(students, relations, proposal.assignments)
        const rosterMatches = hasCurrentHalfGroupRoster(students, proposal.assignments)
        return <article key={proposal.id}>
          <button type="button" aria-pressed={selectedProposalId === proposal.id} disabled={status.busy} onClick={() => load(proposal)}>{proposal.name}</button>
          <small>{new Date(proposal.createdAt).toLocaleString('ca', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>
          <span>Punts de treball: {score.work} · Relacions negatives: {score.conflicts.length} · Punts d’afinitat: {score.positive}</span>
          <small>A/B: {HALF_GROUP_NAMES.map((name) => students.filter((student) => proposal.assignments[student.id] === name).length).join(' / ')} · {(proposal.lockedIds || []).length} bloquejos</small>
          {!rosterMatches && <small>Alumnat modificat: cal regenerar-la.</small>}
          {onDelete && <button type="button" disabled={status.busy} onClick={() => remove(proposal.id)} aria-label={`Eliminar ${proposal.name}`}>Eliminar</button>}
        </article>
      })}</div>
    </details>
    {!relations.length && <p>No hi ha relacions registrades: la proposta equilibra el nombre d’alumnes i les dades de noi/noia disponibles.</p>}
    {analysis.conflicts.length > 0 && <div role="alert"><strong>Hi ha {analysis.conflicts.length} relacions negatives dins dels mitjos grups.</strong><p>Revisa la proposta abans d’aplicar-la. Les prioritats i l’equilibri poden entrar en conflicte.</p><ul>{analysis.conflicts.map((relation, index) => <li key={index}>{students.find((student) => student.id === relation.sourceStudentId)?.name} → {students.find((student) => student.id === relation.targetStudentId)?.name}</li>)}</ul></div>}
    {genderImbalance && <p role="alert">El repartiment de nois i noies encara és desigual. Genera una proposta o revisa els bloquejos i els canvis manuals.</p>}
    {draft && !balanced && <p role="alert">Equilibra els dos mitjos grups abans d’aplicar-los.</p>}
    <div className="half-groups-columns">{HALF_GROUP_NAMES.map((name, index) => {
      const members = students.filter((student) => assignments[student.id] === name)
      const genders = gendersByGroup[index]
      const groupRelations = analysis.internalRelations.filter((relation) => assignments[relation.sourceStudentId] === name)
      return <section key={name}><h3>{name} · {sizes[index]} alumnes</h3>
        <p className="half-group-gender-counts">{genders.boy} nois · {genders.girl} noies{genders.other > 0 && ` · ${genders.other} altra identitat`}{genders.unknown > 0 && ` · ${genders.unknown} sense informar`}</p>
        <ul>{members.map((student) => {
          const warning = studentRelationWarning(student.id, students, relations, assignments)
          const partners = [...new Set((warning.internal.length ? warning.internal : warning.negative).map((relation) => relation.sourceStudentId === student.id ? relation.targetStudentId : relation.sourceStudentId))]
          return <li key={student.id} className={warning.tone ? `half-group-member relation-${warning.tone}` : 'half-group-member'}>
          <span className="half-group-member-info"><strong>{student.name}</strong><small>{student.gender === 'boy' ? 'Noi' : student.gender === 'girl' ? 'Noia' : student.gender === 'other' ? 'Altra identitat' : 'Sense informar'}</small>
          {warning.tone && <small>{warning.internal.length ? 'Vincle negatiu dins del mig grup' : 'Vincle negatiu amb l’altre mig grup'}: {partners.map((id) => students.find((member) => member.id === id)?.name).join(', ')}.</small>}</span><div className="half-group-member-actions">
            <button disabled={status.busy} aria-pressed={lockedIds.includes(student.id)} onClick={() => {
              setDraft({ ...assignments })
              setLockedIds((current) => current.includes(student.id) ? current.filter((id) => id !== student.id) : [...current, student.id])
            }} type="button" aria-label={`${lockedIds.includes(student.id) ? 'Desbloquejar' : 'Bloquejar'} ${student.name} al ${name}`}>{lockedIds.includes(student.id) ? '🔒 Fixat' : 'Bloquejar'}</button>
            <button disabled={status.busy || lockedIds.includes(student.id)} onClick={() => setDraft({ ...assignments, [student.id]: HALF_GROUP_NAMES[index === 0 ? 1 : 0] })} type="button" aria-label={`Moure ${student.name} al ${HALF_GROUP_NAMES[index === 0 ? 1 : 0]}`}>→ {index === 0 ? 'B' : 'A'}</button>
          </div>
        </li>
        })}</ul>
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
