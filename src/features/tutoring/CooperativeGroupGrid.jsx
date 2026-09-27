export function CooperativeGroupGrid({
  groups = [],
  onSelectGroup,
  selectedGroupId = '',
}) {
  return (
    <div className="safe-cooperative-group-grid" data-cooperative-group-grid>
      {groups.map((group) => {
        const selected = group.id === selectedGroupId
        return (
          <button
            aria-pressed={selected}
            className={`${group.tone || ''} ${selected ? 'selected' : ''}`}
            data-cooperative-group={group.id}
            key={group.id}
            onClick={() => onSelectGroup?.(group)}
            type="button"
          >
            <header>
              <div>
                <span>{group.name}</span>
                <strong>{group.members.length} alumnes</strong>
              </div>
              <em>{group.status}</em>
            </header>
            <div className="safe-cooperative-members">
              {group.members.map((member) => (
                <span data-cooperative-student={member.student.id} key={member.student.id}>
                  <strong>{member.student.name}</strong>
                  <small>{member.category}</small>
                </span>
              ))}
            </div>
          </button>
        )
      })}
    </div>
  )
}
