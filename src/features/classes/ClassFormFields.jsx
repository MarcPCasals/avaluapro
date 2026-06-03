import { CLASS_COLORS } from '../../data/classColors'
import { SUBJECT_AREAS } from '../../data/subjects'

export function ClassFormFields({ value, onChange }) {
  return (
    <>
      <label className="field-label">
        Nom de la classe
        <input
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder="Ex: 2n B"
          value={value.name}
        />
        <span className="field-hint">
          Escriu el curs i el grup amb espai, per exemple “2n B”. Això ajuda a compartir notes amb altres docents sense
          confusions.
        </span>
      </label>
      <label className="field-label">
        Assignatura de la classe
        <select
          onChange={(event) => onChange({ subject: event.target.value })}
          value={value.subject || ''}
        >
          <option value="">Selecciona assignatura</option>
          {SUBJECT_AREAS.map((area) => (
            <optgroup key={area.id} label={area.name}>
              {area.subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label className="field-label">
        Tutor/a o tutors
        <input
          onChange={(event) => onChange({ tutors: event.target.value })}
          placeholder="Ex: Marta Vila i Marc Pérez"
          value={value.tutors || ''}
        />
        <span className="field-hint">
          És només un recordatori intern per saber qui acompanya el grup, especialment si hi ha cotutoria.
        </span>
      </label>
      <div className="field-label">
        Color de la classe
        <div className="class-color-picker">
          {CLASS_COLORS.map((color) => (
            <button
              className={`class-color-option ${color.id} ${value.color === color.id ? 'active' : ''}`}
              key={color.id}
              onClick={() => onChange({ color: color.id })}
              title={color.label}
              type="button"
            >
              <span />
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
