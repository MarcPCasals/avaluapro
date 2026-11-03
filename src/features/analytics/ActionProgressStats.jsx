import { useMemo, useState } from 'react'
import { Modal } from '../../components/Modal'
import { buildActionProgress } from '../../lib/actionProgress'
import { gradeClassName } from '../../lib/grades'
import { getGradeFromAverage } from '../../lib/studentEvaluation'
import './ActionProgressStats.css'

const trendLabels = { up: 'Millora', down: 'Retrocedeix', stable: 'Estable', insufficient: 'Calen dues UT amb nota', incomparable: 'Sense alumnat comparable' }
const number = value => value.toLocaleString('ca-ES', { maximumFractionDigits: 2 })

function Distribution({ cell }) {
  return <span className="action-distribution" aria-label={Object.entries(cell.distribution).map(([grade, count]) => `${grade}: ${count}`).join(', ')}>
    {Object.entries(cell.distribution).filter(([, count]) => count > 0).map(([grade, count]) =>
      <span key={grade} className={`action-distribution-${grade}`} style={{ flexGrow: count }} title={`${grade}: ${count}`} />)}
  </span>
}

export function ActionProgressStats({ state, classId, studentId }) {
  const [scope, setScope] = useState('specific')
  const [search, setSearch] = useState('')
  const [competency, setCompetency] = useState('')
  const [filter, setFilter] = useState('all')
  const [detail, setDetail] = useState(null)
  const [showMeasures, setShowMeasures] = useState(false)
  const report = useMemo(() => buildActionProgress(state, classId, { studentId, scope }),
    [state, classId, studentId, scope])
  const { rows, uts, individual } = report
  const measureGroups = rows.map(row => ({ row, notes: row.cells.flatMap(cell => cell.notes
    .filter(note => note.orientation).map(note => ({ ...note, ut: cell.ut }))) })).filter(group => group.notes.length)
  const measureCount = measureGroups.reduce((sum, group) => sum + group.notes.length, 0)
  const withEvidence = rows.filter(row => row.latest)
  const query = search.toLocaleLowerCase('ca')
  const visibleRows = rows.filter(row => (!competency || row.competencyName === competency)
    && `${row.action.id} ${row.action.description} ${row.criterionName}`.toLocaleLowerCase('ca').includes(query)
    && (filter === 'all' || filter === 'observed' && row.latest || filter === 'unobserved' && !row.latest
      || filter === 'down' && row.trend.kind === 'down'))
  const groups = [...new Set(visibleRows.map(row => row.competencyName))]
  const selectScope = value => { setScope(value); setCompetency(''); setDetail(null); setShowMeasures(false) }
  return <section className="action-progress-stats" aria-label={individual ? 'Evolució individual de les accions' : 'Evolució de les accions de la classe'}>
    <header><h3>Evolució de les accions · {individual ? 'Individual' : 'Classe'}</h3>
      <p>Cada acció té la seva pròpia nota. La nota del criteri és la més baixa de les accions qualificades; si en falta alguna, és provisional. Les notes antigues de criteri no es converteixen en notes d’accions.</p>
    </header>
    <div className="action-progress-filters">
      <label>Àmbit<select value={scope} onChange={event => selectScope(event.target.value)}><option value="specific">Específiques</option><option value="transversal">Transversals</option></select></label>
      <label>Competència<select value={competency} onChange={event => setCompetency(event.target.value)}><option value="">Totes</option>{[...new Set(rows.map(row => row.competencyName))].map(name => <option key={name} value={name}>{name}</option>)}</select></label>
      <label>Accions<select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">Totes</option><option value="observed">Amb dades</option><option value="unobserved">Sense dades</option><option value="down">Retrocedeixen</option></select></label>
      <label>Cercar acció<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Codi o descripció" /></label>
    </div>
    <div className="action-progress-summary" aria-label="Resum d’accions">
      <span><strong>{withEvidence.length}/{rows.length}</strong> accions amb dades</span>
      <span><strong>{rows.filter(row => row.trend.kind === 'up').length}</strong> milloren</span>
      <span><strong>{rows.filter(row => row.trend.kind === 'down').length}</strong> retrocedeixen</span>
      <span><strong>{rows.filter(row => row.selectedUtCount === 0).length}</strong> encara no seleccionades</span>
      <button type="button" onClick={() => setShowMeasures(true)} aria-label={`${measureCount} mesures educatives. Veure mesures per acció`}><strong>{measureCount}</strong> mesures educatives</button>
    </div>
    {!rows.length ? <p>Encara no hi ha cap catàleg d’accions en aquest àmbit. Carrega’l des d’«Accions de la UT», a la pantalla d’avaluació.</p>
      : !visibleRows.length ? <p>Cap acció coincideix amb els filtres.</p>
        : groups.map(name => <details className="action-progress-competency" key={name} open>
          <summary>{name}</summary>
          {[...new Set(visibleRows.filter(row => row.competencyName === name).map(row => row.key))].map(key => {
            const criterionRows = visibleRows.filter(row => row.competencyName === name && row.key === key)
            return <details className="action-progress-criterion" key={key} open>
              <summary>{criterionRows[0].criterionName} <small>({criterionRows.length} accions)</small></summary>
              <div className="action-progress-scroll"><table className="action-progress-table">
                <caption>{name} · {criterionRows[0].criterionName} · {individual ? 'Nota de cada acció per UT' : 'Mitjana i distribució per acció i UT'}</caption>
                <thead><tr><th scope="col">Acció</th>{uts.map(ut => <th scope="col" key={ut.id}>{ut.name}</th>)}<th scope="col">Última amb nota</th><th scope="col">Evolució</th></tr></thead>
                <tbody>{criterionRows.map(row => <tr key={row.id}>
                  <th scope="row">{!row.action.id.startsWith('text:') && <strong>{row.action.id}</strong>}<span>{row.action.description}</span><small>{row.criterionName}</small></th>
                  {row.cells.map(cell => <td key={cell.ut.id}>
                    {!cell.selected ? <span className="action-progress-empty">No seleccionada</span>
                      : !cell.evaluated ? <span className="action-progress-empty">Pendent de nota</span>
                        : individual ? <span className={gradeClassName(cell.grades[0].grade)}>{cell.grades[0].grade}</span>
                          : <button className="action-progress-cell" type="button" onClick={() => setDetail({ row, cell })} aria-label={`${row.action.id.startsWith('text:') ? row.action.description : row.action.id} · ${cell.ut.name}: mitjana ${number(cell.score)}, ${cell.evaluated} de ${report.students.length} alumnes amb nota. Veure detall`}>
                            <span className="action-progress-score"><strong className={gradeClassName(getGradeFromAverage(cell.score))}>{getGradeFromAverage(cell.score)}</strong><span>{number(cell.score)}<small>/4</small></span></span><Distribution cell={cell} />
                            <small>{cell.evaluated}/{report.students.length} amb nota</small>
                          </button>}
                  </td>)}
                  <td>{row.latest ? <>{individual ? <span className={gradeClassName(row.latest.grades[0].grade)}>{row.latest.grades[0].grade}</span>
                    : <strong>{row.latest.achievedPercent}% A/B</strong>}<small>{row.latest.ut.name}{!individual && ` · n=${row.latest.evaluated}`}</small></> : <span className="action-progress-empty">Sense dades</span>}</td>
                  <td><span className={`action-progress-trend ${row.trend.kind}`}>{trendLabels[row.trend.kind]}</span>
                    {row.trend.count > 0 && <small>{row.trend.firstUt.name} → {row.trend.lastUt.name}{!individual && ` · mateixos ${row.trend.count} alumnes`}</small>}
                  </td>
                </tr>)}</tbody>
              </table></div>
            </details>
          })}
        </details>)}
    <p className="action-progress-method">A=4, B=3, C=2, D=1 i NA=1. La lletra de la mitjana és A a partir de 3,5; B a partir de 2,5; C a partir d’1,5; D per sota. Les UT sense selecció o sense nota no compten com a zero. L’evolució compara la primera i l’última UT amb nota{!individual && ', només amb els alumnes que tenen nota en totes dues'}.</p>
    {detail && <Modal title={`${detail.row.action.id.startsWith('text:') ? 'Acció' : detail.row.action.id} · ${detail.cell.ut.name}`} onClose={() => setDetail(null)}>
      <p>{detail.row.action.description}</p><p>Criteri: {detail.row.criterionName}. {detail.cell.pending} alumnes pendents de nota.</p>
      <ActionProgressStudentList cell={detail.cell} students={report.students} />
    </Modal>}
    {showMeasures && <Modal title={`Mesures educatives (${measureCount})`} onClose={() => setShowMeasures(false)} size="lg">
      <p>Anotacions marcades com a orientació o mesura educativa, agrupades per acció. Cada anotació d’un alumne en una UT compta com una mesura.</p>
      <ActionProgressMeasures groups={measureGroups} />
    </Modal>}
  </section>
}

export function ActionProgressStudentList({ cell, students }) {
  const [expanded, setExpanded] = useState({})
  return <ul className="action-progress-student-list">{students.map(student => {
    const grade = cell.grades.find(item => item.studentId === student.id)?.grade
    const note = cell.notes.find(item => item.studentId === student.id)
    return <li key={student.id}>
      <div className="action-progress-student-row"><span>{student.name}</span><div>
        {note && <button type="button" className="secondary-action compact" aria-label={`Notes de ${student.name}`} aria-expanded={Boolean(expanded[student.id])}
          onClick={() => setExpanded(current => ({ ...current, [student.id]: !current[student.id] }))}>Notes</button>}
        {grade ? <strong className={gradeClassName(grade)}>{grade}</strong> : <span className="action-progress-empty">Pendent de nota</span>}
      </div></div>
      {note && expanded[student.id] && <div className="action-progress-note"><strong>{note.orientation ? 'Orientació / mesura educativa' : 'Anotació'}</strong><p>{note.text}</p></div>}
    </li>
  })}</ul>
}

export function ActionProgressMeasures({ groups }) {
  return groups.length === 0 ? <p>Encara no hi ha mesures educatives anotades en aquest àmbit.</p> : groups.map(({ row, notes }) =>
    <section className="action-progress-measures" key={row.id}>
      <h3>{!row.action.id.startsWith('text:') && `${row.action.id} · `}{row.action.description}</h3>
      <small>{row.competencyName} · {row.criterionName}</small>
      {notes.map(note => <article className="action-progress-note" key={`${note.studentId}:${note.criterionId}`}>
        <strong>{note.name} · {note.ut.name}</strong><p>{note.text}</p>
      </article>)}
    </section>)
}
