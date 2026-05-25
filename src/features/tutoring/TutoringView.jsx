import { useMemo, useState } from 'react'
import { BookOpenCheck, ClipboardList, FileDown, Filter, GraduationCap, Layers3, UsersRound } from 'lucide-react'
import { SUBJECT_AREAS, SUBJECT_STRUCTURES } from '../../data/subjects'
import { GRADE_OPTIONS, calculateGrade, gradeClassName, gradeTextClassName } from '../../lib/grades'
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

function getSubjectArea(subjectName) {
  return SUBJECT_AREAS.find((area) => area.subjects.includes(subjectName))
}

function getSubjectOptionsForArea(areaFilter) {
  const areas = SUBJECT_AREAS.filter((area) => area.id !== 'tutorial')
  return areas
    .filter((area) => areaFilter === 'all' || area.id === areaFilter)
    .flatMap((area) =>
      area.subjects
        .filter((subject) => SUBJECT_STRUCTURES[subject])
        .map((subject) => ({
          subject,
          areaId: area.id,
          areaName: area.name,
          structure: SUBJECT_STRUCTURES[subject],
        })),
    )
}

function buildTutorialCompetencies(subject) {
  const structure = SUBJECT_STRUCTURES[subject] || []
  return structure.map((competency, competencyIndex) => ({
    ...competency,
    key: `${subject}__c${competencyIndex + 1}`,
    subject,
    competencyIndex,
    criteria: competency.criteria.map((criterion, criterionIndex) => ({
      key: `${subject}__c${competencyIndex + 1}__ca${criterionIndex + 1}`,
      name: criterion,
      order: criterionIndex + 1,
    })),
  }))
}

function getTutorialMark(tutorialMarks, classId, studentId, subject, criterionKey) {
  return (
    tutorialMarks.find(
      (mark) =>
        mark.classId === classId &&
        mark.studentId === studentId &&
        mark.subject === subject &&
        mark.criterionKey === criterionKey,
    )?.value || ''
  )
}

function SubjectCatalogCard({ item, onSelect }) {
  return (
    <article className="tutorial-subject-card">
      <div>
        <strong>{item.subject}</strong>
        <small>{item.areaName}</small>
      </div>
      <span>{item.structure.length} competències</span>
      <button className="secondary-action compact" onClick={() => onSelect(item.subject)} type="button">
        Treballar
      </button>
    </article>
  )
}

export function TutoringView() {
  const [activePanel, setActivePanel] = useState('evaluation')
  const [areaFilter, setAreaFilter] = useState('all')
  const [subjectFilter, setSubjectFilter] = useState('auto')
  const activeClassId = useAvaluaproStore((state) => state.ui.activeClassId)
  const classes = useAvaluaproStore((state) => state.classes)
  const students = useAvaluaproStore((state) => state.students)
  const tutorialRecords = useAvaluaproStore((state) => state.tutorialRecords)
  const tutorialMarks = useAvaluaproStore((state) => state.tutorialMarks)
  const updateTutorialMark = useAvaluaproStore((state) => state.updateTutorialMark)
  const activeClass = classes.find((classItem) => classItem.id === activeClassId)
  const linkedClassId = activeClass?.tutorialLinkedClassId || activeClass?.id
  const linkedClass = classes.find((classItem) => classItem.id === linkedClassId) || activeClass
  const classStudents = students
    .filter((student) => student.classId === linkedClassId)
    .sort((a, b) => a.name.localeCompare(b.name, 'ca'))
  const classTutorialRecords = tutorialRecords.filter((record) => record.classId === activeClassId)
  const subjectOptions = useMemo(() => getSubjectOptionsForArea(areaFilter), [areaFilter])
  const autoSubject =
    linkedClass?.subject && SUBJECT_STRUCTURES[linkedClass.subject] ? linkedClass.subject : subjectOptions[0]?.subject
  const selectedSubject = subjectFilter === 'auto' ? autoSubject : subjectFilter
  const selectedSubjectArea = getSubjectArea(selectedSubject)
  const selectedCompetencies = useMemo(() => buildTutorialCompetencies(selectedSubject), [selectedSubject])
  const selectedCriteria = selectedCompetencies.flatMap((competency) =>
    competency.criteria.map((criterion) => ({ ...criterion, competency })),
  )

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

      <div className="tutoring-panel-tabs" aria-label="Vistes de tutoria">
        <button
          className={activePanel === 'evaluation' ? 'active' : ''}
          onClick={() => setActivePanel('evaluation')}
          type="button"
        >
          <BookOpenCheck size={17} />
          Avaluació tutorial
        </button>
        <button
          className={activePanel === 'tracking' ? 'active' : ''}
          onClick={() => setActivePanel('tracking')}
          type="button"
        >
          <ClipboardList size={17} />
          Seguiment tutorial
        </button>
        <button
          className={activePanel === 'profile' ? 'active' : ''}
          onClick={() => setActivePanel('profile')}
          type="button"
        >
          <UsersRound size={17} />
          Perfil i PDF
        </button>
      </div>

      {activePanel === 'evaluation' && (
        <section className="tutorial-evaluation-panel">
          <div className="tutorial-filter-bar">
            <label>
              Àrea
              <select
                onChange={(event) => {
                  setAreaFilter(event.target.value)
                  setSubjectFilter('auto')
                }}
                value={areaFilter}
              >
                <option value="all">Totes les àrees</option>
                {SUBJECT_AREAS.filter((area) => area.id !== 'tutorial').map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Assignatura
              <select onChange={(event) => setSubjectFilter(event.target.value)} value={subjectFilter}>
                <option value="auto">Assignatura vinculada o primera disponible</option>
                {subjectOptions.map((item) => (
                  <option key={item.subject} value={item.subject}>
                    {item.subject}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="tutorial-subject-overview">
            {subjectOptions.map((item) => (
              <SubjectCatalogCard item={item} key={item.subject} onSelect={setSubjectFilter} />
            ))}
          </div>

          <article className="tutorial-mark-grid-card">
            <header>
              <span className="section-kicker">
                <Layers3 size={17} />
                {selectedSubjectArea?.name || 'Àrea'}
              </span>
              <div>
                <h2>{selectedSubject || 'Assignatura'}</h2>
                <p>
                  Posa la nota dels criteris per tenir una visió tutorial de totes les competències de l’alumne.
                  Aquestes notes es guarden separades de l’avaluació ordinària de cada UT.
                </p>
              </div>
            </header>

            {classStudents.length === 0 ? (
              <div className="empty-state compact">Afegeix alumnes a la classe vinculada per començar a posar notes.</div>
            ) : selectedCriteria.length === 0 ? (
              <div className="empty-state compact">Aquesta assignatura encara no té competències configurades.</div>
            ) : (
              <div className="tutorial-mark-table-wrap">
                <table className="tutorial-mark-table">
                  <thead>
                    <tr>
                      <th>Alumne</th>
                      {selectedCriteria.map(({ competency, ...criterion }) => (
                        <th key={criterion.key}>
                          <span>{competency.name}</span>
                          <strong>{criterion.name}</strong>
                        </th>
                      ))}
                      <th>Resultat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.map((student) => {
                      const rowValues = selectedCriteria.map((criterion) =>
                        getTutorialMark(tutorialMarks, activeClassId, student.id, selectedSubject, criterion.key),
                      )
                      const finalGrade = calculateGrade(rowValues)

                      return (
                        <tr key={student.id}>
                          <th>
                            {student.name}
                            <small>{student.halfGroup || 'Sense mig grup'}</small>
                          </th>
                          {selectedCriteria.map((criterion) => {
                            const value = getTutorialMark(
                              tutorialMarks,
                              activeClassId,
                              student.id,
                              selectedSubject,
                              criterion.key,
                            )
                            return (
                              <td key={`${student.id}_${criterion.key}`}>
                                <select
                                  className={gradeTextClassName(value)}
                                  onChange={(event) =>
                                    updateTutorialMark({
                                      classId: activeClassId,
                                      studentId: student.id,
                                      subject: selectedSubject,
                                      criterionKey: criterion.key,
                                      value: event.target.value,
                                    })
                                  }
                                  value={value}
                                >
                                  {GRADE_OPTIONS.map((option) => (
                                    <option key={option} value={option}>
                                      {option || '-'}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            )
                          })}
                          <td>
                            <span className={gradeClassName(finalGrade)}>{finalGrade || '-'}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </section>
      )}

      {activePanel === 'tracking' && (
        <div className="tutoring-grid">
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
        </div>
      )}

      {activePanel === 'profile' && (
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
      )}

      {activePanel === 'profile' && (
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
      )}
    </section>
  )
}
