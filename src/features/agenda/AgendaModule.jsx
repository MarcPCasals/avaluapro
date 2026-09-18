import { Bell, CalendarDays, Clock3, ListChecks, Route } from 'lucide-react'
import { ModulePreviewShell } from '../module-shell/ModulePreviewShell'
import '../module-shell/modulePreviewShell.css'

export default function AgendaModule() {
  return (
    <ModulePreviewShell
      accent="orange"
      actions={[
        { label: 'Avui', icon: CalendarDays },
        { label: 'Setmana', icon: Clock3 },
        { label: 'Cronologia dels grups', icon: Route },
      ]}
      description="Consulta què toca avui, prepara la propera classe i mantén les sessions connectades amb la programació."
      eyebrow="Vista en preparació"
      icon={CalendarDays}
      title="Agenda"
    >
      <article className="module-preview-panel wide">
        <header>
          <CalendarDays size={20} />
          <h2>Avui</h2>
        </header>
        <div className="module-preview-empty">
          <Clock3 size={28} />
          <strong>Encara no hi ha cap horari connectat</strong>
          <span>Quan el configuris, aquí veuràs les sessions del dia i el detall de la propera classe.</span>
        </div>
      </article>
      <article className="module-preview-panel">
        <header>
          <Bell size={20} />
          <h2>Recordatoris</h2>
        </header>
        <p>Es mostraran els avisos d’avui i dels tres dies següents.</p>
      </article>
      <article className="module-preview-panel">
        <header>
          <ListChecks size={20} />
          <h2>Tasques pendents</h2>
        </header>
        <p>Les entregues i recuperacions de l’alumnat quedaran accessibles des d’aquesta pantalla.</p>
      </article>
    </ModulePreviewShell>
  )
}
