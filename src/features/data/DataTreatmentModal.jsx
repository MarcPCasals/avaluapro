import { useState } from 'react'
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Cloud,
  Database,
  FileArchive,
  KeyRound,
  Laptop,
  LockKeyhole,
  Scale,
  ShieldCheck,
  Siren,
  UserRoundCheck,
  UsersRound,
} from 'lucide-react'
import { Modal } from '../../components/Modal'
import { useAvaluaproStore } from '../../store/useAvaluaproStore'

const CONTACT_EMAIL = 'mperezc@educand.ad'

const SECTIONS = [
  { id: 'summary', label: 'Resum' },
  { id: 'data', label: 'Dades i ubicació' },
  { id: 'security', label: 'Proteccions' },
  { id: 'use', label: 'Ús segur' },
  { id: 'limits', label: 'Prohibit i incidències' },
]

function InfoCard({ children, icon: Icon, title, tone = 'neutral' }) {
  return (
    <article className={`data-treatment-card ${tone}`}>
      <Icon aria-hidden="true" size={20} />
      <div>
        <h3>{title}</h3>
        {children}
      </div>
    </article>
  )
}

function BulletList({ children, variant = '' }) {
  return <ul className={`data-treatment-list ${variant}`}>{children}</ul>
}

export function DataTreatmentModal({ onClose }) {
  const [activeSection, setActiveSection] = useState('summary')
  const cloud = useAvaluaproStore((state) => state.cloud)

  return (
    <Modal onClose={onClose} panelClassName="data-treatment-modal" size="xl" title="Tractament de dades">
      <div className="data-treatment-layout">
        <header className="data-treatment-hero">
          <div>
            <span>
              <ShieldCheck aria-hidden="true" size={18} />
              Privacitat i ús responsable
            </span>
            <h2>Les dades educatives són personals i s’han de tractar amb criteri docent.</h2>
            <p>
              Avaluapro incorpora mesures tècniques per protegir-les, però la seguretat també depèn de què hi escrius,
              amb qui ho comparteixes i com protegeixes el dispositiu i les còpies.
            </p>
          </div>
          <div className="data-treatment-session">
            <UserRoundCheck aria-hidden="true" size={20} />
            <span>
              Sessió actual
              <strong>{cloud.user?.email || 'Sense compte Google connectat'}</strong>
            </span>
          </div>
        </header>

        <nav aria-label="Apartats sobre tractament de dades" className="data-treatment-tabs">
          {SECTIONS.map((section) => (
            <button
              className={activeSection === section.id ? 'active' : ''}
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              type="button"
            >
              {section.label}
            </button>
          ))}
        </nav>

        {activeSection === 'summary' && (
          <section className="data-treatment-section">
            <div className="data-treatment-callout">
              <LockKeyhole aria-hidden="true" size={23} />
              <div>
                <strong>Què has de recordar?</strong>
                <p>
                  Guarda només informació necessària per avaluar, fer seguiment o prendre una decisió pedagògica.
                  Avaluapro no és un historial mèdic, familiar, disciplinari ni l’expedient acadèmic oficial.
                </p>
              </div>
            </div>

            <div className="data-treatment-grid">
              <InfoCard icon={Database} title="Dades personals">
                <p>
                  Noms, notes, observacions, diagnòstics, tutoria i sociometria continuen sent dades personals encara
                  que estiguin xifrades o identificades amb un codi.
                </p>
              </InfoCard>
              <InfoCard icon={ShieldCheck} title="Protecció tècnica" tone="positive">
                <p>
                  Autenticació Google, connexió HTTPS, separació per usuari, regles de Firestore, còpies privades i
                  permisos específics per compartir.
                </p>
              </InfoCard>
              <InfoCard icon={Scale} title="Sense seguretat absoluta" tone="warning">
                <p>
                  Cap infraestructura elimina tots els riscos. Un compte compromès, un dispositiu obert o una còpia
                  enviada incorrectament poden exposar dades legítimament accessibles.
                </p>
              </InfoCard>
              <InfoCard icon={UserRoundCheck} title="Responsabilitat docent">
                <p>
                  Revisa destinataris, escriu fets observables, limita el text lliure i elimina les dades quan deixin de
                  ser necessàries.
                </p>
              </InfoCard>
            </div>

            <div className="data-treatment-status">
              <CheckCircle2 aria-hidden="true" size={19} />
              <p>
                Les regles reforçades de Firestore es van desplegar el 22 de juny de 2026 després de superar 26 proves
                d’autorització i 5 proves de sincronització. Això és una mesura tècnica verificada, no una certificació
                jurídica o una auditoria externa.
              </p>
            </div>
          </section>
        )}

        {activeSection === 'data' && (
          <section className="data-treatment-section">
            <div className="data-treatment-grid">
              <InfoCard icon={Laptop} title="Al dispositiu">
                <p>
                  IndexedDB conserva una còpia local de treball perquè l’app sigui ràpida i pugui mantenir dades davant
                  problemes de connexió.
                </p>
                <small>Risc principal: dispositiu perdut, compartit, desbloquejat o sense xifratge.</small>
              </InfoCard>
              <InfoCard icon={Cloud} title="Al núvol">
                <p>
                  Amb Google iniciat, les dades es sincronitzen a Firestore dins l’espai privat
                  <code>users/&lt;uid&gt;</code>.
                </p>
                <small>Les còpies al núvol també queden separades per usuari.</small>
              </InfoCard>
              <InfoCard icon={UsersRound} title="Quan comparteixes">
                <p>
                  Els paquets de notes van a un destinatari concret. Les cotutories comparteixen dades tutorials amb els
                  membres acceptats i poden deixar còpies locals als seus dispositius.
                </p>
              </InfoCard>
              <InfoCard icon={FileArchive} title="Còpies i exportacions" tone="warning">
                <p>
                  Un JSON o un export d’antecedents surt del control d’Avaluapro. Qui el descarrega passa a custodiar-lo
                  i l’ha d’eliminar quan ja no sigui necessari.
                </p>
              </InfoCard>
            </div>

            <div className="data-treatment-table-wrap">
              <table className="data-treatment-table">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Exemples</th>
                    <th>Nivell de cura</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Identificació i avaluació</td>
                    <td>Nom, grup, qualificacions, competències i tasques</td>
                    <td>Alt</td>
                  </tr>
                  <tr>
                    <td>Tutoria i conducta</td>
                    <td>Observacions, DOIPs, incidències i antecedents</td>
                    <td>Molt alt</td>
                  </tr>
                  <tr>
                    <td>Necessitats educatives</td>
                    <td>Diagnòstics, adaptacions i mesures pedagògiques</td>
                    <td>Molt alt</td>
                  </tr>
                  <tr>
                    <td>Relacions socials</td>
                    <td>Sociograma, afinitats, rebuigs, grups i disposicions</td>
                    <td>Molt alt</td>
                  </tr>
                  <tr>
                    <td>Fitxers complets</td>
                    <td>Backups, exports i fotografies</td>
                    <td>Molt alt</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeSection === 'security' && (
          <section className="data-treatment-section">
            <div className="data-treatment-grid">
              <InfoCard icon={KeyRound} title="Identitat i accés" tone="positive">
                <BulletList>
                  <li>Inici de sessió amb Google.</li>
                  <li>Dades privades separades per UID.</li>
                  <li>Emissor i destinatari controlats en paquets de notes.</li>
                  <li>Només el propietari gestiona membres d’una cotutoria.</li>
                </BulletList>
              </InfoCard>
              <InfoCard icon={LockKeyhole} title="Firestore reforçat" tone="positive">
                <BulletList>
                  <li>Llista tancada de col·leccions compartides.</li>
                  <li>Eliminacions compartides sincronitzades amb tombstones.</li>
                  <li>Revocació i sortida de cotutories.</li>
                  <li>Regles desplegades i provades automàticament.</li>
                </BulletList>
              </InfoCard>
              <InfoCard icon={UsersRound} title="Qüestionaris sociomètrics" tone="positive">
                <BulletList>
                  <li>Enllaç individual aleatori i no enumerable.</li>
                  <li>Caducitat de 24 hores.</li>
                  <li>Una resposta per enllaç, sense sobreescriptura.</li>
                  <li>El document general amb la llista no és públic.</li>
                </BulletList>
              </InfoCard>
              <InfoCard icon={AlertTriangle} title="Límits actuals" tone="warning">
                <BulletList>
                  <li>App Check encara no és obligatori.</li>
                  <li>La purga sociomètrica automàtica està pendent.</li>
                  <li>Les fotos encara no fan servir Firebase Storage.</li>
                  <li>Falten validació institucional i auditoria externa.</li>
                </BulletList>
              </InfoCard>
            </div>
          </section>
        )}

        {activeSection === 'use' && (
          <section className="data-treatment-section">
            <div className="data-treatment-writing">
              <div className="good">
                <CheckCircle2 aria-hidden="true" size={21} />
                <div>
                  <h3>Escriu així</h3>
                  <BulletList>
                    <li>Fets observables, breus, datats i relacionats amb l’aprenentatge.</li>
                    <li>Acords pedagògics i mesures concretes que el docent pugui aplicar.</li>
                    <li>Etiquetes controlades en lloc d’explicacions mèdiques.</li>
                    <li>Només la informació necessària per a una finalitat docent clara.</li>
                  </BulletList>
                  <blockquote>
                    “Acord d’equip: donar instruccions per passos i revisar l’agenda cada dilluns.”
                  </blockquote>
                </div>
              </div>
              <div className="bad">
                <Ban aria-hidden="true" size={21} />
                <div>
                  <h3>Evita escriure</h3>
                  <BulletList>
                    <li>Historials mèdics, familiars, econòmics o personals extensos.</li>
                    <li>Rumors, judicis, insults o etiquetes humiliants.</li>
                    <li>Relats llargs de conflictes quan una síntesi pedagògica és suficient.</li>
                    <li>Informació sense relació directa amb la funció docent.</li>
                  </BulletList>
                  <blockquote>“Detalls clínics o familiars que no canvien cap actuació educativa.”</blockquote>
                </div>
              </div>
            </div>

            <div className="data-treatment-checklist">
              <h3>Abans de desar o compartir, pregunta’t:</h3>
              <ol>
                <li>Necessito aquesta dada per prendre una decisió docent concreta?</li>
                <li>Podria dir el mateix amb menys detall o amb una etiqueta?</li>
                <li>El destinatari està autoritzat i necessita realment aquesta informació?</li>
                <li>He comprovat el grup, l’alumne i el correu destinatari?</li>
                <li>Sabré quan s’ha d’eliminar?</li>
              </ol>
            </div>
          </section>
        )}

        {activeSection === 'limits' && (
          <section className="data-treatment-section">
            <div className="data-treatment-prohibitions">
              <Ban aria-hidden="true" size={24} />
              <div>
                <h3>No utilitzis Avaluapro per:</h3>
                <BulletList variant="prohibited">
                  <li>Guardar informació clínica o familiar detallada que no sigui imprescindible.</li>
                  <li>Substituir Clickedu o el sistema oficial del centre.</li>
                  <li>Prendre decisions disciplinàries o acadèmiques automàtiques sense revisió humana.</li>
                  <li>Compartir dades amb docents, famílies, alumnes o tercers sense autorització i necessitat.</li>
                  <li>Enviar backups per correu personal, missatgeria o espais no autoritzats.</li>
                  <li>Publicar captures on apareguin noms, notes, diagnòstics o sociogrames.</li>
                  <li>Conservar indefinidament qüestionaris, còpies o dades de cursos tancats.</li>
                  <li>Introduir dades reals en eines d’IA externes no autoritzades.</li>
                </BulletList>
              </div>
            </div>

            <div className="data-treatment-incident">
              <Siren aria-hidden="true" size={24} />
              <div>
                <h3>Si detectes un error o una possible exposició</h3>
                <ol>
                  <li>Atura la compartició i no continuïs reenviant ni modificant dades.</li>
                  <li>Anota què ha passat, quan, amb quin compte i quines dades podrien estar afectades.</li>
                  <li>No facis captures que ampliïn l’exposició; si cal evidència, limita-la al mínim.</li>
                  <li>Informa immediatament el responsable del centre i el canal institucional corresponent.</li>
                  <li>
                    Per una incidència tècnica d’Avaluapro, contacta amb{' '}
                    <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
                  </li>
                </ol>
              </div>
            </div>

            <div className="data-treatment-legal-note">
              <Scale aria-hidden="true" size={20} />
              <p>
                Aquesta guia explica les mesures i normes d’ús d’Avaluapro. No substitueix les instruccions del centre,
                la política del Ministeri, l’avaluació d’impacte ni l’assessorament jurídic aplicable.
              </p>
            </div>
          </section>
        )}
      </div>
    </Modal>
  )
}
