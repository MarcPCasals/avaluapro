import { ClipboardList, FileDown, Filter, GraduationCap, UsersRound } from 'lucide-react'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'

const TUTORING_RECORD_TYPES = [
  { id: 'agenda', label: 'Notes a l’agenda', tone: 'amber' },
  { id: 'incident', label: 'Fulls d’incidents', tone: 'red' },
  { id: 'classroom-expulsion', label: 'Expulsions d’aula', tone: 'violet' },
  { id: 'center-expulsion', label: 'Expulsions de centre', tone: 'slate' },
]

function countByType(records, type) {
  return records.filter((record) => record.type === type).length
}

export function TutoringView() {
  const activeClassId = useAvaluaproStore((state) => state.ui.activeClassId)
  const classes = useAvaluaproStore((state) => state.classes)
  const students = useAvaluaproStore((state) => state.students)
  const tutorialRecords = useAvaluaproStore((state) => state.tutorialRecords)
  const activeClass = classes.find((classItem) => classItem.id === activeClassId)
  const linkedClassId = activeClass?.tutorialLinkedClassId || activeClass?.id
  const linkedClass = classes.find((classItem) => classItem.id === linkedClassId) || activeClass
  const classStudents = students
    .filter((student) => student.classId === linkedClassId)
    .sort((a, b) => a.name.localeCompare(b.name, 'ca'))
  const classTutorialRecords = tutorialRecords.filter((record) => record.classId === activeClassId)

  return (
    <section className="tutoring-view">
      <header className="tutoring-hero">
        <div>
          <span className="section-kicker">
            <GraduationCap size={17} />
            Mode tutoria
          </span>
          <h1>{activeClass?.name || 'Tutoria'}</h1>
          <p>
            Espai per recollir la visió global del grup: dades acadèmiques de totes les assignatures,
            seguiment tutorial i perfil individual de cada alumne.
          </p>
        </div>
        <aside>
          <strong>{classStudents.length}</strong>
          <span>alumnes vinculats</span>
          <small>Dades compartides amb {linkedClass?.name || 'la classe activa'}</small>
        </aside>
      </header>

      <div className="tutoring-grid">
        <article className="tutoring-card primary">
          <div>
            <ClipboardList size={24} />
            <h2>Avaluació tutorial</h2>
          </div>
          <p>
            En el següent bloc hi carregarem les competències de totes les matèries i filtres per assignatura o àrea.
          </p>
          <span>Preparat per treballar amb el fitxer de competències que has passat.</span>
        </article>

        <article className="tutoring-card">
          <div>
            <Filter size={24} />
            <h2>Seguiment tutorial</h2>
          </div>
          <p>
            Aquí es registraran notes a l’agenda, fulls d’incidents, expulsions d’aula i expulsions de centre.
          </p>
          <div className="tutorial-record-summary">
            {TUTORING_RECORD_TYPES.map((type) => (
              <span className={`tutorial-record-pill ${type.tone}`} key={type.id}>
                <strong>{countByType(classTutorialRecords, type.id)}</strong>
                {type.label}
              </span>
            ))}
          </div>
        </article>

        <article className="tutoring-card">
          <div>
            <UsersRound size={24} />
            <h2>Perfil d’alumne</h2>
          </div>
          <p>
            Quan obrim un alumne des d’aquest mode, el perfil servirà per preparar el resum tutorial i el PDF descarregable.
          </p>
          <span>{classStudents.length > 0 ? 'Llista preparada per al perfil tutorial.' : 'Afegeix alumnes per començar.'}</span>
        </article>

        <article className="tutoring-card muted">
          <div>
            <FileDown size={24} />
            <h2>PDF de tutoria</h2>
          </div>
          <p>
            El PDF vindrà després, quan tinguem definit exactament quin resum necessita el tutor per alumne i per grup.
          </p>
          <span>Encara sense generar documents, però el flux ja queda reservat.</span>
        </article>
      </div>
    </section>
  )
}
