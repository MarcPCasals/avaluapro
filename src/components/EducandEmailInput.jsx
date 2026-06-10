export function EducandEmailInput({
  label = 'Correu',
  onChange,
  placeholder = 'nom.usuari',
  value,
}) {
  const showsSuffix = !String(value || '').includes('@')

  return (
    <label className="field-label">
      {label}
      <span className="educand-email-field">
        <input
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          value={value}
        />
        {showsSuffix && <span>@educand.ad</span>}
      </span>
    </label>
  )
}
