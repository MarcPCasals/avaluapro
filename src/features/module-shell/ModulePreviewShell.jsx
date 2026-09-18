export function ModulePreviewShell({ accent, actions, children, description, eyebrow, icon: Icon, title }) {
  return (
    <section className={`module-preview-shell ${accent}`}>
      <header className="module-preview-hero">
        <span className="module-preview-icon" aria-hidden="true">
          <Icon size={24} />
        </span>
        <div>
          <span className="module-preview-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </header>
      {actions?.length > 0 && (
        <nav className="module-preview-actions" aria-label={`Vistes de ${title}`}>
          {actions.map(({ icon: ActionIcon, label }) => (
            <button aria-disabled="true" disabled key={label} type="button">
              <ActionIcon size={17} />
              {label}
            </button>
          ))}
        </nav>
      )}
      <div className="module-preview-content">{children}</div>
    </section>
  )
}
