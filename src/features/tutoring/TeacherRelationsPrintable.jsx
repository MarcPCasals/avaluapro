import { buildTeacherRelationshipReport } from './teacherRelationshipReport'

const SECTIONS = [
  { key: 'work', title: 'Treballa bé amb' },
  { key: 'social', title: 'S’hi relaciona sovint' },
  { key: 'avoid', title: 'Evitar de moment' },
]

export function TeacherRelationshipReport({ students, relations, includeQuestionnaire }) {
  const report = buildTeacherRelationshipReport({ students, relations, includeQuestionnaire })
  return <section className="teacher-relationship-report" aria-label="Informe de relacions per a l’equip docent">
    <div className="teacher-relationship-intro">
      <strong>Ús intern de l’equip docent</strong>
      <p>{report.relationCount} relacions registrades: {report.teacherCount} de criteri docent{includeQuestionnaire ? ` i ${report.questionnaireCount} del qüestionari de l’alumnat` : ''}. La llista de cada alumne mostra les relacions registrades des d’aquell alumne. A les parelles, → indica la direcció registrada i ↔ indica tots dos sentits.</p>
      <p>Registre orientatiu per preparar parelles, grups i llocs a l’aula. «Evitar de moment» indica una precaució pedagògica temporal.</p>
    </div>
    {report.relationCount === 0 ? <p className="teacher-relationship-empty">Encara no hi ha relacions dels orígens seleccionats per a aquest grup.</p> : <>
      <div className="teacher-relationship-students">
        <h3>Relacions per alumne</h3>
        {report.rows.map(({ student, work, social, avoid }) => <article key={student.id}>
          <h4>{student.name}</h4>
          {work.length + social.length + avoid.length === 0 ? <span className="teacher-relationship-no-rows">Sense relacions registrades des d’aquest alumne.</span> :
          <div className="teacher-relationship-student-grid">
            {SECTIONS.map(({ key, title }) => {
              const items = { work, social, avoid }[key]
              return <div key={key} className={`teacher-relationship-${key}`}>
                <strong>{title}</strong>
                {items.length ? <ul>{items.map((item) => <li key={item.id || `${student.id}-${key}-${item.name}`}>{item.name}{includeQuestionnaire && <small> · {item.source}</small>}</li>)}</ul> : <span>Sense registres</span>}
              </div>
            })}
          </div>}
        </article>)}
      </div>
      <div className="teacher-relationship-pairs">
        <h3>Consulta ràpida de parelles</h3>
        {SECTIONS.map(({ key, title }) => <section key={key}>
          <h4>{title}</h4>
          {report.pairs[key].length ? <ul>{report.pairs[key].map((pair) => <li key={pair.key}>{pair.label}{includeQuestionnaire && <small> · {pair.sources}</small>}</li>)}</ul> : <p>Sense registres</p>}
        </section>)}
      </div>
    </>}
  </section>
}
