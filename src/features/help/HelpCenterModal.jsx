import {
  BarChart3,
  BookOpenCheck,
  ClipboardCheck,
  Cloud,
  Database,
  GraduationCap,
  HelpCircle,
  PlayCircle,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { Modal } from '../../components/Modal'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'

const quickStart = [
  {
    icon: GraduationCap,
    title: '1. Matèria principal',
    text: 'Serveix perquè les classes noves ja surtin amb les competències de la matèria. Sempre pots canviar una classe concreta.',
  },
  {
    icon: Users,
    title: '2. Classes i alumnes',
    text: 'Crea o revisa classes, importa alumnes i assigna mitjos grups. Les fotos es carreguen des del dispositiu.',
  },
  {
    icon: BookOpenCheck,
    title: '3. Avaluació',
    text: 'Marca notes als criteris. Avaluapro calcula automàticament la nota de competència.',
  },
  {
    icon: ClipboardCheck,
    title: '4. Seguiment',
    text: 'Registra tasques fetes, incompletes, no fetes, exempts i incidències de comportament.',
  },
  {
    icon: BarChart3,
    title: '5. Estadístiques',
    text: 'Consulta primer cada bloc per separat i després Stats Globals per veure relacions entre rendiment, constància i comportament.',
  },
  {
    icon: ShieldCheck,
    title: '6. Còpia de seguretat',
    text: 'Descarrega còpies de seguretat sovint, especialment abans de restaurar dades o fer proves importants.',
  },
]

const helpSections = [
  {
    icon: Database,
    title: 'Com es guarden les dades?',
    text: 'Les dades reals es guarden a IndexedDB, dins del navegador del dispositiu. localStorage només guarda preferències petites com l’última classe oberta.',
  },
  {
    icon: Cloud,
    title: 'Què entra a la còpia de seguretat?',
    text: 'La còpia completa inclou classes, alumnes, fotos comprimides, notes, tasques, registres, comentaris, diagnòstics, rúbriques i preferències.',
  },
  {
    icon: BookOpenCheck,
    title: 'Avaluació sense indicadors',
    text: 'El model està preparat perquè el professor posi la nota del criteri i l’app calculi la competència amb la combinació A/B/C/D acordada.',
  },
  {
    icon: ClipboardCheck,
    title: 'Seguiment separat',
    text: 'La pantalla de seguiment només mostra dades de seguiment. La barreja amb l’avaluació es deixa per Stats Globals.',
  },
]

export function HelpCenterModal({ onClose, onOpenGuide }) {
  const setGuideOpen = useAvaluaproStore((state) => state.setGuideOpen)

  const openGuidedTour = () => {
    if (onOpenGuide) {
      onOpenGuide()
      return
    }
    onClose()
    window.setTimeout(() => setGuideOpen(true), 120)
  }

  return (
    <Modal onClose={onClose} size="xl" title="Ajuda i primera configuració">
      <div className="help-center">
        <section className="help-hero">
          <div>
            <span>
              <HelpCircle size={18} />
              Guia ràpida
            </span>
            <strong>Configura poc, treballa ràpid i no perdis dades.</strong>
            <p>
              Avaluapro s’obre amb una demo fictícia perquè puguis provar el flux complet. La guia
              interactiva funciona com un manual: et fa passar per avaluació, seguiment, estadístiques
              i còpies de seguretat abans de començar amb dades pròpies.
            </p>
            <button className="primary-action compact" onClick={openGuidedTour} type="button">
              <PlayCircle size={16} />
              Obrir guia interactiva
            </button>
          </div>
        </section>

        <section className="help-grid">
          {quickStart.map((item) => {
            const Icon = item.icon
            return (
              <article key={item.title}>
                <Icon size={20} />
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </article>
            )
          })}
        </section>

        <section className="help-reference">
          <h3>Conceptes clau</h3>
          <div>
            {helpSections.map((item) => {
              const Icon = item.icon
              return (
                <article key={item.title}>
                  <Icon size={19} />
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.text}</p>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </Modal>
  )
}
