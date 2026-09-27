export function AbsenceControl({ activeRecord = null, onToggle, totalHours = 0 }) {
  const title = activeRecord
    ? `Absència registrada avui a les ${activeRecord.time}. Clica per desfer-la.`
    : `Registrar 1 hora d’absència ara${totalHours > 0 ? ` · Total: ${totalHours} h` : ''}`

  return (
    <button
      aria-label={title}
      aria-pressed={Boolean(activeRecord)}
      className={`absence-toggle ${activeRecord ? 'active' : ''}`}
      onClick={onToggle}
      title={title}
      type="button"
    >
      A
    </button>
  )
}
