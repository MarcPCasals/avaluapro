import {
  BellRing,
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'
import { Modal } from '../../components/Modal'

const CONTACT_EMAIL = 'mperezc@educand.ad'

function formatBackupDate(value) {
  if (!value) return 'ara mateix'
  return new Date(value).toLocaleString('ca-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function ReleaseAnnouncementModal({ backupCreatedAt = '', onAcknowledge }) {
  return (
    <Modal onClose={onAcknowledge} panelClassName="release-announcement-modal" size="lg" title="Nova actualització d’AvaluaPro">
      <div className="release-announcement">
        <section className="release-backup-confirmation">
          <span><ShieldCheck size={26} /></span>
          <div>
            <strong>Les teves dades ja estan protegides</strong>
            <p>
              Abans d’activar aquesta versió hem creat al núvol la còpia
              <b> «Còpia de seguretat pre actualització»</b>, desada {formatBackupDate(backupCreatedAt)}.
            </p>
          </div>
        </section>

        <div className="release-introduction">
          <span>Què trobaràs de nou</span>
          <h3>Programació, agenda i aula treballen juntes</h3>
          <p>Les noves eines s’afegeixen al quadern que ja utilitzaves i conserven l’avaluació, el seguiment i la tutoria.</p>
        </div>

        <div className="release-feature-grid">
          <article>
            <BookOpenText size={21} />
            <div><strong>Programació per classe</strong><span>UP, activitats, materials i connexió entre grups.</span></div>
          </article>
          <article>
            <CalendarDays size={21} />
            <div><strong>Agenda i calendari</strong><span>Horari, sessions, festius, recordatoris i cronologia.</span></div>
          </article>
          <article>
            <Clock3 size={21} />
            <div><strong>Mode aula</strong><span>Descripció, temps real, assistència i seguiment de tasques.</span></div>
          </article>
          <article>
            <UsersRound size={21} />
            <div><strong>Tutoria connectada</strong><span>Entrevistes amb famílies i coordinació amb la cotutora.</span></div>
          </article>
        </div>

        <section className="release-verification-card">
          <div className="release-verification-heading">
            <CheckCircle2 size={21} />
            <div><strong>Comprova que tot continua al seu lloc</strong><span>Classes i alumnat · notes · tasques i seguiment · registres de tutoria</span></div>
          </div>
          <p>
            Si detectes que falta alguna dada, no restauris cap versió a cegues. Ves a
            <b> Dades i Compte → Còpies i estat</b>, descarrega la darrera còpia guardada i envia-la a{' '}
            <a href={`mailto:${CONTACT_EMAIL}?subject=Revisió%20de%20dades%20després%20de%20l’actualització%20d’AvaluaPro`}>
              {CONTACT_EMAIL}
            </a>.
          </p>
        </section>

        <div className="modal-actions release-announcement-actions">
          <a className="secondary-action" href={`mailto:${CONTACT_EMAIL}?subject=Consulta%20nova%20versió%20d’AvaluaPro`}>
            <BellRing size={17} />
            Comunicar un problema
          </a>
          <button className="primary-action" onClick={onAcknowledge} type="button">
            <CheckCircle2 size={17} />
            He comprovat les dades
          </button>
        </div>
      </div>
    </Modal>
  )
}
