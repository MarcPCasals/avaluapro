import { useMemo, useState } from 'react'
import { Plus, ShieldCheck, Trash2, Users } from 'lucide-react'
import { DIAGNOSIS_LIBRARY_ITEMS } from '../../data/diagnosisLibrary'
import { createId } from '../../lib/ids'

function libraryMeasures(profile) {
  const sections = profile.sections
    .filter((section) => !section.title.includes('Descripció'))
    .flatMap((section) => section.items)
  return [...new Set([...profile.summary, ...sections])]
}

function orderedStudents(students) {
  return [...students].sort((left, right) => String(left.name).localeCompare(String(right.name), 'ca'))
}

function studentMatchesProfile(student, profileId) {
  if (profileId === 'down-syndrome') return student.progressReason === 'down-syndrome'
  return (student.diagnoses || []).includes(profileId)
}

export function PlanningDiversityEditor({ classes, measures, onChange, students }) {
  const availableClasses = useMemo(() => classes.filter((classItem) => students.some((student) => student.classId === classItem.id)), [classes, students])
  const [classId, setClassId] = useState(availableClasses[0]?.id || '')
  const [profileId, setProfileId] = useState(DIAGNOSIS_LIBRARY_ITEMS[0]?.id || '')
  const profile = DIAGNOSIS_LIBRARY_ITEMS.find((item) => item.id === profileId) || DIAGNOSIS_LIBRARY_ITEMS[0]
  const suggestions = profile ? libraryMeasures(profile) : []
  const [label, setLabel] = useState(suggestions[0] || '')
  const classStudents = useMemo(() => orderedStudents(students.filter((student) => student.classId === classId)), [classId, students])
  const matchingStudentIds = useMemo(() => classStudents.filter((student) => studentMatchesProfile(student, profileId)).map((student) => student.id), [classStudents, profileId])
  const [studentIds, setStudentIds] = useState(() => students
    .filter((student) => student.classId === (availableClasses[0]?.id || '') && studentMatchesProfile(student, DIAGNOSIS_LIBRARY_ITEMS[0]?.id))
    .map((student) => student.id))

  const changeProfile = (nextProfileId) => {
    const nextProfile = DIAGNOSIS_LIBRARY_ITEMS.find((item) => item.id === nextProfileId)
    setProfileId(nextProfileId)
    setLabel(libraryMeasures(nextProfile)[0] || '')
    setStudentIds(classStudents.filter((student) => studentMatchesProfile(student, nextProfileId)).map((student) => student.id))
  }
  const changeClass = (nextClassId) => {
    setClassId(nextClassId)
    setStudentIds(students.filter((student) => student.classId === nextClassId && studentMatchesProfile(student, profileId)).map((student) => student.id))
  }
  const add = () => {
    const cleanLabel = String(label || '').trim()
    if (!cleanLabel) return
    const selectedStudents = classStudents.filter((student) => studentIds.includes(student.id))
    const classItem = classes.find((item) => item.id === classId)
    onChange([...measures, {
      id: createId('plan-measure'),
      label: cleanLabel,
      classId: classId || null,
      className: classItem?.name || classItem?.label || null,
      studentIds: selectedStudents.map((student) => student.id),
      studentNames: selectedStudents.map((student) => student.name),
    }])
  }

  return (
    <section className="planning-diversity-editor">
      <header><div><ShieldCheck size={17} /><div><strong>Atenció a la diversitat</strong><span>Només s’afegeix quan decideixes aplicar una mesura.</span></div></div></header>
      {measures.length > 0 && (
        <div className="planning-measure-list">
          {measures.map((measure) => (
            <article key={measure.id}>
              <div><strong>{measure.label}</strong><span><Users size={13} />{measure.studentNames?.length ? measure.studentNames.join(', ') : 'Mesura general'}</span></div>
              <button aria-label="Eliminar mesura" className="icon-action danger" onClick={() => onChange(measures.filter((item) => item.id !== measure.id))} type="button"><Trash2 size={15} /></button>
            </article>
          ))}
        </div>
      )}
      <details>
        <summary><Plus size={14} />Aplicar una mesura</summary>
        <div className="planning-diversity-builder">
          <div className="planning-form-row">
            <label>Classe<select value={classId} onChange={(event) => changeClass(event.target.value)}>
              <option value="">Sense alumnat concret</option>
              {availableClasses.map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.name || classItem.label}</option>)}
            </select></label>
            <label>Biblioteca d’orientacions<select value={profileId} onChange={(event) => changeProfile(event.target.value)}>
              {DIAGNOSIS_LIBRARY_ITEMS.map((item) => <option key={item.id} value={item.id}>{item.shortTitle}</option>)}
            </select></label>
          </div>
          <label>Mesura<select value={label} onChange={(event) => setLabel(event.target.value)}>
            {suggestions.map((suggestion) => <option key={suggestion} value={suggestion}>{suggestion}</option>)}
          </select></label>
          {classId && (
            <fieldset className="planning-student-picker">
              <legend>Alumnat al qual s’aplicarà</legend>
              {matchingStudentIds.length > 0 && <small>S’han preseleccionat els perfils coincidents d’AvaluaPro. Pots canviar la selecció.</small>}
              <div>{classStudents.map((student) => (
                <label key={student.id}><input checked={studentIds.includes(student.id)} onChange={(event) => setStudentIds((current) => event.target.checked ? [...current, student.id] : current.filter((id) => id !== student.id))} type="checkbox" />{student.name}</label>
              ))}</div>
            </fieldset>
          )}
          <button className="secondary-action compact" onClick={add} type="button"><Plus size={15} />Afegir la mesura</button>
          <p><ShieldCheck size={14} />La UP desarà la mesura i l’alumnat seleccionat. No copiarà el diagnòstic ni les notes personals d’AvaluaPro.</p>
        </div>
      </details>
    </section>
  )
}
