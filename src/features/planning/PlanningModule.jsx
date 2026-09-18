import { BookOpenText, Boxes, FileText, Sparkles } from 'lucide-react'
import { ModulePreviewShell } from '../module-shell/ModulePreviewShell'
import '../module-shell/modulePreviewShell.css'

export default function PlanningModule() {
  return (
    <ModulePreviewShell
      accent="purple"
      actions={[
        { label: 'Unitats de programació', icon: BookOpenText },
        { label: 'Biblioteca d’activitats', icon: Boxes },
        { label: 'Documents', icon: FileText },
      ]}
      description="Crea les UP, ordena les activitats i conserva cada versió del curs en un espai coherent amb AvaluaPro."
      eyebrow="Vista en preparació"
      icon={BookOpenText}
      title="Programació"
    >
      <article className="module-preview-panel wide">
        <header>
          <BookOpenText size={20} />
          <h2>Unitats de programació</h2>
        </header>
        <div className="module-preview-empty">
          <Sparkles size={28} />
          <strong>La primera UP apareixerà aquí</strong>
          <span>Podràs partir d’una plantilla, recuperar una UP anterior o començar-ne una de nova.</span>
        </div>
      </article>
      <article className="module-preview-panel">
        <header>
          <Boxes size={20} />
          <h2>Accés ràpid</h2>
        </header>
        <ul className="module-preview-list">
          <li><span className="module-preview-dot" />Activitats reutilitzables</li>
          <li><span className="module-preview-dot" />Materials i enllaços</li>
          <li><span className="module-preview-dot" />Versions de cursos anteriors</li>
        </ul>
      </article>
      <article className="module-preview-panel">
        <header>
          <FileText size={20} />
          <h2>Document de direcció</h2>
        </header>
        <p>La mateixa programació servirà per preparar les classes i generar el document editable quan estigui completa.</p>
      </article>
    </ModulePreviewShell>
  )
}
