import { useId, useState } from 'react'
import { summarizeSociometricGender } from './sociometricGenderUtils.js'
import { SociometricGenderPanel } from './SociometricGenderPanel.jsx'
import './SociogramInsights.css'

export function SociogramInsights({ students, rows, metrics, subgroups, hasRelations, onSelectStudent }) {
  const [expanded, setExpanded] = useState('')
  const detailsId = useId()
  const report = summarizeSociometricGender(students, rows, hasRelations)
  const toggle = (key) => setExpanded((current) => current === key ? '' : key)
  const genderCard = (metric, label) => {
    const comparison = report.comparisons.find((item) => item.metric === metric)
    return <button className="sociogram-insight-card interactive" type="button" aria-expanded={expanded === 'gender'} aria-controls={detailsId} onClick={() => toggle('gender')}>
      <span className="sociogram-insight-label">{label}</span>
      {report.groups.map((group) => <strong className="sociogram-gender-value" key={group.gender}>{group.gender === 'boy' ? 'Nois' : 'Noies'}: {group.total && hasRelations ? `${Math.round(group[metric] / group.total * 100)}%` : '—'}<small>{group[metric]}/{group.total}</small></strong>)}
      <small>{!hasRelations ? 'Sense relacions' : report.counts.unknown > 0 ? 'Dades incompletes' : !report.eligible ? 'Dades insuficients' : comparison.signal ? `Senyal exploratori: més ${comparison.higher === 'boy' ? 'nois' : 'noies'}` : 'Sense evidència clara'}</small>
      <small className="sociogram-insight-action">Veure comparació {expanded === 'gender' ? '▴' : '▾'}</small>
    </button>
  }
  return <div className="sociogram-insights">
    <div className="sociogram-insights-grid">
      <article className="sociogram-insight-card"><span className="sociogram-insight-label">Cohesió</span><strong>{metrics.density}%</strong><small>Densitat social registrada.</small></article>
      <article className="sociogram-insight-card"><span className="sociogram-insight-label">Inclusió</span><strong>{metrics.inclusion}%</strong><small>Amb almenys una afinitat.</small></article>
      {genderCard('rejected', 'Rebuig per gènere')}
      <article className="sociogram-insight-card"><span className="sociogram-insight-label">Rebuig</span><strong>{metrics.rejectionDensity}%</strong><small>Densitat de rebuig social.</small></article>
      <button className="sociogram-insight-card interactive" type="button" aria-expanded={expanded === 'subgroups'} aria-controls={detailsId} onClick={() => toggle('subgroups')}><span className="sociogram-insight-label">Subgrups</span><strong>{subgroups.length}</strong><small>Connectats per afinitats · 2+ alumnes.</small><small className="sociogram-insight-action">Veure alumnes {expanded === 'subgroups' ? '▴' : '▾'}</small></button>
      {genderCard('leaders', 'Lideratge per gènere')}
    </div>
    <div id={detailsId}>
      {expanded === 'gender' && <SociometricGenderPanel students={students} rows={rows} hasRelations={hasRelations} />}
      {expanded === 'subgroups' && <section className="sociogram-subgroup-details" aria-label="Alumnes dels subgrups"><h3>Qui forma cada subgrup?</h3><p>Un subgrup connecta alumnes mitjançant vincles d’afinitat directes o indirectes. No cal que tots es triïn entre ells. Les relacions de treball i de rebuig no formen aquests subgrups.</p>
        {!subgroups.length && <p>No hi ha cap subgrup de dos o més alumnes amb afinitats registrades.</p>}
        {subgroups.length === 1 && subgroups[0].members.length === students.length && <p>El subgrup inclou tota la classe: tots estan connectats per alguna cadena d’afinitats.</p>}
        {subgroups.map((group, index) => <article key={group.id}><h4>Subgrup {index + 1} · {group.members.length} alumnes</h4><ul>{group.members.map((student) => <li key={student.id}>{onSelectStudent ? <button type="button" onClick={() => onSelectStudent(student.id)}>{student.name}</button> : student.name}</li>)}</ul></article>)}
      </section>}
    </div>
  </div>
}
