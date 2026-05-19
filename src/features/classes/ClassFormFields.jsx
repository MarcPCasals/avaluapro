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
